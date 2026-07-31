import { ActivityOverTimeChart } from "@/components/wrap/charts/activity-over-time-chart"
import { CalendarHeatmap } from "@/components/wrap/charts/calendar-heatmap"
import { MessageTypesChart } from "@/components/wrap/charts/message-types-chart"
import { CircadianRhythmCard } from "@/components/wrap/circadian-rhythm-card"
import { ComparisonKpiCard } from "@/components/wrap/comparison-kpi-card"
import { chatDisplay } from "@/components/wrap/chat-display"
import { fmt, fmtResponseTime } from "@/components/wrap/chart-theme"
import { TopEmojisCard } from "@/components/wrap/top-emojis-card"
import type { ChatResult } from "@/platform/analytics-types"

type WrapChatAnalyticsProps = {
  chat: ChatResult
}

/** Per-contact analytics charts — used on the contact detail page. */
export function WrapChatAnalytics({ chat }: WrapChatAnalyticsProps) {
  const a = chat.analytics
  const display = chatDisplay(chat)

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
