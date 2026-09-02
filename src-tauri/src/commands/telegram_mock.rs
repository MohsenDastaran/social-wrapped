use app_core::mock::provider::MockDataProvider;
use app_core::parsers::telegram::summarize_export;

/// Reads the Telegram mock export and returns a plain-text statistical summary.
///
/// Looks for `telegram/result.json` under `crates/core/mock/` or
/// `crates/core/src/mock/`.
#[tauri::command]
pub fn load_telegram_mock() -> Result<String, String> {
    let mock = MockDataProvider::from_manifest_dir();
    let relative = "telegram/result.json";

    if !mock.fixture_exists(relative) {
        return Err("Mock file not found.\n\n\
             Place your Telegram export at:\n\
               crates/core/mock/telegram/result.json\n\
             or:\n\
               crates/core/src/mock/telegram/result.json"
            .to_string());
    }

    let path = mock.resolve_fixture(relative);

    summarize_export(&path)
        .map(|summary| summary.to_text_report())
        .map_err(|e| e.to_string())
}

/// Seeded 3.5-year Telegram Desktop `result.json` for the getting-started demo.
#[tauri::command]
pub fn generate_telegram_demo_json() -> Result<String, String> {
    app_core::mock::telegram_demo::generate_export_json().map_err(|e| e.to_string())
}

/// Seeded 3.5-year Instagram Meta JSON ZIP for the getting-started demo.
#[tauri::command]
pub fn generate_instagram_demo_zip() -> Result<Vec<u8>, String> {
    app_core::mock::instagram_demo::generate_export_zip().map_err(|e| e.to_string())
}
