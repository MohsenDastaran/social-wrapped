#[tauri::command]
pub fn greet(name: &str) -> String {
    app_core::greet(name)
}
