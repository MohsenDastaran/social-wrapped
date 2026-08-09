import { useMemo, useState, type ReactNode } from "react"

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
import { cn } from "@/lib/utils"

export type CountSeriesPoint = {
  label: string
  count: number
}

export type CountSeriesMode = {
  id: string
  label: string
  data: CountSeriesPoint[]
  description?: string
  exportName?: string
}

type CountSeriesChartProps = {
  data?: CountSeriesPoint[]
  title: string
  description?: string
  exportName: string
  valueLabel: string
  variant: "bar" | "area"
  accent?: "rose" | "violet"
  /** Optional Year / Decade (etc.) toggle. Overrides `data` when set. */
  modes?: CountSeriesMode[]
  defaultModeId?: string
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
  modes,
  defaultModeId,
}: CountSeriesChartProps) {
  const usableModes = useMemo(
    () => (modes ?? []).filter((mode) => mode.data.length > 0),
    [modes]
  )
  const showToggle = usableModes.length > 1

  const [modeId, setModeId] = useState(
    () =>
      defaultModeId ??
      usableModes.find((m) => m.data.length > 1)?.id ??
      usableModes[0]?.id ??
      ""
  )

  const activeMode =
    usableModes.find((m) => m.id === modeId) ?? usableModes[0] ?? null
  const chartData = activeMode?.data ?? data ?? []
  const activeExportName = activeMode?.exportName ?? exportName
  const activeDescription =
    activeMode?.description ?? description

  const total = useMemo(
    () => chartData.reduce((sum, row) => sum + row.count, 0),
    [chartData]
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

  if (chartData.length === 0) return null

  const chartDescription =
    activeDescription ??
    `${fmt(total)} ${valueLabel.toLowerCase()} across ${chartData.length} periods`

  return (
    <WrapChartCard
      title={title}
      description={chartDescription}
      exportName={activeExportName}
      exportSize="wide"
      exportLines={[
        `${valueLabel} ${fmt(total)}`,
        `${chartData.length} periods`,
        ...(activeMode ? [`Mode ${activeMode.label}`] : []),
      ]}
      chartClassName="h-80 sm:h-96"
      headerExtra={
        showToggle ? (
          <div
            className="flex items-center gap-1 rounded-lg bg-muted p-0.5"
            role="group"
            aria-label="Chart period"
            data-export-ignore
          >
            {usableModes.map((mode) => (
              <ModeButton
                key={mode.id}
                active={mode.id === (activeMode?.id ?? modeId)}
                onClick={() => setModeId(mode.id)}
              >
                {mode.label}
              </ModeButton>
            ))}
          </div>
        ) : null
      }
    >
      <div className="h-full w-full p-3 pt-0">
        {variant === "area" ? (
          <EChartsAreaChart
            data={chartData}
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
            data={chartData}
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
      aria-pressed={active}
      className={cn(
        "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors sm:px-3 sm:text-xs",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
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
