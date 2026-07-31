/**
 * Calendar heatmap — GitHub-style contribution graph for a selected year.
 * Fixed cell size (not stretched); horizontal scroll on narrow viewports.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import * as echarts from "echarts/core"
import { HeatmapChart } from "echarts/charts"
import {
  CalendarComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components"
import { CanvasRenderer } from "echarts/renderers"
import type { HeatmapDay } from "@/platform/analytics-types"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { fmt } from "@/components/wrap/chart-theme"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useSizedEcharts } from "@/components/wrap/charts/use-sized-echarts"

echarts.use([
  HeatmapChart,
  CalendarComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
])

/** Matches GitHub contribution squares (px). */
const CELL = 14
const CELL_GAP = 4
const CELL_RADIUS = 4
const DAY_LABEL_W = 30
const MONTH_LABEL_H = 22
const CHART_PAD_BOTTOM = 4
const WEEKS = 53

/** Level 0 (empty) is intentionally distinct from the card surface. */
const GITHUB_LIGHT = ["#d0d7de", "#9be9a8", "#40c463", "#30a14e", "#216e39"]
const GITHUB_DARK = ["#2d333b", "#0e4429", "#006d32", "#26a641", "#39d353"]

type CalendarHeatmapProps = {
  days: HeatmapDay[]
  title?: string
  description?: string
  exportName: string
  className?: string
}

export function CalendarHeatmap({
  days,
  title = "Activity heatmap",
  description,
  exportName,
  className,
}: CalendarHeatmapProps) {
  const years = useMemo(() => yearsFromDays(days), [days])
  const [year, setYear] = useState(() => years[0] ?? new Date().getFullYear())

  useEffect(() => {
    if (years.length === 0) return
    if (!years.includes(year)) setYear(years[0]!)
  }, [years, year])

  const yearDays = useMemo(() => daysInYear(days, year), [days, year])
  const total = yearDays.reduce((sum, [, n]) => sum + n, 0)
  const activeDays = yearDays.filter(([, n]) => n > 0).length
  const peak = Math.max(0, ...yearDays.map(([, n]) => n))

  const chartWidth = DAY_LABEL_W + WEEKS * (CELL + CELL_GAP) + 8
  const chartHeight = MONTH_LABEL_H + 7 * (CELL + CELL_GAP) + CHART_PAD_BOTTOM

  return (
    <WrapChartCard
      title={title}
      description={
        description ??
        `${fmt(total)} messages · ${fmt(activeDays)} active days in ${year}`
      }
      exportName={exportName}
      exportSize="wide"
      layout="flow"
      exportLines={[
        `Year ${year}`,
        `${fmt(activeDays)} active days`,
        `Peak ${fmt(peak)}`,
      ]}
      headerExtra={
        years.length > 0 ? (
          <YearSelect years={years} value={year} onChange={setYear} />
        ) : null
      }
      className={className}
      chartClassName="flex flex-col gap-2 pb-3 pt-1"
    >
      <HeatmapScroller>
        <HeatmapCanvas
          key={year}
          year={year}
          data={yearDays}
          width={chartWidth}
          height={chartHeight}
        />
      </HeatmapScroller>
      <HeatmapLegend />
    </WrapChartCard>
  )
}

function YearSelect({
  years,
  value,
  onChange,
}: {
  years: number[]
  value: number
  onChange: (year: number) => void
}) {
  return (
    <div data-export-ignore>
      <Select
        value={String(value)}
        onValueChange={(next) => {
          if (next != null) onChange(Number(next))
        }}
      >
        <SelectTrigger
          size="sm"
          aria-label="Select year"
          className="min-w-20 tabular-nums"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" alignItemWithTrigger={false}>
          <SelectGroup>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)} className="tabular-nums">
                {y}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

/** Horizontal scroll with edge fades + a thin scrollbar. */
function HeatmapScroller({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ left: false, right: false })

  const updateEdges = useCallback(() => {
    const el = ref.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setEdge({
      left: el.scrollLeft > 4,
      right: max > 4 && el.scrollLeft < max - 4,
    })
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    updateEdges()
    const ro = new ResizeObserver(updateEdges)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [updateEdges, children])

  return (
    <div className="relative">
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-linear-to-r from-card to-transparent transition-opacity duration-150",
          edge.left ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-linear-to-l from-card to-transparent transition-opacity duration-150",
          edge.right ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        ref={ref}
        onScroll={updateEdges}
        className={cn(
          "overflow-x-auto overscroll-x-contain px-3 pb-1 [-webkit-overflow-scrolling:touch]",
          "[&::-webkit-scrollbar]:h-1.5",
          "[&::-webkit-scrollbar-track]:bg-transparent",
          "[&::-webkit-scrollbar-thumb]:rounded-full",
          "[&::-webkit-scrollbar-thumb]:bg-foreground/20",
          "hover:[&::-webkit-scrollbar-thumb]:bg-foreground/35"
        )}
      >
        {children}
      </div>
    </div>
  )
}

