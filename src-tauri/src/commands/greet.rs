#[tauri::command]
pub fn greet(name: &str) -> String {
    social_wrapped_core::greet(name)
}
