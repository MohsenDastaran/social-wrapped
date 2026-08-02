//! WhatsApp chat export parser.
//!
//! WhatsApp exports a single chat as a `.txt` file (optionally packaged in a
//! ZIP with media). Common line shapes:
//!
//! ```text
//! 12/01/24, 10:00 - Alice: Hello
//! [12/01/2024, 10:00:15] Bob: image omitted
//! [1/12/24, 10:00:15 AM] Alice: Hi again
//! ```
//!
//! Multiline bodies continue without a timestamp prefix. System notices have
//! no `Name:` separator and are skipped. Media is represented as placeholder
//! text in the export — binaries inside a ZIP are ignored.

use std::collections::BTreeSet;
use std::io::{Cursor, Read};

use serde::{Deserialize, Serialize};
use zip::ZipArchive;

use crate::analytics::collectors::{
    civil_to_epoch_days, extract_emojis, is_pure_emoji_text, text_has_url, tokenize_words,
    AnalysisEngine, ContentKind, MessageEvent, MessageKind, WrapAnalytics,
};
use crate::error::CoreError;
use crate::parsers::telegram::AnalyzeProgressPhase;

// ── Preview ───────────────────────────────────────────────────────────────────

/// Lightweight scan result used for the “Who are you?” picker before analytics.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WhatsAppPreview {
    pub chat_name: String,
    pub senders: Vec<String>,
    /// When WhatsApp labels the owner as “You” (or a known locale equivalent),
    /// the UI can skip the identity picker.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggested_me: Option<String>,
    pub message_count: u64,
    pub file_size_bytes: u64,
}

impl WhatsAppPreview {
    pub fn to_json(&self) -> Result<String, CoreError> {
        serde_json::to_string(self).map_err(CoreError::from)
    }
}

// ── Parsed message (pre-identity) ─────────────────────────────────────────────

