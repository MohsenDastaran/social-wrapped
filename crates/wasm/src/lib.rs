use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, Response};

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    app_core::greet(name)
}

/// Seeded two-year Telegram Desktop `result.json` for the getting-started demo.
#[wasm_bindgen]
pub fn generate_telegram_demo_json() -> Result<String, JsValue> {
    app_core::mock::telegram_demo::generate_export_json()
        .map_err(|error| JsValue::from_str(&error.to_string()))
}

/// Fetches the Telegram mock export from the Vite dev server and returns a summary.
#[wasm_bindgen]
pub async fn load_telegram_mock() -> Result<String, JsValue> {
    const MOCK_URL: &str = "/mock/telegram/result.json";

    let opts = RequestInit::new();
    opts.set_method("GET");

    let request = Request::new_with_str_and_init(MOCK_URL, &opts)
        .map_err(|_| JsValue::from_str("Failed to create fetch request"))?;

    let window = web_sys::window().ok_or_else(|| JsValue::from_str("No window"))?;
    let response_value = JsFuture::from(window.fetch_with_request(&request)).await?;
    let response: Response = response_value
        .dyn_into()
        .map_err(|_| JsValue::from_str("Invalid fetch response"))?;

    if !response.ok() {
        return Err(JsValue::from_str(
            "Mock file not found.\n\n\
             Place your Telegram export at:\n\
               crates/core/mock/telegram/result.json\n\
             or:\n\
               crates/core/src/mock/telegram/result.json",
        ));
    }

    let buffer = JsFuture::from(
        response
            .array_buffer()
            .map_err(|_| JsValue::from_str("Failed to read mock file"))?,
    )
    .await?;

    let bytes = js_sys::Uint8Array::new(&buffer).to_vec();
    let file_size_bytes = bytes.len() as u64;
    let reader = std::io::Cursor::new(bytes);

    app_core::parsers::telegram::summarize_export_from_reader(reader, Some(file_size_bytes))
        .map(|summary| summary.to_text_report())
        .map_err(|error| JsValue::from_str(&error.to_string()))
}

