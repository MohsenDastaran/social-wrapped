import { fmt } from "@/components/wrap/chart-theme"
import { peakHourLabel } from "@/components/wrap/charts/circadian-polar-chart"
import { keywordsToWords } from "@/components/wrap/charts/word-cloud-chart"
import type { PlatformId } from "@/lib/platforms"
import {
  buildMessagingStorySpecs,
  type WrapStorySpec,
} from "@/lib/wrap-stories"
import type {
  InstagramSocialInsights,
  WrapAnalytics,
} from "@/platform/analytics-types"
import type { LinkedInInsights } from "@/platform/linkedin-types"
import {
  formatListeningMs,
  type AppleMusicInsights,
} from "@/platform/apple-music-types"
import type { SpotifyInsights } from "@/platform/spotify-types"
import type { TikTokInsights } from "@/platform/tiktok-types"
import type { XInsights } from "@/platform/x-types"

export type PlatformStoryCatalog = {
  storySpecs: WrapStorySpec[]
  /** Ordered ids for the short Remotion reel (max 5). */
  videoSlideIds: string[]
}

export type StoryCatalogInput = {
  platformId: PlatformId
  displayName: string
  analytics: WrapAnalytics
  instagramSocial?: InstagramSocialInsights | null
  linkedinInsights?: LinkedInInsights | null
  xInsights?: XInsights | null
  tiktokInsights?: TikTokInsights | null
  spotifyInsights?: SpotifyInsights | null
  appleMusicInsights?: AppleMusicInsights | null
}

const MESSAGING_VIDEO_IDS = [
  "activity",
  "sent-received",
  "heatmap",
  "circadian",
  "word-cloud",
] as const

const INSTAGRAM_VIDEO_IDS = [
  "ig-network",
  "ig-story-view-heatmap",
  "ig-story-view-hours",
  "heatmap",
  "ig-top-liked",
  "ig-story-hearts",
  "activity",
  "sent-received",
] as const

const LINKEDIN_VIDEO_IDS = [
  "li-network",
  "li-career",
  "heatmap",
  "activity",
  "sent-received",
] as const

const X_VIDEO_IDS = [
  "x-overview",
  "x-tweet-heatmap",
  "x-tweet-hours",
  "x-tweet-word-cloud",
  "activity",
  "sent-received",
] as const

/** Messaging slides that X tweet charts replace. */
const X_MESSAGING_STORY_EXCLUDE = new Set([
  "heatmap",
  "circadian",
  "word-cloud",
])

const TIKTOK_VIDEO_IDS = [
  "tt-activity",
  "tt-engage",
  "heatmap",
  "activity",
  "sent-received",
] as const

const SPOTIFY_VIDEO_IDS = [
  "sp-listen",
  "sp-tops",
  "heatmap",
  "activity",
  "sent-received",
] as const

const APPLE_MUSIC_VIDEO_IDS = [
  "am-listen",
  "am-tops",
  "heatmap",
  "activity",
  "sent-received",
] as const

