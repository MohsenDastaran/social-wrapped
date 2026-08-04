//! My Activity HTML product folders.

use std::collections::HashMap;
use std::io::Read;

use zip::ZipArchive;

use super::html_activity::{feed_entries, parse_activity_html};
use super::series::{top_counts, EventSeries};
use super::types::{MyActivityInsights, MyActivityProduct};
use super::youtube::empty_activity;

/// Products we deep-parse (others counted lightly if small).
const DEEP: &[&str] = &["Search", "YouTube", "Maps", "Chrome", "Gemini Apps"];

pub fn parse_my_activity_from_archive<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
) -> Option<MyActivityInsights> {
    let names: Vec<String> = (0..archive.len())
        .filter_map(|i| archive.by_index(i).ok().map(|f| f.name().to_string()))
        .collect();

    let html_files: Vec<(String, String)> = names
        .iter()
        .filter_map(|n| {
            let norm = n.replace('\\', "/");
            if !norm.contains("My Activity/") {
                return None;
            }
            if !norm.ends_with("MyActivity.html") && !norm.ends_with("MyActivity.json") {
                return None;
            }
            // Takeout/My Activity/{Product}/MyActivity.html
            let parts: Vec<&str> = norm.split('/').collect();
            let idx = parts.iter().position(|p| *p == "My Activity")?;
            let product = parts.get(idx + 1)?.to_string();
            Some((product, n.clone()))
        })
        .collect();

    if html_files.is_empty() {
        return None;
    }

    let mut products = Vec::new();
    let mut total_events = 0u64;

    for (product, path) in html_files {
        let deep = DEEP.iter().any(|d| product.eq_ignore_ascii_case(d));
        // Skip huge non-deep files beyond a soft size to keep WASM memory safe —
        // still count via streaming length when not deep.
        let mut file = match archive.by_name(&path) {
            Ok(f) => f,
            Err(_) => continue,
        };
        let size = file.size();
        // Hard skip audio etc already filtered; cap non-deep HTML at 2MB
        if !deep && size > 2_000_000 {
            products.push(MyActivityProduct {
                name: product,
                event_count: 0,
                top_items: vec![],
                heatmap: vec![],
                hourly: vec![0; 24],
                activity: empty_activity(),
            });
            continue;
        }

        let mut text = String::new();
        if file.read_to_string(&mut text).is_err() {
            continue;
        }
        drop(file);

        let entries = parse_activity_html(&text);
        let mut series = EventSeries::default();
        feed_entries(&mut series, &entries);
        let mut items: HashMap<String, u64> = HashMap::new();
        for e in &entries {
            let label = e
                .title
                .strip_prefix("Searched for ")
                .unwrap_or(&e.title)
                .trim();
            if !label.is_empty() {
                *items.entry(label.to_string()).or_insert(0) += 1;
            }
        }

        total_events += series.total();
        products.push(MyActivityProduct {
            name: product,
            event_count: series.total().max(entries.len() as u64),
            top_items: if deep {
                top_counts(&items, 15)
            } else {
                top_counts(&items, 5)
            },
            heatmap: series.heatmap(),
            hourly: series.hourly(),
            activity: series.activity_over_time(),
        });
    }

    products.sort_by(|a, b| b.event_count.cmp(&a.event_count));

    Some(MyActivityInsights {
        total_events,
        products,
    })
}
