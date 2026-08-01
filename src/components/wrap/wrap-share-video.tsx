import { Player, type PlayerRef } from "@remotion/player"
import { useEffect, useMemo, useRef, useState } from "react"

import { MediaFullscreenChrome } from "@/components/media-fullscreen-chrome"
import { renderWrapVideoBlob } from "@/lib/render-wrap-video"
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
  chartSlides?: VideoChartSlide[]
  /** Same gate as Stories — wait for chart captures before showing the reel. */
  ready: boolean
  captureProgress?: StoryCaptureProgress | null
  shareText: string
  shareFileName: string
  className?: string
}

/** Remotion-powered wrap highlight reel for the share strip. */
export function WrapShareVideo({
  displayName,
  totalMessages,
  sentMessages,
  receivedMessages,
  chatCount,
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
  const [renderReady, setRenderReady] = useState(false)
  const previewRef = useRef<PlayerRef>(null)
  const fullscreenRef = useRef<PlayerRef>(null)
  const mediaUrlRef = useRef("")

  const inputProps = useMemo<SocialWrappedVideoProps>(
    () => ({
      displayName,
      totalMessages,
      sentMessages,
      receivedMessages,
      chatCount,
      chartSlides,
    }),
    [
      displayName,
      totalMessages,
      sentMessages,
      receivedMessages,
      chatCount,
      chartSlides,
    ]
  )

  const durationInFrames = videoDurationFrames(chartSlides.length)
  const playerKey = `${durationInFrames}-${chartSlides.map((s) => s.src).join("|")}`

  // Craft MP4 in the background so fullscreen Download works.
  useEffect(() => {
    if (!ready) {
      setRenderReady(false)
      setRenderProgress(0)
      if (mediaUrlRef.current) {
        URL.revokeObjectURL(mediaUrlRef.current)
        mediaUrlRef.current = ""
        setMediaUrl("")
      }
      return
    }

    const controller = new AbortController()
    let cancelled = false
    setRenderReady(false)
    setRenderProgress(0)

    void renderWrapVideoBlob(inputProps, {
      signal: controller.signal,
      onProgress: (p) => {
        if (!cancelled) setRenderProgress(p)
      },
    })
      .then((blob) => {
        if (cancelled || controller.signal.aborted) return
        if (mediaUrlRef.current) URL.revokeObjectURL(mediaUrlRef.current)
        const url = URL.createObjectURL(blob)
        mediaUrlRef.current = url
        setMediaUrl(url)
        setRenderReady(true)
        setRenderProgress(1)
      })
      .catch((error) => {
        if (cancelled || controller.signal.aborted) return
        console.error("[wrap-video] render failed", error)
        setRenderReady(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [ready, inputProps])

  useEffect(() => {
    return () => {
      if (mediaUrlRef.current) URL.revokeObjectURL(mediaUrlRef.current)
    }
  }, [])

  // Kick silent autoplay — audio tags / unmuted context can stall the clock.
  useEffect(() => {
    if (!ready) return
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
  }, [ready, playerKey])

  useEffect(() => {
    if (!open || !ready) return
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
  }, [open, ready, playerKey])

  const progressPct = Math.round(
    ready
      ? Math.max(renderProgress, 0) * 100
      : (captureProgress?.progress ?? 0) * 100
  )
  const loadingLabel = ready
    ? "Encoding video…"
    : (captureProgress?.label ?? "Preparing charts…")
  const showLoading = !ready

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
        tabIndex={ready ? 0 : -1}
        onClick={() => {
          if (ready) setOpen(true)
        }}
        onKeyDown={(event) => {
          if (!ready) return
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
          ready ? "cursor-pointer" : "cursor-wait",
          className
        )}
        aria-label={ready ? "Open wrap video fullscreen" : "Crafting wrap video"}
        aria-busy={!ready}
      >
        {ready ? (
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
            {!ready
              ? "Building shareable reel…"
              : renderReady
                ? "Autoplaying · tap for fullscreen"
                : "Autoplaying · preparing download…"}
          </p>
        </div>
      </div>

      {open && ready ? (
        <MediaFullscreenChrome
          title="Wrap video"
          shareText={shareText}
          mediaUrl={mediaUrl}
          fileName={shareFileName}
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
