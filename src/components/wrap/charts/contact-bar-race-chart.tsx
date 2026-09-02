/**
 * Animated bar race of top contacts by cumulative messages.
 * One ECharts instance; frames are precomputed; playback pauses off-screen.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import * as echarts from "echarts/core"
import { BarChart } from "echarts/charts"
import {
  GraphicComponent,
  GridComponent,
  TooltipComponent,
} from "echarts/components"
import { CanvasRenderer } from "echarts/renderers"
import { Download, Pause, Play, RotateCcw, X } from "lucide-react"
import { useReducedMotion } from "motion/react"

import { AppLoader } from "@/components/app-loader"
import { Button } from "@/components/ui/button"
import { chatDisplay } from "@/components/wrap/chat-display"
import { fmt, PALETTES } from "@/components/wrap/chart-theme"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { useSizedEcharts } from "@/components/wrap/charts/use-sized-echarts"
import type { ChatResult } from "@/platform/analytics-types"
import {
  buildChartCss,
  flattenColor,
  getColorsCount,
  resolveColors,
  seriesPaint,
  withAlpha,
  type ChartConfig,
} from "@/components/evilcharts/ui/echarts-chart"
import {
  tooltipBaseOption,
  tooltipIndicatorHtml,
  tooltipRow,
  tooltipShell,
} from "@/components/evilcharts/ui/echarts-tooltip"
import {
  raceExportFps,
  raceExportSize,
  renderRaceMp4,
} from "@/lib/render-race-video"
import { saveBlob } from "@/lib/save-blob"

echarts.use([
  BarChart,
  GridComponent,
  TooltipComponent,
  GraphicComponent,
  CanvasRenderer,
])

const RACERS = 20
/** Same interval as the ECharts bar-race demo — duration must equal the tick. */
const UPDATE_FREQUENCY = 400
const AXIS_REORDER_MS = 300

type Racer = {
  id: number
  name: string
}

type RaceFrame = {
  label: string
  values: number[]
}

type RaceModel = {
  racers: Racer[]
  frames: RaceFrame[]
  tickMs: number
}

type ContactBarRaceChartProps = {
  chats: ChatResult[]
  title?: string
  itemNoun?: string
}

export function ContactBarRaceChart({
  chats,
  title = "Contact race",
  itemNoun = "messages",
}: ContactBarRaceChartProps) {
  const race = useMemo(() => buildRace(chats), [chats])
  if (!race || race.frames.length < 2 || race.racers.length < 2) return null
  return <RaceCard race={race} title={title} itemNoun={itemNoun} />
}

