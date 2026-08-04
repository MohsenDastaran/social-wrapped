//! Chrome History.json parser.

use std::collections::HashMap;
use std::io::Read;

use serde::Deserialize;
use zip::ZipArchive;

use super::series::{top_counts, utc_hour_and_date, EventSeries};
use super::types::ChromeInsights;

#[derive(Deserialize)]
struct ChromeHistoryFile {
    #[serde(rename = "Browser History")]
    browser_history: Option<Vec<ChromeVisit>>,
}

#[derive(Deserialize)]
struct ChromeVisit {
    title: Option<String>,
    url: Option<String>,
    time_usec: Option<u64>,
}

pub fn parse_chrome_from_archive<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
) -> Option<ChromeInsights> {
    let names: Vec<String> = (0..archive.len())
        .filter_map(|i| archive.by_index(i).ok().map(|f| f.name().to_string()))
        .collect();

    let history_name = names.iter().find(|n| {
        let n = n.replace('\\', "/");
        n.ends_with("Chrome/History.json")
    })?;

    let mut file = archive.by_name(history_name).ok()?;
    let mut buf = Vec::new();
    file.read_to_end(&mut buf).ok()?;
    let parsed: ChromeHistoryFile = serde_json::from_slice(&buf).ok()?;
    let visits = parsed.browser_history.unwrap_or_default();
    if visits.is_empty() {
        return None;
    }

    let mut series = EventSeries::default();
    let mut domains: HashMap<String, u64> = HashMap::new();
    let mut titles: HashMap<String, u64> = HashMap::new();
    let mut unique_urls: HashMap<String, ()> = HashMap::new();

    for v in &visits {
        let url = v.url.as_deref().unwrap_or("");
        if !url.is_empty() {
            unique_urls.insert(url.to_string(), ());
            if let Some(dom) = domain_of(url) {
                *domains.entry(dom).or_insert(0) += 1;
            }
        }
        if let Some(t) = v.title.as_deref() {
            let t = t.trim();
            if !t.is_empty() {
                *titles.entry(t.to_string()).or_insert(0) += 1;
            }
        }
        if let Some(usec) = v.time_usec {
            let secs = (usec / 1_000_000) as i64;
            let (hour, date) = utc_hour_and_date(secs);
            series.push(hour, &date);
        }
    }

    Some(ChromeInsights {
        visit_count: visits.len() as u64,
        unique_urls: unique_urls.len() as u64,
        unique_domains: domains.len() as u64,
        top_domains: top_counts(&domains, 20),
        top_titles: top_counts(&titles, 15),
        heatmap: series.heatmap(),
        hourly: series.hourly(),
        activity: series.activity_over_time(),
    })
}

fn domain_of(url: &str) -> Option<String> {
    let rest = url
        .strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))
        .unwrap_or(url);
    let host = rest.split('/').next()?.split('?').next()?;
    let host = host.strip_prefix("www.").unwrap_or(host);
    if host.is_empty() {
        None
    } else {
        Some(host.to_string())
    }
}
