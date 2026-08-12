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
import type { WhatsAppInsights } from "@/platform/whatsapp-types"

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
  whatsappInsights?: WhatsAppInsights | null
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

const WHATSAPP_ACCOUNT_VIDEO_IDS = [
  "wa-overview",
  "wa-connections",
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
  "sp-skips",
  "heatmap",
  "activity",
  "sent-received",
] as const

const APPLE_MUSIC_VIDEO_IDS = [
  "am-listen",
  "am-top-artists",
  "am-listen-heatmap",
  "am-listen-hours",
  "am-top-tracks",
  "am-plays-by-era",
  "am-top-genres",
  "am-top-albums",
  "am-library",
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

/** WhatsApp Account Information report slides. */
export function buildWhatsAppStorySpecs(
  insights: WhatsAppInsights
): WrapStorySpec[] {
  const specs: WrapStorySpec[] = []

  const hasOverview =
    insights.contactCount > 0 ||
    insights.groupCount > 0 ||
    insights.blockedCount > 0 ||
    insights.deviceCount > 0

  if (hasOverview) {
    const username = insights.profile.username?.trim()
    const phone = insights.profile.phone?.trim()
    specs.push({
      id: "wa-overview",
      exportName: "wa-overview-kpis",
      heading: "Your WhatsApp year",
      subtext: [
        username ? `@${username}` : phone,
        `${fmt(insights.contactCount)} contacts`,
        `${fmt(insights.groupCount)} groups`,
      ]
        .filter(Boolean)
        .join(" · "),
    })
  }

  if (insights.contacts.length > 0 || insights.groups.length > 0) {
    specs.push({
      id: "wa-connections",
      exportName: "wa-connections-list",
      heading: "Your connections",
      subtext: `${fmt(insights.contactCount)} contacts · ${fmt(insights.groupCount)} groups`,
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
      // KPIs live in the captured card — no duplicate strip at the bottom.
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
      // KPIs live in the captured card — no duplicate strip at the bottom.
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

  if (input.platformId === "whatsapp" && input.whatsappInsights) {
    const wa = buildWhatsAppStorySpecs(input.whatsappInsights)
    return {
      storySpecs: wa,
      videoSlideIds: pickVideoIds(WHATSAPP_ACCOUNT_VIDEO_IDS, wa),
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
      // KPIs live in the captured card — no duplicate strip at the bottom.
    })
  }

  if (insights.skipCount > 0 || insights.format) {
    specs.push({
      id: "sp-skips",
      exportName: "spotify-skip-kpis",
      heading: "Playback details",
      subtext: `${fmt(insights.skipCount)} short plays · ${insights.format === "extended" ? "Extended" : "Account"} export`,
      // KPIs live in the captured card — no duplicate strip at the bottom.
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
      // KPIs live in the captured card — no duplicate strip at the bottom.
    })
  }

  if (
    insights.libraryTrackCount > 0 ||
    insights.lovedCount > 0 ||
    insights.skipCount > 0
  ) {
    specs.push({
      id: "am-library",
      exportName: "apple-music-library-kpis",
      heading: "Your library",
      subtext: `${fmt(insights.libraryTrackCount)} tracks · ${fmt(insights.lovedCount)} loved`,
      // KPIs live in the captured card — no duplicate strip at the bottom.
    })
  }

  const topArtist = insights.topArtists?.[0]
  if (topArtist) {
    specs.push({
      id: "am-top-artists",
      exportName: "apple-music-top-artists",
      heading: "Top artists",
      subtext: `Led by ${topArtist.name} · ${fmt(topArtist.count)} plays`,
    })
  }

  const topTrack = insights.topTracks?.[0]
  if (topTrack) {
    specs.push({
      id: "am-top-tracks",
      exportName: "apple-music-top-tracks",
      heading: "Top tracks",
      subtext: `Led by ${topTrack.name} · ${fmt(topTrack.count)} plays`,
    })
  }

  const heatmap = insights.listenHeatmap ?? []
  const heatmapUsable =
    heatmap.length > 0 &&
    !(heatmap.length === 1 && heatmap[0]?.date === "1970-01-01")
  if (heatmapUsable) {
    const total = heatmap.reduce((sum, d) => sum + d.count, 0)
    specs.push({
      id: "am-listen-heatmap",
      exportName: "apple-music-listen-heatmap",
      heading: "Listening activity",
      subtext: `${fmt(total)} plays on the calendar.`,
    })
  }

  const hourly = Array.from(
    { length: 24 },
    (_, i) => Number(insights.listenHourly?.[i] ?? 0) || 0
  )
  if (hourly.some((n) => n > 0)) {
    const peak = peakHourLabel(hourly)
    const total = hourly.reduce((a, b) => a + b, 0)
    specs.push({
      id: "am-listen-hours",
      exportName: "apple-music-listen-hours",
      heading: "When you listen",
      subtext: `Peak ${peak} · ${fmt(total)} plays (UTC)`,
    })
  }

  const years = insights.playsByYear ?? []
  const decades = insights.decades ?? []
  if (years.length > 1) {
    const peakYear = [...years].sort((a, b) => b.count - a.count)[0]!
    specs.push({
      id: "am-plays-by-era",
      exportName: "apple-music-plays-by-year",
      heading: "Plays by release era",
      subtext: `Peak ${peakYear.year} · ${fmt(peakYear.count)} plays`,
    })
  } else if (decades.length > 0) {
    const peakDecade = [...decades].sort((a, b) => b.count - a.count)[0]!
    specs.push({
      id: "am-plays-by-era",
      exportName: "apple-music-plays-by-decade",
      heading: "Plays by release era",
      subtext: `Peak ${peakDecade.decade}s · ${fmt(peakDecade.count)} plays`,
    })
  }

  const topGenre = insights.topGenres?.[0]
  if (topGenre) {
    specs.push({
      id: "am-top-genres",
      exportName: "apple-music-top-genres",
      heading: "Top genres",
      subtext: `Led by ${topGenre.name} · ${fmt(topGenre.count)} plays`,
    })
  }

  const topAlbum = insights.topAlbums?.[0]
  if (topAlbum) {
    specs.push({
      id: "am-top-albums",
      exportName: "apple-music-top-albums",
      heading: "Top albums",
      subtext: `Led by ${topAlbum.name} · ${fmt(topAlbum.count)} plays`,
    })
  }

  return specs
}
