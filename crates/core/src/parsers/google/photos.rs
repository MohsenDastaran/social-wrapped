//! Google Photos sidecar metadata (skip media binaries).

use std::collections::HashMap;
use std::io::Read;

use serde::Deserialize;
use zip::ZipArchive;

use super::series::{top_counts, utc_hour_and_date, EventSeries};
use super::types::PhotosInsights;

#[derive(Deserialize)]
struct PhotoMeta {
    title: Option<String>,
    #[serde(rename = "photoTakenTime")]
    photo_taken_time: Option<PhotoTime>,
    #[serde(rename = "creationTime")]
    creation_time: Option<PhotoTime>,
    #[serde(rename = "geoData")]
    geo_data: Option<GeoData>,
}

#[derive(Deserialize)]
struct PhotoTime {
    timestamp: Option<String>,
}

#[derive(Deserialize)]
struct GeoData {
    latitude: Option<f64>,
    longitude: Option<f64>,
}

pub fn parse_photos_from_archive<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
) -> Option<PhotosInsights> {
    let names: Vec<String> = (0..archive.len())
        .filter_map(|i| archive.by_index(i).ok().map(|f| f.name().to_string()))
        .collect();

    let metas: Vec<String> = names
        .into_iter()
        .filter(|n| {
            let n = n.replace('\\', "/");
            n.contains("Google Photos/")
                && (n.ends_with(".json") || n.ends_with(".supplemental-metadata.json"))
        })
        .collect();

    if metas.is_empty() {
        return None;
    }

    let mut series = EventSeries::default();
    let mut albums: HashMap<String, u64> = HashMap::new();
    let mut photo_count = 0u64;
    let mut with_geo = 0u64;

    for name in metas {
        let norm = name.replace('\\', "/");
        // Album = folder under Google Photos/
        let album = norm
            .split("Google Photos/")
            .nth(1)
            .and_then(|rest| rest.split('/').next())
            .unwrap_or("Unknown")
            .to_string();

        let mut file = match archive.by_name(&name) {
            Ok(f) => f,
            Err(_) => continue,
        };
        // Skip huge unexpected JSON
        if file.size() > 512_000 {
            continue;
        }
        let mut buf = Vec::new();
        if file.read_to_end(&mut buf).is_err() {
            continue;
        }
        let meta: PhotoMeta = match serde_json::from_slice(&buf) {
            Ok(m) => m,
            Err(_) => continue,
        };

        // Prefer sidecars that look like photo metadata
        if meta.photo_taken_time.is_none() && meta.creation_time.is_none() && meta.title.is_none()
        {
            continue;
        }

        photo_count += 1;
        *albums.entry(album).or_insert(0) += 1;

        if let Some(geo) = &meta.geo_data {
            let lat = geo.latitude.unwrap_or(0.0);
            let lon = geo.longitude.unwrap_or(0.0);
            if lat != 0.0 || lon != 0.0 {
                with_geo += 1;
            }
        }

        let ts = meta
            .photo_taken_time
            .as_ref()
            .and_then(|t| t.timestamp.as_ref())
            .or_else(|| {
                meta.creation_time
                    .as_ref()
                    .and_then(|t| t.timestamp.as_ref())
            });
        if let Some(ts) = ts {
            if let Ok(secs) = ts.parse::<i64>() {
                let (h, d) = utc_hour_and_date(secs);
                series.push(h, &d);
            }
        }
    }

    if photo_count == 0 {
        return None;
    }

    Some(PhotosInsights {
        photo_count,
        with_geo_count: with_geo,
        by_album: top_counts(&albums, 20),
        heatmap: series.heatmap(),
        activity: series.activity_over_time(),
    })
}
