//! Google Keep note JSON parser.

use std::io::Read;

use serde::Deserialize;
use zip::ZipArchive;

use super::series::{utc_hour_and_date, EventSeries};
use super::types::KeepInsights;

#[derive(Deserialize)]
struct KeepNote {
    #[serde(rename = "isPinned")]
    is_pinned: Option<bool>,
    #[serde(rename = "isArchived")]
    is_archived: Option<bool>,
    #[serde(rename = "isTrashed")]
    is_trashed: Option<bool>,
    #[serde(rename = "userEditedTimestampUsec")]
    user_edited_timestamp_usec: Option<u64>,
    #[serde(rename = "createdTimestampUsec")]
    created_timestamp_usec: Option<u64>,
}

pub fn parse_keep_from_archive<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
) -> Option<KeepInsights> {
    let names: Vec<String> = (0..archive.len())
        .filter_map(|i| archive.by_index(i).ok().map(|f| f.name().to_string()))
        .collect();

    let keep_jsons: Vec<String> = names
        .into_iter()
        .filter(|n| {
            let n = n.replace('\\', "/");
            n.contains("Keep/") && n.ends_with(".json")
        })
        .collect();

    if keep_jsons.is_empty() {
        return None;
    }

    let mut series = EventSeries::default();
    let mut note_count = 0u64;
    let mut pinned = 0u64;
    let mut archived = 0u64;

    for name in keep_jsons {
        let mut file = match archive.by_name(&name) {
            Ok(f) => f,
            Err(_) => continue,
        };
        let mut buf = Vec::new();
        if file.read_to_end(&mut buf).is_err() {
            continue;
        }
        let note: KeepNote = match serde_json::from_slice(&buf) {
            Ok(n) => n,
            Err(_) => continue,
        };
        if note.is_trashed.unwrap_or(false) {
            continue;
        }
        note_count += 1;
        if note.is_pinned.unwrap_or(false) {
            pinned += 1;
        }
        if note.is_archived.unwrap_or(false) {
            archived += 1;
        }
        if let Some(usec) = note
            .user_edited_timestamp_usec
            .or(note.created_timestamp_usec)
        {
            let secs = (usec / 1_000_000) as i64;
            let (h, d) = utc_hour_and_date(secs);
            series.push(h, &d);
        }
    }

    if note_count == 0 {
        return None;
    }

    Some(KeepInsights {
        note_count,
        pinned_count: pinned,
        archived_count: archived,
        heatmap: series.heatmap(),
        activity: series.activity_over_time(),
    })
}
