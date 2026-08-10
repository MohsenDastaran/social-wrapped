import {
  CircadianPolarChart,
  formatCircadianHour,
  peakHourLabel,
  type CircadianSeries,
} from "@/components/wrap/charts/circadian-polar-chart"
import { fmt } from "@/components/wrap/chart-theme"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import type { CircadianParticipant } from "@/platform/analytics-types"

type CircadianRhythmCardProps = {
  exportName: string
  /**
   * Account-wide (or chat-wide) totals across every message.
   * Prefer this on Main Analytics so the clock reflects all chats.
   */
  hourlyTotal?: number[]
  /** Per-person series — used on contact drill-down (you vs them). */
  participants?: CircadianParticipant[]
  className?: string
}

/**
 * Shared “Activity by hour” section for Main and per-contact views.
 */
export function CircadianRhythmCard({
  exportName,
  hourlyTotal,
  participants,
  className,
}: CircadianRhythmCardProps) {
  const series: CircadianSeries[] = (() => {
    if (hourlyTotal && hourlyTotal.some((n) => n > 0)) {
      return [{ name: "Messages", hourly: hourlyTotal }]
    }
    if (participants && participants.length > 0) {
      return participants.map((p) => ({ name: p.name, hourly: p.hourly }))
    }
    return []
  })()

  if (series.length === 0) return null

  const aggregate =
    hourlyTotal && hourlyTotal.some((n) => n > 0)
      ? hourlyTotal
      : sumHourly(series.map((s) => s.hourly))
  const totalMsgs = aggregate.reduce((a, b) => a + b, 0)
  const peak = peakHourLabel(aggregate)
  const showLegend = series.length > 1

  const sleepHint =
    !hourlyTotal && participants && participants.length > 0
      ? participants
          .slice(0, 2)
          .map(
            (p) =>
              `${p.name} sleep ~${formatCircadianHour(p.sleepStartHour)}–${formatCircadianHour(p.sleepEndHour)}`
          )
          .join(" · ")
      : null

  return (
    <WrapChartCard
      title="Messaging by hour"
      description={
        sleepHint
          ? `Peak ${peak} · ${sleepHint}`
          : `Peak ${peak} · ${fmt(totalMsgs)} messages`
      }
      exportName={exportName}
      exportSize="compact"
      exportLines={[
        `Peak ${peak}`,
        `Total ${fmt(totalMsgs)}`,
        ...(!hourlyTotal && participants
          ? participants.map(
              (p) =>
                `${p.name} sleep ~${formatCircadianHour(p.sleepStartHour)}–${formatCircadianHour(p.sleepEndHour)}`
            )
          : []),
      ]}
      chartClassName="h-80 sm:h-[22rem]"
      className={className}
    >
      <CircadianPolarChart
        series={series}
        showLegend={showLegend}
        className="h-full w-full p-2"
      />
    </WrapChartCard>
  )
}

function sumHourly(rows: number[][]): number[] {
  const out = Array.from({ length: 24 }, () => 0)
  for (const row of rows) {
    for (let i = 0; i < 24; i++) {
      out[i]! += row[i] ?? 0
    }
  }
  return out
}
