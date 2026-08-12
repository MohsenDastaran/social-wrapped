/**
 * TypeScript mirror of Rust `GoogleInsights` (serde camelCase).
 */

import type {
  ActivityTimeSeries,
  HeatmapDay,
} from "@/platform/analytics-types"

export type CountedItem = {
  name: string
  count: number
}

export type SkippedProduct = {
  reason: string
  pathHint: string
}

export type YouTubeInsights = {
  channelTitle?: string | null
  subscriptionCount: number
  commentCount: number
  playlistCount: number
  watchCount: number
  uniqueVideos: number
  searchCount: number
  topChannels: CountedItem[]
  topVideos: CountedItem[]
  topSearches: CountedItem[]
  topPlaylists: CountedItem[]
  watchHeatmap: HeatmapDay[]
  watchHourly: number[]
  watchActivity: ActivityTimeSeries
  searchHeatmap: HeatmapDay[]
  searchHourly: number[]
  searchActivity: ActivityTimeSeries
}

export type ChromeInsights = {
  visitCount: number
  uniqueUrls: number
  uniqueDomains: number
  topDomains: CountedItem[]
  topTitles: CountedItem[]
  heatmap: HeatmapDay[]
  hourly: number[]
  activity: ActivityTimeSeries
  bookmarkCount: number
  topBookmarkFolders: CountedItem[]
  extensionCount: number
  topExtensions: CountedItem[]
  readingListCount: number
  savedAddressCount: number
}

export type MyActivityProduct = {
  name: string
  eventCount: number
  topItems: CountedItem[]
  heatmap: HeatmapDay[]
  hourly: number[]
  activity: ActivityTimeSeries
}

export type MyActivityInsights = {
  totalEvents: number
  products: MyActivityProduct[]
}

export type FitDayPoint = {
  date: string
  steps: number
  activeMinutes: number
}

export type FitInsights = {
  totalSteps: number
  totalActiveMinutes: number
  activityFileCount: number
  activityTypes: CountedItem[]
  daily: FitDayPoint[]
  stepsActivity: ActivityTimeSeries
  stepsHeatmap: HeatmapDay[]
  /** Distance in meters. */
  totalDistanceM: number
  totalCalories: number
  totalHeartMinutes: number
}

export type KeepInsights = {
  noteCount: number
  pinnedCount: number
  archivedCount: number
  heatmap: HeatmapDay[]
  activity: ActivityTimeSeries
}

export type CalendarInsights = {
  eventCount: number
  allDayCount: number
  timedCount: number
  topSummaries: CountedItem[]
  heatmap: HeatmapDay[]
  activity: ActivityTimeSeries
}

export type PhotosInsights = {
  photoCount: number
  withGeoCount: number
  byAlbum: CountedItem[]
  heatmap: HeatmapDay[]
  activity: ActivityTimeSeries
}

export type AccessLogInsights = {
  entryCount: number
  topProducts: CountedItem[]
  topCities: CountedItem[]
  heatmap: HeatmapDay[]
  activity: ActivityTimeSeries
}

export type GmailInsights = {
  messageCount: number
  sentCount: number
  inboxCount: number
  spamCount: number
  unreadCount: number
  blockedAddressCount: number
  replyCount: number
  attachmentCount: number
  newsletterCount: number
  peopleCount: number
  topLabels: CountedItem[]
  topSenders: CountedItem[]
  topRecipients: CountedItem[]
  topSenderDomains: CountedItem[]
  topPhrases: CountedItem[]
  subjectWords: CountedItem[]
  heatmap: HeatmapDay[]
  hourly: number[]
  activity: ActivityTimeSeries
}

export type DriveInsights = {
  fileCount: number
  totalBytes: number
  topExtensions: CountedItem[]
  topFolders: CountedItem[]
  heatmap: HeatmapDay[]
  activity: ActivityTimeSeries
}

export type GoogleInsights = {
  displayName?: string | null
  productsFound: string[]
  skipped: SkippedProduct[]
  youtube?: YouTubeInsights | null
  chrome?: ChromeInsights | null
  myActivity?: MyActivityInsights | null
  fit?: FitInsights | null
  keep?: KeepInsights | null
  calendar?: CalendarInsights | null
  photos?: PhotosInsights | null
  accessLog?: AccessLogInsights | null
  gmail?: GmailInsights | null
  drive?: DriveInsights | null
}

export function emptyActivitySeries(): ActivityTimeSeries {
  return { daily: [], monthly: [], yearly: [], years: [] }
}

export function normalizeGoogleInsights(
  raw: GoogleInsights | null | undefined
): GoogleInsights | null {
  if (!raw) return null
  return {
    displayName: raw.displayName ?? null,
    productsFound: raw.productsFound ?? [],
    skipped: raw.skipped ?? [],
    youtube: raw.youtube
      ? {
          ...raw.youtube,
          topPlaylists: raw.youtube.topPlaylists ?? [],
        }
      : null,
    chrome: raw.chrome
      ? {
          ...raw.chrome,
          bookmarkCount: raw.chrome.bookmarkCount ?? 0,
          topBookmarkFolders: raw.chrome.topBookmarkFolders ?? [],
          extensionCount: raw.chrome.extensionCount ?? 0,
          topExtensions: raw.chrome.topExtensions ?? [],
          readingListCount: raw.chrome.readingListCount ?? 0,
          savedAddressCount: raw.chrome.savedAddressCount ?? 0,
        }
      : null,
    myActivity: raw.myActivity ?? null,
    fit: raw.fit
      ? {
          ...raw.fit,
          totalDistanceM: raw.fit.totalDistanceM ?? 0,
          totalCalories: raw.fit.totalCalories ?? 0,
          totalHeartMinutes: raw.fit.totalHeartMinutes ?? 0,
        }
      : null,
    keep: raw.keep ?? null,
    calendar: raw.calendar ?? null,
    photos: raw.photos ?? null,
    accessLog: raw.accessLog ?? null,
    gmail: raw.gmail
      ? {
          ...raw.gmail,
          replyCount: raw.gmail.replyCount ?? 0,
          attachmentCount: raw.gmail.attachmentCount ?? 0,
          newsletterCount: raw.gmail.newsletterCount ?? 0,
          peopleCount: raw.gmail.peopleCount ?? 0,
          topRecipients: raw.gmail.topRecipients ?? [],
          topSenderDomains: raw.gmail.topSenderDomains ?? [],
          topPhrases: raw.gmail.topPhrases ?? [],
          subjectWords: raw.gmail.subjectWords ?? [],
        }
      : null,
    drive: raw.drive ?? null,
  }
}
