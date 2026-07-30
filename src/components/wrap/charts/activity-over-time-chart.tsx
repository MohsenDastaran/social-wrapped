import { useMemo, useState, type ReactNode } from "react"

import {
  EChartsAreaChart,
  type ChartConfig,
} from "@/components/evilcharts/charts/echarts-area-chart"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { fmt } from "@/components/wrap/chart-theme"
import type { ActivityTimeSeries } from "@/platform/analytics-types"
import { cn } from "@/lib/utils"

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

const chartConfig = {
  sent: {
    label: "Sent",
    colors: {
      light: ["#047857"],
      dark: ["#10b981"],
    },
  },
  received: {
    label: "Received",
    colors: {
      light: ["#be123c"],
      dark: ["#f43f5e"],
    },
  },
} satisfies ChartConfig

type Mode = "yearly" | "monthly"

type ChartRow = {
  date: string
  sent: number
  received: number
}

type ActivityOverTimeChartProps = {
  series: ActivityTimeSeries
}

/**
 * Hero brush chart — sent vs received over time.
 * Yearly mode uses month buckets across all history; monthly mode shows
 * daily buckets for a selected year. Aggregation is done in Rust.
 */
export function ActivityOverTimeChart({ series }: ActivityOverTimeChartProps) {
  const years = series.years.length > 0 ? series.years : []
  const [mode, setMode] = useState<Mode>(
    years.length > 0 || series.monthly.length > 0 ? "yearly" : "monthly"
  )
  const [year, setYear] = useState<number>(years[0] ?? new Date().getFullYear())

  const data: ChartRow[] = useMemo(() => {
    if (mode === "yearly") {
      // Month buckets across the full span — brush zooms across years.
      return series.monthly.map((p) => ({
        date: formatMonthLabel(p.period),
        sent: p.sent,
        received: p.received,
      }))
    }

    // Daily buckets for the selected year.
    const prefix = `${year}-`
    return series.daily
      .filter((p) => p.period.startsWith(prefix))
      .map((p) => ({
        date: formatDayLabel(p.period),
        sent: p.sent,
        received: p.received,
      }))
  }, [mode, year, series])

  const totalSent = data.reduce((s, d) => s + d.sent, 0)
  const totalReceived = data.reduce((s, d) => s + d.received, 0)

  if (series.daily.length === 0 && series.monthly.length === 0) {
    return null
  }

  return (
    <WrapChartCard
      title="Messages over time"
      description={
        mode === "yearly"
          ? "Sent vs received by month — drag the brush to zoom"
          : `Daily sent vs received in ${year} — drag the brush to zoom`
      }
      exportName="main-activity-over-time"
      exportLines={[
        `Mode ${mode}`,
        mode === "monthly" ? `Year ${year}` : "All years",
        `Sent ${fmt(totalSent)}`,
        `Received ${fmt(totalReceived)}`,
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

          {mode === "monthly" && years.length > 0 ? (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Year
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-xs tabular-nums text-muted-foreground">
              {fmt(totalSent)} sent · {fmt(totalReceived)} received
            </p>
          )}
        </div>

        {data.length === 0 ? (
          <p className="flex flex-1 items-center justify-center px-4 text-sm text-muted-foreground">
            No messages in {year}.
          </p>
        ) : (
          <div className="min-h-0 flex-1">
            <EChartsAreaChart
              data={data}
              config={chartConfig}
              className="h-full w-full p-3"
              curveType="monotone"
              xDataKey="date"
            >
              <EChartsAreaChart.Grid />
              <EChartsAreaChart.XAxis
                dataKey="date"
                tickFormatter={(value) => shortenTick(String(value), mode)}
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

/** `"2024-03"` → `"Mar 2024"` */
function formatMonthLabel(period: string): string {
  if (period.length < 7) return period
  const year = period.slice(0, 4)
  const month = Number(period.slice(5, 7))
  const name = MONTH_NAMES[month - 1] ?? period.slice(5, 7)
  return `${name} ${year}`
}

/** `"2024-03-15"` → `"Mar 15"` */
function formatDayLabel(period: string): string {
  if (period.length < 10) return period
  const month = Number(period.slice(5, 7))
  const day = Number(period.slice(8, 10))
  const name = MONTH_NAMES[month - 1] ?? period.slice(5, 7)
  return `${name} ${day}`
}

function shortenTick(value: string, mode: Mode): string {
  if (mode === "yearly") {
    // "Mar 2024" → "Mar" or keep short
    const parts = value.split(" ")
    return parts[0] ?? value
  }
  // "Mar 15" → day number
  const parts = value.split(" ")
  return parts[1] ?? value
}
