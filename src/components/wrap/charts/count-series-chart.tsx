import { useMemo } from "react"

import {
  EChartsAreaChart,
  type ChartConfig as AreaConfig,
} from "@/components/evilcharts/charts/echarts-area-chart"
import {
  EChartsBarChart,
  type ChartConfig as BarConfig,
} from "@/components/evilcharts/charts/echarts-bar-chart"
import { fmt } from "@/components/wrap/chart-theme"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import type { HeatmapDay } from "@/platform/analytics-types"

export type CountSeriesPoint = {
  label: string
  count: number
}

type CountSeriesChartProps = {
  data: CountSeriesPoint[]
  title: string
  description?: string
  exportName: string
  valueLabel: string
  variant: "bar" | "area"
  accent?: "rose" | "violet"
}

const ACCENT_COLORS: Record<
  "rose" | "violet",
  { light: string[]; dark: string[] }
> = {
  rose: {
    light: ["#be123c"],
    dark: ["#fb7185"],
  },
  violet: {
    light: ["#7c3aed"],
    dark: ["#a78bfa"],
  },
}

/** Single-series bar or area chart for labeled counts (years, months, …). */
export function CountSeriesChart({
  data,
  title,
  description,
  exportName,
  valueLabel,
  variant,
  accent = "rose",
}: CountSeriesChartProps) {
  const total = useMemo(
    () => data.reduce((sum, row) => sum + row.count, 0),
    [data]
  )

  const config = useMemo(
    () =>
      ({
        count: {
          label: valueLabel,
          colors: ACCENT_COLORS[accent],
        },
      }) satisfies AreaConfig & BarConfig,
    [accent, valueLabel]
  )

  if (data.length === 0) return null

  const chartDescription =
    description ??
    `${fmt(total)} ${valueLabel.toLowerCase()} across ${data.length} periods`

  return (
    <WrapChartCard
      title={title}
      description={chartDescription}
      exportName={exportName}
      exportSize="wide"
      exportLines={[`${valueLabel} ${fmt(total)}`, `${data.length} periods`]}
      chartClassName="h-80 sm:h-96"
    >
      <div className="h-full w-full p-3 pt-0">
        {variant === "area" ? (
          <EChartsAreaChart
            data={data}
            config={config}
            className="h-full w-full"
            curveType="monotone"
            xDataKey="label"
          >
            <EChartsAreaChart.Grid />
            <EChartsAreaChart.XAxis
              dataKey="label"
              tickFormatter={(value) => String(value)}
            />
            <EChartsAreaChart.Brush
              height={56}
              formatLabel={(value) => String(value)}
            />
            <EChartsAreaChart.Tooltip />
            <EChartsAreaChart.Area
              dataKey="count"
              variant="gradient"
              strokeVariant="solid"
              strokeWidth={2}
            />
          </EChartsAreaChart>
        ) : (
          <EChartsBarChart
            data={data}
            config={config}
            className="h-full w-full"
            xDataKey="label"
            enableMaxValueGlow
            barRadius={6}
          >
            <EChartsBarChart.Grid />
            <EChartsBarChart.XAxis
              dataKey="label"
              tickFormatter={(value) => String(value)}
            />
            <EChartsBarChart.Brush
              height={56}
              formatLabel={(value) => String(value)}
            />
            <EChartsBarChart.Tooltip />
            <EChartsBarChart.Bar dataKey="count" radius={6} />
          </EChartsBarChart>
        )}
      </div>
    </WrapChartCard>
  )
}

/** Aggregate daily heatmap buckets into monthly totals for line/area charts. */
export function heatmapDaysToMonthly(days: HeatmapDay[]): CountSeriesPoint[] {
  const byMonth = new Map<string, number>()
  for (const day of days) {
    if (day.date.length < 7) continue
    const month = day.date.slice(0, 7)
    byMonth.set(month, (byMonth.get(month) ?? 0) + day.count)
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, count]) => ({
      label: formatYearMonth(period),
      count,
    }))
}

/** `"2024-03"` → `"2024/03"` */
function formatYearMonth(period: string): string {
  if (period.length < 7) return period
  const year = period.slice(0, 4)
  const month = Number(period.slice(5, 7))
  if (!Number.isFinite(month) || month < 1) return period
  return `${year}/${String(month).padStart(2, "0")}`
}
