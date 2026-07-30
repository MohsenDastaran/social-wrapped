/** Trigger a browser download for a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/** Draw a simple branded PNG mock (placeholder until real exports land). */
export function downloadMockPng(
  filename: string,
  opts: {
    title: string
    subtitle?: string
    lines?: string[]
    width?: number
    height?: number
    gradient?: [string, string, string]
  }
): void {
  const width = opts.width ?? 1080
  const height = opts.height ?? 1920
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const [c0, c1, c2] = opts.gradient ?? ["#0f766e", "#0ea5e9", "#f59e0b"]
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, c0)
  gradient.addColorStop(0.55, c1)
  gradient.addColorStop(1, c2)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = "rgba(255,255,255,0.12)"
  ctx.beginPath()
  ctx.arc(width * 0.85, height * 0.12, width * 0.28, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(width * 0.1, height * 0.75, width * 0.35, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#ffffff"
  ctx.font = `600 ${Math.round(width * 0.045)}px system-ui, sans-serif`
  ctx.fillText("Social Wrapped", width * 0.08, height * 0.12)

  ctx.font = `700 ${Math.round(width * 0.09)}px system-ui, sans-serif`
  wrapCanvasText(ctx, opts.title, width * 0.08, height * 0.28, width * 0.84, Math.round(width * 0.1))

  if (opts.subtitle) {
    ctx.globalAlpha = 0.85
    ctx.font = `500 ${Math.round(width * 0.04)}px system-ui, sans-serif`
    wrapCanvasText(
      ctx,
      opts.subtitle,
      width * 0.08,
      height * 0.42,
      width * 0.84,
      Math.round(width * 0.055)
    )
    ctx.globalAlpha = 1
  }

  if (opts.lines?.length) {
    let y = height * 0.55
    ctx.font = `600 ${Math.round(width * 0.05)}px system-ui, sans-serif`
    for (const line of opts.lines) {
      ctx.fillText(line, width * 0.08, y)
      y += width * 0.08
    }
  }

  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, filename)
  }, "image/png")
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): void {
  const words = text.split(" ")
  let line = ""
  let cy = y
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy)
      line = word
      cy += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, cy)
}

/** Record a short mock WebM from an animated canvas (shareable placeholder). */
export async function recordMockVideo(
  filename: string,
  drawFrame: (ctx: CanvasRenderingContext2D, t: number) => void,
  durationMs = 2400
): Promise<void> {
  const canvas = document.createElement("canvas")
  canvas.width = 720
  canvas.height = 1280
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const stream = canvas.captureStream(30)
  const recorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm",
  })
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }))
  })

  recorder.start()
  const start = performance.now()

  await new Promise<void>((resolve) => {
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      drawFrame(ctx, t)
      if (t < 1) {
        requestAnimationFrame(tick)
      } else {
        resolve()
      }
    }
    requestAnimationFrame(tick)
  })

  recorder.stop()
  downloadBlob(await done, filename)
}
