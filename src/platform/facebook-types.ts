/**
 * TypeScript mirror of Rust `FacebookInsights` (serde camelCase).
 */

import type { HeatmapDay } from "@/platform/analytics-types"

export type FbCounted = {
  name: string
  count: number
}

export type FbYearCount = {
  year: number
  count: number
}

export type FacebookInsights = {
  displayName: string
  friendCount: number
  followingCount: number
  unfriendedCount: number
  friendsByYear: FbYearCount[]
  recentFriends: string[]
  unfriended: string[]
  reactionCount: number
  commentsWrittenCount: number
  reactionHeatmap: HeatmapDay[]
  reactionHourly: number[]
  topReactedNames: FbCounted[]
  topCommentedNames: FbCounted[]
  reactionTypes: FbCounted[]
  postCount: number
  postHeatmap: HeatmapDay[]
  postKeywords: Record<string, [number, number]>
  pageLikeCount: number
  topPages: FbCounted[]
  groupsJoinedCount: number
  groupsLeftCount: number
  recentGroups: string[]
  advertiserCount: number
  advertisers: string[]
  loginCount: number
  loginHeatmap: HeatmapDay[]
  topLoginSites: FbCounted[]
}

export function emptyFacebookInsights(): FacebookInsights {
  return {
    displayName: "",
    friendCount: 0,
    followingCount: 0,
    unfriendedCount: 0,
    friendsByYear: [],
    recentFriends: [],
    unfriended: [],
    reactionCount: 0,
    commentsWrittenCount: 0,
    reactionHeatmap: [],
    reactionHourly: Array.from({ length: 24 }, () => 0),
    topReactedNames: [],
    topCommentedNames: [],
    reactionTypes: [],
    postCount: 0,
    postHeatmap: [],
    postKeywords: {},
    pageLikeCount: 0,
    topPages: [],
    groupsJoinedCount: 0,
    groupsLeftCount: 0,
    recentGroups: [],
    advertiserCount: 0,
    advertisers: [],
    loginCount: 0,
    loginHeatmap: [],
    topLoginSites: [],
  }
}

function padHourly(raw?: number[] | null): number[] {
  return Array.from({ length: 24 }, (_, i) => Number(raw?.[i] ?? 0) || 0)
}

export function normalizeFacebookInsights(
  raw?: Partial<FacebookInsights> | null
): FacebookInsights {
  const base = emptyFacebookInsights()
  if (!raw) return base
  return {
    ...base,
    ...raw,
    friendsByYear: raw.friendsByYear ?? base.friendsByYear,
    recentFriends: raw.recentFriends ?? base.recentFriends,
    unfriended: raw.unfriended ?? base.unfriended,
    reactionHeatmap: raw.reactionHeatmap ?? base.reactionHeatmap,
    reactionHourly: padHourly(raw.reactionHourly),
    topReactedNames: raw.topReactedNames ?? base.topReactedNames,
    topCommentedNames: raw.topCommentedNames ?? base.topCommentedNames,
    reactionTypes: raw.reactionTypes ?? base.reactionTypes,
    postHeatmap: raw.postHeatmap ?? base.postHeatmap,
    postKeywords: raw.postKeywords ?? base.postKeywords,
    topPages: raw.topPages ?? base.topPages,
    recentGroups: raw.recentGroups ?? base.recentGroups,
    advertisers: raw.advertisers ?? base.advertisers,
    loginHeatmap: raw.loginHeatmap ?? base.loginHeatmap,
    topLoginSites: raw.topLoginSites ?? base.topLoginSites,
  }
}
