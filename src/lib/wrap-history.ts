import type { PlatformId } from "@/lib/platforms"
import type {
  AnalyticsResult,
  ChatResult,
  ContentMixStats,
  WrapAnalytics,
} from "@/platform/analytics-types"
import { normalizeContentMix } from "@/lib/normalize-content-mix"
import { analyticsToStats, type TelegramExportStats } from "@/platform/import"

const LEGACY_STORAGE_KEY = "social-wrapped:wraps"
const DB_NAME = "social-wrapped"
const DB_VERSION = 1
const WRAPS_STORE = "wraps"

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

/**
 * On-disk shape: insight lists are stored as chat IDs only so each ChatResult
 * is persisted once inside `analytics.chats` (avoids ~4× duplication).
 */
type CompactAnalytics = Omit<
  WrapAnalytics,
  "topContacts" | "recentContacts" | "fadedContacts" | "topGroups"
> & {
  topContactIds?: number[]
  recentContactIds?: number[]
  fadedContactIds?: number[]
  topGroupIds?: number[]
  /** Legacy full objects — expanded then dropped on next save. */
  topContacts?: ChatResult[]
  recentContacts?: ChatResult[]
  fadedContacts?: ChatResult[]
  topGroups?: ChatResult[]
}

type StoredWrap = {
  id: string
  platformId: PlatformId
  fileName: string
  createdAt: string
  stats: TelegramExportStats
  analytics: CompactAnalytics
}

type LegacyStoredWrap = Partial<WrapRecord> & {
  id?: string
  platformId?: PlatformId
  fileName?: string
  createdAt?: string
  stats?: TelegramExportStats
  analytics?: CompactAnalytics | WrapAnalytics
}

const EMPTY_CONTENT_MIX: ContentMixStats = {
  total: 0,
  totalVoiceDurationSecs: 0,
  types: [],
}

/** Session cache so navigate-after-save and repeat reads stay instant. */
const memoryCache = new Map<string, WrapRecord>()

let dbPromise: Promise<IDBDatabase> | null = null
let migratePromise: Promise<void> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(
        new Error(
          "IndexedDB is unavailable. Social Wrapped needs IndexedDB to store large wrap analytics."
        )
      )
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(WRAPS_STORE)) {
        db.createObjectStore(WRAPS_STORE, { keyPath: "id" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error ?? new Error("Failed to open wrap database."))
    }
  })

  return dbPromise
}

function idbReq<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed."))
  })
}

function idbTxDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () =>
      reject(tx.error ?? new Error("IndexedDB transaction failed."))
    tx.onabort = () =>
      reject(tx.error ?? new Error("IndexedDB transaction aborted."))
  })
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
    keywords: { counts: {} },
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
      keywords: {
        counts: c.analytics.keywords?.counts ?? {},
      },
    },
  }
}

function chatIds(list: ChatResult[] | undefined): number[] {
  if (!list?.length) return []
  return list.map((c) => c.chatId)
}

function resolveChatList(
  ids: number[] | undefined,
  byId: Map<number, ChatResult>,
  legacy: ChatResult[] | undefined
): ChatResult[] {
  if (ids?.length) {
    return ids
      .map((id) => byId.get(id))
      .filter((c): c is ChatResult => c != null)
  }
  if (legacy?.length) return legacy.map(normalizeChat)
  return []
}

function expandAnalytics(raw: CompactAnalytics | WrapAnalytics): WrapAnalytics {
  const compact = raw as CompactAnalytics
  const chats = (raw.chats ?? []).map(normalizeChat)
  const byId = new Map(chats.map((c) => [c.chatId, c]))

  // Legacy rows may have full insight objects not yet in `chats`.
  for (const list of [
    raw.topContacts,
    raw.recentContacts,
    raw.fadedContacts,
    raw.topGroups,
  ]) {
    for (const chat of list ?? []) {
      if (!byId.has(chat.chatId)) {
        const normalized = normalizeChat(chat)
        byId.set(normalized.chatId, normalized)
        chats.push(normalized)
      }
    }
  }

  return {
    displayName: raw.displayName,
    username: raw.username,
    aboutPreview: raw.aboutPreview,
    fileSizeBytes: raw.fileSizeBytes,
    chatCount: raw.chatCount,
    sampleMessages: raw.sampleMessages ?? [],
    account: {
      ...raw.account,
      activityOverTime:
        raw.account.activityOverTime ?? {
          daily: [],
          monthly: [],
          yearly: [],
          years: [],
        },
      contentMix: normalizeContentMix(raw.account),
      keywords: {
        counts: raw.account.keywords?.counts ?? {},
      },
    },
    chats,
    topContacts: resolveChatList(
      compact.topContactIds,
      byId,
      raw.topContacts
    ),
    recentContacts: resolveChatList(
      compact.recentContactIds,
      byId,
      raw.recentContacts
    ),
    fadedContacts: resolveChatList(
      compact.fadedContactIds,
      byId,
      raw.fadedContacts
    ),
    topGroups: resolveChatList(compact.topGroupIds, byId, raw.topGroups),
  }
}

