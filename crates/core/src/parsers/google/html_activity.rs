//! Shared HTML scraper for Google Takeout My Activity / YouTube history pages.

use std::sync::LazyLock;

use regex::Regex;

use super::series::{utc_hour_and_date, EventSeries};

static BODY_CELL: LazyLock<Regex> = LazyLock::new(|| {
    // Primary activity cell — not caption ("Why is this here?") and not empty right column.
    Regex::new(
        r#"(?is)<div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">(.*?)</div>"#,
    )
    .unwrap()
});
static HREF: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"(?is)<a\s+href="([^"]+)"[^>]*>(.*?)</a>"#).unwrap());
static BR_SPLIT: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?i)<br\s*/?>").unwrap());
static TAG: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?is)<[^>]+>").unwrap());

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActivityKindFilter {
    /// Keep all non-ad activity rows.
    All,
    /// Only rows that start with "Watched".
    Watched,
    /// Only rows that start with "Searched for".
    Searched,
}

#[derive(Debug, Clone)]
pub struct ActivityEntry {
    pub title: String,
    pub href: Option<String>,
    pub secondary: Option<String>,
    #[allow(dead_code)]
    pub timestamp_secs: Option<i64>,
    pub hour: Option<u8>,
    pub date: Option<String>,
}

/// Parse MDL activity HTML (skips Google Ads + caption noise).
pub fn parse_activity_html(html: &str) -> Vec<ActivityEntry> {
    parse_activity_html_filtered(html, true, ActivityKindFilter::All)
}

pub fn parse_activity_html_filtered(
    html: &str,
    skip_ads: bool,
    kind: ActivityKindFilter,
) -> Vec<ActivityEntry> {
    let mut out = Vec::new();
    let cards = split_outer_cells(html);

    if cards.is_empty() {
        return parse_legacy_content_cells(html, skip_ads, kind);
    }

    for card in cards {
        if skip_ads && is_google_ad_card(card) {
            continue;
        }
        let Some(body) = BODY_CELL
            .captures(card)
            .and_then(|c| c.get(1).map(|m| m.as_str()))
        else {
            continue;
        };
        if let Some(entry) = parse_body_cell(body, kind) {
            out.push(entry);
        }
    }
    out
}

fn split_outer_cells(html: &str) -> Vec<&str> {
    const MARKER: &str = r#"class="outer-cell"#;
    let mut starts: Vec<usize> = Vec::new();
    let mut search_from = 0;
    while let Some(rel) = html[search_from..].find(MARKER) {
        let marker_at = search_from + rel;
        let head = html[..marker_at].rfind("<div").unwrap_or(marker_at);
        starts.push(head);
        search_from = marker_at + MARKER.len();
    }
    if starts.is_empty() {
        return Vec::new();
    }
    let mut cards = Vec::with_capacity(starts.len());
    for i in 0..starts.len() {
        let end = starts.get(i + 1).copied().unwrap_or(html.len());
        cards.push(&html[starts[i]..end]);
    }
    cards
}

fn parse_legacy_content_cells(
    html: &str,
    skip_ads: bool,
    kind: ActivityKindFilter,
) -> Vec<ActivityEntry> {
    static CONTENT_CELL: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r#"(?is)<div class="content-cell[^"]*"[^>]*>(.*?)</div>"#).unwrap()
    });
    let mut out = Vec::new();
    for cap in CONTENT_CELL.captures_iter(html) {
        let body = cap.get(1).map(|m| m.as_str()).unwrap_or("");
        if body.contains("Why is this here?") || body.contains("<b>Products:</b>") {
            continue;
        }
        if skip_ads && body.contains("From Google Ads") {
            continue;
        }
        if let Some(entry) = parse_body_cell(body, kind) {
            out.push(entry);
        }
    }
    out
}

fn is_google_ad_card(card: &str) -> bool {
    card.contains("From Google Ads")
}

fn parse_body_cell(body: &str, kind: ActivityKindFilter) -> Option<ActivityEntry> {
    let plain_prefix = strip_tags(body);
    // Drop caption / settings noise if it leaked in.
    if plain_prefix.contains("Why is this here?") || plain_prefix.starts_with("Products:") {
        return None;
    }

    match kind {
        ActivityKindFilter::Watched => {
            if !plain_prefix.starts_with("Watched") {
                return None;
            }
        }
        ActivityKindFilter::Searched => {
            if !plain_prefix.starts_with("Searched for") {
                return None;
            }
        }
        ActivityKindFilter::All => {}
    }

    let links: Vec<(String, String)> = HREF
        .captures_iter(body)
        .filter_map(|c| {
            let href = c.get(1)?.as_str().to_string();
            let text = strip_tags(c.get(2)?.as_str());
            // Ignore account-settings “here” links.
            if href.contains("myaccount.google.com/activitycontrols") {
                return None;
            }
            if text.eq_ignore_ascii_case("here") {
                return None;
            }
            Some((href, text))
        })
        .collect();

    let parts: Vec<String> = BR_SPLIT
        .split(body)
        .map(strip_tags)
        .filter(|s| !s.is_empty())
        .collect();

    let timestamp_raw = parts
        .iter()
        .rev()
        .find(|p| looks_like_timestamp(p))
        .cloned();

    let (timestamp_secs, hour, date) =
        match timestamp_raw.as_deref().and_then(parse_takeout_datetime) {
            Some(secs) => {
                let (h, d) = utc_hour_and_date(secs);
                (Some(secs), Some(h), Some(d))
            }
            None => (None, None, None),
        };

    let title = if kind == ActivityKindFilter::Searched {
        let raw = parts
            .iter()
            .find(|p| p.starts_with("Searched for"))
            .cloned()
            .or_else(|| links.first().map(|(_, t)| format!("Searched for {t}")))
            .unwrap_or_default();
        raw.strip_prefix("Searched for ")
            .unwrap_or(&raw)
            .trim()
            .to_string()
    } else if let Some((_, text)) = links.first() {
        text.clone()
    } else {
        parts
            .iter()
            .find(|p| !looks_like_timestamp(p) && !p.starts_with("Watched at"))
            .map(|p| {
                p.strip_prefix("Watched ")
                    .unwrap_or(p)
                    .trim()
                    .to_string()
            })
            .unwrap_or_default()
    };

    let href = links.first().map(|(h, _)| h.clone());
    let secondary = links.get(1).map(|(_, t)| t.clone());

    if title.is_empty() && href.is_none() {
        return None;
    }

    Some(ActivityEntry {
        title,
        href,
        secondary,
        timestamp_secs,
        hour,
        date,
    })
}

