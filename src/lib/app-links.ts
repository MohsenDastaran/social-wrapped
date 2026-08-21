import { isTauri } from "@tauri-apps/api/core"

/** Latest desktop, Android, and other installers. */
export const DOWNLOAD_URL =
  "https://github.com/MohsenDastaran/social-wrapped/releases/latest"

/** Same release page — prefer the arm64-v8a APK on phones. */
export const ANDROID_DOWNLOAD_URL = DOWNLOAD_URL

export function isAndroidApp() {
  return isTauri() && /android/i.test(navigator.userAgent)
}
