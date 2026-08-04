import type { HeatmapDay } from "@/platform/analytics-types"

export type LinkedInCounted = {
  name: string
  count: number
}

export type LinkedInYearCount = {
  year: number
  count: number
}

export type LinkedInProfile = {
  firstName: string
  lastName: string
  headline?: string | null
  industry?: string | null
  geoLocation?: string | null
}

export type LinkedInPosition = {
  company: string
  title: string
  location?: string | null
  startedOn?: string | null
  finishedOn?: string | null
}

export type LinkedInJobApp = {
  company: string
  title: string
  appliedOn?: string | null
}

export type LinkedInInsights = {
  profile: LinkedInProfile
  connectionCount: number
  invitationOutgoing: number
  invitationIncoming: number
  activeFollows: number
  unfollows: number
  companyFollows: number
  topConnectionCompanies: LinkedInCounted[]
  connectionsByYear: LinkedInYearCount[]
  reactionCountsByType: LinkedInCounted[]
  reactionsCount: number
  commentsCount: number
  sharesCount: number
  savedCount: number
  votesCount: number
  repostsCount: number
  reactionHeatmap: HeatmapDay[]
  reactionHourly: number[]
  positions: LinkedInPosition[]
  skills: string[]
  endorsementGivenCount: number
  endorsementReceivedCount: number
  recommendationsGivenCount: number
  recommendationsReceivedCount: number
  jobApplicationCount: number
  recentJobApplications: LinkedInJobApp[]
  topSearchQueries: LinkedInCounted[]
}

export function emptyLinkedInInsights(): LinkedInInsights {
  return {
    profile: { firstName: "", lastName: "" },
    connectionCount: 0,
    invitationOutgoing: 0,
    invitationIncoming: 0,
    activeFollows: 0,
    unfollows: 0,
    companyFollows: 0,
    topConnectionCompanies: [],
    connectionsByYear: [],
    reactionCountsByType: [],
    reactionsCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    savedCount: 0,
    votesCount: 0,
    repostsCount: 0,
    reactionHeatmap: [],
    reactionHourly: Array.from({ length: 24 }, () => 0),
    positions: [],
    skills: [],
    endorsementGivenCount: 0,
    endorsementReceivedCount: 0,
    recommendationsGivenCount: 0,
    recommendationsReceivedCount: 0,
    jobApplicationCount: 0,
    recentJobApplications: [],
    topSearchQueries: [],
  }
}

/** Merge partial/legacy LinkedIn JSON onto empty defaults. */
export function normalizeLinkedInInsights(
  raw?: Partial<LinkedInInsights> | null
): LinkedInInsights {
  const base = emptyLinkedInInsights()
  if (!raw) return base
  const hourly = Array.isArray(raw.reactionHourly)
    ? raw.reactionHourly
    : base.reactionHourly
  const reactionHourly = Array.from(
    { length: 24 },
    (_, i) => Number(hourly[i] ?? 0) || 0
  )
  return {
    ...base,
    ...raw,
    profile: {
      ...base.profile,
      ...(raw.profile ?? {}),
    },
    topConnectionCompanies:
      raw.topConnectionCompanies ?? base.topConnectionCompanies,
    connectionsByYear: raw.connectionsByYear ?? base.connectionsByYear,
    reactionCountsByType:
      raw.reactionCountsByType ?? base.reactionCountsByType,
    reactionHeatmap: raw.reactionHeatmap ?? base.reactionHeatmap,
    reactionHourly,
    positions: raw.positions ?? base.positions,
    skills: raw.skills ?? base.skills,
    recentJobApplications:
      raw.recentJobApplications ?? base.recentJobApplications,
    topSearchQueries: raw.topSearchQueries ?? base.topSearchQueries,
  }
}
