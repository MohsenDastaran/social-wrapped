//! LinkedIn complete data-export ZIP (CSV) parser.
//!
//! Expected fingerprints: `Profile.csv`, `Connections.csv`, `messages.csv`,
//! and engagement files often named `Reactions_<memberId>.csv`.
//!
//! Connections.csv starts with disclaimer rows before the real header.

use std::collections::{BTreeSet, HashMap};
use std::hash::{Hash, Hasher};
use std::io::{Cursor, Read};

use csv::ReaderBuilder;
use serde::{Deserialize, Serialize};
use zip::ZipArchive;

use crate::analytics::collectors::{
    extract_emojis, is_pure_emoji_text, text_has_url, tokenize_words, AnalysisEngine,
    ContentKind, HeatmapDay, MessageEvent, MessageKind, WrapAnalytics,
};
use crate::error::CoreError;
use crate::parsers::telegram::AnalyzeProgressPhase;

const TOP_SEARCH: usize = 25;
const TOP_JOBS: usize = 30;
const TOP_COMPANIES: usize = 25;

// ── Public types ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkedInPreview {
    pub display_name: String,
    pub headline: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggested_me: Option<String>,
    pub senders: Vec<String>,
    pub conversation_count: usize,
    pub message_count: u64,
    pub file_size_bytes: u64,
}

