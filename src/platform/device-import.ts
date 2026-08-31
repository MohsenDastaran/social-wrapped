import { isAndroidApp } from "@/lib/app-links"
import type { PlatformId } from "@/lib/platforms"
import type { ImportResult } from "@/platform/import"

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
  throw new Error(
    `${platformId === "sms" ? "SMS" : "Call"} analysis will read this phone locally and never upload. Native access is not in this build yet.`
  )
}