#[derive(Debug, Clone)]
struct ParsedMessage {
    sender: String,
    timestamp_secs: i64,
    hour: u8,
    date_str: String,
    body: String,
    kind: MessageKind,
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Scan export bytes and return chat name + unique senders (no analytics yet).
///
/// `file_name` improves chat naming for bare `.txt` uploads (ZIPs use the entry name).
pub fn preview_export_bytes(
    bytes: &[u8],
    file_name: Option<&str>,
) -> Result<WhatsAppPreview, CoreError> {
    let file_size_bytes = bytes.len() as u64;
    let (chat_name, text) = extract_chat_text(bytes, file_name)?;
    let messages = parse_messages(&text)?;
    let senders = unique_senders(&messages);
    let suggested_me = obvious_me_sender(&senders);
    Ok(WhatsAppPreview {
        chat_name,
        senders,
        suggested_me,
        message_count: messages.len() as u64,
        file_size_bytes,
    })
}

/// Full analytics pass with the user-selected “me” display name.
pub fn analyze_export_bytes(
    bytes: &[u8],
    me_name: &str,
    file_name: Option<&str>,
) -> Result<WrapAnalytics, CoreError> {
    analyze_export_bytes_with_progress(bytes, me_name, file_name, |_, _, _| {})
}

/// Two-phase progress: `Reading` while the chat text is prepared, then
/// `Computing` while messages are fed into the analytics engine.
pub fn analyze_export_bytes_with_progress<F>(
    bytes: &[u8],
    me_name: &str,
    file_name: Option<&str>,
    mut on_progress: F,
) -> Result<WrapAnalytics, CoreError>
where
    F: FnMut(AnalyzeProgressPhase, u64, u64),
{
    let me = me_name.trim();
    if me.is_empty() {
        return Err(CoreError::Parse(
            "Please choose which sender is you before analyzing.".into(),
        ));
    }

    let total_bytes = bytes.len() as u64;
    on_progress(AnalyzeProgressPhase::Reading, 0, total_bytes.max(1));

    let (chat_name, text) = extract_chat_text(bytes, file_name)?;
    on_progress(
        AnalyzeProgressPhase::Reading,
        total_bytes.max(1),
        total_bytes.max(1),
    );

    let messages = parse_messages(&text)?;
    if messages.is_empty() {
        return Err(CoreError::Parse(
            "No WhatsApp messages found in this export.".into(),
        ));
    }

    let senders = unique_senders(&messages);
    if !senders.iter().any(|s| s == me) {
        return Err(CoreError::Parse(format!(
            "Sender \"{me}\" was not found in this chat. Pick a name from the export."
        )));
    }

    let is_group = senders.len() >= 3;
    let mut engine = AnalysisEngine::new(
        me.to_string(),
        None,
        chat_name.clone(),
        total_bytes,
    );

    let compute_total = (messages.len() as u64).max(1);
    let report_step = (compute_total / 200).max(1);
    on_progress(AnalyzeProgressPhase::Computing, 0, compute_total);

    for (index, msg) in messages.iter().enumerate() {
        let processed = (index as u64) + 1;
        if processed == compute_total || processed % report_step == 0 {
            on_progress(
                AnalyzeProgressPhase::Computing,
                processed.min(compute_total),
                compute_total,
            );
        }

        let is_mine = msg.sender == me;
        let char_count = if msg.kind.is_text() {
            msg.body.chars().count()
        } else {
            0
        };
        let words = if msg.kind.is_text() && char_count > 0 {
            tokenize_words(&msg.body)
        } else {
            vec![]
        };
        let emojis = if msg.kind.is_text() {
            extract_emojis(&msg.body)
        } else {
            vec![]
        };
        let has_link = msg.kind.is_text() && text_has_url(&msg.body);
        let is_pure_emoji = msg.kind.is_text() && is_pure_emoji_text(&msg.body);
        let content_kind = ContentKind::classify(&msg.kind, has_link, is_pure_emoji);

        let ev = MessageEvent {
            chat_id: 1,
            chat_name: chat_name.clone(),
            is_group,
            is_channel: false,
            is_deleted: false,
            is_mine,
            sender_name: msg.sender.clone(),
            timestamp_secs: msg.timestamp_secs,
            hour: msg.hour,
            date_str: msg.date_str.clone(),
            kind: msg.kind.clone(),
            content_kind,
            char_count,
            words,
            voice_duration_secs: 0,
            emojis,
            reactions: vec![],
            is_edited: false,
        };

        engine.feed(&ev);

        if ev.char_count > 0 {
            let capped: String = msg.body.chars().take(80).collect();
            let snippet = if msg.body.chars().count() > 80 {
                format!("{capped}…")
            } else {
                capped
            };
            engine.add_sample(format!("{}: {snippet}", msg.sender));
        }
    }

    on_progress(AnalyzeProgressPhase::Computing, compute_total, compute_total);
    Ok(engine.finish())
}

// ── Extract chat text from .txt or .zip ───────────────────────────────────────

/// Prefer filenames matching WhatsApp export conventions; fall back to any `.txt`.
fn extract_chat_text(
    bytes: &[u8],
    hint_name: Option<&str>,
) -> Result<(String, String), CoreError> {
    if looks_like_zip(bytes) {
        return extract_from_zip(bytes);
    }

    let text = decode_utf8(bytes)?;
    if !looks_like_whatsapp_chat(&text) {
        return Err(CoreError::Parse(
            "This file does not look like a WhatsApp chat export.".into(),
        ));
    }
    let chat_name = hint_name
        .map(chat_name_from_filename)
        .unwrap_or_else(|| "WhatsApp Chat".to_string());
    Ok((chat_name, text))
}

fn looks_like_zip(bytes: &[u8]) -> bool {
    bytes.len() >= 4 && bytes[0] == 0x50 && bytes[1] == 0x4B
}

fn extract_from_zip(bytes: &[u8]) -> Result<(String, String), CoreError> {
    let cursor = Cursor::new(bytes);
    let mut archive = ZipArchive::new(cursor)?;

    let mut candidates: Vec<(usize, String, i32)> = Vec::new();
    for index in 0..archive.len() {
        let file = archive.by_index(index)?;
        let name = file.name().to_string();
        if file.is_dir() {
            continue;
        }
        let lower = name.to_ascii_lowercase();
        if !lower.ends_with(".txt") {
            continue;
        }
        let base = PathFileName(&name).base_name().to_ascii_lowercase();
        let score = if base == "_chat.txt" || base.starts_with("whatsapp chat") {
            0
        } else if base.contains("whatsapp") {
            1
        } else {
            2
        };
        candidates.push((index, name, score));
    }

    if candidates.is_empty() {
        return Err(CoreError::Parse(
            "No chat .txt found inside this ZIP. Export the chat again (with or without media)."
                .into(),
        ));
    }

    candidates.sort_by_key(|(_, _, score)| *score);
    let (index, entry_name, _) = candidates[0].clone();
    let mut file = archive.by_index(index)?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)?;
    let text = decode_utf8(&buffer)?;
    if !looks_like_whatsapp_chat(&text) {
        return Err(CoreError::Parse(format!(
            "ZIP entry \"{entry_name}\" does not look like a WhatsApp chat export."
        )));
    }
    let chat_name = chat_name_from_filename(&entry_name);
    Ok((chat_name, text))
}

