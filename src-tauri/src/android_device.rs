//! Android SMS / call-log plugin — Kotlin ContentResolver, Rust analytics.

use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

#[cfg(target_os = "android")]
use serde::{Deserialize, Serialize};
#[cfg(target_os = "android")]
use tauri::{plugin::PluginHandle, Manager};

#[cfg(target_os = "android")]
pub struct DeviceInbox<R: Runtime>(PluginHandle<R>);

#[cfg(target_os = "android")]
#[derive(Serialize)]
struct ReadInboxArgs {
    kind: String,
}

#[cfg(target_os = "android")]
#[derive(Deserialize)]
struct ReadInboxResponse {
    payload: String,
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("device-inbox")
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            {
                let handle = api.register_android_plugin(
                    "com.mohsendastaran.social_wrapped",
                    "DeviceInboxPlugin",
                )?;
                app.manage(DeviceInbox(handle));
            }
            #[cfg(not(target_os = "android"))]
            {
                let _ = (app, api);
            }
            Ok(())
        })
        .build()
}

#[tauri::command]
pub async fn analyze_android_device<R: Runtime>(
    app: tauri::AppHandle<R>,
    kind: String,
) -> Result<String, String> {
    let kind = kind.trim().to_ascii_lowercase();
    if kind != "sms" && kind != "calls" {
        return Err("Unknown on-device source. Use SMS or calls.".into());
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        let label = if kind == "calls" { "Call" } else { "SMS" };
        return Err(format!(
            "{label} analysis is available only in the Android app."
        ));
    }

    #[cfg(target_os = "android")]
    {
        let plugin = app.state::<DeviceInbox<R>>();
        let response: ReadInboxResponse = plugin
            .0
            .run_mobile_plugin_async("readInbox", ReadInboxArgs { kind: kind.clone() })
            .await
            .map_err(|err| err.to_string())?;

        let analytics = app_core::parsers::android_device::analyze_json(&response.payload)
            .map_err(|err| err.to_string())?;
        serde_json::to_string(&analytics).map_err(|err| err.to_string())
    }
}
