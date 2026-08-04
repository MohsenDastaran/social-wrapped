//! Google Calendar .ics parser (lightweight).

use std::collections::HashMap;
use std::io::Read;

use zip::ZipArchive;

use super::html_activity::parse_takeout_datetime;
use super::series::{top_counts, utc_hour_and_date, EventSeries};
use super::types::CalendarInsights;

pub fn parse_calendar_from_archive<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
) -> Option<CalendarInsights> {
    let names: Vec<String> = (0..archive.len())
        .filter_map(|i| archive.by_index(i).ok().map(|f| f.name().to_string()))
        .collect();

    let ics_files: Vec<String> = names
        .into_iter()
        .filter(|n| {
            let n = n.replace('\\', "/");
            n.contains("Calendar/") && n.ends_with(".ics")
        })
        .collect();

    if ics_files.is_empty() {
        return None;
    }

    let mut series = EventSeries::default();
    let mut summaries: HashMap<String, u64> = HashMap::new();
    let mut event_count = 0u64;
    let mut all_day = 0u64;
    let mut timed = 0u64;

    for name in ics_files {
        let mut file = match archive.by_name(&name) {
            Ok(f) => f,
            Err(_) => continue,
        };
        let mut text = String::new();
        if file.read_to_string(&mut text).is_err() {
            continue;
        }
        for block in text.split("BEGIN:VEVENT").skip(1) {
            let end = block.find("END:VEVENT").unwrap_or(block.len());
            let ev = &block[..end];
            event_count += 1;

            let summary = ics_field(ev, "SUMMARY").unwrap_or_default();
            if !summary.is_empty() {
                *summaries.entry(summary).or_insert(0) += 1;
            }

            let dtstart = ics_field(ev, "DTSTART");
            let is_all_day = dtstart
                .as_deref()
                .map(|s| s.contains("VALUE=DATE") || (!s.contains('T') && s.len() >= 8))
                .unwrap_or(false)
                || ev.contains("DTSTART;VALUE=DATE:");

            if is_all_day {
                all_day += 1;
            } else {
                timed += 1;
            }

            if let Some(raw) = dtstart.as_deref().or_else(|| {
                // VALUE=DATE form: DTSTART;VALUE=DATE:19970429
                ev.lines()
                    .find(|l| l.starts_with("DTSTART"))
                    .map(|l| l.split(':').next_back().unwrap_or(""))
                    .filter(|s| !s.is_empty())
            }) {
                let value = raw.split(':').next_back().unwrap_or(raw);
                if let Some((h, d)) = parse_ics_datetime(value) {
                    series.push(h, &d);
                }
            }
        }
    }

    if event_count == 0 {
        return None;
    }

    Some(CalendarInsights {
        event_count,
        all_day_count: all_day,
        timed_count: timed,
        top_summaries: top_counts(&summaries, 15),
        heatmap: series.heatmap(),
        activity: series.activity_over_time(),
    })
}

fn ics_field<'a>(block: &'a str, key: &str) -> Option<String> {
    for line in block.lines() {
        let line = line.trim_end();
        if line.starts_with(key) {
            // SUMMARY:foo or DTSTART;TZID=...:20200101T120000Z
            if let Some(idx) = line.find(':') {
                return Some(unescape_ics(&line[idx + 1..]));
            }
        }
    }
    None
}

fn unescape_ics(s: &str) -> String {
    s.replace("\\n", " ")
        .replace("\\,", ",")
        .replace("\\;", ";")
        .replace("\\\\", "\\")
}

fn parse_ics_datetime(value: &str) -> Option<(u8, String)> {
    let v = value.trim();
    // YYYYMMDD or YYYYMMDDTHHMMSSZ
    if v.len() >= 8 && v.as_bytes().iter().take(8).all(|b| b.is_ascii_digit()) {
        let y: i64 = v[0..4].parse().ok()?;
        let m: i64 = v[4..6].parse().ok()?;
        let d: i64 = v[6..8].parse().ok()?;
        let (hour, minute, second) = if v.len() >= 15 && v.as_bytes()[8] == b'T' {
            let h: i64 = v[9..11].parse().unwrap_or(0);
            let mi: i64 = v[11..13].parse().unwrap_or(0);
            let s: i64 = v[13..15].parse().unwrap_or(0);
            (h, mi, s)
        } else {
            (12, 0, 0)
        };
        // Treat Z / floating as UTC for heatmap purposes
        let days = civil_to_epoch_days(y, m, d)?;
        let secs = days * 86_400 + hour * 3_600 + minute * 60 + second;
        return Some(utc_hour_and_date(secs));
    }
    // Fallback: human-readable via takeout parser
    parse_takeout_datetime(v).map(utc_hour_and_date)
}

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
