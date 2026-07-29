//! Telegram full-account export parser and summarizer.
//!
//! Telegram Desktop's "Export Telegram data" produces a single large
//! `result.json` whose top-level shape is:
//!
//! ```json
//! {
//!   "about": "...",
//!   "personal_information": { "user_id": 123, "first_name": "...", ... },
//!   "chats": {
//!     "list": [
//!       { "type": "personal_chat", "id": 456, "messages": [
//!         { "id": 1, "type": "message", "from": "Alice",
//!           "from_id": "user456", "date": "2024-01-15T10:30:00",
//!           "text": "hello" }
//!       ]}
//!     ]
//!   }
//! }
//! ```
//!
//! The `text` field is heterogeneous: it may be a plain `String` or an array
//! of mixed strings and rich-text entity objects such as
//! `[{"type":"bold","text":"hi"}, "!"]`.  All other unrecognised top-level
//! keys (stories, contacts, sessions, profile_pictures, …) are skipped by
//! serde without allocation.

use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;

use serde::Deserialize;
use serde_json::Value;

use crate::error::CoreError;

// ── Private raw deserialization types ────────────────────────────────────────

#[derive(Deserialize)]
struct RawExport {
    about: Option<String>,
    personal_information: Option<RawPersonalInfo>,
    chats: Option<RawChatsSection>,
}

#[derive(Deserialize)]
struct RawPersonalInfo {
    user_id: i64,
    first_name: String,
    #[serde(default)]
    last_name: String,
    #[serde(default)]
    username: Option<String>,
}

#[derive(Deserialize)]
struct RawChatsSection {
    list: Vec<RawChat>,
}

#[derive(Deserialize)]
struct RawChat {
    #[serde(default)]
    messages: Vec<RawMessage>,
}

#[derive(Deserialize)]
struct RawMessage {
    #[serde(rename = "type")]
    msg_type: String,
    #[serde(default)]
    from: Option<String>,
    #[serde(default)]
    from_id: Option<String>,
    /// Heterogeneous: `String` or `Array<String|Object>`.
    #[serde(default)]
    text: Value,
}

// ── Public summary type ───────────────────────────────────────────────────────

/// Statistical summary of a Telegram full-account `result.json` export.
#[derive(Debug)]
pub struct TelegramExportSummary {
    pub display_name: String,
    pub username: Option<String>,
    /// First line of the export's `about` field, truncated to 200 characters.
    pub about_preview: String,
    /// Raw file size in bytes (from filesystem metadata).
    pub file_size_bytes: u64,
    pub chat_count: usize,
    /// Number of entries with `"type": "message"` (excludes service events).
    pub total_messages: u64,
    pub sent_messages: u64,
    pub received_messages: u64,
    /// Up to 5 `"Sender: text snippet"` strings sampled from early messages.
    pub sample_messages: Vec<String>,
}

