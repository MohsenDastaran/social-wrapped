import { fmt } from "@/components/wrap/chart-theme"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { cn } from "@/lib/utils"

const ACCENTS = {
  teal: {
    text: "text-teal-600 dark:text-teal-400",
    bar: "bg-teal-600 dark:bg-teal-400",
  },
  amber: {
    text: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-600 dark:bg-amber-400",
  },
  violet: {
    text: "text-violet-600 dark:text-violet-400",
    bar: "bg-violet-600 dark:bg-violet-400",
  },
  indigo: {
    text: "text-indigo-600 dark:text-indigo-400",
    bar: "bg-indigo-600 dark:bg-indigo-400",
  },
  emerald: {
    text: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-600 dark:bg-emerald-400",
  },
} as const

export type ComparisonAccent = keyof typeof ACCENTS

export type ComparisonMetric = {
  key: string
  label: string
  /** Format the raw numeric value for display. @default fmt */
  format?: (value: number) => string
  accent?: ComparisonAccent
}

export type ComparisonRow = {
  name: string
  values: Record<string, number>
}

export type ComparisonKpiCardProps = {
  title: string
  description?: string
  exportName: string
  exportLines?: string[]
  metrics: ComparisonMetric[]
  rows: ComparisonRow[]
  /**
   * Which metric decides the highlight badge.
   * Defaults to the first metric.
   */
  highlightKey?: string
  /** When true, the smallest value wins (e.g. response time). */
  lowerIsBetter?: boolean
  /** Badge label for the winning row. @default "Top" / "Fastest" if lowerIsBetter */
  highlightLabel?: string
  className?: string
}

/**
 * Side-by-side participant KPIs — big numbers + share bars.
 * Shared by response time, message length, starts/closes, late night.
 */
export function ComparisonKpiCard({
  title,
  description,
  exportName,
  exportLines,
  metrics,
  rows,
  highlightKey,
  lowerIsBetter = false,
  highlightLabel,
  className,
}: ComparisonKpiCardProps) {
  if (rows.length === 0 || metrics.length === 0) return null

  const winKey = highlightKey ?? metrics[0]!.key
  const peaks = Object.fromEntries(
    metrics.map((m) => [
      m.key,
      Math.max(...rows.map((r) => r.values[m.key] ?? 0), 1),
    ])
  ) as Record<string, number>

  const winnerName = pickWinner(rows, winKey, lowerIsBetter)
  const badge =
    highlightLabel ?? (lowerIsBetter ? "Fastest" : "Top")

  return (
    <WrapChartCard
      title={title}
      description={description}
      exportName={exportName}
      exportLines={exportLines}
      exportSize="compact"
      layout="flow"
      className={className}
    >
      <div
        className={cn(
          "grid gap-3 p-4 pt-3",
          rows.length === 1 && "grid-cols-1",
          rows.length === 2 && "grid-cols-1 sm:grid-cols-2",
          rows.length >= 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {rows.map((row) => {
          const isWinner = row.name === winnerName
          return (
            <div
              key={row.name}
              className={cn(
                "relative flex flex-col gap-3 rounded-2xl px-4 py-3.5 ring-1",
                isWinner
                  ? "bg-primary/8 ring-primary/25"
                  : "bg-muted/40 ring-foreground/5"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold tracking-tight">
                  {row.name}
                </p>
                {isWinner ? (
                  <span className="shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide text-primary uppercase">
                    {badge}
                  </span>
                ) : null}
              </div>

              <ul className="flex flex-col gap-3">
                {metrics.map((metric) => {
                  const value = row.values[metric.key] ?? 0
                  const peak = peaks[metric.key] ?? 1
                  const share = peak > 0 ? value / peak : 0
                  const accent = ACCENTS[metric.accent ?? "teal"]
                  const format = metric.format ?? fmt
                  return (
                    <li key={metric.key} className="flex flex-col gap-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className={cn(
                            "font-heading text-2xl font-semibold tracking-tight tabular-nums sm:text-[1.75rem]",
                            accent.text
                          )}
                        >
                          {format(value)}
                        </span>
                        <span className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
                          {metric.label}
                        </span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/10">
                        <div
                          className={cn("h-full rounded-full", accent.bar)}
                          style={{
                            width: `${Math.max(share * 100, value > 0 ? 6 : 0)}%`,
                          }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </WrapChartCard>
  )
}

function pickWinner(
  rows: ComparisonRow[],
  key: string,
  lowerIsBetter: boolean
): string | null {
  let best: ComparisonRow | null = null
  for (const row of rows) {
    const v = row.values[key]
    if (typeof v !== "number" || !Number.isFinite(v)) continue
    if (!best) {
      best = row
      continue
    }
    const bv = best.values[key] ?? 0
    if (lowerIsBetter ? v < bv : v > bv) best = row
  }
  return best?.name ?? null
}
