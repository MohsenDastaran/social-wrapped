//! Instagram Meta JSON takeout parser (Direct messages + outbound social).
//!
//! Expects a ZIP (or in-memory ZIP bytes) from Accounts Center → Download your
//! information (JSON). Reads:
//! - `personal_information/.../personal_information.json` (Name / Username)
//! - `**/messages/{inbox,message_requests}/**/message_*.json`
//! - `connections/followers_and_following/` (followers, following, unfollowed)
//! - `your_instagram_activity/likes/liked_posts.json` (+ timestamps for heatmap)
//! - `your_instagram_activity/likes/liked_comments.json`
//! - `your_instagram_activity/comments/post_comments_*.json`, `reels_comments.json`
//! - `your_instagram_activity/story_interactions/story_likes.json`
//! - `your_instagram_activity/saved/saved_posts.json`, `saved_collections.json`
//!
//! Media binaries under `media/` are ignored. Strings may need classic
//! Instagram latin1→UTF-8 mojibake repair.
//!
//! Timestamps are UTC epoch milliseconds; hour/date_str use UTC civil time.

use std::collections::{BTreeSet, HashMap};
use std::hash::{Hash, Hasher};
use std::io::{Cursor, Read};

use serde::Deserialize;
use serde_json::Value;
use zip::ZipArchive;

use crate::analytics::collectors::{
    extract_emojis, is_pure_emoji_text, text_has_url, tokenize_words, AnalysisEngine,
    ContentKind, HeatmapDay, MessageEvent, MessageKind, ReactionEvent, WrapAnalytics,
};
use crate::error::CoreError;
use crate::parsers::telegram::AnalyzeProgressPhase;

// ── Preview ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstagramPreview {
    pub display_name: String,
    pub username: Option<String>,
    /// Suggested “me” from profile Name/Username when it matches senders.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggested_me: Option<String>,
    /// Distinct sender names across all threads (for identity picker fallback).
    pub senders: Vec<String>,
    pub thread_count: usize,
    pub message_count: u64,
    pub file_size_bytes: u64,
}

impl InstagramPreview {
    pub fn to_json(&self) -> Result<String, CoreError> {
        serde_json::to_string(self).map_err(CoreError::from)
    }
}

