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

  return {
    storySpecs: messaging,
    videoSlideIds: pickVideoIds(MESSAGING_VIDEO_IDS, messaging),
  }
}
