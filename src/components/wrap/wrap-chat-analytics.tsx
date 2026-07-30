import {
  EChartsAreaChart,
} from "@/components/evilcharts/charts/echarts-area-chart"
import {
  EChartsPieChart,
} from "@/components/evilcharts/charts/echarts-pie-chart"
import { ActivityOverTimeChart } from "@/components/wrap/charts/activity-over-time-chart"
import { CalendarHeatmap } from "@/components/wrap/charts/calendar-heatmap"
import { CircadianPolarChart } from "@/components/wrap/charts/circadian-polar-chart"
import { ContactVolumeBarChart } from "@/components/wrap/charts/contact-volume-bar-chart"
import {
  EMOJI_AREA,
  fmt,
  fmtDuration,
  fmtResponseTime,
  INITIATOR_AREA,
  LENGTH_AREA,
  pieConfigForKeys,
  RESPONSE_AREA,
  VOICE_TEXT_PIE,
} from "@/components/wrap/chart-theme"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import type { ChatResult } from "@/platform/analytics-types"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

type WrapChatAnalyticsProps = {
  chat: ChatResult
  onClose?: () => void
}

/** Per-contact analytics — chart-first drill-down from Top contacts. */
export function WrapChatAnalytics({ chat, onClose }: WrapChatAnalyticsProps) {
  const a = chat.analytics
  const participants = a.volume.participants
  const dominanceKeys = participants.slice(0, 6).map((p) => p.name)
  const dominanceData = participants.slice(0, 6).map((p) => ({
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

  const initiatorNames = new Set([
    ...a.initiatorFinisher.initiators.map((p) => p.name),
    ...a.initiatorFinisher.finishers.map((p) => p.name),
  ])
  const initiatorData = [...initiatorNames].map((name) => ({
    name: truncate(name, 12),
    starts:
      a.initiatorFinisher.initiators.find((p) => p.name === name)?.count ?? 0,
    closes:
      a.initiatorFinisher.finishers.find((p) => p.name === name)?.count ?? 0,
  }))

  const emojiData = a.emojis.topOverall.slice(0, 10).map((e) => ({
    name: e.emoji,
    count: e.count,
  }))

  const lateNightData = a.lateNight.participants
    .filter((p) => p.count > 0)
    .map((p) => ({
      name: truncate(p.name, 12),
      count: p.count,
    }))

  return (
    <section
      id="contact-stats"
      className="flex scroll-mt-4 flex-col gap-4"
    >
      <header className="flex items-start justify-between gap-3 text-start">
        <div className="min-w-0">
          <h2 className="font-heading truncate text-xl font-semibold tracking-tight">
            {chat.chatName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmt(a.totalMessages)} messages · sent {fmt(a.sentMessages)} ·
            received {fmt(a.receivedMessages)}
          </p>
        </div>
        {onClose ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            aria-label="Close contact stats"
          >
            <X data-icon="inline-start" />
            Close
          </Button>
        ) : null}
      </header>

      <ActivityOverTimeChart
        series={a.activityOverTime}
        title={`Messages with ${chat.chatName}`}
        exportName={`chat-${chat.chatId}-activity-over-time`}
        sentLabel="You"
        receivedLabel={chat.chatName}
      />

      <ContactVolumeBarChart
        series={a.activityOverTime}
        youLabel="You"
        themLabel={chat.chatName}
        exportName={`chat-${chat.chatId}-volume-bars`}
        youSent={a.sentMessages}
        themSent={a.receivedMessages}
        totalMessages={a.totalMessages}
      />

      <WrapChartCard
        title="Dominance"
        description="Who sent more in this chat"
        exportName={`chat-${chat.chatId}-dominance`}
        exportLines={participants.map(
          (p) => `${p.name} ${fmt(p.count)} (${p.pct.toFixed(1)}%)`
        )}
        chartClassName="h-64 sm:h-72"
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
          <EChartsPieChart.Pie isClickable innerRadius="40%">
            <EChartsPieChart.Label dataKey="count" position="inside" />
          </EChartsPieChart.Pie>
        </EChartsPieChart>
      </WrapChartCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {responseData.length > 0 && (
          <WrapChartCard
            title="Response time"
            description="Avg & median reply delay (minutes)"
            exportName={`chat-${chat.chatId}-response`}
            exportLines={a.responseTime.participants.map(
              (p) => `${p.name} ${fmtResponseTime(p.avgSecs)}`
            )}
            chartClassName="h-52"
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

        {lengthData.length > 0 && (
          <WrapChartCard
            title="Message length"
            description="Average characters per message"
            exportName={`chat-${chat.chatId}-length`}
            chartClassName="h-52"
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
      </div>

      {a.voiceText.totalVoice > 0 && (
        <WrapChartCard
          title="Voice vs text"
          description={
            a.voiceText.totalVoiceDurationSecs > 0
              ? `${fmtDuration(a.voiceText.totalVoiceDurationSecs)} of voice in this chat`
              : "Voice memos vs text"
          }
          exportName={`chat-${chat.chatId}-voice`}
          chartClassName="h-56"
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {initiatorData.length > 0 && (
          <WrapChartCard
            title="Who starts / closes"
            description="After 6h+ of silence"
            exportName={`chat-${chat.chatId}-initiator`}
            chartClassName="h-52"
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

        {lateNightData.length > 0 && (
          <WrapChartCard
            title="Late night (1–5 AM)"
            description={`${fmt(a.lateNight.totalLateNight)} messages`}
            exportName={`chat-${chat.chatId}-late-night`}
            chartClassName="h-52"
          >
            <EChartsAreaChart
              data={lateNightData}
              config={{
                count: {
                  label: "Messages",
                  colors: {
                    light: ["#6366f1", "#4f46e5"],
                    dark: ["#818cf8", "#6366f1"],
                  },
                },
              }}
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
      </div>

      {emojiData.length > 0 && (
        <WrapChartCard
          title="Top emojis"
          description="Most used in this chat"
          exportName={`chat-${chat.chatId}-emojis`}
          chartClassName="h-48"
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

      {a.circadian.participants.length > 0 && (
        <WrapChartCard
          title="Activity by hour"
          description={a.circadian.participants
            .slice(0, 2)
            .map(
              (p) =>
                `${p.name} sleep ${p.sleepStartHour}:00–${p.sleepEndHour}:00`
            )
            .join(" · ")}
          exportName={`chat-${chat.chatId}-circadian`}
          chartClassName="h-72"
        >
          <CircadianPolarChart
            participants={a.circadian.participants}
            className="h-full w-full"
          />
        </WrapChartCard>
      )}

      {a.heatmap.days.length > 0 && (
        <WrapChartCard
          title="Activity heatmap"
          description="Messages per day in this chat"
          exportName={`chat-${chat.chatId}-heatmap`}
          chartClassName="h-44 sm:h-48"
        >
          <CalendarHeatmap days={a.heatmap.days} className="h-full w-full" />
        </WrapChartCard>
      )}
    </section>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}