impl LinkedInPreview {
    pub fn to_json(&self) -> Result<String, CoreError> {
        serde_json::to_string(self).map_err(CoreError::from)
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkedInInsights {
    pub profile: LinkedInProfile,
    pub connection_count: u64,
    pub invitation_outgoing: u64,
    pub invitation_incoming: u64,
    pub active_follows: u64,
    pub unfollows: u64,
    pub company_follows: u64,
    pub top_connection_companies: Vec<LinkedInCounted>,
    pub connections_by_year: Vec<LinkedInYearCount>,
    pub reaction_counts_by_type: Vec<LinkedInCounted>,
    pub reactions_count: u64,
    pub comments_count: u64,
    pub shares_count: u64,
    pub saved_count: u64,
    pub votes_count: u64,
    pub reposts_count: u64,
    pub reaction_heatmap: Vec<HeatmapDay>,
    pub reaction_hourly: Vec<u64>,
    pub positions: Vec<LinkedInPosition>,
    pub skills: Vec<String>,
    pub endorsement_given_count: u64,
    pub endorsement_received_count: u64,
    pub recommendations_given_count: u64,
    pub recommendations_received_count: u64,
    pub job_application_count: u64,
    pub recent_job_applications: Vec<LinkedInJobApp>,
    pub top_search_queries: Vec<LinkedInCounted>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkedInProfile {
    pub first_name: String,
    pub last_name: String,
    pub headline: Option<String>,
    pub industry: Option<String>,
    pub geo_location: Option<String>,
}

impl LinkedInProfile {
    pub fn full_name(&self) -> String {
        format!("{} {}", self.first_name.trim(), self.last_name.trim())
            .trim()
            .to_string()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkedInCounted {
    pub name: String,
    pub count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkedInYearCount {
    pub year: i32,
    pub count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkedInPosition {
    pub company: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_on: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finished_on: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkedInJobApp {
    pub company: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub applied_on: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkedInAnalyzeResult {
    pub analytics: WrapAnalytics,
    pub linkedin_insights: LinkedInInsights,
}

impl LinkedInAnalyzeResult {
    pub fn to_json(&self) -> Result<String, CoreError> {
        serde_json::to_string(self).map_err(CoreError::from)
    }
}

// ── Internal parse models ─────────────────────────────────────────────────────

#[derive(Debug, Clone)]
struct ParsedMessage {
    sender: String,
    timestamp_secs: i64,
    hour: u8,
    date_str: String,
    body: String,
}

#[derive(Debug, Clone)]
struct ParsedConversation {
    conversation_id: String,
    title: String,
    messages: Vec<ParsedMessage>,
}

#[derive(Default)]
struct InsightsAcc {
    profile: LinkedInProfile,
    connections: u64,
    companies: HashMap<String, u64>,
    connections_by_year: HashMap<i32, u64>,
    invitation_outgoing: u64,
    invitation_incoming: u64,
    active_follows: u64,
    unfollows: u64,
    company_follows: u64,
    reaction_types: HashMap<String, u64>,
    reactions_count: u64,
    comments_count: u64,
    shares_count: u64,
    saved_count: u64,
    votes_count: u64,
    reposts_count: u64,
    reaction_day: HashMap<String, u64>,
    reaction_hourly: [u64; 24],
    positions: Vec<LinkedInPosition>,
    skills: Vec<String>,
    endorsement_given: u64,
    endorsement_received: u64,
    recommendations_given: u64,
    recommendations_received: u64,
    job_apps: Vec<LinkedInJobApp>,
    searches: HashMap<String, u64>,
}

impl InsightsAcc {
    fn finish(self) -> LinkedInInsights {
        let top_connection_companies = ranked_counts(self.companies, TOP_COMPANIES);
        let mut connections_by_year: Vec<LinkedInYearCount> = self
            .connections_by_year
            .into_iter()
            .map(|(year, count)| LinkedInYearCount { year, count })
            .collect();
        connections_by_year.sort_by_key(|y| y.year);

        let reaction_counts_by_type = ranked_counts(self.reaction_types, 20);
        let mut reaction_heatmap: Vec<HeatmapDay> = self
            .reaction_day
            .into_iter()
            .map(|(date, count)| HeatmapDay { date, count })
            .collect();
        reaction_heatmap.sort_by(|a, b| a.date.cmp(&b.date));

        let top_search_queries = ranked_counts(self.searches, TOP_SEARCH);
        let job_application_count = self.job_apps.len() as u64;
        let mut recent_job_applications = self.job_apps;
        recent_job_applications.truncate(TOP_JOBS);

        LinkedInInsights {
            profile: self.profile,
            connection_count: self.connections,
            invitation_outgoing: self.invitation_outgoing,
            invitation_incoming: self.invitation_incoming,
            active_follows: self.active_follows,
            unfollows: self.unfollows,
            company_follows: self.company_follows,
            top_connection_companies,
            connections_by_year,
            reaction_counts_by_type,
            reactions_count: self.reactions_count,
            comments_count: self.comments_count,
            shares_count: self.shares_count,
            saved_count: self.saved_count,
            votes_count: self.votes_count,
            reposts_count: self.reposts_count,
            reaction_heatmap,
            reaction_hourly: self.reaction_hourly.to_vec(),
            positions: self.positions,
            skills: self.skills,
            endorsement_given_count: self.endorsement_given,
            endorsement_received_count: self.endorsement_received,
            recommendations_given_count: self.recommendations_given,
            recommendations_received_count: self.recommendations_received,
            job_application_count,
            recent_job_applications,
            top_search_queries,
        }
    }
}

fn ranked_counts(map: HashMap<String, u64>, limit: usize) -> Vec<LinkedInCounted> {
    let mut out: Vec<LinkedInCounted> = map
        .into_iter()
        .map(|(name, count)| LinkedInCounted { name, count })
        .collect();
    out.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.name.cmp(&b.name)));
    out.truncate(limit);
    out
}

// ── Public API ────────────────────────────────────────────────────────────────

pub fn preview_export_bytes(bytes: &[u8]) -> Result<LinkedInPreview, CoreError> {
    let file_size_bytes = bytes.len() as u64;
    let (profile, conversations, _insights) = load_export(bytes, |_, _| {})?;
    let message_count: u64 = conversations.iter().map(|c| c.messages.len() as u64).sum();
    let senders = unique_senders(&conversations);
    let suggested_me = suggest_me(&profile, &senders);
    let display_name = {
        let n = profile.full_name();
        if n.is_empty() {
            "LinkedIn".to_string()
        } else {
            n
        }
    };

    Ok(LinkedInPreview {
        display_name,
        headline: profile.headline.clone(),
        suggested_me,
        senders,
        conversation_count: conversations.len(),
        message_count,
        file_size_bytes,
    })
}

pub fn analyze_export_bytes(
    bytes: &[u8],
    me_name: Option<&str>,
) -> Result<LinkedInAnalyzeResult, CoreError> {
    analyze_export_bytes_with_progress(bytes, me_name, |_, _, _| {})
}

pub fn analyze_export_bytes_with_progress<F>(
    bytes: &[u8],
    me_name: Option<&str>,
    mut on_progress: F,
) -> Result<LinkedInAnalyzeResult, CoreError>
where
    F: FnMut(AnalyzeProgressPhase, u64, u64),
{
    let total_bytes = bytes.len() as u64;
    on_progress(AnalyzeProgressPhase::Reading, 0, total_bytes.max(1));

    let (profile, conversations, mut insights) = load_export(bytes, |read, total| {
        on_progress(AnalyzeProgressPhase::Reading, read, total.max(1));
    })?;
    on_progress(
        AnalyzeProgressPhase::Reading,
        total_bytes.max(1),
        total_bytes.max(1),
    );

    let senders = unique_senders(&conversations);
    let me = resolve_me(me_name, &profile, &senders)?;

    let display_name = {
        let n = profile.full_name();
        if n.is_empty() {
            me.clone()
        } else {
            n
        }
    };
    let about = profile
        .headline
        .clone()
        .filter(|h| !h.is_empty())
        .unwrap_or_else(|| format!("{} conversations", conversations.len()));

    let mut engine = AnalysisEngine::new(display_name, None, about, total_bytes);

    let compute_total: u64 = conversations
        .iter()
        .map(|c| c.messages.len() as u64)
        .sum::<u64>()
        .max(1);
    let report_step = (compute_total / 200).max(1);
    let mut processed: u64 = 0;
    on_progress(AnalyzeProgressPhase::Computing, 0, compute_total);

    for conv in &conversations {
        let chat_id = stable_chat_id(&conv.conversation_id);
        let chat_name = if conv.title.trim().is_empty() {
            // Infer peer name from first non-me sender, else conversation id short
            conv.messages
                .iter()
                .find(|m| m.sender != me)
                .map(|m| m.sender.clone())
                .unwrap_or_else(|| short_id(&conv.conversation_id))
        } else {
            conv.title.clone()
        };

        let participant_names: BTreeSet<_> = conv.messages.iter().map(|m| m.sender.as_str()).collect();
        let is_group = participant_names.len() >= 3;

        for msg in &conv.messages {
            processed += 1;
            if processed == compute_total || processed % report_step == 0 {
                on_progress(
                    AnalyzeProgressPhase::Computing,
                    processed.min(compute_total),
                    compute_total,
                );
            }

            let is_mine = msg.sender == me;
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
                engine.add_sample(format!("{}: {snippet}", msg.sender));
            }
        }
    }

    on_progress(AnalyzeProgressPhase::Computing, compute_total, compute_total);

    // Ensure profile on insights matches
    insights.profile = profile;

    Ok(LinkedInAnalyzeResult {
        analytics: engine.finish(),
        linkedin_insights: insights,
    })
}

// ── ZIP load ──────────────────────────────────────────────────────────────────

fn load_export<F>(
    bytes: &[u8],
    mut on_read: F,
) -> Result<(LinkedInProfile, Vec<ParsedConversation>, LinkedInInsights), CoreError>
where
    F: FnMut(u64, u64),
{
    if !looks_like_zip(bytes) {
        return Err(CoreError::Parse(
            "LinkedIn import expects a ZIP of your complete data export.".into(),
        ));
    }

    let total = bytes.len() as u64;
    let cursor = Cursor::new(bytes);
    let mut archive = ZipArchive::new(cursor)?;
    let mut acc = InsightsAcc::default();
    let mut conversations: HashMap<String, ParsedConversation> = HashMap::new();
    let mut bytes_read: u64 = 0;
    let mut job_apps_all: Vec<LinkedInJobApp> = Vec::new();

    let entry_count = archive.len();
    for index in 0..entry_count {
        let mut file = archive.by_index(index)?;
        let name = file.name().to_string();
        if file.is_dir() {
            continue;
        }
        let lower = name.replace('\\', "/").to_ascii_lowercase();
        let kind = classify_csv_path(&lower);
        if kind.is_none() {
            continue;
        }
        let kind = kind.unwrap();

        let mut buf = Vec::new();
        file.read_to_end(&mut buf)?;
        bytes_read = bytes_read.saturating_add(buf.len() as u64);
        on_read(bytes_read.min(total), total.max(1));

        let text = String::from_utf8_lossy(&buf);
        match kind {
            CsvKind::Profile => parse_profile(&text, &mut acc),
            CsvKind::Connections => parse_connections(&text, &mut acc),
            CsvKind::Messages => parse_messages(&text, &mut conversations)?,
            CsvKind::Invitations => parse_invitations(&text, &mut acc),
            CsvKind::MemberFollows => parse_member_follows(&text, &mut acc),
            CsvKind::CompanyFollows => parse_company_follows(&text, &mut acc),
            CsvKind::Reactions => parse_reactions(&text, &mut acc),
            CsvKind::Comments => parse_comments(&text, &mut acc),
            CsvKind::Shares => parse_shares(&text, &mut acc),
            CsvKind::InstantReposts => parse_simple_count(&text, &mut acc.reposts_count),
            CsvKind::Votes => parse_simple_count(&text, &mut acc.votes_count),
            CsvKind::SavedItems => parse_simple_count(&text, &mut acc.saved_count),
            CsvKind::Positions => parse_positions(&text, &mut acc),
            CsvKind::Skills => parse_skills(&text, &mut acc),
            CsvKind::EndorsementGiven => {
                acc.endorsement_given = csv_data_row_count(&text)
            }
            CsvKind::EndorsementReceived => {
                acc.endorsement_received = csv_data_row_count(&text)
            }
            CsvKind::RecommendationsGiven => {
                acc.recommendations_given = csv_data_row_count(&text)
            }
            CsvKind::RecommendationsReceived => {
                acc.recommendations_received = csv_data_row_count(&text)
            }
            CsvKind::JobApplications => parse_job_applications(&text, &mut job_apps_all),
            CsvKind::SearchQueries => parse_search_queries(&text, &mut acc),
        }
    }

    acc.job_apps = job_apps_all;

    let profile = acc.profile.clone();
    let insights = acc.finish();

    let mut convs: Vec<ParsedConversation> = conversations.into_values().collect();
    for c in &mut convs {
        c.messages.sort_by_key(|m| m.timestamp_secs);
    }
    convs.sort_by(|a, b| a.conversation_id.cmp(&b.conversation_id));

    if profile.full_name().is_empty()
        && convs.is_empty()
        && insights.connection_count == 0
        && insights.reactions_count == 0
    {
        return Err(CoreError::Parse(
            "No LinkedIn Profile, Connections, or messages found. Upload a Complete LinkedIn Data Export ZIP.".into(),
        ));
    }

    let _ = entry_count;
    Ok((profile, convs, insights))
}

#[derive(Clone, Copy)]
enum CsvKind {
    Profile,
    Connections,
    Messages,
    Invitations,
    MemberFollows,
    CompanyFollows,
    Reactions,
    Comments,
    Shares,
    InstantReposts,
    Votes,
    SavedItems,
    Positions,
    Skills,
    EndorsementGiven,
    EndorsementReceived,
    RecommendationsGiven,
    RecommendationsReceived,
    JobApplications,
    SearchQueries,
}

fn classify_csv_path(lower: &str) -> Option<CsvKind> {
    let base = lower.rsplit('/').next().unwrap_or(lower);
    if !base.ends_with(".csv") {
        return None;
    }

    // Exact / known names
    if base == "profile.csv" {
        return Some(CsvKind::Profile);
    }
    if base == "connections.csv" {
        return Some(CsvKind::Connections);
    }
    if base == "messages.csv" {
        return Some(CsvKind::Messages);
    }
    if base == "invitations.csv" {
        return Some(CsvKind::Invitations);
    }
    if base == "company follows.csv" {
        return Some(CsvKind::CompanyFollows);
    }
    if base == "positions.csv" {
        return Some(CsvKind::Positions);
    }
    if base == "skills.csv" {
        return Some(CsvKind::Skills);
    }
    if base == "endorsement_given_info.csv" {
        return Some(CsvKind::EndorsementGiven);
    }
    if base == "endorsement_received_info.csv" {
        return Some(CsvKind::EndorsementReceived);
    }
    if base == "recommendations_given.csv" {
        return Some(CsvKind::RecommendationsGiven);
    }
    if base == "recommendations_received.csv" {
        return Some(CsvKind::RecommendationsReceived);
    }
    if base == "searchqueries.csv" {
        return Some(CsvKind::SearchQueries);
    }
    if base == "job applications.csv" || lower.ends_with("/jobs/job applications.csv") {
        return Some(CsvKind::JobApplications);
    }

    // Prefixed with optional member id: Reactions_123.csv
    let stem = base.trim_end_matches(".csv");
    let stem_norm = strip_member_suffix(stem);
    match stem_norm.as_str() {
        "reactions" => Some(CsvKind::Reactions),
        "comments" => Some(CsvKind::Comments),
        "shares" => Some(CsvKind::Shares),
        "instantreposts" => Some(CsvKind::InstantReposts),
        "votes" => Some(CsvKind::Votes),
        "saved_items" | "saveditems" => Some(CsvKind::SavedItems),
        "member_follows" | "memberfollows" => Some(CsvKind::MemberFollows),
        _ => None,
    }
}

/// `Reactions_717984257` → `reactions`
fn strip_member_suffix(stem: &str) -> String {
    let lower = stem.to_ascii_lowercase();
    // Drop trailing _digits
    if let Some((head, tail)) = lower.rsplit_once('_') {
        if !tail.is_empty() && tail.chars().all(|c| c.is_ascii_digit()) {
            return head.to_string();
        }
    }
    lower
}

// ── CSV parsers ───────────────────────────────────────────────────────────────

fn parse_profile(text: &str, acc: &mut InsightsAcc) {
    let mut rdr = ReaderBuilder::new()
        .flexible(true)
        .from_reader(text.as_bytes());
    let Ok(headers) = rdr.headers().map(|h| h.clone()) else {
        return;
    };
    for record in rdr.records().flatten() {
        let get = |name: &str| field_by_header(&headers, &record, name);
        acc.profile.first_name = get("First Name").unwrap_or_default();
        acc.profile.last_name = get("Last Name").unwrap_or_default();
        acc.profile.headline = nonempty(get("Headline"));
        acc.profile.industry = nonempty(get("Industry"));
        acc.profile.geo_location = nonempty(get("Geo Location"));
        break;
    }
}

fn parse_connections(text: &str, acc: &mut InsightsAcc) {
    let Some(csv_body) = skip_to_header(text, "First Name,") else {
        return;
    };
    let mut rdr = ReaderBuilder::new()
        .flexible(true)
        .from_reader(csv_body.as_bytes());
    let Ok(headers) = rdr.headers().map(|h| h.clone()) else {
        return;
    };
    for record in rdr.records().flatten() {
        let get = |name: &str| field_by_header(&headers, &record, name);
        let first = get("First Name").unwrap_or_default();
        let last = get("Last Name").unwrap_or_default();
        if first.is_empty() && last.is_empty() {
            continue;
        }
        acc.connections += 1;
        if let Some(company) = nonempty(get("Company")) {
            *acc.companies.entry(company).or_insert(0) += 1;
        }
        if let Some(connected) = get("Connected On") {
            if let Some(year) = parse_year_only(&connected) {
                *acc.connections_by_year.entry(year).or_insert(0) += 1;
            }
        }
    }
}

fn parse_messages(
    text: &str,
    conversations: &mut HashMap<String, ParsedConversation>,
) -> Result<(), CoreError> {
    let mut rdr = ReaderBuilder::new()
        .flexible(true)
        .from_reader(text.as_bytes());
    let headers = rdr
        .headers()
        .map(|h| h.clone())
        .map_err(|e| CoreError::Parse(format!("messages.csv headers: {e}")))?;

    for record in rdr.records() {
        let record = match record {
            Ok(r) => r,
            Err(_) => continue,
        };
        let get = |name: &str| field_by_header(&headers, &record, name);
        let conv_id = get("CONVERSATION ID").unwrap_or_default();
        if conv_id.is_empty() {
            continue;
        }
        let from = get("FROM").unwrap_or_default();
        if from.is_empty() {
            continue;
        }
        let date = get("DATE").unwrap_or_default();
        let Some((secs, hour, date_str)) = parse_datetime(&date) else {
            continue;
        };
        let title = get("CONVERSATION TITLE").unwrap_or_default();
        let content = get("CONTENT").unwrap_or_default();

        let entry = conversations
            .entry(conv_id.clone())
            .or_insert_with(|| ParsedConversation {
                conversation_id: conv_id.clone(),
                title: title.clone(),
                messages: Vec::new(),
            });
        if entry.title.is_empty() && !title.is_empty() {
            entry.title = title;
        }
        entry.messages.push(ParsedMessage {
            sender: from,
            timestamp_secs: secs,
            hour,
            date_str,
            body: content,
        });
    }
    Ok(())
}

fn parse_invitations(text: &str, acc: &mut InsightsAcc) {
    let mut rdr = ReaderBuilder::new()
        .flexible(true)
        .from_reader(text.as_bytes());
    let Ok(headers) = rdr.headers().map(|h| h.clone()) else {
        return;
    };
    for record in rdr.records().flatten() {
        let dir = field_by_header(&headers, &record, "Direction")
            .unwrap_or_default()
            .to_ascii_uppercase();
        if dir == "OUTGOING" {
            acc.invitation_outgoing += 1;
        } else if dir == "INCOMING" {
            acc.invitation_incoming += 1;
        }
    }
}

fn parse_member_follows(text: &str, acc: &mut InsightsAcc) {
    let mut rdr = ReaderBuilder::new()
        .flexible(true)
        .from_reader(text.as_bytes());
    let Ok(headers) = rdr.headers().map(|h| h.clone()) else {
        return;
    };
    for record in rdr.records().flatten() {
        let status = field_by_header(&headers, &record, "Status")
            .unwrap_or_default()
            .to_ascii_lowercase();
        if status == "active" {
            acc.active_follows += 1;
        } else if status == "unfollow" {
            acc.unfollows += 1;
        }
    }
}

fn parse_company_follows(text: &str, acc: &mut InsightsAcc) {
    acc.company_follows = csv_data_row_count(text);
}

fn parse_reactions(text: &str, acc: &mut InsightsAcc) {
    let mut rdr = ReaderBuilder::new()
        .flexible(true)
        .from_reader(text.as_bytes());
    let Ok(headers) = rdr.headers().map(|h| h.clone()) else {
        return;
    };
    for record in rdr.records().flatten() {
        let get = |name: &str| field_by_header(&headers, &record, name);
        let date = get("Date").unwrap_or_default();
        let typ = get("Type").unwrap_or_else(|| "LIKE".into());
        acc.reactions_count += 1;
        *acc.reaction_types.entry(typ).or_insert(0) += 1;
        if let Some((secs, hour, date_str)) = parse_datetime(&date) {
            let _ = secs;
            if (hour as usize) < 24 {
                acc.reaction_hourly[hour as usize] =
                    acc.reaction_hourly[hour as usize].saturating_add(1);
            }
            *acc.reaction_day.entry(date_str).or_insert(0) += 1;
        }
    }
}

fn parse_comments(text: &str, acc: &mut InsightsAcc) {
    acc.comments_count = csv_data_row_count(text);
}

fn parse_shares(text: &str, acc: &mut InsightsAcc) {
    acc.shares_count = csv_data_row_count(text);
}

fn parse_simple_count(text: &str, counter: &mut u64) {
    *counter = csv_data_row_count(text);
}

fn parse_positions(text: &str, acc: &mut InsightsAcc) {
    let mut rdr = ReaderBuilder::new()
        .flexible(true)
        .from_reader(text.as_bytes());
    let Ok(headers) = rdr.headers().map(|h| h.clone()) else {
        return;
    };
    for record in rdr.records().flatten() {
        let get = |name: &str| field_by_header(&headers, &record, name);
        let company = get("Company Name").unwrap_or_default();
        let title = get("Title").unwrap_or_default();
        if company.is_empty() && title.is_empty() {
            continue;
        }
        acc.positions.push(LinkedInPosition {
            company,
            title,
            location: nonempty(get("Location")),
            started_on: nonempty(get("Started On")),
            finished_on: nonempty(get("Finished On")),
        });
    }
}

fn parse_skills(text: &str, acc: &mut InsightsAcc) {
    let mut rdr = ReaderBuilder::new()
        .flexible(true)
        .from_reader(text.as_bytes());
    for record in rdr.records().flatten() {
        if let Some(name) = record.get(0).map(str::trim).filter(|s| !s.is_empty()) {
            if name.eq_ignore_ascii_case("Name") {
                continue;
            }
            acc.skills.push(name.to_string());
        }
    }
}

fn parse_job_applications(text: &str, out: &mut Vec<LinkedInJobApp>) {
    let mut rdr = ReaderBuilder::new()
        .flexible(true)
        .from_reader(text.as_bytes());
    let Ok(headers) = rdr.headers().map(|h| h.clone()) else {
        return;
    };
    for record in rdr.records().flatten() {
        let get = |name: &str| field_by_header(&headers, &record, name);
        let company = get("Company Name").unwrap_or_default();
        let title = get("Job Title").unwrap_or_default();
        if company.is_empty() && title.is_empty() {
            continue;
        }
        out.push(LinkedInJobApp {
            company,
            title,
            applied_on: nonempty(get("Application Date")),
        });
    }
}

fn parse_search_queries(text: &str, acc: &mut InsightsAcc) {
    let mut rdr = ReaderBuilder::new()
        .flexible(true)
        .from_reader(text.as_bytes());
    let Ok(headers) = rdr.headers().map(|h| h.clone()) else {
        return;
    };
    for record in rdr.records().flatten() {
        if let Some(q) = field_by_header(&headers, &record, "Search Query") {
            let key = q.trim().to_lowercase();
            if key.is_empty() {
                continue;
            }
            *acc.searches.entry(key).or_insert(0) += 1;
        }
    }
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

fn skip_to_header<'a>(text: &'a str, header_prefix: &str) -> Option<&'a str> {
    let mut offset = 0;
    for line in text.split_inclusive('\n') {
        if line.trim_start().starts_with(header_prefix) {
            return Some(&text[offset..]);
        }
        offset += line.len();
    }
    None
}

fn field_by_header(
    headers: &csv::StringRecord,
    record: &csv::StringRecord,
    name: &str,
) -> Option<String> {
    for (i, h) in headers.iter().enumerate() {
        if h.trim().eq_ignore_ascii_case(name) {
            return record.get(i).map(|s| s.trim().to_string());
        }
    }
    None
}

fn nonempty(v: Option<String>) -> Option<String> {
    v.filter(|s| !s.is_empty())
}

fn csv_data_row_count(text: &str) -> u64 {
    let mut rdr = ReaderBuilder::new()
        .flexible(true)
        .from_reader(text.as_bytes());
    rdr.records().flatten().count() as u64
}

// ── Date parsing ──────────────────────────────────────────────────────────────

fn parse_datetime(raw: &str) -> Option<(i64, u8, String)> {
    let s = raw.trim();
    if s.is_empty() {
        return None;
    }

    // 2026-08-02 22:23:33 UTC
    if let Some(caps) = match_ymd_hms(s) {
        return Some(caps);
    }
    // 2025/11/12 18:45:35 UTC  or 2025/11/24 12:21:05 UTC
    if let Some(caps) = match_ymd_slash_hms(s) {
        return Some(caps);
    }
    // Fri May 22 21:38:08 UTC 2026
    if let Some(caps) = match_ctime(s) {
        return Some(caps);
    }
    // 03 Aug 2026
    if let Some(caps) = match_dmy_text(s) {
        return Some(caps);
    }
    // 8/2/26, 10:14 PM  or 05/09/24, 04:16 PM  or 7/24/22, 10:39 AM
    if let Some(caps) = match_us_datetime(s) {
        return Some(caps);
    }

    None
}

fn parse_year_only(raw: &str) -> Option<i32> {
    if let Some((_, _, date)) = parse_datetime(raw) {
        return date.get(0..4)?.parse().ok();
    }
    // trailing year
    let trimmed = raw.trim();
    if trimmed.len() >= 4 {
        let tail = &trimmed[trimmed.len() - 4..];
        if tail.chars().all(|c| c.is_ascii_digit()) {
            return tail.parse().ok();
        }
    }
    None
}

fn match_ymd_hms(s: &str) -> Option<(i64, u8, String)> {
    // YYYY-MM-DD HH:MM:SS optional timezone
    let parts: Vec<&str> = s.split_whitespace().collect();
    if parts.len() < 2 {
        return None;
    }
    let date = parts[0];
    let time = parts[1];
    let (y, m, d) = parse_ymd_dash(date)?;
    let (hh, mm, ss) = parse_hms(time)?;
    let secs = civil_to_epoch(y, m, d, hh, mm, ss)?;
    Some((secs, hh as u8, format!("{y:04}-{m:02}-{d:02}")))
}

fn match_ymd_slash_hms(s: &str) -> Option<(i64, u8, String)> {
    let parts: Vec<&str> = s.split_whitespace().collect();
    if parts.len() < 2 {
        return None;
    }
    let date = parts[0];
    let time = parts[1];
    let segs: Vec<&str> = date.split('/').collect();
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

fn match_ctime(s: &str) -> Option<(i64, u8, String)> {
    // Fri May 22 21:38:08 UTC 2026
    let parts: Vec<&str> = s.split_whitespace().collect();
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

fn match_dmy_text(s: &str) -> Option<(i64, u8, String)> {
    // 03 Aug 2026
    let parts: Vec<&str> = s.split_whitespace().collect();
    if parts.len() != 3 {
        return None;
    }
    let d: i32 = parts[0].parse().ok()?;
    let mon = month_num(parts[1])?;
    let y: i32 = parts[2].parse().ok()?;
    let secs = civil_to_epoch(y, mon, d, 12, 0, 0)?;
    Some((secs, 12, format!("{y:04}-{mon:02}-{d:02}")))
}

fn match_us_datetime(s: &str) -> Option<(i64, u8, String)> {
    // 8/2/26, 10:14 PM
    let cleaned = s.replace(',', " ");
    let parts: Vec<&str> = cleaned.split_whitespace().collect();
    if parts.len() < 2 {
        return None;
    }
    let date = parts[0];
    let time = parts[1];
    let ampm = parts.get(2).copied().unwrap_or("");
    let segs: Vec<&str> = date.split('/').collect();
    if segs.len() != 3 {
        return None;
    }
    let month: i32 = segs[0].parse().ok()?;
    let day: i32 = segs[1].parse().ok()?;
    let mut year: i32 = segs[2].parse().ok()?;
    if year < 100 {
        year += 2000;
    }
    let (mut hh, mm, ss) = parse_hms_flexible(time)?;
    let ap = ampm.to_ascii_uppercase();
    if ap == "PM" && hh < 12 {
        hh += 12;
    } else if ap == "AM" && hh == 12 {
        hh = 0;
    }
    let secs = civil_to_epoch(year, month, day, hh, mm, ss)?;
    Some((secs, hh as u8, format!("{year:04}-{month:02}-{day:02}")))
}

fn parse_ymd_dash(date: &str) -> Option<(i32, i32, i32)> {
    let segs: Vec<&str> = date.split('-').collect();
    if segs.len() != 3 {
        return None;
    }
    Some((segs[0].parse().ok()?, segs[1].parse().ok()?, segs[2].parse().ok()?))
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

fn parse_hms_flexible(time: &str) -> Option<(i32, i32, i32)> {
    parse_hms(time)
}

fn month_num(name: &str) -> Option<i32> {
    match &name[..name.len().min(3)].to_ascii_lowercase()[..] {
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

/// Howard Hinnant's days_from_civil.
fn civil_to_epoch_days(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = if m > 2 { m - 3 } else { m + 9 };
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
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

fn short_id(id: &str) -> String {
    let s: String = id.chars().take(12).collect();
    if s.is_empty() {
        "Conversation".into()
    } else {
        s
    }
}

fn unique_senders(conversations: &[ParsedConversation]) -> Vec<String> {
    let mut set = BTreeSet::new();
    for c in conversations {
        for m in &c.messages {
            set.insert(m.sender.clone());
        }
    }
    set.into_iter().collect()
}

fn suggest_me(profile: &LinkedInProfile, senders: &[String]) -> Option<String> {
    let full = profile.full_name();
    if full.is_empty() {
        return None;
    }
    if senders.iter().any(|s| s == &full) {
        return Some(full);
    }
    // Case-insensitive match
    let lower = full.to_ascii_lowercase();
    senders
        .iter()
        .find(|s| s.to_ascii_lowercase() == lower)
        .cloned()
}

fn resolve_me(
    me_name: Option<&str>,
    profile: &LinkedInProfile,
    senders: &[String],
) -> Result<String, CoreError> {
    if let Some(name) = me_name.map(str::trim).filter(|s| !s.is_empty()) {
        return Ok(name.to_string());
    }
    if let Some(suggested) = suggest_me(profile, senders) {
        return Ok(suggested);
    }
    let full = profile.full_name();
    if !full.is_empty() {
        return Ok(full);
    }
    if senders.len() == 1 {
        return Ok(senders[0].clone());
    }
    if senders.is_empty() {
        return Ok("You".into());
    }
    Err(CoreError::Parse(
        "Could not determine which LinkedIn sender is you. Pick your name and try again.".into(),
    ))
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
    fn parses_profile_messages_and_connections() {
        let profile = concat!(
            "First Name,Last Name,Maiden Name,Address,Birth Date,Headline,Summary,Industry,Zip Code,Geo Location,Twitter Handles,Websites,Instant Messengers\n",
            "Ada,Lovelace,,,,\"Frontend Engineer\",,Software,,,,,\n",
        );
        let connections = concat!(
            "Notes:\n",
            "\"disclaimer\"\n",
            "\n",
            "First Name,Last Name,URL,Email Address,Company,Position,Connected On\n",
            "Bob,Builder,https://www.linkedin.com/in/bob,,Acme,Dev,03 Aug 2024\n",
            "Carol,Dev,https://www.linkedin.com/in/carol,,Acme,PM,15 Jan 2025\n",
        );
        let messages = concat!(
            "\"CONVERSATION ID\",\"CONVERSATION TITLE\",\"FROM\",\"SENDER PROFILE URL\",\"TO\",\"RECIPIENT PROFILE URLS\",\"DATE\",\"SUBJECT\",\"CONTENT\",\"FOLDER\",\"ATTACHMENTS\"\n",
            "\"c1\",\"\",\"Ada Lovelace\",\"https://linkedin.com/in/ada\",\"Bob Builder\",\"https://linkedin.com/in/bob\",\"2024-08-03 10:00:00 UTC\",\"\",\"Hello Bob\",\"INBOX\",\"\"\n",
            "\"c1\",\"\",\"Bob Builder\",\"https://linkedin.com/in/bob\",\"Ada Lovelace\",\"https://linkedin.com/in/ada\",\"2024-08-03 11:00:00 UTC\",\"\",\"Hi Ada\",\"INBOX\",\"\"\n",
        );
        let reactions = concat!(
            "Date,Type,Link\n",
            "2024-08-03 12:00:00 UTC,LIKE,https://linkedin.com/feed\n",
            "2024-08-04 13:00:00 UTC,PRAISE,https://linkedin.com/feed\n",
        );

        let bytes = zip_with(&[
            ("Profile.csv", profile),
            ("Connections.csv", connections),
            ("messages.csv", messages),
            ("Reactions_99.csv", reactions),
        ]);

        let preview = preview_export_bytes(&bytes).unwrap();
        assert_eq!(preview.display_name, "Ada Lovelace");
        assert_eq!(preview.message_count, 2);
        assert_eq!(preview.suggested_me.as_deref(), Some("Ada Lovelace"));

        let result = analyze_export_bytes(&bytes, Some("Ada Lovelace")).unwrap();
        assert_eq!(result.linkedin_insights.connection_count, 2);
        assert_eq!(result.linkedin_insights.reactions_count, 2);
        assert!(result.analytics.account.total_messages >= 2);
        assert_eq!(
            result.linkedin_insights.top_connection_companies[0].name,
            "Acme"
        );
    }

    #[test]
    fn strip_member_suffix_works() {
        assert_eq!(strip_member_suffix("Reactions_717984257"), "reactions");
        assert_eq!(strip_member_suffix("Saved_Items_1"), "saved_items");
        assert_eq!(strip_member_suffix("messages"), "messages");
    }

    #[test]
    fn parses_varied_dates() {
        let a = parse_datetime("2026-08-02 22:23:33 UTC").unwrap();
        assert_eq!(a.2, "2026-08-02");
        assert_eq!(a.1, 22);

        let b = parse_datetime("03 Aug 2026").unwrap();
        assert_eq!(b.2, "2026-08-03");

        let c = parse_datetime("8/2/26, 10:14 PM").unwrap();
        assert_eq!(c.2, "2026-08-02");
        assert_eq!(c.1, 22);

        let d = parse_datetime("Fri May 22 21:38:08 UTC 2026").unwrap();
        assert_eq!(d.2, "2026-05-22");

        let e = parse_datetime("2025/11/12 18:45:35 UTC").unwrap();
        assert_eq!(e.2, "2025-11-12");
    }

    /// Manual check against a local Complete LinkedIn Data Export ZIP.
    /// `LINKEDIN_EXPORT_ZIP=/path/to/export.zip cargo test -p app-core analyze_real_export -- --ignored --nocapture`
    #[test]
    #[ignore]
    fn analyze_real_export() {
        let path = std::env::var("LINKEDIN_EXPORT_ZIP").expect(
            "Set LINKEDIN_EXPORT_ZIP to a Complete LinkedIn Data Export ZIP path",
        );
        let bytes = std::fs::read(&path).unwrap_or_else(|e| panic!("read {path}: {e}"));
        let preview = preview_export_bytes(&bytes).expect("preview");
        println!(
            "preview: name={} msgs={} convs={} suggested={:?}",
            preview.display_name,
            preview.message_count,
            preview.conversation_count,
            preview.suggested_me
        );
        let me = preview.suggested_me.clone();
        let result = analyze_export_bytes(&bytes, me.as_deref()).expect("analyze");
        let i = &result.linkedin_insights;
        println!(
            "insights: connections={} reactions={} comments={} shares={} jobs={} searches={}",
            i.connection_count,
            i.reactions_count,
            i.comments_count,
            i.shares_count,
            i.job_application_count,
            i.top_search_queries.len()
        );
        println!(
            "analytics: chats={} total_msgs={}",
            result.analytics.chat_count, result.analytics.account.total_messages
        );
        assert!(!preview.display_name.is_empty());
        assert!(i.connection_count > 0 || preview.message_count > 0);
    }
}
