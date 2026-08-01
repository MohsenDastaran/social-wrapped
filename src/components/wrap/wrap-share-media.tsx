import { useEffect, useMemo, useRef, useState } from "react"
import { ImageIcon, Images, Loader2, Video } from "lucide-react"

import { MediaFullscreenChrome } from "@/components/media-fullscreen-chrome"
import { Skiper67 } from "@/components/ui/animated/skiper67"
import {
  StoryCarousel,
  type StoryItem,
} from "@/components/ui/animated/story-carousel"
import { DEFAULT_APP_SHARE_TEXT } from "@/lib/media-share"
import {
  buildMainStorySpecs,
  generateWrapStories,
  revokeStoryUrls,
  type ComposedWrapStory,
} from "@/lib/wrap-stories"
import type { WrapAnalytics } from "@/platform/analytics-types"
import { cn } from "@/lib/utils"

const MOCK_VIDEO_SRC = "/showreel/skiper-ui-showreel.mp4"

type WrapShareMediaProps = {
  displayName: string
  analytics: WrapAnalytics
}

/** Share strip — video + stories tiles in one row; fullscreen on tap. */
export function WrapShareMedia({ displayName, analytics }: WrapShareMediaProps) {
  const specs = useMemo(
    () => buildMainStorySpecs(displayName, analytics),
    [displayName, analytics]
  )
  const [stories, setStories] = useState<ComposedWrapStory[]>([])
  const [storiesReady, setStoriesReady] = useState(false)
  const [storiesOpen, setStoriesOpen] = useState(false)
  const [storyIndex, setStoryIndex] = useState(0)
  const storiesRef = useRef<ComposedWrapStory[]>([])

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    setStoriesReady(false)
    revokeStoryUrls(storiesRef.current)
    storiesRef.current = []
    setStories([])

    void generateWrapStories(specs, controller.signal).then((next) => {
      if (cancelled || controller.signal.aborted) {
        revokeStoryUrls(next)
        return
      }
      storiesRef.current = next
      setStories(next)
      setStoriesReady(true)
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
          <Skiper67
            compact
            videoSrc={MOCK_VIDEO_SRC}
            shareText={videoShareText}
            shareFileName={`social-wrapped-${displayName}.mp4`}
            className="aspect-[3/4] h-auto rounded-2xl ring-1 ring-foreground/10"
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
              "group relative aspect-[3/4] overflow-hidden rounded-2xl text-start ring-1 ring-foreground/10",
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
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-white/25 text-white ring-1 ring-white/40 backdrop-blur-sm sm:size-14">
                {storiesReady ? (
                  <Images className="size-5 sm:size-6" aria-hidden />
                ) : (
                  <Loader2
                    className="size-5 animate-spin sm:size-6"
                    aria-hidden
                  />
                )}
              </span>
            </span>
            <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent px-3 pt-10 pb-3 text-white">
              <span className="font-heading text-base font-semibold tracking-tight">
                Story highlights
              </span>
              <span className="mt-0.5 block text-xs text-white/80">
                {!storiesReady
                  ? "Capturing your charts…"
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
            onIndexChange={setStoryIndex}
            className="mx-0 h-dvh w-[min(100vw,calc(100dvh*9/16))] max-w-full rounded-none shadow-none sm:rounded-3xl"
          />
        </MediaFullscreenChrome>
      ) : null}
    </>
  )
}