impl TelegramExportSummary {
    /// Renders the summary as a plain multi-line text report.
    pub fn to_text_report(&self) -> String {
        let size_mb = self.file_size_bytes as f64 / 1_048_576.0;
        let username_part = self
            .username
            .as_deref()
            .unwrap_or("no username");

        let mut lines = vec![
            "Telegram Export Summary".to_string(),
            "=======================".to_string(),
            format!("Account : {} ({})", self.display_name, username_part),
            format!("About   : {}", self.about_preview),
            format!("File    : {:.1} MB", size_mb),
            String::new(),
            format!("Chats            : {}", self.chat_count),
            format!("Total messages   : {}", self.total_messages),
            format!("  Sent           : {}", self.sent_messages),
            format!("  Received       : {}", self.received_messages),
        ];

        if !self.sample_messages.is_empty() {
            lines.push(String::new());
            lines.push("Sample messages:".to_string());
            for msg in &self.sample_messages {
                lines.push(format!("  {}", msg));
            }
        }

        lines.join("\n")
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Parses a Telegram full-account `result.json` and returns a
/// [`TelegramExportSummary`].
///
/// Uses a 256 KB read buffer and skips all unknown JSON fields without
/// allocating, so memory usage stays well below the raw file size even for
/// large (300+ MB) exports.
///
/// # Errors
///
/// Returns [`CoreError::Io`] on file-open or read failure, or
/// [`CoreError::Json`] if the JSON is malformed.
pub fn summarize_export(path: &Path) -> Result<TelegramExportSummary, CoreError> {
    let file_size_bytes = std::fs::metadata(path)?.len();
    let file = File::open(path)?;
    let reader = BufReader::with_capacity(256 * 1024, file);
    summarize_export_from_reader(reader, Some(file_size_bytes))
}

/// Parses a Telegram full-account export from any [`Read`] source.
pub fn summarize_export_from_reader<R: Read>(
    reader: R,
    file_size_bytes: Option<u64>,
) -> Result<TelegramExportSummary, CoreError> {
    let reader = BufReader::with_capacity(256 * 1024, reader);
    let export: RawExport = serde_json::from_reader(reader)?;

    // ── Identity ──────────────────────────────────────────────────────────────
    let info = export.personal_information.as_ref();

    let display_name = info
        .map(|p| {
            let ln = p.last_name.trim();
            if ln.is_empty() {
                p.first_name.clone()
            } else {
                format!("{} {}", p.first_name, ln)
            }
        })
        .unwrap_or_else(|| "Unknown".to_string());

    let username = info.and_then(|p| p.username.clone());

    // The `from_id` on outgoing messages looks like "user302402513".
    let me_id: Option<String> = info.map(|p| format!("user{}", p.user_id));

    let about_preview: String = export
        .about
        .as_deref()
        .unwrap_or("")
        .lines()
        .next()
        .unwrap_or("")
        .chars()
        .take(200)
        .collect();

    // ── Aggregate ─────────────────────────────────────────────────────────────
    let chat_list = export.chats.map(|c| c.list).unwrap_or_default();
    let chat_count = chat_list.len();

    let mut total_messages: u64 = 0;
    let mut sent_messages: u64 = 0;
    let mut sample_messages: Vec<String> = Vec::with_capacity(5);

    for chat in &chat_list {
        for msg in &chat.messages {
            if msg.msg_type != "message" {
                continue;
            }
            total_messages += 1;

            let is_mine = me_id.as_deref().zip(msg.from_id.as_deref())
                .map(|(me, fid)| fid == me)
                .unwrap_or(false);
            if is_mine {
                sent_messages += 1;
            }

            if sample_messages.len() < 5 {
                let text = value_to_plain_text(&msg.text);
                if !text.is_empty() {
                    let sender = msg.from.as_deref().unwrap_or("?");
                    let capped: String = text.chars().take(80).collect();
                    let snippet = if text.chars().count() > 80 {
                        format!("{}…", capped)
                    } else {
                        capped
                    };
                    sample_messages.push(format!("{}: {}", sender, snippet));
                }
            }
        }
    }

    let received_messages = total_messages.saturating_sub(sent_messages);

    Ok(TelegramExportSummary {
        display_name,
        username,
        about_preview,
        file_size_bytes: file_size_bytes.unwrap_or(0),
        chat_count,
        total_messages,
        sent_messages,
        received_messages,
        sample_messages,
    })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Flattens Telegram's heterogeneous `text` field into a plain string.
///
/// - `String` → returned as-is.
/// - `Array` → each element is either a bare string or an entity object with
///   a `"text"` key; both are concatenated in order.
/// - Anything else → empty string.
fn value_to_plain_text(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Array(items) => items
            .iter()
            .map(|item| match item {
                Value::String(s) => s.as_str(),
                Value::Object(obj) => obj
                    .get("text")
                    .and_then(Value::as_str)
                    .unwrap_or(""),
                _ => "",
            })
            .collect::<Vec<_>>()
            .join(""),
        _ => String::new(),
    }
}
