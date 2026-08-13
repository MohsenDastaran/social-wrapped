import * as echarts from "echarts/core"

import { saveBlob } from "@/lib/save-blob"

export type DomExportOptions = {
  /**
   * CSS layout width used while capturing (and floor when expanding narrow cards).
   * Keep this modest — HD comes from `pixelRatio`, not a huge layout width.
   * @default 720
   */
  minWidth?: number
  /**
   * Backing-store scale for HD output. Final PNG width ≈ minWidth × pixelRatio.
   * @default 3
   */
  pixelRatio?: number
  /** Solid fill behind transparent areas. */
  backgroundColor?: string
  /**
   * Extra selector for nodes hidden during capture.
   * `[data-export-ignore]` is always hidden.
   */
  excludeSelector?: string
  /**
   * `chart` — ECharts snapshots + small swatches + text (default).
   * `dom` — full HTML paint for list/cards (bars, borders, header fills, icons).
   * @default "chart"
   */
  captureMode?: "chart" | "dom"
  /**
   * Pause after layout expand / chart resize so entrance animations can finish
   * before the canvas is snapshotted.
   */
  settleMs?: number
  /**
   * Disable ECharts animations for the duration of the capture (restored after).
   * Pairs well with a short `settleMs` after expand.
   */
  freezeCharts?: boolean
}

type StyleSnapshot = {
  width: string
  maxWidth: string
  minWidth: string
  position: string
  left: string
  top: string
  right: string
  zIndex: string
  opacity: string
  pointerEvents: string
  transform: string
}

/**
 * Rasterize a live DOM node to a PNG blob.
 * On mobile, temporarily reflows the node at `minWidth` so charts export large.
 *
 * Charts are captured via ECharts `getDataURL`; HTML chrome (title, legends,
 * swatches) is painted from the live DOM so overlays are never dropped.
 */
export async function elementToPngBlob(
  element: HTMLElement,
  options: DomExportOptions = {}
): Promise<Blob> {
  const minWidth = options.minWidth ?? 720
  const pixelRatio = options.pixelRatio ?? 3

  const captureMode = options.captureMode ?? "chart"
  const unfreeze = options.freezeCharts
    ? freezeEchartsAnimations(element)
    : () => {}
  const layoutRestore = await expandForExport(element, minWidth)

  if (options.settleMs && options.settleMs > 0) {
    await delay(options.settleMs)
  }

  const hidden = hideExcluded(element, options.excludeSelector)
  const canvasSwaps =
    captureMode === "chart"
      ? await swapCanvasesForImages(element, pixelRatio)
      : []

  try {
    await nextFrame()
    await nextFrame()

    const width = Math.max(element.offsetWidth, 1)
    const height = Math.max(element.offsetHeight, 1)
    const backgroundColor = resolveBackground(
      element,
      options.backgroundColor
    )

    const dataUrl = await renderElementComposite(
      element,
      width,
      height,
      pixelRatio,
      backgroundColor,
      captureMode
    )

    const blob = await dataUrlToBlob(dataUrl)
    if (!blob || blob.size < 32) {
      throw new Error("Export produced an empty image")
    }
    return blob
  } finally {
    restoreCanvases(canvasSwaps)
    restoreHidden(hidden)
    layoutRestore()
    unfreeze()
    // Let chart hosts ResizeObserver reflow back to on-screen size.
    window.dispatchEvent(new Event("resize"))
  }
}

/** Stop in-flight ECharts intros so snapshots aren't mid-animation. */
function freezeEchartsAnimations(root: HTMLElement): () => void {
  const charts: Array<ReturnType<typeof echarts.getInstanceByDom>> = []
  for (const canvas of root.querySelectorAll("canvas")) {
    let node: HTMLElement | null = canvas.parentElement
    while (node && node !== root.parentElement) {
      const instance = echarts.getInstanceByDom(node)
      if (instance) {
        charts.push(instance)
        try {
          instance.setOption(
            {
              animation: false,
              animationDuration: 0,
              animationDurationUpdate: 0,
            },
            { lazyUpdate: false }
          )
        } catch {
          // ignore
        }
        break
      }
      node = node.parentElement
    }
  }

  return () => {
    for (const chart of charts) {
      if (!chart) continue
      try {
        // Re-enable animations for normal UI; don't force a full redraw.
        chart.setOption(
          {
            animation: true,
          },
          { lazyUpdate: true }
        )
      } catch {
        // ignore
      }
    }
  }
}