struct PathFileName<'a>(&'a str);

impl PathFileName<'_> {
    fn base_name(&self) -> &str {
        self.0
            .rsplit(['/', '\\'])
            .next()
            .unwrap_or(self.0)
    }
}

fn decode_utf8(bytes: &[u8]) -> Result<String, CoreError> {
    let trimmed = if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        &bytes[3..]
    } else {
        bytes
    };
    String::from_utf8(trimmed.to_vec()).map_err(|e| {
        CoreError::Parse(format!("WhatsApp export must be UTF-8 text: {e}"))
    })
}

fn chat_name_from_filename(path: &str) -> String {
    let path_name = PathFileName(path);
    let base = path_name.base_name();
    let stem = base
        .strip_suffix(".txt")
        .or_else(|| base.strip_suffix(".TXT"))
        .or_else(|| base.strip_suffix(".zip"))
        .or_else(|| base.strip_suffix(".ZIP"))
        .unwrap_or(base);
    let cleaned = stem
        .strip_prefix("WhatsApp Chat with ")
        .or_else(|| stem.strip_prefix("WhatsApp Chat - "))
        .unwrap_or(stem);
    if cleaned == "_chat" || cleaned.is_empty() {
        "WhatsApp Chat".to_string()
    } else {
        cleaned.to_string()
    }
}

fn looks_like_whatsapp_chat(text: &str) -> bool {
    text.lines().take(40).any(|line| parse_header_line(line).is_some())
}

fn unique_senders(messages: &[ParsedMessage]) -> Vec<String> {
    let mut set = BTreeSet::new();
    for msg in messages {
        set.insert(msg.sender.clone());
    }
    set.into_iter().collect()
}

/// Sender labels WhatsApp uses for the account owner in chat exports.
const OBVIOUS_ME_LABELS: &[&str] = &[
    "you",
    "tu",
    "tú",
    "toi", // rare
    "du",
    "jij",
    "je",
    "você",
    "voce",
    "ты",
    "вы",
];

/// If exactly one sender matches a known “You” label, that person is me.
pub fn obvious_me_sender(senders: &[String]) -> Option<String> {
    let matches: Vec<&String> = senders
        .iter()
        .filter(|s| {
            let lower = s.trim().to_lowercase();
            OBVIOUS_ME_LABELS.iter().any(|label| *label == lower)
        })
        .collect();
    if matches.len() == 1 {
        Some(matches[0].clone())
    } else {
        None
    }
}

// ── Line parsing ──────────────────────────────────────────────────────────────

