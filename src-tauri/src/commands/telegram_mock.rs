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
        return Err(
            "Mock file not found.\n\n\
             Place your Telegram export at:\n\
               crates/core/mock/telegram/result.json\n\
             or:\n\
               crates/core/src/mock/telegram/result.json"
                .to_string(),
        );
    }

    let path = mock.resolve_fixture(relative);

    summarize_export(&path)
        .map(|summary| summary.to_text_report())
        .map_err(|e| e.to_string())
}
