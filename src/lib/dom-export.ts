import * as echarts from "echarts/core"

import { downloadBlob } from "@/lib/mock-export"

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
 */
export async function elementToPngBlob(
  element: HTMLElement,
  options: DomExportOptions = {}
): Promise<Blob> {
  const minWidth = options.minWidth ?? 720
  const pixelRatio = options.pixelRatio ?? 3

  const layoutRestore = await expandForExport(element, minWidth)
  const hidden = hideExcluded(element, options.excludeSelector)
  const canvasSwaps = await swapCanvasesForImages(element, pixelRatio)

  try {
    await nextFrame()
    await nextFrame()

    const width = Math.max(element.offsetWidth, 1)
    const height = Math.max(element.offsetHeight, 1)
    const backgroundColor = resolveBackground(
      element,
      options.backgroundColor
    )

    const dataUrl = await renderElementViaSvg(element, width, height, pixelRatio, {
      backgroundColor,
    }).catch(async () =>
      renderElementComposite(element, width, height, pixelRatio, backgroundColor)
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
    // Let chart hosts ResizeObserver reflow back to on-screen size.
    window.dispatchEvent(new Event("resize"))
  }
}

/** Capture `element` and trigger a browser download. */
export async function downloadElementAsPng(
  element: HTMLElement,
  filename: string,
  options?: DomExportOptions
): Promise<void> {
  const blob = await elementToPngBlob(element, options)
  const name = filename.toLowerCase().endsWith(".png")
    ? filename
    : `${filename}.png`
  downloadBlob(blob, name)
}

// ── Layout expansion (mobile → share size) ───────────────────────────────────

async function expandForExport(
  el: HTMLElement,
  minWidth: number
): Promise<() => void> {
  if (el.offsetWidth >= minWidth - 1) {
    return () => undefined
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

  el.style.position = "fixed"
  el.style.left = "-12000px"
  el.style.top = "0"
  el.style.width = `${minWidth}px`
  el.style.maxWidth = `${minWidth}px`
  el.style.minWidth = `${minWidth}px`
  el.style.zIndex = "0"
  el.style.opacity = "1"
  el.style.pointerEvents = "none"
  el.style.transform = "none"

  // Chart hosts observe size — give them a couple frames to resize ECharts.
  await nextFrame()
  await nextFrame()
  resizeEchartsIn(el)
  await delay(150)

  return () => {
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
    resizeEchartsIn(el)
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

type HiddenNode = { el: HTMLElement; visibility: string }
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
    el.style.visibility = "hidden"
    return { el, visibility }
  })
}

function restoreHidden(hidden: HiddenNode[]) {
  for (const { el, visibility } of hidden) {
    el.style.visibility = visibility
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

// ── SVG foreignObject rasterize ──────────────────────────────────────────────

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

async function renderElementViaSvg(
  element: HTMLElement,
  width: number,
  height: number,
  pixelRatio: number,
  opts: { backgroundColor: string }
): Promise<string> {
  const clone = element.cloneNode(true) as HTMLElement
  inlineStyles(element, clone)
  clone.style.margin = "0"
  clone.style.boxSizing = "border-box"
  clone.querySelectorAll("[data-export-ignore]").forEach((n) => n.remove())

  const wrapper = document.createElement("div")
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml")
  wrapper.style.cssText = `width:${width}px;height:${height}px;background:${opts.backgroundColor};box-sizing:border-box;overflow:hidden;`
  wrapper.appendChild(clone)

  const xhtml = new XMLSerializer().serializeToString(wrapper)
  const svgW = Math.round(width * pixelRatio)
  const svgH = Math.round(height * pixelRatio)
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${width} ${height}">
  <foreignObject x="0" y="0" width="100%" height="100%">
    ${xhtml}
  </foreignObject>
</svg>`

  const svgUrl = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
  )

  try {
    const img = await loadImage(svgUrl)
    const canvas = document.createElement("canvas")
    canvas.width = svgW
    canvas.height = svgH
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas unsupported")
    ctx.fillStyle = opts.backgroundColor
    ctx.fillRect(0, 0, svgW, svgH)
    ctx.drawImage(img, 0, 0, svgW, svgH)
    return canvas.toDataURL("image/png")
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

const STYLE_PROPS = [
  "background",
  "background-color",
  "background-image",
  "border",
  "border-radius",
  "box-shadow",
  "box-sizing",
  "color",
  "display",
  "flex",
  "flex-direction",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "align-items",
  "justify-content",
  "gap",
  "grid-template-columns",
  "grid-template-rows",
  "font",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "letter-spacing",
  "line-height",
  "text-align",
  "text-decoration",
  "text-transform",
  "white-space",
  "overflow",
  "overflow-x",
  "overflow-y",
  "opacity",
  "padding",
  "margin",
  "width",
  "height",
  "min-width",
  "min-height",
  "max-width",
  "max-height",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "inset",
  "z-index",
  "object-fit",
  "object-position",
  "transform",
  "clip-path",
  "visibility",
] as const

/** Copy computed visual styles; convert modern color spaces to rgb for SVG. */
function inlineStyles(source: Element, clone: Element) {
  if (
    source.nodeType !== Node.ELEMENT_NODE ||
    clone.nodeType !== Node.ELEMENT_NODE
  ) {
    return
  }
  const srcEl = source as HTMLElement
  const dstEl = clone as HTMLElement
  const computed = getComputedStyle(srcEl)
  let css = ""
  for (const prop of STYLE_PROPS) {
    let value = computed.getPropertyValue(prop)
    if (!value) continue
    if (
      prop.includes("color") ||
      prop === "background" ||
      prop === "background-image" ||
      prop === "border" ||
      prop === "box-shadow"
    ) {
      value = sanitizeCssColors(value)
    }
    css += `${prop}:${value};`
  }
  dstEl.setAttribute("style", css)

  const srcChildren = srcEl.children
  const dstChildren = dstEl.children
  const n = Math.min(srcChildren.length, dstChildren.length)
  for (let i = 0; i < n; i++) {
    inlineStyles(srcChildren[i]!, dstChildren[i]!)
  }
}

function sanitizeCssColors(value: string): string {
  // Replace oklch/lab/color() tokens by sampling via canvas fillStyle.
  return value.replace(
    /(?:oklch|oklab|lab|lch|color)\([^)]+\)/gi,
    (match) => cssColorToRgb(match)
  )
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
  // If the browser accepted the color, read back pixels.
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

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to rasterize export SVG"))
    img.src = url
  })
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

/**
 * Fallback when SVG foreignObject fails (some WebViews reject oklch/fonts).
 * Paints the card chrome + every chart snapshot image at its on-screen box.
 */
async function renderElementComposite(
  element: HTMLElement,
  width: number,
  height: number,
  pixelRatio: number,
  backgroundColor: string
): Promise<string> {
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(width * pixelRatio)
  canvas.height = Math.round(height * pixelRatio)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas unsupported")
  ctx.scale(pixelRatio, pixelRatio)

  ctx.fillStyle = backgroundColor
  roundRect(ctx, 0, 0, width, height, 12)
  ctx.fill()

  const root = element.getBoundingClientRect()

  const title = element.querySelector("h3")
  if (title?.textContent) {
    const r = title.getBoundingClientRect()
    const cs = getComputedStyle(title)
    ctx.fillStyle = cssColorToRgb(cs.color)
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    ctx.textBaseline = "top"
    ctx.fillText(
      title.textContent,
      r.left - root.left,
      r.top - root.top,
      width - 32
    )
  }

  const desc = element.querySelector("p")
  if (desc?.textContent) {
    const r = desc.getBoundingClientRect()
    const cs = getComputedStyle(desc)
    ctx.fillStyle = cssColorToRgb(cs.color)
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    ctx.textBaseline = "top"
    ctx.fillText(
      desc.textContent,
      r.left - root.left,
      r.top - root.top,
      width - 32
    )
  }

  for (const img of element.querySelectorAll("img")) {
    if (!img.complete || img.naturalWidth === 0) continue
    const r = img.getBoundingClientRect()
    ctx.drawImage(
      img,
      r.left - root.left,
      r.top - root.top,
      Math.max(r.width, 1),
      Math.max(r.height, 1)
    )
  }

  return canvas.toDataURL("image/png")
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
