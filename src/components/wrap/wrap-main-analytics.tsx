import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart"
import { EChartsPieChart } from "@/components/evilcharts/charts/echarts-pie-chart"
import { CalendarHeatmap } from "@/components/wrap/charts/calendar-heatmap"
import { CircadianPolarChart } from "@/components/wrap/charts/circadian-polar-chart"
import { ActivityOverTimeChart } from "@/components/wrap/charts/activity-over-time-chart"
import {
  fmt,
  fmtDuration,
  fmtResponseTime,
  INITIATOR_AREA,
  LATE_NIGHT_AREA,
  LENGTH_AREA,
  pieConfigForKeys,
  RESPONSE_AREA,
  SENT_RECEIVED_PIE,
  contentMixPieConfig,
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

  const sentReceived = [
    { side: "sent", count: a.volume.sent },
    { side: "received", count: a.volume.received },
  ]

  const dominanceKeys = a.volume.participants.slice(0, 8).map((p) => p.name)
  const dominanceData = a.volume.participants.slice(0, 8).map((p) => ({
    name: p.name,
    count: p.count,
  }))

  const mix = a.contentMix
  const contentMix = (mix?.types ?? []).map((t) => ({
    kind: t.kind,
    count: t.count,
    pctLabel: `${Math.round(t.pct)}%`,
  }))
  const contentMixKeys = contentMix.map((t) => t.kind)

  const lengthData = a.messageLength.participants.map((p) => ({
    name: truncate(p.name, 12),
    avgChars: Math.round(p.avgChars),
  }))

  const responseData = a.responseTime.participants.map((p) => ({
    name: truncate(p.name, 12),
    avgMin: Math.round(p.avgSecs / 60),
    medianMin: Math.round(p.medianSecs / 60),
  }))

  const lateNightData = a.lateNight.participants
    .filter((p) => p.count > 0)
    .slice(0, 10)
    .map((p) => ({
      name: truncate(p.name, 12),
      count: p.count,
    }))

  const initiatorNames = new Set([
    ...a.initiatorFinisher.initiators.map((p) => p.name),
    ...a.initiatorFinisher.finishers.map((p) => p.name),
  ])
  const initiatorData = [...initiatorNames].slice(0, 8).map((name) => ({
    name: truncate(name, 12),
    starts:
      a.initiatorFinisher.initiators.find((p) => p.name === name)?.count ?? 0,
    closes:
      a.initiatorFinisher.finishers.find((p) => p.name === name)?.count ?? 0,
  }))

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Sent vs received */}
        <WrapChartCard
          title="Sent vs received"
          description="Outbound vs inbound share"
          exportName="main-sent-vs-received"
          exportSize="compact"
          exportLines={[
            `Sent ${fmt(a.sentMessages)}`,
            `Received ${fmt(a.receivedMessages)}`,
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
              <EChartsPieChart.Label dataKey="count" position="inside" />
            </EChartsPieChart.Pie>
          </EChartsPieChart>
        </WrapChartCard>

        {/* Message content mix — always visible */}
        <WrapChartCard
          title="Message types"
          description={
            contentMix.length === 0
              ? "Re-import your export to unlock the type breakdown"
              : a.contentMix.totalVoiceDurationSecs > 0
                ? `${fmtDuration(a.contentMix.totalVoiceDurationSecs)} of voice · share by type`
                : "Share of messages by content type"
          }
          exportName="main-message-types"
          exportSize="compact"
          exportLines={(a.contentMix?.types ?? []).map(
            (t) => `${t.label} ${fmt(t.count)} (${t.pct.toFixed(1)}%)`
          )}
          chartClassName="h-64"
        >
          {contentMix.length > 0 ? (
            <EChartsPieChart
              className="h-full w-full p-3"
              data={contentMix}
              dataKey="count"
              nameKey="kind"
              config={contentMixPieConfig(contentMixKeys)}
            >
              <EChartsPieChart.Legend isClickable />
              <EChartsPieChart.Tooltip />
              <EChartsPieChart.Pie isClickable>
                <EChartsPieChart.Label dataKey="pctLabel" position="inside" />
              </EChartsPieChart.Pie>
            </EChartsPieChart>
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
              No type data yet. Re-import after updating to see normal, link,
              emoji, image, video, and more.
            </div>
          )}
        </WrapChartCard>
      </div>

      {/* Dominance */}
      {dominanceData.length > 0 && (
        <WrapChartCard
          title="Message dominance"
          description="Who sent the most across your export"
          exportName="main-dominance"
          exportSize="compact"
          exportLines={a.volume.participants
            .slice(0, 5)
            .map((p) => `${p.name} ${p.pct.toFixed(1)}%`)}
          chartClassName="h-72"
        >
          <EChartsPieChart
            className="h-full w-full p-3"
            data={dominanceData}
            dataKey="count"
            nameKey="name"
            config={pieConfigForKeys(dominanceKeys)}
          >
            <EChartsPieChart.Legend isClickable />
            <EChartsPieChart.Tooltip />
            <EChartsPieChart.Pie isClickable innerRadius="42%">
              <EChartsPieChart.Label dataKey="count" position="inside" />
            </EChartsPieChart.Pie>
          </EChartsPieChart>
        </WrapChartCard>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Message length */}
        {lengthData.length > 0 && (
          <WrapChartCard
            title="Message length"
            description="Average characters per text message"
            exportName="main-message-length"
            exportLines={a.messageLength.participants
              .slice(0, 5)
              .map((p) => `${p.name} ${p.avgChars.toFixed(0)} chars`)}
            chartClassName="h-56"
          >
            <EChartsAreaChart
              data={lengthData}
              config={LENGTH_AREA}
              xDataKey="name"
              className="h-full w-full"
              curveType="monotone"
              chartOptions={{
                grid: { left: 8, right: 8, top: 16, bottom: 28 },
                yAxis: {
                  type: "value",
                  show: true,
                  scale: true,
                  boundaryGap: ["0%", "20%"],
                  axisLabel: { fontSize: 9 },
                },
              }}
            >
              <EChartsAreaChart.Tooltip variant="frosted-glass" />
              <EChartsAreaChart.Area
                dataKey="avgChars"
                variant="gradient"
                strokeVariant="solid"
                strokeWidth={2.5}
              >
                <EChartsAreaChart.ActiveDot variant="ping" />
              </EChartsAreaChart.Area>
            </EChartsAreaChart>
          </WrapChartCard>
        )}

        {/* Response time */}
        {responseData.length > 0 && (
          <WrapChartCard
            title="Response time"
            description="Average & median reply delay (minutes)"
            exportName="main-response-time"
            exportLines={a.responseTime.participants
              .slice(0, 5)
              .map((p) => `${p.name} ${fmtResponseTime(p.avgSecs)}`)}
            chartClassName="h-56"
          >
            <EChartsAreaChart
              data={responseData}
              config={RESPONSE_AREA}
              xDataKey="name"
              className="h-full w-full"
              curveType="monotone"
              chartOptions={{
                grid: { left: 8, right: 8, top: 16, bottom: 28 },
                yAxis: {
                  type: "value",
                  show: true,
                  scale: true,
                  boundaryGap: ["0%", "20%"],
                  axisLabel: { formatter: "{value}m", fontSize: 9 },
                },
              }}
            >
              <EChartsAreaChart.Tooltip variant="frosted-glass" />
              <EChartsAreaChart.Legend />
              <EChartsAreaChart.Area
                dataKey="avgMin"
                variant="gradient"
                strokeVariant="solid"
                strokeWidth={2}
              />
              <EChartsAreaChart.Area
                dataKey="medianMin"
                variant="gradient"
                strokeVariant="solid"
                strokeWidth={2}
              />
            </EChartsAreaChart>
          </WrapChartCard>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Late night */}
        {lateNightData.length > 0 && (
          <WrapChartCard
            title="Late-night chats"
            description={`${fmt(a.lateNight.totalLateNight)} messages between 1–5 AM`}
            exportName="main-late-night"
            exportLines={[`Total ${fmt(a.lateNight.totalLateNight)}`]}
            chartClassName="h-56"
          >
            <EChartsAreaChart
              data={lateNightData}
              config={LATE_NIGHT_AREA}
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

        {/* Initiator vs finisher */}
        {initiatorData.length > 0 && (
          <WrapChartCard
            title="Initiator vs finisher"
            description="Who starts and closes after 6h+ silence"
            exportName="main-initiator-finisher"
            chartClassName="h-56"
          >
            <EChartsAreaChart
              data={initiatorData}
              config={INITIATOR_AREA}
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
              <EChartsAreaChart.Legend />
              <EChartsAreaChart.Area
                dataKey="starts"
                variant="gradient"
                strokeVariant="solid"
                strokeWidth={2}
              />
              <EChartsAreaChart.Area
                dataKey="closes"
                variant="gradient"
                strokeVariant="solid"
                strokeWidth={2}
              />
            </EChartsAreaChart>
          </WrapChartCard>
        )}
      </div>

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

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}
