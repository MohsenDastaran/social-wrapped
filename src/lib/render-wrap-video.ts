import {
  canRenderMediaOnWeb,
  renderMediaOnWeb,
} from "@remotion/web-renderer"

import {
  SocialWrappedVideo,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  slidesIncludeClock,
  slidesIncludeEmojis,
  slidesIncludeHeatmap,
  slidesIncludeWordCloud,
  videoDurationFrames,
  type SocialWrappedVideoProps,
  type VideoChartSlide,
} from "@sw-remotion/Composition"

type RenderAttempt = {
  scale: number
  videoBitrate: "medium" | "high" | "very-high"
  label: string
}

export type WrapVideoQuality = "normal" | "high"

/** Prefer full story resolution; fall back if WebCodecs can't handle it.
 * Scales keep even pixel sizes (H.264-friendly): 1080×1920, 720×1280, 540×960.
 */
const QUALITY_ATTEMPTS: Record<WrapVideoQuality, RenderAttempt[]> = {
  /** Faster encode — good for Stories / quick shares. */
  normal: [
    { scale: 720 / 1080, videoBitrate: "medium", label: "720p" },
    { scale: 0.5, videoBitrate: "medium", label: "540p" },
  ],
  /** Full 1080×1920 — sharper, but can take several minutes in-browser. */
  high: [
    { scale: 1, videoBitrate: "high", label: "1080p" },
    { scale: 720 / 1080, videoBitrate: "high", label: "720p" },
    { scale: 0.5, videoBitrate: "medium", label: "540p" },
  ],
}

/**
 * Remotion `<Img>` calls `HTMLImageElement.decode()`, which often fails on
 * multi‑MB 1080×1920 story PNGs (and logs EncodingError) even when the image
 * still paints via onload. Re-encode as JPEG at video size for reliable decode.
 */
export async function compressImageForVideo(src: string): Promise<string> {
  if (src.startsWith("data:image/jpeg")) return src

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error("Failed to load chart image"))
    el.src = src
  })

  const canvas = document.createElement("canvas")
  canvas.width = VIDEO_WIDTH
  canvas.height = VIDEO_HEIGHT
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas unsupported")

  ctx.fillStyle = "#041512"
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT)

  const scale = Math.min(
    VIDEO_WIDTH / Math.max(img.naturalWidth, 1),
    VIDEO_HEIGHT / Math.max(img.naturalHeight, 1)
  )
  const drawW = img.naturalWidth * scale
  const drawH = img.naturalHeight * scale
  ctx.drawImage(
    img,
    (VIDEO_WIDTH - drawW) / 2,
    (VIDEO_HEIGHT - drawH) / 2,
    drawW,
    drawH
  )

  return canvas.toDataURL("image/jpeg", 0.88)
}

/** Bake chart slides into compact JPEG data URLs for Player + web encode. */
export async function prepareChartSlidesForVideo(
  slides: VideoChartSlide[],
  onProgress?: (progress: number) => void
): Promise<VideoChartSlide[]> {
  if (slides.length === 0) return slides

  const prepared: VideoChartSlide[] = []
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]!
    prepared.push({
      ...slide,
      src: await compressImageForVideo(slide.src),
    })
    onProgress?.(((i + 1) / slides.length) * 0.08)
  }
  return prepared
}

async function preparePropsForRender(
  props: SocialWrappedVideoProps,
  onProgress?: (progress: number) => void
): Promise<SocialWrappedVideoProps> {
  const slides = props.chartSlides ?? []
  if (slides.length === 0) return props
  // Already JPEG data URLs from the Player prep path — skip a second pass.
  if (slides.every((s) => s.src.startsWith("data:image/jpeg"))) {
    onProgress?.(0.08)
    return props
  }

  return {
    ...props,
    chartSlides: await prepareChartSlidesForVideo(slides, onProgress),
  }
}

