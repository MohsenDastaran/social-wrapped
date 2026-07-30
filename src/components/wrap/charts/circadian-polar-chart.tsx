/**
 * 24-hour circadian “clock” — activity by hour on a polar ring.
 * Midnight at top; hours increase clockwise (like a real clock).
 */
import { useEffect } from "react"
import * as echarts from "echarts/core"
import { LineChart } from "echarts/charts"
import {
  LegendComponent,
  PolarComponent,
  TooltipComponent,
} from "echarts/components"
import { CanvasRenderer } from "echarts/renderers"
import type { CircadianParticipant } from "@/platform/analytics-types"
import { cn } from "@/lib/utils"
import { useSizedEcharts } from "@/components/wrap/charts/use-sized-echarts"

echarts.use([
  LineChart,
  PolarComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
])

/**
 * Axis labels: major hours named; minor hours blank so the dial stays readable.
 * Data index always matches hour 0..23.
 */
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

const PARTICIPANT_COLORS_LIGHT = ["#0d9488", "#d97706", "#7c3aed", "#be185d"]
const PARTICIPANT_COLORS_DARK = ["#2dd4bf", "#fbbf24", "#a78bfa", "#f472b6"]

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
    const muted = isDark ? "#64748b" : "#94a3b8"
    const gridLine = isDark ? "#334155" : "#e2e8f0"
    const maxVal = Math.max(...participants.flatMap((p) => p.hourly), 1)

    const series = participants.map((p, i) => {
      const color = colors[i % colors.length]!
      return {
        name: p.name,
        type: "line" as const,
        coordinateSystem: "polar" as const,
        data: padHourly(p.hourly),
        smooth: 0.35,
        symbol: "circle",
        symbolSize: 5,
        showSymbol: false,
        lineStyle: { color, width: 2.5 },
        areaStyle: { color, opacity: 0.16 },
        emphasis: {
          focus: "series" as const,
          scale: true,
          itemStyle: { color, borderWidth: 2, borderColor: "#fff" },
          areaStyle: { opacity: 0.3 },
        },
      }
    })

    chart.setOption(
      {
        backgroundColor: "transparent",
        animationDuration: 450,
        legend: {
          bottom: 2,
          left: "center",
          icon: "circle",
          itemWidth: 8,
          itemHeight: 8,
          itemGap: 14,
          textStyle: { color: muted, fontSize: 11 },
        },
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
              .map(
                (p) =>
                  `${p.marker ?? ""} ${p.seriesName ?? ""}: <b>${p.value ?? 0}</b>`
              )
              .join("<br/>")
            return head + rows
          },
        },
        polar: {
          radius: ["24%", "70%"],
          center: ["50%", "46%"],
        },
        angleAxis: {
          type: "category",
          data: AXIS_LABELS,
          // Midnight at top; hours run clockwise like a clock face.
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
        series,
        graphic: [
          {
            type: "group",
            left: "center",
            top: "42%",
            bounding: "raw",
            z: 100,
            silent: true,
            children: [
              {
                type: "circle",
                shape: { cx: 0, cy: 0, r: 22 },
                style: {
                  fill: isDark
                    ? "rgba(15, 23, 42, 0.92)"
                    : "rgba(255, 255, 255, 0.92)",
                  stroke: gridLine,
                  lineWidth: 1,
                },
              },
              {
                type: "text",
                style: {
                  text: "24h",
                  x: 0,
                  y: 0,
                  align: "center",
                  verticalAlign: "middle",
                  fill: muted,
                  fontSize: 11,
                  fontWeight: 700,
                },
              },
            ],
          },
        ],
      },
      true
    )
  }, [participants, ready, chartRef])

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full", className)}
      aria-label="Circadian rhythm — 24-hour activity clock"
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
