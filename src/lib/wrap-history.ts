import type { PlatformId } from "@/lib/platforms"
import type {
  AnalyticsResult,
  ChatResult,
  ContentMixStats,
  InstagramSocialInsights,
  WrapAnalytics,
} from "@/platform/analytics-types"
import type { GoogleInsights } from "@/platform/google-types"
import type { LinkedInInsights } from "@/platform/linkedin-types"
import type { XInsights } from "@/platform/x-types"
import { getAppSettings } from "@/lib/app-settings"
import { normalizeContentMix } from "@/lib/normalize-content-mix"
import { analyticsToStats, type TelegramExportStats } from "@/platform/import"

const LEGACY_STORAGE_KEY = "social-wrapped:wraps"
const DB_NAME = "social-wrapped"
const DB_VERSION = 3
const WRAPS_STORE = "wraps"
const ARCHIVE_BLOBS_STORE = "archiveBlobs"
const STORIES_STORE = "wrapStories"

export type WrapRecord = {
  id: string
  platformId: PlatformId
  fileName: string
  createdAt: string
  /** Full analytics from the import pass. */
  analytics: WrapAnalytics
  /** Derived flat stats for header display — kept for quick access. */
  stats: TelegramExportStats
  /** Instagram outbound / graph insights (absent for TG/WA). */
  instagramSocial?: InstagramSocialInsights
  /** Google Takeout / YouTube product insights. */
  googleInsights?: GoogleInsights
  /** LinkedIn network / career / engagement insights. */
  linkedinInsights?: LinkedInInsights
  /** X (Twitter) tweets / likes / network insights. */
  xInsights?: XInsights
  /** True when an archive ZIP blob is stored for Official X HTML. */
  hasArchiveBlob?: boolean
}

/**
 * On-disk shape: insight lists are stored as chat IDs only so each ChatResult
 * is persisted once inside `analytics.chats` (avoids ~4× duplication).
 */
type CompactAnalytics = Omit<
  WrapAnalytics,
  | "topContacts"
  | "recentContacts"
  | "fadedContacts"
  | "topGroups"
  | "topGhosters"
> & {
  topContactIds?: number[]
  recentContactIds?: number[]
  fadedContactIds?: number[]
  topGroupIds?: number[]
  topGhosterIds?: number[]
  /** Legacy full objects — expanded then dropped on next save. */
  topContacts?: ChatResult[]
  recentContacts?: ChatResult[]
  fadedContacts?: ChatResult[]
  topGroups?: ChatResult[]
  topGhosters?: ChatResult[]
}

type StoredWrap = {
  id: string
  platformId: PlatformId
  fileName: string
  createdAt: string
  stats: TelegramExportStats
  analytics: CompactAnalytics
  instagramSocial?: InstagramSocialInsights
  googleInsights?: GoogleInsights
  linkedinInsights?: LinkedInInsights
  xInsights?: XInsights
  hasArchiveBlob?: boolean
}

type LegacyStoredWrap = Partial<WrapRecord> & {
  id?: string
  platformId?: PlatformId
  fileName?: string
  createdAt?: string
  stats?: TelegramExportStats
  analytics?: CompactAnalytics | WrapAnalytics
  instagramSocial?: InstagramSocialInsights
  googleInsights?: GoogleInsights
  linkedinInsights?: LinkedInInsights
  xInsights?: XInsights
  hasArchiveBlob?: boolean
}

