import { ActivityOverTimeChart } from "@/components/wrap/charts/activity-over-time-chart"
import { MessageTypesChart } from "@/components/wrap/charts/message-types-chart"
import { WordCloudChart } from "@/components/wrap/charts/word-cloud-chart"
import { CircadianRhythmCard } from "@/components/wrap/circadian-rhythm-card"
import { TopEmojisCard } from "@/components/wrap/top-emojis-card"
import { ProfanityRankingCard } from "@/components/wrap/profanity-ranking-card"
import { fmt, SENT_RECEIVED_PIE } from "@/components/wrap/chart-theme"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { WrapKpi } from "@/components/wrap/wrap-kpi"
import { MarkerHighlight } from "@/components/ui/animated/animated-text-08"
import type { WrapAnalytics } from "@/platform/analytics-types"
import {
  ArrowDownLeft,
  ArrowUpRight,
  MessagesSquare,
  Hash,
} from "lucide-react"
import { EChartsPieChart } from "@/components/evilcharts/charts/echarts-pie-chart"
import { CalendarHeatmap } from "@/components/wrap/charts/calendar-heatmap"

type WrapMainAnalyticsProps = {
  analytics: WrapAnalytics
  wrapId: string
  hideProfanity?: boolean
  hideEmojis?: boolean
}

/** Account-wide analytics — chart-first layout. */
export function WrapMainAnalytics({
  analytics,
  wrapId,
  hideProfanity = false,
  hideEmojis = false,
}: WrapMainAnalyticsProps) {
  if (!analytics?.account) return null
  const a = analytics.account

  const sentRecvTotal = a.volume.sent + a.volume.received
  const sentReceived = [
    {
      side: "sent",
      count: a.volume.sent,
      pctLabel: `${Math.round(
        sentRecvTotal > 0 ? (a.volume.sent / sentRecvTotal) * 100 : 0
      )}%`,
    },
    {
      side: "received",
      count: a.volume.received,
      pctLabel: `${Math.round(
        sentRecvTotal > 0 ? (a.volume.received / sentRecvTotal) * 100 : 0
      )}%`,
    },
  ]

  return (
    <section className="flex flex-col gap-4">
      <header className="text-start">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          <MarkerHighlight
            highlight="Main"
            after="Analytics"
            className="leading-tight"
            markerColor="bg-emerald-600"
            highlightedTextColor="text-gray-950"
          />
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Across all {fmt(analytics.chatCount)} chats · {fmt(a.totalMessages)}{" "}
          messages
        </p>
      </header>

      {/* Overview KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <WrapKpi
          label="Sent"
          value={fmt(a.sentMessages)}
          icon={ArrowUpRight}
          accent="teal"
        />
        <WrapKpi
          label="Received"
          value={fmt(a.receivedMessages)}
          icon={ArrowDownLeft}
          accent="amber"
        />
        <WrapKpi
          label="Total"
          value={fmt(a.totalMessages)}
          icon={Hash}
          accent="emerald"
        />
        <WrapKpi
          label="Chats"
          value={fmt(analytics.chatCount)}
          icon={MessagesSquare}
          accent="sky"
        />
      </div>

      <ActivityOverTimeChart series={a.activityOverTime} />

      <WrapChartCard
        title="Sent vs received"
        description="Outbound vs inbound share"
        exportName="main-sent-vs-received"
        exportSize="compact"
        exportLines={[
          `Sent ${fmt(a.sentMessages)} (${sentReceived[0]?.pctLabel ?? "0%"})`,
          `Received ${fmt(a.receivedMessages)} (${sentReceived[1]?.pctLabel ?? "0%"})`,
        ]}
        chartClassName="h-64"
      >
        <EChartsPieChart
          className="h-full w-full p-3"
          data={sentReceived}
          dataKey="count"
          nameKey="side"
          config={SENT_RECEIVED_PIE}
        >
          <EChartsPieChart.Legend isClickable />
          <EChartsPieChart.Tooltip />
          <EChartsPieChart.Pie isClickable>
            <EChartsPieChart.Label dataKey="pctLabel" position="inside" />
          </EChartsPieChart.Pie>
        </EChartsPieChart>
      </WrapChartCard>

      <MessageTypesChart
        types={a.contentMix?.types ?? []}
        totalVoiceDurationSecs={a.contentMix?.totalVoiceDurationSecs ?? 0}
        exportName="main-message-types"
      />

      <WordCloudChart
        keywords={a.keywords}
        mode="you"
        title="Your word cloud"
        description="Words you use most across all chats"
        exportName="main-word-cloud"
      />

      {!hideProfanity ? (
        <ProfanityRankingCard
          wrapId={wrapId}
          selfName={analytics.displayName}
          stats={a.profanity}
          exportName="main-profanity"
          excludeSelf
        />
      ) : null}

      {!hideEmojis ? (
        <TopEmojisCard emojis={a.emojis.topOverall} exportName="main-emojis" />
      ) : null}

      <CircadianRhythmCard
        hourlyTotal={a.circadian.hourlyTotal}
        exportName="main-circadian"
      />

      {a.heatmap.days.length > 0 && (
        <CalendarHeatmap days={a.heatmap.days} exportName="main-heatmap" />
      )}
    </section>
  )
}