function RaceCard({
  race,
  title,
  itemNoun,
}: {
  race: RaceModel
  title: string
  itemNoun: string
}) {
  const reduceMotion = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const onCanvas = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node
  }, [])
  const [inView, setInView] = useState(false)
  const [frameIndex, setFrameIndex] = useState(0)
  const [playing, setPlaying] = useState(() => !reduceMotion)
  const [exporting, setExporting] = useState(false)
  const [exportPhase, setExportPhase] = useState<"record" | "encode">("record")
  const [exportProgress, setExportProgress] = useState(0)
  const [exportError, setExportError] = useState<string | null>(null)
  const atEnd = frameIndex >= race.frames.length - 1
  const frame = race.frames[frameIndex] ?? race.frames[0]!
  const paused = !playing && !exporting

  useEffect(() => {
    if (reduceMotion) {
      setPlaying(false)
      setFrameIndex(race.frames.length - 1)
      return
    }
    setPlaying(true)
    setFrameIndex(0)
  }, [race, reduceMotion])

  useEffect(() => {
    if (!playing || atEnd) return
    if (reduceMotion && !exporting) return
    if (!inView && !exporting) return
    const id = window.setTimeout(() => {
      setFrameIndex((i) => Math.min(i + 1, race.frames.length - 1))
    }, race.tickMs)
    return () => window.clearTimeout(id)
  }, [
    playing,
    inView,
    reduceMotion,
    atEnd,
    frameIndex,
    race.frames.length,
    race.tickMs,
    exporting,
  ])

  useEffect(() => {
    if (atEnd && playing && !exporting) setPlaying(false)
  }, [atEnd, playing, exporting])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const cancelExport = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setExporting(false)
    setExportProgress(0)
    setExportError(null)
    setPlaying(false)
  }

  const exportMp4 = async () => {
    const canvas = canvasRef.current
    if (!canvas || canvas.width < 2 || canvas.height < 2) {
      setExportError("Chart canvas is not ready yet.")
      setExporting(true)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setExportError(null)
    setExportPhase("record")
    setExportProgress(0.02)
    setExporting(true)
    setPlaying(false)
    setFrameIndex(0)

    const resumeIndex = frameIndex
    const fill = opaqueBackground(canvas)

    try {
      await nextPaint()
      await nextPaint()
      await new Promise((resolve) => window.setTimeout(resolve, 80))
      if (controller.signal.aborted) return

      const liveCanvas = canvasRef.current ?? canvas
      setPlaying(true)
      const frames = await recordRaceFrames({
        canvas: liveCanvas,
        fill,
        durationMs: Math.max(race.tickMs, (race.frames.length - 1) * race.tickMs + 240),
        signal: controller.signal,
        onProgress: (p) => setExportProgress(p * 0.5),
      })
      setPlaying(false)
      setFrameIndex(race.frames.length - 1)
      if (controller.signal.aborted) return
      if (frames.length < 2) {
        throw new Error("Could not capture the race animation")
      }

      setExportPhase("encode")
      setExportProgress(0.5)
      const size = raceExportSize(canvas.width, canvas.height)
      const blob = await renderRaceMp4({
        frames,
        width: size.width,
        height: size.height,
        signal: controller.signal,
        onProgress: (p) => setExportProgress(0.5 + p * 0.5),
      })
      if (controller.signal.aborted) return

      const result = await saveBlob(blob, "contact-bar-race.mp4")
      if (!result.ok && !result.cancelled) {
        throw new Error(result.error)
      }
      setExporting(false)
      setExportProgress(0)
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        setExporting(false)
        setExportProgress(0)
        setFrameIndex(resumeIndex)
        setPlaying(false)
        return
      }
      console.error("[contact-race] MP4 export failed", error)
      setExportError(
        error instanceof Error ? error.message : "Video export failed"
      )
      setPlaying(false)
      setFrameIndex(resumeIndex)
    }
  }

  return (
    <div className="relative">
      <WrapChartCard
        title={title}
        description={`Cumulative ${itemNoun} by month · top ${fmt(race.racers.length)}`}
        exportName="contact-bar-race"
        exportSize="wide"
        hideExport
        headerExtra={
          <div className="flex items-center gap-1.5" data-export-ignore>
            <p className="hidden text-[0.65rem] text-muted-foreground tabular-nums sm:block">
              {frame.label}
            </p>
            {atEnd ? null : (
              <Button
                type="button"
                variant="outline"
                size="xs"
                aria-label={playing ? "Pause race" : "Continue race"}
                disabled={exporting}
                onClick={() => setPlaying((p) => !p)}
              >
                {playing ? (
                  <Pause data-icon="inline-start" />
                ) : (
                  <Play data-icon="inline-start" />
                )}
                {playing ? "Pause" : "Continue"}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="xs"
              aria-label={`Replay ${title.toLowerCase()} from the start`}
              disabled={exporting}
              onClick={() => {
                setFrameIndex(0)
                setPlaying(true)
              }}
            >
              <RotateCcw data-icon="inline-start" />
              Replay
            </Button>
            {paused ? (
              <Button
                type="button"
                variant="outline"
                size="xs"
                aria-label={`Export ${title.toLowerCase()} as MP4`}
                onClick={() => void exportMp4()}
              >
                <Download data-icon="inline-start" />
                Export MP4
              </Button>
            ) : null}
          </div>
        }
        chartClassName="h-[32rem] sm:h-[40rem]"
      >
        <RacePlot
          race={race}
          frameIndex={frameIndex}
          reduceMotion={Boolean(reduceMotion) && !exporting}
          onInViewChange={setInView}
          onCanvas={onCanvas}
        />
      </WrapChartCard>
      {exporting || exportError ? (
        <RaceExportOverlay
          phase={exportPhase}
          progress={exportProgress}
          error={exportError}
          onCancel={cancelExport}
          onRetry={() => {
            setExportError(null)
            void exportMp4()
          }}
        />
      ) : null}
    </div>
  )
}

/** Direct child of WrapChartCard — mounts only after the host has size. */
function RacePlot({
  race,
  frameIndex,
  reduceMotion,
  onInViewChange,
  onCanvas,
}: {
  race: RaceModel
  frameIndex: number
  reduceMotion: boolean
  onInViewChange: (inView: boolean) => void
  onCanvas: (canvas: HTMLCanvasElement | null) => void
}) {
  const { containerRef, chartRef, ready } = useSizedEcharts()
  const shellRef = useRef<HTMLDivElement>(null)
  const chartId = useId().replace(/:/g, "")
  const [themeEpoch, setThemeEpoch] = useState(0)

  const config = useMemo(() => {
    const next: ChartConfig = {}
    for (const [index, racer] of race.racers.entries()) {
      const pal = PALETTES[index % PALETTES.length]
      next[racerKey(racer.id)] = {
        label: racer.name,
        colors: { light: [...pal.light], dark: [...pal.dark] },
      }
    }
    return next
  }, [race.racers])

  const seriesKeys = useMemo(
    () => race.racers.map((racer) => racerKey(racer.id)),
    [race.racers]
  )
  const css = useMemo(() => buildChartCss(chartId, config), [chartId, config])
  const bootedRef = useRef(false)

  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => {
      setThemeEpoch((n) => n + 1)
    })
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = shellRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => onInViewChange(Boolean(entry?.isIntersecting)),
      { threshold: 0.2 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [onInViewChange])

  useEffect(() => {
    bootedRef.current = false
  }, [race, themeEpoch, ready, reduceMotion])

  useEffect(() => {
    const chart = chartRef.current
    const shell = shellRef.current
    if (!chart || !ready || !shell) return

    const resolved = resolveColors(shell, config, seriesKeys)
    const { tokens } = resolved
    const axisLabelColor = tokens.mutedForeground
    const splitLineColor = withAlpha(tokens.border, 1)
    const tickDotColor = flattenColor(splitLineColor, tokens.background)
    const watermark = withAlpha(tokens.mutedForeground, 0.22)
    const frame = race.frames[frameIndex] ?? race.frames[0]!
    const barMax = Math.min(RACERS, race.racers.length) - 1
    const tickMs = reduceMotion ? 0 : race.tickMs
    const reorderMs = reduceMotion ? 0 : AXIS_REORDER_MS

    const data = race.racers.map((racer, i) => {
      const key = racerKey(racer.id)
      const slots = resolved.series[key] ?? ["rgba(120, 120, 120, 1)"]
      return {
        name: racer.name,
        value: frame.values[i] ?? 0,
        itemStyle: {
          color: seriesPaint(slots),
          borderRadius: [0, 2, 2, 0],
        },
      }
    })
    const valueData = data.map((row) => ({
      ...row,
      itemStyle: { color: "transparent", borderRadius: 0 },
    }))
    const periodMark = periodWatermark(frame.label, watermark)

    if (bootedRef.current) {
      chart.setOption({
        series: [
          { id: "contact-race", data },
          { id: "contact-race-values", data: valueData },
        ],
        graphic: { elements: [periodMark] },
      })
      return
    }

    chart.setOption(
      {
        backgroundColor: "transparent",
        animationDuration: 0,
        animationDurationUpdate: tickMs,
        animationEasing: "linear",
        animationEasingUpdate: "linear",
        grid: {
          left: 8,
          right: 52,
          top: 16,
          bottom: 8,
        },
        xAxis: {
          type: "value",
          max: "dataMax",
          axisLabel: {
            color: axisLabelColor,
            fontSize: 10,
            margin: 8,
            formatter: (n: number) => fmt(n),
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: splitLineColor,
              type: [3, 3],
              width: 1,
            },
          },
          axisLine: { show: false },
          axisTick: {
            show: true,
            length: 0.5,
            lineStyle: { color: tickDotColor, width: 3, cap: "round" },
          },
        },
        yAxis: {
          type: "category",
          inverse: true,
          max: barMax,
          animationDuration: reorderMs,
          animationDurationUpdate: reorderMs,
          animationEasing: "linear",
          animationEasingUpdate: "linear",
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
        },
        tooltip: {
          ...tooltipBaseOption({
            present: true,
            cursor: false,
            tokens,
            position: "variable",
            axisPointerColor: tokens.border,
            strokeWidth: 1,
          }),
          trigger: "item",
          axisPointer: {
            type: "shadow",
            shadowStyle: { color: withAlpha(tokens.foreground, 0.06) },
          },
          formatter: (params: unknown) => {
            const row = (Array.isArray(params) ? params[0] : params) as
              { name?: string; value?: number; dataIndex?: number } | undefined
            if (!row?.name) return ""
            const racer = race.racers[row.dataIndex ?? 0]
            const key = racer ? racerKey(racer.id) : seriesKeys[0]!
            const count = getColorsCount(config[key] ?? {})
            return tooltipShell({
              label: frame.label,
              body: tooltipRow({
                indicatorHtml: tooltipIndicatorHtml(key, count),
                labelText: escapeHtml(row.name),
                valueText: fmt(row.value ?? 0),
                dimmed: "",
              }),
              roundness: "lg",
              variant: "default",
            })
          },
        },
        graphic: { elements: [periodMark] },
        series: [
          {
            id: "contact-race",
            type: "bar",
            realtimeSort: true,
            data,
            barMaxWidth: 26,
            label: {
              show: true,
              position: "insideLeft",
              distance: 8,
              valueAnimation: false,
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              textBorderColor: "rgba(0,0,0,0.45)",
              textBorderWidth: 2,
              overflow: "truncate",
              ellipsis: "…",
              formatter: (p: { name?: string }) => p.name ?? "",
            },
          },
          {
            id: "contact-race-values",
            type: "bar",
            realtimeSort: true,
            silent: true,
            barGap: "-100%",
            barMaxWidth: 26,
            data: valueData,
            label: {
              show: true,
              position: "right",
              valueAnimation: !reduceMotion,
              precision: 0,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 11,
              color: axisLabelColor,
              formatter: (p: { value?: number }) => fmt(p.value ?? 0),
            },
            tooltip: { show: false },
          },
        ],
      },
      { replaceMerge: ["series"] }
    )
    bootedRef.current = true
  }, [
    chartRef,
    ready,
    race,
    frameIndex,
    themeEpoch,
    reduceMotion,
    config,
    seriesKeys,
  ])

  useEffect(() => {
    const el = containerRef.current
    onCanvas(el?.querySelector("canvas") ?? null)
  }, [containerRef, ready, onCanvas])

  return (
    <div
      ref={shellRef}
      data-chart={chartId}
      className="relative h-full min-h-0 w-full text-xs"
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div ref={containerRef} className="absolute inset-0 min-h-0" />
    </div>
  )
}