/** Capture `element` and save a PNG (Tauri dialog / file picker / download). */
export async function downloadElementAsPng(
  element: HTMLElement,
  filename: string,
  options?: DomExportOptions
): Promise<void> {
  const blob = await elementToPngBlob(element, options)
  const name = filename.toLowerCase().endsWith(".png")
    ? filename
    : `${filename}.png`
  const result = await saveBlob(blob, name)
  if (!result.ok && !result.cancelled) {
    throw new Error(result.error || "Failed to save export")
  }
}

// ── Layout expansion (mobile → share size) ───────────────────────────────────

async function expandForExport(
  el: HTMLElement,
  minWidth: number
): Promise<() => void> {
  const targetWidth = measureExportWidth(el, minWidth)
  const scrollerRestores = expandScrollersForExport(el)

  if (el.offsetWidth >= targetWidth - 1) {
    return () => {
      scrollerRestores()
    }
  }

  const prev: StyleSnapshot = {
    width: el.style.width,
    maxWidth: el.style.maxWidth,
    minWidth: el.style.minWidth,
    position: el.style.position,
    left: el.style.left,
    top: el.style.top,
    right: el.style.right,
    zIndex: el.style.zIndex,
    opacity: el.style.opacity,
    pointerEvents: el.style.pointerEvents,
    transform: el.style.transform,
  }

  // Hold layout space so the on-screen card doesn't collapse while we park
  // the live node off-canvas for a wider capture.
  const placeholder = document.createElement("div")
  placeholder.setAttribute("aria-hidden", "true")
  placeholder.setAttribute("data-export-placeholder", "")
  placeholder.style.width = `${el.offsetWidth}px`
  placeholder.style.height = `${el.offsetHeight}px`
  placeholder.style.flexShrink = "0"
  placeholder.style.pointerEvents = "none"
  el.insertAdjacentElement("beforebegin", placeholder)

  const restore = () => {
    el.style.width = prev.width
    el.style.maxWidth = prev.maxWidth
    el.style.minWidth = prev.minWidth
    el.style.position = prev.position
    el.style.left = prev.left
    el.style.top = prev.top
    el.style.right = prev.right
    el.style.zIndex = prev.zIndex
    el.style.opacity = prev.opacity
    el.style.pointerEvents = prev.pointerEvents
    el.style.transform = prev.transform
    placeholder.remove()
    scrollerRestores()
    resizeEchartsIn(el)
  }

  el.style.position = "fixed"
  el.style.left = "-12000px"
  el.style.top = "0"
  el.style.width = `${targetWidth}px`
  el.style.maxWidth = `${targetWidth}px`
  el.style.minWidth = `${targetWidth}px`
  el.style.zIndex = "0"
  el.style.opacity = "1"
  el.style.pointerEvents = "none"
  el.style.transform = "none"

  try {
    // Chart hosts observe size — give them a couple frames to resize ECharts.
    await nextFrame()
    await nextFrame()
    resizeEchartsIn(el)
    await delay(150)
    return restore
  } catch (error) {
    restore()
    throw error
  }
}

/** Width needed so `[data-export-expand]` scrollers can show their full content. */
function measureExportWidth(el: HTMLElement, minWidth: number): number {
  let targetWidth = minWidth
  for (const node of el.querySelectorAll<HTMLElement>("[data-export-expand]")) {
    const cs = getComputedStyle(node)
    const padX =
      (Number.parseFloat(cs.paddingLeft) || 0) +
      (Number.parseFloat(cs.paddingRight) || 0)
    const child = node.firstElementChild as HTMLElement | null
    const contentW = child?.offsetWidth ?? node.scrollWidth
    const chrome = Math.max(0, el.offsetWidth - node.clientWidth)
    const needed = contentW + padX + chrome + 8
    if (needed > targetWidth) targetWidth = needed
  }
  return targetWidth
}

/** Reveal horizontally scrolled chart content (e.g. calendar heatmap) for capture. */
function expandScrollersForExport(root: HTMLElement): () => void {
  const restores: Array<{
    el: HTMLElement
    overflow: string
    overflowX: string
    scrollLeft: number
  }> = []

  for (const node of root.querySelectorAll<HTMLElement>("[data-export-expand]")) {
    restores.push({
      el: node,
      overflow: node.style.overflow,
      overflowX: node.style.overflowX,
      scrollLeft: node.scrollLeft,
    })
    node.scrollLeft = 0
    node.style.overflow = "visible"
    node.style.overflowX = "visible"
  }

  return () => {
    for (const { el, overflow, overflowX, scrollLeft } of restores) {
      el.style.overflow = overflow
      el.style.overflowX = overflowX
      el.scrollLeft = scrollLeft
    }
  }
}

