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
  VOICE_TEXT_PIE,
  EMOJI_AREA,
} from "@/components/wrap/chart-theme"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { MarkerHighlight } from "@/components/ui/animated/animated-text-08"
import type { WrapAnalytics } from "@/platform/analytics-types"

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

  const voiceText = [
    { kind: "text", count: a.voiceText.totalText },
    { kind: "voice", count: a.voiceText.totalVoice },
  ]

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

      <div className="rounded-xl bg-muted/40 px-4 py-3 ring-1 ring-border/50">
        <p className="font-heading text-lg font-semibold tracking-tight">
          {analytics.displayName}
          {analytics.username ? (
            <span className="ms-2 text-sm font-medium text-muted-foreground">
              @{analytics.username}
            </span>
          ) : null}
        </p>
        {analytics.aboutPreview ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {analytics.aboutPreview}
          </p>
        ) : null}
      </div>

      {/* Overview KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Sent" value={fmt(a.sentMessages)} />
        <Kpi label="Received" value={fmt(a.receivedMessages)} />
        <Kpi label="Total" value={fmt(a.totalMessages)} />
        <Kpi label="Chats" value={fmt(analytics.chatCount)} />
      </div>

      <ActivityOverTimeChart series={a.activityOverTime} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Sent vs received */}
        <WrapChartCard
          title="Sent vs received"
          description="Outbound vs inbound share"
          exportName="main-sent-vs-received"
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

        {/* Voice vs text */}
        {(a.voiceText.totalVoice > 0 || a.voiceText.totalText > 0) && (
          <WrapChartCard
            title="Voice vs text"
            description={
              a.voiceText.totalVoiceDurationSecs > 0
                ? `${fmtDuration(a.voiceText.totalVoiceDurationSecs)} of voice`
                : "Text and voice memo mix"
            }
            exportName="main-voice-vs-text"
            exportLines={[
              `Text ${fmt(a.voiceText.totalText)}`,
              `Voice ${fmt(a.voiceText.totalVoice)}`,
            ]}
            chartClassName="h-64"
          >
            <EChartsPieChart
              className="h-full w-full p-3"
              data={voiceText}
              dataKey="count"
              nameKey="kind"
              config={VOICE_TEXT_PIE}
            >
              <EChartsPieChart.Legend isClickable />
              <EChartsPieChart.Tooltip />
              <EChartsPieChart.Pie isClickable>
                <EChartsPieChart.Label dataKey="count" position="inside" />
              </EChartsPieChart.Pie>
            </EChartsPieChart>
          </WrapChartCard>
        )}
      </div>

      {/* Dominance */}
      {dominanceData.length > 0 && (
        <WrapChartCard
          title="Message dominance"
          description="Who sent the most across your export"
          exportName="main-dominance"
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

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card px-3 py-2.5 ring-1 ring-foreground/10">
      <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-heading text-xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}
