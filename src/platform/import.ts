import type { PlatformConfig } from "@/lib/platforms"
import type { WrapAnalytics } from "@/platform/analytics-types"
import { normalizeContentMix } from "@/lib/normalize-content-mix"

export type { WrapAnalytics } from "@/platform/analytics-types"
export type {
  AnalyticsResult,
  ChatResult,
  VolumeStats,
  ContentMixStats,
  MessageLengthStats,
  ResponseTimeStats,
  LateNightStats,
  InitiatorFinisherStats,
  EmojiStats,
  CircadianStats,
  HeatmapStats,
  ParticipantCount,
  EmojiEntry,
  HeatmapDay,
} from "@/platform/analytics-types"

/**
 * Legacy flat stats shape — derived from WrapAnalytics.account for components
 * that haven't been migrated yet.
 */
export type TelegramExportStats = {
  displayName: string
  username: string | null
  aboutPreview: string
  fileSizeBytes: number
  chatCount: number
  totalMessages: number
  sentMessages: number
  receivedMessages: number
  sampleMessages: string[]
}

/** Derives the legacy stats shape from a full WrapAnalytics object. */
export function analyticsToStats(a: WrapAnalytics): TelegramExportStats {
  return {
    displayName: a.displayName,
    username: a.username,
    aboutPreview: a.aboutPreview,
    fileSizeBytes: a.fileSizeBytes,
    chatCount: a.chatCount,
    totalMessages: a.account.totalMessages,
    sentMessages: a.account.sentMessages,
    receivedMessages: a.account.receivedMessages,
    sampleMessages: a.sampleMessages,
  }
}

export type ImportProgressPhase = "reading" | "computing"

export type ImportProgress = {
  phase: ImportProgressPhase
  /** 0–100 within the current phase. */
  percent: number
  current: number
  total: number
}

export type ImportWorkerRequest = { file: File }

export type ImportWorkerResponse =
  | {
      type: "progress"
      phase: ImportProgressPhase
      current: number
      total: number
    }
  | { type: "done"; analyticsJson: string }
  | { type: "error"; message: string }

function normalizeProgressPhase(value: unknown): ImportProgressPhase {
  return value === "computing" ? "computing" : "reading"
}

function validateFile(platform: PlatformConfig, file: File): void {
  if (platform.id !== "telegram") {
    throw new Error(
      `${platform.name} import isn't wired yet. Only Telegram JSON exports can be analyzed right now.`
    )
  }

  const lower = file.name.toLowerCase()
  if (lower.endsWith(".zip")) {
    throw new Error(
      "ZIP archives aren't supported yet. Open your Telegram export folder and choose result.json."
    )
  }
  if (!lower.endsWith(".json")) {
    throw new Error("Please choose a Telegram result.json export.")
  }
}

/**
 * Central entry point for importing a platform export.
 *
 * Parsing happens inside a dedicated Web Worker so the UI thread never
 * freezes, even for multi-hundred-MB exports. Works identically in the
 * browser and in Tauri webviews (Linux, Android, …) since both run the
 * same WASM parser off the main thread.
 *
 * Returns the full {@link WrapAnalytics} object.
 */
export function importPlatformFile(
  platform: PlatformConfig,
  file: File,
  onProgress?: (progress: ImportProgress) => void
): Promise<WrapAnalytics> {
  validateFile(platform, file)

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/telegram-import.worker.ts", import.meta.url),
      { type: "module", name: "telegram-import" }
    )

    worker.onmessage = (event: MessageEvent<ImportWorkerResponse>) => {
      const message = event.data
      if (message.type === "progress") {
        const phase = normalizeProgressPhase(message.phase)
        const { current, total } = message
        onProgress?.({
          phase,
          percent:
            total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0,
          current,
          total,
        })
        return
      }

      worker.terminate()
      if (message.type === "done") {
        const analytics = JSON.parse(message.analyticsJson) as WrapAnalytics
        analytics.account = {
          ...analytics.account,
          contentMix: normalizeContentMix(analytics.account),
        }
        analytics.chats = (analytics.chats ?? []).map((c) => ({
          ...c,
          analytics: {
            ...c.analytics,
            contentMix: normalizeContentMix(c.analytics),
          },
        }))
        resolve(analytics)
      } else {
        reject(new Error(message.message))
      }
    }

    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || "Import worker failed to start."))
    }

    worker.postMessage({ file } satisfies ImportWorkerRequest)
  })
}
