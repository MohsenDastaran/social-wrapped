import { isTauri } from "@tauri-apps/api/core"

/** Latest desktop, Android, and other installers. */
export const DOWNLOAD_URL =
  "https://github.com/MohsenDastaran/social-wrapped/releases/latest"

/** Same release page — prefer the arm64-v8a APK on phones. */
export const ANDROID_DOWNLOAD_URL = DOWNLOAD_URL

export function isAndroidApp() {
  return isTauri() && /android/i.test(navigator.userAgent)
}

/** Open https links in the system browser (Tauri WebView ignores `target="_blank"`). */
export async function openExternalUrl(url: string) {
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener")
    await openUrl(url)
    return
  }
  window.open(url, "_blank", "noopener,noreferrer")
}
