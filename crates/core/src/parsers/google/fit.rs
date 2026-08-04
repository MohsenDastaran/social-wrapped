//! Google Fit step / active-minutes parsers.

use std::collections::HashMap;
use std::io::Read;

use serde::Deserialize;
use zip::ZipArchive;

use super::series::{top_counts, utc_hour_and_date, EventSeries};
use super::types::{FitDayPoint, FitInsights};

#[derive(Deserialize)]
struct FitFile {
    #[serde(rename = "Data Points")]
    data_points: Option<Vec<FitPoint>>,
}

#[derive(Deserialize)]
struct FitPoint {
    #[serde(rename = "fitValue")]
    fit_value: Option<Vec<FitValueWrap>>,
    #[serde(rename = "startTimeNanos")]
    start_time_nanos: Option<u64>,
    #[serde(rename = "endTimeNanos")]
    end_time_nanos: Option<u64>,
}

#[derive(Deserialize)]
struct FitValueWrap {
    value: Option<FitValue>,
}

#[derive(Deserialize)]
struct FitValue {
    #[serde(rename = "intVal")]
    int_val: Option<i64>,
    #[serde(rename = "fpVal")]
    fp_val: Option<f64>,
}

pub fn parse_fit_from_archive<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
) -> Option<FitInsights> {
    let names: Vec<String> = (0..archive.len())
        .filter_map(|i| archive.by_index(i).ok().map(|f| f.name().to_string()))
        .collect();

    let mut day_steps: HashMap<String, u64> = HashMap::new();
    let mut day_active: HashMap<String, u64> = HashMap::new();
    let mut activity_types: HashMap<String, u64> = HashMap::new();
    let mut activity_file_count = 0u64;
    let mut found = false;

    // Prefer merged gms step deltas / active minutes
    let step_name = names.iter().find(|n| {
        let n = n.replace('\\', "/");
        n.contains("Fit/All Data/")
            && n.contains("step_count.delta")
            && n.contains("merge_step_deltas")
    }).or_else(|| {
        names.iter().find(|n| {
            let n = n.replace('\\', "/");
            n.contains("Fit/All Data/") && n.contains("step_count.delta")
        })
    });

    let active_name = names.iter().find(|n| {
        let n = n.replace('\\', "/");
        n.contains("Fit/All Data/")
            && n.contains("active_minutes")
            && n.contains("merge_active_minutes")
    }).or_else(|| {
        names.iter().find(|n| {
            let n = n.replace('\\', "/");
            n.contains("Fit/All Data/") && n.contains("active_minutes")
        })
    });

    if let Some(name) = step_name {
        if let Some(map) = load_fit_daily(archive, name) {
            found = true;
            for (d, v) in map {
                *day_steps.entry(d).or_insert(0) += v;
            }
        }
    }

    if let Some(name) = active_name {
        if let Some(map) = load_fit_daily(archive, name) {
            found = true;
            for (d, v) in map {
                *day_active.entry(d).or_insert(0) += v;
            }
        }
    }

    for name in &names {
        let norm = name.replace('\\', "/");
        if norm.contains("Fit/Activities/") && norm.ends_with(".tcx") {
            activity_file_count += 1;
            found = true;
            if let Some(kind) = activity_type_from_name(&norm) {
                *activity_types.entry(kind).or_insert(0) += 1;
            }
        }
    }

    if !found {
        return None;
    }

    let mut heat_series = EventSeries::default();
    let mut daily: Vec<FitDayPoint> = day_steps
        .keys()
        .chain(day_active.keys())
        .collect::<std::collections::BTreeSet<_>>()
        .into_iter()
        .map(|date| {
            let steps = *day_steps.get(date).unwrap_or(&0);
            let active_minutes = *day_active.get(date).unwrap_or(&0);
            FitDayPoint {
                date: date.clone(),
                steps,
                active_minutes,
            }
        })
        .collect();
    daily.sort_by(|a, b| a.date.cmp(&b.date));

    for d in &daily {
        if d.steps > 0 {
            heat_series.push_weighted(12, &d.date, d.steps);
        }
    }

    let total_steps: u64 = daily.iter().map(|d| d.steps).sum();
    let total_active: u64 = daily.iter().map(|d| d.active_minutes).sum();

    Some(FitInsights {
        total_steps,
        total_active_minutes: total_active,
        activity_file_count,
        activity_types: top_counts(&activity_types, 10),
        daily,
        steps_activity: heat_series.activity_over_time(),
        steps_heatmap: heat_series.heatmap(),
    })
}

fn load_fit_daily<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
    name: &str,
) -> Option<HashMap<String, u64>> {
    let mut file = archive.by_name(name).ok()?;
    let mut buf = Vec::new();
    file.read_to_end(&mut buf).ok()?;
    let parsed: FitFile = serde_json::from_slice(&buf).ok()?;
    let points = parsed.data_points.unwrap_or_default();
    let mut map: HashMap<String, u64> = HashMap::new();
    for p in points {
        let nanos = p.start_time_nanos.or(p.end_time_nanos)?;
        let secs = (nanos / 1_000_000_000) as i64;
        let (_, date) = utc_hour_and_date(secs);
        let val = p
            .fit_value
            .as_ref()
            .and_then(|v| v.first())
            .and_then(|w| w.value.as_ref())
            .map(|v| {
                v.int_val
                    .unwrap_or_else(|| v.fp_val.unwrap_or(0.0) as i64)
                    .max(0) as u64
            })
            .unwrap_or(0);
        *map.entry(date).or_insert(0) += val;
    }
    Some(map)
}

fn activity_type_from_name(path: &str) -> Option<String> {
    // ...PT16M32.894S_Walking.tcx
    let file = path.rsplit('/').next()?;
    let stem = file.strip_suffix(".tcx")?;
    let kind = stem.rsplit('_').next()?;
    let kind = kind.split(',').next()?.trim();
    if kind.is_empty() {
        None
    } else {
        Some(kind.to_string())
    }
}
