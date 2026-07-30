//! Telegram full-account export parser.
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
//!       { "type": "personal_chat", "id": 456, "name": "Alice",
//!         "messages": [
//!           { "id": 1, "type": "message", "from": "Alice",
//!             "from_id": "user456", "date": "2024-01-15T10:30:00",
//!             "text": "hello",
//!             "media_type": "voice_message",
//!             "duration_seconds": 12,
//!             "reactions": [{"emoji":"❤","count":1,"recent":[{"from":"Bob","from_id":"user789"}]}]
//!           }
//!         ]}
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

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::analytics::collectors::{
    extract_emojis, is_pure_emoji_text, parse_telegram_date, text_has_url, AnalysisEngine,
    ContentKind, MessageEvent, MessageKind,
    ReactionEvent, WrapAnalytics,
};
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
    id: i64,
    #[serde(default)]
    name: Option<String>,
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
    /// Local-time ISO-8601 string without timezone: `"2024-01-15T10:30:00"`.
    #[serde(default)]
    date: Option<String>,
    /// Heterogeneous: `String` or `Array<String|Object>`.
    #[serde(default)]
    text: Value,
    /// `"voice_message"`, `"video_message"`, `"sticker"`, `"photo"`,
    /// `"video_file"`, `"animation"`, `"document"`, etc.
    #[serde(default)]
    media_type: Option<String>,
    /// Duration in seconds for voice/video messages.
    #[serde(default)]
    duration_seconds: Option<u32>,
    #[serde(default)]
    reactions: Vec<RawReaction>,
}

#[derive(Deserialize)]
struct RawReaction {
    #[serde(default)]
    emoji: Option<String>,
    #[serde(default)]
    recent: Vec<RawReactionPerson>,
}

#[derive(Deserialize)]
struct RawReactionPerson {
    #[serde(default)]
    from_id: Option<String>,
}

// ── Legacy summary type (kept for backward compat) ────────────────────────────

/// Basic statistical summary — returned by the legacy `summarize_*` functions
/// which the import UI currently uses.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TelegramExportSummary {
    pub display_name: String,
    pub username: Option<String>,
    /// First line of the export's `about` field, truncated to 200 characters.
    pub about_preview: String,
    pub file_size_bytes: u64,
    pub chat_count: usize,
    pub total_messages: u64,
    pub sent_messages: u64,
    pub received_messages: u64,
    pub sample_messages: Vec<String>,
}

impl TelegramExportSummary {
    pub fn to_text_report(&self) -> String {
        let size_mb = self.file_size_bytes as f64 / 1_048_576.0;
        let username_part = self.username.as_deref().unwrap_or("no username");
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
                lines.push(format!("  {msg}"));
            }
        }
        lines.join("\n")
    }

    pub fn to_json(&self) -> Result<String, CoreError> {
        serde_json::to_string(self).map_err(CoreError::from)
    }
}

// ── Progress reader ────────────────────────────────────────────────────────────

/// [`Read`] wrapper that reports consumed bytes to a callback at throttled
/// intervals (~every 0.5% of the file, minimum 256 KB).
struct ProgressReader<R: Read, F: FnMut(u64, u64)> {
    inner: R,
    total_bytes: u64,
    bytes_read: u64,
    last_reported: u64,
    report_step: u64,
    on_progress: F,
}

impl<R: Read, F: FnMut(u64, u64)> ProgressReader<R, F> {
    fn new(inner: R, total_bytes: u64, on_progress: F) -> Self {
        Self {
            inner,
            total_bytes,
            bytes_read: 0,
            last_reported: 0,
            report_step: (total_bytes / 200).max(256 * 1024),
            on_progress,
        }
    }
}

impl<R: Read, F: FnMut(u64, u64)> Read for ProgressReader<R, F> {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let n = self.inner.read(buf)?;
        self.bytes_read += n as u64;
        if n == 0 || self.bytes_read - self.last_reported >= self.report_step {
            self.last_reported = self.bytes_read;
            (self.on_progress)(self.bytes_read, self.total_bytes);
        }
        Ok(n)
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Import / analyze progress stage reported to the UI.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AnalyzeProgressPhase {
    /// Deserializing the export JSON (byte-based).
    Reading,
    /// Feeding messages into collectors (message-based).
    Computing,
}

impl AnalyzeProgressPhase {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Reading => "reading",
            Self::Computing => "computing",
        }
    }
}

/// Parses a Telegram export file from disk and returns full [`WrapAnalytics`].
pub fn analyze_export(path: &Path) -> Result<WrapAnalytics, CoreError> {
    let file_size_bytes = std::fs::metadata(path)?.len();
    let file = File::open(path)?;
    let reader = BufReader::with_capacity(256 * 1024, file);
    analyze_export_from_reader(reader, Some(file_size_bytes), |_, _, _| {})
}