pub fn feed_entries(series: &mut EventSeries, entries: &[ActivityEntry]) {
    for e in entries {
        if let (Some(h), Some(d)) = (e.hour, e.date.as_deref()) {
            series.push(h, d);
        }
    }
}

fn strip_tags(s: &str) -> String {
    let no_tags = TAG.replace_all(s, "");
    decode_entities(&no_tags)
        .replace('\u{00a0}', " ")
        .replace('\u{202f}', " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn decode_entities(s: &str) -> String {
    s.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
}

fn looks_like_timestamp(s: &str) -> bool {
    // "Aug 3, 2026, 3:20:50 PM CEST" or similar
    let has_year = s.contains("20") && s.chars().filter(|c| c.is_ascii_digit()).count() >= 4;
    let has_month = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]
    .iter()
    .any(|m| s.contains(m));
    has_year && has_month
}

/// Parse Takeout local datetime strings → approximate UTC epoch seconds.
pub fn parse_takeout_datetime(s: &str) -> Option<i64> {
    let cleaned = s
        .replace('\u{202f}', " ")
        .replace('\u{00a0}', " ")
        .replace(',', " ");
    let parts: Vec<&str> = cleaned.split_whitespace().collect();
    // Expected: Mon D YYYY H:MM:SS AM/PM TZ  (7+ tokens) OR Mon D YYYY H:MM:SS TZ
    if parts.len() < 5 {
        return None;
    }
    let month = month_num(parts[0])?;
    let day: i64 = parts[1].parse().ok()?;
    let year: i64 = parts[2].parse().ok()?;

    let (hour24, minute, second, tz_idx) = if parts.len() >= 6
        && (parts[4].eq_ignore_ascii_case("AM") || parts[4].eq_ignore_ascii_case("PM"))
    {
        let (h, m, sec) = parse_hms(parts[3])?;
        let mut hour = h % 12;
        if parts[4].eq_ignore_ascii_case("PM") {
            hour += 12;
        }
        (hour, m, sec, 5)
    } else {
        let (h, m, sec) = parse_hms(parts[3])?;
        (h, m, sec, 4)
    };

    let tz = parts.get(tz_idx).copied().unwrap_or("UTC");
    let offset = tz_offset_hours(tz);

    let days = civil_to_epoch_days(year, month, day)?;
    let local_secs = days * 86_400 + hour24 * 3_600 + minute * 60 + second;
    Some(local_secs - offset * 3_600)
}

fn parse_hms(s: &str) -> Option<(i64, i64, i64)> {
    let bits: Vec<&str> = s.split(':').collect();
    if bits.len() < 2 {
        return None;
    }
    let h: i64 = bits[0].parse().ok()?;
    let m: i64 = bits[1].parse().ok()?;
    let sec: i64 = if bits.len() >= 3 {
        bits[2].parse().unwrap_or(0)
    } else {
        0
    };
    Some((h, m, sec))
}

fn month_num(s: &str) -> Option<i64> {
    let prefix: String = s.chars().take(3).collect();
    match prefix.as_str() {
        "Jan" => Some(1),
        "Feb" => Some(2),
        "Mar" => Some(3),
        "Apr" => Some(4),
        "May" => Some(5),
        "Jun" => Some(6),
        "Jul" => Some(7),
        "Aug" => Some(8),
        "Sep" => Some(9),
        "Oct" => Some(10),
        "Nov" => Some(11),
        "Dec" => Some(12),
        _ => None,
    }
}

fn tz_offset_hours(tz: &str) -> i64 {
    match tz.to_ascii_uppercase().as_str() {
        "UTC" | "GMT" | "Z" => 0,
        "CET" | "WAT" => 1,
        "CEST" | "EET" | "IST" => 2, // IST ambiguous; Iran often IRST
        "EEST" | "MSK" | "IRST" => 3,
        "IDT" | "IRDT" => 4,
        "EST" => -5,
        "EDT" | "CST" => -6,
        "CDT" | "MST" => -7,
        "MDT" | "PST" => -8,
        "PDT" | "AKST" => -9,
        "AKDT" | "HST" => -10,
        _ => 0,
    }
}

/// Howard Hinnant days_from_civil → days since Unix epoch.
fn civil_to_epoch_days(y: i64, m: i64, d: i64) -> Option<i64> {
    if !(1..=12).contains(&m) || !(1..=31).contains(&d) {
        return None;
    }
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let doy = (153 * (if m > 2 { m - 3 } else { m + 9 }) + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    Some(era * 146_097 + doe - 719_468)
}
