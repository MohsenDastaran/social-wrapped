import { fmt } from "@/components/wrap/chart-theme"
import { peakHourLabel } from "@/components/wrap/charts/circadian-polar-chart"
import {
  elementToPngBlob,
  type DomExportOptions,
} from "@/lib/dom-export"
import type { WrapAnalytics } from "@/platform/analytics-types"
import * as echarts from "echarts/core"

/** Instagram-story canvas size (9:16). */
const STORY_W = 1080
const STORY_H = 1920

/** Newest-first years included in the heatmap story slide. */
const MAX_HEATMAP_STORY_YEARS = 4

export type StoryKpi = {
  label: string
  value: string
}

export type WrapStorySpec = {
  id: string
  /** Matches `data-export-name` on a live `WrapChartCard`. */
  exportName: string
  heading: string
  subtext: string
  /** Optional metric chips (used on the first / overview slide). */
  kpis?: StoryKpi[]
}

export type ComposedWrapStory = WrapStorySpec & {
  /** Object URL of the composed 9:16 PNG (captions baked in). */
  image: string
}

export type StoryCaptureProgress = {
  /** 0-based index of the story currently being crafted. */
  index: number
  total: number
  /** Human label, e.g. card heading. */
  label: string
  /** 0–1 overall progress across all stories. */
  progress: number
}

/**
 * Story slide defs for Main Analytics cards.
 * Only includes cards that have (or likely have) live DOM to capture.
 */
export function buildMainStorySpecs(
  displayName: string,
  analytics: WrapAnalytics
): WrapStorySpec[] {
  const a = analytics.account
  if (!a) return []

  const sentRecvTotal = a.volume.sent + a.volume.received
  const sentPct =
    sentRecvTotal > 0 ? Math.round((a.volume.sent / sentRecvTotal) * 100) : 0
  const recvPct =
    sentRecvTotal > 0 ? Math.round((a.volume.received / sentRecvTotal) * 100) : 0

  const overviewKpis: StoryKpi[] = [
    { label: "Sent", value: fmt(a.sentMessages) },
    { label: "Received", value: fmt(a.receivedMessages) },
    { label: "Total", value: fmt(a.totalMessages) },
    { label: "Chats", value: fmt(analytics.chatCount) },
  ]

  const specs: WrapStorySpec[] = []

  const hasActivity =
    a.activityOverTime.yearly.length > 0 ||
    a.activityOverTime.monthly.length > 0 ||
    a.activityOverTime.daily.length > 0
  if (hasActivity) {
    specs.push({
      id: "activity",
      exportName: "main-activity-over-time",
      heading: `${fmt(a.totalMessages)} messages`,
      subtext: `${displayName}'s volume over time — every chat, one timeline.`,
      kpis: overviewKpis,
    })
  }

  specs.push({
    id: "sent-received",
    exportName: "main-sent-vs-received",
    heading: "Sent vs received",
    subtext: `${fmt(a.sentMessages)} sent (${sentPct}%) · ${fmt(a.receivedMessages)} received (${recvPct}%)`,
    // If activity is missing, put overview KPIs on the first remaining slide.
    kpis: hasActivity ? undefined : overviewKpis,
  })

  if ((a.contentMix?.types ?? []).some((t) => t.count > 0)) {
    specs.push({
      id: "types",
      exportName: "main-message-types",
      heading: "Message types",
      subtext: "What you actually send — text, voice, stickers, and more.",
    })
  }

  if (a.emojis.topOverall.some((e) => e.emoji && e.count > 0)) {
    const top = a.emojis.topOverall[0]
    specs.push({
      id: "emojis",
      exportName: "main-emojis",
      heading: "Top emojis",
      subtext: top
        ? `Led by ${top.emoji} × ${fmt(top.count)} — your reaction vocabulary.`
        : "The glyphs that showed up most in your messages.",
    })
  }

  if (a.circadian.hourlyTotal.some((n) => n > 0)) {
    const peak = peakHourLabel(a.circadian.hourlyTotal)
    specs.push({
      id: "circadian",
      exportName: "main-circadian",
      heading: "Your clock",
      subtext: `Peak hour ${peak} — when the chats tend to light up.`,
    })
  }

  if (a.heatmap.days.length > 0) {
    const years = heatmapYearsFromDays(a.heatmap.days)
      .slice(0, MAX_HEATMAP_STORY_YEARS)
      .reverse() // oldest → newest for the story
    const total = a.heatmap.days.reduce((sum, d) => sum + d.count, 0)
    const yearLabel =
      years.length === 0
        ? null
        : years.length === 1
          ? String(years[0])
          : years.length === 2
            ? `${years[0]} & ${years[1]}`
            : `${years[0]}–${years[years.length - 1]}`
    specs.push({
      id: "heatmap",
      exportName: "main-heatmap",
      heading: "Activity heatmap",
      subtext:
        yearLabel != null
          ? `${yearLabel} · ${fmt(total)} messages on the calendar.`
          : `${fmt(total)} messages on the calendar.`,
    })
  }

  return specs
}

