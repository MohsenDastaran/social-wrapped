import { ActivityOverTimeChart } from "@/components/wrap/charts/activity-over-time-chart"
import { CalendarHeatmap } from "@/components/wrap/charts/calendar-heatmap"
import { MessageTypesChart } from "@/components/wrap/charts/message-types-chart"
import { CircadianRhythmCard } from "@/components/wrap/circadian-rhythm-card"
import { ComparisonKpiCard } from "@/components/wrap/comparison-kpi-card"
import { chatDisplay } from "@/components/wrap/chat-display"
import { fmt, fmtResponseTime } from "@/components/wrap/chart-theme"
import {
  TopEmojisCard,
  type EmojiScope,
} from "@/components/wrap/top-emojis-card"
import type {
  ChatResult,
  EmojiEntry,
  EmojiStats,
} from "@/platform/analytics-types"

type WrapChatAnalyticsProps = {
  chat: ChatResult
  /** Account display name — used to split “You” vs contact emoji scopes. */
  selfName: string
}

/** Per-contact analytics charts — used on the contact detail page. */
export function WrapChatAnalytics({ chat, selfName }: WrapChatAnalyticsProps) {
  const a = chat.analytics
  const display = chatDisplay(chat)
  const emojiScopes = buildEmojiScopes(
    a.emojis,
    selfName,
    display.isDeleted ? (display.subtitle ?? "Contact") : display.title
  )

  const responseRows = a.responseTime.participants.map((p) => ({
    name: truncate(p.name, 18),
    values: {
      avgMin: Math.round(p.avgSecs / 60),
      medianMin: Math.round(p.medianSecs / 60),
    },
  }))

  const lengthRows = a.messageLength.participants.map((p) => ({
    name: truncate(p.name, 18),
    values: { avgChars: Math.round(p.avgChars) },
  }))

  const initiatorNames = new Set([
    ...a.initiatorFinisher.initiators.map((p) => p.name),
    ...a.initiatorFinisher.finishers.map((p) => p.name),
  ])
  const initiatorRows = [...initiatorNames].map((name) => ({
    name: truncate(name, 18),
    values: {
      starts:
        a.initiatorFinisher.initiators.find((p) => p.name === name)?.count ?? 0,
      closes:
        a.initiatorFinisher.finishers.find((p) => p.name === name)?.count ?? 0,
    },
  }))

  const lateNightRows = a.lateNight.participants
    .filter((p) => p.count > 0)
    .map((p) => ({
      name: truncate(p.name, 18),
      values: { count: p.count },
    }))

  return (
    <section className="flex flex-col gap-4">
      <ActivityOverTimeChart
        series={a.activityOverTime}
        title={`Messages with ${display.title}`}
        exportName={`chat-${chat.chatId}-activity-over-time`}
        sentLabel="You"
        receivedLabel={
          display.isDeleted
            ? (display.subtitle ?? display.title)
            : chat.chatName
        }
      />

      <MessageTypesChart
        types={a.contentMix?.types ?? []}
        totalVoiceDurationSecs={a.contentMix?.totalVoiceDurationSecs ?? 0}
        exportName={`chat-${chat.chatId}-message-types`}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ComparisonKpiCard
          title="Response time"
          description="Avg & median reply delay"
          exportName={`chat-${chat.chatId}-response`}
          exportLines={a.responseTime.participants.map(
            (p) => `${p.name} ${fmtResponseTime(p.avgSecs)}`
          )}
          rows={responseRows}
          metrics={[
            {
              key: "avgMin",
              label: "Average",
              accent: "teal",
              format: (m) => (m < 1 ? "<1m" : `${m}m`),
            },
            {
              key: "medianMin",
              label: "Median",
              accent: "amber",
              format: (m) => (m < 1 ? "<1m" : `${m}m`),
            },
          ]}
          highlightKey="avgMin"
          lowerIsBetter
          highlightLabel="Fastest"
        />

        <ComparisonKpiCard
          title="Message length"
          description="Average characters per message"
          exportName={`chat-${chat.chatId}-length`}
          rows={lengthRows}
          metrics={[
            {
              key: "avgChars",
              label: "Avg chars",
              accent: "violet",
              format: (n) => fmt(n),
            },
          ]}
          highlightLabel="Longer"
        />

        <ComparisonKpiCard
          title="Who starts / closes"
          description="After 6h+ of silence"
          exportName={`chat-${chat.chatId}-initiator`}
          rows={initiatorRows}
          metrics={[
            { key: "starts", label: "Starts", accent: "teal" },
            { key: "closes", label: "Closes", accent: "amber" },
          ]}
          highlightKey="starts"
          highlightLabel="Opener"
        />

        <ComparisonKpiCard
          title="Late night (1–5 AM)"
          description={`${fmt(a.lateNight.totalLateNight)} messages`}
          exportName={`chat-${chat.chatId}-late-night`}
          rows={lateNightRows}
          metrics={[
            {
              key: "count",
              label: "Messages",
              accent: "indigo",
            },
          ]}
          highlightLabel="Night owl"
        />
      </div>

      <TopEmojisCard
        emojis={a.emojis.topOverall}
        exportName={`chat-${chat.chatId}-emojis`}
        description="Most used in this chat"
        limit={10}
        scopes={emojiScopes}
      />

      <CircadianRhythmCard
        participants={a.circadian.participants}
        exportName={`chat-${chat.chatId}-circadian`}
      />

      {a.heatmap.days.length > 0 && (
        <CalendarHeatmap
          days={a.heatmap.days}
          description="Messages per day in this chat"
          exportName={`chat-${chat.chatId}-heatmap`}
        />
      )}
    </section>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

function namesMatch(a: string, b: string): boolean {
  const x = a.trim().toLowerCase()
  const y = b.trim().toLowerCase()
  if (!x || !y) return false
  return x === y || x.includes(y) || y.includes(x)
}

function mergeEmojiLists(lists: EmojiEntry[][]): EmojiEntry[] {
  const map = new Map<string, number>()
  for (const list of lists) {
    for (const e of list) {
      if (!e.emoji) continue
      map.set(e.emoji, (map.get(e.emoji) ?? 0) + e.count)
    }
  }
  return [...map.entries()]
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count)
}

function buildEmojiScopes(
  stats: EmojiStats,
  selfName: string,
  contactName: string
): EmojiScope[] | undefined {
  const parts = stats.byParticipant ?? []
  if (parts.length === 0) return undefined

  const self = parts.find((p) => namesMatch(p.name, selfName))
  const others = parts.filter((p) => !namesMatch(p.name, selfName))

  const youEmojis = self?.topEmojis ?? []
  const themEmojis =
    others.length === 1
      ? (others[0]?.topEmojis ?? [])
      : mergeEmojiLists(others.map((o) => o.topEmojis))

  const youLabel = truncate(self?.name || selfName || "You", 14)
  const themLabel = truncate(
    others.length === 1
      ? (others[0]?.name ?? contactName)
      : contactName || "Contact",
    14
  )

  const scopes: EmojiScope[] = [
    { id: "all", label: "All", emojis: stats.topOverall },
    { id: "you", label: youLabel, emojis: youEmojis },
    { id: "them", label: themLabel, emojis: themEmojis },
  ]

  // Need at least All + one side to make the toggle useful.
  const withData = scopes.filter((s) =>
    s.emojis.some((e) => e.emoji && e.count > 0)
  )
  return withData.length > 1 ? scopes : undefined
}