/// Like [`analyze_export`], with two-phase progress callbacks.
pub fn analyze_export_with_progress<F>(
    path: &Path,
    on_progress: F,
) -> Result<WrapAnalytics, CoreError>
where
    F: FnMut(AnalyzeProgressPhase, u64, u64),
{
    let file_size_bytes = std::fs::metadata(path)?.len();
    let file = File::open(path)?;
    let reader = BufReader::with_capacity(256 * 1024, file);
    analyze_export_from_reader(reader, Some(file_size_bytes), on_progress)
}

/// Parses a Telegram export already loaded into memory and returns full
/// [`WrapAnalytics`] (used by WASM).
pub fn analyze_export_bytes(bytes: &[u8]) -> Result<WrapAnalytics, CoreError> {
    analyze_export_bytes_with_progress(bytes, |_, _, _| {})
}

/// Two-phase progress: `Reading` while JSON is deserialized, then `Computing`
/// while chats/messages are fed into the analytics engine.
pub fn analyze_export_bytes_with_progress<F>(
    bytes: &[u8],
    on_progress: F,
) -> Result<WrapAnalytics, CoreError>
where
    F: FnMut(AnalyzeProgressPhase, u64, u64),
{
    let total_bytes = bytes.len() as u64;
    analyze_export_from_reader(std::io::Cursor::new(bytes), Some(total_bytes), on_progress)
}

/// Core parsing logic — works from any [`Read`] source.
///
/// When `file_size_bytes` is `Some`, reading progress is reported while JSON is
/// deserialized; computing progress is always reported while collecting stats.
pub fn analyze_export_from_reader<R, F>(
    reader: R,
    file_size_bytes: Option<u64>,
    mut on_progress: F,
) -> Result<WrapAnalytics, CoreError>
where
    R: Read,
    F: FnMut(AnalyzeProgressPhase, u64, u64),
{
    let export: RawExport = if let Some(total_bytes) = file_size_bytes {
        on_progress(AnalyzeProgressPhase::Reading, 0, total_bytes.max(1));
        let progress_reader = ProgressReader::new(reader, total_bytes, |read, total| {
            on_progress(AnalyzeProgressPhase::Reading, read, total.max(1));
        });
        let buf_reader = BufReader::with_capacity(256 * 1024, progress_reader);
        serde_json::from_reader(buf_reader)?
    } else {
        let buf_reader = BufReader::with_capacity(256 * 1024, reader);
        serde_json::from_reader(buf_reader)?
    };

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

    let mut engine = AnalysisEngine::new(
        display_name,
        username,
        about_preview,
        file_size_bytes.unwrap_or(0),
    );

    let chat_list = export.chats.map(|c| c.list).unwrap_or_default();
    let total_messages: u64 = chat_list
        .iter()
        .map(|c| c.messages.len() as u64)
        .sum();
    let compute_total = total_messages.max(1);
    let report_step = (compute_total / 200).max(1);
    let mut processed: u64 = 0;

    on_progress(AnalyzeProgressPhase::Computing, 0, compute_total);

    for (chat_index, chat) in chat_list.iter().enumerate() {
        let chat_id = if chat.id != 0 {
            chat.id
        } else {
            chat_index as i64
        };
        let chat_name = chat
            .name
            .clone()
            .unwrap_or_else(|| format!("Chat {}", chat_index + 1));

        for msg in &chat.messages {
            processed += 1;
            if processed == compute_total || processed % report_step == 0 {
                on_progress(
                    AnalyzeProgressPhase::Computing,
                    processed.min(compute_total),
                    compute_total,
                );
            }

            if msg.msg_type != "message" {
                continue;
            }

            let from_name = msg.from.clone().unwrap_or_else(|| "Unknown".to_string());
            let is_mine = me_id
                .as_deref()
                .zip(msg.from_id.as_deref())
                .map(|(me, fid)| fid == me)
                .unwrap_or(false);

            let (timestamp_secs, hour, date_str) = msg
                .date
                .as_deref()
                .and_then(parse_telegram_date)
                .unwrap_or((0, 0, String::new()));

            let kind = message_kind(&msg.media_type);
            let plain_text = value_to_plain_text(&msg.text);
            let char_count = if kind.is_text() {
                plain_text.chars().count()
            } else {
                0
            };
            let emojis = if kind.is_text() {
                extract_emojis(&plain_text)
            } else {
                vec![]
            };
            let has_link = text_contains_link(&msg.text);
            let is_pure_emoji = kind.is_text() && is_pure_emoji_text(&plain_text);
            let content_kind = ContentKind::classify(&kind, has_link, is_pure_emoji);
            let voice_duration_secs = msg.duration_seconds.unwrap_or(0);

            let reactions: Vec<ReactionEvent> = msg
                .reactions
                .iter()
                .flat_map(|r| {
                    let emoji = r.emoji.clone().unwrap_or_default();
                    if emoji.is_empty() {
                        vec![]
                    } else if r.recent.is_empty() {
                        vec![ReactionEvent {
                            emoji: emoji.clone(),
                            from_me: false,
                        }]
                    } else {
                        r.recent
                            .iter()
                            .map(|p| {
                                let from_me = me_id
                                    .as_deref()
                                    .zip(p.from_id.as_deref())
                                    .map(|(me, fid)| fid == me)
                                    .unwrap_or(false);
                                ReactionEvent {
                                    emoji: emoji.clone(),
                                    from_me,
                                }
                            })
                            .collect()
                    }
                })
                .collect();

            let ev = MessageEvent {
                chat_id,
                chat_name: chat_name.clone(),
                is_mine,
                sender_name: from_name.clone(),
                timestamp_secs,
                hour,
                date_str,
                kind,
                content_kind,
                char_count,
                voice_duration_secs,
                emojis,
                reactions,
            };

            engine.feed(&ev);

            if ev.char_count > 0 {
                let capped: String = plain_text.chars().take(80).collect();
                let snippet = if plain_text.chars().count() > 80 {
                    format!("{}…", capped)
                } else {
                    capped
                };
                engine.add_sample(format!("{from_name}: {snippet}"));
            }
        }
    }

    on_progress(AnalyzeProgressPhase::Computing, compute_total, compute_total);
    Ok(engine.finish())
}