function HeatmapLegend() {
  return (
    <div className="flex items-center justify-end gap-1.5 px-4 text-[10px] text-muted-foreground">
      <span>Less</span>
      <div className="flex items-center gap-0.75 dark:hidden">
        {GITHUB_LIGHT.map((c) => (
          <span
            key={c}
            className="size-3 rounded-[4px]"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="hidden items-center gap-0.75 dark:flex">
        {GITHUB_DARK.map((c) => (
          <span
            key={c}
            className="size-3 rounded-[4px]"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <span>More</span>
    </div>
  )
}

function HeatmapCanvas({
  year,
  data,
  width,
  height,
}: {
  year: number
  data: [string, number][]
  width: number
  height: number
}) {
  const { containerRef, chartRef, ready } = useSizedEcharts()
  const [themeEpoch, setThemeEpoch] = useState(0)

  // Light/dark flips change the <html> class with no React state — watch and rebuild.
  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => {
      setThemeEpoch((n) => n + 1)
    })
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    const el = containerRef.current
    if (!chart || !ready || !el) return

    const isDark = document.documentElement.classList.contains("dark")
    const colors = isDark ? GITHUB_DARK : GITHUB_LIGHT
    const muted = isDark ? "#8b949e" : "#656d76"
    const surface = resolveSurfaceColor(el, isDark ? "#1a2332" : "#ffffff")
    const maxCount = Math.max(...data.map(([, n]) => n), 1)
    const breaks = levelBreaks(maxCount)

    chart.setOption(
      {
        backgroundColor: "transparent",
        tooltip: {
          trigger: "item",
          formatter: (params: { value?: [string, number] }) => {
            const v = params.value
            if (!v) return ""
            const n = v[1] ?? 0
            return `${formatLongDate(v[0])}<br/><b>${n.toLocaleString()}</b> message${n === 1 ? "" : "s"}`
          },
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          borderColor: isDark ? "#334155" : "#e2e8f0",
          textStyle: { color: isDark ? "#f1f5f9" : "#0f172a", fontSize: 12 },
        },
        visualMap: {
          show: false,
          type: "piecewise",
          pieces: [
            { min: 0, max: 0, color: colors[0] },
            { min: 1, max: breaks[0], color: colors[1] },
            { min: breaks[0] + 1, max: breaks[1], color: colors[2] },
            { min: breaks[1] + 1, max: breaks[2], color: colors[3] },
            { min: breaks[2] + 1, color: colors[4] },
          ],
        },
        calendar: {
          top: MONTH_LABEL_H,
          left: DAY_LABEL_W,
          right: 2,
          bottom: CHART_PAD_BOTTOM,
          range: year,
          cellSize: [CELL, CELL],
          orient: "horizontal",
          splitLine: { show: false },
          itemStyle: {
            color: colors[0],
            borderWidth: CELL_GAP,
            borderColor: surface,
            borderRadius: CELL_RADIUS,
          },
          dayLabel: {
            firstDay: 0,
            nameMap: ["", "Mon", "", "Wed", "", "Fri", ""],
            color: muted,
            fontSize: 9,
            margin: 8,
          },
          monthLabel: {
            nameMap: "en",
            color: muted,
            fontSize: 10,
            margin: 4,
          },
          yearLabel: { show: false },
        },
        series: [
          {
            type: "heatmap",
            coordinateSystem: "calendar",
            data,
            itemStyle: {
              borderRadius: CELL_RADIUS,
              borderWidth: CELL_GAP,
              borderColor: surface,
            },
          },
        ],
      },
      true
    )

    chart.resize({ width, height })
  }, [year, data, ready, chartRef, containerRef, width, height, themeEpoch])

  return (
    <div
      ref={containerRef}
      style={{ width, height }}
      className="mx-auto shrink-0"
      aria-label={`Activity heatmap for ${year}`}
    />
  )
}

/** Newest year first. */
function yearsFromDays(days: HeatmapDay[]): number[] {
  const set = new Set<number>()
  for (const d of days) {
    const y = Number(d.date.slice(0, 4))
    if (Number.isFinite(y)) set.add(y)
  }
  return [...set].sort((a, b) => b - a)
}

/** Every day of `year` with counts (0 when missing) so empty cells match GitHub. */
function daysInYear(days: HeatmapDay[], year: number): [string, number][] {
  const map = new Map<string, number>()
  const prefix = `${year}-`
  for (const d of days) {
    if (d.date.startsWith(prefix)) map.set(d.date, d.count)
  }

  const out: [string, number][] = []
  const cursor = new Date(Date.UTC(year, 0, 1))
  const end = new Date(Date.UTC(year, 11, 31))
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10)
    out.push([key, map.get(key) ?? 0])
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return out
}

/** Quartile-ish breaks so sparse activity still uses multiple greens. */
function levelBreaks(max: number): [number, number, number] {
  if (max <= 4) return [1, 2, 3]
  const a = Math.max(1, Math.floor(max * 0.25))
  const b = Math.max(a + 1, Math.floor(max * 0.5))
  const c = Math.max(b + 1, Math.floor(max * 0.75))
  return [a, b, c]
}

function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

function resolveSurfaceColor(el: HTMLElement, fallback: string): string {
  let node: HTMLElement | null = el
  while (node) {
    const bg = getComputedStyle(node).backgroundColor
    if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") return bg
    node = node.parentElement
  }
  return fallback
}