/** Instagram outbound social / engagement slides (gated on data). */
export function buildInstagramStorySpecs(
  social: InstagramSocialInsights
): WrapStorySpec[] {
  const specs: WrapStorySpec[] = []

  const hasNetwork =
    social.followerCount > 0 ||
    social.followingCount > 0 ||
    social.unfollowedRecentlyCount > 0 ||
    (social.blockedCount ?? 0) > 0 ||
    (social.closeFriendsCount ?? 0) > 0
  if (hasNetwork) {
    specs.push({
      id: "ig-network",
      exportName: "ig-network-kpis",
      heading: "Your network",
      subtext: `${fmt(social.followerCount)} followers · ${fmt(social.followingCount)} following · ${fmt(social.blockedCount ?? 0)} blocked`,
      // KPIs live in the captured card — no duplicate strip at the bottom.
    })
  }

  const storyViewHeatmap = social.storyViewHeatmap ?? []
  if (storyViewHeatmap.length > 0) {
    const total = storyViewHeatmap.reduce((sum, d) => sum + d.count, 0)
    specs.push({
      id: "ig-story-view-heatmap",
      exportName: "ig-story-view-heatmap",
      heading: "Stories you watched",
      subtext: `${fmt(social.storiesViewedCount ?? total)} views on the calendar.`,
    })
  }

  const storyViewHourly = Array.from(
    { length: 24 },
    (_, i) => Number(social.storyViewHourly?.[i] ?? 0) || 0
  )
  if (storyViewHourly.some((n) => n > 0)) {
    const peak = peakHourLabel(storyViewHourly)
    const total = storyViewHourly.reduce((a, b) => a + b, 0)
    specs.push({
      id: "ig-story-view-hours",
      exportName: "ig-story-view-hours",
      heading: "When you watch",
      subtext: `Peak ${peak} · ${fmt(total)} story views (UTC)`,
    })
  }

  if ((social.topLikedAccounts ?? []).length > 0) {
    const top = social.topLikedAccounts[0]!
    specs.push({
      id: "ig-top-liked",
      exportName: "ig-top-liked",
      heading: "Who you like most",
      subtext: `Led by @${top.username} × ${fmt(top.count)}.`,
    })
  }

  if ((social.topStoryLikedAccounts ?? []).length > 0) {
    const top = social.topStoryLikedAccounts[0]!
    specs.push({
      id: "ig-story-hearts",
      exportName: "ig-story-hearts",
      heading: "Stories you’ve liked",
      subtext: `Led by @${top.username} × ${fmt(top.count)}.`,
    })
  }

  return specs
}

/** LinkedIn network / career slides (gated on data). */
export function buildLinkedInStorySpecs(
  insights: LinkedInInsights
): WrapStorySpec[] {
  const specs: WrapStorySpec[] = []

  if (insights.connectionCount > 0) {
    specs.push({
      id: "li-network",
      exportName: "li-network-kpis",
      heading: "Your network",
      subtext: `${fmt(insights.connectionCount)} connections · ${fmt(insights.invitationOutgoing)} invites sent`,
      // KPIs live in the captured card — no duplicate strip at the bottom.
    })
  }

  if (insights.jobApplicationCount > 0 || insights.positions.length > 0) {
    specs.push({
      id: "li-career",
      exportName: "li-career-kpis",
      heading: "Career chapter",
      subtext:
        insights.jobApplicationCount > 0
          ? `${fmt(insights.jobApplicationCount)} job applications`
          : `${fmt(insights.positions.length)} positions on your profile`,
      // KPIs live in the captured card — no duplicate strip at the bottom.
    })
  }

  return specs
}

/** X network / tweet slides (gated on data). */
export function buildXStorySpecs(insights: XInsights): WrapStorySpec[] {
  const specs: WrapStorySpec[] = []

  const hasOverview =
    insights.followerCount > 0 ||
    insights.followingCount > 0 ||
    insights.tweetCount > 0 ||
    insights.likeCount > 0 ||
    insights.dmThreadCount > 0 ||
    insights.dmMessageCount > 0

  if (hasOverview) {
    specs.push({
      id: "x-overview",
      exportName: "x-overview-kpis",
      heading: "Your year on X",
      subtext: `${fmt(insights.followerCount)} followers · ${fmt(insights.tweetCount)} tweets · ${fmt(insights.likeCount)} likes`,
      // KPIs live in the captured card — no duplicate strip at the bottom.
    })
  }

  const tweetHeatmap = insights.tweetHeatmap ?? []
  if (tweetHeatmap.length > 0) {
    const total = tweetHeatmap.reduce((sum, d) => sum + d.count, 0)
    specs.push({
      id: "x-tweet-heatmap",
      exportName: "x-tweet-heatmap",
      heading: "Tweet activity",
      subtext: `${fmt(total)} tweets on the calendar.`,
    })
  }

  const tweetHourly = Array.from(
    { length: 24 },
    (_, i) => Number(insights.tweetHourly?.[i] ?? 0) || 0
  )
  if (tweetHourly.some((n) => n > 0)) {
    const peak = peakHourLabel(tweetHourly)
    const total = tweetHourly.reduce((a, b) => a + b, 0)
    specs.push({
      id: "x-tweet-hours",
      exportName: "x-tweet-hours",
      heading: "When you tweet",
      subtext: `Peak ${peak} · ${fmt(total)} tweets (UTC)`,
    })
  }

  const topTweetWords = keywordsToWords(
    insights.keywords?.counts ?? {},
    "you",
    1
  )
  if (topTweetWords.length > 0) {
    const top = topTweetWords[0]!
    specs.push({
      id: "x-tweet-word-cloud",
      exportName: "x-tweet-word-cloud",
      heading: "Tweet word cloud",
      subtext: `Led by “${top.text}” × ${fmt(top.value)} — the words you reach for in posts.`,
    })
  }

  return specs
}

