use app_core::mock::provider::MockDataProvider;
use app_core::parsers::telegram::summarize_export;

/// Reads the Telegram mock export at `crates/core/mock/telegram/result.json`
/// and returns a plain-text statistical summary.
///
/// Returns `Err(String)` when the file is missing or cannot be parsed, so
/// Tauri surfaces a readable error message rather than panicking.
#[tauri::command]
pub fn load_telegram_mock() -> Result<String, String> {
    let mock = MockDataProvider::from_manifest_dir();
    let path = mock.resolve("telegram/result.json");

    if !path.exists() {
        return Err(format!(
            "Mock file not found.\nExpected: {}\n\nMove your Telegram export to:\n  crates/core/mock/telegram/result.json",
            path.display()
        ));
    }

    summarize_export(&path)
        .map(|summary| summary.to_text_report())
        .map_err(|e| e.to_string())
}
