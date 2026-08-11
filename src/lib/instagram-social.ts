import type { InstagramSocialInsights } from "@/platform/analytics-types"

/** Safe defaults for legacy wraps missing engagement/saved fields. */
export function emptyInstagramSocial(): InstagramSocialInsights {
  return {
    followerCount: 0,
    followingCount: 0,
    unfollowedRecentlyCount: 0,
    notFollowingBack: [],
    fansYouDontFollow: [],
    topLikedAccounts: [],
    topStoryLikedAccounts: [],
    blockedCount: 0,
    closeFriendsCount: 0,
    blockedProfiles: [],
    closeFriends: [],
    storiesViewedCount: 0,
    storyViewHeatmap: [],
    storyViewHourly: Array.from({ length: 24 }, () => 0),
    topStoryViewedAccounts: [],
    likedPostsCount: 0,
    likedCommentsCount: 0,
    commentsWrittenCount: 0,
    likeHeatmap: [],
    likeHourly: Array.from({ length: 24 }, () => 0),
    topCommentedAccounts: [],
    topReelCommentedAccounts: [],
    topLikedCommentAccounts: [],
    savedPostsCount: 0,
    topSavedAccounts: [],
    savedCollections: [],
  }
}

/** Merge partial/legacy social JSON onto empty defaults. */
export function normalizeInstagramSocial(
  raw?: Partial<InstagramSocialInsights> | null
): InstagramSocialInsights {
  const base = emptyInstagramSocial()
  if (!raw) return base
  const hourly = Array.isArray(raw.likeHourly) ? raw.likeHourly : base.likeHourly
  const likeHourly = Array.from({ length: 24 }, (_, i) => Number(hourly[i] ?? 0) || 0)
  const storyHourly = Array.isArray(raw.storyViewHourly)
    ? raw.storyViewHourly
    : base.storyViewHourly
  const storyViewHourly = Array.from(
    { length: 24 },
    (_, i) => Number(storyHourly[i] ?? 0) || 0
  )
  return {
    ...base,
    ...raw,
    notFollowingBack: raw.notFollowingBack ?? base.notFollowingBack,
    fansYouDontFollow: raw.fansYouDontFollow ?? base.fansYouDontFollow,
    topLikedAccounts: raw.topLikedAccounts ?? base.topLikedAccounts,
    topStoryLikedAccounts: raw.topStoryLikedAccounts ?? base.topStoryLikedAccounts,
    blockedProfiles: raw.blockedProfiles ?? base.blockedProfiles,
    closeFriends: raw.closeFriends ?? base.closeFriends,
    storyViewHeatmap: raw.storyViewHeatmap ?? base.storyViewHeatmap,
    storyViewHourly,
    topStoryViewedAccounts:
      raw.topStoryViewedAccounts ?? base.topStoryViewedAccounts,
    likeHeatmap: raw.likeHeatmap ?? base.likeHeatmap,
    likeHourly,
    topCommentedAccounts: raw.topCommentedAccounts ?? base.topCommentedAccounts,
    topReelCommentedAccounts:
      raw.topReelCommentedAccounts ?? base.topReelCommentedAccounts,
    topLikedCommentAccounts:
      raw.topLikedCommentAccounts ?? base.topLikedCommentAccounts,
    topSavedAccounts: raw.topSavedAccounts ?? base.topSavedAccounts,
    savedCollections: raw.savedCollections ?? base.savedCollections,
  }
}
