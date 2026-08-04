//! Google Takeout insight payload (serde camelCase ↔ TypeScript).

use serde::{Deserialize, Serialize};

use crate::analytics::collectors::{ActivityTimeSeries, HeatmapDay};

use super::series::CountedItem;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkippedProduct {
    pub reason: String,
    pub path_hint: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoogleInsights {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(default)]
    pub products_found: Vec<String>,
    #[serde(default)]
    pub skipped: Vec<SkippedProduct>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub youtube: Option<YouTubeInsights>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub chrome: Option<ChromeInsights>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub my_activity: Option<MyActivityInsights>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fit: Option<FitInsights>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub keep: Option<KeepInsights>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub calendar: Option<CalendarInsights>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub photos: Option<PhotosInsights>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub access_log: Option<AccessLogInsights>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct YouTubeInsights {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub channel_title: Option<String>,
    pub subscription_count: u64,
    pub comment_count: u64,
    pub playlist_count: u64,
    pub watch_count: u64,
    pub unique_videos: u64,
    pub search_count: u64,
    #[serde(default)]
    pub top_channels: Vec<CountedItem>,
    #[serde(default)]
    pub top_videos: Vec<CountedItem>,
    #[serde(default)]
    pub top_searches: Vec<CountedItem>,
    #[serde(default)]
    pub watch_heatmap: Vec<HeatmapDay>,
    #[serde(default)]
    pub watch_hourly: Vec<u64>,
    pub watch_activity: ActivityTimeSeries,
    #[serde(default)]
    pub search_heatmap: Vec<HeatmapDay>,
    #[serde(default)]
    pub search_hourly: Vec<u64>,
    pub search_activity: ActivityTimeSeries,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChromeInsights {
    pub visit_count: u64,
    pub unique_urls: u64,
    pub unique_domains: u64,
    #[serde(default)]
    pub top_domains: Vec<CountedItem>,
    #[serde(default)]
    pub top_titles: Vec<CountedItem>,
    #[serde(default)]
    pub heatmap: Vec<HeatmapDay>,
    #[serde(default)]
    pub hourly: Vec<u64>,
    pub activity: ActivityTimeSeries,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MyActivityProduct {
    pub name: String,
    pub event_count: u64,
    #[serde(default)]
    pub top_items: Vec<CountedItem>,
    #[serde(default)]
    pub heatmap: Vec<HeatmapDay>,
    #[serde(default)]
    pub hourly: Vec<u64>,
    pub activity: ActivityTimeSeries,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MyActivityInsights {
    pub total_events: u64,
    #[serde(default)]
    pub products: Vec<MyActivityProduct>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FitDayPoint {
    pub date: String,
    pub steps: u64,
    pub active_minutes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FitInsights {
    pub total_steps: u64,
    pub total_active_minutes: u64,
    pub activity_file_count: u64,
    #[serde(default)]
    pub activity_types: Vec<CountedItem>,
    #[serde(default)]
    pub daily: Vec<FitDayPoint>,
    pub steps_activity: ActivityTimeSeries,
    #[serde(default)]
    pub steps_heatmap: Vec<HeatmapDay>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeepInsights {
    pub note_count: u64,
    pub pinned_count: u64,
    pub archived_count: u64,
    #[serde(default)]
    pub heatmap: Vec<HeatmapDay>,
    pub activity: ActivityTimeSeries,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarInsights {
    pub event_count: u64,
    pub all_day_count: u64,
    pub timed_count: u64,
    #[serde(default)]
    pub top_summaries: Vec<CountedItem>,
    #[serde(default)]
    pub heatmap: Vec<HeatmapDay>,
    pub activity: ActivityTimeSeries,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhotosInsights {
    pub photo_count: u64,
    pub with_geo_count: u64,
    #[serde(default)]
    pub by_album: Vec<CountedItem>,
    #[serde(default)]
    pub heatmap: Vec<HeatmapDay>,
    pub activity: ActivityTimeSeries,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessLogInsights {
    pub entry_count: u64,
    #[serde(default)]
    pub top_products: Vec<CountedItem>,
    #[serde(default)]
    pub top_cities: Vec<CountedItem>,
    #[serde(default)]
    pub heatmap: Vec<HeatmapDay>,
    pub activity: ActivityTimeSeries,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoogleAnalyzeResult {
    pub analytics: crate::analytics::collectors::WrapAnalytics,
    pub google_insights: GoogleInsights,
}

impl GoogleAnalyzeResult {
    pub fn to_json(&self) -> Result<String, crate::CoreError> {
        Ok(serde_json::to_string(self)?)
    }
}
