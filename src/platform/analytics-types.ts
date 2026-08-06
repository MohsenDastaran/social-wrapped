/**
 * TypeScript mirror of the Rust `WrapAnalytics` struct tree.
 * All fields are camelCase (Rust serde `rename_all = "camelCase"`).
 */

// ── Shared ────────────────────────────────────────────────────────────────────

export type ParticipantCount = {
  name: string
  count: number
  pct: number
}

// ── Stat 21 + 22: Volume & Dominance / Sent vs Received ──────────────────────

export type VolumeStats = {
  total: number
  sent: number
  received: number
  participants: ParticipantCount[]
}

// ── Stat 23: Message content mix ─────────────────────────────────────────────

export type ContentTypeCount = {
  kind: string
  label: string
  count: number
  pct: number
}

export type ContentMixStats = {
  total: number
  totalVoiceDurationSecs: number
  types: ContentTypeCount[]
  /** Per-sender breakdown for All / You / Contact toggles. */
  byParticipant?: ContentMixParticipant[]
}

export type ContentMixParticipant = {
  name: string
  total: number
  totalVoiceDurationSecs: number
  types: ContentTypeCount[]
}

// ── Stat 16: Message Length Balance ──────────────────────────────────────────

export type MessageLengthParticipant = {
  name: string
  avgChars: number
  totalChars: number
  count: number
}

export type MessageLengthStats = {
  participants: MessageLengthParticipant[]
}

// ── Stat 15: Average Response Time ───────────────────────────────────────────

export type ResponseTimeParticipant = {
  name: string
  avgSecs: number
  medianSecs: number
  sampleCount: number
}

export type ResponseTimeStats = {
  participants: ResponseTimeParticipant[]
}

// ── Stat 14: Late-Night Chats ─────────────────────────────────────────────────

export type LateNightParticipant = {
  name: string
  count: number
  pctOfParticipantTotal: number
}

export type LateNightStats = {
  totalLateNight: number
  participants: LateNightParticipant[]
}

// ── Stat 12: Initiator vs Finisher ────────────────────────────────────────────

export type InitiatorFinisherStats = {
  initiators: ParticipantCount[]
  finishers: ParticipantCount[]
}

// ── Stat 9: Top Emojis & Reactions ───────────────────────────────────────────

export type EmojiEntry = {
  emoji: string
  count: number
}

export type EmojiParticipant = {
  name: string
  topEmojis: EmojiEntry[]
}

export type EmojiStats = {
  topOverall: EmojiEntry[]
  byParticipant: EmojiParticipant[]
  topReactions: EmojiEntry[]
}

// ── Stat 4: Circadian Rhythm & Sleep Estimation ───────────────────────────────

export type CircadianParticipant = {
  name: string
  /** 24-element array, index = hour 0..23 */
  hourly: number[]
  sleepStartHour: number
  sleepEndHour: number
}

export type CircadianStats = {
  /** 24-element combined hourly totals */
  hourlyTotal: number[]
  participants: CircadianParticipant[]
}

// ── Stat 5: Activity Heatmap ──────────────────────────────────────────────────

export type HeatmapDay = {
  /** "YYYY-MM-DD" */
  date: string
  count: number
}

export type HeatmapStats = {
  days: HeatmapDay[]
}

export type ActivityPoint = {
  /** "YYYY-MM-DD" | "YYYY-MM" | "YYYY" */
  period: string
  sent: number
  received: number
}

export type ActivityTimeSeries = {
  daily: ActivityPoint[]
  monthly: ActivityPoint[]
  yearly: ActivityPoint[]
  /** Newest first. */
  years: number[]
}

// ── Stat 3: Keyword Battle ────────────────────────────────────────────────────

/** Lowercased word → `[you, them]` occurrence counts. */
export type KeywordStats = {
  counts: Record<string, [number, number]>
}

// ── Stat 20: Edit Counter ─────────────────────────────────────────────────────

export type EditTypoParticipant = {
  name: string
  edits: number
  /** Legacy; always 0 — asterisk typo counting was removed. */
  typos?: number
}

export type EditTypoStats = {
  totalEdits: number
  /** Legacy; always 0. */
  totalTypos?: number
  participants: EditTypoParticipant[]
}

// ── Stat 29: Ghosting Index ───────────────────────────────────────────────────

export type GhostingStats = {
  total: number
  /** Times each person left a message unanswered ≥ 24h. */
  participants: ParticipantCount[]
}

// ── Result types ──────────────────────────────────────────────────────────────

export type AnalyticsResult = {
  totalMessages: number
  sentMessages: number
  receivedMessages: number
  volume: VolumeStats
  contentMix: ContentMixStats
  messageLength: MessageLengthStats
  responseTime: ResponseTimeStats
  lateNight: LateNightStats
  initiatorFinisher: InitiatorFinisherStats
  emojis: EmojiStats
  circadian: CircadianStats
  heatmap: HeatmapStats
  activityOverTime: ActivityTimeSeries
  /** Per-chat keyword index for Keyword Battle (empty on account-level). */
  keywords?: KeywordStats
  /** Edited messages (Telegram `edited` field). */
  editTypo?: EditTypoStats
  /** Ghosting: left unanswered ≥ 24h. */
  ghosting?: GhostingStats
}

export type ChatResult = {
  chatId: number
  chatName: string
  analytics: AnalyticsResult
  /** Group / supergroup (not a 1:1 DM). */
  isGroup?: boolean
  /** Deleted peer or missing name — show deleted-account UI. */
  isDeleted?: boolean
}

export type WrapAnalytics = {
  displayName: string
  username: string | null
  aboutPreview: string
  fileSizeBytes: number
  chatCount: number
  sampleMessages: string[]
  account: AnalyticsResult
  /** Deduped union of insight lists for drill-down lookup. */
  chats: ChatResult[]
  /** Top 20 personal chats by lifetime volume. */
  topContacts?: ChatResult[]
  /** Top 5 personal chats by last-90-day volume. */
  recentContacts?: ChatResult[]
  /** Top 5 personal chats active before, quiet in last 90 days. */
  fadedContacts?: ChatResult[]
  /** Top 5 group chats by lifetime volume. */
  topGroups?: ChatResult[]
  /** Top 5 personal contacts by ghosting (they left you hanging ≥ 24h). */
  topGhosters?: ChatResult[]
}

/** Outbound / graph insights from an Instagram Meta download (not inbound likes). */
export type IgHandle = {
  username: string
  href?: string
}

export type IgCountedHandle = {
  username: string
  count: number
}

export type IgSavedCollection = {
  name: string
  itemCount: number
  privacy?: string
}

export type InstagramSocialInsights = {
  followerCount: number
  followingCount: number
  unfollowedRecentlyCount: number
  notFollowingBack: IgHandle[]
  fansYouDontFollow: IgHandle[]
  topLikedAccounts: IgCountedHandle[]
  topStoryLikedAccounts: IgCountedHandle[]

  // Engagement
  likedPostsCount: number
  likedCommentsCount: number
  commentsWrittenCount: number
  likeHeatmap: HeatmapDay[]
  likeHourly: number[]
  topCommentedAccounts: IgCountedHandle[]
  topReelCommentedAccounts: IgCountedHandle[]
  topLikedCommentAccounts: IgCountedHandle[]

  // Saved
  savedPostsCount: number
  topSavedAccounts: IgCountedHandle[]
  savedCollections: IgSavedCollection[]
}
