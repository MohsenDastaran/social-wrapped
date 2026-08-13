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

export type SpotifyPlaylistSummary = {
  name: string
  trackCount: number
}

export type SpotifyPlaylistInsights = {
  totalCount: number
  userPlaylistCount: number
  topPlaylists: SpotifyPlaylistSummary[]
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
  topAlbums: SpotifyCounted[]
  topAlbumsByMs: SpotifyCounted[]
  topPodcasts: SpotifyCounted[]
  savedTracks: SpotifyCounted[]
  topSearchQueries: SpotifyCounted[]
  playlists: SpotifyPlaylistInsights
  libraryGrowthHeatmap: HeatmapDay[]
  savedTrackCount: number
  savedArtistCount: number
  savedAlbumCount: number
  followingCount: number
  followerCount: number
  podcastPlayCount: number
  podcastMsPlayed: number
  format: string
}

const emptyPlaylists = (): SpotifyPlaylistInsights => ({
  totalCount: 0,
  userPlaylistCount: 0,
  topPlaylists: [],
})

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
    topAlbums: [],
    topAlbumsByMs: [],
    topPodcasts: [],
    savedTracks: [],
    topSearchQueries: [],
    playlists: emptyPlaylists(),
    libraryGrowthHeatmap: [],
    savedTrackCount: 0,
    savedArtistCount: 0,
    savedAlbumCount: 0,
    followingCount: 0,
    followerCount: 0,
    podcastPlayCount: 0,
    podcastMsPlayed: 0,
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
    topAlbums: raw.topAlbums ?? base.topAlbums,
    topAlbumsByMs: raw.topAlbumsByMs ?? base.topAlbumsByMs,
    topPodcasts: raw.topPodcasts ?? base.topPodcasts,
    savedTracks: raw.savedTracks ?? base.savedTracks,
    topSearchQueries: raw.topSearchQueries ?? base.topSearchQueries,
    playlists: {
      ...base.playlists,
      ...(raw.playlists ?? {}),
      topPlaylists: raw.playlists?.topPlaylists ?? base.playlists.topPlaylists,
    },
    libraryGrowthHeatmap: raw.libraryGrowthHeatmap ?? base.libraryGrowthHeatmap,
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