/** Find a live export card by its `data-export-name`. */
export function findExportCard(exportName: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-export-name="${CSS.escape(exportName)}"]`
  )
}

function exportOptionsFromCard(el: HTMLElement): DomExportOptions {
  const mode = el.dataset.exportMode
  const storyWidth = Number(el.dataset.exportStoryWidth)
  const minWidth = Number(el.dataset.exportMinWidth) || 720
  // While crafting stories, keep the portrait capture width — don't expand back
  // out to the full desktop card width (that makes emoji grids tiny in 9:16).
  const storyLocked =
    el.dataset.storyCapturing === "true" &&
    Number.isFinite(storyWidth) &&
    storyWidth > 0

  return {
    captureMode: mode === "dom" || mode === "chart" ? mode : "chart",
    minWidth: storyLocked ? storyWidth : minWidth,
    pixelRatio: Number(el.dataset.exportPixelRatio) || 3,
  }
}

async function waitForExportCard(
  exportName: string,
  timeoutMs = 12_000
): Promise<HTMLElement | null> {
  const existing = findExportCard(exportName)
  if (existing) return existing

  return new Promise((resolve) => {
    const started = Date.now()
    const tick = () => {
      const el = findExportCard(exportName)
      if (el) {
        resolve(el)
        return
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(null)
        return
      }
      window.setTimeout(tick, 200)
    }
    tick()
  })
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to decode card image"))
    }
    img.src = url
  })
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const lines: string[] = []
  let current = words[0]!
  for (let i = 1; i < words.length; i++) {
    const word = words[i]!
    const trial = `${current} ${word}`
    if (ctx.measureText(trial).width <= maxWidth) {
      current = trial
    } else {
      lines.push(current)
      current = word
    }
  }
  lines.push(current)
  return lines
}

function paintAtmosphere(ctx: CanvasRenderingContext2D) {
  const bg = ctx.createLinearGradient(0, 0, 0, STORY_H)
  bg.addColorStop(0, "#041512")
  bg.addColorStop(0.42, "#0a2a24")
  bg.addColorStop(1, "#03110e")
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, STORY_W, STORY_H)

  // Soft emerald bloom behind the card band
  const glow = ctx.createRadialGradient(
    STORY_W * 0.5,
    STORY_H * 0.38,
    20,
    STORY_W * 0.5,
    STORY_H * 0.38,
    STORY_W * 0.78
  )
  glow.addColorStop(0, "rgba(16, 185, 129, 0.32)")
  glow.addColorStop(1, "rgba(16, 185, 129, 0)")
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, STORY_W, STORY_H)

  // Secondary amber bloom (low) for warmth without clutter
  const warm = ctx.createRadialGradient(
    STORY_W * 0.82,
    STORY_H * 0.78,
    10,
    STORY_W * 0.82,
    STORY_H * 0.78,
    STORY_W * 0.45
  )
  warm.addColorStop(0, "rgba(245, 158, 11, 0.12)")
  warm.addColorStop(1, "rgba(245, 158, 11, 0)")
  ctx.fillStyle = warm
  ctx.fillRect(0, 0, STORY_W, STORY_H)

  // Concentric rings — quiet structure in empty space
  ctx.save()
  ctx.strokeStyle = "rgba(255,255,255,0.055)"
  ctx.lineWidth = 2
  for (const r of [220, 340, 480]) {
    ctx.beginPath()
    ctx.arc(STORY_W * 0.5, STORY_H * 0.4, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()

  // Sparse dotted field
  ctx.fillStyle = "rgba(255,255,255,0.07)"
  for (let i = 0; i < 48; i++) {
    const x = ((i * 137) % (STORY_W - 80)) + 40
    const y = ((i * 89) % (STORY_H - 160)) + 80
    const s = 1.5 + (i % 3)
    ctx.beginPath()
    ctx.arc(x, y, s, 0, Math.PI * 2)
    ctx.fill()
  }
}

function paintKpiStrip(
  ctx: CanvasRenderingContext2D,
  kpis: StoryKpi[],
  top: number,
  padX: number
): number {
  const gap = 16
  const cols = 4
  const cellW = (STORY_W - padX * 2 - gap * (cols - 1)) / cols
  const cellH = 118

  kpis.slice(0, 4).forEach((kpi, i) => {
    const x = padX + i * (cellW + gap)
    const y = top

    ctx.save()
    ctx.fillStyle = "rgba(255,255,255,0.08)"
    roundRectPath(ctx, x, y, cellW, cellH, 20)
    ctx.fill()
    ctx.strokeStyle = "rgba(255,255,255,0.14)"
    ctx.lineWidth = 1.5
    roundRectPath(ctx, x, y, cellW, cellH, 20)
    ctx.stroke()
    ctx.restore()

    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    ctx.fillStyle = "rgba(255,255,255,0.55)"
    ctx.font = "600 22px ui-sans-serif, system-ui, sans-serif"
    ctx.fillText(kpi.label.toUpperCase(), x + cellW / 2, y + 18)

    ctx.fillStyle = "#ffffff"
    ctx.font = "700 36px ui-sans-serif, system-ui, sans-serif"
    const valueLines = wrapLines(ctx, kpi.value, cellW - 16).slice(0, 1)
    ctx.fillText(valueLines[0] ?? kpi.value, x + cellW / 2, y + 52)
  })

  return cellH
}

/**
 * Paint a card PNG into a branded 9:16 story frame with heading + subtext
 * baked into the pixels (so downloads match the on-screen story).
 */
export async function composeStoryFrame(
  cardBlob: Blob,
  spec: Pick<WrapStorySpec, "heading" | "subtext" | "kpis">
): Promise<Blob> {
  const cardImg = await loadImageFromBlob(cardBlob)
  const canvas = document.createElement("canvas")
  canvas.width = STORY_W
  canvas.height = STORY_H
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas unsupported")

  paintAtmosphere(ctx)

  const padX = 52
  const headingSize = 84
  const headingLine = 94
  const subSize = 34
  const subLine = 44
  const footerH = 56

  // Measure caption block
  ctx.font = `700 ${headingSize}px ui-sans-serif, system-ui, sans-serif`
  const headingLines = wrapLines(
    ctx,
    spec.heading,
    STORY_W - padX * 2
  ).slice(0, 3)
  ctx.font = `500 ${subSize}px ui-sans-serif, system-ui, sans-serif`
  const subLines = wrapLines(ctx, spec.subtext, STORY_W - padX * 2).slice(0, 4)
  const captionBlockH =
    headingLines.length * headingLine + 14 + subLines.length * subLine
  const hasKpis = Boolean(spec.kpis && spec.kpis.length > 0)
  const kpiH = hasKpis ? 118 : 0
  const kpiGap = hasKpis ? 24 : 0

  // Bottom stack: captions → KPIs → attribution
  const captionTop =
    STORY_H - footerH - 36 - kpiH - kpiGap - captionBlockH

  // Brand header
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  ctx.fillStyle = "rgba(255,255,255,0.88)"
  ctx.font = "700 30px ui-sans-serif, system-ui, sans-serif"
  ctx.fillText("Social Wrapped", STORY_W / 2, 56)

  const contentTop = 108

  // Soft bottom vignette behind captions + KPIs
  const vignette = ctx.createLinearGradient(0, captionTop - 160, 0, STORY_H)
  vignette.addColorStop(0, "rgba(0,0,0,0)")
  vignette.addColorStop(0.4, "rgba(0,0,0,0.4)")
  vignette.addColorStop(1, "rgba(0,0,0,0.78)")
  ctx.fillStyle = vignette
  ctx.fillRect(0, captionTop - 160, STORY_W, STORY_H - (captionTop - 160))

  // Fit card into the middle band — use most of the available height
  const cardBottom = captionTop - 28
  const maxCardW = STORY_W - padX * 2
  const maxCardH = Math.max(cardBottom - contentTop, 240)
  const scale = Math.min(maxCardW / cardImg.width, maxCardH / cardImg.height)
  const drawW = cardImg.width * scale
  const drawH = cardImg.height * scale
  const drawX = (STORY_W - drawW) / 2
  const drawY = contentTop + (maxCardH - drawH) / 2
  const radius = 28

  ctx.save()
  ctx.shadowColor = "rgba(0,0,0,0.5)"
  ctx.shadowBlur = 52
  ctx.shadowOffsetY = 22
  ctx.fillStyle = "#0f172a"
  roundRectPath(ctx, drawX, drawY, drawW, drawH, radius)
  ctx.fill()
  ctx.restore()

  ctx.save()
  roundRectPath(ctx, drawX, drawY, drawW, drawH, radius)
  ctx.clip()
  ctx.drawImage(cardImg, drawX, drawY, drawW, drawH)
  ctx.restore()

  ctx.strokeStyle = "rgba(255,255,255,0.14)"
  ctx.lineWidth = 2
  roundRectPath(ctx, drawX, drawY, drawW, drawH, radius)
  ctx.stroke()

  // Captions — larger titles
  ctx.textAlign = "left"
  ctx.textBaseline = "top"
  let y = captionTop
  ctx.fillStyle = "#ffffff"
  ctx.font = `700 ${headingSize}px ui-sans-serif, system-ui, sans-serif`
  for (const line of headingLines) {
    ctx.fillText(line, padX, y)
    y += headingLine
  }
  y += 10
  ctx.fillStyle = "rgba(255,255,255,0.84)"
  ctx.font = `500 ${subSize}px ui-sans-serif, system-ui, sans-serif`
  for (const line of subLines) {
    ctx.fillText(line, padX, y)
    y += subLine
  }

  // KPIs under captions
  if (hasKpis && spec.kpis) {
    paintKpiStrip(ctx, spec.kpis, y + kpiGap, padX)
  }

  // App attribution (baked into download) — brand in primary
  const prefix = "Created with "
  const brand = "Social Wrapped"
  ctx.font = "500 24px ui-sans-serif, system-ui, sans-serif"
  const prefixW = ctx.measureText(prefix).width
  const brandW = ctx.measureText(brand).width
  const attrX = STORY_W / 2 - (prefixW + brandW) / 2
  const attrY = STORY_H - 28
  ctx.textAlign = "left"
  ctx.textBaseline = "bottom"
  ctx.fillStyle = "rgba(255,255,255,0.45)"
  ctx.fillText(prefix, attrX, attrY)
  ctx.fillStyle = resolveCssColor("var(--primary)", "#0d9488")
  ctx.fillText(brand, attrX + prefixW, attrY)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png")
  )
  if (!blob) throw new Error("Story compose produced an empty image")
  return blob
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

/** Pause after expand so frozen charts finish painting at the new size. */
const CHART_CAPTURE_SETTLE_MS = 420
/** Extra wait before first snapshot so intro animations can finish on-screen. */
const CHART_INTRO_SETTLE_MS = 1050
const DOM_CAPTURE_SETTLE_MS = 160

/**
 * Capture each Main Analytics card and compose a shareable story slide.
 * Skips specs whose cards never appear in the DOM.
 */
export async function generateWrapStories(
  specs: WrapStorySpec[],
  signal?: AbortSignal,
  onProgress?: (progress: StoryCaptureProgress) => void
): Promise<ComposedWrapStory[]> {
  const stories: ComposedWrapStory[] = []
  const total = specs.length

  for (let index = 0; index < specs.length; index++) {
    const spec = specs[index]!
    if (signal?.aborted) break

    onProgress?.({
      index,
      total,
      label: spec.heading,
      progress: total > 0 ? index / total : 1,
    })

    const card = await waitForExportCard(spec.exportName)
    if (!card || signal?.aborted) continue

    await waitForCardCaptureReady(card)
    if (signal?.aborted) break

    const cover = beginInFlowCaptureCover(card, {
      label: spec.heading,
      step: index + 1,
      total,
    })

    try {
      if (spec.id === "heatmap") {
        const composed = await captureHeatmapStory(
          card,
          spec,
          signal,
          (year) => {
            cover.setLabel(`${spec.heading} · ${year}`)
            onProgress?.({
              index,
              total,
              label: `${spec.heading} · ${year}`,
              progress: total > 0 ? (index + 0.5) / total : 1,
            })
          }
        )
        if (!composed || signal?.aborted) continue
        stories.push({
          ...spec,
          image: URL.createObjectURL(composed),
        })
        continue
      }

      const cardBlob = await captureElementPng(card, card, {
        ...exportOptionsFromCard(card),
        freezeCharts: true,
        settleMs:
          exportOptionsFromCard(card).captureMode === "dom"
            ? DOM_CAPTURE_SETTLE_MS
            : CHART_CAPTURE_SETTLE_MS,
      })
      const composed = await composeStoryFrame(cardBlob, spec)
      if (signal?.aborted) break
      stories.push({
        ...spec,
        image: URL.createObjectURL(composed),
      })
    } catch (error) {
      console.error(`Story capture failed for ${spec.exportName}:`, error)
    } finally {
      cover.dispose()
    }
  }

  if (!signal?.aborted) {
    onProgress?.({
      index: Math.max(total - 1, 0),
      total,
      label: "Done",
      progress: 1,
    })
  }

  return stories
}

type CaptureCover = {
  setLabel: (label: string) => void
  dispose: () => void
}

/**
 * In-document loading stand-in for a card.
 * The real card is parked off-screen (still paintably visible) for HD capture,
 * so expand/restore never flickers in the viewport. The cover scrolls with the page.
 */
function beginInFlowCaptureCover(
  card: HTMLElement,
  opts: { label: string; step: number; total: number }
): CaptureCover {
  // Prefer a portrait-friendly capture width when the card opts in (emoji grid).
  // Tailwind viewport breakpoints would keep a desktop 6-col layout even when
  // the card is parked narrow — those cards use @container queries instead.
  const storyWidth = Number(card.dataset.exportStoryWidth)
  const captureWidth =
    Number.isFinite(storyWidth) && storyWidth > 0
      ? storyWidth
      : Math.max(card.offsetWidth, 1)
  const width = Math.max(card.offsetWidth, 1)
  const height = Math.max(card.offsetHeight, 1)
  const radius = getComputedStyle(card).borderRadius || "12px"

  ensureCaptureCoverStyles()

  const cover = document.createElement("div")
  cover.setAttribute("data-story-capture-cover", "")
  cover.setAttribute("aria-busy", "true")
  cover.setAttribute("aria-live", "polite")
  cover.style.cssText = [
    `width:${width}px`,
    `height:${height}px`,
    "flex-shrink:0",
    "box-sizing:border-box",
    `border-radius:${radius}`,
    "position:relative",
    "overflow:hidden",
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "justify-content:center",
    "gap:12px",
    "padding:20px",
    "background:linear-gradient(165deg, color-mix(in oklab, var(--card) 92%, #0d9488), var(--card))",
    "box-shadow:inset 0 0 0 1px color-mix(in oklab, var(--foreground) 10%, transparent)",
  ].join(";")

  const shimmer = document.createElement("div")
  shimmer.className = "sw-capture-shimmer"
  cover.appendChild(shimmer)

  const spinner = document.createElement("div")
  spinner.className = "sw-capture-spinner"
  cover.appendChild(spinner)

  const eyebrow = document.createElement("p")
  eyebrow.textContent = "Crafting story"
  eyebrow.style.cssText =
    "position:relative;margin:0;font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:color-mix(in oklab, var(--primary) 80%, var(--muted-foreground));"
  cover.appendChild(eyebrow)

  const labelEl = document.createElement("p")
  labelEl.textContent = opts.label
  labelEl.style.cssText =
    "position:relative;margin:0;max-width:90%;text-align:center;font-size:13px;font-weight:600;line-height:1.35;color:var(--foreground);"
  cover.appendChild(labelEl)

  const stepEl = document.createElement("p")
  stepEl.textContent = `${opts.step} / ${opts.total}`
  stepEl.style.cssText =
    "position:relative;margin:0;font-size:11px;font-weight:500;font-variant-numeric:tabular-nums;color:var(--muted-foreground);"
  cover.appendChild(stepEl)

  const parent = card.parentElement
  parent?.insertBefore(cover, card)

  // Park the live card off-screen for capture (keep visibility — exporter needs paint).
  const prev = {
    position: card.style.position,
    left: card.style.left,
    top: card.style.top,
    right: card.style.right,
    width: card.style.width,
    maxWidth: card.style.maxWidth,
    minWidth: card.style.minWidth,
    zIndex: card.style.zIndex,
    pointerEvents: card.style.pointerEvents,
    transform: card.style.transform,
  }
  card.style.position = "fixed"
  card.style.left = "-12000px"
  card.style.top = "0"
  card.style.right = "auto"
  card.style.width = `${captureWidth}px`
  card.style.maxWidth = `${captureWidth}px`
  card.style.minWidth = `${captureWidth}px`
  card.style.zIndex = "0"
  card.style.pointerEvents = "none"
  card.style.transform = "none"
  card.dataset.storyCapturing = "true"

  // Let chart hosts / container queries reflow at the parked size before we snapshot.
  window.dispatchEvent(new Event("resize"))

  return {
    setLabel: (next) => {
      labelEl.textContent = next
    },
    dispose: () => {
      card.style.position = prev.position
      card.style.left = prev.left
      card.style.top = prev.top
      card.style.right = prev.right
      card.style.width = prev.width
      card.style.maxWidth = prev.maxWidth
      card.style.minWidth = prev.minWidth
      card.style.zIndex = prev.zIndex
      card.style.pointerEvents = prev.pointerEvents
      card.style.transform = prev.transform
      delete card.dataset.storyCapturing
      cover.remove()
      window.dispatchEvent(new Event("resize"))
    },
  }
}

function ensureCaptureCoverStyles() {
  if (document.getElementById("sw-story-capture-cover-style")) return
  const style = document.createElement("style")
  style.id = "sw-story-capture-cover-style"
  style.textContent = [
    "@keyframes sw-capture-spin{to{transform:rotate(360deg)}}",
    "@keyframes sw-capture-shimmer{0%{transform:translateX(-45%)}100%{transform:translateX(45%)}}",
    ".sw-capture-spinner{position:relative;width:40px;height:40px;border-radius:999px;border:2px solid color-mix(in oklab, var(--primary) 25%, transparent);border-top-color:var(--primary);animation:sw-capture-spin .85s linear infinite}",
    ".sw-capture-shimmer{position:absolute;inset:-30%;background:linear-gradient(100deg,transparent 42%,color-mix(in oklab, var(--primary) 16%, transparent) 50%,transparent 58%);animation:sw-capture-shimmer 1.6s ease-in-out infinite;pointer-events:none}",
  ].join("")
  document.head.appendChild(style)
}

function findEchartsIn(root: HTMLElement): echarts.EChartsType[] {
  const found: echarts.EChartsType[] = []
  const seen = new Set<echarts.EChartsType>()
  for (const canvas of root.querySelectorAll("canvas")) {
    let node: HTMLElement | null = canvas.parentElement
    while (node && node !== root.parentElement) {
      const instance = echarts.getInstanceByDom(node)
      if (instance && !seen.has(instance)) {
        seen.add(instance)
        found.push(instance)
        break
      }
      node = node.parentElement
    }
  }
  return found
}

/** Wait briefly, then rasterize (expand path freezes charts + settles after resize). */
async function captureElementPng(
  card: HTMLElement,
  target: HTMLElement,
  options: DomExportOptions
): Promise<Blob> {
  const hasCharts =
    findEchartsIn(target).length > 0 || findEchartsIn(card).length > 0
  await delay(hasCharts ? 240 : DOM_CAPTURE_SETTLE_MS)

  return elementToPngBlob(target, {
    freezeCharts: true,
    settleMs: hasCharts ? CHART_CAPTURE_SETTLE_MS : DOM_CAPTURE_SETTLE_MS,
    ...options,
  })
}

/** Newest year first. */
function heatmapYearsFromDays(
  days: Array<{ date: string }>
): number[] {
  const set = new Set<number>()
  for (const d of days) {
    const y = Number(d.date.slice(0, 4))
    if (Number.isFinite(y)) set.add(y)
  }
  return [...set].sort((a, b) => b - a)
}

function parseHeatmapYears(card: HTMLElement): number[] {
  const raw = card.dataset.heatmapYears ?? ""
  // Card stores newest-first; keep the newest N, then reverse for oldest → newest.
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n))
    .slice(0, MAX_HEATMAP_STORY_YEARS)
    .reverse()
}

async function setHeatmapYear(
  card: HTMLElement,
  year: number,
  opts?: { settle?: boolean }
): Promise<void> {
  const settle = opts?.settle ?? true
  if (card.dataset.heatmapYear === String(year)) return
  card.dispatchEvent(
    new CustomEvent("sw:set-heatmap-year", { detail: { year } })
  )
  const started = Date.now()
  while (Date.now() - started < 4_000) {
    if (card.dataset.heatmapYear === String(year)) {
      await waitForCardCaptureReady(card)
      if (settle) await delay(CHART_INTRO_SETTLE_MS)
      else await delay(120)
      return
    }
    await delay(80)
  }
}

async function captureHeatmapStory(
  card: HTMLElement,
  spec: WrapStorySpec,
  signal?: AbortSignal,
  onYear?: (year: number) => void
): Promise<Blob | null> {
  const years = parseHeatmapYears(card)
  if (years.length === 0) return null

  const previousYear = Number(card.dataset.heatmapYear) || years[0]
  const panel =
    card.querySelector<HTMLElement>("[data-heatmap-panel]") ?? card
  const baseOptions = exportOptionsFromCard(card)
  const options: DomExportOptions = {
    ...baseOptions,
    captureMode: "chart",
    freezeCharts: true,
    settleMs: CHART_CAPTURE_SETTLE_MS,
    minWidth: Math.max(baseOptions.minWidth ?? 720, 1040),
    backgroundColor:
      getComputedStyle(card).backgroundColor || baseOptions.backgroundColor,
  }

  try {
    const panels: Array<{ year: number; blob: Blob }> = []
    for (const year of years) {
      if (signal?.aborted) return null
      onYear?.(year)
      await setHeatmapYear(card, year)
      if (signal?.aborted) return null
      const blob = await captureElementPng(card, panel, options)
      if (signal?.aborted) return null
      panels.push({ year, blob })
    }

    return composeHeatmapStoryFrame(panels, spec)
  } finally {
    if (previousYear != null) {
      await setHeatmapYear(card, previousYear, { settle: false })
    }
  }
}

/**
 * Stack every available year heatmap with year labels; main title at the bottom.
 */
async function composeHeatmapStoryFrame(
  panels: Array<{ year: number; blob: Blob }>,
  spec: Pick<WrapStorySpec, "heading" | "subtext">
): Promise<Blob> {
  const images = await Promise.all(
    panels.map(async (p) => ({
      year: p.year,
      img: await loadImageFromBlob(p.blob),
    }))
  )

  const canvas = document.createElement("canvas")
  canvas.width = STORY_W
  canvas.height = STORY_H
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas unsupported")

  paintAtmosphere(ctx)

  const padX = 48
  const footerH = 56
  const headingSize = images.length >= 4 ? 64 : 84
  const headingLine = images.length >= 4 ? 72 : 94
  const subSize = 34
  const subLine = 44

  // Measure bottom caption stack (same pattern as other stories)
  ctx.font = `700 ${headingSize}px ui-sans-serif, system-ui, sans-serif`
  const headingLines = wrapLines(
    ctx,
    spec.heading,
    STORY_W - padX * 2
  ).slice(0, 3)
  ctx.font = `500 ${subSize}px ui-sans-serif, system-ui, sans-serif`
  const subLines = wrapLines(ctx, spec.subtext, STORY_W - padX * 2).slice(0, 4)
  const captionBlockH =
    headingLines.length * headingLine + 14 + subLines.length * subLine
  const captionTop = STORY_H - footerH - 36 - captionBlockH

  // Brand
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  ctx.fillStyle = "rgba(255,255,255,0.88)"
  ctx.font = "700 28px ui-sans-serif, system-ui, sans-serif"
  ctx.fillText("Social Wrapped", STORY_W / 2, 52)

  const contentTop = 100
  const bandBottom = captionTop - 28
  const bandH = Math.max(bandBottom - contentTop, 200)
  const yearLabelH = images.length >= 4 ? 36 : 44
  const gapBetween = images.length >= 4 ? 16 : 22
  const slots = images.length
  const maxW = STORY_W - padX * 2

  // Soft bottom vignette behind captions
  const vignette = ctx.createLinearGradient(0, captionTop - 140, 0, STORY_H)
  vignette.addColorStop(0, "rgba(0,0,0,0)")
  vignette.addColorStop(0.4, "rgba(0,0,0,0.4)")
  vignette.addColorStop(1, "rgba(0,0,0,0.78)")
  ctx.fillStyle = vignette
  ctx.fillRect(0, captionTop - 140, STORY_W, STORY_H - (captionTop - 140))

  // Fit panels into the middle band, then vertically center the whole stack.
  const slotBudget =
    (bandH - slots * yearLabelH - (slots - 1) * gapBetween) / slots
  const layouts = images.map((panel) => {
    const maxH = Math.max(slotBudget - 4, 80)
    const scale = Math.min(maxW / panel.img.width, maxH / panel.img.height)
    const drawW = panel.img.width * scale
    const drawH = panel.img.height * scale
    return { panel, drawW, drawH }
  })
  const stackH =
    layouts.reduce((sum, l) => sum + yearLabelH + l.drawH, 0) +
    (slots - 1) * gapBetween
  let y = contentTop + Math.max(0, (bandH - stackH) / 2)

  for (let i = 0; i < layouts.length; i++) {
    const { panel, drawW, drawH } = layouts[i]!
    ctx.textAlign = "left"
    ctx.textBaseline = "top"
    ctx.fillStyle = resolveCssColor("var(--primary)", "#0d9488")
    ctx.font = `700 ${images.length >= 4 ? 32 : 40}px ui-sans-serif, system-ui, sans-serif`
    ctx.fillText(String(panel.year), padX, y)
    y += yearLabelH

    const drawX = (STORY_W - drawW) / 2
    const drawY = y
    const radius = 18

    ctx.save()
    ctx.shadowColor = "rgba(0,0,0,0.4)"
    ctx.shadowBlur = 24
    ctx.shadowOffsetY = 10
    ctx.fillStyle = "#0f172a"
    roundRectPath(ctx, drawX, drawY, drawW, drawH, radius)
    ctx.fill()
    ctx.restore()

    ctx.save()
    roundRectPath(ctx, drawX, drawY, drawW, drawH, radius)
    ctx.clip()
    ctx.drawImage(panel.img, drawX, drawY, drawW, drawH)
    ctx.restore()

    ctx.strokeStyle = "rgba(255,255,255,0.12)"
    ctx.lineWidth = 1.5
    roundRectPath(ctx, drawX, drawY, drawW, drawH, radius)
    ctx.stroke()

    y = drawY + drawH + gapBetween
  }

  // Main title + subtext at bottom (matches other stories)
  ctx.textAlign = "left"
  ctx.textBaseline = "top"
  let captionY = captionTop
  ctx.fillStyle = "#ffffff"
  ctx.font = `700 ${headingSize}px ui-sans-serif, system-ui, sans-serif`
  for (const line of headingLines) {
    ctx.fillText(line, padX, captionY)
    captionY += headingLine
  }
  captionY += 10
  ctx.fillStyle = "rgba(255,255,255,0.84)"
  ctx.font = `500 ${subSize}px ui-sans-serif, system-ui, sans-serif`
  for (const line of subLines) {
    ctx.fillText(line, padX, captionY)
    captionY += subLine
  }

  // Attribution
  const prefix = "Created with "
  const brand = "Social Wrapped"
  ctx.font = "500 24px ui-sans-serif, system-ui, sans-serif"
  const prefixW = ctx.measureText(prefix).width
  const brandW = ctx.measureText(brand).width
  const attrX = STORY_W / 2 - (prefixW + brandW) / 2
  ctx.textAlign = "left"
  ctx.textBaseline = "bottom"
  ctx.fillStyle = "rgba(255,255,255,0.45)"
  ctx.fillText(prefix, attrX, STORY_H - 28)
  ctx.fillStyle = resolveCssColor("var(--primary)", "#0d9488")
  ctx.fillText(brand, attrX + prefixW, STORY_H - 28)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png")
  )
  if (!blob) throw new Error("Heatmap story compose produced an empty image")
  return blob
}

export function revokeStoryUrls(stories: Array<{ image: string }>) {
  for (const story of stories) {
    if (story.image.startsWith("blob:")) {
      URL.revokeObjectURL(story.image)
    }
  }
}

async function waitForCardCaptureReady(
  card: HTMLElement,
  timeoutMs = 6_000
): Promise<void> {
  const mode = card.dataset.exportMode
  const started = Date.now()

  while (Date.now() - started < timeoutMs) {
    if (mode === "dom") {
      if (card.offsetWidth > 0 && card.offsetHeight > 40) {
        await delay(80)
        return
      }
    } else {
      const canvas = card.querySelector("canvas")
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        await delay(80)
        return
      }
    }
    await delay(120)
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Resolve a CSS color (e.g. `var(--primary)`) to a canvas-safe rgb/rgba string. */
function resolveCssColor(color: string, fallback: string): string {
  if (typeof document === "undefined") return fallback
  const probe = document.createElement("span")
  probe.style.color = color
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()
  return resolved && resolved !== "rgba(0, 0, 0, 0)" ? resolved : fallback
}