function resizeEchartsIn(root: HTMLElement) {
  for (const canvas of root.querySelectorAll("canvas")) {
    let node: HTMLElement | null = canvas.parentElement
    while (node && node !== root.parentElement) {
      const instance = echarts.getInstanceByDom(node)
      if (instance) {
        instance.resize()
        break
      }
      node = node.parentElement
    }
  }
}

// ── Hide / canvas swap ───────────────────────────────────────────────────────

type HiddenNode = {
  el: HTMLElement
  visibility: string
  display: string
}
type CanvasSwap = {
  canvas: HTMLCanvasElement
  img: HTMLImageElement
  display: string
}

function hideExcluded(
  root: HTMLElement,
  extraSelector?: string
): HiddenNode[] {
  const selector = extraSelector
    ? `[data-export-ignore], ${extraSelector}`
    : "[data-export-ignore]"
  return [...root.querySelectorAll<HTMLElement>(selector)].map((el) => {
    const visibility = el.style.visibility
    const display = el.style.display
    // Collapse ignored controls so the export matches the card without a hole.
    el.style.visibility = "hidden"
    el.style.display = "none"
    return { el, visibility, display }
  })
}

function restoreHidden(hidden: HiddenNode[]) {
  for (const { el, visibility, display } of hidden) {
    el.style.visibility = visibility
    el.style.display = display
  }
}

async function swapCanvasesForImages(
  root: HTMLElement,
  pixelRatio: number
): Promise<CanvasSwap[]> {
  const swaps: CanvasSwap[] = []

  for (const canvas of root.querySelectorAll("canvas")) {
    const dataUrl = snapshotChartCanvas(canvas, pixelRatio)
    if (!dataUrl) continue

    const img = document.createElement("img")
    img.src = dataUrl
    img.alt = ""
    img.setAttribute("data-export-canvas-snap", "")

    const cs = getComputedStyle(canvas)
    const isAbsolute =
      cs.position === "absolute" || canvas.style.position === "absolute"

    if (isAbsolute) {
      img.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;display:block;margin:0;"
    } else {
      img.style.cssText = [
        `width:${cs.width}`,
        `height:${cs.height}`,
        `display:block`,
        `margin:${cs.margin}`,
        `max-width:100%`,
        `object-fit:contain`,
        `pointer-events:none`,
      ].join(";")
    }

    const display = canvas.style.display
    canvas.style.display = "none"
    canvas.parentElement?.insertBefore(img, canvas)
    swaps.push({ canvas, img, display })
  }

  await Promise.all(
    swaps.map(
      ({ img }) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve()
            return
          }
          img.onload = () => resolve()
          img.onerror = () => resolve()
        })
    )
  )

  return swaps
}

/** Prefer ECharts hi-res export so charts stay sharp after layout scale. */
function snapshotChartCanvas(
  canvas: HTMLCanvasElement,
  pixelRatio: number
): string | null {
  let node: HTMLElement | null = canvas.parentElement
  while (node) {
    const instance = echarts.getInstanceByDom(node)
    if (instance) {
      try {
        return instance.getDataURL({
          type: "png",
          pixelRatio: Math.max(pixelRatio, 3),
          backgroundColor: "transparent",
        })
      } catch {
        break
      }
    }
    node = node.parentElement
  }
  try {
    return canvas.toDataURL("image/png")
  } catch {
    return null
  }
}

function restoreCanvases(swaps: CanvasSwap[]) {
  for (const { canvas, img, display } of swaps) {
    img.remove()
    canvas.style.display = display
  }
}

// ── Composite rasterize (charts + HTML overlays) ─────────────────────────────

function resolveBackground(
  element: HTMLElement,
  override?: string
): string {
  if (override) return cssColorToRgb(override)
  const bg = getComputedStyle(element).backgroundColor
  if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") {
    return cssColorToRgb(
      getComputedStyle(document.body).backgroundColor || "#ffffff"
    )
  }
  return cssColorToRgb(bg)
}

/**
 * Paint the card from live layout: chart snapshot images, then HTML overlays
 * (titles, legends, swatches). Avoids fragile SVG foreignObject for legends.
 * `dom` mode paints full HTML (bars, borders, icons) for list-style cards.
 */
