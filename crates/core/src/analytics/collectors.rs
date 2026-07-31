//! Streaming analytics collectors — platform-agnostic stat computation.
//!
//! ## Design
//!
//! Parsers produce normalized [`MessageEvent`]s one at a time.  The
//! [`AnalysisEngine`] drives **all collectors** in a single sequential
//! pass, keeping memory flat even for 300 MB+ exports.  Results are bundled
//! into [`WrapAnalytics`] which is serialised to camelCase JSON for the WASM
//! layer.
//!
//! | Stat | #  |
//! |------|----|
//! | Total volume & dominance | 21 |
//! | Sent vs received         | 22 |
//! | Voice vs text            | 23 |
//! | Message length balance   | 16 |
//! | Average response time    | 15 |
//! | Late-night chats (1–5 AM)| 14 |
//! | Initiator vs finisher    | 12 |
//! | Top emojis & reactions   |  9 |
//! | Circadian rhythm + sleep |  4 |
//! | Activity heatmap         |  5 |
//! | Keyword battle (per chat)|  3 |
//! | Edit counter             | 20 |
//! | Ghosting index           | 29 |

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

// ── Input event ───────────────────────────────────────────────────────────────

/// Kind of message content — used by multiple collectors.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MessageKind {
    Text,
    Voice,
    /// Telegram "video message" (round-video).
    VideoMessage,
    Video,
    Photo,
    Sticker,
    Animation,
    File,
    Other,
}

impl MessageKind {
    /// Returns `true` for kinds that carry a user-written text body.
    pub fn is_text(&self) -> bool {
        matches!(self, MessageKind::Text)
    }
    /// Returns `true` for voice/video-message kinds that have a duration.
    pub fn is_voice_like(&self) -> bool {
        matches!(self, MessageKind::Voice | MessageKind::VideoMessage)
    }
}

/// Fine-grained content bucket for the message-type mix pie chart.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ContentKind {
    /// Ordinary text (not link-only / emoji-only).
    Normal,
    /// Text that contains a URL / link entity.
    Link,
    /// Message body is only emoji(s) / whitespace.
    Emoji,
    Voice,
    /// Round video notes.
    VideoMessage,
    Video,
    Image,
    Sticker,
    Gif,
    File,
    Other,
}

impl ContentKind {
    pub fn as_key(self) -> &'static str {
        match self {
            ContentKind::Normal => "normal",
            ContentKind::Link => "link",
            ContentKind::Emoji => "emoji",
            ContentKind::Voice => "voice",
            ContentKind::VideoMessage => "videoMessage",
            ContentKind::Video => "video",
            ContentKind::Image => "image",
            ContentKind::Sticker => "sticker",
            ContentKind::Gif => "gif",
            ContentKind::File => "file",
            ContentKind::Other => "other",
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            ContentKind::Normal => "Normal",
            ContentKind::Link => "Link",
            ContentKind::Emoji => "Emoji",
            ContentKind::Voice => "Voice",
            ContentKind::VideoMessage => "Video note",
            ContentKind::Video => "Video",
            ContentKind::Image => "Image",
            ContentKind::Sticker => "Sticker",
            ContentKind::Gif => "GIF",
            ContentKind::File => "File",
            ContentKind::Other => "Other",
        }
    }

    /// Classify from media kind + text traits (link / pure emoji).
    pub fn classify(kind: &MessageKind, has_link: bool, is_pure_emoji: bool) -> Self {
        match kind {
            MessageKind::Voice => ContentKind::Voice,
            MessageKind::VideoMessage => ContentKind::VideoMessage,
            MessageKind::Video => ContentKind::Video,
            MessageKind::Photo => ContentKind::Image,
            MessageKind::Sticker => ContentKind::Sticker,
            MessageKind::Animation => ContentKind::Gif,
            MessageKind::File => ContentKind::File,
            MessageKind::Other => ContentKind::Other,
            MessageKind::Text => {
                if is_pure_emoji {
                    ContentKind::Emoji
                } else if has_link {
                    ContentKind::Link
                } else {
                    ContentKind::Normal
                }
            }
        }
    }
}

/// Returns `true` when `text` is empty of non-emoji characters (emoji-only message).
pub fn is_pure_emoji_text(text: &str) -> bool {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return false;
    }
    let mut saw_emoji = false;
    for c in trimmed.chars() {
        if c.is_whitespace() {
            continue;
        }
        if is_emoji_related_char(c) {
            saw_emoji = true;
            continue;
        }
        return false;
    }
    saw_emoji
}

fn is_emoji_related_char(c: char) -> bool {
    let cp = c as u32;
    match cp {
        0x1F3FB..=0x1F3FF => true, // skin tone
        0xFE00..=0xFE0F => true,   // variation selectors
        0x200D => true,            // ZWJ
        0x20E3 => true,            // keycap
        0x1F1E6..=0x1F1FF => true, // regional indicators (flags)
        _ => is_significant_emoji(c),
    }
}

/// Heuristic URL / www detection for plain text.
pub fn text_has_url(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    lower.contains("http://")
        || lower.contains("https://")
        || lower.contains("www.")
        || lower.contains("t.me/")
}

/// One reaction left on a message.
#[derive(Debug, Clone)]
pub struct ReactionEvent {
    pub emoji: String,
    /// `true` when the account owner left this reaction.
    pub from_me: bool,
}

/// Normalised representation of one message — the only type parsers must produce.
///
/// Ordering by `timestamp_secs` is assumed; out-of-order messages produce
/// incorrect response-time and initiator/finisher stats but won't panic.
#[derive(Debug, Clone)]
pub struct MessageEvent {
    /// Platform-assigned chat id (used to split per-chat analytics).
    pub chat_id: i64,
    pub chat_name: String,
    /// Group / supergroup (not a 1:1 DM).
    pub is_group: bool,
    /// Channel — excluded from contact and group insight lists.
    pub is_channel: bool,
    /// Peer account deleted or name missing.
    pub is_deleted: bool,
    /// `true` when the account owner sent this message.
    pub is_mine: bool,
    /// Display name of the sender.
    pub sender_name: String,
    /// Unix-epoch seconds in *local time* (Telegram exports local timestamps).
    pub timestamp_secs: i64,
    /// 0–23 local hour, extracted at parse time to avoid recomputation.
    pub hour: u8,
    /// `"YYYY-MM-DD"` local date string, used as a heatmap key.
    pub date_str: String,
    pub kind: MessageKind,
    /// Fine-grained bucket for the content-mix pie (normal / link / emoji / media…).
    pub content_kind: ContentKind,
    /// UTF-8 character count (0 for non-text messages).
    pub char_count: usize,
    /// Lowercased word tokens from text (empty for non-text). Used for keyword battle.
    pub words: Vec<String>,
    /// Seconds of audio/video content (0 if not applicable).
    pub voice_duration_secs: u32,
    /// Base emoji characters extracted from the message text.
    pub emojis: Vec<String>,
    pub reactions: Vec<ReactionEvent>,
    /// Telegram `edited` field was present (message was edited after send).
    pub is_edited: bool,
}

// ── Output types ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParticipantCount {
    pub name: String,
    pub count: u64,
    pub pct: f64,
}

// stat 21 + 22
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VolumeStats {
    pub total: u64,
    pub sent: u64,
    pub received: u64,
    /// Sorted descending by count.
    pub participants: Vec<ParticipantCount>,
}

// stat 23 — message content mix (normal / link / emoji / media…)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentTypeCount {
    /// Stable key: normal | link | emoji | voice | videoMessage | video | image | sticker | gif | file | other
    pub kind: String,
    pub label: String,
    pub count: u64,
    pub pct: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentMixStats {
    pub total: u64,
    pub total_voice_duration_secs: u64,
    /// Non-zero types only, sorted by count descending.
    pub types: Vec<ContentTypeCount>,
}

