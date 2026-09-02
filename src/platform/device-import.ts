import { isAndroidApp } from "@/lib/app-links"
import type { PlatformId } from "@/lib/platforms"
import type { ImportResult, WrapAnalytics } from "@/platform/import"
import { invoke } from "@tauri-apps/api/core"

/** On-device SMS / call wrap. Native ContentResolver access is Android-only. */
export async function importDevicePlatform(
  platformId: PlatformId
): Promise<ImportResult> {
  if (platformId !== "sms" && platformId !== "calls") {
    throw new Error("This platform is imported from a file, not the phone.")
  }
  if (!isAndroidApp()) {
    throw new Error(
      `${platformId === "sms" ? "SMS" : "Call"} analysis is available only in the Android app.`
    )
  }
  const analyticsJson = await invoke<string>("analyze_android_device", {
    kind: platformId,
  })
  const analytics = JSON.parse(analyticsJson) as WrapAnalytics
  if (!analytics?.account) {
    throw new Error(
      `Could not build a ${platformId === "sms" ? "SMS" : "call"} wrap from this phone.`
    )
  }
  return { analytics }
}
