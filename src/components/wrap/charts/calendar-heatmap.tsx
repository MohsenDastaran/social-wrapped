/**
 * Calendar heatmap — stat #5 (Activity Heatmap).
 *
 * Renders a GitHub-style contribution graph using ECharts HeatmapChart
 * directly on echarts/core to keep bundle size minimal.
 */
import { useEffect } from "react"
import * as echarts from "echarts/core"
import { HeatmapChart } from "echarts/charts"
import {
  CalendarComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components"
import { CanvasRenderer } from "echarts/renderers"
import type { HeatmapDay } from "@/platform/analytics-types"
import { cn } from "@/lib/utils"
import { useSizedEcharts } from "@/components/wrap/charts/use-sized-echarts"

echarts.use([
  HeatmapChart,
  CalendarComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
])

type CalendarHeatmapProps = {
  days: HeatmapDay[]
  className?: string
}

/** Takes the last 365 days of heatmap data and renders a GitHub-style calendar. */
export function CalendarHeatmap({ days, className }: CalendarHeatmapProps) {
  const { containerRef, chartRef, ready } = useSizedEcharts()

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !ready) return

    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date))
    const recent = sorted.slice(-365)
    const isDark = document.documentElement.classList.contains("dark")
    const maxCount = Math.max(...recent.map((d) => d.count), 1)
    const endDate =
      recent.length > 0
        ? recent[recent.length - 1].date
        : new Date().toISOString().slice(0, 10)
    const startDate = recent.length > 0 ? recent[0].date : endDate
    const data = recent.map((d) => [d.date, d.count])

    chart.setOption({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: (params: { value: [string, number] }) =>
          `${params.value[0]}: ${params.value[1].toLocaleString()} messages`,
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        textStyle: { color: isDark ? "#f1f5f9" : "#0f172a", fontSize: 12 },
      },
      visualMap: {
        show: false,
        min: 0,
        max: maxCount,
        inRange: {
          color: isDark
            ? ["#1e293b", "#0d4e38", "#0f766e", "#14b8a6", "#5eead4"]
            : ["#f0fdf4", "#bbf7d0", "#4ade80", "#16a34a", "#14532d"],
        },
      },
      calendar: {
        top: 16,
        left: 28,
        right: 8,
        bottom: 8,
        range: [startDate, endDate],
        cellSize: ["auto", 13],
        splitLine: { show: false },
        dayLabel: {
          firstDay: 1,
          nameMap: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
          color: isDark ? "#64748b" : "#94a3b8",
          fontSize: 9,
        },
        monthLabel: {
          color: isDark ? "#94a3b8" : "#64748b",
          fontSize: 10,
        },
        yearLabel: { show: false },
        itemStyle: {
          borderWidth: 2,
          borderColor: isDark ? "#0f172a" : "#f8fafc",
        },
      },
      series: [
        {
          type: "heatmap",
          coordinateSystem: "calendar",
          data,
          itemStyle: { borderRadius: 2 },
        },
      ],
    })
  }, [days, ready, chartRef])

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full", className)}
      aria-label="Activity heatmap"
    />
  )
}
