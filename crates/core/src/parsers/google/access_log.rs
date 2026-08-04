//! Access Log Activity CSV parser.

use std::collections::HashMap;
use std::io::Read;

use zip::ZipArchive;

use super::html_activity::parse_takeout_datetime;
use super::series::{top_counts, utc_hour_and_date, EventSeries};
use super::types::AccessLogInsights;

pub fn parse_access_log_from_archive<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
) -> Option<AccessLogInsights> {
    let names: Vec<String> = (0..archive.len())
        .filter_map(|i| archive.by_index(i).ok().map(|f| f.name().to_string()))
        .collect();

    let csv_name = names.iter().find(|n| {
        let n = n.replace('\\', "/");
        n.contains("Access Log Activity/") && n.ends_with(".csv")
    })?;

    let mut file = archive.by_name(csv_name).ok()?;
    let mut text = String::new();
    file.read_to_string(&mut text).ok()?;

    let mut lines = text.lines();
    let header = lines.next()?;
    let cols: Vec<&str> = split_csv_line(header);
    let ts_idx = find_col(&cols, "Activity Timestamp")?;
    let product_idx = find_col(&cols, "Product Name");
    let city_idx = find_col(&cols, "Activity City");

    let mut series = EventSeries::default();
    let mut products: HashMap<String, u64> = HashMap::new();
    let mut cities: HashMap<String, u64> = HashMap::new();
    let mut entry_count = 0u64;

    for line in lines {
        if line.trim().is_empty() {
            continue;
        }
        let fields = split_csv_line(line);
        entry_count += 1;

        if let Some(idx) = product_idx {
            if let Some(p) = fields.get(idx).map(|s| s.trim()).filter(|s| !s.is_empty()) {
                *products.entry(p.to_string()).or_insert(0) += 1;
            }
        }
        if let Some(idx) = city_idx {
            if let Some(c) = fields.get(idx).map(|s| s.trim()).filter(|s| !s.is_empty()) {
                *cities.entry(c.to_string()).or_insert(0) += 1;
            }
        }

        if let Some(ts) = fields.get(ts_idx) {
            if let Some(secs) = parse_access_timestamp(ts.trim()) {
                let (h, d) = utc_hour_and_date(secs);
                series.push(h, &d);
            }
        }
    }

    if entry_count == 0 {
        return None;
    }

    Some(AccessLogInsights {
        entry_count,
        top_products: top_counts(&products, 15),
        top_cities: top_counts(&cities, 10),
        heatmap: series.heatmap(),
        activity: series.activity_over_time(),
    })
}

fn find_col(cols: &[&str], name: &str) -> Option<usize> {
    cols.iter().position(|c| c.eq_ignore_ascii_case(name))
}

fn split_csv_line(line: &str) -> Vec<&str> {
    // Access log CSV is simple comma-separated without nested quotes in practice
    line.split(',').collect()
}

fn parse_access_timestamp(s: &str) -> Option<i64> {
    // "2026-08-02 06:54:50 UTC"
    if let Some((date, rest)) = s.split_once(' ') {
        let parts: Vec<&str> = date.split('-').collect();
        if parts.len() == 3 {
            let y: i64 = parts[0].parse().ok()?;
            let m: i64 = parts[1].parse().ok()?;
            let d: i64 = parts[2].parse().ok()?;
            let time = rest.split_whitespace().next().unwrap_or("00:00:00");
            let t: Vec<&str> = time.split(':').collect();
            let h: i64 = t.first().and_then(|x| x.parse().ok()).unwrap_or(0);
            let mi: i64 = t.get(1).and_then(|x| x.parse().ok()).unwrap_or(0);
            let sec: i64 = t.get(2).and_then(|x| x.parse().ok()).unwrap_or(0);
            let days = civil_to_epoch_days(y, m, d)?;
            return Some(days * 86_400 + h * 3_600 + mi * 60 + sec);
        }
    }
    parse_takeout_datetime(s)
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