async function renderElementComposite(
  element: HTMLElement,
  width: number,
  height: number,
  pixelRatio: number,
  backgroundColor: string,
  captureMode: "chart" | "dom"
): Promise<string> {
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(width * pixelRatio)
  canvas.height = Math.round(height * pixelRatio)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas unsupported")
  ctx.scale(pixelRatio, pixelRatio)

  const rootRadius = parseCssRadius(
    getComputedStyle(element).borderRadius,
    width,
    height
  )

  ctx.save()
  roundRect(ctx, 0, 0, width, height, rootRadius || 12)
  ctx.clip()

  ctx.fillStyle = backgroundColor
  ctx.fill()

  const root = element.getBoundingClientRect()

  if (captureMode === "dom") {
    paintDomSurfaces(ctx, element, root)
    await paintSvgIcons(ctx, element, root)
    paintSvgTextElements(ctx, element, root)
    paintTextOverlays(ctx, element, root)
  } else {
    // Chart snapshots first (under legends).
    for (const img of element.querySelectorAll("img")) {
      if (!img.complete || img.naturalWidth === 0) continue
      if (isExportIgnored(img)) continue
      const r = img.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      ctx.drawImage(
        img,
        r.left - root.left,
        r.top - root.top,
        Math.max(r.width, 1),
        Math.max(r.height, 1)
      )
    }
    paintHtmlOverlays(ctx, element, root)
  }

  ctx.restore()

  // Thin outline so ring/edge still reads after clip.
  const ring = ringStrokeFromStyle(getComputedStyle(element))
  if (ring) {
    ctx.strokeStyle = ring
    ctx.lineWidth = 1
    roundRect(ctx, 0.5, 0.5, width - 1, height - 1, rootRadius || 12)
    ctx.stroke()
  }

  return canvas.toDataURL("image/png")
}

function ringStrokeFromStyle(cs: CSSStyleDeclaration): string | null {
  const shadow = cs.boxShadow
  if (!shadow || shadow === "none") return null
  const match = shadow.match(/rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8}/i)
  return match ? cssColorToRgb(match[0]!) : null
}

function isExportIgnored(el: Element): boolean {
  return Boolean(
    el.closest("[data-export-ignore]") ||
      el.closest('[style*="visibility: hidden"]')
  )
}

function isHidden(el: HTMLElement, cs: CSSStyleDeclaration): boolean {
  if (cs.visibility === "hidden" || cs.display === "none") return true
  if (Number.parseFloat(cs.opacity || "1") === 0) return true
  if (el.style.visibility === "hidden") return true
  return false
}

/** Full DOM surfaces: backgrounds (any size) + borders, tree order. */
function paintDomSurfaces(
  ctx: CanvasRenderingContext2D,
  element: HTMLElement,
  root: DOMRect
) {
  for (const el of element.querySelectorAll<HTMLElement>("*")) {
    if (el.tagName === "IMG" || el.tagName === "CANVAS" || el.tagName === "SVG") {
      continue
    }
    if (el.closest("[data-export-ignore]")) continue

    const cs = getComputedStyle(el)
    if (isHidden(el, cs)) continue

    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue

    const x = r.left - root.left
    const y = r.top - root.top
    const alpha = Number.parseFloat(cs.opacity || "1")
    const radius = parseCssRadius(cs.borderRadius, r.width, r.height)

    const fill = solidFillFromStyle(cs)
    if (fill) {
      ctx.save()
      ctx.globalAlpha = Number.isFinite(alpha) ? alpha : 1
      ctx.fillStyle = fill
      roundRect(ctx, x, y, r.width, r.height, radius)
      ctx.fill()
      ctx.restore()
    }

    paintBorders(ctx, cs, x, y, r.width, r.height, radius, alpha)
  }
}

