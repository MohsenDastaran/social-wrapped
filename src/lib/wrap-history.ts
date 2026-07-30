import type { PlatformId } from "@/lib/platforms"
import type {
  AnalyticsResult,
  WrapAnalytics,
} from "@/platform/analytics-types"
import { analyticsToStats, type TelegramExportStats } from "@/platform/import"

const STORAGE_KEY = "social-wrapped:wraps"

export type WrapRecord = {
  id: string
  platformId: PlatformId
  fileName: string
  createdAt: string
  /** Full analytics from the import pass. */
  analytics: WrapAnalytics
  /** Derived flat stats for header display — kept for quick access. */
  stats: TelegramExportStats
}

/** Pre-analytics wraps stored only `stats`; synthesize a minimal shell so the page doesn't crash. */
function emptyAnalyticsResult(
  sent: number,
  received: number
): AnalyticsResult {
  const total = sent + received
  return {
    totalMessages: total,
    sentMessages: sent,
    receivedMessages: received,
    volume: {
      total,
      sent,
      received,
      participants: [
        { name: "You", count: sent, pct: total ? (sent / total) * 100 : 0 },
        {
          name: "Others",
          count: received,
          pct: total ? (received / total) * 100 : 0,
        },
      ],
    },
    voiceText: {
      totalText: 0,
      totalVoice: 0,
      totalVoiceDurationSecs: 0,
      participants: [],
    },
    messageLength: { participants: [] },
    responseTime: { participants: [] },
    lateNight: { totalLateNight: 0, participants: [] },
    initiatorFinisher: { initiators: [], finishers: [] },
    emojis: { topOverall: [], byParticipant: [], topReactions: [] },
    circadian: { hourlyTotal: Array.from({ length: 24 }, () => 0), participants: [] },
    heatmap: { days: [] },
    activityOverTime: { daily: [], monthly: [], yearly: [], years: [] },
  }
}

function analyticsFromLegacyStats(stats: TelegramExportStats): WrapAnalytics {
  return {
    displayName: stats.displayName,
    username: stats.username,
    aboutPreview: stats.aboutPreview,
    fileSizeBytes: stats.fileSizeBytes,
    chatCount: stats.chatCount,
    sampleMessages: stats.sampleMessages ?? [],
    account: emptyAnalyticsResult(stats.sentMessages, stats.receivedMessages),
    chats: [],
  }
}

type StoredWrap = Partial<WrapRecord> & {
  id?: string
  platformId?: PlatformId
  fileName?: string
  createdAt?: string
  stats?: TelegramExportStats
  analytics?: WrapAnalytics
}

function normalizeWrap(raw: StoredWrap): WrapRecord | null {
  if (!raw.id || !raw.platformId || !raw.fileName || !raw.createdAt) {
    return null
  }

  let analytics =
    raw.analytics?.account != null
      ? raw.analytics
      : raw.stats
        ? analyticsFromLegacyStats(raw.stats)
        : null

  if (!analytics) return null

  // Older wraps may lack newer analytics fields.
  if (!analytics.account.activityOverTime) {
    analytics = {
      ...analytics,
      account: {
        ...analytics.account,
        activityOverTime: { daily: [], monthly: [], yearly: [], years: [] },
      },
    }
  }

  const stats = raw.stats ?? analyticsToStats(analytics)

  return {
    id: raw.id,
    platformId: raw.platformId,
    fileName: raw.fileName,
    createdAt: raw.createdAt,
    analytics,
    stats,
  }
}

function readAll(): WrapRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredWrap[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeWrap)
      .filter((wrap): wrap is WrapRecord => wrap != null)
  } catch {
    return []
  }
}

function writeAll(wraps: WrapRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wraps))
}

/** Persist a new wrap and return it. Newest first. */
export function saveWrap(
  input: Omit<WrapRecord, "id" | "createdAt" | "stats">
): WrapRecord {
  const wrap: WrapRecord = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    stats: analyticsToStats(input.analytics),
  }
  writeAll([wrap, ...readAll()])
  return wrap
}

export function listWraps(): WrapRecord[] {
  return readAll()
}

export function getWrap(id: string): WrapRecord | undefined {
  return readAll().find((wrap) => wrap.id === id)
}

export function wrapPath(id: string): string {
  return `/wrap/${id}`
}
