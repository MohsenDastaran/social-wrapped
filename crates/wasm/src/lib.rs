use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, Response};

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    app_core::greet(name)
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

/// Summarize a Telegram `result.json` already loaded in the browser (file picker).
/// Returns a camelCase JSON string matching [`TelegramExportSummary`].
#[wasm_bindgen]
pub fn summarize_telegram_bytes(data: &[u8]) -> Result<String, JsValue> {
    app_core::parsers::telegram::summarize_export_bytes(data)
        .and_then(|summary| summary.to_json())
        .map_err(|error| JsValue::from_str(&error.to_string()))
}

/// Like [`summarize_telegram_bytes`], but invokes `on_progress(bytesRead, totalBytes)`
/// as the parser consumes the input. Intended to run inside a Web Worker so the
/// synchronous parse never blocks the UI thread.
#[wasm_bindgen]
pub fn summarize_telegram_bytes_with_progress(
    data: &[u8],
    on_progress: &js_sys::Function,
) -> Result<String, JsValue> {
    app_core::parsers::telegram::summarize_export_bytes_with_progress(
        data,
        |bytes_read, total_bytes| {
            let _ = on_progress.call2(
                &JsValue::NULL,
                &JsValue::from_f64(bytes_read as f64),
                &JsValue::from_f64(total_bytes as f64),
            );
        },
    )
    .and_then(|summary| summary.to_json())
    .map_err(|error| JsValue::from_str(&error.to_string()))
}