/** TikTok activity slides (gated on data). */
export function buildTikTokStorySpecs(
  insights: TikTokInsights
): WrapStorySpec[] {
  const specs: WrapStorySpec[] = []

  if (insights.watchCount > 0 || insights.likeCount > 0) {
    specs.push({
      id: "tt-activity",
      exportName: "tiktok-network-kpis",
      heading: "Your TikTok year",
      subtext: `${fmt(insights.watchCount)} watches · ${fmt(insights.likeCount)} likes`,
      kpis: [
        { label: "Watches", value: fmt(insights.watchCount) },
        { label: "Likes", value: fmt(insights.likeCount) },
        { label: "Comments", value: fmt(insights.commentCount) },
      ],
    })
  }

  if (
    insights.favouriteVideoCount > 0 ||
    insights.dmThreadCount > 0 ||
    insights.commentCount > 0
  ) {
    specs.push({
      id: "tt-engage",
      exportName: "tiktok-engage-kpis",
      heading: "Saved & chats",
      subtext: `${fmt(insights.favouriteVideoCount)} favorites · ${fmt(insights.dmThreadCount)} DM threads`,
      kpis: [
        { label: "Favorites", value: fmt(insights.favouriteVideoCount) },
        { label: "DM threads", value: fmt(insights.dmThreadCount) },
        { label: "DM msgs", value: fmt(insights.dmMessageCount) },
      ],
    })
  }

  return specs
}

function pickVideoIds(
  preferred: readonly string[],
  available: WrapStorySpec[]
): string[] {
  const have = new Set(available.map((s) => s.id))
  return preferred.filter((id) => have.has(id)).slice(0, 5)
}

