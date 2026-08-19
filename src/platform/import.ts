import type { PlatformConfig } from "@/lib/platforms"
import type {
  InstagramSocialInsights,
  WrapAnalytics,
} from "@/platform/analytics-types"
import type { GoogleInsights } from "@/platform/google-types"
import type { LinkedInInsights } from "@/platform/linkedin-types"
import type { AppleMusicInsights } from "@/platform/apple-music-types"
import type { SpotifyInsights } from "@/platform/spotify-types"
import type { TikTokInsights } from "@/platform/tiktok-types"
import {
  normalizeFacebookInsights,
  type FacebookInsights,
} from "@/platform/facebook-types"
import { normalizeXInsights, type XInsights } from "@/platform/x-types"
import {
  normalizeChatGptInsights,
  type ChatGptInsights,
} from "@/platform/chatgpt-types"
import {
  normalizeWhatsAppInsights,
  type WhatsAppInsights,
} from "@/platform/whatsapp-types"
import { normalizeContentMix } from "@/lib/normalize-content-mix"

export type { WrapAnalytics, InstagramSocialInsights } from "@/platform/analytics-types"
export type { GoogleInsights } from "@/platform/google-types"
export type { LinkedInInsights } from "@/platform/linkedin-types"
export type { AppleMusicInsights } from "@/platform/apple-music-types"
export type { SpotifyInsights } from "@/platform/spotify-types"
export type { TikTokInsights } from "@/platform/tiktok-types"
export type { FacebookInsights } from "@/platform/facebook-types"
export type { XInsights } from "@/platform/x-types"
export type { ChatGptInsights } from "@/platform/chatgpt-types"
export type { WhatsAppInsights } from "@/platform/whatsapp-types"

/** Result of a platform import pass (side insights for IG / Facebook / Google / LinkedIn / X / TikTok / Spotify / WA account). */
export type ImportResult = {
  analytics: WrapAnalytics
  instagramSocial?: InstagramSocialInsights
  googleInsights?: GoogleInsights
  linkedinInsights?: LinkedInInsights
  xInsights?: XInsights
  chatgptInsights?: ChatGptInsights
  tiktokInsights?: TikTokInsights
  facebookInsights?: FacebookInsights
  spotifyInsights?: SpotifyInsights
  appleMusicInsights?: AppleMusicInsights
  whatsappInsights?: WhatsAppInsights
}
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

export type LinkedInImportWorkerRequest =
  | { type: "file"; file: File }
  | { type: "identity"; meName: string }

export type TikTokImportWorkerRequest =
  | { type: "file"; file: File }
  | { type: "identity"; meName: string }

export type FacebookImportWorkerRequest =
  | { type: "file"; file: File }
  | { type: "identity"; meName: string }

export type SpotifyImportWorkerRequest =
  | { type: "file"; file: File }
  | { type: "files"; files: File[] }

export type AppleMusicImportWorkerRequest = { type: "file"; file: File }

export type XImportWorkerRequest = { type: "file"; file: File }

