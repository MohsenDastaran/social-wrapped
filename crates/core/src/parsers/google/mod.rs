//! Google Takeout multi-product parser (ZIP bytes → GoogleInsights).

mod access_log;
mod calendar;
mod chrome;
mod fit;
mod html_activity;
mod keep;
mod my_activity;
mod photos;
mod series;
mod types;
mod youtube;

pub use types::{GoogleAnalyzeResult, GoogleInsights, SkippedProduct, YouTubeInsights};

use std::collections::BTreeSet;
use std::io::{Cursor, Read};

use zip::ZipArchive;

use crate::analytics::collectors::{AnalysisEngine, WrapAnalytics};
use crate::error::CoreError;
use crate::parsers::telegram::AnalyzeProgressPhase;

use access_log::parse_access_log_from_archive;
use calendar::parse_calendar_from_archive;
use chrome::parse_chrome_from_archive;
use fit::parse_fit_from_archive;
use keep::parse_keep_from_archive;
use my_activity::parse_my_activity_from_archive;
use photos::parse_photos_from_archive;
use youtube::parse_youtube_from_archive;

const SKIP_EXT: &[&str] = &[
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".mp4", ".mov", ".avi", ".mkv",
    ".mp3", ".m4a", ".wav", ".ogg", ".flac", ".docx", ".pdf", ".pptx", ".xlsx", ".zip",
    ".dmg", ".apk", ".exe", ".tcx",
];

/// Analyze one Takeout ZIP part. Skips Mail/Drive bodies and media binaries.
pub fn analyze_zip_bytes_with_progress(
    data: &[u8],
    youtube_only: bool,
    on_progress: impl FnMut(AnalyzeProgressPhase, u64, u64),
) -> Result<GoogleAnalyzeResult, CoreError> {
    let mut on_progress = on_progress;
    let file_size = data.len() as u64;
    on_progress(AnalyzeProgressPhase::Reading, 0, file_size.max(1));

    if !looks_like_zip(data) {
        return Err(CoreError::UnsupportedFormat(
            "Expected a Google Takeout ZIP archive.".into(),
        ));
    }

    let cursor = Cursor::new(data);
    let mut archive = ZipArchive::new(cursor)?;
    on_progress(AnalyzeProgressPhase::Reading, file_size / 4, file_size.max(1));

    let mut insights = GoogleInsights::default();
    let mut products = BTreeSet::new();
    detect_and_skip(&mut archive, &mut insights, &mut products);

    on_progress(AnalyzeProgressPhase::Reading, file_size / 2, file_size.max(1));
    on_progress(AnalyzeProgressPhase::Computing, 0, 8);

    if !youtube_only {
        if let Some(name) = parse_profile_name(&mut archive) {
            insights.display_name = Some(name);
        }
    }

    if let Some(yt) = parse_youtube_from_archive(&mut archive) {
        products.insert("YouTube".into());
        insights.youtube = Some(yt);
    }
    on_progress(AnalyzeProgressPhase::Computing, 1, 8);

    if !youtube_only {
        if let Some(ch) = parse_chrome_from_archive(&mut archive) {
            products.insert("Chrome".into());
            insights.chrome = Some(ch);
        }
        on_progress(AnalyzeProgressPhase::Computing, 2, 8);

        if let Some(ma) = parse_my_activity_from_archive(&mut archive) {
            products.insert("My Activity".into());
            insights.my_activity = Some(ma);
        }
        on_progress(AnalyzeProgressPhase::Computing, 3, 8);

        if let Some(fit) = parse_fit_from_archive(&mut archive) {
            products.insert("Fit".into());
            insights.fit = Some(fit);
        }
        on_progress(AnalyzeProgressPhase::Computing, 4, 8);

        if let Some(keep) = parse_keep_from_archive(&mut archive) {
            products.insert("Keep".into());
            insights.keep = Some(keep);
        }
        on_progress(AnalyzeProgressPhase::Computing, 5, 8);

        if let Some(cal) = parse_calendar_from_archive(&mut archive) {
            products.insert("Calendar".into());
            insights.calendar = Some(cal);
        }
        on_progress(AnalyzeProgressPhase::Computing, 6, 8);

        if let Some(ph) = parse_photos_from_archive(&mut archive) {
            products.insert("Photos".into());
            insights.photos = Some(ph);
        }
        on_progress(AnalyzeProgressPhase::Computing, 7, 8);

        if let Some(al) = parse_access_log_from_archive(&mut archive) {
            products.insert("Access Log".into());
            insights.access_log = Some(al);
        }
    }
    on_progress(AnalyzeProgressPhase::Computing, 8, 8);

    insights.products_found = products.into_iter().collect();

    if youtube_only && insights.youtube.is_none() {
        return Err(CoreError::Parse(
            "No YouTube data found in this archive. Include “YouTube and YouTube Music” in Takeout."
                .into(),
        ));
    }

    if insights.youtube.is_none()
        && insights.chrome.is_none()
        && insights.my_activity.is_none()
        && insights.fit.is_none()
        && insights.keep.is_none()
        && insights.calendar.is_none()
        && insights.photos.is_none()
        && insights.access_log.is_none()
    {
        // Mail/Drive-only parts: return skipped notices so multi-ZIP merge stays honest.
        if !insights.skipped.is_empty() && !youtube_only {
            let display = insights
                .display_name
                .clone()
                .unwrap_or_else(|| "Google".into());
            let analytics = shell_analytics(display, file_size);
            return Ok(GoogleAnalyzeResult {
                analytics,
                google_insights: insights,
            });
        }
        return Err(CoreError::Parse(
            "No supported Google Takeout products found in this ZIP (YouTube, Chrome, My Activity, Fit, Keep, Calendar, Photos, Access Log)."
                .into(),
        ));
    }

    let display = insights
        .display_name
        .clone()
        .or_else(|| {
            insights
                .youtube
                .as_ref()
                .and_then(|y| y.channel_title.clone())
        })
        .unwrap_or_else(|| {
            if youtube_only {
                "YouTube".into()
            } else {
                "Google".into()
            }
        });

    let analytics = shell_analytics(display, file_size);
    Ok(GoogleAnalyzeResult {
        analytics,
        google_insights: insights,
    })
}