function paintBorders(
  ctx: CanvasRenderingContext2D,
  cs: CSSStyleDeclaration,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  alpha: number
) {
  const sides: Array<{
    width: number
    color: string
    draw: () => void
  }> = [
    {
      width: Number.parseFloat(cs.borderTopWidth) || 0,
      color: cs.borderTopColor,
      draw: () => {
        ctx.beginPath()
        ctx.moveTo(x + radius, y + 0.5)
        ctx.lineTo(x + w - radius, y + 0.5)
        ctx.stroke()
      },
    },
    {
      width: Number.parseFloat(cs.borderRightWidth) || 0,
      color: cs.borderRightColor,
      draw: () => {
        ctx.beginPath()
        ctx.moveTo(x + w - 0.5, y + radius)
        ctx.lineTo(x + w - 0.5, y + h - radius)
        ctx.stroke()
      },
    },
    {
      width: Number.parseFloat(cs.borderBottomWidth) || 0,
      color: cs.borderBottomColor,
      draw: () => {
        ctx.beginPath()
        ctx.moveTo(x + radius, y + h - 0.5)
        ctx.lineTo(x + w - radius, y + h - 0.5)
        ctx.stroke()
      },
    },
    {
      width: Number.parseFloat(cs.borderLeftWidth) || 0,
      color: cs.borderLeftColor,
      draw: () => {
        ctx.beginPath()
        ctx.moveTo(x + 0.5, y + radius)
        ctx.lineTo(x + 0.5, y + h - radius)
        ctx.stroke()
      },
    },
  ]

  for (const side of sides) {
    if (side.width < 0.5) continue
    const color = cssColorToRgb(side.color)
    if (!color || color === "transparent") continue
    ctx.save()
    ctx.globalAlpha = Number.isFinite(alpha) ? alpha : 1
    ctx.strokeStyle = color
    ctx.lineWidth = side.width
    side.draw()
    ctx.restore()
  }
}

