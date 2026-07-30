import { useMemo, useState, type ReactNode } from "react"

import {
  EChartsAreaChart,
  type ChartConfig,
} from "@/components/evilcharts/charts/echarts-area-chart"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { fmt } from "@/components/wrap/chart-theme"
import type { ActivityTimeSeries } from "@/platform/analytics-types"
import { cn } from "@/lib/utils"

type Mode = "yearly" | "monthly"

type ChartRow = {
  date: string
  sent: number
  received: number
}

type ActivityOverTimeChartProps = {
  series: ActivityTimeSeries
  title?: string
  exportName?: string
  sentLabel?: string
  receivedLabel?: string
}

/**
 * Hero brush chart — sent vs received over time.
 * Yearly = one bar/point per year (2025, 2026, …).
 * Monthly = one point per month (2026/03, 2026/04, …).
 */
export function ActivityOverTimeChart({
  series,
  title = "Messages over time",
  exportName = "main-activity-over-time",
  sentLabel = "Sent",
  receivedLabel = "Received",
}: ActivityOverTimeChartProps) {
  const [mode, setMode] = useState<Mode>(
    series.yearly.length > 0 || series.years.length > 0 ? "yearly" : "monthly"
  )

  const config = useMemo(
    () =>
      ({
        sent: {
          label: sentLabel,
          colors: {
            light: ["#047857"],
            dark: ["#10b981"],
          },
        },
        received: {
          label: receivedLabel,
          colors: {
            light: ["#be123c"],
            dark: ["#f43f5e"],
          },
        },
      }) satisfies ChartConfig,
    [sentLabel, receivedLabel]
  )

  const data: ChartRow[] = useMemo(() => {
    if (mode === "yearly") {
      const points =
        series.yearly.length > 0
          ? series.yearly
          : aggregateYearsFromMonthly(series.monthly)
      return points.map((p) => ({
        date: p.period.slice(0, 4),
        sent: p.sent,
        received: p.received,
      }))
    }

    return series.monthly.map((p) => ({
      date: formatYearMonth(p.period),
      sent: p.sent,
      received: p.received,
    }))
  }, [mode, series])

  const totalSent = data.reduce((s, d) => s + d.sent, 0)
  const totalReceived = data.reduce((s, d) => s + d.received, 0)

  if (series.yearly.length === 0 && series.monthly.length === 0) {
    return null
  }

  return (
    <WrapChartCard
      title={title}
      description={
        mode === "yearly"
          ? `${sentLabel} vs ${receivedLabel} by year — drag the brush to zoom`
          : `${sentLabel} vs ${receivedLabel} by month — drag the brush to zoom`
      }
      exportName={exportName}
      exportSize="wide"
      exportLines={[
        `Mode ${mode}`,
        `${sentLabel} ${fmt(totalSent)}`,
        `${receivedLabel} ${fmt(totalReceived)}`,
      ]}
      chartClassName="h-80 sm:h-96"
    >
      <div className="flex h-full w-full flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-2">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
            <ModeButton
              active={mode === "yearly"}
              onClick={() => setMode("yearly")}
            >
              Yearly
            </ModeButton>
            <ModeButton
              active={mode === "monthly"}
              onClick={() => setMode("monthly")}
            >
              Monthly
            </ModeButton>
          </div>

          <div className="flex items-center gap-2 text-[11px] tabular-nums leading-none">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span
                className="size-1.5 shrink-0 rounded-full bg-[#047857] dark:bg-[#10b981]"
                aria-hidden
              />
              <span className="font-medium text-foreground">{fmt(totalSent)}</span>
              <span className="text-muted-foreground/80">{sentLabel}</span>
            </span>
            <span className="text-border" aria-hidden>
              /
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span
                className="size-1.5 shrink-0 rounded-full bg-[#be123c] dark:bg-[#f43f5e]"
                aria-hidden
              />
              <span className="font-medium text-foreground">{fmt(totalReceived)}</span>
              <span className="text-muted-foreground/80">{receivedLabel}</span>
            </span>
          </div>
        </div>

        {data.length === 0 ? (
          <p className="flex flex-1 items-center justify-center px-4 text-sm text-muted-foreground">
            No messages in this range.
          </p>
        ) : (
          <div className="min-h-0 flex-1">
            <EChartsAreaChart
              data={data}
              config={config}
              className="h-full w-full p-3"
              curveType="monotone"
              xDataKey="date"
            >
              <EChartsAreaChart.Grid />
              <EChartsAreaChart.XAxis
                dataKey="date"
                tickFormatter={(value) =>
                  shortenTick(String(value), mode)
                }
              />
              <EChartsAreaChart.Brush
                height={56}
                formatLabel={(value) => String(value)}
              />
              <EChartsAreaChart.Legend isClickable />
              <EChartsAreaChart.Tooltip />
              <EChartsAreaChart.Area
                dataKey="sent"
                variant="gradient"
                isClickable
              />
              <EChartsAreaChart.Area
                dataKey="received"
                variant="gradient"
                isClickable
              />
            </EChartsAreaChart>
          </div>
        )}
      </div>
    </WrapChartCard>
  )
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

/** `"2024-03"` → `"2024/03"` */
function formatYearMonth(period: string): string {
  if (period.length < 7) return period
  const year = period.slice(0, 4)
  const month = Number(period.slice(5, 7))
  if (!Number.isFinite(month) || month < 1) return period
  return `${year}/${month}`
}

function aggregateYearsFromMonthly(
  monthly: ActivityTimeSeries["monthly"]
): ActivityTimeSeries["yearly"] {
  const map = new Map<string, { sent: number; received: number }>()
  for (const p of monthly) {
    const year = p.period.slice(0, 4)
    if (year.length < 4) continue
    const slot = map.get(year) ?? { sent: 0, received: 0 }
    slot.sent += p.sent
    slot.received += p.received
    map.set(year, slot)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, v]) => ({ period, sent: v.sent, received: v.received }))
}

function shortenTick(value: string, mode: Mode): string {
  if (mode === "yearly") return value
  // "2026/3" → keep as-is; dense ticks can hide via chart auto interval
  const slash = value.indexOf("/")
  if (slash < 0) return value
  return value.slice(slash + 1)
}
