/**
 * Peak-style stacked bar chart — you vs contact message volume over time.
 * Mirrors the EChartsPeakBarChart layout (best-period headline + stacked bars).
 */
import { useEffect, useMemo, useState, type ReactNode } from "react"
import * as echarts from "echarts/core"
import { BarChart } from "echarts/charts"
import {
  GridComponent,
  TooltipComponent,
} from "echarts/components"
import { CanvasRenderer } from "echarts/renderers"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { fmt } from "@/components/wrap/chart-theme"
import { useSizedEcharts } from "@/components/wrap/charts/use-sized-echarts"
import type { ActivityTimeSeries } from "@/platform/analytics-types"
import { cn } from "@/lib/utils"

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const YOU_COLOR = { light: "#7c3aed", dark: "#a78bfa" }
const THEM_COLOR = { light: "#0891b2", dark: "#22d3ee" }

type Mode = "yearly" | "monthly"

type BarRow = {
  period: string
  label: string
  you: number
  them: number
}

type ContactVolumeBarChartProps = {
  series: ActivityTimeSeries
  /** Display name for "you" (account owner). */
  youLabel?: string
  /** Display name for the contact. */
  themLabel?: string
  exportName?: string
  /** Your total sent in this chat. */
  youSent: number
  /** Their total sent (= your received) in this chat. */
  themSent: number
  totalMessages: number
}