function isAbortError(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return true
  if (error instanceof DOMException && error.name === "AbortError") return true
  if (error instanceof Error && /abort|cancel/i.test(error.message)) return true
  return false
}

async function renderOnce(
  props: SocialWrappedVideoProps,
  attempt: RenderAttempt,
  options?: {
    signal?: AbortSignal
    onProgress?: (progress: number) => void
  }
): Promise<Blob> {
  const slides = props.chartSlides ?? []
  const durationInFrames = videoDurationFrames(slides.length, {
    includeHeatmapSticker: slidesIncludeHeatmap(slides),
    includeClockSticker: slidesIncludeClock(slides),
    includeWordCloudSticker: slidesIncludeWordCloud(slides),
    includeEmojiSticker: slidesIncludeEmojis(slides),
  })

  const support = await canRenderMediaOnWeb({
    container: "mp4",
    videoCodec: "h264",
    muted: false,
    width: Math.round(VIDEO_WIDTH * attempt.scale / 2) * 2,
    height: Math.round(VIDEO_HEIGHT * attempt.scale / 2) * 2,
  })
  if (!support.canRender) {
    const detail = support.issues
      .filter((i) => i.severity === "error")
      .map((i) => i.message)
      .join("; ")
    throw new Error(
      detail || `Browser cannot encode ${attempt.label} H.264 MP4`
    )
  }

  const { getBlob } = await renderMediaOnWeb({
    composition: {
      id: "SocialWrapped",
      component: SocialWrappedVideo,
      durationInFrames,
      fps: VIDEO_FPS,
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
      defaultProps: {
        displayName: "You",
        totalMessages: 0,
        sentMessages: 0,
        receivedMessages: 0,
        chatCount: 0,
        platformName: props.platformName || "Telegram",
        chartSlides: [],
      },
    },
    inputProps: props,
    container: "mp4",
    videoCodec: "h264",
    muted: false,
    audioCodec: "aac",
    scale: attempt.scale,
    videoBitrate: attempt.videoBitrate,
    // Prefer software when full-res hardware encode silently stalls.
    hardwareAcceleration:
      attempt.scale >= 1 ? "prefer-software" : "no-preference",
    licenseKey: "free-license",
    signal: options?.signal,
    onProgress: ({ progress }) => {
      // Reserve 0–8% for image prep; map encode onto 8–100%.
      options?.onProgress?.(0.08 + progress * 0.92)
    },
  })

  return getBlob()
}

/** Client-side MP4 render for share/download. */
export async function renderWrapVideoBlob(
  props: SocialWrappedVideoProps,
  options?: {
    signal?: AbortSignal
    onProgress?: (progress: number) => void
    /** Download quality — defaults to normal (720p-first). */
    quality?: WrapVideoQuality
    /** @deprecated Prefer `quality`. Force a single scale (skips fallback chain). */
    scale?: number
  }
): Promise<Blob> {
  options?.onProgress?.(0.01)
  const prepared = await preparePropsForRender(props, options?.onProgress)
  if (options?.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError")
  }

  const quality = options?.quality ?? "normal"
  const attempts = options?.scale
    ? QUALITY_ATTEMPTS.high.filter((a) => a.scale === options.scale).length > 0
      ? QUALITY_ATTEMPTS.high.filter((a) => a.scale === options.scale)
      : ([
          {
            scale: options.scale,
            videoBitrate: "high" as const,
            label: `${Math.round(options.scale * 100)}%`,
          },
        ] satisfies RenderAttempt[])
    : QUALITY_ATTEMPTS[quality]

  let lastError: unknown = null

  for (const attempt of attempts) {
    if (options?.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError")
    }
    try {
      options?.onProgress?.(Math.max(0.08, 0.08))
      return await renderOnce(prepared, attempt, options)
    } catch (error) {
      if (isAbortError(error, options?.signal)) throw error
      lastError = error
      console.warn(
        `[wrap-video] ${attempt.label} encode failed, trying fallback…`,
        error
      )
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Video encode failed at all quality levels")
}
