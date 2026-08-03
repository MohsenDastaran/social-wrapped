import { Player, type PlayerRef } from "@remotion/player"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import { createPortal } from "react-dom"
import { Gauge, Play, Sparkles, X } from "lucide-react"

import { AppLoader } from "@/components/app-loader"
import { MediaFullscreenChrome } from "@/components/media-fullscreen-chrome"
import { downloadMediaUrl } from "@/lib/media-share"
import {
  prepareChartSlidesForVideo,
  renderWrapVideoBlob,
  type WrapVideoQuality,
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
import { cn } from "@/lib/utils"

type WrapShareVideoProps = {
  displayName: string
  totalMessages: number
  sentMessages: number
  receivedMessages: number
  chatCount: number
  platformName?: string
  chartSlides?: VideoChartSlide[]
  /** Charts already captured by the parent share strip. */
  ready: boolean
  shareText: string
  shareFileName: string
  className?: string
}

type EncodeStatus = "idle" | "encoding" | "error"

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
  shareText,
  shareFileName,
  className,
}: WrapShareVideoProps) {
  const [open, setOpen] = useState(false)
  const [encodeStatus, setEncodeStatus] = useState<EncodeStatus>("idle")
  const [renderProgress, setRenderProgress] = useState(0)
  const [encodeError, setEncodeError] = useState<string | null>(null)
  const [activeQuality, setActiveQuality] = useState<WrapVideoQuality | null>(
    null
  )
  const [videoSlides, setVideoSlides] = useState<VideoChartSlide[]>([])
  const [slidesReady, setSlidesReady] = useState(chartSlides.length === 0)
  const previewRef = useRef<PlayerRef>(null)
  const fullscreenRef = useRef<PlayerRef>(null)
  const inputPropsRef = useRef<SocialWrappedVideoProps | null>(null)
  const encodeAbortRef = useRef<AbortController | null>(null)

  const chartSrcKey = chartSlides.map((s) => s.src).join("|")

  useEffect(() => {
    let cancelled = false
    if (chartSlides.length === 0) {
      setVideoSlides([])
      setSlidesReady(true)
      return
    }

    if (chartSlides.every((s) => s.src.startsWith("data:image/jpeg"))) {
      setVideoSlides(chartSlides)
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
          setVideoSlides(chartSlides)
          setSlidesReady(true)
        }
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartSrcKey])

  const playerProps = useMemo<SocialWrappedVideoProps>(
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
  inputPropsRef.current = playerProps

  const playerReady = ready && slidesReady
  const encoding = encodeStatus === "encoding"
  const durationInFrames = videoDurationFrames(videoSlides.length, {
    includeHeatmapSticker: slidesIncludeHeatmap(videoSlides),
    includeClockSticker: slidesIncludeClock(videoSlides),
    includeEmojiSticker: slidesIncludeEmojis(videoSlides),
  })
  const playerKey = `${durationInFrames}-${chartSrcKey}-${videoSlides.map((s) => s.src.length).join("-")}`

  useEffect(() => {
    return () => {
      encodeAbortRef.current?.abort()
    }
  }, [])

  /** Muted play is required for autoplay; unmute only after play has started. */
  const kickMutedPlay = useCallback((player: PlayerRef | null) => {
    if (!player) return false
    try {
      player.mute()
      player.play()
      return player.isPlaying()
    } catch {
      return false
    }
  }, [])

  // Preview tile: keep retrying muted play until the Remotion clock is running.
  useEffect(() => {
    if (!playerReady || encoding || open) return
    let cancelled = false
    let attempts = 0

    const tick = () => {
      if (cancelled) return
      const player = previewRef.current
      if (!player) {
        attempts += 1
        if (attempts < 40) window.setTimeout(tick, 100)
        return
      }
      const playing = kickMutedPlay(player)
      attempts += 1
      if (!playing && attempts < 40) {
        window.setTimeout(tick, attempts < 10 ? 80 : 200)
      }
    }

    const timers = [
      window.setTimeout(tick, 0),
      window.setTimeout(tick, 120),
      window.setTimeout(tick, 350),
      window.setTimeout(tick, 800),
      window.setTimeout(tick, 1600),
    ]
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [playerReady, encoding, open, playerKey, kickMutedPlay])

  // Fullscreen: start muted (autoplay-safe), then unmute after play — open is a user gesture.
  useEffect(() => {
    if (!open || !playerReady || encoding) return
    let cancelled = false
    let attempts = 0

    const tick = () => {
      if (cancelled) return
      const player = fullscreenRef.current
      if (!player) {
        attempts += 1
        if (attempts < 40) window.setTimeout(tick, 80)
        return
      }
      try {
        player.mute()
        player.play()
        if (player.isPlaying()) {
          // Same open-gesture window: unmute once playback actually started.
          window.setTimeout(() => {
            if (!cancelled) {
              try {
                player.unmute()
              } catch {
                /* keep muted */
              }
            }
          }, 60)
          return
        }
      } catch {
        /* retry */
      }
      attempts += 1
      if (attempts < 40) window.setTimeout(tick, attempts < 10 ? 80 : 200)
    }

    const timers = [
      window.setTimeout(tick, 0),
      window.setTimeout(tick, 100),
      window.setTimeout(tick, 300),
      window.setTimeout(tick, 700),
    ]
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [open, playerReady, encoding, playerKey])

  // Pause preview while fullscreen/encode is active (avoid double clocks + audio).
  useEffect(() => {
    const player = previewRef.current
    if (!player) return
    if (open || encoding) {
      try {
        player.pause()
      } catch {
        /* ignore */
      }
    }
  }, [open, encoding])

  const startEncode = useCallback(
    async (quality: WrapVideoQuality) => {
      const props = inputPropsRef.current
      if (!props) return

      encodeAbortRef.current?.abort()
      const controller = new AbortController()
      encodeAbortRef.current = controller

      setOpen(false)
      setActiveQuality(quality)
      setEncodeStatus("encoding")
      setEncodeError(null)
      setRenderProgress(0)

      try {
        const blob = await renderWrapVideoBlob(props, {
          quality,
          signal: controller.signal,
          onProgress: (p) => {
            if (!controller.signal.aborted) setRenderProgress(p)
          },
        })
        if (controller.signal.aborted) return

        const url = URL.createObjectURL(blob)
        try {
          await downloadMediaUrl(url, shareFileName)
        } finally {
          URL.revokeObjectURL(url)
        }
        setRenderProgress(1)
        setEncodeStatus("idle")
        setActiveQuality(null)
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          setEncodeStatus("idle")
          setActiveQuality(null)
          setRenderProgress(0)
          return
        }
        console.error("[wrap-video] render failed", error)
        setEncodeStatus("error")
        setEncodeError(
          error instanceof Error ? error.message : "Video render failed"
        )
      }
    },
    [shareFileName]
  )

  const cancelEncode = useCallback(() => {
    encodeAbortRef.current?.abort()
    encodeAbortRef.current = null
    setEncodeStatus("idle")
    setActiveQuality(null)
    setRenderProgress(0)
    setEncodeError(null)
  }, [])

  const progressPct = Math.round(Math.max(renderProgress, 0) * 100)
  const qualityLabel =
    activeQuality === "high" ? "High quality (1080p)" : "Normal (720p)"

  const downloadMenu = useMemo(
    () => ({
      label: "Download quality",
      items: [
        {
          id: "normal",
          title: "Normal",
          description:
            "720p — good for Stories and quick shares. Usually finishes faster.",
          icon: <Gauge />,
          onSelect: () => void startEncode("normal"),
        },
        {
          id: "high",
          title: "High quality",
          description:
            "1080p — sharpest export. Renders more frames; expect a longer wait.",
          icon: <Sparkles />,
          onSelect: () => void startEncode("high"),
        },
      ],
    }),
    [startEncode]
  )

  const playerCommon = {
    component: SocialWrappedVideo,
    inputProps: playerProps,
    durationInFrames,
    compositionWidth: VIDEO_WIDTH,
    compositionHeight: VIDEO_HEIGHT,
    fps: VIDEO_FPS,
    loop: true as const,
    autoPlay: true as const,
    initiallyMuted: true as const,
    // Shared audio tags can stall the first muted autoplay boot.
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
        tabIndex={playerReady && !encoding ? 0 : -1}
        onClick={() => {
          if (playerReady && !encoding) setOpen(true)
        }}
        onKeyDown={(event) => {
          if (!playerReady || encoding) return
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
          playerReady && !encoding ? "cursor-pointer" : "cursor-wait",
          className
        )}
        aria-label={
          playerReady ? "Open wrap video fullscreen" : "Preparing wrap video"
        }
        aria-busy={!playerReady || encoding}
      >
        {playerReady && !encoding ? (
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
          <span className="absolute inset-0 flex items-center justify-center bg-[#041512]">
            <AppLoader
              size="md"
              fullscreen={false}
              label="Preparing video preview"
            />
          </span>
        )}

        <span className="absolute inset-0 bg-black/25" />

        {playerReady && !encoding ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-white/25 text-white ring-1 ring-white/40 backdrop-blur-sm transition-transform group-hover:scale-105 sm:size-14">
              <Play
                className="ms-0.5 size-5 fill-white sm:size-6"
                aria-hidden
              />
            </span>
          </span>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-3 pt-10 pb-3 text-white">
          <p className="font-heading text-base font-semibold tracking-tight">
            Your wrap
          </p>
          <p className="mt-0.5 text-xs text-white/80">
            {playerReady
              ? "Tap to play fullscreen"
              : "Preparing preview…"}
          </p>
        </div>
      </div>

      {open && playerReady && !encoding ? (
        <MediaFullscreenChrome
          title="Wrap video"
          shareText={shareText}
          mediaUrl=""
          fileName={shareFileName}
          downloadMenu={downloadMenu}
          onClose={() => setOpen(false)}
        >
          <div className="flex size-full max-h-dvh max-w-full items-center justify-center">
            <Player
              ref={fullscreenRef}
              key={`fullscreen-${playerKey}`}
              {...playerCommon}
              style={fullscreenMediaStyle}
              controls
              spaceKeyToPlayOrPause
              numberOfSharedAudioTags={2}
            />
          </div>
        </MediaFullscreenChrome>
      ) : null}

      {encoding || encodeStatus === "error"
        ? createPortal(
            <div
              className="fixed inset-0 z-[300] flex h-dvh w-screen flex-col items-center justify-center bg-[#041512] px-6"
              role="dialog"
              aria-modal="true"
              aria-label="Rendering video"
              aria-busy={encoding}
            >
              <button
                type="button"
                onClick={cancelEncode}
                className="absolute top-[max(0.75rem,env(safe-area-inset-top))] end-3 flex size-11 items-center justify-center rounded-full bg-white text-black shadow-lg ring-2 ring-white/80"
                aria-label="Cancel render"
              >
                <X className="size-5" strokeWidth={2.5} />
              </button>

              <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center text-white">
                {encodeStatus === "error" ? (
                  <>
                    <p className="font-heading text-xl font-semibold tracking-tight">
                      Render failed
                    </p>
                    <p className="text-sm text-white/70">
                      {encodeError ?? "Something went wrong while encoding."}
                    </p>
                    <div className="flex w-full flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEncodeStatus("idle")
                          setOpen(true)
                        }}
                        className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950"
                      >
                        Try again
                      </button>
                      <button
                        type="button"
                        onClick={cancelEncode}
                        className="rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white ring-1 ring-white/15"
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
                      label="Rendering video"
                    />
                    <div>
                      <p className="font-heading text-xl font-semibold tracking-tight">
                        Rendering your video
                      </p>
                      <p className="mt-1.5 text-sm text-white/70">
                        {qualityLabel}. Keep this tab open — encoding runs in
                        your browser.
                      </p>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-emerald-300 to-teal-400 transition-[width] duration-300"
                        style={{ width: `${Math.max(progressPct, 4)}%` }}
                      />
                    </div>
                    <p className="text-sm tabular-nums text-white/55">
                      {progressPct}%
                    </p>
                  </>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
