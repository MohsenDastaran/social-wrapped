/** Public user-count endpoint. Unset → skip the request (hero stays at 0). */
export function getUserStatsUrl(): string | undefined {
  const url = import.meta.env.VITE_USER_STATS_URL
  if (typeof url !== "string") return undefined
  const trimmed = url.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function parseUserCount(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null
  const record = payload as Record<string, unknown>
  const raw = record.users ?? record.total
  const value = typeof raw === "number" ? raw : Number(raw)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.floor(value)
}

/** GET the public user total. Returns null if unset, offline, or invalid. */
export async function fetchUserCount(
  signal?: AbortSignal
): Promise<number | null> {
  const url = getUserStatsUrl()
  if (!url) return null

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    })
    if (!response.ok) return null
    return parseUserCount(await response.json())
  } catch {
    return null
  }
}
