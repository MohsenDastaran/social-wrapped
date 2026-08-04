//! YouTube and YouTube Music Takeout parsers (HTML history + CSVs).

use std::collections::HashMap;
use std::io::Read;

use zip::ZipArchive;

use super::html_activity::{
    feed_entries, parse_activity_html_filtered, ActivityKindFilter,
};
use super::series::{top_counts, EventSeries};
use super::types::YouTubeInsights;
use crate::analytics::collectors::ActivityTimeSeries;

pub fn parse_youtube_from_archive<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
) -> Option<YouTubeInsights> {
    let mut watch_series = EventSeries::default();
    let mut search_series = EventSeries::default();
    let mut channel_counts: HashMap<String, u64> = HashMap::new();
    let mut video_counts: HashMap<String, u64> = HashMap::new();
    let mut search_counts: HashMap<String, u64> = HashMap::new();
    let mut unique_videos: HashMap<String, ()> = HashMap::new();
    let mut found = false;

    let mut channel_title: Option<String> = None;
    let mut subscription_count = 0u64;
    let mut comment_count = 0u64;
    let mut playlist_count = 0u64;

    let names: Vec<String> = (0..archive.len())
        .filter_map(|i| archive.by_index(i).ok().map(|f| f.name().to_string()))
        .collect();

    for name in &names {
        let lower = name.replace('\\', "/");
        if !lower.contains("YouTube and YouTube Music/")
            && !lower.contains("YouTube/")
        {
            continue;
        }
        found = true;

        if lower.ends_with("history/watch-history.html")
            || lower.ends_with("history/watch-history.json")
        {
            if let Ok(text) = read_entry(archive, name) {
                if lower.ends_with(".html") {
                    let entries = parse_activity_html_filtered(
                        &text,
                        true,
                        ActivityKindFilter::Watched,
                    );
                    feed_entries(&mut watch_series, &entries);
                    for e in &entries {
                        if let Some(ch) = &e.secondary {
                            if !ch.is_empty() {
                                *channel_counts.entry(ch.clone()).or_insert(0) += 1;
                            }
                        }
                        let key = e
                            .href
                            .as_ref()
                            .map(|h| {
                                if let Some(idx) = h.find("v=") {
                                    format!("{}|{}", &h[idx..], e.title)
                                } else {
                                    e.title.clone()
                                }
                            })
                            .unwrap_or_else(|| e.title.clone());
                        if !e.title.is_empty() {
                            *video_counts.entry(e.title.clone()).or_insert(0) += 1;
                            unique_videos.insert(key, ());
                        }
                    }
                }
            }
        } else if lower.ends_with("history/search-history.html")
            || lower.ends_with("history/search-history.json")
        {
            if let Ok(text) = read_entry(archive, name) {
                if lower.ends_with(".html") {
                    let entries = parse_activity_html_filtered(
                        &text,
                        true,
                        ActivityKindFilter::Searched,
                    );
                    feed_entries(&mut search_series, &entries);
                    for e in &entries {
                        let q = e.title.trim();
                        if !q.is_empty() {
                            *search_counts.entry(q.to_string()).or_insert(0) += 1;
                        }
                    }
                }
            }
        } else if lower.ends_with("subscriptions/subscriptions.csv") {
            if let Ok(text) = read_entry(archive, name) {
                subscription_count = csv_data_rows(&text);
            }
        } else if lower.ends_with("comments/comments.csv") {
            if let Ok(text) = read_entry(archive, name) {
                comment_count = csv_data_rows(&text);
            }
        } else if lower.ends_with("playlists/playlists.csv") {
            if let Ok(text) = read_entry(archive, name) {
                playlist_count = csv_data_rows(&text);
            }
        } else if lower.ends_with("channels/channel.csv") {
            if let Ok(text) = read_entry(archive, name) {
                channel_title = csv_second_column_first_row(&text);
            }
        }
    }

    if !found && watch_series.total() == 0 && search_series.total() == 0 {
        return None;
    }

    Some(YouTubeInsights {
        channel_title,
        subscription_count,
        comment_count,
        playlist_count,
        watch_count: watch_series.total(),
        unique_videos: unique_videos.len() as u64,
        search_count: search_series.total(),
        top_channels: top_counts(&channel_counts, 20),
        top_videos: top_counts(&video_counts, 20),
        top_searches: top_counts(&search_counts, 20),
        watch_heatmap: watch_series.heatmap(),
        watch_hourly: watch_series.hourly(),
        watch_activity: watch_series.activity_over_time(),
        search_heatmap: search_series.heatmap(),
        search_hourly: search_series.hourly(),
        search_activity: search_series.activity_over_time(),
    })
}

pub fn empty_activity() -> ActivityTimeSeries {
    ActivityTimeSeries {
        daily: vec![],
        monthly: vec![],
        yearly: vec![],
        years: vec![],
    }
}

fn read_entry<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
    name: &str,
) -> Result<String, ()> {
    let mut file = archive.by_name(name).map_err(|_| ())?;
    let mut buf = String::new();
    file.read_to_string(&mut buf).map_err(|_| ())?;
    Ok(buf)
}

fn csv_data_rows(text: &str) -> u64 {
    text.lines()
        .skip(1)
        .filter(|l| !l.trim().is_empty())
        .count() as u64
}

fn csv_second_column_first_row(text: &str) -> Option<String> {
    let line = text.lines().nth(1)?;
    let cols: Vec<&str> = parse_csv_line(line);
    cols.get(1).map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
}

fn parse_csv_line(line: &str) -> Vec<&str> {
    // Simple split — Takeout CSVs rarely quote commas in channel titles awkwardly
    line.split(',').collect()
}