/// Merge two partial insight payloads (multi-ZIP Takeout parts).
pub fn merge_insights(mut a: GoogleInsights, b: GoogleInsights) -> GoogleInsights {
    if a.display_name.is_none() {
        a.display_name = b.display_name;
    }
    for p in b.products_found {
        if !a.products_found.iter().any(|x| x == &p) {
            a.products_found.push(p);
        }
    }
    a.skipped.extend(b.skipped);

    if a.youtube.is_none() {
        a.youtube = b.youtube;
    } else if let (Some(left), Some(right)) = (a.youtube.as_mut(), b.youtube) {
        // Prefer the richer watch history
        if right.watch_count > left.watch_count {
            *left = right;
        }
    }

    if a.chrome.is_none() {
        a.chrome = b.chrome;
    }
    if a.my_activity.is_none() {
        a.my_activity = b.my_activity;
    }
    if a.fit.is_none() {
        a.fit = b.fit;
    }
    if a.keep.is_none() {
        a.keep = b.keep;
    }
    if a.calendar.is_none() {
        a.calendar = b.calendar;
    }
    if a.photos.is_none() {
        a.photos = b.photos;
    }
    if a.access_log.is_none() {
        a.access_log = b.access_log;
    }
    a
}

pub fn shell_analytics(display_name: String, file_size_bytes: u64) -> WrapAnalytics {
    AnalysisEngine::new(display_name, None, "Google Takeout".into(), file_size_bytes).finish()
}

fn detect_and_skip<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
    insights: &mut GoogleInsights,
    products: &mut BTreeSet<String>,
) {
    let mut saw_mail = false;
    let mut saw_drive = false;
    for i in 0..archive.len() {
        let Ok(file) = archive.by_index(i) else {
            continue;
        };
        let name = file.name().replace('\\', "/");
        if name.contains("Takeout/Mail/") || name.contains("/Mail/") {
            saw_mail = true;
        }
        if name.contains("Takeout/Drive/") || name.contains("/Drive/") {
            // My Activity/Drive is different
            if !name.contains("My Activity/") {
                saw_drive = true;
            }
        }
        if name.contains("YouTube and YouTube Music/") {
            products.insert("YouTube".into());
        }
        if name.contains("Chrome/") {
            products.insert("Chrome".into());
        }
        if name.contains("My Activity/") {
            products.insert("My Activity".into());
        }
        if name.contains("Fit/") {
            products.insert("Fit".into());
        }
        if name.contains("Keep/") {
            products.insert("Keep".into());
        }
        if name.contains("Calendar/") {
            products.insert("Calendar".into());
        }
        if name.contains("Google Photos/") {
            products.insert("Photos".into());
        }
        if name.contains("Access Log Activity/") {
            products.insert("Access Log".into());
        }
        let _ = should_skip_entry(&name);
    }
    if saw_mail {
        insights.skipped.push(SkippedProduct {
            reason: "Mail (.mbox) is not analyzed in this version".into(),
            path_hint: "Takeout/Mail/".into(),
        });
    }
    if saw_drive {
        insights.skipped.push(SkippedProduct {
            reason: "Drive file contents are skipped (binaries not analyzed)".into(),
            path_hint: "Takeout/Drive/".into(),
        });
    }
}

