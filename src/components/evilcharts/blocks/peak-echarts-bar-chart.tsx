"use client"

import {
  EChartsBarChart,
  type ChartConfig,
} from "@/components/evilcharts/charts/echarts-bar-chart"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export type PeakBarSeries = {
  /** Field on each data row. */
  dataKey: string
  label: string
  /** Tailwind classes for the legend color swatch. */
  swatch: string
}

export type EChartsPeakBarChartProps<T extends Record<string, unknown>> = {
  data: T[]
  config: ChartConfig
  /** Category field (x-axis). */
  xDataKey: keyof T & string
  /**
   * Stack segments — first item is the bottom of each column.
   * Must match keys in `config`.
   */
  series: PeakBarSeries[]
  /** Small label above the peak number. @default "Peak" */
  peakEyebrow?: string
  /** Format the peak total. @default String(n) */
  formatValue?: (value: number) => string
  /**
   * Text after the peak number, e.g. `messages with Alice`.
   * Receives the winning row and its stacked total.
   */
  formatPeakDetail?: (row: T, total: number) => ReactNode
  /** Corner radius on stacked bars. @default 6 */
  barRadius?: number
  /** Dim non-peak columns. @default true */
  enableMaxValueHighlight?: boolean
  className?: string
  /** Extra controls in the header (e.g. mode toggles). */
  headerExtra?: ReactNode
}

/**
 * Peak-highlighted stacked bar chart — headline total for the tallest column,
 * legend, and dimmed non-peak bars.
 */
export function EChartsPeakBarChart<T extends Record<string, unknown>>({
  data,
  config,
  xDataKey,
  series,
  peakEyebrow = "Peak",
  formatValue = (n) => n.toLocaleString(),
  formatPeakDetail,
  barRadius = 6,
  enableMaxValueHighlight = true,
  className,
  headerExtra,
}: EChartsPeakBarChartProps<T>) {
  const keys = series.map((s) => s.dataKey)

  const peak = data.reduce<(T & { __total: number }) | null>((best, row) => {
    const total = keys.reduce((sum, key) => sum + numberAt(row, key), 0)
    if (!best || total > best.__total) return { ...row, __total: total }
    return best
  }, null)

  const peakTotal = peak?.__total ?? 0

  return (
    <div className={cn("flex h-full w-full flex-col p-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs text-muted-foreground">{peakEyebrow}</span>
          {peak ? (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-heading text-2xl font-semibold tracking-tight text-primary tabular-nums sm:text-3xl">
                {formatValue(peakTotal)}
              </span>
              {formatPeakDetail ? (
                <span className="text-sm text-muted-foreground">
                  {formatPeakDetail(peak, peakTotal)}
                </span>
              ) : null}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">No data</span>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {headerExtra}
          <div className="flex flex-col items-end gap-1.5">
            {series.map(({ dataKey, label, swatch }) => (
              <span
                key={dataKey}
                className="flex items-center gap-2 text-[11px] text-muted-foreground sm:text-xs"
              >
                <span className={cn("size-2.5 shrink-0 rounded-[3px]", swatch)} />
                <span className="max-w-28 truncate">{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 min-h-0 w-full flex-1">
        {data.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No data to show.
          </p>
        ) : (
          <EChartsBarChart
            data={data}
            config={config}
            xDataKey={xDataKey}
            className="h-full w-full"
            stackType="stacked"
            enableMaxValueHighlight={enableMaxValueHighlight}
          >
            <EChartsBarChart.XAxis dataKey={xDataKey} hideDots />
            <EChartsBarChart.Tooltip />
            {series.map((s) => (
              <EChartsBarChart.Bar
                key={s.dataKey}
                dataKey={s.dataKey}
                radius={barRadius}
              />
            ))}
          </EChartsBarChart>
        )}
      </div>
    </div>
  )
}

function numberAt(row: Record<string, unknown>, key: string): number {
  const v = row[key]
  return typeof v === "number" && Number.isFinite(v) ? v : 0
}
