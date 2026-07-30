import { CircadianPolarChart, formatCircadianHour } from "@/components/wrap/charts/circadian-polar-chart"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import type { CircadianParticipant } from "@/platform/analytics-types"

type CircadianRhythmCardProps = {
  participants: CircadianParticipant[]
  exportName: string
  /** @default 4 */
  maxParticipants?: number
  className?: string
}

/**
 * Shared circadian section for Main Analytics and per-contact views.
 * Same title, description pattern, and clock chart everywhere.
 */
export function CircadianRhythmCard({
  participants,
  exportName,
  maxParticipants = 4,
  className,
}: CircadianRhythmCardProps) {
  const shown = participants.slice(0, maxParticipants)
  if (shown.length === 0) return null

  const sleepHint = shown
    .slice(0, 2)
    .map(
      (p) =>
        `${p.name} sleep ~${formatCircadianHour(p.sleepStartHour)}–${formatCircadianHour(p.sleepEndHour)}`
    )
    .join(" · ")

  return (
    <WrapChartCard
      title="Circadian rhythm"
      description={
        sleepHint
          ? `Activity on a 24-hour clock · ${sleepHint}`
          : "Message activity on a 24-hour clock (midnight at top, clockwise)"
      }
      exportName={exportName}
      exportLines={shown.map(
        (p) =>
          `${p.name} sleep ~${formatCircadianHour(p.sleepStartHour)}–${formatCircadianHour(p.sleepEndHour)}`
      )}
      chartClassName="h-80 sm:h-[22rem]"
      className={className}
    >
      <CircadianPolarChart
        participants={shown}
        className="h-full w-full p-2"
      />
    </WrapChartCard>
  )
}