const EMPTY_CONTENT_MIX: ContentMixStats = {
  total: 0,
  totalVoiceDurationSecs: 0,
  types: [],
  byParticipant: [],
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
      if (!db.objectStoreNames.contains(ARCHIVE_BLOBS_STORE)) {
        db.createObjectStore(ARCHIVE_BLOBS_STORE, { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains(STORIES_STORE)) {
        db.createObjectStore(STORIES_STORE, { keyPath: "id" })
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
    editTypo: { totalEdits: 0, participants: [] },
    ghosting: { total: 0, participants: [] },
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
    topGhosters: [],
  }
}

function normalizeGhosting(
  g: AnalyticsResult["ghosting"] | undefined
): NonNullable<AnalyticsResult["ghosting"]> {
  return {
    total: g?.total ?? 0,
    participants: g?.participants ?? [],
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
      editTypo: {
        totalEdits: c.analytics.editTypo?.totalEdits ?? 0,
        participants: (c.analytics.editTypo?.participants ?? []).map((p) => ({
          name: p.name,
          edits: p.edits,
        })),
      },
      ghosting: normalizeGhosting(c.analytics.ghosting),
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
    raw.topGhosters,
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
      editTypo: {
        totalEdits: raw.account.editTypo?.totalEdits ?? 0,
        participants: (raw.account.editTypo?.participants ?? []).map((p) => ({
          name: p.name,
          edits: p.edits,
        })),
      },
      ghosting: normalizeGhosting(raw.account.ghosting),
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
    topGhosters: resolveChatList(
      compact.topGhosterIds,
      byId,
      raw.topGhosters
    ),
  }
}

function compactAnalytics(analytics: WrapAnalytics): CompactAnalytics {
  const {
    topContacts,
    recentContacts,
    fadedContacts,
    topGroups,
    topGhosters,
    ...rest
  } = analytics

  const byId = new Map<number, ChatResult>()
  for (const chat of analytics.chats ?? []) {
    byId.set(chat.chatId, normalizeChat(chat))
  }
  for (const list of [
    topContacts,
    recentContacts,
    fadedContacts,
    topGroups,
    topGhosters,
  ]) {
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
    topGhosterIds: chatIds(topGhosters),
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
    ...(raw.instagramSocial ? { instagramSocial: raw.instagramSocial } : {}),
    ...(raw.googleInsights ? { googleInsights: raw.googleInsights } : {}),
    ...(raw.linkedinInsights ? { linkedinInsights: raw.linkedinInsights } : {}),
    ...(raw.xInsights ? { xInsights: raw.xInsights } : {}),
    ...(raw.hasArchiveBlob ? { hasArchiveBlob: true } : {}),
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
    ...(wrap.instagramSocial ? { instagramSocial: wrap.instagramSocial } : {}),
    ...(wrap.googleInsights ? { googleInsights: wrap.googleInsights } : {}),
    ...(wrap.linkedinInsights
      ? { linkedinInsights: wrap.linkedinInsights }
      : {}),
    ...(wrap.xInsights ? { xInsights: wrap.xInsights } : {}),
    ...(wrap.hasArchiveBlob ? { hasArchiveBlob: true } : {}),
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

/** Route path for a Google Takeout product deep-dive. */
export function wrapGoogleProductPath(
  wrapId: string,
  productId: string
): string {
  return `/wrap/${wrapId}/google/${productId}`
}

/**
 * Landing route after import / from History.
 * WhatsApp exports are a single chat, so open the chat analytics page directly.
 */
export function wrapEntryPath(
  wrap: Pick<WrapRecord, "id" | "platformId" | "analytics">
): string {
  if (wrap.platformId === "whatsapp") {
    const chatId = wrap.analytics.chats[0]?.chatId ?? 1
    return wrapChatPath(wrap.id, chatId)
  }
  return wrapPath(wrap.id)
}

export async function saveWrap(input: {
  platformId: PlatformId
  fileName: string
  analytics: WrapAnalytics
  instagramSocial?: InstagramSocialInsights
  googleInsights?: GoogleInsights
  linkedinInsights?: LinkedInInsights
  xInsights?: XInsights
  /** Optional archive ZIP for Official X HTML (stored separately). */
  archiveBlob?: Blob
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
      topGhosters: (input.analytics.topGhosters ?? []).map(normalizeChat),
    }),
    stats: analyticsToStats(input.analytics),
    ...(input.instagramSocial
      ? { instagramSocial: input.instagramSocial }
      : {}),
    ...(input.googleInsights ? { googleInsights: input.googleInsights } : {}),
    ...(input.linkedinInsights
      ? { linkedinInsights: input.linkedinInsights }
      : {}),
    ...(input.xInsights ? { xInsights: input.xInsights } : {}),
    ...(input.archiveBlob ? { hasArchiveBlob: true } : {}),
  }

  // Cache before the write so navigation can resolve instantly.
  memoryCache.set(wrap.id, wrap)

  const db = await ensureReady()
  const tx = db.transaction(WRAPS_STORE, "readwrite")
  tx.objectStore(WRAPS_STORE).put(toStored(wrap))
  await idbTxDone(tx)

  if (input.archiveBlob) {
    try {
      await saveArchiveBlob(wrap.id, input.archiveBlob)
    } catch (error) {
      console.warn("Failed to persist archive ZIP for Official HTML:", error)
      // Analytics wrap still saved; Official HTML section will show a fallback.
      wrap.hasArchiveBlob = false
      memoryCache.set(wrap.id, wrap)
      const tx2 = db.transaction(WRAPS_STORE, "readwrite")
      tx2.objectStore(WRAPS_STORE).put(toStored(wrap))
      await idbTxDone(tx2)
    }
  }

  await pruneExcessWraps(getAppSettings().maxWraps)

  return wrap
}

export async function deleteWrap(id: string): Promise<void> {
  memoryCache.delete(id)
  try {
    await caches.delete(`x-archive-${id}`)
  } catch {
    /* ignore */
  }
  const db = await ensureReady()
  const stores = [WRAPS_STORE]
  if (db.objectStoreNames.contains(ARCHIVE_BLOBS_STORE)) {
    stores.push(ARCHIVE_BLOBS_STORE)
  }
  if (db.objectStoreNames.contains(STORIES_STORE)) {
    stores.push(STORIES_STORE)
  }
  const tx = db.transaction(stores, "readwrite")
  tx.objectStore(WRAPS_STORE).delete(id)
  if (stores.includes(ARCHIVE_BLOBS_STORE)) {
    tx.objectStore(ARCHIVE_BLOBS_STORE).delete(id)
  }
  if (stores.includes(STORIES_STORE)) {
    tx.objectStore(STORIES_STORE).delete(id)
  }
  await idbTxDone(tx)
}

export async function saveArchiveBlob(
  wrapId: string,
  blob: Blob
): Promise<void> {
  const db = await ensureReady()
  if (!db.objectStoreNames.contains(ARCHIVE_BLOBS_STORE)) {
    throw new Error("Archive blob store is unavailable. Reload and try again.")
  }
  const tx = db.transaction(ARCHIVE_BLOBS_STORE, "readwrite")
  tx.objectStore(ARCHIVE_BLOBS_STORE).put({ id: wrapId, blob })
  await idbTxDone(tx)
}

export async function getArchiveBlob(wrapId: string): Promise<Blob | null> {
  const db = await ensureReady()
  if (!db.objectStoreNames.contains(ARCHIVE_BLOBS_STORE)) return null
  const tx = db.transaction(ARCHIVE_BLOBS_STORE, "readonly")
  const row = await idbReq<{ id: string; blob: Blob } | undefined>(
    tx.objectStore(ARCHIVE_BLOBS_STORE).get(wrapId)
  )
  await idbTxDone(tx)
  return row?.blob ?? null
}

/** DB constants for the Official X HTML service worker (same origin). */
export const X_ARCHIVE_IDB = {
  dbName: DB_NAME,
  storeName: ARCHIVE_BLOBS_STORE,
} as const

export async function clearAllWraps(): Promise<void> {
  memoryCache.clear()
  const db = await ensureReady()
  const stores = [WRAPS_STORE]
  if (db.objectStoreNames.contains(ARCHIVE_BLOBS_STORE)) {
    stores.push(ARCHIVE_BLOBS_STORE)
  }
  if (db.objectStoreNames.contains(STORIES_STORE)) {
    stores.push(STORIES_STORE)
  }
  const tx = db.transaction(stores, "readwrite")
  tx.objectStore(WRAPS_STORE).clear()
  if (stores.includes(ARCHIVE_BLOBS_STORE)) {
    tx.objectStore(ARCHIVE_BLOBS_STORE).clear()
  }
  if (stores.includes(STORIES_STORE)) {
    tx.objectStore(STORIES_STORE).clear()
  }
  await idbTxDone(tx)
}

/** One crafted story slide stored as a PNG blob (not an object URL). */
export type StoredWrapStorySlide = {
  id: string
  exportName: string
  heading: string
  subtext: string
  kpis?: Array<{ label: string; value: string }>
  videoMotion?: "fit" | "pan"
  blob: Blob
}

type StoredWrapStories = {
  id: string
  /** Spec fingerprint — regenerate when story catalog changes. */
  fingerprint: string
  createdAt: string
  stories: StoredWrapStorySlide[]
}

/** Fingerprint story specs so catalog changes invalidate the cache. */
export function wrapStoriesFingerprint(
  specs: Array<{ id: string; exportName: string; heading: string }>
): string {
  return specs.map((s) => `${s.id}\0${s.exportName}\0${s.heading}`).join("\n")
}

export async function saveWrapStories(
  wrapId: string,
  fingerprint: string,
  stories: StoredWrapStorySlide[]
): Promise<void> {
  if (stories.length === 0) return
  const db = await ensureReady()
  if (!db.objectStoreNames.contains(STORIES_STORE)) {
    throw new Error("Stories store is unavailable. Reload and try again.")
  }
  const row: StoredWrapStories = {
    id: wrapId,
    fingerprint,
    createdAt: new Date().toISOString(),
    stories,
  }
  const tx = db.transaction(STORIES_STORE, "readwrite")
  tx.objectStore(STORIES_STORE).put(row)
  await idbTxDone(tx)
}

export async function getWrapStories(
  wrapId: string,
  fingerprint: string
): Promise<StoredWrapStorySlide[] | null> {
  const db = await ensureReady()
  if (!db.objectStoreNames.contains(STORIES_STORE)) return null
  const tx = db.transaction(STORIES_STORE, "readonly")
  const row = await idbReq<StoredWrapStories | undefined>(
    tx.objectStore(STORIES_STORE).get(wrapId)
  )
  await idbTxDone(tx)
  if (!row || row.fingerprint !== fingerprint || row.stories.length === 0) {
    return null
  }
  return row.stories
}

export type WrapStorageSummary = {
  wrapCount: number
  /** Origin storage usage from `navigator.storage.estimate()`, when available. */
  usageBytes: number | null
  /** Origin storage quota from `navigator.storage.estimate()`, when available. */
  quotaBytes: number | null
  /** Sum of wrap `fileSizeBytes` as a fallback signal. */
  wrapFileBytes: number
}

export async function getWrapStorageSummary(): Promise<WrapStorageSummary> {
  const wraps = await listWraps()
  let wrapFileBytes = 0
  for (const wrap of wraps) {
    wrapFileBytes +=
      wrap.stats.fileSizeBytes || wrap.analytics.fileSizeBytes || 0
  }

  let usageBytes: number | null = null
  let quotaBytes: number | null = null
  try {
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate()
      usageBytes =
        typeof estimate.usage === "number" ? estimate.usage : null
      quotaBytes =
        typeof estimate.quota === "number" ? estimate.quota : null
    }
  } catch {
    /* estimate unavailable */
  }

  return {
    wrapCount: wraps.length,
    usageBytes,
    quotaBytes,
    wrapFileBytes,
  }
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Delete wraps older than `autoClearDays`. No-op when days is null (never). */
export async function pruneExpiredWraps(
  autoClearDays: number | null
): Promise<number> {
  if (autoClearDays === null || autoClearDays <= 0) return 0

  const cutoff = Date.now() - autoClearDays * MS_PER_DAY
  const wraps = await listWraps()
  const expired = wraps.filter(
    (wrap) => new Date(wrap.createdAt).getTime() < cutoff
  )

  for (const wrap of expired) {
    await deleteWrap(wrap.id)
  }
  return expired.length
}

/** Keep the newest `maxWraps` wraps; delete the rest. */
export async function pruneExcessWraps(maxWraps: number): Promise<number> {
  if (!Number.isFinite(maxWraps) || maxWraps <= 0) return 0

  const wraps = await listWraps()
  if (wraps.length <= maxWraps) return 0

  const excess = wraps.slice(maxWraps)
  for (const wrap of excess) {
    await deleteWrap(wrap.id)
  }
  return excess.length
}

export async function enforceRetentionPolicies(settings: {
  maxWraps: number
  autoClearDays: number | null
}): Promise<{ expired: number; excess: number }> {
  const expired = await pruneExpiredWraps(settings.autoClearDays)
  const excess = await pruneExcessWraps(settings.maxWraps)
  return { expired, excess }
}
