import { fmt } from "@/components/wrap/chart-theme"
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
}

const MESSAGING_VIDEO_IDS = [
  "activity",
  "sent-received",
  "heatmap",
  "circadian",
  "emojis",
] as const

const INSTAGRAM_VIDEO_IDS = [
  "ig-network",
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
  "x-network",
  "x-tweets",
  "heatmap",
  "activity",
  "sent-received",
] as const

const TIKTOK_VIDEO_IDS = [
  "tt-activity",
  "tt-engage",
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
    social.unfollowedRecentlyCount > 0
  if (hasNetwork) {
    specs.push({
      id: "ig-network",
      exportName: "ig-network-kpis",
      heading: "Your network",
      subtext: `${fmt(social.followerCount)} followers · ${fmt(social.followingCount)} following`,
      kpis: [
        { label: "Followers", value: fmt(social.followerCount) },
        { label: "Following", value: fmt(social.followingCount) },
        {
          label: "Unfollowed",
          value: fmt(social.unfollowedRecentlyCount),
        },
      ],
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
      subtext: `${fmt(insights.connectionCount)} connections`,
      kpis: [
        { label: "Connections", value: fmt(insights.connectionCount) },
        { label: "Invites out", value: fmt(insights.invitationOutgoing) },
        { label: "Reactions", value: fmt(insights.reactionsCount) },
      ],
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
      kpis: [
        { label: "Job apps", value: fmt(insights.jobApplicationCount) },
        {
          label: "Endorsements",
          value: fmt(insights.endorsementReceivedCount),
        },
        { label: "Skills", value: fmt(insights.skills.length) },
      ],
    })
  }

  return specs
}

/** X network / tweet slides (gated on data). */
export function buildXStorySpecs(insights: XInsights): WrapStorySpec[] {
  const specs: WrapStorySpec[] = []

  if (insights.followerCount > 0 || insights.followingCount > 0) {
    specs.push({
      id: "x-network",
      exportName: "x-network-kpis",
      heading: "Your network",
      subtext: `${fmt(insights.followerCount)} followers · ${fmt(insights.followingCount)} following`,
      kpis: [
        { label: "Followers", value: fmt(insights.followerCount) },
        { label: "Following", value: fmt(insights.followingCount) },
        { label: "Likes", value: fmt(insights.likeCount) },
      ],
    })
  }

  if (insights.tweetCount > 0) {
    specs.push({
      id: "x-tweets",
      exportName: "x-tweet-kpis",
      heading: "Your posts",
      subtext: `${fmt(insights.tweetCount)} tweets · ${fmt(insights.likeCount)} likes`,
      kpis: [
        { label: "Tweets", value: fmt(insights.tweetCount) },
        { label: "Originals", value: fmt(insights.originalCount) },
        { label: "Replies", value: fmt(insights.replyCount) },
      ],
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
  const messaging = buildMessagingStorySpecs(
    input.displayName,
    input.analytics
  )

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
    const storySpecs = [...x, ...messaging]
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

  return {
    storySpecs: messaging,
    videoSlideIds: pickVideoIds(MESSAGING_VIDEO_IDS, messaging),
  }
}