/// Outbound / graph insights unique to Instagram Meta downloads.
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstagramSocialInsights {
    pub follower_count: u64,
    pub following_count: u64,
    pub unfollowed_recently_count: u64,
    pub not_following_back: Vec<IgHandle>,
    pub fans_you_dont_follow: Vec<IgHandle>,
    pub top_liked_accounts: Vec<IgCountedHandle>,
    pub top_story_liked_accounts: Vec<IgCountedHandle>,

    // Engagement (likes + comments you authored / liked)
    pub liked_posts_count: u64,
    pub liked_comments_count: u64,
    pub comments_written_count: u64,
    pub like_heatmap: Vec<HeatmapDay>,
    /// 24 UTC hour buckets for liked posts.
    pub like_hourly: Vec<u64>,
    pub top_commented_accounts: Vec<IgCountedHandle>,
    pub top_reel_commented_accounts: Vec<IgCountedHandle>,
    pub top_liked_comment_accounts: Vec<IgCountedHandle>,

    // Saved
    pub saved_posts_count: u64,
    pub top_saved_accounts: Vec<IgCountedHandle>,
    pub saved_collections: Vec<IgSavedCollection>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IgSavedCollection {
    pub name: String,
    pub item_count: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub privacy: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IgHandle {
    pub username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub href: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IgCountedHandle {
    pub username: String,
    pub count: u64,
}

/// Full Instagram analyze payload (messaging + social).
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstagramAnalyzeResult {
    pub analytics: WrapAnalytics,
    pub instagram_social: InstagramSocialInsights,
}

impl InstagramAnalyzeResult {
    pub fn to_json(&self) -> Result<String, CoreError> {
        serde_json::to_string(self).map_err(CoreError::from)
    }
}

// ── Raw JSON types ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct RawThread {
    #[serde(default)]
    participants: Vec<RawParticipant>,
    #[serde(default)]
    messages: Vec<RawMessage>,
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    thread_path: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RawParticipant {
    #[serde(default)]
    name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RawMessage {
    #[serde(default)]
    sender_name: Option<String>,
    #[serde(default)]
    timestamp_ms: Option<i64>,
    #[serde(default)]
    content: Option<String>,
    #[serde(default)]
    share: Option<RawShare>,
    #[serde(default)]
    photos: Option<Vec<Value>>,
    #[serde(default)]
    videos: Option<Vec<Value>>,
    #[serde(default)]
    audio_files: Option<Vec<Value>>,
    #[serde(default)]
    gifs: Option<Vec<Value>>,
    #[serde(default)]
    sticker: Option<Value>,
    #[serde(default)]
    reactions: Vec<RawReaction>,
    #[serde(default)]
    call_duration: Option<u64>,
    #[serde(default)]
    is_unsent: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct RawShare {
    #[serde(default)]
    link: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RawReaction {
    #[serde(default)]
    reaction: Option<String>,
    #[serde(default)]
    actor: Option<String>,
}

#[derive(Debug, Clone)]
struct Profile {
    name: Option<String>,
    username: Option<String>,
}

#[derive(Debug, Clone)]
struct ParsedThread {
    thread_path: String,
    title: String,
    participant_count: usize,
    messages: Vec<ParsedIgMessage>,
}

#[derive(Debug, Clone)]
struct ParsedIgMessage {
    sender: String,
    timestamp_secs: i64,
    hour: u8,
    date_str: String,
    body: String,
    kind: MessageKind,
    reactions: Vec<(String, String)>, // (emoji, actor)
}

// ── Public API ────────────────────────────────────────────────────────────────

pub fn preview_export_bytes(bytes: &[u8]) -> Result<InstagramPreview, CoreError> {
    let file_size_bytes = bytes.len() as u64;
    let (profile, threads, _social) = load_export(bytes, |_, _| {})?;
    let message_count: u64 = threads.iter().map(|t| t.messages.len() as u64).sum();
    let senders = unique_senders(&threads);
    let suggested_me = suggest_me(&profile, &senders);
    let display_name = profile
        .name
        .clone()
        .or_else(|| profile.username.clone())
        .unwrap_or_else(|| "Instagram".to_string());

    Ok(InstagramPreview {
        display_name,
        username: profile.username,
        suggested_me,
        senders,
        thread_count: threads.len(),
        message_count,
        file_size_bytes,
    })
}

pub fn analyze_export_bytes(
    bytes: &[u8],
    me_name: Option<&str>,
) -> Result<InstagramAnalyzeResult, CoreError> {
    analyze_export_bytes_with_progress(bytes, me_name, |_, _, _| {})
}

pub fn analyze_export_bytes_with_progress<F>(
    bytes: &[u8],
    me_name: Option<&str>,
    mut on_progress: F,
) -> Result<InstagramAnalyzeResult, CoreError>
where
    F: FnMut(AnalyzeProgressPhase, u64, u64),
{
    let total_bytes = bytes.len() as u64;
    on_progress(AnalyzeProgressPhase::Reading, 0, total_bytes.max(1));

    let (profile, threads, social) = load_export(bytes, |read, total| {
        on_progress(AnalyzeProgressPhase::Reading, read, total.max(1));
    })?;
    on_progress(
        AnalyzeProgressPhase::Reading,
        total_bytes.max(1),
        total_bytes.max(1),
    );

    if threads.is_empty() {
        return Err(CoreError::Parse(
            "No Instagram message threads found. Upload a Meta JSON download ZIP that includes messages/inbox.".into(),
        ));
    }

    let senders = unique_senders(&threads);
    let me = resolve_me(me_name, &profile, &senders)?;

    let display_name = profile
        .name
        .clone()
        .filter(|n| !n.is_empty())
        .unwrap_or_else(|| me.clone());
    let username = profile.username.clone();
    let about = format!("{} chats", threads.len());

    let mut engine = AnalysisEngine::new(display_name, username, about, total_bytes);

    let compute_total: u64 = threads
        .iter()
        .map(|t| t.messages.len() as u64)
        .sum::<u64>()
        .max(1);
    let report_step = (compute_total / 200).max(1);
    let mut processed: u64 = 0;
    on_progress(AnalyzeProgressPhase::Computing, 0, compute_total);

    for thread in &threads {
        let chat_id = stable_chat_id(&thread.thread_path);
        let is_group = thread.participant_count >= 3;
        let chat_name = thread.title.clone();

        for msg in &thread.messages {
            processed += 1;
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

            let reactions: Vec<ReactionEvent> = msg
                .reactions
                .iter()
                .filter_map(|(emoji, actor)| {
                    let e = emoji.trim();
                    if e.is_empty() {
                        None
                    } else {
                        Some(ReactionEvent {
                            emoji: e.to_string(),
                            from_me: actor == &me,
                        })
                    }
                })
                .collect();

            let ev = MessageEvent {
                chat_id,
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
                reactions,
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
    }

    on_progress(AnalyzeProgressPhase::Computing, compute_total, compute_total);
    Ok(InstagramAnalyzeResult {
        analytics: engine.finish(),
        instagram_social: social,
    })
}

// ── Load ZIP ──────────────────────────────────────────────────────────────────

fn load_export<F>(
    bytes: &[u8],
    mut on_read: F,
) -> Result<(Profile, Vec<ParsedThread>, InstagramSocialInsights), CoreError>
where
    F: FnMut(u64, u64),
{
    if !looks_like_zip(bytes) {
        return Err(CoreError::Parse(
            "Instagram import expects a ZIP of your Meta JSON download.".into(),
        ));
    }

    let total = bytes.len() as u64;
    let cursor = Cursor::new(bytes);
    let mut archive = ZipArchive::new(cursor)?;

    let mut profile = Profile {
        name: None,
        username: None,
    };
    let mut thread_bufs: HashMap<String, ThreadAcc> = HashMap::new();
    let mut social_acc = SocialAcc::default();
    let mut bytes_read: u64 = 0;

    let entry_count = archive.len();
    for index in 0..entry_count {
        let mut file = archive.by_index(index)?;
        let name = file.name().to_string();
        if file.is_dir() {
            continue;
        }
        let lower = name.replace('\\', "/").to_ascii_lowercase();

        let is_profile = lower.ends_with("/personal_information/personal_information.json")
            || lower.ends_with("personal_information/personal_information.json");
        let is_message = is_message_json_path(&lower);
        let social_kind = social_file_kind(&lower);

        if !is_profile && !is_message && social_kind.is_none() {
            continue;
        }

        let mut buf = Vec::new();
        file.read_to_end(&mut buf)?;
        bytes_read = bytes_read.saturating_add(buf.len() as u64);
        on_read(bytes_read.min(total), total.max(1));

        let text = decode_json_bytes(&buf)?;

        if is_profile {
            if let Some(p) = parse_profile(&text) {
                profile = p;
            }
            continue;
        }

        if let Some(kind) = social_kind {
            ingest_social_json(&mut social_acc, kind, &text);
            continue;
        }

        let thread = match serde_json::from_str::<RawThread>(&text) {
            Ok(t) => t,
            Err(_) => continue,
        };

        let dir_key = thread_dir_key(&name);
        let acc = thread_bufs.entry(dir_key.clone()).or_insert_with(|| {
            let path = thread
                .thread_path
                .clone()
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| dir_key.clone());
            ThreadAcc {
                thread_path: path,
                title: String::new(),
                participants: BTreeSet::new(),
                messages: Vec::new(),
            }
        });

        if let Some(tp) = thread.thread_path.filter(|s| !s.is_empty()) {
            acc.thread_path = tp;
        }
        if let Some(title) = thread.title {
            let fixed = fix_mojibake(&title);
            if !fixed.trim().is_empty() {
                acc.title = fixed;
            }
        }
        for p in thread.participants {
            if let Some(n) = p.name {
                let fixed = fix_mojibake(&n);
                if !fixed.trim().is_empty() {
                    acc.participants.insert(fixed);
                }
            }
        }
        for msg in thread.messages {
            if msg.is_unsent == Some(true) {
                continue;
            }
            if let Some(parsed) = parse_ig_message(msg) {
                acc.messages.push(parsed);
            }
        }
    }

    let mut threads: Vec<ParsedThread> = thread_bufs
        .into_values()
        .filter(|t| !t.messages.is_empty())
        .map(|t| {
            let title = if t.title.trim().is_empty() {
                t.participants
                    .iter()
                    .cloned()
                    .collect::<Vec<_>>()
                    .join(", ")
            } else {
                t.title
            };
            let title = if title.trim().is_empty() {
                t.thread_path.clone()
            } else {
                title
            };
            ParsedThread {
                thread_path: t.thread_path,
                title,
                participant_count: t.participants.len().max(2),
                messages: t.messages,
            }
        })
        .collect();

    for t in &mut threads {
        t.messages.sort_by_key(|m| m.timestamp_secs);
    }
    threads.sort_by(|a, b| a.thread_path.cmp(&b.thread_path));

    profile.name = profile.name.map(|s| fix_mojibake(&s));
    profile.username = profile.username.map(|s| fix_mojibake(&s));

    Ok((profile, threads, social_acc.finish()))
}

#[derive(Default)]
struct SocialAcc {
    /// username (lower) -> (display username, href)
    followers: HashMap<String, (String, Option<String>)>,
    following: HashMap<String, (String, Option<String>)>,
    unfollowed_recently: u64,
    liked_posts: HashMap<String, u64>,
    liked_posts_count: u64,
    like_day_counts: HashMap<String, u64>,
    like_hourly: [u64; 24],
    story_likes: HashMap<String, u64>,
    liked_comment_accounts: HashMap<String, u64>,
    liked_comments_count: u64,
    post_comment_accounts: HashMap<String, u64>,
    reel_comment_accounts: HashMap<String, u64>,
    comments_written_count: u64,
    saved_accounts: HashMap<String, u64>,
    saved_posts_count: u64,
    saved_collections: Vec<IgSavedCollection>,
}

impl SocialAcc {
    fn finish(self) -> InstagramSocialInsights {
        let follower_keys: BTreeSet<_> = self.followers.keys().cloned().collect();
        let following_keys: BTreeSet<_> = self.following.keys().cloned().collect();

        let mut not_following_back: Vec<IgHandle> = following_keys
            .difference(&follower_keys)
            .filter_map(|k| {
                self.following.get(k).map(|(u, href)| IgHandle {
                    username: u.clone(),
                    href: href.clone(),
                })
            })
            .collect();
        not_following_back.sort_by(|a, b| a.username.to_lowercase().cmp(&b.username.to_lowercase()));

        let mut fans_you_dont_follow: Vec<IgHandle> = follower_keys
            .difference(&following_keys)
            .filter_map(|k| {
                self.followers.get(k).map(|(u, href)| IgHandle {
                    username: u.clone(),
                    href: href.clone(),
                })
            })
            .collect();
        fans_you_dont_follow
            .sort_by(|a, b| a.username.to_lowercase().cmp(&b.username.to_lowercase()));

        let top_liked = ranked_counts(self.liked_posts);
        let top_story = ranked_counts(self.story_likes);
        let top_commented = ranked_counts(self.post_comment_accounts);
        let top_reel_commented = ranked_counts(self.reel_comment_accounts);
        let top_liked_comments = ranked_counts(self.liked_comment_accounts);
        let top_saved = ranked_counts(self.saved_accounts);

        let mut like_heatmap: Vec<HeatmapDay> = self
            .like_day_counts
            .into_iter()
            .map(|(date, count)| HeatmapDay { date, count })
            .collect();
        like_heatmap.sort_by(|a, b| a.date.cmp(&b.date));

        let mut saved_collections = self.saved_collections;
        saved_collections.sort_by(|a, b| {
            b.item_count
                .cmp(&a.item_count)
                .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });

        InstagramSocialInsights {
            follower_count: self.followers.len() as u64,
            following_count: self.following.len() as u64,
            unfollowed_recently_count: self.unfollowed_recently,
            not_following_back,
            fans_you_dont_follow,
            top_liked_accounts: top_liked,
            top_story_liked_accounts: top_story,
            liked_posts_count: self.liked_posts_count,
            liked_comments_count: self.liked_comments_count,
            comments_written_count: self.comments_written_count,
            like_heatmap,
            like_hourly: self.like_hourly.to_vec(),
            top_commented_accounts: top_commented,
            top_reel_commented_accounts: top_reel_commented,
            top_liked_comment_accounts: top_liked_comments,
            saved_posts_count: self.saved_posts_count,
            top_saved_accounts: top_saved,
            saved_collections,
        }
    }
}

fn ranked_counts(map: HashMap<String, u64>) -> Vec<IgCountedHandle> {
    let mut out: Vec<IgCountedHandle> = map
        .into_iter()
        .map(|(username, count)| IgCountedHandle { username, count })
        .collect();
    out.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.username.cmp(&b.username)));
    out
}

#[derive(Clone, Copy)]
enum SocialFileKind {
    Followers,
    Following,
    Unfollowed,
    LikedPosts,
    LikedComments,
    PostComments,
    ReelsComments,
    StoryLikes,
    SavedPosts,
    SavedCollections,
}

fn social_file_kind(lower: &str) -> Option<SocialFileKind> {
    let base = lower.rsplit('/').next().unwrap_or(lower);
    let in_follow_graph = lower.contains("followers_and_following/");
    if in_follow_graph && base.starts_with("followers") && base.ends_with(".json") {
        return Some(SocialFileKind::Followers);
    }
    if in_follow_graph && base == "following.json" {
        return Some(SocialFileKind::Following);
    }
    if in_follow_graph && base.contains("recently_unfollowed") && base.ends_with(".json") {
        return Some(SocialFileKind::Unfollowed);
    }
    if lower.contains("/likes/") && base == "liked_posts.json" {
        return Some(SocialFileKind::LikedPosts);
    }
    if lower.contains("/likes/") && base == "liked_comments.json" {
        return Some(SocialFileKind::LikedComments);
    }
    if lower.contains("/comments/")
        && base.starts_with("post_comments")
        && base.ends_with(".json")
    {
        return Some(SocialFileKind::PostComments);
    }
    if lower.contains("/comments/") && base == "reels_comments.json" {
        return Some(SocialFileKind::ReelsComments);
    }
    if lower.contains("story_interactions/") && base == "story_likes.json" {
        return Some(SocialFileKind::StoryLikes);
    }
    if lower.contains("/saved/") && base == "saved_posts.json" {
        return Some(SocialFileKind::SavedPosts);
    }
    if lower.contains("/saved/") && base == "saved_collections.json" {
        return Some(SocialFileKind::SavedCollections);
    }
    None
}

fn ingest_social_json(acc: &mut SocialAcc, kind: SocialFileKind, text: &str) {
    let Ok(value) = serde_json::from_str::<Value>(text) else {
        return;
    };
    match kind {
        SocialFileKind::Followers => ingest_followers(acc, &value),
        SocialFileKind::Following => ingest_following(acc, &value),
        SocialFileKind::Unfollowed => {
            if let Some(arr) = value.as_array() {
                acc.unfollowed_recently = acc.unfollowed_recently.saturating_add(arr.len() as u64);
            }
        }
        SocialFileKind::LikedPosts => ingest_liked_posts(acc, &value),
        SocialFileKind::LikedComments => ingest_liked_comments(acc, &value),
        SocialFileKind::PostComments => ingest_post_comments(acc, &value),
        SocialFileKind::ReelsComments => ingest_reels_comments(acc, &value),
        SocialFileKind::StoryLikes => ingest_story_likes(acc, &value),
        SocialFileKind::SavedPosts => ingest_saved_posts(acc, &value),
        SocialFileKind::SavedCollections => ingest_saved_collections(acc, &value),
    }
}

fn ingest_followers(acc: &mut SocialAcc, value: &Value) {
    let Some(arr) = value.as_array() else { return };
    for item in arr {
        for s in item
            .get("string_list_data")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            let raw = s.get("value").and_then(Value::as_str).unwrap_or("");
            let username = fix_mojibake(raw).trim().to_string();
            if username.is_empty() {
                continue;
            }
            let href = s
                .get("href")
                .and_then(Value::as_str)
                .map(|h| h.to_string())
                .filter(|h| !h.is_empty());
            let key = username.to_ascii_lowercase();
            acc.followers.entry(key).or_insert((username, href));
        }
    }
}

fn ingest_following(acc: &mut SocialAcc, value: &Value) {
    let arr = value
        .get("relationships_following")
        .and_then(Value::as_array)
        .or_else(|| value.as_array());
    let Some(arr) = arr else { return };
    for item in arr {
        let raw = item
            .get("title")
            .and_then(Value::as_str)
            .unwrap_or("");
        let username = fix_mojibake(raw).trim().to_string();
        if username.is_empty() {
            continue;
        }
        let href = item
            .get("string_list_data")
            .and_then(Value::as_array)
            .and_then(|a| a.first())
            .and_then(|s| s.get("href"))
            .and_then(Value::as_str)
            .map(|h| h.to_string())
            .filter(|h| !h.is_empty());
        let key = username.to_ascii_lowercase();
        acc.following.entry(key).or_insert((username, href));
    }
}

fn ingest_liked_posts(acc: &mut SocialAcc, value: &Value) {
    let Some(arr) = value.as_array() else { return };
    for item in arr {
        acc.liked_posts_count = acc.liked_posts_count.saturating_add(1);
        if let Some(ts) = item.get("timestamp").and_then(Value::as_i64) {
            let (hour, date) = utc_hour_and_date(ts);
            if (hour as usize) < 24 {
                acc.like_hourly[hour as usize] =
                    acc.like_hourly[hour as usize].saturating_add(1);
            }
            *acc.like_day_counts.entry(date).or_insert(0) += 1;
        }
        for username in extract_owner_usernames(item) {
            let u = fix_mojibake(&username).trim().to_string();
            if u.is_empty() {
                continue;
            }
            *acc.liked_posts.entry(u).or_insert(0) += 1;
        }
    }
}

fn ingest_liked_comments(acc: &mut SocialAcc, value: &Value) {
    let arr = value
        .get("likes_comment_likes")
        .and_then(Value::as_array)
        .or_else(|| value.as_array());
    let Some(arr) = arr else { return };
    for item in arr {
        acc.liked_comments_count = acc.liked_comments_count.saturating_add(1);
        let raw = item.get("title").and_then(Value::as_str).unwrap_or("");
        let u = fix_mojibake(raw).trim().to_string();
        if !u.is_empty() {
            *acc.liked_comment_accounts.entry(u).or_insert(0) += 1;
        }
    }
}

fn ingest_post_comments(acc: &mut SocialAcc, value: &Value) {
    let Some(arr) = value.as_array() else { return };
    for item in arr {
        acc.comments_written_count = acc.comments_written_count.saturating_add(1);
        if let Some(owner) = media_owner_from_comment(item) {
            *acc.post_comment_accounts.entry(owner).or_insert(0) += 1;
        }
    }
}

fn ingest_reels_comments(acc: &mut SocialAcc, value: &Value) {
    let arr = value
        .get("comments_reels_comments")
        .and_then(Value::as_array)
        .or_else(|| value.as_array());
    let Some(arr) = arr else { return };
    for item in arr {
        acc.comments_written_count = acc.comments_written_count.saturating_add(1);
        if let Some(owner) = media_owner_from_comment(item) {
            *acc.reel_comment_accounts.entry(owner).or_insert(0) += 1;
        }
    }
}

fn media_owner_from_comment(item: &Value) -> Option<String> {
    let raw = item
        .get("string_map_data")
        .and_then(|m| m.get("Media Owner"))
        .and_then(|e| e.get("value"))
        .and_then(Value::as_str)?;
    let u = fix_mojibake(raw).trim().to_string();
    if u.is_empty() { None } else { Some(u) }
}

fn ingest_saved_posts(acc: &mut SocialAcc, value: &Value) {
    let Some(arr) = value.as_array() else { return };
    for item in arr {
        acc.saved_posts_count = acc.saved_posts_count.saturating_add(1);
        for username in extract_owner_usernames(item) {
            let u = fix_mojibake(&username).trim().to_string();
            if !u.is_empty() {
                *acc.saved_accounts.entry(u).or_insert(0) += 1;
            }
        }
    }
}

fn ingest_saved_collections(acc: &mut SocialAcc, value: &Value) {
    let Some(arr) = value.as_array() else { return };
    for item in arr {
        let mut name = String::new();
        let mut privacy: Option<String> = None;
        let mut item_count: u64 = 0;
        for lv in item
            .get("label_values")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            match lv.get("label").and_then(Value::as_str) {
                Some("Name") => {
                    name = fix_mojibake(lv.get("value").and_then(Value::as_str).unwrap_or(""))
                        .trim()
                        .to_string();
                }
                Some("Privacy") => {
                    let p = fix_mojibake(lv.get("value").and_then(Value::as_str).unwrap_or(""))
                        .trim()
                        .to_string();
                    if !p.is_empty() {
                        privacy = Some(p);
                    }
                }
                _ => {}
            }
            if lv.get("title").and_then(Value::as_str) == Some("Media") {
                item_count = lv
                    .get("dict")
                    .and_then(Value::as_array)
                    .map(|a| a.len() as u64)
                    .unwrap_or(0);
            }
        }
        if name.is_empty() {
            name = "Untitled collection".into();
        }
        acc.saved_collections.push(IgSavedCollection {
            name,
            item_count,
            privacy,
        });
    }
}

fn extract_owner_usernames(item: &Value) -> Vec<String> {
    let mut out = Vec::new();
    let Some(labels) = item.get("label_values").and_then(Value::as_array) else {
        return out;
    };
    for lv in labels {
        if lv.get("title").and_then(Value::as_str) != Some("Owner") {
            continue;
        }
        for d in lv.get("dict").and_then(Value::as_array).into_iter().flatten() {
            for dd in d.get("dict").and_then(Value::as_array).into_iter().flatten() {
                if dd.get("label").and_then(Value::as_str) == Some("Username") {
                    if let Some(v) = dd.get("value").and_then(Value::as_str) {
                        out.push(v.to_string());
                    }
                }
            }
        }
    }
    out
}

fn ingest_story_likes(acc: &mut SocialAcc, value: &Value) {
    let Some(arr) = value.as_array() else { return };
    for item in arr {
        let Some(labels) = item.get("label_values").and_then(Value::as_array) else {
            continue;
        };
        for lv in labels {
            if lv.get("label").and_then(Value::as_str) != Some("URL") {
                continue;
            }
            let url = lv.get("value").and_then(Value::as_str).unwrap_or("");
            if let Some(user) = story_username_from_url(url) {
                let u = fix_mojibake(&user).trim().to_string();
                if !u.is_empty() {
                    *acc.story_likes.entry(u).or_insert(0) += 1;
                }
            }
        }
    }
}

fn story_username_from_url(url: &str) -> Option<String> {
    let marker = "/stories/";
    let idx = url.find(marker)?;
    let rest = &url[idx + marker.len()..];
    let user = rest.split('/').next()?.trim();
    if user.is_empty() {
        None
    } else {
        Some(user.to_string())
    }
}

struct ThreadAcc {
    thread_path: String,
    title: String,
    participants: BTreeSet<String>,
    messages: Vec<ParsedIgMessage>,
}

fn looks_like_zip(bytes: &[u8]) -> bool {
    bytes.len() >= 4 && bytes[0] == 0x50 && bytes[1] == 0x4B
}

fn is_message_json_path(lower: &str) -> bool {
    let in_inbox = lower.contains("/messages/inbox/") || lower.contains("messages/inbox/");
    let in_requests = lower.contains("/messages/message_requests/")
        || lower.contains("messages/message_requests/");
    if !in_inbox && !in_requests {
        return false;
    }
    let base = lower.rsplit('/').next().unwrap_or(lower);
    base.starts_with("message_") && base.ends_with(".json")
}

fn thread_dir_key(entry_name: &str) -> String {
    let normalized = entry_name.replace('\\', "/");
    match normalized.rfind('/') {
        Some(i) => normalized[..i].to_string(),
        None => normalized,
    }
}

fn decode_json_bytes(bytes: &[u8]) -> Result<String, CoreError> {
    let trimmed = if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        &bytes[3..]
    } else {
        bytes
    };
    String::from_utf8(trimmed.to_vec()).or_else(|_| {
        // Some exports are labeled UTF-8 but contain latin1; lossy then repair.
        let lossy = String::from_utf8_lossy(trimmed).into_owned();
        Ok(fix_mojibake(&lossy))
    })
}

/// Classic Instagram export mojibake: UTF-8 bytes decoded as latin1/cp1252.
fn fix_mojibake(s: &str) -> String {
    if !looks_mojibaked(s) {
        return s.to_string();
    }
    match s.chars().map(|c| u8::try_from(c as u32)).collect::<Result<Vec<_>, _>>() {
        Ok(bytes) => match String::from_utf8(bytes) {
            Ok(fixed) => fixed,
            Err(_) => s.to_string(),
        },
        Err(_) => s.to_string(),
    }
}

fn looks_mojibaked(s: &str) -> bool {
    // Common UTF-8-as-latin1 fingerprints for Persian / emoji.
    s.contains('Ã')
        || s.contains('Ø')
        || s.contains('Ù')
        || s.contains('Â')
        || s.contains("ðŸ")
        || s.contains("â€")
        || s.contains("ï¸")
}

fn parse_profile(json: &str) -> Option<Profile> {
    let v: Value = serde_json::from_str(json).ok()?;
    let users = v.get("profile_user")?.as_array()?;
    let first = users.first()?;
    let map = first.get("string_map_data")?.as_object()?;

    let name = map
        .get("Name")
        .and_then(|e| e.get("value"))
        .and_then(Value::as_str)
        .map(|s| fix_mojibake(s).trim().to_string())
        .filter(|s| !s.is_empty());
    let username = map
        .get("Username")
        .and_then(|e| e.get("value"))
        .and_then(Value::as_str)
        .map(|s| fix_mojibake(s).trim().to_string())
        .filter(|s| !s.is_empty());

    Some(Profile { name, username })
}

fn parse_ig_message(msg: RawMessage) -> Option<ParsedIgMessage> {
    let sender = fix_mojibake(msg.sender_name.as_deref().unwrap_or("")).trim().to_string();
    if sender.is_empty() {
        return None;
    }
    let ts_ms = msg.timestamp_ms.unwrap_or(0);
    if ts_ms <= 0 {
        return None;
    }
    let timestamp_secs = ts_ms / 1000;
    let (hour, date_str) = utc_hour_and_date(timestamp_secs);

    let body_raw = msg.content.as_deref().unwrap_or("");
    let body = fix_mojibake(body_raw);

    // Reaction receipts are stubs, not real content — reactions live on the parent msg.
    if is_ig_reaction_stub(&body) {
        return None;
    }

    let kind = classify_ig_message(&msg, &body);
    let reactions = msg
        .reactions
        .into_iter()
        .filter_map(|r| {
            let emoji = fix_mojibake(r.reaction.as_deref().unwrap_or(""));
            let actor = fix_mojibake(r.actor.as_deref().unwrap_or(""));
            if emoji.trim().is_empty() {
                None
            } else {
                Some((emoji, actor))
            }
        })
        .collect();

    Some(ParsedIgMessage {
        sender,
        timestamp_secs,
        hour,
        date_str,
        body,
        kind,
        reactions,
    })
}

fn classify_ig_message(msg: &RawMessage, body: &str) -> MessageKind {
    if msg.call_duration.is_some() {
        return MessageKind::Other;
    }
    // Media arrays first — "You sent an attachment." often pairs with share/media.
    if msg.photos.as_ref().is_some_and(|v| !v.is_empty()) {
        return MessageKind::Photo;
    }
    if msg.videos.as_ref().is_some_and(|v| !v.is_empty()) {
        return MessageKind::Video;
    }
    if msg.audio_files.as_ref().is_some_and(|v| !v.is_empty()) {
        return MessageKind::Voice;
    }
    if msg.gifs.as_ref().is_some_and(|v| !v.is_empty()) {
        return MessageKind::Animation;
    }
    if msg.sticker.is_some() {
        return MessageKind::Sticker;
    }
    if let Some(share) = &msg.share {
        return classify_ig_share_link(share.link.as_deref().unwrap_or(""));
    }

    let lower = ig_lower(body);
    // Stubs without media/share — map into real pie buckets (not opaque Other).
    if lower.contains("shared a reel") {
        return MessageKind::Video;
    }
    if lower.contains("shared a story") || lower.contains("shared a post") {
        return MessageKind::Photo;
    }
    if lower.contains("sent an attachment") {
        return MessageKind::File;
    }
    if lower.contains("missed a video chat")
        || lower.contains("missed an audio call")
        || lower.contains("started a video chat")
        || lower.contains("started an audio call")
        || lower.contains("turned off translations")
        || lower.contains("turned on translations")
    {
        return MessageKind::Other;
    }
    // Never treat Meta stubs as keyword-bearing text.
    if is_ig_keyword_noise(&lower) {
        return MessageKind::Other;
    }
    if body.trim().is_empty() {
        return MessageKind::Other;
    }
    MessageKind::Text
}

fn classify_ig_share_link(link: &str) -> MessageKind {
    let lower = link.to_ascii_lowercase();
    if lower.contains("/reel/") || lower.contains("/reels/") {
        MessageKind::Video
    } else if lower.contains("/stories/")
        || lower.contains("instagram.com/p/")
        || lower.contains("/tv/")
    {
        MessageKind::Photo
    } else if lower.contains("http://") || lower.contains("https://") {
        // External / unknown share — File in the pie (not vague Other).
        MessageKind::File
    } else {
        MessageKind::File
    }
}

fn ig_lower(body: &str) -> String {
    body.trim()
        .chars()
        .flat_map(|c| c.to_lowercase())
        .collect()
}

/// Reaction receipts / like-acks — drop from the timeline (not real content).
fn is_ig_reaction_stub(body: &str) -> bool {
    let lower = ig_lower(body);
    lower.contains("to your message") || lower == "liked a message"
}

/// System lines that must not feed Keyword Battle (already non-Text above).
fn is_ig_keyword_noise(lower: &str) -> bool {
    lower.contains("sent an attachment")
        || lower.contains("shared a story")
        || lower.contains("shared a post")
        || lower.contains("shared a reel")
        || lower.contains("to your message")
        || lower == "liked a message"
}

fn utc_hour_and_date(timestamp_secs: i64) -> (u8, String) {
    let days = timestamp_secs.div_euclid(86_400);
    let rem = timestamp_secs.rem_euclid(86_400);
    let hour = (rem / 3_600) as u8;
    let (y, m, d) = epoch_days_to_civil(days);
    (hour, format!("{y:04}-{m:02}-{d:02}"))
}

/// Inverse of Howard Hinnant's civil_from_days (UTC).
fn epoch_days_to_civil(z: i64) -> (i64, i64, i64) {
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
    (y, m, d)
}

fn stable_chat_id(thread_path: &str) -> i64 {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    thread_path.hash(&mut hasher);
    let h = hasher.finish() as i64;
    if h == 0 { 1 } else { h.abs() }
}

fn unique_senders(threads: &[ParsedThread]) -> Vec<String> {
    let mut set = BTreeSet::new();
    for t in threads {
        for m in &t.messages {
            set.insert(m.sender.clone());
        }
    }
    set.into_iter().collect()
}

fn suggest_me(profile: &Profile, senders: &[String]) -> Option<String> {
    if let Some(name) = profile.name.as_deref() {
        if senders.iter().any(|s| s == name) {
            return Some(name.to_string());
        }
    }
    if let Some(user) = profile.username.as_deref() {
        if senders.iter().any(|s| s == user) {
            return Some(user.to_string());
        }
    }
    None
}

fn resolve_me(
    me_name: Option<&str>,
    profile: &Profile,
    senders: &[String],
) -> Result<String, CoreError> {
    if let Some(explicit) = me_name.map(str::trim).filter(|s| !s.is_empty()) {
        if senders.iter().any(|s| s == explicit) {
            return Ok(explicit.to_string());
        }
        // Allow explicit pick even if they never sent (edge case).
        return Ok(explicit.to_string());
    }
    if let Some(suggested) = suggest_me(profile, senders) {
        return Ok(suggested);
    }
    Err(CoreError::Parse(
        "Could not determine which Instagram sender is you. Pick your name from the list.".into(),
    ))
}
