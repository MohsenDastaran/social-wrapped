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
  /** 0–100 across both phases (each phase is half). */
  overallPercent: number
  current: number
  total: number
}

/** Maps a phase-local percent onto the full two-phase import (50% + 50%). */
export function importOverallPercent(
  phase: ImportProgressPhase,
  phasePercent: number
): number {
  const clamped = Math.min(100, Math.max(0, phasePercent))
  return Math.round(phase === "computing" ? 50 + clamped / 2 : clamped / 2)
}

export type ImportWorkerRequest = { file: File }

export type WhatsAppImportWorkerRequest =
  | { type: "file"; file: File }
  | { type: "identity"; meName: string }

export type InstagramImportWorkerRequest =
  | { type: "file"; file: File }
  | { type: "identity"; meName: string }

export type ImportWorkerResponse =
  | {
      type: "progress"
      phase: ImportProgressPhase
      current: number
      total: number
    }
  | {
      type: "need_identity"
      chatName: string
      senders: string[]
    }
  | { type: "done"; analyticsJson: string }
  | { type: "error"; message: string }

export type NeedIdentityHandler = (
  senders: string[],
  chatName: string
) => Promise<string>

function normalizeProgressPhase(value: unknown): ImportProgressPhase {
  return value === "computing" ? "computing" : "reading"
}

function validateFile(platform: PlatformConfig, file: File): void {
  const lower = file.name.toLowerCase()

  if (platform.id === "telegram") {
    if (lower.endsWith(".zip")) {
      throw new Error(
        "ZIP archives aren't supported yet. Open your Telegram export folder and choose result.json."
      )
    }
    if (!lower.endsWith(".json")) {
      throw new Error("Please choose a Telegram result.json export.")
    }
    return
  }

  if (platform.id === "whatsapp") {
    if (!lower.endsWith(".txt") && !lower.endsWith(".zip")) {
      throw new Error("Please choose a WhatsApp chat export (.txt or .zip).")
    }
    return
  }

  if (platform.id === "instagram") {
    if (!lower.endsWith(".zip")) {
      throw new Error(
        "Please choose your Instagram Meta download as a ZIP (JSON format)."
      )
    }
    return
  }

  throw new Error(
    `${platform.name} import isn't wired yet. Telegram, WhatsApp, and Instagram exports can be analyzed right now.`
  )
}

function normalizeAnalytics(analytics: WrapAnalytics): WrapAnalytics {
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
  return analytics
}

function importTelegramFile(
  file: File,
  onProgress?: (progress: ImportProgress) => void
): Promise<WrapAnalytics> {
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
        const percent =
          total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0
        onProgress?.({
          phase,
          percent,
          overallPercent: importOverallPercent(phase, percent),
          current,
          total,
        })
        return
      }

      worker.terminate()
      if (message.type === "done") {
        const analytics = JSON.parse(message.analyticsJson) as WrapAnalytics
        resolve(normalizeAnalytics(analytics))
      } else if (message.type === "error") {
        reject(new Error(message.message))
      } else {
        reject(new Error("Unexpected response from Telegram import worker."))
      }
    }

    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || "Import worker failed to start."))
    }

    worker.postMessage({ file } satisfies ImportWorkerRequest)
  })
}