function compactAnalytics(analytics: WrapAnalytics): CompactAnalytics {
  const {
    topContacts,
    recentContacts,
    fadedContacts,
    topGroups,
    ...rest
  } = analytics

  const byId = new Map<number, ChatResult>()
  for (const chat of analytics.chats ?? []) {
    byId.set(chat.chatId, normalizeChat(chat))
  }
  for (const list of [topContacts, recentContacts, fadedContacts, topGroups]) {
    for (const chat of list ?? []) {
      if (!byId.has(chat.chatId)) {
        byId.set(chat.chatId, normalizeChat(chat))
      }
    }
  }

  return {
    ...rest,
    chats: [...byId.values()],
    topContactIds: chatIds(topContacts),
    recentContactIds: chatIds(recentContacts),
    fadedContactIds: chatIds(fadedContacts),
    topGroupIds: chatIds(topGroups),
  }
}

function normalizeWrap(raw: LegacyStoredWrap): WrapRecord | null {
  if (!raw.id || !raw.platformId || !raw.fileName || !raw.createdAt) {
    return null
  }

  let analytics =
    raw.analytics?.account != null
      ? expandAnalytics(raw.analytics)
      : raw.stats
        ? analyticsFromLegacyStats(raw.stats)
        : null

  if (!analytics) return null

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

function toStored(wrap: WrapRecord): StoredWrap {
  return {
    id: wrap.id,
    platformId: wrap.platformId,
    fileName: wrap.fileName,
    createdAt: wrap.createdAt,
    stats: wrap.stats,
    analytics: compactAnalytics(wrap.analytics),
  }
}

function readLegacyLocalStorage(): WrapRecord[] {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as LegacyStoredWrap[]
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeWrap).filter((w): w is WrapRecord => w != null)
  } catch {
    return []
  }
}

async function migrateFromLocalStorage(db: IDBDatabase): Promise<void> {
  const legacy = readLegacyLocalStorage()
  if (legacy.length === 0) {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    return
  }

  const tx = db.transaction(WRAPS_STORE, "readwrite")
  const store = tx.objectStore(WRAPS_STORE)

  for (const wrap of legacy) {
    store.put(toStored(wrap))
    memoryCache.set(wrap.id, wrap)
  }

  await idbTxDone(tx)

  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* ignore — data already in IndexedDB */
  }
}

async function ensureReady(): Promise<IDBDatabase> {
  const db = await openDb()
  if (!migratePromise) {
    migratePromise = migrateFromLocalStorage(db).catch((err) => {
      migratePromise = null
      throw err
    })
  }
  await migratePromise
  return db
}

async function readAllFromDb(): Promise<WrapRecord[]> {
  const db = await ensureReady()
  const tx = db.transaction(WRAPS_STORE, "readonly")
  const rows = await idbReq(tx.objectStore(WRAPS_STORE).getAll())
  await idbTxDone(tx)

  const wraps: WrapRecord[] = []
  for (const row of rows as LegacyStoredWrap[]) {
    const wrap = normalizeWrap(row)
    if (!wrap) continue
    memoryCache.set(wrap.id, wrap)
    wraps.push(wrap)
  }
  return wraps
}

export async function listWraps(): Promise<WrapRecord[]> {
  const wraps = await readAllFromDb()
  return wraps.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export async function getWrap(id: string): Promise<WrapRecord | undefined> {
  const cached = memoryCache.get(id)
  if (cached) return cached

  const db = await ensureReady()
  const tx = db.transaction(WRAPS_STORE, "readonly")
  const row = await idbReq(tx.objectStore(WRAPS_STORE).get(id))
  await idbTxDone(tx)

  if (!row) return undefined
  const wrap = normalizeWrap(row as LegacyStoredWrap)
  if (!wrap) return undefined
  memoryCache.set(wrap.id, wrap)
  return wrap
}

/** Route path for a saved wrap result page. */
export function wrapPath(id: string): string {
  return `/wrap/${id}`
}

/** Route path for a per-contact analytics page. */
export function wrapChatPath(wrapId: string, chatId: number): string {
  return `/wrap/${wrapId}/chat/${chatId}`
}

export async function saveWrap(input: {
  platformId: PlatformId
  fileName: string
  analytics: WrapAnalytics
}): Promise<WrapRecord> {
  const wrap: WrapRecord = {
    id: crypto.randomUUID(),
    platformId: input.platformId,
    fileName: input.fileName,
    createdAt: new Date().toISOString(),
    analytics: expandAnalytics({
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
    }),
    stats: analyticsToStats(input.analytics),
  }

  // Cache before the write so navigation can resolve instantly.
  memoryCache.set(wrap.id, wrap)

  const db = await ensureReady()
  const tx = db.transaction(WRAPS_STORE, "readwrite")
  tx.objectStore(WRAPS_STORE).put(toStored(wrap))
  await idbTxDone(tx)

  return wrap
}

export async function deleteWrap(id: string): Promise<void> {
  memoryCache.delete(id)
  const db = await ensureReady()
  const tx = db.transaction(WRAPS_STORE, "readwrite")
  tx.objectStore(WRAPS_STORE).delete(id)
  await idbTxDone(tx)
}
