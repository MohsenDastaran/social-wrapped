const VISITOR_ID_KEY = "social-wrapped:visitor-id"

export type UserStats = {
  users: number
  visits: number
}

const FALLBACK_API_BASE_URL = "https://api.wrapped.dastaran.com"

function apiBaseUrl(): string {
  const raw = import.meta.env.API_BASE_URL
  const base =
    typeof raw === "string" && raw.trim() ? raw.trim() : FALLBACK_API_BASE_URL
  return base.replace(/\/+$/, "")
}

/** `GET {BASE_URL}/users` — BASE_URL comes from `.env`, not Vite's asset base. */
export function getUserStatsUrl(): string {
  return `${apiBaseUrl()}/users`
}

function parseNonNegativeInt(raw: unknown): number | null {
  const value = typeof raw === "number" ? raw : Number(raw)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.floor(value)
}

function parseUserStats(payload: unknown): UserStats | null {
  if (!payload || typeof payload !== "object") return null
  const record = payload as Record<string, unknown>
  const users = parseNonNegativeInt(record.users ?? record.total)
  if (users == null) return null
  const visits = parseNonNegativeInt(record.visits)
  return { users, visits: visits ?? 0 }
}

function readVisitorId(): string | null {
  try {
    const value = localStorage.getItem(VISITOR_ID_KEY)?.trim()
    return value ? value : null
  } catch {
    return null
  }
}

function persistVisitorId(id: string): void {
  try {
    localStorage.setItem(VISITOR_ID_KEY, id)
  } catch {
    // Private mode / quota — next load will look like a first visit.
  }
}

function usersUrl(visitorId: string | null): string {
  const url = new URL(getUserStatsUrl())
  if (visitorId) url.searchParams.set("visitorId", visitorId)
  return url.toString()
}

async function getUserStats(
  visitorId: string | null
): Promise<UserStats | null> {
  const response = await fetch(usersUrl(visitorId), {
    method: "GET",
    headers: { Accept: "application/json" },
  })
  if (!response.ok) return null
  try {
    return parseUserStats(await response.json())
  } catch {
    return null
  }
}

/**
 * GET /users — omit visitorId on first visit (users + visits), then
 * ?visitorId=<crypto.randomUUID()> on later visits (visits only).
 */
async function reportAndRead(): Promise<UserStats | null> {
  try {
    const existingId = readVisitorId()
    const stats = await getUserStats(existingId)
    if (stats && !existingId) persistVisitorId(crypto.randomUUID())
    return stats
  } catch {
    return null
  }
}

/** One GET per full page load so React Strict Mode does not double-count. */
let sessionStats: Promise<UserStats | null> | null = null

export function syncUserStats(): Promise<UserStats | null> {
  if (!sessionStats) sessionStats = reportAndRead()
  return sessionStats
}