function RaceExportOverlay({
  phase,
  progress,
  error,
  onCancel,
  onRetry,
}: {
  phase: "record" | "encode"
  progress: number
  error: string | null
  onCancel: () => void
  onRetry: () => void
}) {
  const progressPct = Math.round(Math.max(progress, 0) * 100)
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-[#041512]/95 px-6 backdrop-blur-sm"
      role="status"
      aria-label={error ? "Export failed" : "Exporting video"}
      aria-busy={!error}
    >
      <button
        type="button"
        onClick={onCancel}
        className="absolute top-3 end-3 flex size-8 items-center justify-center rounded-full bg-white text-black shadow-lg ring-2 ring-white/80"
        aria-label="Cancel export"
      >
        <X className="size-4" strokeWidth={2.5} />
      </button>

      <div className="flex w-full max-w-xs flex-col items-center gap-4 text-center text-white">
        {error ? (
          <>
            <p className="font-heading text-lg font-semibold tracking-tight">
              Export failed
            </p>
            <p className="text-sm text-white/70">{error}</p>
            <div className="flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={onRetry}
                className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-white/15"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <AppLoader
              size="md"
              fullscreen={false}
              label={
                phase === "record" ? "Recording race" : "Rendering video"
              }
            />
            <div>
              <p className="font-heading text-lg font-semibold tracking-tight">
                {phase === "record"
                  ? "Recording your race"
                  : "Rendering your video"}
              </p>
              <p className="mt-1 text-sm text-white/70">
                Keep this tab open — encoding runs in your browser.
              </p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-linear-to-r from-emerald-300 to-teal-400 transition-[width] duration-300"
                style={{ width: `${Math.max(progressPct, 4)}%` }}
              />
            </div>
            <p className="text-sm tabular-nums text-white/55">{progressPct}%</p>
          </>
        )}
      </div>
    </div>
  )
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

function opaqueBackground(canvas: HTMLCanvasElement): string {
  let el: HTMLElement | null = canvas
  while (el) {
    const bg = getComputedStyle(el).backgroundColor
    if (bg && bg !== "transparent" && !bg.endsWith(", 0)") && bg !== "rgba(0, 0, 0, 0)") {
      return bg
    }
    el = el.parentElement
  }
  return "#0c0a09"
}

async function recordRaceFrames(options: {
  canvas: HTMLCanvasElement
  fill: string
  durationMs: number
  signal: AbortSignal
  onProgress: (progress: number) => void
}): Promise<string[]> {
  const fps = raceExportFps()
  const size = raceExportSize(options.canvas.width, options.canvas.height)
  const offscreen = document.createElement("canvas")
  offscreen.width = size.width
  offscreen.height = size.height
  const ctx = offscreen.getContext("2d")
  if (!ctx) throw new Error("Canvas unsupported")

  const frames: string[] = []
  const interval = 1000 / fps
  const started = performance.now()
  let lastCapture = started - interval

  await new Promise<void>((resolve, reject) => {
    const tick = (now: number) => {
      if (options.signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"))
        return
      }
      if (now - lastCapture >= interval - 2) {
        ctx.fillStyle = options.fill
        ctx.fillRect(0, 0, size.width, size.height)
        ctx.drawImage(options.canvas, 0, 0, size.width, size.height)
        frames.push(offscreen.toDataURL("image/jpeg", 0.82))
        lastCapture = now
        options.onProgress(
          Math.min(1, (now - started) / Math.max(options.durationMs, 1))
        )
      }
      if (now - started >= options.durationMs) {
        resolve()
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  return frames
}

function racerKey(id: number): string {
  return `racer-${id}`
}

function buildRace(chats: ChatResult[]): RaceModel | null {
  const pool = chats
    .filter(
      (c) =>
        !c.isGroup && !c.isSavedMessages && (c.analytics.totalMessages ?? 0) > 0
    )
    .slice(0, RACERS)
  if (pool.length < 2) return null

  const usedNames = new Set<string>()
  const racers: Racer[] = pool.map((chat) => {
    const name = uniqueName(racerLabel(chat), usedNames)
    usedNames.add(name)
    return { id: chat.chatId, name }
  })

  const totals = pool.map((chat) => cumulativeByMonth(chat))
  const keys = [...new Set(totals.flatMap((map) => [...map.keys()]))]
    .filter((key) => key !== "0000")
    .sort()
  if (keys.length < 2) return null
  const periods = fillMonthRange(keys[0]!, keys[keys.length - 1]!)
  if (periods.length < 2) return null

  const frames: RaceFrame[] = []
  for (const period of periods) {
    const values = totals.map((map) => valueAtOrBefore(map, period))
    if (values.every((v) => v <= 0)) continue
    frames.push({
      label: formatMonthLabel(period),
      values,
    })
  }
  if (frames.length < 2) return null

  return { racers, frames, tickMs: UPDATE_FREQUENCY }
}

function racerLabel(chat: ChatResult): string {
  const d = chatDisplay(chat)
  if (d.isDeleted) return d.subtitle ? `${d.title} (${d.subtitle})` : d.title
  return d.title || `Chat ${chat.chatId}`
}

function uniqueName(base: string, used: Set<string>): string {
  if (!used.has(base)) return base
  let n = 2
  while (used.has(`${base} (${n})`)) n += 1
  return `${base} (${n})`
}

function periodWatermark(label: string, fill: string) {
  return {
    id: "race-period",
    type: "text" as const,
    right: 20,
    bottom: 12,
    style: {
      text: label,
      font: "600 44px ui-sans-serif, system-ui, sans-serif",
      fill,
    },
    silent: true,
    z: 100,
  }
}

function cumulativeByMonth(chat: ChatResult): Map<string, number> {
  const buckets = new Map<string, number>()
  const ts = chat.analytics.activityOverTime
  const source = ts?.monthly?.length
    ? ts.monthly
    : ts?.daily?.length
      ? ts.daily
      : (ts?.yearly ?? [])

  for (const point of source) {
    const key = monthKey(point.period)
    if (!key) continue
    buckets.set(
      key,
      (buckets.get(key) ?? 0) + (point.sent ?? 0) + (point.received ?? 0)
    )
  }

  if (buckets.size === 0 && (chat.analytics.totalMessages ?? 0) > 0) {
    buckets.set("0000", chat.analytics.totalMessages)
  }

  const keys = [...buckets.keys()].sort()
  const out = new Map<string, number>()
  let running = 0
  for (const key of keys) {
    running += buckets.get(key) ?? 0
    out.set(key, running)
  }
  return out
}

function monthKey(period: string): string {
  if (period.length >= 7) return period.slice(0, 7)
  if (period.length >= 4) return `${period.slice(0, 4)}-01`
  return ""
}

function fillMonthRange(start: string, end: string): string[] {
  const from = parseYearMonth(start)
  const to = parseYearMonth(end)
  if (!from || !to) return [start, end].filter(Boolean)
  const out: string[] = []
  let year = from.year
  let month = from.month
  while (year < to.year || (year === to.year && month <= to.month)) {
    out.push(`${year}-${String(month).padStart(2, "0")}`)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return out
}

function parseYearMonth(
  period: string
): { year: number; month: number } | null {
  if (period.length < 7) return null
  const year = Number(period.slice(0, 4))
  const month = Number(period.slice(5, 7))
  if (!year || month < 1 || month > 12) return null
  return { year, month }
}

function valueAtOrBefore(map: Map<string, number>, period: string): number {
  let best = 0
  for (const [key, value] of map) {
    if (key <= period && value > best) best = value
  }
  return best
}

function formatMonthLabel(period: string): string {
  if (period.length >= 7) {
    const year = Number(period.slice(0, 4))
    const month = Number(period.slice(5, 7))
    if (year && month >= 1 && month <= 12) {
      return new Date(year, month - 1, 1).toLocaleString(undefined, {
        month: "short",
        year: "numeric",
      })
    }
  }
  return period
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