export type ChatGptImportWorkerRequest = { type: "file"; file: File }

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
      throw new Error(
        "Please choose a WhatsApp chat export (.txt or .zip) or an Account information report ZIP."
      )
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

  if (platform.id === "facebook") {
    if (!lower.endsWith(".zip")) {
      throw new Error(
        "Please choose your Facebook Download Your Information ZIP (JSON format)."
      )
    }
    return
  }

  if (platform.id === "linkedin") {
    if (!lower.endsWith(".zip")) {
      throw new Error(
        "Please choose your LinkedIn complete data export as a ZIP."
      )
    }
    return
  }

  if (platform.id === "x") {
    if (!lower.endsWith(".zip")) {
      throw new Error(
        "Please choose your X (Twitter) data archive as a ZIP."
      )
    }
    return
  }

  if (platform.id === "chatgpt") {
    if (!lower.endsWith(".zip")) {
      throw new Error("Please choose your ChatGPT data export as a ZIP.")
    }
    return
  }

  if (platform.id === "tiktok") {
    if (!lower.endsWith(".zip")) {
      throw new Error(
        "Please choose your TikTok data download as a ZIP (TXT format)."
      )
    }
    return
  }

  if (platform.id === "spotify") {
    if (!lower.endsWith(".zip") && !lower.endsWith(".json")) {
      throw new Error(
        "Please choose your Spotify Account Data ZIP, or StreamingHistory / Streaming_History JSON file(s)."
      )
    }
    return
  }

  if (platform.id === "apple-music") {
    if (!lower.endsWith(".xml")) {
      throw new Error("Please choose your Music app Library.xml export.")
    }
    return
  }

  if (platform.id === "google" || platform.id === "youtube") {
    if (!lower.endsWith(".zip")) {
      throw new Error(
        "Please choose Google Takeout archive ZIP(s). Multi-part downloads are supported."
      )
    }
    return
  }

  throw new Error(
    `${platform.name} import isn't wired yet. Telegram, WhatsApp, Instagram, Facebook, LinkedIn, X, ChatGPT, TikTok, Spotify, Apple Music, Google, and YouTube exports can be analyzed right now.`
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
): Promise<ImportResult> {
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
        resolve({ analytics: normalizeAnalytics(analytics) })
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

function parseWhatsAppAnalyzeJson(analyticsJson: string): ImportResult {
  const payload = JSON.parse(analyticsJson) as {
    analytics?: WrapAnalytics
    whatsappInsights?: WhatsAppInsights
  }

  // Chat path historically returned bare WrapAnalytics; accept both shapes.
  if (payload.analytics?.account) {
    return {
      analytics: normalizeAnalytics(payload.analytics),
      whatsappInsights: payload.whatsappInsights
        ? normalizeWhatsAppInsights(payload.whatsappInsights)
        : undefined,
    }
  }

  const bare = payload as unknown as WrapAnalytics
  if (bare?.account) {
    return { analytics: normalizeAnalytics(bare) }
  }

  throw new Error("WhatsApp import returned incomplete analytics.")
}

function importWhatsAppFile(
  file: File,
  onProgress?: (progress: ImportProgress) => void,
  onNeedIdentity?: NeedIdentityHandler
): Promise<ImportResult> {
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

    const succeed = (result: ImportResult) => {
      if (settled) return
      settled = true
      worker.terminate()
      resolve(result)
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
              "WhatsApp chat import requires choosing which sender is you."
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
        try {
          succeed(parseWhatsAppAnalyzeJson(message.analyticsJson))
        } catch (error) {
          fail(
            error instanceof Error
              ? error
              : new Error("WhatsApp import returned invalid analytics.")
          )
        }
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

function parseInstagramAnalyzeJson(analyticsJson: string): ImportResult {
  const payload = JSON.parse(analyticsJson) as {
    analytics?: WrapAnalytics
    instagramSocial?: InstagramSocialInsights
  } & Partial<WrapAnalytics>

  // New shape: { analytics, instagramSocial }. Legacy: bare WrapAnalytics.
  if (payload.analytics?.account != null) {
    return {
      analytics: normalizeAnalytics(payload.analytics),
      instagramSocial: payload.instagramSocial,
    }
  }

  return {
    analytics: normalizeAnalytics(payload as WrapAnalytics),
  }
}

function parseLinkedInAnalyzeJson(analyticsJson: string): ImportResult {
  const payload = JSON.parse(analyticsJson) as {
    analytics?: WrapAnalytics
    linkedinInsights?: LinkedInInsights
  }

  if (!payload.analytics?.account) {
    throw new Error("LinkedIn import returned incomplete analytics.")
  }

  return {
    analytics: normalizeAnalytics(payload.analytics),
    linkedinInsights: payload.linkedinInsights,
  }
}

function importInstagramFile(
  file: File,
  onProgress?: (progress: ImportProgress) => void,
  onNeedIdentity?: NeedIdentityHandler
): Promise<ImportResult> {
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

    const succeed = (result: ImportResult) => {
      if (settled) return
      settled = true
      worker.terminate()
      resolve(result)
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
        succeed(parseInstagramAnalyzeJson(message.analyticsJson))
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

function parseFacebookAnalyzeJson(analyticsJson: string): ImportResult {
  const payload = JSON.parse(analyticsJson) as {
    analytics?: WrapAnalytics
    facebookInsights?: FacebookInsights
  }

  if (!payload.analytics?.account) {
    throw new Error("Facebook import returned incomplete analytics.")
  }

  return {
    analytics: normalizeAnalytics(payload.analytics),
    facebookInsights: normalizeFacebookInsights(payload.facebookInsights),
  }
}

function importFacebookFile(
  file: File,
  onProgress?: (progress: ImportProgress) => void,
  onNeedIdentity?: NeedIdentityHandler
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/facebook-import.worker.ts", import.meta.url),
      { type: "module", name: "facebook-import" }
    )

    let settled = false

    const fail = (error: Error) => {
      if (settled) return
      settled = true
      worker.terminate()
      reject(error)
    }

    const succeed = (result: ImportResult) => {
      if (settled) return
      settled = true
      worker.terminate()
      resolve(result)
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
              "Could not determine which Facebook sender is you. Re-import and pick your name."
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
            } satisfies FacebookImportWorkerRequest)
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
        try {
          succeed(parseFacebookAnalyzeJson(message.analyticsJson))
        } catch (error) {
          fail(
            error instanceof Error ? error : new Error(String(error))
          )
        }
        return
      }

      fail(new Error(message.message || "Facebook import failed."))
    }

    worker.onerror = (event) => {
      fail(new Error(event.message || "Import worker failed to start."))
    }

    worker.postMessage({
      type: "file",
      file,
    } satisfies FacebookImportWorkerRequest)
  })
}

