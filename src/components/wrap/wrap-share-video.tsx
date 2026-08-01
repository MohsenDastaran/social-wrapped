import { Player, type PlayerRef } from "@remotion/player"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react"

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
  slidesIncludeClock,
  slidesIncludeEmojis,
  slidesIncludeHeatmap,
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

/** Fill the viewport while keeping 9:16 — width-bound on phones, height-bound on desktop. */
const fullscreenMediaStyle: CSSProperties = {
  width: "min(100vw, calc(100dvh * 9 / 16))",
  height: "min(100dvh, calc(100vw * 16 / 9))",
  maxWidth: "100%",
  maxHeight: "100%",
}

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
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const fullscreenVideoRef = useRef<HTMLVideoElement>(null)
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

  // Phase 1: charts captured + compressed. Phase 2: MP4 encoded.
  // The live <Player> is never mounted during phase 2 — running the full
  // composition at 60fps alongside the encoder is what makes both stutter.
  const videoReady = ready && slidesReady
  const playbackReady = encodeStatus === "ready" && Boolean(mediaUrl)
  const useLivePlayer = videoReady && encodeStatus === "error"
  const canPlay = playbackReady || useLivePlayer
  const durationInFrames = videoDurationFrames(videoSlides.length, {
    includeHeatmapSticker: slidesIncludeHeatmap(videoSlides),
    includeClockSticker: slidesIncludeClock(videoSlides),
    includeEmojiSticker: slidesIncludeEmojis(videoSlides),
  })
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

  // Live-player fallback only: kick silent autoplay, since audio tags /
  // unmuted context can stall the clock.
  useEffect(() => {
    if (!useLivePlayer) return
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
  }, [useLivePlayer, playerKey])

  useEffect(() => {
    if (!open || !useLivePlayer) return
    let cancelled = false
    const kick = () => {
      const player = fullscreenRef.current
      if (!player || cancelled) return
      // User gesture opened fullscreen — safe to play the soundtrack.
      player.unmute()
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
  }, [open, useLivePlayer, playerKey])

  // Fullscreen opens from a tap, so the soundtrack may start unmuted.
  useEffect(() => {
    if (!open || !playbackReady) return
    const el = fullscreenVideoRef.current
    if (!el) return
    el.muted = false
    void el.play().catch(() => {
      el.muted = true
      void el.play().catch(() => {})
    })
  }, [open, playbackReady, mediaUrl])

  // Don't burn decode cycles (or double the audio) behind the fullscreen view.
  useEffect(() => {
    const el = previewVideoRef.current
    if (!el) return
    if (open) el.pause()
    else void el.play().catch(() => {})
  }, [open, playbackReady])

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
        ? "Render failed — open to retry"
        : `Rendering video… ${progressPct}%`
  const loadingStep = videoReady ? "Step 2 of 2 · Rendering" : "Step 1 of 2 · Charts"
  const showLoading = !canPlay

  const renderReady = playbackReady
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
    // Tile stays muted for browser autoplay; fullscreen unmutes for the bed.
    initiallyMuted: true as const,
    numberOfSharedAudioTags: 2,
    clickToPlay: false as const,
    doubleClickToFullscreen: false as const,
    spaceKeyToPlayOrPause: false as const,
    acknowledgeRemotionLicense: true as const,
  }

  return (
    <>
      <div
        role="button"
        tabIndex={canPlay ? 0 : -1}
        onClick={() => {
          if (canPlay) setOpen(true)
        }}
        onKeyDown={(event) => {
          if (!canPlay) return
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
          canPlay ? "cursor-pointer" : "cursor-wait",
          className
        )}
        aria-label={canPlay ? "Open wrap video fullscreen" : "Crafting wrap video"}
        aria-busy={!canPlay}
      >
        {playbackReady ? (
          <video
            ref={previewVideoRef}
            src={mediaUrl}
            className="pointer-events-none absolute inset-0 size-full object-cover"
            muted
            loop
            autoPlay
            playsInline
            preload="auto"
          />
        ) : useLivePlayer ? (
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
                {loadingStep}
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
            {playbackReady
              ? "Tap to play fullscreen"
              : useLivePlayer
                ? "Preview only · render failed"
                : !videoReady
                  ? "Building shareable reel…"
                  : `Rendering ${progressPct}% · playable when done`}
          </p>
        </div>
      </div>

      {open && canPlay ? (
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
          <div className="flex size-full max-h-dvh max-w-full items-center justify-center">
            {playbackReady ? (
              <video
                ref={fullscreenVideoRef}
                src={mediaUrl}
                style={fullscreenMediaStyle}
                className="object-contain"
                controls
                autoPlay
                loop
                playsInline
              />
            ) : (
              <Player
                ref={fullscreenRef}
                key={`fullscreen-${playerKey}`}
                {...playerCommon}
                style={fullscreenMediaStyle}
                controls
                spaceKeyToPlayOrPause
              />
            )}
          </div>
        </MediaFullscreenChrome>
      ) : null}
    </>
  )
}