fn parse_messages(text: &str) -> Result<Vec<ParsedMessage>, CoreError> {
    let mut messages: Vec<ParsedMessage> = Vec::new();

    for raw_line in text.lines() {
        let line = raw_line.strip_suffix('\r').unwrap_or(raw_line);
        if line.is_empty() {
            continue;
        }

        if let Some((ts, hour, date_str, sender, body)) = parse_header_line(line) {
            if sender.is_empty() {
                // System notice — no sender.
                continue;
            }
            let kind = classify_body(&body);
            messages.push(ParsedMessage {
                sender,
                timestamp_secs: ts,
                hour,
                date_str,
                body,
                kind,
            });
        } else if let Some(last) = messages.last_mut() {
            last.body.push('\n');
            last.body.push_str(line);
            // Reclassify in case a media placeholder spanned oddly; body text wins.
            if last.kind.is_text() {
                last.kind = classify_body(&last.body);
            }
        }
        // Else: orphan continuation before any message — skip.
    }

    Ok(messages)
}

/// Returns `(timestamp_secs, hour, date_str, sender, body)` when the line starts
/// a new WhatsApp message. Empty `sender` means a system line (skip analytics).
fn parse_header_line(line: &str) -> Option<(i64, u8, String, String, String)> {
    if let Some(rest) = line.strip_prefix('[') {
        let close = rest.find(']')?;
        let date_part = &rest[..close];
        let after = rest[close + 1..].trim_start();
        let (ts, hour, date_str) = parse_whatsapp_date(date_part)?;
        return Some(match split_sender_body(after) {
            Some((sender, body)) => (ts, hour, date_str, sender, body),
            None => (ts, hour, date_str, String::new(), after.to_string()),
        });
    }

    // Android dash form: `12/01/24, 10:00 - Alice: Hello`
    let dash = find_android_dash(line)?;
    let date_part = line[..dash].trim();
    let after = line[dash + 1..].trim_start(); // skip '-'
    let (ts, hour, date_str) = parse_whatsapp_date(date_part)?;
    Some(match split_sender_body(after) {
        Some((sender, body)) => (ts, hour, date_str, sender, body),
        None => (ts, hour, date_str, String::new(), after.to_string()),
    })
}

fn find_android_dash(line: &str) -> Option<usize> {
    // Prefer ` - ` after a date/time segment (contains `/` or `.` and a comma).
    let comma = line.find(',')?;
    let after_comma = &line[comma + 1..];
    let rel = after_comma.find(" - ")?;
    Some(comma + 1 + rel + 1) // index of '-'
}

fn split_sender_body(after: &str) -> Option<(String, String)> {
    // System messages have no colon sender separator.
    let colon = after.find(": ")?;
    let sender = after[..colon].trim().to_string();
    let body = after[colon + 2..].to_string();
    if sender.is_empty() {
        return None;
    }
    Some((sender, body))
}

/// Parses WhatsApp date/time fragments into local-time epoch seconds.
pub fn parse_whatsapp_date(s: &str) -> Option<(i64, u8, String)> {
    let s = s.trim();
    let (date_part, time_part) = if let Some((d, t)) = s.split_once(',') {
        (d.trim(), t.trim())
    } else if let Some((d, t)) = s.split_once(' ') {
        (d.trim(), t.trim())
    } else {
        return None;
    };

    let (year, month, day) = parse_date_parts(date_part)?;
    let (hour, minute, second) = parse_time_parts(time_part)?;

    if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return None;
    }

    let days = civil_to_epoch_days(year, month, day);
    let ts = days * 86_400 + hour as i64 * 3_600 + minute as i64 * 60 + second as i64;
    let date_str = format!("{year:04}-{month:02}-{day:02}");
    Some((ts, hour, date_str))
}

fn parse_date_parts(s: &str) -> Option<(i64, i64, i64)> {
    let sep = if s.contains('/') {
        '/'
    } else if s.contains('.') {
        '.'
    } else if s.contains('-') {
        '-'
    } else {
        return None;
    };
    let parts: Vec<&str> = s.split(sep).collect();
    if parts.len() != 3 {
        return None;
    }
    let a: i64 = parts[0].parse().ok()?;
    let b: i64 = parts[1].parse().ok()?;
    let c: i64 = parts[2].parse().ok()?;

    // Y-M-D (rare in WA but possible)
    if a >= 1000 {
        return Some((a, b, c));
    }

    let year = normalize_year(c);
    // Ambiguous D/M vs M/D: prefer D/M when day > 12, else D/M (WhatsApp Android default).
    if a > 12 {
        Some((year, b, a)) // D/M/Y
    } else if b > 12 {
        Some((year, a, b)) // M/D/Y
    } else {
        // Default to D/M/Y (common outside US)
        Some((year, b, a))
    }
}