function importLinkedInFile(
  file: File,
  onProgress?: (progress: ImportProgress) => void,
  onNeedIdentity?: NeedIdentityHandler
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/linkedin-import.worker.ts", import.meta.url),
      { type: "module", name: "linkedin-import" }
    )

    let settled = false

    const fail = (error: Error) => {
      if (settled) return
      settled = true
      worker.terminate()
      reject(error)
    }

    const succeed = (result: ImportResult) => {
      if (settled) return
      settled = true
      worker.terminate()
      resolve(result)
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
              "Could not determine which LinkedIn sender is you. Re-import and pick your name."
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
            } satisfies LinkedInImportWorkerRequest)
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
        try {
          succeed(parseLinkedInAnalyzeJson(message.analyticsJson))
        } catch (error) {
          fail(
            error instanceof Error ? error : new Error(String(error))
          )
        }
        return
      }

      fail(new Error(message.message || "LinkedIn import failed."))
    }

    worker.onerror = (event) => {
      fail(new Error(event.message || "Import worker failed to start."))
    }

    worker.postMessage({
      type: "file",
      file,
    } satisfies LinkedInImportWorkerRequest)
  })
}

function parseTikTokAnalyzeJson(analyticsJson: string): ImportResult {
  const payload = JSON.parse(analyticsJson) as {
    analytics?: WrapAnalytics
    tiktokInsights?: TikTokInsights
  }

  if (!payload.analytics?.account) {
    throw new Error("TikTok import returned incomplete analytics.")
  }

  return {
    analytics: normalizeAnalytics(payload.analytics),
    tiktokInsights: payload.tiktokInsights,
  }
}

function importTikTokFile(
  file: File,
  onProgress?: (progress: ImportProgress) => void,
  onNeedIdentity?: NeedIdentityHandler
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/tiktok-import.worker.ts", import.meta.url),
      { type: "module", name: "tiktok-import" }
    )

    let settled = false

    const fail = (error: Error) => {
      if (settled) return
      settled = true
      worker.terminate()
      reject(error)
    }

    const succeed = (result: ImportResult) => {
      if (settled) return
      settled = true
      worker.terminate()
      resolve(result)
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
              "Could not determine which TikTok sender is you. Re-import and pick your username."
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
            } satisfies TikTokImportWorkerRequest)
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
        try {
          succeed(parseTikTokAnalyzeJson(message.analyticsJson))
        } catch (error) {
          fail(
            error instanceof Error ? error : new Error(String(error))
          )
        }
        return
      }

      fail(new Error(message.message || "TikTok import failed."))
    }

    worker.onerror = (event) => {
      fail(new Error(event.message || "Import worker failed to start."))
    }

    worker.postMessage({
      type: "file",
      file,
    } satisfies TikTokImportWorkerRequest)
  })
}

function parseSpotifyAnalyzeJson(analyticsJson: string): ImportResult {
  const payload = JSON.parse(analyticsJson) as {
    analytics?: WrapAnalytics
    spotifyInsights?: SpotifyInsights
  }

  if (!payload.analytics?.account) {
    throw new Error("Spotify import returned incomplete analytics.")
  }

  return {
    analytics: normalizeAnalytics(payload.analytics),
    spotifyInsights: payload.spotifyInsights,
  }
}

