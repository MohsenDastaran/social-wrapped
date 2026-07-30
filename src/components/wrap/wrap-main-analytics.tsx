import { ActivityOverTimeChart } from "@/components/wrap/charts/activity-over-time-chart"
import { MessageTypesChart } from "@/components/wrap/charts/message-types-chart"
import { CircadianRhythmCard } from "@/components/wrap/circadian-rhythm-card"
import { TopEmojisCard } from "@/components/wrap/top-emojis-card"
import {
  fmt,
  SENT_RECEIVED_PIE,
  EMOJI_AREA,
} from "@/components/wrap/chart-theme"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { MarkerHighlight } from "@/components/ui/animated/animated-text-08"
import type { WrapAnalytics } from "@/platform/analytics-types"
import {
  ArrowDownLeft,
  ArrowUpRight,
  MessagesSquare,
  Hash,
  type LucideIcon,
} from "lucide-react"
import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart"
import { EChartsPieChart } from "@/components/evilcharts/charts/echarts-pie-chart"
import { CalendarHeatmap } from "@/components/wrap/charts/calendar-heatmap"

type WrapMainAnalyticsProps = {
  analytics: WrapAnalytics
}

/** Account-wide analytics — chart-first layout. */
export function WrapMainAnalytics({ analytics }: WrapMainAnalyticsProps) {
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

  const reactionData = a.emojis.topReactions.slice(0, 10).map((e) => ({
    name: e.emoji,
    count: e.count,
  }))

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
        <Kpi
          label="Sent"
          value={fmt(a.sentMessages)}
          icon={ArrowUpRight}
          accent="teal"
        />
        <Kpi
          label="Received"
          value={fmt(a.receivedMessages)}
          icon={ArrowDownLeft}
          accent="amber"
        />
        <Kpi
          label="Total"
          value={fmt(a.totalMessages)}
          icon={Hash}
          accent="emerald"
        />
        <Kpi
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

      <TopEmojisCard emojis={a.emojis.topOverall} exportName="main-emojis" />

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

const KPI_ACCENTS = {
  teal: "text-teal-600 dark:text-teal-400",
  amber: "text-amber-600 dark:text-amber-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  sky: "text-sky-600 dark:text-sky-400",
} as const

function Kpi({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  icon: LucideIcon
  accent: keyof typeof KPI_ACCENTS
}) {
  return (
    <div className="rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/10 sm:px-5 sm:py-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {label}
        </p>
        <Icon
          aria-hidden
          className={`size-4 shrink-0 sm:size-5 ${KPI_ACCENTS[accent]}`}
        />
      </div>
      <p className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
        {value}
      </p>
    </div>
  )
}
