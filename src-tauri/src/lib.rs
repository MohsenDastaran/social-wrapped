mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::greet::greet,
            commands::telegram_mock::load_telegram_mock,
            commands::telegram_import::summarize_telegram_bytes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