export function ContactVolumeBarChart({
  series,
  youLabel = "You",
  themLabel = "Them",
  exportName = "contact-volume-bars",
  youSent,
  themSent,
  totalMessages,
}: ContactVolumeBarChartProps) {
  const [mode, setMode] = useState<Mode>("yearly")
  const { containerRef, chartRef, ready } = useSizedEcharts()

  const rows: BarRow[] = useMemo(() => {
    if (mode === "yearly") {
      const points =
        series.yearly.length > 0
          ? series.yearly
          : aggregateYearsFromMonthly(series.monthly)
      return points.map((p) => ({
        period: p.period,
        label: p.period.slice(0, 4),
        you: p.sent,
        them: p.received,
      }))
    }
    return series.monthly.map((p) => ({
      period: p.period,
      label: formatYearMonth(p.period),
      you: p.sent,
      them: p.received,
    }))
  }, [mode, series])

  const peak = useMemo(() => {
    if (rows.length === 0) return null
    return rows.reduce((best, row) =>
      row.you + row.them > best.you + best.them ? row : best
    )
  }, [rows])
  const peakTotal = peak ? peak.you + peak.them : 0

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !ready || rows.length === 0) return

    const isDark = document.documentElement.classList.contains("dark")
    const youColor = isDark ? YOU_COLOR.dark : YOU_COLOR.light
    const themColor = isDark ? THEM_COLOR.dark : THEM_COLOR.light
    const peakIndex = peak
      ? rows.findIndex((r) => r.period === peak.period)
      : -1

    chart.setOption(
      {
        backgroundColor: "transparent",
        grid: {
          left: 8,
          right: 8,
          top: 12,
          bottom: 28,
          containLabel: true,
        },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          borderColor: isDark ? "#334155" : "#e2e8f0",
          textStyle: { color: isDark ? "#f1f5f9" : "#0f172a", fontSize: 12 },
        },
        xAxis: {
          type: "category",
          data: rows.map((r) => r.label),
          axisTick: { show: false },
          axisLine: { show: false },
          axisLabel: {
            color: isDark ? "#94a3b8" : "#64748b",
            fontSize: 10,
            interval: rows.length > 18 ? "auto" : 0,
          },
        },
        yAxis: {
          type: "value",
          show: false,
          splitLine: { show: false },
        },
        series: [
          {
            name: themLabel,
            type: "bar",
            stack: "total",
            data: rows.map((r, i) => ({
              value: r.them,
              itemStyle: {
                color: themColor,
                opacity: peakIndex >= 0 && i !== peakIndex ? 0.45 : 1,
                borderRadius: r.you === 0 ? [6, 6, 0, 0] : 0,
              },
            })),
            barMaxWidth: 28,
          },
          {
            name: youLabel,
            type: "bar",
            stack: "total",
            data: rows.map((r, i) => ({
              value: r.you,
              itemStyle: {
                color: youColor,
                opacity: peakIndex >= 0 && i !== peakIndex ? 0.45 : 1,
                borderRadius: [6, 6, 0, 0],
              },
            })),
            barMaxWidth: 28,
          },
        ],
      },
      { notMerge: true }
    )
  }, [rows, ready, chartRef, peak, youLabel, themLabel])

  if (series.yearly.length === 0 && series.monthly.length === 0) return null

  return (
    <WrapChartCard
      title="You vs contact volume"
      description="Stacked messages over time — peak period highlighted"
      exportName={exportName}
      exportLines={[
        `${youLabel} sent ${fmt(youSent)}`,
        `${themLabel} sent ${fmt(themSent)}`,
        `Total ${fmt(totalMessages)}`,
        peak ? `Peak ${peak.label}: ${fmt(peakTotal)}` : "",
      ].filter(Boolean)}
      chartClassName="h-80 sm:h-[22rem]"
    >
      <div className="flex h-full w-full flex-col p-4 pt-2">
        {/* Summary: sent / received / total for both sides */}
        <div className="mb-3 grid grid-cols-3 gap-2">
          <SummaryCell
            label="Sent"
            you={youSent}
            them={themSent}
            youLabel={youLabel}
            themLabel={themLabel}
          />
          <SummaryCell
            label="Received"
            you={themSent}
            them={youSent}
            youLabel={youLabel}
            themLabel={themLabel}
          />
          <SummaryCell
            label="Total"
            you={totalMessages}
            them={totalMessages}
            youLabel={youLabel}
            themLabel={themLabel}
            single
          />
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {mode === "yearly" ? "Best year" : "Best month"}
            </span>
            {peak ? (
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                  {fmt(peakTotal)}
                </span>
                <span className="text-sm text-muted-foreground">
                  messages in {peak.label}
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
              <ModeButton active={mode === "yearly"} onClick={() => setMode("yearly")}>
                Yearly
              </ModeButton>
              <ModeButton active={mode === "monthly"} onClick={() => setMode("monthly")}>
                Monthly
              </ModeButton>
            </div>
            <div className="flex flex-col items-end gap-1.5" data-export-legend>
              <LegendSwatch
                label={youLabel}
                swatch="bg-[#7c3aed] dark:bg-[#a78bfa]"
              />
              <LegendSwatch
                label={themLabel}
                swatch="bg-[#0891b2] dark:bg-[#22d3ee]"
              />
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            No messages in this range.
          </p>
        ) : (
          <div ref={containerRef} className="mt-3 min-h-0 w-full flex-1" />
        )}
      </div>
    </WrapChartCard>
  )
}

function SummaryCell({
  label,
  you,
  them,
  youLabel,
  themLabel,
  single,
}: {
  label: string
  you: number
  them: number
  youLabel: string
  themLabel: string
  single?: boolean
}) {
  return (
    <div className="rounded-lg bg-muted/50 px-2.5 py-2 ring-1 ring-border/50">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      {single ? (
        <p className="font-heading mt-1 text-lg font-semibold tabular-nums">
          {fmt(you)}
        </p>
      ) : (
        <div className="mt-1 space-y-0.5 text-xs">
          <p className="truncate tabular-nums">
            <span className="text-muted-foreground">{youLabel}: </span>
            <span className="font-medium">{fmt(you)}</span>
          </p>
          <p className="truncate tabular-nums">
            <span className="text-muted-foreground">{themLabel}: </span>
            <span className="font-medium">{fmt(them)}</span>
          </p>
        </div>
      )}
    </div>
  )
}

function LegendSwatch({ label, swatch }: { label: string; swatch: string }) {
  return (
    <span className="flex items-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
      <span className={cn("size-2.5 shrink-0 rounded-[3px]", swatch)} />
      <span className="max-w-28 truncate">{label}</span>
    </span>
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
        "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

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
