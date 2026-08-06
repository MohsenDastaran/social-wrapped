import type { HeatmapDay } from "@/platform/analytics-types"

export type TikTokLinkEvent = {
  date: string
  link: string
}

export type TikTokComment = {
  date: string
  comment: string
  link?: string | null
}

export type TikTokProfile = {
  username: string
  nickname: string
  bio?: string | null
  region?: string | null
  birthdate?: string | null
  followerCount: number
  followingCount: number
  likesReceived?: number | null
}

export type TikTokInsights = {
  profile: TikTokProfile
  watchCount: number
  likeCount: number
  favouriteVideoCount: number
  favouriteSoundCount: number
  favouriteHashtagCount: number
  favouriteEffectCount: number
  commentCount: number
  dmThreadCount: number
  dmMessageCount: number
  watchHeatmap: HeatmapDay[]
  watchHourly: number[]
  likeHeatmap: HeatmapDay[]
  likeHourly: number[]
  commentHeatmap: HeatmapDay[]
  recentWatchLinks: TikTokLinkEvent[]
  recentLikeLinks: TikTokLinkEvent[]
  recentFavouriteVideos: TikTokLinkEvent[]
  recentComments: TikTokComment[]
}

export function emptyTikTokInsights(): TikTokInsights {
  return {
    profile: {
      username: "",
      nickname: "",
      followerCount: 0,
      followingCount: 0,
    },
    watchCount: 0,
    likeCount: 0,
    favouriteVideoCount: 0,
    favouriteSoundCount: 0,
    favouriteHashtagCount: 0,
    favouriteEffectCount: 0,
    commentCount: 0,
    dmThreadCount: 0,
    dmMessageCount: 0,
    watchHeatmap: [],
    watchHourly: Array.from({ length: 24 }, () => 0),
    likeHeatmap: [],
    likeHourly: Array.from({ length: 24 }, () => 0),
    commentHeatmap: [],
    recentWatchLinks: [],
    recentLikeLinks: [],
    recentFavouriteVideos: [],
    recentComments: [],
  }
}

function padHourly(raw?: number[] | null): number[] {
  return Array.from({ length: 24 }, (_, i) => Number(raw?.[i] ?? 0) || 0)
}

export function normalizeTikTokInsights(
  raw?: Partial<TikTokInsights> | null
): TikTokInsights {
  const base = emptyTikTokInsights()
  if (!raw) return base
  return {
    ...base,
    ...raw,
    profile: { ...base.profile, ...(raw.profile ?? {}) },
    watchHeatmap: raw.watchHeatmap ?? base.watchHeatmap,
    watchHourly: padHourly(raw.watchHourly),
    likeHeatmap: raw.likeHeatmap ?? base.likeHeatmap,
    likeHourly: padHourly(raw.likeHourly),
    commentHeatmap: raw.commentHeatmap ?? base.commentHeatmap,
    recentWatchLinks: raw.recentWatchLinks ?? base.recentWatchLinks,
    recentLikeLinks: raw.recentLikeLinks ?? base.recentLikeLinks,
    recentFavouriteVideos:
      raw.recentFavouriteVideos ?? base.recentFavouriteVideos,
    recentComments: raw.recentComments ?? base.recentComments,
  }
}