function importWhatsAppFile(
  file: File,
  onProgress?: (progress: ImportProgress) => void,
  onNeedIdentity?: NeedIdentityHandler
): Promise<WrapAnalytics> {
  if (!onNeedIdentity) {
    return Promise.reject(
      new Error("WhatsApp import requires choosing which sender is you.")
    )
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/whatsapp-import.worker.ts", import.meta.url),
      { type: "module", name: "whatsapp-import" }
    )

    let settled = false

    const fail = (error: Error) => {
      if (settled) return
      settled = true
      worker.terminate()
      reject(error)
    }

    const succeed = (analytics: WrapAnalytics) => {
      if (settled) return
      settled = true
      worker.terminate()
      resolve(normalizeAnalytics(analytics))
    }

    worker.onmessage = (event: MessageEvent<ImportWorkerResponse>) => {
      const message = event.data
      if (message.type === "progress") {
        const phase = normalizeProgressPhase(message.phase)
        const { current, total } = message
        const percent =
          total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0
        onProgress?.({
          phase,
          percent,
          overallPercent: importOverallPercent(phase, percent),
          current,
          total,
        })
        return
      }

      if (message.type === "need_identity") {
        void onNeedIdentity(message.senders, message.chatName)
          .then((meName) => {
            if (settled) return
            worker.postMessage({
              type: "identity",
              meName,
            } satisfies WhatsAppImportWorkerRequest)
          })
          .catch((error: unknown) => {
            fail(
              error instanceof Error
                ? error
                : new Error("Identity selection was cancelled.")
            )
          })
        return
      }

      if (message.type === "done") {
        const analytics = JSON.parse(message.analyticsJson) as WrapAnalytics
        succeed(analytics)
        return
      }

      fail(new Error(message.message || "WhatsApp import failed."))
    }

    worker.onerror = (event) => {
      fail(new Error(event.message || "Import worker failed to start."))
    }

    worker.postMessage({
      type: "file",
      file,
    } satisfies WhatsAppImportWorkerRequest)
  })
}

function importInstagramFile(
  file: File,
  onProgress?: (progress: ImportProgress) => void,
  onNeedIdentity?: NeedIdentityHandler
): Promise<WrapAnalytics> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/instagram-import.worker.ts", import.meta.url),
      { type: "module", name: "instagram-import" }
    )

    let settled = false

    const fail = (error: Error) => {
      if (settled) return
      settled = true
      worker.terminate()
      reject(error)
    }

    const succeed = (analytics: WrapAnalytics) => {
      if (settled) return
      settled = true
      worker.terminate()
      resolve(normalizeAnalytics(analytics))
    }

    worker.onmessage = (event: MessageEvent<ImportWorkerResponse>) => {
      const message = event.data
      if (message.type === "progress") {
        const phase = normalizeProgressPhase(message.phase)
        const { current, total } = message
        const percent =
          total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0
        onProgress?.({
          phase,
          percent,
          overallPercent: importOverallPercent(phase, percent),
          current,
          total,
        })
        return
      }

      if (message.type === "need_identity") {
        if (!onNeedIdentity) {
          fail(
            new Error(
              "Could not determine which Instagram sender is you. Re-import and pick your name."
            )
          )
          return
        }
        void onNeedIdentity(message.senders, message.chatName)
          .then((meName) => {
            if (settled) return
            worker.postMessage({
              type: "identity",
              meName,
            } satisfies InstagramImportWorkerRequest)
          })
          .catch((error: unknown) => {
            fail(
              error instanceof Error
                ? error
                : new Error("Identity selection was cancelled.")
            )
          })
        return
      }

      if (message.type === "done") {
        const analytics = JSON.parse(message.analyticsJson) as WrapAnalytics
        succeed(analytics)
        return
      }

      fail(new Error(message.message || "Instagram import failed."))
    }

    worker.onerror = (event) => {
      fail(new Error(event.message || "Import worker failed to start."))
    }

    worker.postMessage({
      type: "file",
      file,
    } satisfies InstagramImportWorkerRequest)
  })
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
 *
 * For WhatsApp (and Instagram when profile Name is ambiguous),
 * `onNeedIdentity` resolves with the user's display name from the export.
 */
export function importPlatformFile(
  platform: PlatformConfig,
  file: File,
  onProgress?: (progress: ImportProgress) => void,
  onNeedIdentity?: NeedIdentityHandler
): Promise<WrapAnalytics> {
  validateFile(platform, file)

  if (platform.id === "whatsapp") {
    return importWhatsAppFile(file, onProgress, onNeedIdentity)
  }

  if (platform.id === "instagram") {
    return importInstagramFile(file, onProgress, onNeedIdentity)
  }

  return importTelegramFile(file, onProgress)
}
