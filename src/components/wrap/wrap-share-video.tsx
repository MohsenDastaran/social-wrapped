import { Player, type PlayerRef } from "@remotion/player"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { MediaFullscreenChrome } from "@/components/media-fullscreen-chrome"
import { downloadMediaUrl } from "@/lib/media-share"
import {
  prepareChartSlidesForVideo,
  renderWrapVideoBlob,
} from "@/lib/render-wrap-video"
import {
  SocialWrappedVideo,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  videoDurationFrames,
  type SocialWrappedVideoProps,
  type VideoChartSlide,
} from "@sw-remotion/Composition"
import type { StoryCaptureProgress } from "@/lib/wrap-stories"
import { cn } from "@/lib/utils"

type WrapShareVideoProps = {
  displayName: string
  totalMessages: number
  sentMessages: number
  receivedMessages: number
  chatCount: number
  platformName?: string
  chartSlides?: VideoChartSlide[]
  /** Same gate as Stories — wait for chart captures before showing the reel. */
  ready: boolean
  captureProgress?: StoryCaptureProgress | null
  shareText: string
  shareFileName: string
  className?: string
}

type EncodeStatus = "idle" | "encoding" | "ready" | "error"

/** Remotion-powered wrap highlight reel for the share strip. */
export function WrapShareVideo({
  displayName,
  totalMessages,
  sentMessages,
  receivedMessages,
  chatCount,
  platformName = "Telegram",
  chartSlides = [],
  ready,
  captureProgress = null,
  shareText,
  shareFileName,
  className,
}: WrapShareVideoProps) {
  const [open, setOpen] = useState(false)
  const [mediaUrl, setMediaUrl] = useState("")
  const [renderProgress, setRenderProgress] = useState(0)
  const [encodeStatus, setEncodeStatus] = useState<EncodeStatus>("idle")
  const [videoSlides, setVideoSlides] = useState<VideoChartSlide[]>([])
  const [slidesReady, setSlidesReady] = useState(chartSlides.length === 0)
  const previewRef = useRef<PlayerRef>(null)
  const fullscreenRef = useRef<PlayerRef>(null)
  const mediaUrlRef = useRef("")
  const inputPropsRef = useRef<SocialWrappedVideoProps | null>(null)
  const encodePromiseRef = useRef<Promise<string> | null>(null)

  const chartSrcKey = chartSlides.map((s) => s.src).join("|")

  // Compress heavy story PNGs → JPEG data URLs so Remotion Img.decode() succeeds.
  useEffect(() => {
    let cancelled = false
    if (chartSlides.length === 0) {
      setVideoSlides([])
      setSlidesReady(true)
      return
    }

    setSlidesReady(false)
    void prepareChartSlidesForVideo(chartSlides)
      .then((next) => {
        if (cancelled) return
        setVideoSlides(next)
        setSlidesReady(true)
      })
      .catch((error) => {
        console.error("[wrap-video] chart slide prep failed", error)
        if (!cancelled) {
          setVideoSlides([])
          setSlidesReady(true)
        }
      })

    return () => {
      cancelled = true
    }
    // chartSrcKey tracks src identity; chartSlides array is rebuilt often.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartSrcKey])

  const inputProps = useMemo<SocialWrappedVideoProps>(
    () => ({
      displayName,
      totalMessages,
      sentMessages,
      receivedMessages,
      chatCount,
      platformName,
      chartSlides: videoSlides,
    }),
    [
      displayName,
      totalMessages,
      sentMessages,
      receivedMessages,
      chatCount,
      platformName,
      videoSlides,
    ]
  )
  inputPropsRef.current = inputProps

  const videoReady = ready && slidesReady
  const durationInFrames = videoDurationFrames(videoSlides.length)
  const playerKey = `${durationInFrames}-${chartSrcKey}-${videoSlides.map((s) => s.src.length).join("-")}`

  const clearMediaUrl = useCallback(() => {
    if (mediaUrlRef.current) {
      URL.revokeObjectURL(mediaUrlRef.current)
      mediaUrlRef.current = ""
    }
    setMediaUrl("")
  }, [])

  const encodeToObjectUrl = useCallback(
    async (signal?: AbortSignal, force = false): Promise<string> => {
      if (!force && mediaUrlRef.current) return mediaUrlRef.current
      if (!force && encodePromiseRef.current) return encodePromiseRef.current

      const props = inputPropsRef.current
      if (!props) throw new Error("Missing video props")

      const run = (async () => {
        setEncodeStatus("encoding")
        setRenderProgress(0)
        const blob = await renderWrapVideoBlob(props, {
          signal,
          onProgress: (p) => {
            if (!signal?.aborted) setRenderProgress(p)
          },
        })
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
        clearMediaUrl()
        const url = URL.createObjectURL(blob)
        mediaUrlRef.current = url
        setMediaUrl(url)
        setRenderProgress(1)
        setEncodeStatus("ready")
        return url
      })()

      encodePromiseRef.current = run
      try {
        return await run
      } catch (error) {
        encodePromiseRef.current = null
        const aborted =
          signal?.aborted ||
          (error instanceof DOMException && error.name === "AbortError") ||
          (error instanceof Error && /abort|cancel/i.test(error.message))
        if (aborted) throw error
        console.error("[wrap-video] render failed", error)
        setEncodeStatus("error")
        setRenderProgress(0)
        throw error
      } finally {
        if (encodePromiseRef.current === run) {
          encodePromiseRef.current = null
        }
      }
    },
    [clearMediaUrl]
  )

  // Background encode once charts are ready — keyed by playerKey so we don't
  // abort/restart on every inputProps object identity change.
  useEffect(() => {
    if (!videoReady) {
      setEncodeStatus("idle")
      setRenderProgress(0)
      clearMediaUrl()
      encodePromiseRef.current = null
      return
    }

    const controller = new AbortController()
    // Debounce past React Strict Mode remounts so we don't abort the real run.
    const timer = window.setTimeout(() => {
      void encodeToObjectUrl(controller.signal).catch(() => {
        // Error / abort already reflected in encodeStatus.
      })
    }, 400)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
      encodePromiseRef.current = null
    }
  }, [videoReady, playerKey, encodeToObjectUrl, clearMediaUrl])

  useEffect(() => {
    return () => {
      clearMediaUrl()
    }
  }, [clearMediaUrl])

  // Kick silent autoplay — audio tags / unmuted context can stall the clock.
  useEffect(() => {
    if (!videoReady) return
    let cancelled = false
    const kick = (ref: typeof previewRef) => {
      const player = ref.current
      if (!player || cancelled) return
      player.mute()
      if (!player.isPlaying()) player.play()
    }
    const timers = [
      window.setTimeout(() => kick(previewRef), 0),
      window.setTimeout(() => kick(previewRef), 100),
      window.setTimeout(() => kick(previewRef), 400),
    ]
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [videoReady, playerKey])

  useEffect(() => {
    if (!open || !videoReady) return
    let cancelled = false
    const kick = () => {
      const player = fullscreenRef.current
      if (!player || cancelled) return
      player.mute()
      if (!player.isPlaying()) player.play()
    }
    const timers = [
      window.setTimeout(kick, 0),
      window.setTimeout(kick, 100),
      window.setTimeout(kick, 400),
    ]
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [open, videoReady, playerKey])

  const handleRequestDownload = useCallback(async () => {
    const url = await encodeToObjectUrl(
      undefined,
      encodeStatus === "error" || !mediaUrlRef.current
    )
    await downloadMediaUrl(url, shareFileName)
  }, [encodeStatus, encodeToObjectUrl, shareFileName])

  const progressPct = Math.round(
    videoReady
      ? Math.max(renderProgress, 0) * 100
      : (captureProgress?.progress ?? 0) * 100
  )
  const loadingLabel = !ready
    ? (captureProgress?.label ?? "Preparing charts…")
    : !slidesReady
      ? "Preparing video frames…"
      : encodeStatus === "error"
        ? "Encode failed — open to retry"
        : `Encoding video… ${progressPct}%`
  const showLoading = !videoReady

  const renderReady = encodeStatus === "ready" && Boolean(mediaUrl)
  const downloadStatus =
    encodeStatus === "error"
      ? "Retry"
      : encodeStatus === "encoding"
        ? "Encoding"
        : "Preparing…"

  const playerCommon = {
    component: SocialWrappedVideo,
    inputProps,
    durationInFrames,
    compositionWidth: VIDEO_WIDTH,
    compositionHeight: VIDEO_HEIGHT,
    fps: VIDEO_FPS,
    loop: true as const,
    autoPlay: true as const,
    initiallyMuted: true as const,
    numberOfSharedAudioTags: 0,
    clickToPlay: false as const,
    doubleClickToFullscreen: false as const,
    spaceKeyToPlayOrPause: false as const,
    acknowledgeRemotionLicense: true as const,
  }

  return (
    <>
      <div
        role="button"
        tabIndex={videoReady ? 0 : -1}
        onClick={() => {
          if (videoReady) setOpen(true)
        }}
        onKeyDown={(event) => {
          if (!videoReady) return
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className={cn(
          "group relative aspect-9/16 w-full overflow-hidden rounded-2xl text-start",
          "bg-[#041512] ring-1 ring-foreground/10",
          "transition-transform active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          videoReady ? "cursor-pointer" : "cursor-wait",
          className
        )}
        aria-label={videoReady ? "Open wrap video fullscreen" : "Crafting wrap video"}
        aria-busy={!videoReady}
      >
        {videoReady ? (
          <div className="pointer-events-none absolute inset-0">
            <Player
              ref={previewRef}
              key={`preview-${playerKey}`}
              {...playerCommon}
              style={{ width: "100%", height: "100%" }}
              controls={false}
            />
          </div>
        ) : (
          <span className="absolute inset-0 bg-linear-to-br from-emerald-950 via-teal-900 to-stone-950" />
        )}

        <span className="absolute inset-0 bg-black/25" />

        {showLoading ? (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
            <span className="relative flex size-14 items-center justify-center">
              <span className="absolute inset-0 animate-spin rounded-full border-2 border-emerald-400/25 border-t-emerald-300" />
              <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.8)]" />
            </span>
            <span className="text-center">
              <span className="block text-[0.65rem] font-semibold tracking-[0.16em] text-emerald-200/90 uppercase">
                Crafting video
              </span>
              <span className="mt-1 block max-w-48 truncate text-xs text-white/75">
                {loadingLabel}
              </span>
            </span>
            <span className="h-1 w-28 overflow-hidden rounded-full bg-white/15">
              <span
                className="block h-full rounded-full bg-linear-to-r from-emerald-300 to-teal-400 transition-[width] duration-300"
                style={{ width: `${Math.max(progressPct, 6)}%` }}
              />
            </span>
            <span className="text-[0.65rem] text-white/50 tabular-nums">
              {captureProgress
                ? `${captureProgress.index}/${captureProgress.total}`
                : "…"}
            </span>
          </span>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-3 pt-10 pb-3 text-white">
          <p className="font-heading text-base font-semibold tracking-tight">
            Your wrap
          </p>
          <p className="mt-0.5 text-xs text-white/80">
            {!videoReady
              ? "Building shareable reel…"
              : renderReady
                ? "Autoplaying · tap for fullscreen"
                : encodeStatus === "error"
                  ? "Autoplaying · download encode failed"
                  : `Autoplaying · encoding ${progressPct}%`}
          </p>
        </div>
      </div>

      {open && videoReady ? (
        <MediaFullscreenChrome
          title="Wrap video"
          shareText={shareText}
          mediaUrl={mediaUrl}
          fileName={shareFileName}
          downloadReady={renderReady}
          downloadProgress={renderProgress}
          downloadStatus={downloadStatus}
          onRequestDownload={handleRequestDownload}
          onClose={() => setOpen(false)}
        >
          <div className="flex h-full max-h-dvh w-full max-w-[min(100%,28rem)] items-center justify-center">
            <Player
              ref={fullscreenRef}
              key={`fullscreen-${playerKey}`}
              {...playerCommon}
              style={{
                width: "100%",
                height: "auto",
                aspectRatio: `${VIDEO_WIDTH} / ${VIDEO_HEIGHT}`,
                maxHeight: "100%",
              }}
              controls
              spaceKeyToPlayOrPause
            />
          </div>
        </MediaFullscreenChrome>
      ) : null}
    </>
  )
}