// ── Legacy summarize functions (backward compat) ──────────────────────────────

/// Parses a Telegram export file and returns a basic summary (legacy API).
pub fn summarize_export(path: &Path) -> Result<TelegramExportSummary, CoreError> {
    let analytics = analyze_export(path)?;
    Ok(wrap_analytics_to_summary(analytics))
}

/// Parses Telegram export bytes and returns a basic summary.
pub fn summarize_export_bytes(bytes: &[u8]) -> Result<TelegramExportSummary, CoreError> {
    summarize_export_bytes_with_progress(bytes, |_, _, _| {})
}

/// Like [`summarize_export_bytes`], with two-phase progress callbacks.
pub fn summarize_export_bytes_with_progress<F>(
    bytes: &[u8],
    on_progress: F,
) -> Result<TelegramExportSummary, CoreError>
where
    F: FnMut(AnalyzeProgressPhase, u64, u64),
{
    let analytics = analyze_export_bytes_with_progress(bytes, on_progress)?;
    Ok(wrap_analytics_to_summary(analytics))
}

/// Parses a Telegram full-account export from any [`Read`] source (legacy API).
pub fn summarize_export_from_reader<R: Read>(
    reader: R,
    file_size_bytes: Option<u64>,
) -> Result<TelegramExportSummary, CoreError> {
    let analytics = analyze_export_from_reader(reader, file_size_bytes, |_, _, _| {})?;
    Ok(wrap_analytics_to_summary(analytics))
}

fn wrap_analytics_to_summary(a: WrapAnalytics) -> TelegramExportSummary {
    TelegramExportSummary {
        display_name: a.display_name,
        username: a.username,
        about_preview: a.about_preview,
        file_size_bytes: a.file_size_bytes,
        chat_count: a.chat_count,
        total_messages: a.account.total_messages,
        sent_messages: a.account.sent_messages,
        received_messages: a.account.received_messages,
        sample_messages: a.sample_messages,
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Maps Telegram's `media_type` string to a [`MessageKind`].
fn message_kind(media_type: &Option<String>) -> MessageKind {
    match media_type.as_deref() {
        None | Some("") => MessageKind::Text,
        Some("voice_message") => MessageKind::Voice,
        Some("video_message") => MessageKind::VideoMessage,
        Some("video_file") => MessageKind::Video,
        Some("photo") => MessageKind::Photo,
        Some("sticker") => MessageKind::Sticker,
        Some("animation") | Some("animated_sticker") => MessageKind::Animation,
        Some("document") | Some("audio_file") => MessageKind::File,
        _ => MessageKind::Other,
    }
}

/// Flattens Telegram's heterogeneous `text` field into a plain string.
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

/// True when the export text payload contains a URL entity or URL-looking string.
fn text_contains_link(v: &Value) -> bool {
    match v {
        Value::String(s) => text_has_url(s),
        Value::Array(items) => items.iter().any(|item| match item {
            Value::String(s) => text_has_url(s),
            Value::Object(obj) => {
                let entity = obj.get("type").and_then(Value::as_str).unwrap_or("");
                matches!(entity, "link" | "url" | "text_link" | "email")
                    || obj
                        .get("text")
                        .and_then(Value::as_str)
                        .is_some_and(text_has_url)
            }
            _ => false,
        }),
        _ => false,
    }
}
