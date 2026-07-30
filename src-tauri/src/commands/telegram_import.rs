use app_core::parsers::telegram::summarize_export_bytes;

/// Summarize a Telegram export from raw JSON bytes (from the file picker).
/// Returns camelCase JSON for the frontend stats UI.
#[tauri::command]
pub fn summarize_telegram_bytes(bytes: Vec<u8>) -> Result<String, String> {
    summarize_export_bytes(&bytes)
        .and_then(|summary| summary.to_json())
        .map_err(|e| e.to_string())
}
