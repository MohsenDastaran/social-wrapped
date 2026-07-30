/**
 * 24-hour activity clock — message volume by hour on a polar ring.
 * Midnight at top; hours increase clockwise (like a real clock).
 */
import { useEffect } from "react"
import * as echarts from "echarts/core"
import { LineChart } from "echarts/charts"
import {
  GraphicComponent,
  LegendComponent,
  PolarComponent,
  TooltipComponent,
} from "echarts/components"
import { CanvasRenderer } from "echarts/renderers"
import { cn } from "@/lib/utils"
import { useSizedEcharts } from "@/components/wrap/charts/use-sized-echarts"

echarts.use([
  LineChart,
  PolarComponent,
  TooltipComponent,
  LegendComponent,
  GraphicComponent,
  CanvasRenderer,
])

const AXIS_LABELS = [
  "12am",
  "",
  "",
  "3am",
  "",
  "",
  "6am",
  "",
  "",
  "9am",
  "",
  "",
  "12pm",
  "",
  "",
  "3pm",
  "",
  "",
  "6pm",
  "",
  "",
  "9pm",
  "",
  "",
]

const HOUR_FULL = [
  "12am",
  "1am",
  "2am",
  "3am",
  "4am",
  "5am",
  "6am",
  "7am",
  "8am",
  "9am",
  "10am",
  "11am",
  "12pm",
  "1pm",
  "2pm",
  "3pm",
  "4pm",
  "5pm",
  "6pm",
  "7pm",
  "8pm",
  "9pm",
  "10pm",
  "11pm",
]

const SERIES_COLORS_LIGHT = ["#0d9488", "#d97706", "#7c3aed", "#be185d"]
const SERIES_COLORS_DARK = ["#2dd4bf", "#fbbf24", "#a78bfa", "#f472b6"]

export type CircadianSeries = {
  name: string
  hourly: number[]
}

type CircadianPolarChartProps = {
  series: CircadianSeries[]
  /** Hide legend for a single aggregate series. @default series.length > 1 */
  showLegend?: boolean
  className?: string
}

export function CircadianPolarChart({
  series,
  showLegend,
  className,
}: CircadianPolarChartProps) {
  const { containerRef, chartRef, ready } = useSizedEcharts()
  const legendVisible = showLegend ?? series.length > 1

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !ready || series.length === 0) return

    const isDark = document.documentElement.classList.contains("dark")
    const colors = isDark ? SERIES_COLORS_DARK : SERIES_COLORS_LIGHT
    const muted = isDark ? "#64748b" : "#94a3b8"
    const gridLine = isDark ? "#334155" : "#e2e8f0"
    const maxVal = Math.max(...series.flatMap((s) => s.hourly), 1)

    const chartSeries = series.map((s, i) => {
      const color = colors[i % colors.length]!
      return {
        name: s.name,
        type: "line" as const,
        coordinateSystem: "polar" as const,
        data: padHourly(s.hourly),
        smooth: 0.35,
        symbol: "circle",
        symbolSize: 5,
        showSymbol: false,
        lineStyle: { color, width: 2.5 },
        areaStyle: { color, opacity: 0.18 },
        emphasis: {
          focus: "series" as const,
          scale: true,
          itemStyle: { color, borderWidth: 2, borderColor: "#fff" },
          areaStyle: { opacity: 0.32 },
        },
      }
    })

    chart.setOption(
      {
        backgroundColor: "transparent",
        animationDuration: 450,
        legend: legendVisible
          ? {
              bottom: 2,
              left: "center",
              icon: "circle",
              itemWidth: 8,
              itemHeight: 8,
              itemGap: 14,
              textStyle: { color: muted, fontSize: 11 },
            }
          : { show: false },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "line" },
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          borderColor: isDark ? "#334155" : "#e2e8f0",
          textStyle: {
            color: isDark ? "#f1f5f9" : "#0f172a",
            fontSize: 12,
          },
          formatter: (params: unknown) => {
            const items = (Array.isArray(params) ? params : [params]) as Array<{
              seriesName?: string
              dataIndex?: number
              value?: number
              marker?: string
            }>
            const hour = items[0]?.dataIndex ?? 0
            const head = `<div style="margin-bottom:4px;font-weight:600">${HOUR_FULL[hour] ?? ""}</div>`
            const rows = items
              .map((p) => {
                const label =
                  legendVisible || items.length > 1
                    ? `${p.marker ?? ""} ${p.seriesName ?? ""}: `
                    : `${p.marker ?? ""} `
                return `${label}<b>${p.value ?? 0}</b> messages`
              })
              .join("<br/>")
            return head + rows
          },
        },
        polar: {
          radius: legendVisible ? ["24%", "68%"] : ["20%", "72%"],
          center: legendVisible ? ["50%", "46%"] : ["50%", "50%"],
        },
        angleAxis: {
          type: "category",
          data: AXIS_LABELS,
          startAngle: 90,
          clockwise: true,
          boundaryGap: false,
          axisLine: {
            show: true,
            lineStyle: { color: gridLine, width: 1.5 },
          },
          axisTick: { show: false },
          splitLine: {
            show: true,
            lineStyle: { color: gridLine, width: 1, opacity: 0.85 },
          },
          axisLabel: {
            color: muted,
            fontSize: 10,
            fontWeight: 600,
            margin: 12,
            interval: 0,
            hideOverlap: false,
          },
        },
        radiusAxis: {
          type: "value",
          min: 0,
          max: maxVal,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          splitNumber: 3,
          splitLine: {
            lineStyle: {
              color: gridLine,
              type: "dashed",
              width: 1,
              opacity: 0.7,
            },
          },
        },
        series: chartSeries,
        graphic: [
          {
            type: "group",
            left: "center",
            top: legendVisible ? "42%" : "46%",
            bounding: "raw",
            z: 100,
            silent: true,
          },
        ],
      },
      true
    )
  }, [series, legendVisible, ready, chartRef])

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full", className)}
      aria-label="Activity by hour — 24-hour clock"
    />
  )
}

function padHourly(hourly: number[]): number[] {
  return Array.from({ length: 24 }, (_, i) => hourly[i] ?? 0)
}

export function formatCircadianHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24
  return HOUR_FULL[h] ?? `${h}:00`
}

/** Peak hour label from a 24-length hourly array. */
export function peakHourLabel(hourly: number[]): string {
  let best = 0
  let bestCount = -1
  for (let i = 0; i < 24; i++) {
    const n = hourly[i] ?? 0
    if (n > bestCount) {
      bestCount = n
      best = i
    }
  }
  return formatCircadianHour(best)
}
