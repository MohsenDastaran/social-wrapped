import type { HeatmapDay } from "@/platform/analytics-types"

export type SpotifyCounted = {
  name: string
  count: number
  msPlayed?: number
}

export type SpotifyYearCount = {
  year: number
  count: number
}

export type SpotifyProfile = {
  displayName: string
  username: string
  email?: string | null
  country?: string | null
  birthdate?: string | null
  gender?: string | null
  creationTime?: string | null
}

export type SpotifyInsights = {
  profile: SpotifyProfile
  playCount: number
  uniqueArtistCount: number
  uniqueTrackCount: number
  totalMsPlayed: number
  skipCount: number
  listenHeatmap: HeatmapDay[]
  listenHourly: number[]
  playsByYear: SpotifyYearCount[]
  topArtists: SpotifyCounted[]
  topTracks: SpotifyCounted[]
  topArtistsByMs: SpotifyCounted[]
  topTracksByMs: SpotifyCounted[]
  format: string
}

export function emptySpotifyInsights(): SpotifyInsights {
  return {
    profile: { displayName: "", username: "" },
    playCount: 0,
    uniqueArtistCount: 0,
    uniqueTrackCount: 0,
    totalMsPlayed: 0,
    skipCount: 0,
    listenHeatmap: [],
    listenHourly: Array.from({ length: 24 }, () => 0),
    playsByYear: [],
    topArtists: [],
    topTracks: [],
    topArtistsByMs: [],
    topTracksByMs: [],
    format: "account",
  }
}

function padHourly(raw?: number[] | null): number[] {
  return Array.from({ length: 24 }, (_, i) => Number(raw?.[i] ?? 0) || 0)
}

export function normalizeSpotifyInsights(
  raw?: Partial<SpotifyInsights> | null
): SpotifyInsights {
  const base = emptySpotifyInsights()
  if (!raw) return base
  return {
    ...base,
    ...raw,
    profile: { ...base.profile, ...(raw.profile ?? {}) },
    listenHeatmap: raw.listenHeatmap ?? base.listenHeatmap,
    listenHourly: padHourly(raw.listenHourly),
    playsByYear: raw.playsByYear ?? base.playsByYear,
    topArtists: raw.topArtists ?? base.topArtists,
    topTracks: raw.topTracks ?? base.topTracks,
    topArtistsByMs: raw.topArtistsByMs ?? base.topArtistsByMs,
    topTracksByMs: raw.topTracksByMs ?? base.topTracksByMs,
  }
}

/** Human-readable listening duration from milliseconds. */
export function formatListeningMs(ms: number): string {
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remM = mins % 60
  if (hours < 48) return `${hours}h ${remM}m`
  const days = Math.floor(hours / 24)
  return `${days}d`
}
