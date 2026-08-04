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
    youtube: raw.youtube ?? null,
    chrome: raw.chrome ?? null,
    myActivity: raw.myActivity ?? null,
    fit: raw.fit ?? null,
    keep: raw.keep ?? null,
    calendar: raw.calendar ?? null,
    photos: raw.photos ?? null,
    accessLog: raw.accessLog ?? null,
  }
}
