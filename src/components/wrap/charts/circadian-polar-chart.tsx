/**
 * Circadian rhythm polar chart — stat #4.
 *
 * Renders a 24-hour polar/radar chart showing message activity by hour,
 * one line per participant, using ECharts RadarChart directly.
 */
import { useEffect } from "react"
import * as echarts from "echarts/core"
import { RadarChart } from "echarts/charts"
import { TooltipComponent, LegendComponent } from "echarts/components"
import { CanvasRenderer } from "echarts/renderers"
import type { CircadianParticipant } from "@/platform/analytics-types"
import { cn } from "@/lib/utils"
import { useSizedEcharts } from "@/components/wrap/charts/use-sized-echarts"

echarts.use([RadarChart, TooltipComponent, LegendComponent, CanvasRenderer])

const HOUR_LABELS = [
  "12am", "1am", "2am", "3am", "4am", "5am",
  "6am", "7am", "8am", "9am", "10am", "11am",
  "12pm", "1pm", "2pm", "3pm", "4pm", "5pm",
  "6pm", "7pm", "8pm", "9pm", "10pm", "11pm",
]

const PARTICIPANT_COLORS_LIGHT = [
  "#0d9488", "#d97706", "#7c3aed", "#be185d",
]
const PARTICIPANT_COLORS_DARK = [
  "#2dd4bf", "#fbbf24", "#a78bfa", "#f472b6",
]

type CircadianPolarChartProps = {
  participants: CircadianParticipant[]
  className?: string
}

export function CircadianPolarChart({
  participants,
  className,
}: CircadianPolarChartProps) {
  const { containerRef, chartRef, ready } = useSizedEcharts()

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !ready || participants.length === 0) return

    const isDark = document.documentElement.classList.contains("dark")
    const colors = isDark ? PARTICIPANT_COLORS_DARK : PARTICIPANT_COLORS_LIGHT
    const maxVal = Math.max(...participants.flatMap((p) => p.hourly), 1)
    const indicators = HOUR_LABELS.map((name) => ({ name, max: maxVal }))

    const series = participants.map((p, i) => ({
      name: p.name,
      type: "radar" as const,
      data: [{ value: p.hourly, name: p.name }],
      lineStyle: {
        color: colors[i % colors.length],
        width: 2,
      },
      areaStyle: {
        color: colors[i % colors.length],
        opacity: 0.12,
      },
      symbol: "none",
    }))

    chart.setOption({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        textStyle: { color: isDark ? "#f1f5f9" : "#0f172a", fontSize: 12 },
        formatter: (params: { name: string; value: number[] }) => {
          const lines = params.value.map((v, i) => `${HOUR_LABELS[i]}: ${v}`)
          return `<b>${params.name}</b><br/>${lines.join("<br/>")}`
        },
      },
      legend: {
        bottom: 0,
        textStyle: {
          color: isDark ? "#94a3b8" : "#64748b",
          fontSize: 11,
        },
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
      },
      radar: {
        indicator: indicators,
        splitNumber: 3,
        axisName: {
          color: isDark ? "#64748b" : "#94a3b8",
          fontSize: 9,
          padding: [0, 2],
        },
        splitLine: {
          lineStyle: { color: isDark ? "#1e293b" : "#f1f5f9" },
        },
        splitArea: {
          areaStyle: {
            color: isDark
              ? ["#0f172a", "#111827"]
              : ["#f8fafc", "#f1f5f9"],
          },
        },
        axisLine: {
          lineStyle: { color: isDark ? "#1e293b" : "#e2e8f0" },
        },
      },
      series,
    })
  }, [participants, ready, chartRef])

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full", className)}
      aria-label="Circadian rhythm chart"
    />
  )
}
