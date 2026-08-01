import { useEffect, useMemo, useRef, useState } from "react"
import { ImageIcon, Images, Video } from "lucide-react"

import { MediaFullscreenChrome } from "@/components/media-fullscreen-chrome"
import {
  StoryCarousel,
  type StoryItem,
} from "@/components/ui/animated/story-carousel"
import { WrapShareVideo } from "@/components/wrap/wrap-share-video"
import { DEFAULT_APP_SHARE_TEXT } from "@/lib/media-share"
import {
  buildMainStorySpecs,
  generateWrapStories,
  revokeStoryUrls,
  type ComposedWrapStory,
  type StoryCaptureProgress,
} from "@/lib/wrap-stories"
import type { WrapAnalytics } from "@/platform/analytics-types"
import { cn } from "@/lib/utils"

type WrapShareMediaProps = {
  displayName: string
  analytics: WrapAnalytics
}

/** Share strip — video + stories tiles in one row; fullscreen on tap. */
export function WrapShareMedia({
  displayName,
  analytics,
}: WrapShareMediaProps) {
  const specs = useMemo(
    () => buildMainStorySpecs(displayName, analytics),
    [displayName, analytics]
  )
  const [stories, setStories] = useState<ComposedWrapStory[]>([])
  const [storiesReady, setStoriesReady] = useState(false)
  const [captureProgress, setCaptureProgress] =
    useState<StoryCaptureProgress | null>(null)
  const [storiesOpen, setStoriesOpen] = useState(false)
  const [storyIndex, setStoryIndex] = useState(0)
  const storiesRef = useRef<ComposedWrapStory[]>([])

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    setStoriesReady(false)
    setCaptureProgress(
      specs.length > 0
        ? {
            index: 0,
            total: specs.length,
            label: specs[0]?.heading ?? "Stories",
            progress: 0,
          }
        : null
    )
    revokeStoryUrls(storiesRef.current)
    storiesRef.current = []
    setStories([])

    void generateWrapStories(specs, controller.signal, (progress) => {
      if (!cancelled) setCaptureProgress(progress)
    }).then((next) => {
      if (cancelled || controller.signal.aborted) {
        revokeStoryUrls(next)
        return
      }
      storiesRef.current = next
      setStories(next)
      setStoriesReady(true)
      setCaptureProgress(null)
    })

    return () => {
      cancelled = true
      controller.abort()
      revokeStoryUrls(storiesRef.current)
      storiesRef.current = []
    }
  }, [specs])

  useEffect(() => {
    if (!storiesOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setStoriesOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
    }
  }, [storiesOpen])

  const videoShareText = `Check out my Social Wrapped for ${displayName}. ${DEFAULT_APP_SHARE_TEXT}`
  const storyShareText = `Check out my Social Wrapped story for ${displayName}. ${DEFAULT_APP_SHARE_TEXT}`
  const currentStory = stories[storyIndex] ?? stories[0]
  const cover = stories[0]

  // Captions are baked into the composed PNG — keep carousel overlays empty.
  const carouselItems: StoryItem[] = stories.map((s) => ({
    id: s.id,
    image: s.image,
  }))

  const canOpenStories = storiesReady && stories.length > 0
  const progressPct = Math.round((captureProgress?.progress ?? 0) * 100)

  // Prefer a short highlight set for the video reel (same captures as Stories).
  // Keep heatmap (activity calendar) near the front so it isn't sliced off.
  const videoChartSlides = useMemo(
    () => {
      const preferred = [
        "activity",
        "sent-received",
        "heatmap",
        "circadian",
        "emojis",
      ]
      const byId = new Map(stories.map((s) => [s.id, s]))
      return preferred
        .map((id) => byId.get(id))
        .filter((s): s is (typeof stories)[number] => Boolean(s?.image))
        .slice(0, 5)
        .map((s) => ({ id: s.id, src: s.image, heading: s.heading }))
    },
    [stories]
  )

  return (
    <>
      <section className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Video className="size-3.5" aria-hidden />
            <p className="text-[0.65rem] font-semibold tracking-[0.14em] uppercase">
              Video
            </p>
          </div>
          <WrapShareVideo
            displayName={displayName}
            totalMessages={analytics.account.totalMessages}
            sentMessages={analytics.account.sentMessages}
            receivedMessages={analytics.account.receivedMessages}
            chatCount={analytics.chatCount}
            platformName="Telegram"
            chartSlides={videoChartSlides}
            ready={storiesReady || specs.length === 0}
            captureProgress={captureProgress}
            shareText={videoShareText}
            shareFileName={`social-wrapped-${displayName}.mp4`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ImageIcon className="size-3.5" aria-hidden />
            <p className="text-[0.65rem] font-semibold tracking-[0.14em] uppercase">
              Stories
            </p>
          </div>
          <button
            type="button"
            disabled={!canOpenStories}
            onClick={() => {
              if (!canOpenStories) return
              setStoryIndex(0)
              setStoriesOpen(true)
            }}
            className={cn(
              "group relative aspect-9/16 overflow-hidden rounded-2xl text-start ring-1 ring-foreground/10",
              "transition-transform active:scale-[0.98]",
              !canOpenStories && "cursor-wait"
            )}
          >
            {cover?.image ? (
              <img
                src={cover.image}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <span className="absolute inset-0 bg-linear-to-br from-emerald-950 via-teal-900 to-stone-950" />
            )}
            <span className="absolute inset-0 bg-black/25" />

            {!storiesReady ? (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
                <span className="relative flex size-14 items-center justify-center">
                  <span className="absolute inset-0 animate-spin rounded-full border-2 border-emerald-400/25 border-t-emerald-300" />
                  <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.8)]" />
                </span>
                <span className="text-center">
                  <span className="block text-[0.65rem] font-semibold tracking-[0.16em] text-emerald-200/90 uppercase">
                    Crafting stories
                  </span>
                  <span className="mt-1 block max-w-[12rem] truncate text-xs text-white/75">
                    {captureProgress?.label ?? "Preparing charts…"}
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
            ) : (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-white/25 text-white ring-1 ring-white/40 backdrop-blur-sm sm:size-14">
                  <Images className="size-5 sm:size-6" aria-hidden />
                </span>
              </span>
            )}

            <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent px-3 pt-10 pb-3 text-white">
              <span className="font-heading text-base font-semibold tracking-tight">
                Story highlights
              </span>
              <span className="mt-0.5 block text-xs text-white/80">
                {!storiesReady
                  ? "Building shareable slides…"
                  : stories.length === 0
                    ? "Charts not ready yet"
                    : `Tap to open · ${stories.length} slides`}
              </span>
            </span>
          </button>
        </div>
      </section>

      {storiesOpen && carouselItems.length > 0 ? (
        <MediaFullscreenChrome
          title="Stories"
          shareText={storyShareText}
          mediaUrl={currentStory?.image ?? ""}
          fileName={`social-wrapped-story-${currentStory?.id ?? storyIndex + 1}.png`}
          onClose={() => setStoriesOpen(false)}
        >
          <StoryCarousel
            items={carouselItems}
            interval={5000}
            alwaysShowControls
            imageFit="contain"
            onIndexChange={setStoryIndex}
            className="mx-0 aspect-[9/16] h-auto max-h-dvh w-[min(100vw,calc(100dvh*9/16))] max-w-none rounded-none shadow-none sm:rounded-3xl"
          />
        </MediaFullscreenChrome>
      ) : null}
    </>
  )
}