/** Per-platform Stories carousel + video highlight ids. */
export function buildPlatformStoryCatalog(
  input: StoryCatalogInput
): PlatformStoryCatalog {
  const messaging = buildMessagingStorySpecs(input.displayName, input.analytics)

  if (input.platformId === "instagram" && input.instagramSocial) {
    const ig = buildInstagramStorySpecs(input.instagramSocial)
    const storySpecs = [...ig, ...messaging]
    return {
      storySpecs,
      videoSlideIds: pickVideoIds(INSTAGRAM_VIDEO_IDS, storySpecs),
    }
  }

  if (input.platformId === "linkedin" && input.linkedinInsights) {
    const li = buildLinkedInStorySpecs(input.linkedinInsights)
    const storySpecs = [...li, ...messaging]
    return {
      storySpecs,
      videoSlideIds: pickVideoIds(LINKEDIN_VIDEO_IDS, storySpecs),
    }
  }

  if (input.platformId === "x" && input.xInsights) {
    const x = buildXStorySpecs(input.xInsights)
    const messagingForX = messaging.filter(
      (s) => !X_MESSAGING_STORY_EXCLUDE.has(s.id)
    )
    const storySpecs = [...x, ...messagingForX]
    return {
      storySpecs,
      videoSlideIds: pickVideoIds(X_VIDEO_IDS, storySpecs),
    }
  }

  if (input.platformId === "tiktok" && input.tiktokInsights) {
    const tt = buildTikTokStorySpecs(input.tiktokInsights)
    const storySpecs = [...tt, ...messaging]
    return {
      storySpecs,
      videoSlideIds: pickVideoIds(TIKTOK_VIDEO_IDS, storySpecs),
    }
  }

  if (input.platformId === "spotify" && input.spotifyInsights) {
    const sp = buildSpotifyStorySpecs(input.spotifyInsights)
    const storySpecs = [...sp, ...messaging]
    return {
      storySpecs,
      videoSlideIds: pickVideoIds(SPOTIFY_VIDEO_IDS, storySpecs),
    }
  }

  if (input.platformId === "apple-music" && input.appleMusicInsights) {
    const am = buildAppleMusicStorySpecs(input.appleMusicInsights)
    const storySpecs = [...am, ...messaging]
    return {
      storySpecs,
      videoSlideIds: pickVideoIds(APPLE_MUSIC_VIDEO_IDS, storySpecs),
    }
  }

  return {
    storySpecs: messaging,
    videoSlideIds: pickVideoIds(MESSAGING_VIDEO_IDS, messaging),
  }
}

/** Spotify listening slides (gated on data). */
export function buildSpotifyStorySpecs(
  insights: SpotifyInsights
): WrapStorySpec[] {
  const specs: WrapStorySpec[] = []

  if (insights.playCount > 0) {
    specs.push({
      id: "sp-listen",
      exportName: "spotify-listen-kpis",
      heading: "Your listening year",
      subtext: `${fmt(insights.playCount)} plays · ${formatListeningMs(insights.totalMsPlayed)}`,
      kpis: [
        { label: "Plays", value: fmt(insights.playCount) },
        {
          label: "Time",
          value: formatListeningMs(insights.totalMsPlayed),
        },
        { label: "Artists", value: fmt(insights.uniqueArtistCount) },
      ],
    })
  }

  const topArtist = insights.topArtists?.[0]
  if (topArtist) {
    specs.push({
      id: "sp-tops",
      exportName: "spotify-skip-kpis",
      heading: "Your #1 artist",
      subtext: `${topArtist.name} · ${fmt(topArtist.count)} plays`,
      kpis: [
        { label: "Artist", value: topArtist.name.slice(0, 18) },
        { label: "Plays", value: fmt(topArtist.count) },
        { label: "Tracks", value: fmt(insights.uniqueTrackCount) },
      ],
    })
  }

  return specs
}

/** Apple Music library slides (gated on data). */
export function buildAppleMusicStorySpecs(
  insights: AppleMusicInsights
): WrapStorySpec[] {
  const specs: WrapStorySpec[] = []

  if (insights.playCount > 0) {
    specs.push({
      id: "am-listen",
      exportName: "apple-music-listen-kpis",
      heading: "Your listening",
      subtext: `${fmt(insights.playCount)} plays · ${formatListeningMs(insights.totalMsPlayed)}`,
      kpis: [
        { label: "Plays", value: fmt(insights.playCount) },
        {
          label: "Time",
          value: formatListeningMs(insights.totalMsPlayed),
        },
        { label: "Artists", value: fmt(insights.uniqueArtistCount) },
      ],
    })
  }

  const topArtist = insights.topArtists?.[0]
  if (topArtist) {
    specs.push({
      id: "am-tops",
      exportName: "apple-music-library-kpis",
      heading: "Your #1 artist",
      subtext: `${topArtist.name} · ${fmt(topArtist.count)} plays`,
      kpis: [
        { label: "Artist", value: topArtist.name.slice(0, 18) },
        { label: "Plays", value: fmt(topArtist.count) },
        { label: "Library", value: fmt(insights.libraryTrackCount) },
      ],
    })
  }

  return specs
}
