import type {
  ChatResult,
  ContentMixParticipant,
  ContentTypeCount,
  GhostingStats,
  WrapAnalytics,
} from "@/platform/analytics-types"

export function namesMatch(a: string, b: string): boolean {
  const x = a.trim().toLowerCase()
  const y = b.trim().toLowerCase()
  if (!x || !y) return false
  return x === y || x.includes(y) || y.includes(x)
}

const UNANSWERED_KINDS = new Set([
  "other",
  "missed",
  "rejected",
  "blocked",
  "voicemail",
])

export function contentTypeCount(
  types: ContentTypeCount[] | undefined,
  kind: string
): number {
  return types?.find((t) => t.kind === kind)?.count ?? 0
}

function unansweredCount(types: ContentTypeCount[] | undefined): number {
  return (types ?? []).reduce(
    (sum, t) => (UNANSWERED_KINDS.has(t.kind) ? sum + t.count : sum),
    0
  )
}

/** Answered voice calls (duration > 0). */
export function answeredCallCount(
  types: ContentTypeCount[] | undefined
): number {
  return contentTypeCount(types, "voice")
}

export function averageTalkSecs(
  totalVoiceDurationSecs: number,
  types: ContentTypeCount[] | undefined
): number {
  const n = answeredCallCount(types)
  return n > 0 ? totalVoiceDurationSecs / n : 0
}

export function chatAverageTalkSecs(chat: ChatResult): number {
  const mix = chat.analytics.contentMix
  return averageTalkSecs(mix?.totalVoiceDurationSecs ?? 0, mix?.types)
}

/**
 * Unanswered calls between You and a contact.
 * Outgoing + no duration → they didn't pick up.
 * Incoming missed/rejected/other → you didn't pick up.
 */
export function unansweredCallGhosting(
  byParticipant: ContentMixParticipant[] | undefined,
  selfName: string,
  youLabel: string,
  themLabel: string
): GhostingStats {
  let youDidntAnswer = 0
  let theyDidntAnswer = 0
  for (const p of byParticipant ?? []) {
    const missed = unansweredCount(p.types)
    if (namesMatch(p.name, selfName) || namesMatch(p.name, youLabel)) {
      theyDidntAnswer += missed
    } else {
      youDidntAnswer += missed
    }
  }
  const total = youDidntAnswer + theyDidntAnswer
  return {
    total,
    participants: [
      {
        name: youLabel,
        count: youDidntAnswer,
        pct: total > 0 ? (youDidntAnswer / total) * 100 : 0,
      },
      {
        name: themLabel,
        count: theyDidntAnswer,
        pct: total > 0 ? (theyDidntAnswer / total) * 100 : 0,
      },
    ],
  }
}

export type TalkTimeRow = {
  name: string
  values: {
    avgSecs: number
    totalSecs: number
    calls: number
  }
}

function talkRow(
  name: string,
  participant: ContentMixParticipant | undefined
): TalkTimeRow | null {
  const calls = answeredCallCount(participant?.types)
  const totalSecs = participant?.totalVoiceDurationSecs ?? 0
  if (calls <= 0 && totalSecs <= 0) return null
  return {
    name,
    values: {
      avgSecs: Math.round(averageTalkSecs(totalSecs, participant?.types)),
      totalSecs,
      calls,
    },
  }
}

function mergeParticipants(
  parts: ContentMixParticipant[]
): ContentMixParticipant | undefined {
  if (parts.length === 0) return undefined
  if (parts.length === 1) return parts[0]
  const typesMap = new Map<string, ContentTypeCount>()
  let total = 0
  let totalVoiceDurationSecs = 0
  for (const p of parts) {
    total += p.total
    totalVoiceDurationSecs += p.totalVoiceDurationSecs
    for (const t of p.types) {
      const prev = typesMap.get(t.kind)
      if (prev) {
        prev.count += t.count
      } else {
        typesMap.set(t.kind, { ...t })
      }
    }
  }
  const types = [...typesMap.values()]
  const mixTotal = types.reduce((s, t) => s + t.count, 0)
  for (const t of types) {
    t.pct = mixTotal > 0 ? (t.count / mixTotal) * 100 : 0
  }
  return {
    name: "Them",
    total,
    totalVoiceDurationSecs,
    types,
  }
}

/** You vs contact talk time from content-mix participants. */
export function talkTimeComparisonRows(
  byParticipant: ContentMixParticipant[] | undefined,
  selfName: string,
  youLabel: string,
  themLabel: string
): TalkTimeRow[] {
  const parts = byParticipant ?? []
  const self = parts.find(
    (p) => namesMatch(p.name, selfName) || namesMatch(p.name, youLabel)
  )
  const others = parts.filter(
    (p) => !namesMatch(p.name, selfName) && !namesMatch(p.name, youLabel)
  )
  const rows: TalkTimeRow[] = []
  const you = talkRow(youLabel, self)
  const them = talkRow(themLabel, mergeParticipants(others))
  if (you) rows.push(you)
  if (them) rows.push(them)
  return rows
}

function personalChats(analytics: WrapAnalytics): ChatResult[] {
  const seen = new Set<number>()
  const out: ChatResult[] = []
  const lists = [
    analytics.topContacts,
    analytics.chats.filter((c) => !c.isGroup && !c.isSavedMessages),
  ]
  for (const list of lists) {
    for (const chat of list ?? []) {
      if (chat.isGroup || chat.isSavedMessages || seen.has(chat.chatId)) continue
      seen.add(chat.chatId)
      out.push(chat)
    }
  }
  return out
}

/** Contacts ranked by average answered-call length. */
export function longestTalkChats(
  analytics: WrapAnalytics,
  limit = 8
): ChatResult[] {
  return personalChats(analytics)
    .filter((chat) => chatAverageTalkSecs(chat) > 0)
    .sort((a, b) => chatAverageTalkSecs(b) - chatAverageTalkSecs(a))
    .slice(0, limit)
}

export function longestTalkRows(
  analytics: WrapAnalytics,
  limit = 8
): TalkTimeRow[] {
  return longestTalkChats(analytics, limit).map((chat) => {
    const mix = chat.analytics.contentMix
    const totalSecs = mix?.totalVoiceDurationSecs ?? 0
    return {
      name: truncate(chatTitle(chat), 18),
      values: {
        avgSecs: Math.round(averageTalkSecs(totalSecs, mix?.types)),
        totalSecs,
        calls: answeredCallCount(mix?.types),
      },
    }
  })
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

function chatTitle(chat: ChatResult): string {
  if (chat.isSavedMessages) return "Saved Messages"
  if (chat.isDeleted) return "Deleted account"
  return chat.chatName
}
