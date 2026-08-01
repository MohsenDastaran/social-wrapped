import {
  canRenderMediaOnWeb,
  renderMediaOnWeb,
} from "@remotion/web-renderer"

import {
  SocialWrappedVideo,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  videoDurationFrames,
  type SocialWrappedVideoProps,
  type VideoChartSlide,
} from "@sw-remotion/Composition"

type RenderAttempt = {
  scale: number
  videoBitrate: "medium" | "high" | "very-high"
  label: string
}

/** Prefer full story resolution; fall back if WebCodecs can't handle it.
 * Scales keep even pixel sizes (H.264-friendly): 1080×1920, 720×1280, 540×960.
 */
const RENDER_ATTEMPTS: RenderAttempt[] = [
  { scale: 1, videoBitrate: "high", label: "1080p" },
  { scale: 720 / 1080, videoBitrate: "high", label: "720p" },
  { scale: 0.5, videoBitrate: "medium", label: "540p" },
]

async function blobOrUrlToDataUrl(src: string): Promise<string> {
  if (src.startsWith("data:")) return src
  const response = await fetch(src)
  if (!response.ok) {
    throw new Error(`Failed to read media (${response.status})`)
  }
  const blob = await response.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read image as data URL"))
    reader.readAsDataURL(blob)
  })
}

/** Web renderer often can't resolve `blob:` URLs — bake charts into data URLs. */
async function preparePropsForRender(
  props: SocialWrappedVideoProps,
  onProgress?: (progress: number) => void
): Promise<SocialWrappedVideoProps> {
  const slides = props.chartSlides ?? []
  if (slides.length === 0) return props

  const prepared: VideoChartSlide[] = []
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]!
    prepared.push({
      ...slide,
      src: await blobOrUrlToDataUrl(slide.src),
    })
    // 0 → ~8% while hydrating chart frames for encode.
    onProgress?.(((i + 1) / slides.length) * 0.08)
  }

  return { ...props, chartSlides: prepared }
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
  const durationInFrames = videoDurationFrames(props.chartSlides?.length ?? 0)

  const support = await canRenderMediaOnWeb({
    container: "mp4",
    videoCodec: "h264",
    muted: true,
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
        platformName: "Telegram",
        chartSlides: [],
      },
    },
    inputProps: props,
    container: "mp4",
    videoCodec: "h264",
    muted: true,
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
    /** Force a single scale (skips fallback chain). */
    scale?: number
  }
): Promise<Blob> {
  options?.onProgress?.(0.01)
  const prepared = await preparePropsForRender(props, options?.onProgress)
  if (options?.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError")
  }

  const attempts = options?.scale
    ? RENDER_ATTEMPTS.filter((a) => a.scale === options.scale).length > 0
      ? RENDER_ATTEMPTS.filter((a) => a.scale === options.scale)
      : ([
          {
            scale: options.scale,
            videoBitrate: "high" as const,
            label: `${Math.round(options.scale * 100)}%`,
          },
        ] satisfies RenderAttempt[])
    : RENDER_ATTEMPTS

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