fn parse_profile_name<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
) -> Option<String> {
    let target = (0..archive.len())
        .filter_map(|i| archive.by_index(i).ok().map(|f| f.name().to_string()))
        .find(|n| n.replace('\\', "/").ends_with("Profile/Profile.json"))?;
    let mut f = archive.by_name(&target).ok()?;
    let mut buf = Vec::new();
    f.read_to_end(&mut buf).ok()?;
    let v: serde_json::Value = serde_json::from_slice(&buf).ok()?;
    if let Some(s) = v.get("displayName").and_then(|x| x.as_str()) {
        return Some(s.to_string());
    }
    v.pointer("/name/formattedName")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string())
}

fn should_skip_entry(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    if lower.contains("/mail/") && lower.ends_with(".mbox") {
        return true;
    }
    if lower.contains("/drive/") && !lower.contains("my activity") {
        // skip drive binaries; allow tiny preference files if json/txt
        if !lower.ends_with(".json") && !lower.ends_with(".txt") && !lower.ends_with(".csv") {
            return true;
        }
    }
    SKIP_EXT.iter().any(|ext| lower.ends_with(ext))
}

fn looks_like_zip(bytes: &[u8]) -> bool {
    bytes.len() >= 4 && bytes[0] == 0x50 && bytes[1] == 0x4b
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn analyze_youtube_takeout_zip() {
        let path = PathBuf::from("/home/mohsen/Downloads/takeout-20260803T132251Z-3-001.zip");
        if !path.exists() {
            return;
        }
        let data = std::fs::read(&path).unwrap();
        let result = analyze_zip_bytes_with_progress(&data, true, |_, _, _| {}).unwrap();
        let yt = result.google_insights.youtube.expect("youtube");
        assert!(yt.watch_count > 1000, "watch_count={}", yt.watch_count);
        assert!(yt.subscription_count > 0);
        assert!(!yt.top_channels.is_empty());
    }

    #[test]
    fn analyze_mixed_takeout_zip() {
        let path = PathBuf::from("/home/mohsen/Downloads/takeout-20260803T132251Z-5-001.zip");
        if !path.exists() {
            return;
        }
        let data = std::fs::read(&path).unwrap();
        let result = analyze_zip_bytes_with_progress(&data, false, |_, _, _| {}).unwrap();
        assert!(result.google_insights.chrome.is_some() || result.google_insights.my_activity.is_some() || result.google_insights.fit.is_some());
    }
}

#[cfg(test)]
mod yt_filter_tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn youtube_skips_ads_and_here() {
        let path = PathBuf::from("/home/mohsen/Downloads/takeout-20260803T132251Z-3-001.zip");
        if !path.exists() {
            return;
        }
        let data = std::fs::read(&path).unwrap();
        let result = analyze_zip_bytes_with_progress(&data, true, |_, _, _| {}).unwrap();
        let yt = result.google_insights.youtube.unwrap();
        assert!(!yt.top_videos.iter().any(|v| v.name == "here"));
        assert!(!yt.top_searches.iter().any(|v| v.name == "here"));
        assert!(!yt.top_videos.iter().any(|v| v.name == "Volvo Cars"));
        println!("watch_count={}", yt.watch_count);
        println!("search_count={}", yt.search_count);
        println!("top videos: {:?}", yt.top_videos.iter().take(8).map(|v| (&v.name, v.count)).collect::<Vec<_>>());
        println!("top searches: {:?}", yt.top_searches.iter().take(8).map(|v| (&v.name, v.count)).collect::<Vec<_>>());
    }
}