// stat 16
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageLengthParticipant {
    pub name: String,
    pub avg_chars: f64,
    pub total_chars: u64,
    pub count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageLengthStats {
    /// Sorted descending by avg_chars.
    pub participants: Vec<MessageLengthParticipant>,
}

// stat 15
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResponseTimeParticipant {
    pub name: String,
    pub avg_secs: f64,
    pub median_secs: f64,
    pub sample_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResponseTimeStats {
    /// Sorted ascending by avg_secs (faster replier first).
    pub participants: Vec<ResponseTimeParticipant>,
}

// stat 14
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LateNightParticipant {
    pub name: String,
    pub count: u64,
    /// Late-night messages as a share of this participant's own total.
    pub pct_of_participant_total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LateNightStats {
    pub total_late_night: u64,
    /// Sorted descending by count.
    pub participants: Vec<LateNightParticipant>,
}

// stat 12
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitiatorFinisherStats {
    /// Who opens conversations after ≥ 6 h of silence.
    pub initiators: Vec<ParticipantCount>,
    /// Who sent the last message before a ≥ 6 h gap.
    pub finishers: Vec<ParticipantCount>,
}

// stat 9
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmojiEntry {
    pub emoji: String,
    pub count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmojiParticipant {
    pub name: String,
    pub top_emojis: Vec<EmojiEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmojiStats {
    /// Top 20 emojis across all participants.
    pub top_overall: Vec<EmojiEntry>,
    pub by_participant: Vec<EmojiParticipant>,
    /// Top 10 reactions (emoji + combined count across all messages).
    pub top_reactions: Vec<EmojiEntry>,
}

// stat 4
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CircadianParticipant {
    pub name: String,
    /// 24 hourly message counts (index = hour 0..23).
    pub hourly: Vec<u64>,
    /// Estimated sleep-start hour (0–23).
    pub sleep_start_hour: u8,
    /// Estimated sleep-end (wake) hour (0–23).
    pub sleep_end_hour: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CircadianStats {
    /// Combined 24-element hourly totals.
    pub hourly_total: Vec<u64>,
    pub participants: Vec<CircadianParticipant>,
}

// stat 5
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HeatmapDay {
    /// `"YYYY-MM-DD"`.
    pub date: String,
    pub count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HeatmapStats {
    /// Sorted chronologically.
    pub days: Vec<HeatmapDay>,
}

/// One bucket of sent vs received over a time period.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityPoint {
    /// `"YYYY-MM-DD"` (daily), `"YYYY-MM"` (monthly), or `"YYYY"` (yearly).
    pub period: String,
    pub sent: u64,
    pub received: u64,
}

/// Sent vs received volume over time — powers the hero brush chart.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityTimeSeries {
    /// Per-day buckets, sorted chronologically.
    pub daily: Vec<ActivityPoint>,
    /// Per-month buckets (`YYYY-MM`), sorted chronologically.
    pub monthly: Vec<ActivityPoint>,
    /// Per-year buckets (`YYYY`), sorted chronologically.
    pub yearly: Vec<ActivityPoint>,
    /// Distinct years that have activity (descending, newest first).
    pub years: Vec<u16>,
}

// stat 3 — keyword battle (you vs them word counts)
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeywordStats {
    /// Lowercased word → `[you, them]` occurrence counts.
    /// Capped at [`MAX_KEYWORDS`] most frequent words to bound storage.
    #[serde(default)]
    pub counts: HashMap<String, [u64; 2]>,
}

// stat 20 — edit counter (Telegram `edited` field)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditTypoParticipant {
    pub name: String,
    pub edits: u64,
    /// Legacy field from when asterisk corrections were counted; always 0 now.
    #[serde(default)]
    pub typos: u64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditTypoStats {
    pub total_edits: u64,
    /// Legacy field; always 0 now.
    #[serde(default)]
    pub total_typos: u64,
    /// Participants with at least one edit, sorted by edits desc.
    #[serde(default)]
    pub participants: Vec<EditTypoParticipant>,
}

// stat 29 — ghosting index (left unanswered ≥ 24h)
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GhostingStats {
    pub total: u64,
    /// Times each person left someone hanging ≥ 24h (sorted by count desc).
    #[serde(default)]
    pub participants: Vec<ParticipantCount>,
}

// ── Aggregate result types ────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyticsResult {
    pub total_messages: u64,
    pub sent_messages: u64,
    pub received_messages: u64,
    pub volume: VolumeStats,
    pub content_mix: ContentMixStats,
    pub message_length: MessageLengthStats,
    pub response_time: ResponseTimeStats,
    pub late_night: LateNightStats,
    pub initiator_finisher: InitiatorFinisherStats,
    pub emojis: EmojiStats,
    pub circadian: CircadianStats,
    pub heatmap: HeatmapStats,
    pub activity_over_time: ActivityTimeSeries,
    /// Per-chat keyword index for Keyword Battle (empty on account-level).
    #[serde(default)]
    pub keywords: KeywordStats,
    /// Edited messages (Telegram `edited` field).
    #[serde(default)]
    pub edit_typo: EditTypoStats,
    /// Times each participant ghosted (left a message unanswered ≥ 24h).
    #[serde(default)]
    pub ghosting: GhostingStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatResult {
    pub chat_id: i64,
    pub chat_name: String,
    pub analytics: AnalyticsResult,
    /// Group / supergroup chat.
    #[serde(default)]
    pub is_group: bool,
    /// Deleted peer (or missing name) — UI should label clearly.
    #[serde(default)]
    pub is_deleted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WrapAnalytics {
    pub display_name: String,
    pub username: Option<String>,
    pub about_preview: String,
    pub file_size_bytes: u64,
    pub chat_count: usize,
    pub sample_messages: Vec<String>,
    pub account: AnalyticsResult,
    /// Deduped union of insight lists — used for drill-down lookup by `chatId`.
    pub chats: Vec<ChatResult>,
    /// Top 20 personal chats by lifetime volume.
    #[serde(default)]
    pub top_contacts: Vec<ChatResult>,
    /// Top 5 personal chats by message volume in the last 90 days.
    #[serde(default)]
    pub recent_contacts: Vec<ChatResult>,
    /// Top 5 personal chats that were active before, quiet in the last 90 days.
    #[serde(default)]
    pub faded_contacts: Vec<ChatResult>,
    /// Top 5 group chats by lifetime volume.
    #[serde(default)]
    pub top_groups: Vec<ChatResult>,
    /// Top 5 personal contacts by ghosting score (they left you hanging ≥ 24h).
    #[serde(default)]
    pub top_ghosters: Vec<ChatResult>,
}

// ── Internal collector state ──────────────────────────────────────────────────

/// Maximum response-time samples stored per participant to cap memory.
const MAX_DELAY_SAMPLES: usize = 10_000;

/// Cap keyword index size per chat so wrap JSON stays bounded.
const MAX_KEYWORDS: usize = 8_000;

/// Gaps ≥ this many seconds are treated as a new conversation.
const INITIATOR_GAP_SECS: i64 = 6 * 3_600; // 6 h

/// No reply for this long after a message counts as ghosting.
const GHOST_GAP_SECS: i64 = 24 * 3_600; // 24 h

/// Top emojis stored per sender.
const TOP_EMOJIS: usize = 10;

struct EngineState {
    // ── volume / sent-received (stats 21, 22) ─────────────────────────────
    volume_counts: HashMap<String, u64>,
    sent_count: u64,
    received_count: u64,

    // ── content mix (stat 23) ─────────────────────────────────────────────
    content_counts: HashMap<ContentKind, u64>,
    voice_secs: u64,

    // ── message length (stat 16) ──────────────────────────────────────────
    msg_chars: HashMap<String, u64>,
    msg_char_counts: HashMap<String, u64>,

    // ── response time (stat 15) ───────────────────────────────────────────
    rt_delays: HashMap<String, Vec<u32>>,
    rt_last_ts: i64,
    rt_last_sender: String,

    // ── late night (stat 14) ──────────────────────────────────────────────
    late_counts: HashMap<String, u64>,
    participant_totals: HashMap<String, u64>,

    // ── initiator / finisher (stat 12) ────────────────────────────────────
    if_initiations: HashMap<String, u64>,
    if_finishes: HashMap<String, u64>,
    if_last_ts: i64,
    if_last_sender: String,
    if_first: bool,

    // ── emojis & reactions (stat 9) ───────────────────────────────────────
    overall_emojis: HashMap<String, u64>,
    sender_emojis: HashMap<String, HashMap<String, u64>>,
    reactions_map: HashMap<String, u64>,

    // ── circadian (stat 4) ────────────────────────────────────────────────
    circ_overall: [u64; 24],
    circ_by_sender: HashMap<String, [u64; 24]>,

    // ── heatmap (stat 5) ──────────────────────────────────────────────────
    heatmap_days: HashMap<String, u64>,

    // ── activity over time (sent vs received) ─────────────────────────────
    /// `"YYYY-MM-DD"` → (sent, received)
    activity_daily: HashMap<String, (u64, u64)>,

    // ── keyword battle (stat 3) — you vs them word counts ─────────────────
    /// word → (you, them)
    keywords: HashMap<String, (u64, u64)>,

    // ── edits (stat 20) ───────────────────────────────────────────────────
    edit_counts: HashMap<String, u64>,

    // ── ghosting (stat 29) ────────────────────────────────────────────────
    ghost_counts: HashMap<String, u64>,
    ghost_last_ts: i64,
    ghost_last_sender: String,
    /// Last sender different from `ghost_last_sender` (for double-text after a gap).
    ghost_last_other: String,
}

impl EngineState {
    fn new() -> Self {
        Self {
            volume_counts: HashMap::new(),
            sent_count: 0,
            received_count: 0,
            content_counts: HashMap::new(),
            voice_secs: 0,
            msg_chars: HashMap::new(),
            msg_char_counts: HashMap::new(),
            rt_delays: HashMap::new(),
            rt_last_ts: 0,
            rt_last_sender: String::new(),
            late_counts: HashMap::new(),
            participant_totals: HashMap::new(),
            if_initiations: HashMap::new(),
            if_finishes: HashMap::new(),
            if_last_ts: 0,
            if_last_sender: String::new(),
            if_first: true,
            overall_emojis: HashMap::new(),
            sender_emojis: HashMap::new(),
            reactions_map: HashMap::new(),
            circ_overall: [0u64; 24],
            circ_by_sender: HashMap::new(),
            heatmap_days: HashMap::new(),
            activity_daily: HashMap::new(),
            keywords: HashMap::new(),
            edit_counts: HashMap::new(),
            ghost_counts: HashMap::new(),
            ghost_last_ts: 0,
            ghost_last_sender: String::new(),
            ghost_last_other: String::new(),
        }
    }

    fn feed(&mut self, ev: &MessageEvent) {
        let sender = &ev.sender_name;

        // ── Volume / sent-received ────────────────────────────────────────
        *self.volume_counts.entry(sender.clone()).or_default() += 1;
        *self.participant_totals.entry(sender.clone()).or_default() += 1;
        if ev.is_mine {
            self.sent_count += 1;
        } else {
            self.received_count += 1;
        }

        // ── Content mix (normal / link / emoji / media…) ─────────────────
        *self.content_counts.entry(ev.content_kind).or_default() += 1;
        if ev.kind.is_voice_like() {
            self.voice_secs += ev.voice_duration_secs as u64;
        }

        // ── Message length (text only) ────────────────────────────────────
        if ev.kind.is_text() && ev.char_count > 0 {
            *self.msg_chars.entry(sender.clone()).or_default() += ev.char_count as u64;
            *self.msg_char_counts.entry(sender.clone()).or_default() += 1;
        }

        // ── Edits (stat 20) ───────────────────────────────────────────────
        if ev.is_edited {
            *self.edit_counts.entry(sender.clone()).or_default() += 1;
        }

        // ── Ghosting (stat 29) ────────────────────────────────────────────
        if ev.timestamp_secs > 0 {
            if !self.ghost_last_sender.is_empty() && self.ghost_last_ts > 0 {
                let gap = ev.timestamp_secs - self.ghost_last_ts;
                if gap >= GHOST_GAP_SECS {
                    if *sender != self.ghost_last_sender {
                        // Current sender finally replied after leaving them hanging.
                        *self.ghost_counts.entry(sender.clone()).or_default() += 1;
                    } else if !self.ghost_last_other.is_empty() {
                        // Same person double-texted — the other party ghosted them.
                        *self
                            .ghost_counts
                            .entry(self.ghost_last_other.clone())
                            .or_default() += 1;
                    }
                }
            }
            if !self.ghost_last_sender.is_empty() && *sender != self.ghost_last_sender {
                self.ghost_last_other = self.ghost_last_sender.clone();
            }
            self.ghost_last_ts = ev.timestamp_secs;
            self.ghost_last_sender = sender.clone();
        }

        // ── Response time ─────────────────────────────────────────────────
        if ev.timestamp_secs > 0 {
            if !self.rt_last_sender.is_empty()
                && self.rt_last_sender != *sender
                && ev.timestamp_secs > self.rt_last_ts
            {
                let gap = ev.timestamp_secs - self.rt_last_ts;
                // Exclude gaps > 12 h (overnight / days away)
                if gap > 0 && gap < 43_200 {
                    let slot = self.rt_delays.entry(sender.clone()).or_default();
                    if slot.len() < MAX_DELAY_SAMPLES {
                        slot.push(gap.min(u32::MAX as i64) as u32);
                    }
                }
            }
            self.rt_last_ts = ev.timestamp_secs;
            self.rt_last_sender = sender.clone();
        }

        // ── Late night (01:00–04:59) ──────────────────────────────────────
        if ev.hour >= 1 && ev.hour < 5 {
            *self.late_counts.entry(sender.clone()).or_default() += 1;
        }

        // ── Initiator / finisher ──────────────────────────────────────────
        if self.if_first {
            *self.if_initiations.entry(sender.clone()).or_default() += 1;
            self.if_first = false;
        } else if !self.if_last_sender.is_empty() && ev.timestamp_secs > 0 && self.if_last_ts > 0 {
            let gap = ev.timestamp_secs - self.if_last_ts;
            if gap >= INITIATOR_GAP_SECS {
                // Previous sender "closed"; current sender "opens"
                *self
                    .if_finishes
                    .entry(self.if_last_sender.clone())
                    .or_default() += 1;
                *self.if_initiations.entry(sender.clone()).or_default() += 1;
            }
        }
        if ev.timestamp_secs > 0 || self.if_last_sender.is_empty() {
            self.if_last_ts = ev.timestamp_secs;
            self.if_last_sender = sender.clone();
        }

        // ── Emojis ────────────────────────────────────────────────────────
        for emoji in &ev.emojis {
            *self.overall_emojis.entry(emoji.clone()).or_default() += 1;
            *self
                .sender_emojis
                .entry(sender.clone())
                .or_default()
                .entry(emoji.clone())
                .or_default() += 1;
        }

        // ── Reactions ─────────────────────────────────────────────────────
        for r in &ev.reactions {
            *self.reactions_map.entry(r.emoji.clone()).or_default() += 1;
        }

        // ── Circadian ─────────────────────────────────────────────────────
        let h = ev.hour as usize;
        if h < 24 {
            self.circ_overall[h] += 1;
            self.circ_by_sender
                .entry(sender.clone())
                .or_insert([0u64; 24])[h] += 1;
        }

        // ── Heatmap ───────────────────────────────────────────────────────
        if !ev.date_str.is_empty() {
            *self.heatmap_days.entry(ev.date_str.clone()).or_default() += 1;
            let slot = self
                .activity_daily
                .entry(ev.date_str.clone())
                .or_insert((0, 0));
            if ev.is_mine {
                slot.0 += 1;
            } else {
                slot.1 += 1;
            }
        }
    }

    /// Count word tokens for Keyword Battle (call only on per-chat state).
    fn feed_keywords(&mut self, ev: &MessageEvent) {
        if ev.words.is_empty() {
            return;
        }
        for word in &ev.words {
            let slot = self.keywords.entry(word.clone()).or_insert((0, 0));
            if ev.is_mine {
                slot.0 += 1;
            } else {
                slot.1 += 1;
            }
        }
    }

    fn build(self) -> AnalyticsResult {
        let total = self.sent_count + self.received_count;

        // ── Volume ────────────────────────────────────────────────────────
        let mut parts: Vec<ParticipantCount> = self
            .volume_counts
            .iter()
            .map(|(name, &count)| ParticipantCount {
                name: name.clone(),
                count,
                pct: if total > 0 {
                    count as f64 * 100.0 / total as f64
                } else {
                    0.0
                },
            })
            .collect();
        parts.sort_by(|a, b| b.count.cmp(&a.count));
        let volume = VolumeStats {
            total,
            sent: self.sent_count,
            received: self.received_count,
            participants: parts,
        };

        // ── Content mix ───────────────────────────────────────────────────
        let mix_total: u64 = self.content_counts.values().sum();
        let mut types: Vec<ContentTypeCount> = self
            .content_counts
            .iter()
            .filter(|(_, &c)| c > 0)
            .map(|(kind, &count)| ContentTypeCount {
                kind: kind.as_key().to_string(),
                label: kind.label().to_string(),
                count,
                pct: if mix_total > 0 {
                    count as f64 / mix_total as f64 * 100.0
                } else {
                    0.0
                },
            })
            .collect();
        types.sort_by(|a, b| b.count.cmp(&a.count));
        let content_mix = ContentMixStats {
            total: mix_total,
            total_voice_duration_secs: self.voice_secs,
            types,
        };

        // ── Message length ────────────────────────────────────────────────
        let mut ml_parts: Vec<MessageLengthParticipant> = self
            .msg_char_counts
            .iter()
            .filter(|(_, &c)| c > 0)
            .map(|(name, &count)| {
                let tc = *self.msg_chars.get(name).unwrap_or(&0);
                MessageLengthParticipant {
                    name: name.clone(),
                    avg_chars: tc as f64 / count as f64,
                    total_chars: tc,
                    count,
                }
            })
            .collect();
        ml_parts.sort_by(|a, b| {
            b.avg_chars
                .partial_cmp(&a.avg_chars)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        let message_length = MessageLengthStats {
            participants: ml_parts,
        };

        // ── Response time ─────────────────────────────────────────────────
        let mut rt_parts: Vec<ResponseTimeParticipant> = self
            .rt_delays
            .iter()
            .filter(|(_, v)| !v.is_empty())
            .map(|(name, delays)| {
                let mut sorted = delays.clone();
                sorted.sort_unstable();
                let avg =
                    sorted.iter().map(|&d| d as f64).sum::<f64>() / sorted.len() as f64;
                let median = sorted[sorted.len() / 2] as f64;
                ResponseTimeParticipant {
                    name: name.clone(),
                    avg_secs: avg,
                    median_secs: median,
                    sample_count: sorted.len() as u64,
                }
            })
            .collect();
        rt_parts.sort_by(|a, b| {
            a.avg_secs
                .partial_cmp(&b.avg_secs)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        let response_time = ResponseTimeStats {
            participants: rt_parts,
        };

        // ── Late night ────────────────────────────────────────────────────
        let total_ln: u64 = self.late_counts.values().sum();
        let mut ln_parts: Vec<LateNightParticipant> = self
            .participant_totals
            .iter()
            .map(|(name, &pt)| {
                let late = *self.late_counts.get(name).unwrap_or(&0);
                LateNightParticipant {
                    name: name.clone(),
                    count: late,
                    pct_of_participant_total: if pt > 0 {
                        late as f64 * 100.0 / pt as f64
                    } else {
                        0.0
                    },
                }
            })
            .collect();
        ln_parts.sort_by(|a, b| b.count.cmp(&a.count));
        let late_night = LateNightStats {
            total_late_night: total_ln,
            participants: ln_parts,
        };

        // ── Initiator / finisher ──────────────────────────────────────────
        let all_if: std::collections::HashSet<String> = self
            .if_initiations
            .keys()
            .chain(self.if_finishes.keys())
            .cloned()
            .collect();
        let total_init: u64 = self.if_initiations.values().sum();
        let total_fin: u64 = self.if_finishes.values().sum();
        let mut initiators: Vec<ParticipantCount> = all_if
            .iter()
            .map(|name| {
                let c = *self.if_initiations.get(name).unwrap_or(&0);
                ParticipantCount {
                    name: name.clone(),
                    count: c,
                    pct: if total_init > 0 {
                        c as f64 * 100.0 / total_init as f64
                    } else {
                        0.0
                    },
                }
            })
            .collect();
        initiators.sort_by(|a, b| b.count.cmp(&a.count));
        let mut finishers: Vec<ParticipantCount> = all_if
            .iter()
            .map(|name| {
                let c = *self.if_finishes.get(name).unwrap_or(&0);
                ParticipantCount {
                    name: name.clone(),
                    count: c,
                    pct: if total_fin > 0 {
                        c as f64 * 100.0 / total_fin as f64
                    } else {
                        0.0
                    },
                }
            })
            .collect();
        finishers.sort_by(|a, b| b.count.cmp(&a.count));
        let initiator_finisher = InitiatorFinisherStats {
            initiators,
            finishers,
        };

        // ── Emojis ────────────────────────────────────────────────────────
        let mut overall_vec: Vec<EmojiEntry> = self
            .overall_emojis
            .iter()
            .map(|(e, &c)| EmojiEntry {
                emoji: e.clone(),
                count: c,
            })
            .collect();
        overall_vec.sort_by(|a, b| b.count.cmp(&a.count));
        overall_vec.truncate(20);

        let mut by_participant: Vec<EmojiParticipant> = self
            .sender_emojis
            .iter()
            .map(|(name, map)| {
                let mut entries: Vec<EmojiEntry> = map
                    .iter()
                    .map(|(e, &c)| EmojiEntry {
                        emoji: e.clone(),
                        count: c,
                    })
                    .collect();
                entries.sort_by(|a, b| b.count.cmp(&a.count));
                entries.truncate(TOP_EMOJIS);
                EmojiParticipant {
                    name: name.clone(),
                    top_emojis: entries,
                }
            })
            .collect();
        by_participant.sort_by(|a, b| a.name.cmp(&b.name));

        let mut top_reactions: Vec<EmojiEntry> = self
            .reactions_map
            .iter()
            .map(|(e, &c)| EmojiEntry {
                emoji: e.clone(),
                count: c,
            })
            .collect();
        top_reactions.sort_by(|a, b| b.count.cmp(&a.count));
        top_reactions.truncate(10);

        let emojis = EmojiStats {
            top_overall: overall_vec,
            by_participant,
            top_reactions,
        };

        // ── Circadian ─────────────────────────────────────────────────────
        let hourly_total = self.circ_overall.to_vec();
        let mut circ_parts: Vec<CircadianParticipant> = self
            .circ_by_sender
            .iter()
            .map(|(name, hourly)| {
                let (sleep_start, sleep_end) = estimate_sleep_window(hourly);
                CircadianParticipant {
                    name: name.clone(),
                    hourly: hourly.to_vec(),
                    sleep_start_hour: sleep_start,
                    sleep_end_hour: sleep_end,
                }
            })
            .collect();
        circ_parts.sort_by(|a, b| a.name.cmp(&b.name));
        let circadian = CircadianStats {
            hourly_total,
            participants: circ_parts,
        };

        // ── Heatmap ───────────────────────────────────────────────────────
        let mut days: Vec<HeatmapDay> = self
            .heatmap_days
            .iter()
            .map(|(date, &count)| HeatmapDay {
                date: date.clone(),
                count,
            })
            .collect();
        days.sort_by(|a, b| a.date.cmp(&b.date));
        let heatmap = HeatmapStats { days };

        // ── Activity over time (sent vs received) ─────────────────────────
        let activity_over_time = build_activity_time_series(&self.activity_daily);

        // ── Keywords (you vs them) ────────────────────────────────────────
        let keywords = build_keyword_stats(self.keywords);

        // ── Edits ─────────────────────────────────────────────────────────
        let edit_typo = build_edit_stats(&self.edit_counts);

        // ── Ghosting ──────────────────────────────────────────────────────
        let ghosting = build_ghosting_stats(&self.ghost_counts);

        AnalyticsResult {
            total_messages: total,
            sent_messages: self.sent_count,
            received_messages: self.received_count,
            volume,
            content_mix,
            message_length,
            response_time,
            late_night,
            initiator_finisher,
            emojis,
            circadian,
            heatmap,
            activity_over_time,
            keywords,
            edit_typo,
            ghosting,
        }
    }
}

fn build_keyword_stats(map: HashMap<String, (u64, u64)>) -> KeywordStats {
    let mut entries: Vec<(String, u64, u64, u64)> = map
        .into_iter()
        .map(|(word, (you, them))| {
            let total = you.saturating_add(them);
            (word, you, them, total)
        })
        .filter(|(_, _, _, total)| *total > 0)
        .collect();
    entries.sort_by(|a, b| b.3.cmp(&a.3).then_with(|| a.0.cmp(&b.0)));
    if entries.len() > MAX_KEYWORDS {
        entries.truncate(MAX_KEYWORDS);
    }
    let mut counts = HashMap::with_capacity(entries.len());
    for (word, you, them, _) in entries {
        counts.insert(word, [you, them]);
    }
    KeywordStats { counts }
}

fn build_edit_stats(edits: &HashMap<String, u64>) -> EditTypoStats {
    let mut participants: Vec<EditTypoParticipant> = edits
        .iter()
        .filter(|(_, &count)| count > 0)
        .map(|(name, &count)| EditTypoParticipant {
            name: name.clone(),
            edits: count,
            typos: 0,
        })
        .collect();
    participants.sort_by(|a, b| b.edits.cmp(&a.edits).then_with(|| a.name.cmp(&b.name)));
    EditTypoStats {
        total_edits: edits.values().sum(),
        total_typos: 0,
        participants,
    }
}

fn build_ghosting_stats(counts: &HashMap<String, u64>) -> GhostingStats {
    let total: u64 = counts.values().sum();
    let mut participants: Vec<ParticipantCount> = counts
        .iter()
        .filter(|(_, &c)| c > 0)
        .map(|(name, &count)| ParticipantCount {
            name: name.clone(),
            count,
            pct: if total > 0 {
                count as f64 * 100.0 / total as f64
            } else {
                0.0
            },
        })
        .collect();
    participants.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.name.cmp(&b.name)));
    GhostingStats {
        total,
        participants,
    }
}

/// Split message text into lowercased word tokens for Keyword Battle.
pub fn tokenize_words(text: &str) -> Vec<String> {
    let mut out = Vec::new();
    for raw in text.split(|c: char| !(c.is_alphanumeric() || c == '\'' || c == '\u{2019}')) {
        let token: String = raw
            .trim_matches(|c: char| c == '\'' || c == '\u{2019}')
            .chars()
            .flat_map(|c| c.to_lowercase())
            .collect();
        let len = token.chars().count();
        if len >= 2 && len <= 40 {
            out.push(token);
        }
    }
    out
}

fn build_activity_time_series(
    daily_map: &HashMap<String, (u64, u64)>,
) -> ActivityTimeSeries {
    let mut daily: Vec<ActivityPoint> = daily_map
        .iter()
        .map(|(period, &(sent, received))| ActivityPoint {
            period: period.clone(),
            sent,
            received,
        })
        .collect();
    daily.sort_by(|a, b| a.period.cmp(&b.period));

    let mut monthly_map: HashMap<String, (u64, u64)> = HashMap::new();
    let mut yearly_map: HashMap<String, (u64, u64)> = HashMap::new();
    let mut year_set: std::collections::BTreeSet<u16> = std::collections::BTreeSet::new();

    for point in &daily {
        if point.period.len() < 7 {
            continue;
        }
        let month_key = point.period[..7].to_string(); // YYYY-MM
        let slot = monthly_map.entry(month_key).or_insert((0, 0));
        slot.0 += point.sent;
        slot.1 += point.received;

        if point.period.len() >= 4 {
            let year_key = point.period[..4].to_string();
            if let Ok(y) = year_key.parse::<u16>() {
                year_set.insert(y);
            }
            let slot = yearly_map.entry(year_key).or_insert((0, 0));
            slot.0 += point.sent;
            slot.1 += point.received;
        }
    }

    let mut monthly: Vec<ActivityPoint> = monthly_map
        .into_iter()
        .map(|(period, (sent, received))| ActivityPoint {
            period,
            sent,
            received,
        })
        .collect();
    monthly.sort_by(|a, b| a.period.cmp(&b.period));

    let mut yearly: Vec<ActivityPoint> = yearly_map
        .into_iter()
        .map(|(period, (sent, received))| ActivityPoint {
            period,
            sent,
            received,
        })
        .collect();
    yearly.sort_by(|a, b| a.period.cmp(&b.period));

    // Newest year first for the UI picker default.
    let years: Vec<u16> = year_set.into_iter().rev().collect();

    ActivityTimeSeries {
        daily,
        monthly,
        yearly,
        years,
    }
}

// ── Analysis engine ───────────────────────────────────────────────────────────

/// Per-chat metadata + collector state held while streaming messages.
struct ChatSlot {
    name: String,
    is_group: bool,
    is_channel: bool,
    is_deleted: bool,
    state: EngineState,
}

/// Drives all ten collectors in a single sequential message pass.
///
/// Feed events in timestamp order via [`AnalysisEngine::feed`]; call
/// [`AnalysisEngine::finish`] once to consume the engine and produce
/// [`WrapAnalytics`].
pub struct AnalysisEngine {
    account: EngineState,
    chats: HashMap<i64, ChatSlot>,
    display_name: String,
    username: Option<String>,
    about_preview: String,
    file_size_bytes: u64,
    sample_messages: Vec<String>,
}

impl AnalysisEngine {
    pub fn new(
        display_name: String,
        username: Option<String>,
        about_preview: String,
        file_size_bytes: u64,
    ) -> Self {
        Self {
            account: EngineState::new(),
            chats: HashMap::new(),
            display_name,
            username,
            about_preview,
            file_size_bytes,
            sample_messages: Vec::with_capacity(5),
        }
    }

    /// Feed one normalised message event.
    pub fn feed(&mut self, ev: &MessageEvent) {
        // Account-level (no keyword index — that would dominate memory).
        self.account.feed(ev);

        // Per-chat
        let slot = self.chats.entry(ev.chat_id).or_insert_with(|| ChatSlot {
            name: ev.chat_name.clone(),
            is_group: ev.is_group,
            is_channel: ev.is_channel,
            is_deleted: ev.is_deleted,
            state: EngineState::new(),
        });
        slot.state.feed(ev);
        slot.state.feed_keywords(ev);

        // Sample messages (first 5 non-empty text snippets)
        if self.sample_messages.len() < 5 && ev.kind.is_text() && ev.char_count > 0 {
            // We don't have the raw text here; callers should push samples themselves
            // via add_sample — this branch is kept for future use.
        }
    }

    /// Push a sample message snippet (called by parser, not from MessageEvent).
    pub fn add_sample(&mut self, snippet: String) {
        if self.sample_messages.len() < 5 {
            self.sample_messages.push(snippet);
        }
    }

    /// Consume the engine and return the complete analytics result.
    pub fn finish(self) -> WrapAnalytics {
        let chat_count = self.chats.len();
        let account = self.account.build();

        struct Ranked {
            result: ChatResult,
            is_channel: bool,
            recent90: u64,
            /// All messages before the recent 90-day window (not only the prior 90 days).
            before_recent: u64,
        }

        let mut ranked: Vec<Ranked> = self
            .chats
            .into_iter()
            .map(|(chat_id, slot)| {
                let is_channel = slot.is_channel;
                let analytics = slot.state.build();
                Ranked {
                    result: ChatResult {
                        chat_id,
                        chat_name: slot.name,
                        analytics,
                        is_group: slot.is_group,
                        is_deleted: slot.is_deleted,
                    },
                    is_channel,
                    recent90: 0,
                    before_recent: 0,
                }
            })
            .collect();

        // Anchor "today" to the newest activity day across the export.
        let anchor = ranked
            .iter()
            .flat_map(|r| r.result.analytics.activity_over_time.daily.iter())
            .map(|p| p.period.as_str())
            .filter(|d| d.len() >= 10)
            .max()
            .map(str::to_string);

        if let Some(anchor) = anchor.as_deref() {
            if let Some(recent_start) = date_minus_days(anchor, 89) {
                // recent: [recent_start, anchor] (90 days inclusive)
                // before: everything earlier (so faded chats from years ago still qualify)
                for r in &mut ranked {
                    let (recent, before) = sum_recent_and_before(
                        &r.result.analytics.activity_over_time.daily,
                        &recent_start,
                        anchor,
                    );
                    r.recent90 = recent;
                    r.before_recent = before;
                }
            }
        }

        let mut personal: Vec<&Ranked> = ranked
            .iter()
            .filter(|r| !r.result.is_group && !r.is_channel)
            .collect();

        personal.sort_by(|a, b| {
            b.result
                .analytics
                .total_messages
                .cmp(&a.result.analytics.total_messages)
        });
        let top_contacts: Vec<ChatResult> = personal
            .iter()
            .take(20)
            .map(|r| r.result.clone())
            .collect();

        personal.sort_by(|a, b| b.recent90.cmp(&a.recent90));
        let recent_contacts: Vec<ChatResult> = personal
            .iter()
            .filter(|r| r.recent90 > 0)
            .take(5)
            .map(|r| r.result.clone())
            .collect();

        let mut faded_pool: Vec<&Ranked> = personal
            .iter()
            .copied()
            .filter(|r| {
                if r.result.is_deleted {
                    return false;
                }
                // Meaningful history before the last 90 days.
                if r.before_recent < 50 {
                    return false;
                }
                // "Very little" recently: under 5% of earlier volume, floor 10.
                let threshold = (r.before_recent / 20).max(10);
                r.recent90 < threshold
            })
            .collect();
        faded_pool.sort_by(|a, b| b.before_recent.cmp(&a.before_recent));
        let faded_contacts: Vec<ChatResult> = faded_pool
            .iter()
            .take(5)
            .map(|r| r.result.clone())
            .collect();

        // Prefer faded over recent when both match — drop faded ids from recent.
        let faded_ids: std::collections::HashSet<i64> =
            faded_contacts.iter().map(|c| c.chat_id).collect();
        let recent_contacts: Vec<ChatResult> = recent_contacts
            .into_iter()
            .filter(|c| !faded_ids.contains(&c.chat_id))
            .collect();

        let mut groups: Vec<&Ranked> = ranked
            .iter()
            .filter(|r| r.result.is_group && !r.is_channel)
            .collect();
        groups.sort_by(|a, b| {
            b.result
                .analytics
                .total_messages
                .cmp(&a.result.analytics.total_messages)
        });
        let top_groups: Vec<ChatResult> = groups
            .iter()
            .take(5)
            .map(|r| r.result.clone())
            .collect();

        let self_name = self.display_name.as_str();
        let mut ghost_pool: Vec<&Ranked> = personal
            .iter()
            .copied()
            .filter(|r| contact_ghost_score(&r.result, self_name) > 0)
            .collect();
        ghost_pool.sort_by(|a, b| {
            contact_ghost_score(&b.result, self_name)
                .cmp(&contact_ghost_score(&a.result, self_name))
                .then_with(|| {
                    b.result
                        .analytics
                        .total_messages
                        .cmp(&a.result.analytics.total_messages)
                })
        });
        let top_ghosters: Vec<ChatResult> = ghost_pool
            .iter()
            .take(5)
            .map(|r| r.result.clone())
            .collect();

        let chats = merge_unique_chats(&[
            top_contacts.as_slice(),
            recent_contacts.as_slice(),
            faded_contacts.as_slice(),
            top_groups.as_slice(),
            top_ghosters.as_slice(),
        ]);

        WrapAnalytics {
            display_name: self.display_name,
            username: self.username,
            about_preview: self.about_preview,
            file_size_bytes: self.file_size_bytes,
            chat_count,
            sample_messages: self.sample_messages,
            account,
            chats,
            top_contacts,
            recent_contacts,
            faded_contacts,
            top_groups,
            top_ghosters,
        }
    }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/// How often non-self participants in this chat left someone hanging ≥ 24h.
fn contact_ghost_score(chat: &ChatResult, self_name: &str) -> u64 {
    chat.analytics
        .ghosting
        .participants
        .iter()
        .filter(|p| !sender_names_match(&p.name, self_name))
        .map(|p| p.count)
        .sum()
}

fn sender_names_match(a: &str, b: &str) -> bool {
    let x = a.trim().to_lowercase();
    let y = b.trim().to_lowercase();
    if x.is_empty() || y.is_empty() {
        return false;
    }
    x == y || x.contains(&y) || y.contains(&x)
}

fn merge_unique_chats(lists: &[&[ChatResult]]) -> Vec<ChatResult> {
    let mut seen = std::collections::HashSet::new();
    let mut out = Vec::new();
    for list in lists {
        for chat in *list {
            if seen.insert(chat.chat_id) {
                out.push(chat.clone());
            }
        }
    }
    out
}

/// Sum messages in the recent 90-day window and everything before it.
fn sum_recent_and_before(
    daily: &[ActivityPoint],
    recent_start: &str,
    anchor: &str,
) -> (u64, u64) {
    let mut recent = 0u64;
    let mut before = 0u64;
    for p in daily {
        let d = p.period.as_str();
        if d.len() < 10 {
            continue;
        }
        let n = p.sent + p.received;
        if d >= recent_start && d <= anchor {
            recent += n;
        } else if d < recent_start {
            before += n;
        }
    }
    (recent, before)
}

/// Subtract `days` from a `YYYY-MM-DD` date (proleptic Gregorian).
fn date_minus_days(date: &str, days: i64) -> Option<String> {
    if date.len() < 10 {
        return None;
    }
    let y: i32 = date[0..4].parse().ok()?;
    let m: u32 = date[5..7].parse().ok()?;
    let d: u32 = date[8..10].parse().ok()?;
    let ordinal = days_from_civil(y, m, d)? - days;
    let (yy, mm, dd) = civil_from_days(ordinal)?;
    Some(format!("{yy:04}-{mm:02}-{dd:02}"))
}

/// Howard Hinnant's civil_from_days / days_from_civil (UTC date arithmetic).
fn days_from_civil(y: i32, m: u32, d: u32) -> Option<i64> {
    if !(1..=12).contains(&m) || !(1..=31).contains(&d) {
        return None;
    }
    let y = y as i64;
    let m = m as i64;
    let d = d as i64;
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let m_adj = if m > 2 { m - 3 } else { m + 9 };
    let doy = (153 * m_adj + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    Some(era * 146_097 + doe - 719_468)
}

fn civil_from_days(z: i64) -> Option<(i32, u32, u32)> {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    Some((y as i32, m as u32, d as u32))
}

/// Estimates sleep window as the longest consecutive ≤30%-of-avg quiet stretch.
fn estimate_sleep_window(hourly: &[u64; 24]) -> (u8, u8) {
    let total: u64 = hourly.iter().sum();
    if total == 0 {
        return (0, 7);
    }
    let avg = total as f64 / 24.0;
    let threshold = (avg * 0.3).max(0.5);

    // Scan a doubled 48-hour window to handle wrap-around (e.g. sleep 23–07).
    let mut best_start = 0u8;
    let mut best_len = 0u8;
    let mut cur_start = 0u8;
    let mut cur_len = 0u8;

    for i in 0u8..48 {
        let h = (i % 24) as usize;
        if (hourly[h] as f64) <= threshold {
            if cur_len == 0 {
                cur_start = i % 24;
            }
            cur_len += 1;
            if cur_len > best_len {
                best_len = cur_len;
                best_start = cur_start;
            }
        } else {
            cur_len = 0;
        }
    }

    let sleep_end = (best_start as u16 + best_len as u16) as u8 % 24;
    (best_start, sleep_end)
}

/// Parses a Telegram local-time date string `"YYYY-MM-DDTHH:MM:SS"` into
/// `(unix_epoch_secs, hour, "YYYY-MM-DD")`.
///
/// Telegram exports local timestamps without a timezone offset, so this is
/// intentionally *not* UTC-corrected — all collectors treat timestamps
/// consistently as local time.
pub fn parse_telegram_date(s: &str) -> Option<(i64, u8, String)> {
    if s.len() < 10 {
        return None;
    }
    let year: i64 = s[0..4].parse().ok()?;
    let month: i64 = s[5..7].parse().ok()?;
    let day: i64 = s[8..10].parse().ok()?;
    let hour: u8 = if s.len() >= 13 {
        s[11..13].parse().ok()?
    } else {
        0
    };
    let minute: u8 = if s.len() >= 16 {
        s[14..16].parse().unwrap_or(0)
    } else {
        0
    };
    let second: u8 = if s.len() >= 19 {
        s[17..19].parse().unwrap_or(0)
    } else {
        0
    };

    let days = civil_to_epoch_days(year, month, day);
    let ts = days * 86_400 + hour as i64 * 3_600 + minute as i64 * 60 + second as i64;
    let date_str = s[..10].to_string();
    Some((ts, hour, date_str))
}

/// Howard Hinnant's algorithm: civil date → days since 1970-01-01.
fn civil_to_epoch_days(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let doy = (153 * (if m > 2 { m - 3 } else { m + 9 }) + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

/// Extracts complete emoji grapheme clusters from a string.
///
/// ZWJ sequences stay intact (`🤦‍♀️` is one emoji, not `🤦` + `♀️`).
/// Skin-tone modifiers and variation selectors are stripped so `👍🏻` / `❤️`
/// collapse with their base forms for counting.
pub fn extract_emojis(text: &str) -> Vec<String> {
    use unicode_segmentation::UnicodeSegmentation;

    text.graphemes(true)
        .filter(|g| is_emoji_grapheme(g))
        .map(|g| normalize_emoji_key(g))
        .filter(|g| !g.is_empty() && is_emoji_grapheme(g))
        .collect()
}

/// True when this grapheme is a real emoji (not plain text / lone modifiers).
fn is_emoji_grapheme(g: &str) -> bool {
    let chars: Vec<char> = g.chars().collect();
    if chars.is_empty() {
        return false;
    }

    // Flags: paired regional indicators.
    let regional = chars
        .iter()
        .copied()
        .filter(|&c| is_regional_indicator(c))
        .count();
    if regional > 0 {
        return regional >= 2;
    }

    // Keycaps: base + U+20E3 (e.g. 1️⃣).
    if chars.iter().any(|&c| (c as u32) == 0x20E3) {
        return true;
    }

    // Must include a pictographic / symbol base — not only ZWJ / VS / skin tone.
    chars.iter().any(|&c| is_significant_emoji(c))
}

fn is_regional_indicator(c: char) -> bool {
    (0x1F1E6..=0x1F1FF).contains(&(c as u32))
}

/// Strip skin tones + variation selectors for stable counting keys.
fn normalize_emoji_key(g: &str) -> String {
    g.chars()
        .filter(|&c| {
            let cp = c as u32;
            !matches!(
                cp,
                0x1F3FB..=0x1F3FF // skin tone
                    | 0xFE0E
                    | 0xFE0F // text/emoji variation selectors
            )
        })
        .collect()
}

fn is_significant_emoji(c: char) -> bool {
    let cp = c as u32;
    match cp {
        // Skip modifiers and joiners (they ride along inside graphemes)
        0x1F3FB..=0x1F3FF => false, // skin tone modifiers
        0xFE00..=0xFE0F => false,   // variation selectors
        0x200D => false,            // ZWJ
        0x20E3 => false,            // combining enclosing keycap
        // Emoji ranges
        0x1F600..=0x1F64F => true, // emoticons
        0x1F300..=0x1F5FF => true, // misc symbols and pictographs
        0x1F680..=0x1F6FF => true, // transport and map
        0x1F700..=0x1F77F => true, // alchemical symbols
        0x1F780..=0x1F7FF => true, // geometric shapes extended
        0x1F800..=0x1F8FF => true, // supplemental arrows C
        0x1F900..=0x1F9FF => true, // supplemental symbols and pictographs
        0x1FA00..=0x1FA6F => true, // chess symbols
        0x1FA70..=0x1FAFF => true, // symbols and pictographs extended-A
        0x2600..=0x26FF => true,   // misc symbols (includes ♀/♂ used in ZWJ seqs)
        0x2700..=0x27BF => true,   // dingbats
        0x2B50 => true,            // ⭐
        0x2B55 => true,            // ⭕
        0x25AA..=0x25FE => true,   // geometric shapes
        _ => false,
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_ev(sender: &str, is_mine: bool, ts: i64, hour: u8, date: &str, kind: MessageKind, chars: usize) -> MessageEvent {
        MessageEvent {
            chat_id: 1,
            chat_name: "Test Chat".into(),
            is_group: false,
            is_channel: false,
            is_deleted: false,
            is_mine,
            sender_name: sender.into(),
            timestamp_secs: ts,
            hour,
            date_str: date.into(),
            kind: kind.clone(),
            content_kind: ContentKind::classify(&kind, false, false),
            char_count: chars,
            words: vec![],
            voice_duration_secs: 0,
            emojis: vec![],
            reactions: vec![],
            is_edited: false,
        }
    }

    #[test]
    fn test_edit_counts() {
        let mut engine = AnalysisEngine::new("Me".into(), None, "".into(), 0);
        let mut edited = make_ev("Me", true, 1000, 10, "2024-01-01", MessageKind::Text, 5);
        edited.is_edited = true;
        let mut also = make_ev("Bob", false, 2000, 11, "2024-01-01", MessageKind::Text, 4);
        also.is_edited = true;
        let plain = make_ev("Bob", false, 3000, 11, "2024-01-01", MessageKind::Text, 3);
        engine.feed(&edited);
        engine.feed(&also);
        engine.feed(&plain);
        let wrap = engine.finish();
        let chat = wrap.chats.first().expect("chat");
        let stats = &chat.analytics.edit_typo;
        assert_eq!(stats.total_edits, 2);
        assert_eq!(stats.total_typos, 0);
        let bob = stats.participants.iter().find(|p| p.name == "Bob").unwrap();
        assert_eq!(bob.edits, 1);
        assert_eq!(bob.typos, 0);
    }

    #[test]
    fn test_ghosting_index() {
        let mut engine = AnalysisEngine::new("Me".into(), None, "".into(), 0);
        // Me messages, Bob replies after 25h → Bob ghosted Me.
        let a = make_ev("Me", true, 1_000, 10, "2024-01-01", MessageKind::Text, 5);
        let b = make_ev(
            "Bob",
            false,
            1_000 + 25 * 3_600,
            11,
            "2024-01-02",
            MessageKind::Text,
            5,
        );
        // Me replies after another 25h → Me ghosted Bob.
        let c = make_ev(
            "Me",
            true,
            1_000 + 50 * 3_600,
            12,
            "2024-01-03",
            MessageKind::Text,
            5,
        );
        // Quick Me→Bob, then Bob double-texts after 25h → Me ghosted (didn't reply).
        let d = make_ev(
            "Bob",
            false,
            1_000 + 51 * 3_600,
            13,
            "2024-01-03",
            MessageKind::Text,
            5,
        );
        let e = make_ev(
            "Bob",
            false,
            1_000 + 76 * 3_600,
            14,
            "2024-01-04",
            MessageKind::Text,
            5,
        );
        engine.feed(&a);
        engine.feed(&b);
        engine.feed(&c);
        engine.feed(&d);
        engine.feed(&e);
        let wrap = engine.finish();
        let chat = wrap.chats.first().expect("chat");
        let g = &chat.analytics.ghosting;
        // Bob slow-reply + Me slow-reply + Me via Bob double-text
        assert_eq!(g.total, 3);
        let bob = g.participants.iter().find(|p| p.name == "Bob").unwrap();
        let me = g.participants.iter().find(|p| p.name == "Me").unwrap();
        assert_eq!(bob.count, 1);
        assert_eq!(me.count, 2);
        // Top ghosters rank contacts by non-self score → Bob.
        assert_eq!(wrap.top_ghosters.len(), 1);
        assert_eq!(wrap.top_ghosters[0].chat_name, "Test Chat");
    }

    #[test]
    fn test_tokenize_words() {
        let words = tokenize_words("Hello, sorry! Money? it's fine 😀");
        assert!(words.contains(&"hello".into()));
        assert!(words.contains(&"sorry".into()));
        assert!(words.contains(&"money".into()));
        assert!(words.contains(&"it's".into()) || words.contains(&"its".into()));
        assert!(words.contains(&"fine".into()));
    }

    #[test]
    fn test_keyword_battle_you_vs_them() {
        let mut engine = AnalysisEngine::new("Me".into(), None, "".into(), 0);
        let mut a = make_ev("Me", true, 1000, 10, "2024-01-01", MessageKind::Text, 5);
        a.words = vec!["sorry".into(), "sorry".into()];
        let mut b = make_ev("Bob", false, 2000, 11, "2024-01-01", MessageKind::Text, 5);
        b.words = vec!["sorry".into()];
        let mut c = make_ev("Bob", false, 3000, 11, "2024-01-01", MessageKind::Text, 5);
        c.words = vec!["money".into()];
        engine.feed(&a);
        engine.feed(&b);
        engine.feed(&c);
        let wrap = engine.finish();
        // Account-level has no keyword index.
        assert!(wrap.account.keywords.counts.is_empty());
        let chat = wrap.chats.first().expect("chat");
        let sorry = chat.analytics.keywords.counts.get("sorry").copied();
        assert_eq!(sorry, Some([2, 1]));
        let money = chat.analytics.keywords.counts.get("money").copied();
        assert_eq!(money, Some([0, 1]));
    }

    #[test]
    fn test_parse_telegram_date() {
        let (ts, hour, date) = parse_telegram_date("2024-03-15T14:30:00").unwrap();
        assert_eq!(hour, 14);
        assert_eq!(date, "2024-03-15");
        // 2024-03-15 14:30:00 UTC-equivalent
        assert!(ts > 0);
    }

    #[test]
    fn test_extract_emojis() {
        let emojis = extract_emojis("Hello 😀 world 🎉!");
        assert_eq!(emojis, vec!["😀", "🎉"]);
    }

    #[test]
    fn test_extract_emojis_keeps_zwj_sequences() {
        // Woman facepalming — must stay one emoji, not leak ♀️.
        let facepalm = "🤦\u{200D}♀\u{FE0F}";
        let emojis = extract_emojis(&format!("oops {facepalm}"));
        assert_eq!(emojis.len(), 1);
        assert!(emojis[0].contains('\u{200D}'));
        assert!(emojis[0].contains('♀') || emojis[0].contains('🤦'));
        assert!(!emojis.iter().any(|e| e == "♀" || e == "♀️" || e == "♀\u{FE0F}"));
    }

    #[test]
    fn test_extract_emojis_strips_skin_tone() {
        let emojis = extract_emojis("👍\u{1F3FB} hi 👍");
        assert_eq!(emojis, vec!["👍", "👍"]);
    }

    #[test]
    fn test_pure_emoji_and_content_mix() {
        assert!(is_pure_emoji_text("😀🎉"));
        assert!(is_pure_emoji_text(" 👍 "));
        assert!(!is_pure_emoji_text("hi 😀"));
        assert!(!is_pure_emoji_text(""));

        let mut engine = AnalysisEngine::new("Me".into(), None, "".into(), 0);
        let mut normal = make_ev("Me", true, 1000, 10, "2024-01-01", MessageKind::Text, 5);
        normal.content_kind = ContentKind::Normal;
        let mut link = make_ev("Me", true, 2000, 10, "2024-01-01", MessageKind::Text, 20);
        link.content_kind = ContentKind::Link;
        let mut emoji = make_ev("Bob", false, 3000, 11, "2024-01-01", MessageKind::Text, 2);
        emoji.content_kind = ContentKind::Emoji;
        let mut photo = make_ev("Bob", false, 4000, 11, "2024-01-01", MessageKind::Photo, 0);
        photo.content_kind = ContentKind::Image;
        engine.feed(&normal);
        engine.feed(&link);
        engine.feed(&emoji);
        engine.feed(&photo);
        let mix = engine.finish().account.content_mix;
        assert_eq!(mix.total, 4);
        assert_eq!(mix.types.len(), 4);
        let pct_sum: f64 = mix.types.iter().map(|t| t.pct).sum();
        assert!((pct_sum - 100.0).abs() < 0.01);
    }

    #[test]
    fn test_sent_received_counts() {
        let mut engine = AnalysisEngine::new(
            "Alice".into(), None, "".into(), 0,
        );
        engine.feed(&make_ev("Alice", true, 1000, 10, "2024-01-01", MessageKind::Text, 5));
        engine.feed(&make_ev("Bob", false, 2000, 11, "2024-01-01", MessageKind::Text, 8));
        engine.feed(&make_ev("Alice", true, 3000, 12, "2024-01-01", MessageKind::Text, 3));
        let result = engine.finish();
        assert_eq!(result.account.sent_messages, 2);
        assert_eq!(result.account.received_messages, 1);
        assert_eq!(result.account.total_messages, 3);
    }

    #[test]
    fn test_late_night_detection() {
        let mut engine = AnalysisEngine::new("Me".into(), None, "".into(), 0);
        engine.feed(&make_ev("Me", true, 1000, 2, "2024-01-01", MessageKind::Text, 5));
        engine.feed(&make_ev("Me", true, 2000, 10, "2024-01-01", MessageKind::Text, 5));
        let result = engine.finish();
        assert_eq!(result.account.late_night.total_late_night, 1);
    }

    #[test]
    fn test_sleep_window() {
        let mut hourly = [10u64; 24];
        // Simulate silence from 23–06
        hourly[23] = 0;
        hourly[0] = 0;
        hourly[1] = 0;
        hourly[2] = 0;
        hourly[3] = 0;
        hourly[4] = 0;
        hourly[5] = 0;
        hourly[6] = 0;
        let (start, end) = estimate_sleep_window(&hourly);
        // Should detect the 8-hour quiet window around midnight
        assert!(start >= 22 || start <= 1, "start={start}");
        assert!(end >= 4 && end <= 8, "end={end}");
    }

    #[test]
    fn test_heatmap_accumulates() {
        let mut engine = AnalysisEngine::new("Me".into(), None, "".into(), 0);
        for _ in 0..5 {
            engine.feed(&make_ev("Me", true, 1000, 10, "2024-01-01", MessageKind::Text, 3));
        }
        engine.feed(&make_ev("Me", true, 2000, 11, "2024-01-02", MessageKind::Text, 3));
        let result = engine.finish();
        let day1 = result.account.heatmap.days.iter().find(|d| d.date == "2024-01-01").unwrap();
        assert_eq!(day1.count, 5);
    }

    #[test]
    fn test_activity_over_time_sent_received() {
        let mut engine = AnalysisEngine::new("Me".into(), None, "".into(), 0);
        engine.feed(&make_ev("Me", true, 1000, 10, "2023-06-01", MessageKind::Text, 3));
        engine.feed(&make_ev("Bob", false, 2000, 11, "2023-06-01", MessageKind::Text, 3));
        engine.feed(&make_ev("Me", true, 3000, 10, "2023-07-15", MessageKind::Text, 3));
        engine.feed(&make_ev("Me", true, 4000, 10, "2024-01-01", MessageKind::Text, 3));
        engine.feed(&make_ev("Bob", false, 5000, 11, "2024-01-02", MessageKind::Text, 3));
        let result = engine.finish();
        let ts = &result.account.activity_over_time;

        assert_eq!(ts.daily.len(), 4);
        let june1 = ts.daily.iter().find(|p| p.period == "2023-06-01").unwrap();
        assert_eq!(june1.sent, 1);
        assert_eq!(june1.received, 1);

        let jun = ts.monthly.iter().find(|p| p.period == "2023-06").unwrap();
        assert_eq!(jun.sent, 1);
        assert_eq!(jun.received, 1);

        let y2023 = ts.yearly.iter().find(|p| p.period == "2023").unwrap();
        assert_eq!(y2023.sent, 2);
        assert_eq!(y2023.received, 1);

        assert_eq!(ts.years, vec![2024, 2023]);
    }

    #[test]
    fn test_faded_contacts_use_history_before_recent_window() {
        // Anchor will be 2024-06-01. Recent window ≈ 2024-03-04..=2024-06-01.
        // Alice: busy in 2023, quiet recently → faded.
        // Bob: busy recently → recent, not faded.
        let mut engine = AnalysisEngine::new("Me".into(), None, "".into(), 0);
        for i in 0..60 {
            let mut ev = make_ev("Me", true, 1000 + i, 10, "2023-05-01", MessageKind::Text, 3);
            ev.chat_id = 10;
            ev.chat_name = "Alice".into();
            engine.feed(&ev);
        }
        for i in 0..5 {
            let mut ev = make_ev("Me", true, 5000 + i, 10, "2024-05-15", MessageKind::Text, 3);
            ev.chat_id = 10;
            ev.chat_name = "Alice".into();
            engine.feed(&ev);
        }
        for i in 0..40 {
            let mut ev = make_ev("Me", true, 8000 + i, 10, "2024-05-20", MessageKind::Text, 3);
            ev.chat_id = 20;
            ev.chat_name = "Bob".into();
            engine.feed(&ev);
        }
        // Keep the export anchor recent.
        let mut anchor = make_ev("Me", true, 9000, 10, "2024-06-01", MessageKind::Text, 3);
        anchor.chat_id = 20;
        anchor.chat_name = "Bob".into();
        engine.feed(&anchor);

        let result = engine.finish();
        assert!(
            result
                .faded_contacts
                .iter()
                .any(|c| c.chat_id == 10 && c.chat_name == "Alice"),
            "Alice should be faded; got {:?}",
            result
                .faded_contacts
                .iter()
                .map(|c| (&c.chat_name, c.chat_id))
                .collect::<Vec<_>>()
        );
        assert!(
            !result.faded_contacts.iter().any(|c| c.chat_id == 20),
            "Bob should not be faded"
        );
    }

    #[test]
    fn test_initiator_finisher() {
        let mut engine = AnalysisEngine::new("Me".into(), None, "".into(), 0);
        // First message: Alice initiates
        engine.feed(&make_ev("Alice", false, 0, 10, "2024-01-01", MessageKind::Text, 5));
        // Then Bob responds quickly (no gap)
        engine.feed(&make_ev("Bob", true, 60, 10, "2024-01-01", MessageKind::Text, 5));
        // 8h gap, then Alice initiates again
        engine.feed(&make_ev("Alice", false, 60 + 8 * 3600, 18, "2024-01-01", MessageKind::Text, 5));
        let result = engine.finish();
        let alice_init = result.account.initiator_finisher.initiators
            .iter().find(|p| p.name == "Alice");
        assert!(alice_init.is_some());
        assert_eq!(alice_init.unwrap().count, 2);
    }
}