async function paintSvgIcons(
  ctx: CanvasRenderingContext2D,
  element: HTMLElement,
  root: DOMRect
) {
  const svgs = [...element.querySelectorAll("svg")].filter((svg) => {
    if (svg.closest("[data-export-ignore]")) return false
    const parent = svg.parentElement
    if (parent) {
      const cs = getComputedStyle(parent)
      if (isHidden(parent, cs)) return false
    }
    const r = svg.getBoundingClientRect()
    return r.width >= 1 && r.height >= 1
  })

  await Promise.all(
    svgs.map(async (svg) => {
      const r = svg.getBoundingClientRect()
      const color = cssColorToRgb(getComputedStyle(svg).color)
      const clone = svg.cloneNode(true) as SVGSVGElement
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
      if (!clone.getAttribute("width")) {
        clone.setAttribute("width", String(Math.max(r.width, 1)))
      }
      if (!clone.getAttribute("height")) {
        clone.setAttribute("height", String(Math.max(r.height, 1)))
      }
      // Word labels are painted via paintSvgTextElements (page fonts + resolved
      // fills). Strip them here so we don't double-draw or lose oklch/web fonts.
      for (const text of clone.querySelectorAll("text")) {
        text.remove()
      }
      if (!clone.querySelector("path, circle, rect, line, polyline, polygon, use, image")) {
        return
      }
      let xml = new XMLSerializer().serializeToString(clone)
      if (color) {
        xml = xml.replaceAll("currentColor", color)
      }
      const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`
      const img = await loadImage(url)
      if (!img) return
      ctx.drawImage(
        img,
        r.left - root.left,
        r.top - root.top,
        Math.max(r.width, 1),
        Math.max(r.height, 1)
      )
    })
  )
}

/**
 * Paint SVG `<text>` from the live DOM (word clouds, etc.).
 * Uses computed fonts/fills so the export matches on-screen rendering — unlike
 * serializing the SVG to a data-URL image (which drops oklch + web fonts).
 */
function paintSvgTextElements(
  ctx: CanvasRenderingContext2D,
  element: HTMLElement,
  root: DOMRect
) {
  for (const textEl of element.querySelectorAll("svg text")) {
    if (textEl.closest("[data-export-ignore]")) continue
    const content = textEl.textContent?.replace(/\s+/g, " ").trim() ?? ""
    if (!content) continue

    const cs = getComputedStyle(textEl)
    // SVG elements aren't HTMLElement — reuse the same visibility checks.
    if (cs.visibility === "hidden" || cs.display === "none") continue
    const alpha = Number.parseFloat(cs.opacity || "1")
    if (!Number.isFinite(alpha) || alpha < 0.05) continue

    const r = textEl.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue

    const fillRaw = cs.fill && cs.fill !== "none" ? cs.fill : cs.color
    const fill = cssColorToRgb(fillRaw)

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = fill
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(
      content,
      r.left - root.left + r.width / 2,
      r.top - root.top + r.height / 2
    )
    ctx.restore()
  }
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/** Draw HTML legends/labels/swatches from measured DOM boxes. */
function paintHtmlOverlays(
  ctx: CanvasRenderingContext2D,
  element: HTMLElement,
  root: DOMRect
) {
  // Color swatches (legend indicators, etc.) — small opaque boxes only.
  for (const el of element.querySelectorAll<HTMLElement>("*")) {
    if (el.tagName === "IMG" || el.tagName === "CANVAS" || el.tagName === "SVG") {
      continue
    }
    if (el.closest("[data-export-ignore]")) continue
    if (el.hasAttribute("data-export-canvas-snap")) continue

    const cs = getComputedStyle(el)
    if (isHidden(el, cs)) continue

    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1 || r.width > 28 || r.height > 28) continue

    const fill = solidFillFromStyle(cs)
    if (!fill) continue

    const alpha = Number.parseFloat(cs.opacity || "1")
    ctx.save()
    ctx.globalAlpha = Number.isFinite(alpha) ? alpha : 1
    ctx.fillStyle = fill
    const radius = parseCssRadius(cs.borderRadius, r.width, r.height)
    roundRect(
      ctx,
      r.left - root.left,
      r.top - root.top,
      r.width,
      r.height,
      radius
    )
    ctx.fill()
    ctx.restore()
  }

  paintTextOverlays(ctx, element, root)
}

function paintTextOverlays(
  ctx: CanvasRenderingContext2D,
  element: HTMLElement,
  root: DOMRect
) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  let node: Node | null = walker.nextNode()
  while (node) {
    const parent = node.parentElement
    const text = node.textContent?.replace(/\s+/g, " ").trim() ?? ""
    // SVG labels (word cloud) are handled by paintSvgTextElements.
    if (
      parent &&
      text &&
      !parent.closest("svg") &&
      !parent.closest("[data-export-ignore]")
    ) {
      const cs = getComputedStyle(parent)
      if (!isHidden(parent, cs)) {
        const range = document.createRange()
        range.selectNodeContents(node)
        const r = range.getBoundingClientRect()
        if (r.width >= 1 && r.height >= 1) {
          const alpha = Number.parseFloat(cs.opacity || "1")
          const fontSize = Number.parseFloat(cs.fontSize) || 16
          // Emoji glyphs often paint above the CSS em-box; pad the clip so tops aren't shaved.
          const emoji = looksLikeEmoji(text)
          const padX = emoji ? Math.ceil(fontSize * 0.15) : 0
          const padY = emoji ? Math.ceil(fontSize * 0.25) : 0
          ctx.save()
          ctx.globalAlpha = Number.isFinite(alpha) ? alpha : 1
          ctx.fillStyle = cssColorToRgb(cs.color)
          ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
          ctx.textBaseline = "top"
          const parentRect = parent.getBoundingClientRect()
          ctx.beginPath()
          ctx.rect(
            parentRect.left - root.left - padX,
            parentRect.top - root.top - padY,
            parentRect.width + padX * 2,
            parentRect.height + padY * 2
          )
          ctx.clip()
          ctx.fillText(text, r.left - root.left, r.top - root.top)
          ctx.restore()
        }
      }
    }
    node = walker.nextNode()
  }
}

function looksLikeEmoji(text: string): boolean {
  try {
    return /\p{Extended_Pictographic}/u.test(text)
  } catch {
    // Older engines without Unicode property escapes.
    return text.length <= 8 && /[^\u0000-\u00ff]/.test(text)
  }
}

function solidFillFromStyle(cs: CSSStyleDeclaration): string | null {
  const bg = cs.backgroundColor
  if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
    return cssColorToRgb(bg)
  }
  const image = cs.backgroundImage
  if (image && image !== "none") {
    const match = image.match(/rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8}/i)
    if (match) return cssColorToRgb(match[0]!)
  }
  return null
}

function parseCssRadius(
  value: string,
  width: number,
  height: number
): number {
  if (!value || value === "0px") return 0
  const first = value.split(" ")[0] ?? "0"
  if (first.endsWith("%")) {
    const pct = Number.parseFloat(first)
    return Number.isFinite(pct)
      ? Math.min(width, height) * (pct / 100)
      : 0
  }
  const px = Number.parseFloat(first)
  return Number.isFinite(px) ? px : 0
}

function cssColorToRgb(color: string): string {
  if (
    !color ||
    color === "transparent" ||
    color.startsWith("#") ||
    color.startsWith("rgb")
  ) {
    return color || "#ffffff"
  }
  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext("2d")
  if (!ctx) return "#ffffff"
  ctx.fillStyle = "#ffffff"
  ctx.fillStyle = color
  try {
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    if (a === 0) return "transparent"
    if (a === 255) return `rgb(${r}, ${g}, ${b})`
    return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
  } catch {
    return "#ffffff"
  }
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob | null> {
  const res = await fetch(dataUrl)
  return res.blob()
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function roundRect(
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
