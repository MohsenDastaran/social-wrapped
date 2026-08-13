import {
  canRenderMediaOnWeb,
  renderMediaOnWeb,
} from "@remotion/web-renderer"
import { AbsoluteFill, Img, useCurrentFrame } from "remotion"

const FPS = 20
const MAX_EDGE = 1280

/** Frames live on the module so Remotion does not serialize megabytes of props. */
let raceFrames: string[] = []

function RaceExportVideo() {
  const frame = useCurrentFrame()
  const src = raceFrames[Math.min(Math.max(frame, 0), raceFrames.length - 1)] ?? ""
  return (
    <AbsoluteFill style={{ backgroundColor: "#0c0a09" }}>
      {src ? (
        <Img
          src={src}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : null}
    </AbsoluteFill>
  )
}

function even(n: number): number {
  const rounded = Math.max(2, Math.round(n))
  return rounded % 2 === 0 ? rounded : rounded + 1
}

function isAbortError(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return true
  if (error instanceof DOMException && error.name === "AbortError") return true
  if (error instanceof Error && /abort|cancel/i.test(error.message)) return true
  return false
}

export function raceExportFps(): number {
  return FPS
}

export function raceExportSize(
  width: number,
  height: number
): { width: number; height: number } {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height, 1))
  return {
    width: even(width * scale),
    height: even(height * scale),
  }
}

export async function canEncodeRaceMp4(): Promise<boolean> {
  try {
    const support = await canRenderMediaOnWeb({
      container: "mp4",
      videoCodec: "h264",
      muted: true,
      width: 640,
      height: 360,
    })
    return support.canRender
  } catch {
    return false
  }
}

export async function renderRaceMp4(options: {
  frames: string[]
  width: number
  height: number
  signal?: AbortSignal
  onProgress?: (progress: number) => void
}): Promise<Blob> {
  const frames = options.frames
  if (frames.length < 2) {
    throw new Error("Not enough frames to encode a video")
  }

  const size = raceExportSize(options.width, options.height)
  raceFrames = frames
  options.onProgress?.(0.02)

  try {
    const support = await canRenderMediaOnWeb({
      container: "mp4",
      videoCodec: "h264",
      muted: true,
      width: size.width,
      height: size.height,
    })
    if (!support.canRender) {
      const detail = support.issues
        .filter((i) => i.severity === "error")
        .map((i) => i.message)
        .join("; ")
      throw new Error(detail || "This browser cannot encode H.264 MP4")
    }

    if (options.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError")
    }

    const { getBlob } = await renderMediaOnWeb({
      composition: {
        id: "ContactBarRace",
        component: RaceExportVideo,
        durationInFrames: frames.length,
        fps: FPS,
        width: size.width,
        height: size.height,
        defaultProps: {},
      },
      inputProps: {},
      container: "mp4",
      videoCodec: "h264",
      muted: true,
      scale: 1,
      videoBitrate: "high",
      hardwareAcceleration: "prefer-software",
      licenseKey: "free-license",
      signal: options.signal,
      onProgress: ({ progress }) => {
        options.onProgress?.(0.08 + progress * 0.92)
      },
    })

    return getBlob()
  } catch (error) {
    if (isAbortError(error, options.signal)) {
      throw error instanceof DOMException
        ? error
        : new DOMException("Aborted", "AbortError")
    }
    throw error
  } finally {
    raceFrames = []
  }
}