function parseAppleMusicAnalyzeJson(analyticsJson: string): ImportResult {
  const payload = JSON.parse(analyticsJson) as {
    analytics?: WrapAnalytics
    appleMusicInsights?: AppleMusicInsights
  }

  if (!payload.analytics?.account) {
    throw new Error("Apple Music import returned incomplete analytics.")
  }

  return {
    analytics: normalizeAnalytics(payload.analytics),
    appleMusicInsights: payload.appleMusicInsights,
  }
}

function importSpotifyFiles(
  files: File[],
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/spotify-import.worker.ts", import.meta.url),
      { type: "module", name: "spotify-import" }
    )

    let settled = false

    const fail = (error: Error) => {
      if (settled) return
      settled = true
      worker.terminate()
      reject(error)
    }

    const succeed = (result: ImportResult) => {
      if (settled) return
      settled = true
      worker.terminate()
      resolve(result)
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

      if (message.type === "done") {
        try {
          succeed(parseSpotifyAnalyzeJson(message.analyticsJson))
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)))
        }
        return
      }

      if (message.type === "error") {
        fail(new Error(message.message || "Spotify import failed."))
        return
      }

      fail(new Error("Unexpected Spotify import response."))
    }

    worker.onerror = (event) => {
      fail(new Error(event.message || "Import worker failed to start."))
    }

    worker.postMessage({
      type: "files",
      files,
    } satisfies SpotifyImportWorkerRequest)
  })
}

function importAppleMusicFile(
  file: File,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/apple-music-import.worker.ts", import.meta.url),
      { type: "module", name: "apple-music-import" }
    )

    let settled = false

    const fail = (error: Error) => {
      if (settled) return
      settled = true
      worker.terminate()
      reject(error)
    }

    const succeed = (result: ImportResult) => {
      if (settled) return
      settled = true
      worker.terminate()
      resolve(result)
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

      if (message.type === "done") {
        try {
          succeed(parseAppleMusicAnalyzeJson(message.analyticsJson))
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)))
        }
        return
      }

      if (message.type === "error") {
        fail(new Error(message.message || "Apple Music import failed."))
        return
      }

      fail(new Error("Unexpected Apple Music import response."))
    }

    worker.onerror = (event) => {
      fail(new Error(event.message || "Import worker failed to start."))
    }

    worker.postMessage({
      type: "file",
      file,
    } satisfies AppleMusicImportWorkerRequest)
  })
}

function parseXAnalyzeJson(analyticsJson: string): ImportResult {
  const payload = JSON.parse(analyticsJson) as {
    analytics?: WrapAnalytics
    xInsights?: XInsights
  }

  if (!payload.analytics?.account) {
    throw new Error("X import returned incomplete analytics.")
  }

  return {
    analytics: normalizeAnalytics(payload.analytics),
    xInsights: payload.xInsights
      ? normalizeXInsights(payload.xInsights)
      : undefined,
  }
}

function importXFile(
  file: File,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/x-import.worker.ts", import.meta.url),
      { type: "module", name: "x-import" }
    )

    let settled = false

    const fail = (error: Error) => {
      if (settled) return
      settled = true
      worker.terminate()
      reject(error)
    }

    const succeed = (result: ImportResult) => {
      if (settled) return
      settled = true
      worker.terminate()
      resolve(result)
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

      if (message.type === "done") {
        try {
          succeed(parseXAnalyzeJson(message.analyticsJson))
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)))
        }
        return
      }

      if (message.type === "error") {
        fail(new Error(message.message || "X import failed."))
        return
      }

      fail(new Error("Unexpected X import response."))
    }

    worker.onerror = (event) => {
      fail(new Error(event.message || "Import worker failed to start."))
    }

    worker.postMessage({
      type: "file",
      file,
    } satisfies XImportWorkerRequest)
  })
}

function parseChatGptAnalyzeJson(analyticsJson: string): ImportResult {
  const payload = JSON.parse(analyticsJson) as {
    analytics?: WrapAnalytics
    chatgptInsights?: ChatGptInsights
  }

  if (!payload.analytics?.account) {
    throw new Error("ChatGPT import returned incomplete analytics.")
  }

  return {
    analytics: normalizeAnalytics(payload.analytics),
    chatgptInsights: payload.chatgptInsights
      ? normalizeChatGptInsights(payload.chatgptInsights)
      : undefined,
  }
}