/// Summarise a Telegram `result.json` already loaded in the browser (legacy API).
#[wasm_bindgen]
pub fn summarize_telegram_bytes(data: &[u8]) -> Result<String, JsValue> {
    app_core::parsers::telegram::summarize_export_bytes(data)
        .and_then(|s| s.to_json())
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Like [`summarize_telegram_bytes`], but invokes
/// `on_progress(phase, current, total)` (`phase` is `"reading"` | `"computing"`).
/// Returns the legacy basic-stats JSON (backward compat for old workers).
#[wasm_bindgen]
pub fn summarize_telegram_bytes_with_progress(
    data: &[u8],
    on_progress: &js_sys::Function,
) -> Result<String, JsValue> {
    app_core::parsers::telegram::summarize_export_bytes_with_progress(
        data,
        |phase, current, total| {
            let _ = on_progress.call3(
                &JsValue::NULL,
                &JsValue::from_str(phase.as_str()),
                &JsValue::from_f64(current as f64),
                &JsValue::from_f64(total as f64),
            );
        },
    )
    .and_then(|s| s.to_json())
    .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Full analytics pass — returns the complete [`WrapAnalytics`] JSON.
///
/// Invokes `on_progress(phase, current, total)` in two phases:
/// - `"reading"` — JSON deserialize progress (bytes)
/// - `"computing"` — stats collection progress (messages)
///
/// This is the primary function called by the import worker.
#[wasm_bindgen]
pub fn analyze_telegram_bytes_with_progress(
    data: &[u8],
    on_progress: &js_sys::Function,
) -> Result<String, JsValue> {
    app_core::parsers::telegram::analyze_export_bytes_with_progress(
        data,
        |phase, current, total| {
            let _ = on_progress.call3(
                &JsValue::NULL,
                &JsValue::from_str(phase.as_str()),
                &JsValue::from_f64(current as f64),
                &JsValue::from_f64(total as f64),
            );
        },
    )
    .and_then(|analytics| {
        serde_json::to_string(&analytics).map_err(app_core::CoreError::from)
    })
    .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Scan a WhatsApp `.txt` / ZIP export and return preview JSON
/// (`chatName`, `senders`, `messageCount`, `fileSizeBytes`, `isAccountReport?`).
#[wasm_bindgen]
pub fn preview_whatsapp_bytes(
    data: &[u8],
    file_name: Option<String>,
) -> Result<String, JsValue> {
    app_core::parsers::whatsapp::preview_export_bytes(data, file_name.as_deref())
        .and_then(|preview| preview.to_json())
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Full WhatsApp analytics pass (chat or Account Information report).
///
/// Returns JSON `{ analytics, whatsappInsights? }`. Account reports skip
/// identity (`me_name` may be empty). Invokes `on_progress` with
/// `"reading"` | `"computing"`.
#[wasm_bindgen]
pub fn analyze_whatsapp_bytes_with_progress(
    data: &[u8],
    me_name: &str,
    file_name: Option<String>,
    on_progress: &js_sys::Function,
) -> Result<String, JsValue> {
    app_core::parsers::whatsapp::analyze_export_bytes_with_progress(
        data,
        me_name,
        file_name.as_deref(),
        |phase, current, total| {
            let _ = on_progress.call3(
                &JsValue::NULL,
                &JsValue::from_str(phase.as_str()),
                &JsValue::from_f64(current as f64),
                &JsValue::from_f64(total as f64),
            );
        },
    )
    .and_then(|result| result.to_json())
    .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Scan an Instagram Meta ZIP and return preview JSON
/// (`displayName`, `username`, `suggestedMe`, `senders`, …).
#[wasm_bindgen]
pub fn preview_instagram_bytes(data: &[u8]) -> Result<String, JsValue> {
    app_core::parsers::instagram::preview_export_bytes(data)
        .and_then(|preview| preview.to_json())
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Full Instagram analytics pass.
///
/// Returns JSON `{ analytics, instagramSocial }` (messaging + outbound social).
/// `me_name` may be omitted when the profile Name already matches senders.
/// Invokes `on_progress(phase, current, total)` with `"reading"` | `"computing"`.
#[wasm_bindgen]
pub fn analyze_instagram_bytes_with_progress(
    data: &[u8],
    me_name: Option<String>,
    on_progress: &js_sys::Function,
) -> Result<String, JsValue> {
    let me = me_name
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());
    app_core::parsers::instagram::analyze_export_bytes_with_progress(
        data,
        me,
        |phase, current, total| {
            let _ = on_progress.call3(
                &JsValue::NULL,
                &JsValue::from_str(phase.as_str()),
                &JsValue::from_f64(current as f64),
                &JsValue::from_f64(total as f64),
            );
        },
    )
    .and_then(|result| result.to_json())
    .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Scan a LinkedIn complete-export ZIP and return preview JSON
/// (`displayName`, `suggestedMe`, `senders`, …).
#[wasm_bindgen]
pub fn preview_linkedin_bytes(data: &[u8]) -> Result<String, JsValue> {
    app_core::parsers::linkedin::preview_export_bytes(data)
        .and_then(|preview| preview.to_json())
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Full LinkedIn analytics pass.
///
/// Returns JSON `{ analytics, linkedinInsights }` (messaging + career/network).
/// `me_name` may be omitted when Profile.csv Name matches message senders.
#[wasm_bindgen]
pub fn analyze_linkedin_bytes_with_progress(
    data: &[u8],
    me_name: Option<String>,
    on_progress: &js_sys::Function,
) -> Result<String, JsValue> {
    let me = me_name
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());
    app_core::parsers::linkedin::analyze_export_bytes_with_progress(
        data,
        me,
        |phase, current, total| {
            let _ = on_progress.call3(
                &JsValue::NULL,
                &JsValue::from_str(phase.as_str()),
                &JsValue::from_f64(current as f64),
                &JsValue::from_f64(total as f64),
            );
        },
    )
    .and_then(|result| result.to_json())
    .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Scan an X (Twitter) archive ZIP and return preview JSON.
#[wasm_bindgen]
pub fn preview_x_bytes(data: &[u8]) -> Result<String, JsValue> {
    app_core::parsers::x::preview_export_bytes(data)
        .and_then(|preview| preview.to_json())
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Full X analytics pass.
///
/// Returns JSON `{ analytics, xInsights }` (DMs + tweets/likes/network).
#[wasm_bindgen]
pub fn analyze_x_bytes_with_progress(
    data: &[u8],
    on_progress: &js_sys::Function,
) -> Result<String, JsValue> {
    app_core::parsers::x::analyze_export_bytes_with_progress(data, |phase, current, total| {
        let _ = on_progress.call3(
            &JsValue::NULL,
            &JsValue::from_str(phase.as_str()),
            &JsValue::from_f64(current as f64),
            &JsValue::from_f64(total as f64),
        );
    })
    .and_then(|result| result.to_json())
    .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Scan a ChatGPT data-export ZIP and return preview JSON.
#[wasm_bindgen]
pub fn preview_chatgpt_bytes(data: &[u8]) -> Result<String, JsValue> {
    app_core::parsers::chatgpt::preview_export_bytes(data)
        .and_then(|preview| preview.to_json())
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Full ChatGPT analytics pass.
///
/// Returns JSON `{ analytics, chatgptInsights }` (conversations + models).
#[wasm_bindgen]
pub fn analyze_chatgpt_bytes_with_progress(
    data: &[u8],
    on_progress: &js_sys::Function,
) -> Result<String, JsValue> {
    app_core::parsers::chatgpt::analyze_export_bytes_with_progress(
        data,
        |phase, current, total| {
            let _ = on_progress.call3(
                &JsValue::NULL,
                &JsValue::from_str(phase.as_str()),
                &JsValue::from_f64(current as f64),
                &JsValue::from_f64(total as f64),
            );
        },
    )
    .and_then(|result| result.to_json())
    .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Scan a TikTok TXT data-download ZIP and return preview JSON.
#[wasm_bindgen]
pub fn preview_tiktok_bytes(data: &[u8]) -> Result<String, JsValue> {
    app_core::parsers::tiktok::preview_export_bytes(data)
        .and_then(|preview| preview.to_json())
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Full TikTok analytics pass.
///
/// Returns JSON `{ analytics, tiktokInsights }` (activity + DMs).
/// `me_name` may be omitted when Profile username matches DM senders.
#[wasm_bindgen]
pub fn analyze_tiktok_bytes_with_progress(
    data: &[u8],
    me_name: Option<String>,
    on_progress: &js_sys::Function,
) -> Result<String, JsValue> {
    let me = me_name
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());
    app_core::parsers::tiktok::analyze_export_bytes_with_progress(
        data,
        me,
        |phase, current, total| {
            let _ = on_progress.call3(
                &JsValue::NULL,
                &JsValue::from_str(phase.as_str()),
                &JsValue::from_f64(current as f64),
                &JsValue::from_f64(total as f64),
            );
        },
    )
    .and_then(|result| result.to_json())
    .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Scan a Spotify Account Data / Extended History ZIP (or streaming JSON) and return preview JSON.
#[wasm_bindgen]
pub fn preview_spotify_bytes(data: &[u8]) -> Result<String, JsValue> {
    app_core::parsers::spotify::preview_export_bytes(data)
        .and_then(|preview| preview.to_json())
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Full Spotify analytics pass.
///
/// Returns JSON `{ analytics, spotifyInsights }` (listening insights; empty messaging shell).
#[wasm_bindgen]
pub fn analyze_spotify_bytes_with_progress(
    data: &[u8],
    on_progress: &js_sys::Function,
) -> Result<String, JsValue> {
    app_core::parsers::spotify::analyze_export_bytes_with_progress(data, |phase, current, total| {
        let _ = on_progress.call3(
            &JsValue::NULL,
            &JsValue::from_str(phase.as_str()),
            &JsValue::from_f64(current as f64),
            &JsValue::from_f64(total as f64),
        );
    })
    .and_then(|result| result.to_json())
    .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Scan an Apple Music Library.xml export and return preview JSON.
#[wasm_bindgen]
pub fn preview_apple_music_bytes(data: &[u8]) -> Result<String, JsValue> {
    app_core::parsers::apple_music::preview_export_bytes(data)
        .and_then(|preview| preview.to_json())
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Full Apple Music Library.xml analytics pass.
///
/// Returns JSON `{ analytics, appleMusicInsights }` (library insights; empty messaging shell).
#[wasm_bindgen]
pub fn analyze_apple_music_bytes_with_progress(
    data: &[u8],
    on_progress: &js_sys::Function,
) -> Result<String, JsValue> {
    app_core::parsers::apple_music::analyze_export_bytes_with_progress(data, |phase, current, total| {
        let _ = on_progress.call3(
            &JsValue::NULL,
            &JsValue::from_str(phase.as_str()),
            &JsValue::from_f64(current as f64),
            &JsValue::from_f64(total as f64),
        );
    })
    .and_then(|result| result.to_json())
    .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Analyze one Google Takeout ZIP part.
///
/// Returns JSON `{ analytics, googleInsights }`.
/// When `youtube_only` is true, only YouTube products are parsed.
#[wasm_bindgen]
pub fn analyze_google_zip_bytes_with_progress(
    data: &[u8],
    youtube_only: bool,
    on_progress: &js_sys::Function,
) -> Result<String, JsValue> {
    app_core::parsers::google::analyze_zip_bytes_with_progress(
        data,
        youtube_only,
        |phase, current, total| {
            let _ = on_progress.call3(
                &JsValue::NULL,
                &JsValue::from_str(phase.as_str()),
                &JsValue::from_f64(current as f64),
                &JsValue::from_f64(total as f64),
            );
        },
    )
    .and_then(|result| result.to_json())
    .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Merge two `GoogleInsights` JSON objects (multi-part Takeout).
#[wasm_bindgen]
pub fn merge_google_insights_json(a: &str, b: &str) -> Result<String, JsValue> {
    let left: app_core::parsers::google::GoogleInsights = serde_json::from_str(a)
        .map_err(|e| JsValue::from_str(&format!("Invalid google insights A: {e}")))?;
    let right: app_core::parsers::google::GoogleInsights = serde_json::from_str(b)
        .map_err(|e| JsValue::from_str(&format!("Invalid google insights B: {e}")))?;
    let merged = app_core::parsers::google::merge_insights(left, right);
    serde_json::to_string(&merged).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Build wrap shell analytics JSON for a merged Google insights payload.
#[wasm_bindgen]
pub fn google_shell_analytics_json(
    display_name: &str,
    file_size_bytes: u64,
) -> Result<String, JsValue> {
    let analytics =
        app_core::parsers::google::shell_analytics(display_name.to_string(), file_size_bytes);
    serde_json::to_string(&analytics).map_err(|e| JsValue::from_str(&e.to_string()))
}
