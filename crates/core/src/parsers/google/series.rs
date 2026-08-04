//! Timed-event accumulators → heatmap / circadian / activity series.

use std::collections::HashMap;

use crate::analytics::collectors::{
    ActivityPoint, ActivityTimeSeries, HeatmapDay,
};

/// Accumulates timestamped events into chart-ready series.
#[derive(Debug, Default)]
pub struct EventSeries {
    day_counts: HashMap<String, u64>,
    hourly: [u64; 24],
    /// All activity lands in `sent`; `received` stays 0 for single-sided streams.
    activity_daily: HashMap<String, (u64, u64)>,
    total: u64,
}

impl EventSeries {
    pub fn push(&mut self, hour: u8, date: &str) {
        self.total = self.total.saturating_add(1);
        *self.day_counts.entry(date.to_string()).or_insert(0) += 1;
        if (hour as usize) < 24 {
            self.hourly[hour as usize] += 1;
        }
        let slot = self
            .activity_daily
            .entry(date.to_string())
            .or_insert((0, 0));
        slot.0 += 1;
    }

    pub fn push_weighted(&mut self, hour: u8, date: &str, weight: u64) {
        if weight == 0 {
            return;
        }
        self.total = self.total.saturating_add(weight);
        *self.day_counts.entry(date.to_string()).or_insert(0) += weight;
        if (hour as usize) < 24 {
            self.hourly[hour as usize] += weight;
        }
        let slot = self
            .activity_daily
            .entry(date.to_string())
            .or_insert((0, 0));
        slot.0 += weight;
    }

    pub fn total(&self) -> u64 {
        self.total
    }

    pub fn hourly(&self) -> Vec<u64> {
        self.hourly.to_vec()
    }

    pub fn heatmap(&self) -> Vec<HeatmapDay> {
        let mut days: Vec<HeatmapDay> = self
            .day_counts
            .iter()
            .map(|(date, &count)| HeatmapDay {
                date: date.clone(),
                count,
            })
            .collect();
        days.sort_by(|a, b| a.date.cmp(&b.date));
        days
    }

    pub fn activity_over_time(&self) -> ActivityTimeSeries {
        build_activity_time_series(&self.activity_daily)
    }
}

fn build_activity_time_series(
    daily_map: &HashMap<String, (u64, u64)>,
) -> ActivityTimeSeries {
    let mut daily: Vec<ActivityPoint> = daily_map
        .iter()
        .map(|(period, &(sent, received))| ActivityPoint {
            period: period.clone(),
            sent,
            received,
        })
        .collect();
    daily.sort_by(|a, b| a.period.cmp(&b.period));

    let mut monthly_map: HashMap<String, (u64, u64)> = HashMap::new();
    let mut yearly_map: HashMap<String, (u64, u64)> = HashMap::new();
    let mut year_set: std::collections::BTreeSet<u16> =
        std::collections::BTreeSet::new();

    for point in &daily {
        if point.period.len() < 7 {
            continue;
        }
        let month_key = point.period[..7].to_string();
        let slot = monthly_map.entry(month_key).or_insert((0, 0));
        slot.0 += point.sent;
        slot.1 += point.received;

        if point.period.len() >= 4 {
            let year_key = point.period[..4].to_string();
            if let Ok(y) = year_key.parse::<u16>() {
                year_set.insert(y);
            }
            let slot = yearly_map.entry(year_key).or_insert((0, 0));
            slot.0 += point.sent;
            slot.1 += point.received;
        }
    }

    let mut monthly: Vec<ActivityPoint> = monthly_map
        .into_iter()
        .map(|(period, (sent, received))| ActivityPoint {
            period,
            sent,
            received,
        })
        .collect();
    monthly.sort_by(|a, b| a.period.cmp(&b.period));

    let mut yearly: Vec<ActivityPoint> = yearly_map
        .into_iter()
        .map(|(period, (sent, received))| ActivityPoint {
            period,
            sent,
            received,
        })
        .collect();
    yearly.sort_by(|a, b| a.period.cmp(&b.period));

    let years: Vec<u16> = year_set.into_iter().rev().collect();

    ActivityTimeSeries {
        daily,
        monthly,
        yearly,
        years,
    }
}

/// UTC civil date + hour from Unix seconds (Howard Hinnant).
pub fn utc_hour_and_date(timestamp_secs: i64) -> (u8, String) {
    let days = timestamp_secs.div_euclid(86_400);
    let rem = timestamp_secs.rem_euclid(86_400);
    let hour = (rem / 3_600) as u8;
    let (y, m, d) = epoch_days_to_civil(days);
    (hour, format!("{y:04}-{m:02}-{d:02}"))
}

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

/// Ranked name → count pairs (desc).
pub fn top_counts(map: &HashMap<String, u64>, limit: usize) -> Vec<CountedItem> {
    let mut items: Vec<CountedItem> = map
        .iter()
        .filter(|(_, &c)| c > 0)
        .map(|(name, &count)| CountedItem {
            name: name.clone(),
            count,
        })
        .collect();
    items.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.name.cmp(&b.name)));
    if items.len() > limit {
        items.truncate(limit);
    }
    items
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CountedItem {
    pub name: String,
    pub count: u64,
}
