import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart"
import { EChartsPieChart } from "@/components/evilcharts/charts/echarts-pie-chart"
import { CalendarHeatmap } from "@/components/wrap/charts/calendar-heatmap"
import { CircadianPolarChart } from "@/components/wrap/charts/circadian-polar-chart"
import { ActivityOverTimeChart } from "@/components/wrap/charts/activity-over-time-chart"
import { MessageTypesChart } from "@/components/wrap/charts/message-types-chart"
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

  const emojiData = a.emojis.topOverall.slice(0, 12).map((e) => ({
    name: e.emoji,
    count: e.count,
  }))

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

      {/* Top emojis */}
      {emojiData.length > 0 && (
        <WrapChartCard
          title="Top emojis"
          description="Most used emoji characters in messages"
          exportName="main-emojis"
          exportLines={a.emojis.topOverall
            .slice(0, 5)
            .map((e) => `${e.emoji} ${fmt(e.count)}`)}
          chartClassName="h-52"
        >
          <EChartsAreaChart
            data={emojiData}
            config={EMOJI_AREA}
            xDataKey="name"
            className="h-full w-full"
            curveType="monotone"
            chartOptions={{
              grid: { left: 8, right: 8, top: 16, bottom: 28 },
              yAxis: {
                type: "value",
                show: false,
                scale: true,
                boundaryGap: ["0%", "20%"],
              },
            }}
          >
            <EChartsAreaChart.Tooltip variant="frosted-glass" />
            <EChartsAreaChart.Area
              dataKey="count"
              variant="gradient"
              strokeVariant="solid"
              strokeWidth={2.5}
            >
              <EChartsAreaChart.ActiveDot variant="ping" />
            </EChartsAreaChart.Area>
          </EChartsAreaChart>
        </WrapChartCard>
      )}

      {reactionData.length > 0 && (
        <WrapChartCard
          title="Top reactions"
          description="Most left Telegram reactions"
          exportName="main-reactions"
          chartClassName="h-48"
        >
          <EChartsAreaChart
            data={reactionData}
            config={EMOJI_AREA}
            xDataKey="name"
            className="h-full w-full"
            curveType="monotone"
            chartOptions={{
              grid: { left: 8, right: 8, top: 16, bottom: 28 },
              yAxis: {
                type: "value",
                show: false,
                scale: true,
                boundaryGap: ["0%", "20%"],
              },
            }}
          >
            <EChartsAreaChart.Tooltip variant="frosted-glass" />
            <EChartsAreaChart.Area
              dataKey="count"
              variant="gradient"
              strokeVariant="solid"
              strokeWidth={2.5}
            />
          </EChartsAreaChart>
        </WrapChartCard>
      )}

      {/* Circadian */}
      {a.circadian.participants.length > 0 && (
        <WrapChartCard
          title="Circadian rhythm"
          description="Activity by hour · sleep windows from quiet stretches"
          exportName="main-circadian"
          exportLines={a.circadian.participants
            .slice(0, 4)
            .map(
              (p) =>
                `${p.name} sleep ~${p.sleepStartHour}:00–${p.sleepEndHour}:00`
            )}
          chartClassName="h-80"
        >
          <CircadianPolarChart
            participants={a.circadian.participants.slice(0, 4)}
            className="h-full w-full"
          />
        </WrapChartCard>
      )}

      {/* Heatmap */}
      {a.heatmap.days.length > 0 && (
        <WrapChartCard
          title="Activity heatmap"
          description="Messages per day · darker = more active"
          exportName="main-heatmap"
          exportLines={[
            `${a.heatmap.days.length} active days`,
            `Peak ${fmt(Math.max(...a.heatmap.days.map((d) => d.count)))}`,
          ]}
          chartClassName="h-48"
        >
          <CalendarHeatmap days={a.heatmap.days} className="h-full w-full" />
        </WrapChartCard>
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
      <p className="font-heading mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
        {value}
      </p>
    </div>
  )
}
