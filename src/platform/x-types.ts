import type { HeatmapDay, KeywordStats } from "@/platform/analytics-types"

export type XCounted = {
  name: string
  count: number
}

export type XYearCount = {
  year: number
  count: number
}

export type XProfile = {
  displayName: string
  username: string
  accountId: string
  bio?: string | null
  createdAt?: string | null
}

export type XInsights = {
  profile: XProfile
  followerCount: number
  followingCount: number
  blockCount: number
  muteCount: number
  tweetCount: number
  originalCount: number
  replyCount: number
  retweetCount: number
  tweetHeatmap: HeatmapDay[]
  tweetHourly: number[]
  tweetsByYear: XYearCount[]
  topMentions: XCounted[]
  likeCount: number
  dmThreadCount: number
  dmMessageCount: number
  groupDmThreadCount: number
  communityTweetCount: number
  hasOfficialHtml: boolean
  /** Word frequencies from your tweets (retweets excluded). */
  keywords?: KeywordStats
}

export function emptyXInsights(): XInsights {
  return {
    profile: { displayName: "", username: "", accountId: "" },
    followerCount: 0,
    followingCount: 0,
    blockCount: 0,
    muteCount: 0,
    tweetCount: 0,
    originalCount: 0,
    replyCount: 0,
    retweetCount: 0,
    tweetHeatmap: [],
    tweetHourly: Array.from({ length: 24 }, () => 0),
    tweetsByYear: [],
    topMentions: [],
    likeCount: 0,
    dmThreadCount: 0,
    dmMessageCount: 0,
    groupDmThreadCount: 0,
    communityTweetCount: 0,
    hasOfficialHtml: false,
    keywords: { counts: {} },
  }
}

export function normalizeXInsights(
  raw?: Partial<XInsights> | null
): XInsights {
  const base = emptyXInsights()
  if (!raw) return base
  const hourly = Array.isArray(raw.tweetHourly) ? raw.tweetHourly : base.tweetHourly
  const tweetHourly = Array.from(
    { length: 24 },
    (_, i) => Number(hourly[i] ?? 0) || 0
  )
  return {
    ...base,
    ...raw,
    profile: { ...base.profile, ...(raw.profile ?? {}) },
    tweetHeatmap: raw.tweetHeatmap ?? base.tweetHeatmap,
    tweetHourly,
    tweetsByYear: raw.tweetsByYear ?? base.tweetsByYear,
    topMentions: raw.topMentions ?? base.topMentions,
    keywords: raw.keywords ?? base.keywords,
  }
}
