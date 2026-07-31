import type { PlatformId } from "@/lib/platforms"
import type {
  AnalyticsResult,
  ChatResult,
  ContentMixStats,
  WrapAnalytics,
} from "@/platform/analytics-types"
import { normalizeContentMix } from "@/lib/normalize-content-mix"
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

const EMPTY_CONTENT_MIX: ContentMixStats = {
  total: 0,
  totalVoiceDurationSecs: 0,
  types: [],
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
    contentMix: { ...EMPTY_CONTENT_MIX },
    messageLength: { participants: [] },
    responseTime: { participants: [] },
    lateNight: { totalLateNight: 0, participants: [] },
    initiatorFinisher: { initiators: [], finishers: [] },
    emojis: { topOverall: [], byParticipant: [], topReactions: [] },
    circadian: {
      hourlyTotal: Array.from({ length: 24 }, () => 0),
      participants: [],
    },
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
    topContacts: [],
    recentContacts: [],
    fadedContacts: [],
    topGroups: [],
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

function normalizeChat(c: ChatResult): ChatResult {
  return {
    ...c,
    isGroup: c.isGroup ?? false,
    isDeleted: c.isDeleted ?? false,
    analytics: {
      ...c.analytics,
      activityOverTime:
        c.analytics.activityOverTime ?? {
          daily: [],
          monthly: [],
          yearly: [],
          years: [],
        },
      contentMix: normalizeContentMix(c.analytics),
    },
  }
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

  analytics = {
    ...analytics,
    account: {
      ...analytics.account,
      activityOverTime:
        analytics.account.activityOverTime ?? {
          daily: [],
          monthly: [],
          yearly: [],
          years: [],
        },
      contentMix: normalizeContentMix(analytics.account),
    },
    chats: (analytics.chats ?? []).map(normalizeChat),
    topContacts: (analytics.topContacts ?? []).map(normalizeChat),
    recentContacts: (analytics.recentContacts ?? []).map(normalizeChat),
    fadedContacts: (analytics.fadedContacts ?? []).map(normalizeChat),
    topGroups: (analytics.topGroups ?? []).map(normalizeChat),
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
    return parsed.map(normalizeWrap).filter((w): w is WrapRecord => w != null)
  } catch {
    return []
  }
}

function writeAll(wraps: WrapRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wraps))
}

export function listWraps(): WrapRecord[] {
  return readAll().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function getWrap(id: string): WrapRecord | undefined {
  return readAll().find((w) => w.id === id)
}

/** Route path for a saved wrap result page. */
export function wrapPath(id: string): string {
  return `/wrap/${id}`
}

export function saveWrap(input: {
  platformId: PlatformId
  fileName: string
  analytics: WrapAnalytics
}): WrapRecord {
  const wrap: WrapRecord = {
    id: crypto.randomUUID(),
    platformId: input.platformId,
    fileName: input.fileName,
    createdAt: new Date().toISOString(),
    analytics: {
      ...input.analytics,
      account: {
        ...input.analytics.account,
        contentMix: normalizeContentMix(input.analytics.account),
      },
      chats: (input.analytics.chats ?? []).map(normalizeChat),
      topContacts: (input.analytics.topContacts ?? []).map(normalizeChat),
      recentContacts: (input.analytics.recentContacts ?? []).map(normalizeChat),
      fadedContacts: (input.analytics.fadedContacts ?? []).map(normalizeChat),
      topGroups: (input.analytics.topGroups ?? []).map(normalizeChat),
    },
    stats: analyticsToStats(input.analytics),
  }
  const wraps = readAll().filter((w) => w.id !== wrap.id)
  wraps.unshift(wrap)
  writeAll(wraps)
  return wrap
}

export function deleteWrap(id: string): void {
  writeAll(readAll().filter((w) => w.id !== id))
}
