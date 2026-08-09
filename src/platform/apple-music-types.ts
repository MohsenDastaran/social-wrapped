import type { HeatmapDay } from "@/platform/analytics-types"

export type AppleMusicCounted = {
  name: string
  count: number
  msPlayed?: number
}

export type AppleMusicYearCount = {
  year: number
  count: number
}

export type AppleMusicDecadeCount = {
  decade: number
  count: number
}

export type AppleMusicPlaylistSummary = {
  name: string
  trackCount: number
}

export type AppleMusicPlaylistInsights = {
  totalCount: number
  userPlaylistCount: number
  topPlaylists: AppleMusicPlaylistSummary[]
}

export type AppleMusicProfile = {
  displayName: string
  libraryPersistentId?: string | null
  applicationVersion?: string | null
  exportDate?: string | null
}

export type AppleMusicInsights = {
  profile: AppleMusicProfile
  playCount: number
  uniqueArtistCount: number
  uniqueTrackCount: number
  totalMsPlayed: number
  skipCount: number
  libraryTrackCount: number
  appleMusicTrackCount: number
  localTrackCount: number
  lovedCount: number
  favoritedCount: number
  listenHeatmap: HeatmapDay[]
  listenHourly: number[]
  playsByYear: AppleMusicYearCount[]
  topArtists: AppleMusicCounted[]
  topTracks: AppleMusicCounted[]
  topArtistsByMs: AppleMusicCounted[]
  topTracksByMs: AppleMusicCounted[]
  topGenres: AppleMusicCounted[]
  topGenresByMs: AppleMusicCounted[]
  topAlbums: AppleMusicCounted[]
  topAlbumsByMs: AppleMusicCounted[]
  lovedTracks: AppleMusicCounted[]
  libraryGrowthHeatmap: HeatmapDay[]
  playlists: AppleMusicPlaylistInsights
  decades: AppleMusicDecadeCount[]
  format: string
}

export function emptyAppleMusicInsights(): AppleMusicInsights {
  return {
    profile: { displayName: "Apple Music Library" },
    playCount: 0,
    uniqueArtistCount: 0,
    uniqueTrackCount: 0,
    totalMsPlayed: 0,
    skipCount: 0,
    libraryTrackCount: 0,
    appleMusicTrackCount: 0,
    localTrackCount: 0,
    lovedCount: 0,
    favoritedCount: 0,
    listenHeatmap: [],
    listenHourly: Array.from({ length: 24 }, () => 0),
    playsByYear: [],
    topArtists: [],
    topTracks: [],
    topArtistsByMs: [],
    topTracksByMs: [],
    topGenres: [],
    topGenresByMs: [],
    topAlbums: [],
    topAlbumsByMs: [],
    lovedTracks: [],
    libraryGrowthHeatmap: [],
    playlists: {
      totalCount: 0,
      userPlaylistCount: 0,
      topPlaylists: [],
    },
    decades: [],
    format: "library-xml",
  }
}

function padHourly(raw?: number[] | null): number[] {
  return Array.from({ length: 24 }, (_, i) => Number(raw?.[i] ?? 0) || 0)
}

export function normalizeAppleMusicInsights(
  raw?: Partial<AppleMusicInsights> | null
): AppleMusicInsights {
  const base = emptyAppleMusicInsights()
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
    topGenres: raw.topGenres ?? base.topGenres,
    topGenresByMs: raw.topGenresByMs ?? base.topGenresByMs,
    topAlbums: raw.topAlbums ?? base.topAlbums,
    topAlbumsByMs: raw.topAlbumsByMs ?? base.topAlbumsByMs,
    lovedTracks: raw.lovedTracks ?? base.lovedTracks,
    libraryGrowthHeatmap:
      raw.libraryGrowthHeatmap ?? base.libraryGrowthHeatmap,
    playlists: { ...base.playlists, ...(raw.playlists ?? {}) },
    decades: raw.decades ?? base.decades,
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
