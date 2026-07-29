//! Canned analytics queries using DuckDB's `read_json_auto`.
//!
//! All heavy computation is pushed entirely into DuckDB — Rust only drives the
//! connection and collects typed results.  Each function documents the expected
//! JSON schema so callers know which platform export it targets.

use std::path::Path;

use serde::Deserialize;

use crate::error::CoreError;
use crate::storage::engine::{quote_path, AnalyticsEngine};

// ── Result types ──────────────────────────────────────────────────────────────

/// A single sender and their message count.
#[derive(Debug, Clone, Deserialize)]
pub struct SenderSummary {
    pub sender: String,
    pub message_count: u64,
}

/// Message count for a single calendar day.
#[derive(Debug, Clone, Deserialize)]
pub struct DaySummary {
    /// ISO-8601 date string, e.g. `"2024-01-15"`.
    pub day: String,
    pub message_count: u64,
}

// ── Telegram queries ──────────────────────────────────────────────────────────
//
// Telegram exports `result.json` with this top-level shape:
// ```json
// { "name": "…", "messages": [{ "id": 1, "from": "Alice", "date": "…", "text": "…" }] }
// ```

/// Returns the top `limit` senders by message count from a Telegram
/// `result.json` export file.
///
/// # Errors
///
/// Returns [`CoreError::Database`] on DuckDB failure, or [`CoreError::Parse`]
/// when `json_path` cannot be converted to a UTF-8 string.
pub fn top_senders(
    engine: &AnalyticsEngine,
    json_path: &Path,
    limit: usize,
) -> Result<Vec<SenderSummary>, CoreError> {
    let path = quote_path(json_path)?;
    let sql = format!(
        "SELECT
             msg->>'from' AS sender,
             COUNT(*)     AS message_count
         FROM (
             SELECT UNNEST(messages) AS msg
             FROM   read_json_auto({path})
         )
         WHERE msg->>'from' IS NOT NULL
         GROUP BY sender
         ORDER BY message_count DESC
         LIMIT {limit}"
    );

    engine.query_map(&sql, |row| {
        Ok(SenderSummary {
            sender: row.get(0)?,
            message_count: row.get(1)?,
        })
    })
}

/// Returns per-day message counts from a Telegram `result.json` export.
///
/// The `date` field in Telegram exports is an ISO-8601 string such as
/// `"2024-01-15T10:30:00"`.  DuckDB truncates it to a date for grouping.
pub fn messages_by_day(
    engine: &AnalyticsEngine,
    json_path: &Path,
) -> Result<Vec<DaySummary>, CoreError> {
    let path = quote_path(json_path)?;
    let sql = format!(
        "SELECT
             CAST(msg->>'date' AS DATE)::VARCHAR AS day,
             COUNT(*)                            AS message_count
         FROM (
             SELECT UNNEST(messages) AS msg
             FROM   read_json_auto({path})
         )
         WHERE msg->>'date' IS NOT NULL
         GROUP BY day
         ORDER BY day ASC"
    );

    engine.query_map(&sql, |row| {
        Ok(DaySummary {
            day: row.get(0)?,
            message_count: row.get(1)?,
        })
    })
}

/// Returns the total number of messages in a Telegram `result.json` export.
pub fn total_message_count(
    engine: &AnalyticsEngine,
    json_path: &Path,
) -> Result<u64, CoreError> {
    let path = quote_path(json_path)?;
    let sql = format!(
        "SELECT COUNT(*) FROM (
             SELECT UNNEST(messages) AS msg
             FROM   read_json_auto({path})
         )"
    );

    let rows: Vec<u64> = engine.query_map(&sql, |row| row.get(0))?;
    Ok(rows.into_iter().next().unwrap_or(0))
}

// ── Spotify queries ───────────────────────────────────────────────────────────
//
// Spotify Extended Streaming History is a JSON array:
// ```json
// [{ "ts": "2024-01-15T10:30:00Z", "master_metadata_track_artist_name": "Artist",
//    "master_metadata_track_name": "Track", "ms_played": 240000 }]
// ```

/// Per-artist total listening time (ms) from a Spotify streaming history file.
#[derive(Debug, Clone, Deserialize)]
pub struct ArtistListeningTime {
    pub artist: String,
    /// Total milliseconds played for this artist.
    pub ms_played: u64,
}

/// Returns the top `limit` artists by total listening time from a Spotify
/// `Streaming_History_Audio_*.json` file.
pub fn top_artists_by_listening_time(
    engine: &AnalyticsEngine,
    json_path: &Path,
    limit: usize,
) -> Result<Vec<ArtistListeningTime>, CoreError> {
    let path = quote_path(json_path)?;
    let sql = format!(
        "SELECT
             master_metadata_track_artist_name AS artist,
             SUM(ms_played)                   AS ms_played
         FROM read_json_auto({path})
         WHERE master_metadata_track_artist_name IS NOT NULL
         GROUP BY artist
         ORDER BY ms_played DESC
         LIMIT {limit}"
    );

    engine.query_map(&sql, |row| {
        Ok(ArtistListeningTime {
            artist: row.get(0)?,
            ms_played: row.get(1)?,
        })
    })
}