fn normalize_year(y: i64) -> i64 {
    if y < 100 {
        if y >= 70 { 1900 + y } else { 2000 + y }
    } else {
        y
    }
}

fn parse_time_parts(s: &str) -> Option<(u8, u8, u8)> {
    let lower = s.to_ascii_lowercase();
    let is_pm = lower.contains("pm");
    let is_am = lower.contains("am");
    let cleaned = lower
        .replace("am", "")
        .replace("pm", "")
        .replace('\u{202f}', " ")
        .trim()
        .to_string();

    let mut parts = cleaned.split(':');
    let mut hour: u8 = parts.next()?.trim().parse().ok()?;
    let minute: u8 = parts.next().unwrap_or("0").trim().parse().ok()?;
    let second: u8 = parts
        .next()
        .unwrap_or("0")
        .trim()
        .parse()
        .unwrap_or(0);

    if is_pm || is_am {
        if is_pm && hour < 12 {
            hour += 12;
        }
        if is_am && hour == 12 {
            hour = 0;
        }
    }
    if hour > 23 || minute > 59 || second > 59 {
        return None;
    }
    Some((hour, minute, second))
}

fn classify_body(body: &str) -> MessageKind {
    let t = body.trim().to_ascii_lowercase();
    if t.is_empty() {
        return MessageKind::Text;
    }

    // Common WhatsApp placeholders (EN + angle-bracket form).
    if t == "<media omitted>"
        || t == "media omitted"
        || t.contains("<media omitted>")
    {
        return MessageKind::Other;
    }
    if t.contains("image omitted")
        || t.ends_with("image omitted")
        || (t.contains("(file attached)")
            && (t.contains(".jpg")
                || t.contains(".jpeg")
                || t.contains(".png")
                || t.contains(".webp")))
    {
        return MessageKind::Photo;
    }
    if t.contains("video omitted")
        || t.contains("video note omitted")
        || (t.contains("(file attached)") && (t.contains(".mp4") || t.contains(".mov")))
    {
        return MessageKind::Video;
    }
    if t.contains("sticker omitted") {
        return MessageKind::Sticker;
    }
    if t.contains("gif omitted") || t.contains("animation omitted") {
        return MessageKind::Animation;
    }
    if t.contains("audio omitted")
        || t.contains("ptt omitted")
        || t.contains("voice message omitted")
        || t == "audio omitted"
    {
        return MessageKind::Voice;
    }
    if t.contains("document omitted")
        || t.contains("contact card omitted")
        || t.contains("(file attached)")
    {
        return MessageKind::File;
    }

    MessageKind::Text
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use zip::write::SimpleFileOptions;
    use zip::CompressionMethod;

    const ANDROID_SAMPLE: &str = "\
12/01/24, 10:00 - Alice: Hello
12/01/24, 10:01 - Bob: Hi there
12/01/24, 10:02 - Alice: image omitted
12/01/24, 10:03 - Alice: This is a
multiline message
12/01/24, 10:04 - Messages and calls are end-to-end encrypted. No one outside of this chat can read them.
12/01/24, 10:05 - Bob: <Media omitted>
";

    const IOS_SAMPLE: &str = "\
[12/01/2024, 10:00:15] Alice: Hello
[12/01/2024, 10:01:00] Bob: sticker omitted
[1/12/24, 10:02:00 AM] Alice: Morning!
";

    #[test]
    fn preview_finds_senders_android() {
        let preview = preview_export_bytes(ANDROID_SAMPLE.as_bytes(), None).unwrap();
        assert_eq!(preview.senders, vec!["Alice", "Bob"]);
        assert!(preview.message_count >= 4);
    }

    #[test]
    fn analyze_with_me_counts_sent() {
        let analytics =
            analyze_export_bytes(ANDROID_SAMPLE.as_bytes(), "Alice", None).unwrap();
        assert_eq!(analytics.display_name, "Alice");
        assert!(analytics.account.sent_messages >= 2);
        assert!(analytics.account.received_messages >= 1);
        assert_eq!(analytics.chat_count, 1);
    }

    #[test]
    fn ios_bracket_and_ampm() {
        let preview = preview_export_bytes(IOS_SAMPLE.as_bytes(), None).unwrap();
        assert!(preview.senders.iter().any(|s| s == "Alice"));
        let analytics = analyze_export_bytes(IOS_SAMPLE.as_bytes(), "Bob", None).unwrap();
        assert!(analytics.account.sent_messages >= 1);
    }

    #[test]
    fn rejects_unknown_me() {
        let err = analyze_export_bytes(ANDROID_SAMPLE.as_bytes(), "Carol", None).unwrap_err();
        assert!(err.to_string().contains("Carol"));
    }

    #[test]
    fn zip_with_chat_txt() {
        let mut buffer = Cursor::new(Vec::new());
        {
            let mut zip = zip::ZipWriter::new(&mut buffer);
            let opts = SimpleFileOptions::default().compression_method(CompressionMethod::Stored);
            zip.start_file("WhatsApp Chat with Alice.txt", opts)
                .unwrap();
            zip.write_all(ANDROID_SAMPLE.as_bytes()).unwrap();
            zip.start_file("IMG-001.jpg", opts).unwrap();
            zip.write_all(b"fake-image").unwrap();
            zip.finish().unwrap();
        }
        let bytes = buffer.into_inner();
        let preview = preview_export_bytes(&bytes, None).unwrap();
        assert_eq!(preview.chat_name, "Alice");
        assert_eq!(preview.senders, vec!["Alice", "Bob"]);

        let analytics = analyze_export_bytes(&bytes, "Bob", None).unwrap();
        assert_eq!(analytics.about_preview, "Alice");
        assert!(analytics.account.sent_messages >= 1);
    }

    #[test]
    fn obvious_you_is_suggested() {
        let sample = "\
01/01/24, 10:00 - You: hi
01/01/24, 10:01 - +31 6 19910646: hey
";
        let preview = preview_export_bytes(sample.as_bytes(), None).unwrap();
        assert_eq!(preview.suggested_me.as_deref(), Some("You"));
        assert!(preview.senders.iter().any(|s| s == "You"));
    }

    #[test]
    fn no_suggestion_without_you_label() {
        let preview = preview_export_bytes(ANDROID_SAMPLE.as_bytes(), None).unwrap();
        assert!(preview.suggested_me.is_none());
    }

    #[test]
    fn parse_dates() {
        let (ts, hour, date) = parse_whatsapp_date("12/01/24, 10:00").unwrap();
        assert_eq!(date, "2024-01-12");
        assert_eq!(hour, 10);
        assert!(ts > 0);

        let (_, hour2, date2) = parse_whatsapp_date("1/12/24, 10:02:00 AM").unwrap();
        assert_eq!(hour2, 10);
        assert_eq!(date2, "2024-12-01");
    }

    #[test]
    fn media_kinds() {
        assert!(matches!(classify_body("image omitted"), MessageKind::Photo));
        assert!(matches!(classify_body("sticker omitted"), MessageKind::Sticker));
        assert!(matches!(classify_body("<Media omitted>"), MessageKind::Other));
        assert!(matches!(classify_body("hello"), MessageKind::Text));
    }

    #[test]
    fn group_flag_with_three_senders() {
        let sample = "\
01/01/24, 10:00 - Alice: hi
01/01/24, 10:01 - Bob: hey
01/01/24, 10:02 - Carol: yo
";
        let analytics = analyze_export_bytes(sample.as_bytes(), "Alice", None).unwrap();
        assert!(analytics.chats[0].is_group);
    }
}
