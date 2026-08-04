//! X (Twitter) official data-archive ZIP parser.
//!
//! Fingerprints: `data/account.js`, `data/tweets.js`, `Your archive.html`.
//! Data files are `window.YTD.<name>.partN = [ ... ]` JS wrappers around JSON.

use std::collections::{BTreeMap, HashMap};
use std::hash::{Hash, Hasher};
use std::io::{Cursor, Read};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use zip::ZipArchive;

use crate::analytics::collectors::{
    extract_emojis, is_pure_emoji_text, text_has_url, tokenize_words, AnalysisEngine,
    ContentKind, HeatmapDay, MessageEvent, MessageKind, WrapAnalytics,
};
use crate::error::CoreError;
use crate::parsers::telegram::AnalyzeProgressPhase;

const TOP_MENTIONS: usize = 40;

// ── Public types ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XPreview {
    pub display_name: String,
    pub username: Option<String>,
    pub account_id: Option<String>,
    pub tweet_count: u64,
    pub like_count: u64,
    pub dm_thread_count: usize,
    pub dm_message_count: u64,
    pub file_size_bytes: u64,
    pub has_official_html: bool,
}

impl XPreview {
    pub fn to_json(&self) -> Result<String, CoreError> {
        serde_json::to_string(self).map_err(CoreError::from)
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XInsights {
    pub profile: XProfile,
    pub follower_count: u64,
    pub following_count: u64,
    pub block_count: u64,
    pub mute_count: u64,
    pub tweet_count: u64,
    pub original_count: u64,
    pub reply_count: u64,
    pub retweet_count: u64,
    pub tweet_heatmap: Vec<HeatmapDay>,
    pub tweet_hourly: Vec<u64>,
    pub tweets_by_year: Vec<XYearCount>,
    pub top_mentions: Vec<XCounted>,
    pub like_count: u64,
    pub dm_thread_count: u64,
    pub dm_message_count: u64,
    pub group_dm_thread_count: u64,
    pub community_tweet_count: u64,
    pub has_official_html: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XProfile {
    pub display_name: String,
    pub username: String,
    pub account_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bio: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XCounted {
    pub name: String,
    pub count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XYearCount {
    pub year: i32,
    pub count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XAnalyzeResult {
    pub analytics: WrapAnalytics,
    pub x_insights: XInsights,
}

impl XAnalyzeResult {
    pub fn to_json(&self) -> Result<String, CoreError> {
        serde_json::to_string(self).map_err(CoreError::from)
    }
}

// ── Internal ──────────────────────────────────────────────────────────────────

#[derive(Default)]
struct AccountInfo {
    display_name: String,
    username: String,
    account_id: String,
    created_at: Option<String>,
}

#[derive(Clone)]
struct ParsedDmMessage {
    sender_id: String,
    timestamp_secs: i64,
    hour: u8,
    date_str: String,
    body: String,
}

struct ParsedDmThread {
    conversation_id: String,
    is_group: bool,
    peer_label: String,
    messages: Vec<ParsedDmMessage>,
}

#[derive(Default)]
struct InsightsAcc {
    account: AccountInfo,
    bio: Option<String>,
    follower_count: u64,
    following_count: u64,
    block_count: u64,
    mute_count: u64,
    tweet_count: u64,
    original_count: u64,
    reply_count: u64,
    retweet_count: u64,
    tweet_day: HashMap<String, u64>,
    tweet_hourly: [u64; 24],
    tweets_by_year: HashMap<i32, u64>,
    mentions: HashMap<String, u64>,
    like_count: u64,
    dm_thread_count: u64,
    dm_message_count: u64,
    group_dm_thread_count: u64,
    community_tweet_count: u64,
    has_official_html: bool,
}

impl InsightsAcc {
    fn finish(self) -> XInsights {
        let mut tweet_heatmap: Vec<HeatmapDay> = self
            .tweet_day
            .into_iter()
            .map(|(date, count)| HeatmapDay { date, count })
            .collect();
        tweet_heatmap.sort_by(|a, b| a.date.cmp(&b.date));

        let mut tweets_by_year: Vec<XYearCount> = self
            .tweets_by_year
            .into_iter()
            .map(|(year, count)| XYearCount { year, count })
            .collect();
        tweets_by_year.sort_by_key(|y| y.year);

        let mut top_mentions: Vec<XCounted> = self
            .mentions
            .into_iter()
            .map(|(name, count)| XCounted { name, count })
            .collect();
        top_mentions.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.name.cmp(&b.name)));
        top_mentions.truncate(TOP_MENTIONS);

        XInsights {
            profile: XProfile {
                display_name: self.account.display_name,
                username: self.account.username,
                account_id: self.account.account_id,
                bio: self.bio,
                created_at: self.account.created_at,
            },
            follower_count: self.follower_count,
            following_count: self.following_count,
            block_count: self.block_count,
            mute_count: self.mute_count,
            tweet_count: self.tweet_count,
            original_count: self.original_count,
            reply_count: self.reply_count,
            retweet_count: self.retweet_count,
            tweet_heatmap,
            tweet_hourly: self.tweet_hourly.to_vec(),
            tweets_by_year,
            top_mentions,
            like_count: self.like_count,
            dm_thread_count: self.dm_thread_count,
            dm_message_count: self.dm_message_count,
            group_dm_thread_count: self.group_dm_thread_count,
            community_tweet_count: self.community_tweet_count,
            has_official_html: self.has_official_html,
        }
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

pub fn preview_export_bytes(bytes: &[u8]) -> Result<XPreview, CoreError> {
    let file_size_bytes = bytes.len() as u64;
    let (account, insights, threads) = load_export(bytes, |_, _| {})?;
    let dm_message_count: u64 = threads.iter().map(|t| t.messages.len() as u64).sum();

    Ok(XPreview {
        display_name: if account.display_name.is_empty() {
            account
                .username
                .clone()
                .if_empty("X".into())
        } else {
            account.display_name
        },
        username: nonempty_owned(account.username),
        account_id: nonempty_owned(account.account_id),
        tweet_count: insights.tweet_count,
        like_count: insights.like_count,
        dm_thread_count: threads.len(),
        dm_message_count,
        file_size_bytes,
        has_official_html: insights.has_official_html,
    })
}

trait IfEmpty {
    fn if_empty(self, fallback: String) -> String;
}

impl IfEmpty for String {
    fn if_empty(self, fallback: String) -> String {
        if self.is_empty() { fallback } else { self }
    }
}

fn nonempty_owned(s: String) -> Option<String> {
    if s.is_empty() { None } else { Some(s) }
}

pub fn analyze_export_bytes(bytes: &[u8]) -> Result<XAnalyzeResult, CoreError> {
    analyze_export_bytes_with_progress(bytes, |_, _, _| {})
}

pub fn analyze_export_bytes_with_progress<F>(
    bytes: &[u8],
    mut on_progress: F,
) -> Result<XAnalyzeResult, CoreError>
where
    F: FnMut(AnalyzeProgressPhase, u64, u64),
{
    let total_bytes = bytes.len() as u64;
    on_progress(AnalyzeProgressPhase::Reading, 0, total_bytes.max(1));

    let (account, mut insights_acc, mut threads) = load_export(bytes, |read, total| {
        on_progress(AnalyzeProgressPhase::Reading, read, total.max(1));
    })?;
    on_progress(
        AnalyzeProgressPhase::Reading,
        total_bytes.max(1),
        total_bytes.max(1),
    );

    let me_id = account.account_id.clone();
    let display_name = if !account.display_name.is_empty() {
        account.display_name.clone()
    } else if !account.username.is_empty() {
        account.username.clone()
    } else {
        "X".into()
    };
    let username = nonempty_owned(account.username.clone());
    let about = if !account.username.is_empty() {
        format!("@{}", account.username)
    } else {
        format!("{} DM threads", threads.len())
    };

    let mut engine = AnalysisEngine::new(display_name, username, about, total_bytes);

    let compute_total: u64 = threads
        .iter()
        .map(|t| t.messages.len() as u64)
        .sum::<u64>()
        .max(1);
    let report_step = (compute_total / 200).max(1);
    let mut processed: u64 = 0;
    on_progress(AnalyzeProgressPhase::Computing, 0, compute_total);

    for thread in &mut threads {
        thread.messages.sort_by_key(|m| m.timestamp_secs);
        let chat_id = stable_chat_id(&thread.conversation_id);
        let chat_name = thread.peer_label.clone();

        for msg in &thread.messages {
            processed += 1;
            if processed == compute_total || processed % report_step == 0 {
                on_progress(
                    AnalyzeProgressPhase::Computing,
                    processed.min(compute_total),
                    compute_total,
                );
            }

            let is_mine = !me_id.is_empty() && msg.sender_id == me_id;
            let char_count = msg.body.chars().count();
            let words = if char_count > 0 {
                tokenize_words(&msg.body)
            } else {
                vec![]
            };
            let emojis = extract_emojis(&msg.body);
            let has_link = text_has_url(&msg.body);
            let is_pure_emoji = is_pure_emoji_text(&msg.body);
            let kind = if msg.body.trim().is_empty() {
                MessageKind::Other
            } else {
                MessageKind::Text
            };
            let content_kind = ContentKind::classify(&kind, has_link, is_pure_emoji);

            let sender_name = if is_mine {
                account.display_name.clone().if_empty(msg.sender_id.clone())
            } else {
                msg.sender_id.clone()
            };

            let ev = MessageEvent {
                chat_id,
                chat_name: chat_name.clone(),
                is_group: thread.is_group,
                is_channel: false,
                is_deleted: false,
                is_mine,
                sender_name,
                timestamp_secs: msg.timestamp_secs,
                hour: msg.hour,
                date_str: msg.date_str.clone(),
                kind,
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
                engine.add_sample(format!("{}: {snippet}", ev.sender_name));
            }
        }
    }

    on_progress(AnalyzeProgressPhase::Computing, compute_total, compute_total);

    insights_acc.account = account;
    Ok(XAnalyzeResult {
        analytics: engine.finish(),
        x_insights: insights_acc.finish(),
    })
}

// ── ZIP load ──────────────────────────────────────────────────────────────────

fn load_export<F>(
    bytes: &[u8],
    mut on_read: F,
) -> Result<(AccountInfo, InsightsAcc, Vec<ParsedDmThread>), CoreError>
where
    F: FnMut(u64, u64),
{
    if !looks_like_zip(bytes) {
        return Err(CoreError::Parse(
            "X import expects a ZIP of your Twitter/X data archive.".into(),
        ));
    }

    let total = bytes.len() as u64;
    let cursor = Cursor::new(bytes);
    let mut archive = ZipArchive::new(cursor)?;
    let mut acc = InsightsAcc::default();
    let mut threads: Vec<ParsedDmThread> = Vec::new();
    let mut bytes_read: u64 = 0;

    // Collect YTD payloads by logical name (merge multi-part).
    let mut ytd_parts: BTreeMap<String, Vec<Value>> = BTreeMap::new();

    let entry_count = archive.len();
    for index in 0..entry_count {
        let mut file = archive.by_index(index)?;
        let name = file.name().replace('\\', "/");
        if file.is_dir() {
            continue;
        }
        let lower = name.to_ascii_lowercase();

        if lower.ends_with("your archive.html") || lower.ends_with("/your archive.html") {
            acc.has_official_html = true;
            continue;
        }

        // Only parse data/*.js (skip assets and media)
        if !lower.contains("/data/") && !lower.starts_with("data/") {
            continue;
        }
        if !lower.ends_with(".js") {
            continue;
        }
        // Skip huge non-YTD or irrelevant
        let base = lower.rsplit('/').next().unwrap_or(&lower);
        if base == "manifest.js" || base == "app.js" || base.starts_with("readme") {
            continue;
        }

        let mut buf = Vec::new();
        file.read_to_end(&mut buf)?;
        bytes_read = bytes_read.saturating_add(buf.len() as u64);
        on_read(bytes_read.min(total), total.max(1));

        let text = String::from_utf8_lossy(&buf);
        if let Some((logical, arr)) = parse_ytd_assignment(&text) {
            ytd_parts.entry(logical).or_default().extend(arr);
        }
    }

    let _ = entry_count;

    // Account
    if let Some(rows) = ytd_parts.get("account") {
        for row in rows {
            if let Some(a) = row.get("account") {
                acc.account.display_name = a
                    .get("accountDisplayName")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string();
                acc.account.username = a
                    .get("username")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string();
                acc.account.account_id = a
                    .get("accountId")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string();
                acc.account.created_at = a
                    .get("createdAt")
                    .and_then(Value::as_str)
                    .map(str::to_string);
            }
        }
    }

    if let Some(rows) = ytd_parts.get("profile") {
        for row in rows {
            if let Some(bio) = row
                .pointer("/profile/description/bio")
                .and_then(Value::as_str)
            {
                if !bio.is_empty() {
                    acc.bio = Some(bio.to_string());
                }
            }
        }
    }

    acc.follower_count = ytd_parts.get("follower").map(|v| v.len() as u64).unwrap_or(0);
    acc.following_count = ytd_parts.get("following").map(|v| v.len() as u64).unwrap_or(0);
    acc.block_count = ytd_parts.get("block").map(|v| v.len() as u64).unwrap_or(0);
    // mute file uses key "muting"
    acc.mute_count = ytd_parts
        .get("mute")
        .or_else(|| ytd_parts.get("muting"))
        .map(|v| v.len() as u64)
        .unwrap_or(0);
    acc.like_count = ytd_parts.get("like").map(|v| v.len() as u64).unwrap_or(0);
    acc.community_tweet_count = ytd_parts
        .get("community_tweet")
        .or_else(|| ytd_parts.get("community-tweet"))
        .map(|v| v.len() as u64)
        .unwrap_or(0);

    // Tweets
    if let Some(rows) = ytd_parts.get("tweets").or_else(|| ytd_parts.get("tweet")) {
        for row in rows {
            let Some(tw) = row.get("tweet") else { continue };
            acc.tweet_count += 1;
            let full_text = tw.get("full_text").and_then(Value::as_str).unwrap_or("");
            let is_rt = full_text.starts_with("RT @");
            let is_reply = tw.get("in_reply_to_status_id").is_some()
                && !tw.get("in_reply_to_status_id").unwrap().is_null();
            if is_rt {
                acc.retweet_count += 1;
            } else if is_reply {
                acc.reply_count += 1;
            } else {
                acc.original_count += 1;
            }

            if let Some(entities) = tw.get("entities") {
                if let Some(mentions) = entities.get("user_mentions").and_then(Value::as_array) {
                    for m in mentions {
                        if let Some(sn) = m.get("screen_name").and_then(Value::as_str) {
                            let key = sn.trim_start_matches('@').to_ascii_lowercase();
                            if !key.is_empty() {
                                *acc.mentions.entry(key).or_insert(0) += 1;
                            }
                        }
                    }
                }
            }

            if let Some(created) = tw.get("created_at").and_then(Value::as_str) {
                if let Some((secs, hour, date_str)) = parse_twitter_created_at(created) {
                    let _ = secs;
                    if (hour as usize) < 24 {
                        acc.tweet_hourly[hour as usize] =
                            acc.tweet_hourly[hour as usize].saturating_add(1);
                    }
                    *acc.tweet_day.entry(date_str.clone()).or_insert(0) += 1;
                    if let Ok(year) = date_str.get(0..4).unwrap_or("").parse::<i32>() {
                        *acc.tweets_by_year.entry(year).or_insert(0) += 1;
                    }
                }
            }
        }
    }

    let me_id = acc.account.account_id.clone();

    // Direct messages
    if let Some(rows) = ytd_parts
        .get("direct_messages")
        .or_else(|| ytd_parts.get("direct-messages"))
    {
        for row in rows {
            if let Some(thread) = parse_dm_conversation(row, &me_id, false) {
                acc.dm_thread_count += 1;
                acc.dm_message_count += thread.messages.len() as u64;
                threads.push(thread);
            }
        }
    }
    if let Some(rows) = ytd_parts
        .get("direct_messages_group")
        .or_else(|| ytd_parts.get("direct-messages-group"))
    {
        for row in rows {
            if let Some(thread) = parse_dm_conversation(row, &me_id, true) {
                acc.group_dm_thread_count += 1;
                acc.dm_message_count += thread.messages.len() as u64;
                threads.push(thread);
            }
        }
    }

    if acc.account.account_id.is_empty()
        && acc.tweet_count == 0
        && threads.is_empty()
        && acc.like_count == 0
    {
        return Err(CoreError::Parse(
            "No X account, tweets, likes, or DMs found. Upload a complete Twitter/X data archive ZIP.".into(),
        ));
    }

    let account = AccountInfo {
        display_name: acc.account.display_name.clone(),
        username: acc.account.username.clone(),
        account_id: acc.account.account_id.clone(),
        created_at: acc.account.created_at.clone(),
    };

    Ok((account, acc, threads))
}

fn parse_dm_conversation(row: &Value, me_id: &str, is_group: bool) -> Option<ParsedDmThread> {
    let conv = row.get("dmConversation")?;
    let conversation_id = conv
        .get("conversationId")
        .and_then(Value::as_str)?
        .to_string();
    let messages_val = conv.get("messages")?.as_array()?;

    let peer_label = if is_group {
        format!("Group DM {}", short_id(&conversation_id))
    } else {
        peer_from_conversation_id(&conversation_id, me_id)
    };

    let mut messages = Vec::new();
    for msg_wrap in messages_val {
        let create = msg_wrap
            .get("messageCreate")
            .or_else(|| msg_wrap.get("messageCreate"));
        // Also joinConversation etc. — only count messageCreate
        let Some(create) = create else { continue };
        let sender_id = create
            .get("senderId")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string();
        let body = create
            .get("text")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string();
        let created = create.get("createdAt").and_then(Value::as_str).unwrap_or("");
        let Some((secs, hour, date_str)) = parse_iso_datetime(created)
            .or_else(|| parse_twitter_created_at(created))
        else {
            continue;
        };
        messages.push(ParsedDmMessage {
            sender_id,
            timestamp_secs: secs,
            hour,
            date_str,
            body,
        });
    }

    if messages.is_empty() {
        return None;
    }

    Some(ParsedDmThread {
        conversation_id,
        is_group,
        peer_label,
        messages,
    })
}

fn peer_from_conversation_id(conversation_id: &str, me_id: &str) -> String {
    let parts: Vec<&str> = conversation_id.split('-').collect();
    if parts.len() == 2 {
        let peer = if parts[0] == me_id {
            parts[1]
        } else if parts[1] == me_id {
            parts[0]
        } else {
            parts[0]
        };
        return format!("DM {peer}");
    }
    format!("DM {}", short_id(conversation_id))
}

fn short_id(id: &str) -> String {
    let s: String = id.chars().take(10).collect();
    if s.is_empty() { "chat".into() } else { s }
}

/// Parse `window.YTD.foo.part0 = [...]` → (`foo`, array values).
fn parse_ytd_assignment(text: &str) -> Option<(String, Vec<Value>)> {
    let trimmed = text.trim();
    let eq = trimmed.find('=')?;
    let left = trimmed[..eq].trim();
    let right = trimmed[eq + 1..].trim().trim_end_matches(';').trim();

    // window.YTD.direct_messages.part0
    let logical = left
        .strip_prefix("window.YTD.")
        .or_else(|| left.strip_prefix("YTD."))
        .unwrap_or(left);
    let name = logical
        .split('.')
        .next()
        .unwrap_or(logical)
        .trim()
        .to_string();
    if name.is_empty() {
        return None;
    }

    let value: Value = serde_json::from_str(right).ok()?;
    let arr = match value {
        Value::Array(a) => a,
        other => vec![other],
    };
    Some((name, arr))
}

fn looks_like_zip(bytes: &[u8]) -> bool {
    bytes.len() >= 4 && bytes[0] == 0x50 && bytes[1] == 0x4B
}

fn stable_chat_id(conversation_id: &str) -> i64 {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    conversation_id.hash(&mut hasher);
    let h = hasher.finish() as i64;
    if h == 0 { 1 } else { h.abs() }
}

/// `Sun Aug 02 15:17:46 +0000 2026`
fn parse_twitter_created_at(raw: &str) -> Option<(i64, u8, String)> {
    let parts: Vec<&str> = raw.split_whitespace().collect();
    if parts.len() < 6 {
        return None;
    }
    let mon = month_num(parts[1])?;
    let d: i32 = parts[2].parse().ok()?;
    let (hh, mm, ss) = parse_hms(parts[3])?;
    let y: i32 = parts[5].parse().ok()?;
    let secs = civil_to_epoch(y, mon, d, hh, mm, ss)?;
    Some((secs, hh as u8, format!("{y:04}-{mon:02}-{d:02}")))
}

/// `2023-02-09T12:49:49.173Z`
fn parse_iso_datetime(raw: &str) -> Option<(i64, u8, String)> {
    let s = raw.trim();
    if s.len() < 19 {
        return None;
    }
    let date = &s[0..10];
    let time = &s[11..];
    let segs: Vec<&str> = date.split('-').collect();
    if segs.len() != 3 {
        return None;
    }
    let y: i32 = segs[0].parse().ok()?;
    let m: i32 = segs[1].parse().ok()?;
    let d: i32 = segs[2].parse().ok()?;
    let (hh, mm, ss) = parse_hms(time)?;
    let secs = civil_to_epoch(y, m, d, hh, mm, ss)?;
    Some((secs, hh as u8, format!("{y:04}-{m:02}-{d:02}")))
}

fn parse_hms(time: &str) -> Option<(i32, i32, i32)> {
    let segs: Vec<&str> = time.split(':').collect();
    if segs.len() < 2 {
        return None;
    }
    let hh: i32 = segs[0].parse().ok()?;
    let mm: i32 = segs[1].parse().ok()?;
    let ss: i32 = if segs.len() >= 3 {
        segs[2]
            .chars()
            .take_while(|c| c.is_ascii_digit())
            .collect::<String>()
            .parse()
            .unwrap_or(0)
    } else {
        0
    };
    Some((hh, mm, ss))
}

fn month_num(name: &str) -> Option<i32> {
    let n = name.to_ascii_lowercase();
    let key = &n[..n.len().min(3)];
    match key {
        "jan" => Some(1),
        "feb" => Some(2),
        "mar" => Some(3),
        "apr" => Some(4),
        "may" => Some(5),
        "jun" => Some(6),
        "jul" => Some(7),
        "aug" => Some(8),
        "sep" => Some(9),
        "oct" => Some(10),
        "nov" => Some(11),
        "dec" => Some(12),
        _ => None,
    }
}

fn civil_to_epoch(y: i32, m: i32, d: i32, hh: i32, mm: i32, ss: i32) -> Option<i64> {
    if !(1..=12).contains(&m) || !(1..=31).contains(&d) {
        return None;
    }
    if !(0..=23).contains(&hh) || !(0..=59).contains(&mm) || !(0..=60).contains(&ss) {
        return None;
    }
    let days = civil_to_epoch_days(y as i64, m as i64, d as i64);
    Some(days * 86_400 + (hh as i64) * 3_600 + (mm as i64) * 60 + ss as i64)
}

fn civil_to_epoch_days(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = if m > 2 { m - 3 } else { m + 9 };
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use zip::write::SimpleFileOptions;
    use zip::ZipWriter;

    fn zip_with(files: &[(&str, &str)]) -> Vec<u8> {
        let mut buf = Cursor::new(Vec::new());
        {
            let mut zip = ZipWriter::new(&mut buf);
            let opts = SimpleFileOptions::default();
            for (name, content) in files {
                zip.start_file(*name, opts).unwrap();
                zip.write_all(content.as_bytes()).unwrap();
            }
            zip.finish().unwrap();
        }
        buf.into_inner()
    }

    #[test]
    fn strips_ytd_and_parses_tweets_dms() {
        let account = r#"window.YTD.account.part0 = [
  { "account": { "username": "ada", "accountId": "1", "accountDisplayName": "Ada", "createdAt": "2012-01-01T00:00:00.000Z" } }
]"#;
        let tweets = r#"window.YTD.tweets.part0 = [
  { "tweet": { "full_text": "Hello @bob", "created_at": "Sun Aug 02 15:17:46 +0000 2026", "entities": { "user_mentions": [ { "screen_name": "bob" } ] } } },
  { "tweet": { "full_text": "RT @bob: hi", "created_at": "Mon Aug 03 10:00:00 +0000 2026", "entities": { "user_mentions": [ { "screen_name": "bob" } ] } } }
]"#;
        let likes = r#"window.YTD.like.part0 = [
  { "like": { "tweetId": "1", "fullText": "x" } },
  { "like": { "tweetId": "2", "fullText": "y" } }
]"#;
        let followers = r#"window.YTD.follower.part0 = [ { "follower": { "accountId": "9" } } ]"#;
        let following = r#"window.YTD.following.part0 = [ { "following": { "accountId": "8" } }, { "following": { "accountId": "7" } } ]"#;
        let dms = r#"window.YTD.direct_messages.part0 = [
  {
    "dmConversation": {
      "conversationId": "2-1",
      "messages": [
        { "messageCreate": { "senderId": "1", "text": "hi", "createdAt": "2023-02-09T12:48:50.264Z" } },
        { "messageCreate": { "senderId": "2", "text": "hello", "createdAt": "2023-02-09T12:49:49.173Z" } }
      ]
    }
  }
]"#;
        let html = "<!doctype html><html><body>archive</body></html>";

        let bytes = zip_with(&[
            ("data/account.js", account),
            ("data/tweets.js", tweets),
            ("data/like.js", likes),
            ("data/follower.js", followers),
            ("data/following.js", following),
            ("data/direct-messages.js", dms),
            ("Your archive.html", html),
        ]);

        let preview = preview_export_bytes(&bytes).unwrap();
        assert_eq!(preview.display_name, "Ada");
        assert_eq!(preview.tweet_count, 2);
        assert_eq!(preview.like_count, 2);
        assert_eq!(preview.dm_message_count, 2);
        assert!(preview.has_official_html);

        let result = analyze_export_bytes(&bytes).unwrap();
        assert_eq!(result.x_insights.tweet_count, 2);
        assert_eq!(result.x_insights.retweet_count, 1);
        assert_eq!(result.x_insights.original_count, 1);
        assert_eq!(result.x_insights.follower_count, 1);
        assert_eq!(result.x_insights.following_count, 2);
        assert_eq!(result.x_insights.like_count, 2);
        assert!(result.analytics.account.total_messages >= 2);
        assert!(result.x_insights.has_official_html);
        assert_eq!(result.x_insights.top_mentions[0].name, "bob");
    }

    #[test]
    fn parses_twitter_dates() {
        let a = parse_twitter_created_at("Sun Aug 02 15:17:46 +0000 2026").unwrap();
        assert_eq!(a.2, "2026-08-02");
        assert_eq!(a.1, 15);
        let b = parse_iso_datetime("2023-02-09T12:49:49.173Z").unwrap();
        assert_eq!(b.2, "2023-02-09");
        assert_eq!(b.1, 12);
    }

    /// `X_EXPORT_ZIP=/path/to/twitter.zip cargo test -p app-core analyze_real_x_export -- --ignored --nocapture`
    #[test]
    #[ignore]
    fn analyze_real_x_export() {
        let path = std::env::var("X_EXPORT_ZIP")
            .expect("Set X_EXPORT_ZIP to a Twitter/X archive ZIP path");
        let bytes = std::fs::read(&path).unwrap_or_else(|e| panic!("read {path}: {e}"));
        let preview = preview_export_bytes(&bytes).expect("preview");
        println!(
            "preview: {} tweets={} likes={} dms={} html={}",
            preview.display_name,
            preview.tweet_count,
            preview.like_count,
            preview.dm_message_count,
            preview.has_official_html
        );
        let result = analyze_export_bytes(&bytes).expect("analyze");
        let i = &result.x_insights;
        println!(
            "insights: followers={} following={} tweets={} likes={} dm_threads={}",
            i.follower_count, i.following_count, i.tweet_count, i.like_count, i.dm_thread_count
        );
        assert!(preview.has_official_html);
        assert!(i.tweet_count > 0 || i.like_count > 0);
    }
}