function importChatGptFile(
  file: File,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/chatgpt-import.worker.ts", import.meta.url),
      { type: "module", name: "chatgpt-import" }
    )

    let settled = false

    const fail = (error: Error) => {
      if (settled) return
      settled = true
      worker.terminate()
      reject(error)
    }

    const succeed = (result: ImportResult) => {
      if (settled) return
      settled = true
      worker.terminate()
      resolve(result)
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

      if (message.type === "done") {
        try {
          succeed(parseChatGptAnalyzeJson(message.analyticsJson))
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)))
        }
        return
      }

      if (message.type === "error") {
        fail(new Error(message.message || "ChatGPT import failed."))
        return
      }

      fail(new Error("Unexpected ChatGPT import response."))
    }

    worker.onerror = (event) => {
      fail(new Error(event.message || "Import worker failed to start."))
    }

    worker.postMessage({
      type: "file",
      file,
    } satisfies ChatGptImportWorkerRequest)
  })
}

function parseGoogleAnalyzeJson(analyticsJson: string): ImportResult {
  const payload = JSON.parse(analyticsJson) as {
    analytics?: WrapAnalytics
    googleInsights?: GoogleInsights
  }

  if (!payload.analytics?.account) {
    throw new Error("Google import returned incomplete analytics.")
  }

  return {
    analytics: normalizeAnalytics(payload.analytics),
    googleInsights: payload.googleInsights,
  }
}

function importGoogleFiles(
  files: File[],
  youtubeOnly: boolean,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/google-import.worker.ts", import.meta.url),
      { type: "module", name: youtubeOnly ? "youtube-import" : "google-import" }
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
        try {
          resolve(parseGoogleAnalyzeJson(message.analyticsJson))
        } catch (error) {
          reject(
            error instanceof Error ? error : new Error(String(error))
          )
        }
      } else if (message.type === "error") {
        reject(new Error(message.message))
      } else {
        reject(new Error("Unexpected response from Google import worker."))
      }
    }

    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || "Import worker failed to start."))
    }

    worker.postMessage({
      type: "files",
      files,
      youtubeOnly,
    })
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
 * Returns {@link ImportResult} (`analytics` plus optional Instagram / Google insights).
 *
 * For WhatsApp (and Instagram when profile Name is ambiguous),
 * `onNeedIdentity` resolves with the user's display name from the export.
 *
 * Google / YouTube accept multiple Takeout ZIP parts via
 * {@link importPlatformFiles}.
 */
export function importPlatformFile(
  platform: PlatformConfig,
  file: File,
  onProgress?: (progress: ImportProgress) => void,
  onNeedIdentity?: NeedIdentityHandler
): Promise<ImportResult> {
  return importPlatformFiles(platform, [file], onProgress, onNeedIdentity)
}

/** Import one or more export files (multi-ZIP for Google / YouTube). */
export function importPlatformFiles(
  platform: PlatformConfig,
  files: File[],
  onProgress?: (progress: ImportProgress) => void,
  onNeedIdentity?: NeedIdentityHandler
): Promise<ImportResult> {
  if (!files.length) {
    return Promise.reject(new Error("No files selected."))
  }

  for (const file of files) {
    validateFile(platform, file)
  }

  if (platform.id === "google" || platform.id === "youtube") {
    return importGoogleFiles(
      files,
      platform.id === "youtube",
      onProgress
    )
  }

  if (platform.id === "spotify") {
    return importSpotifyFiles(files, onProgress)
  }

  if (platform.id === "apple-music") {
    return importAppleMusicFile(files[0]!, onProgress)
  }

  if (files.length > 1) {
    return Promise.reject(
      new Error(
        `${platform.name} imports one file at a time. Google Takeout and Spotify support multiple files.`
      )
    )
  }

  const file = files[0]

  if (platform.id === "whatsapp") {
    return importWhatsAppFile(file, onProgress, onNeedIdentity)
  }

  if (platform.id === "instagram") {
    return importInstagramFile(file, onProgress, onNeedIdentity)
  }

  if (platform.id === "facebook") {
    return importFacebookFile(file, onProgress, onNeedIdentity)
  }

  if (platform.id === "linkedin") {
    return importLinkedInFile(file, onProgress, onNeedIdentity)
  }

  if (platform.id === "tiktok") {
    return importTikTokFile(file, onProgress, onNeedIdentity)
  }

  if (platform.id === "x") {
    return importXFile(file, onProgress)
  }

  if (platform.id === "chatgpt") {
    return importChatGptFile(file, onProgress)
  }

  return importTelegramFile(file, onProgress)
}
