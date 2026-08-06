import { useEffect, useMemo, useRef, useState } from "react"
import { ImageIcon, Images, Video } from "lucide-react"

import { AppLoader } from "@/components/app-loader"
import { MediaFullscreenChrome } from "@/components/media-fullscreen-chrome"
import {
  StoryCarousel,
  type StoryItem,
} from "@/components/ui/animated/story-carousel"
import { WrapShareVideo } from "@/components/wrap/wrap-share-video"
import type { PlatformId } from "@/lib/platforms"
import {
  getWrapStories,
  saveWrapStories,
  wrapStoriesFingerprint,
  type StoredWrapStorySlide,
} from "@/lib/wrap-history"
import { buildPlatformStoryCatalog } from "@/lib/wrap-story-catalog"
import {
  generateWrapStories,
  revokeStoryUrls,
  type ComposedWrapStory,
  type StoryCaptureProgress,
} from "@/lib/wrap-stories"
import type {
  InstagramSocialInsights,
  WrapAnalytics,
} from "@/platform/analytics-types"
import type { LinkedInInsights } from "@/platform/linkedin-types"
import type { XInsights } from "@/platform/x-types"
import { cn } from "@/lib/utils"
import type { VideoChartSlide } from "@sw-remotion/Composition"

type WrapShareMediaProps = {
  wrapId: string
  displayName: string
  analytics: WrapAnalytics
  platformId: PlatformId
  /** Platform label shown in share video (e.g. Telegram, WhatsApp). */
  platformName?: string
  instagramSocial?: InstagramSocialInsights | null
  linkedinInsights?: LinkedInInsights | null
  xInsights?: XInsights | null
}

function storiesFromStored(
  stored: StoredWrapStorySlide[]
): ComposedWrapStory[] {
  return stored.map((slide) => ({
    id: slide.id,
    exportName: slide.exportName,
    heading: slide.heading,
    subtext: slide.subtext,
    ...(slide.kpis ? { kpis: slide.kpis } : {}),
    ...(slide.videoMotion ? { videoMotion: slide.videoMotion } : {}),
    image: URL.createObjectURL(slide.blob),
  }))
}

async function storiesToStored(
  stories: ComposedWrapStory[]
): Promise<StoredWrapStorySlide[]> {
  const out: StoredWrapStorySlide[] = []
  for (const story of stories) {
    const response = await fetch(story.image)
    const blob = await response.blob()
    out.push({
      id: story.id,
      exportName: story.exportName,
      heading: story.heading,
      subtext: story.subtext,
      ...(story.kpis ? { kpis: story.kpis } : {}),
      ...(story.videoMotion ? { videoMotion: story.videoMotion } : {}),
      blob,
    })
  }
  return out
}

/** Share strip — video + stories tiles in one row; fullscreen on tap. */
export function WrapShareMedia({
  wrapId,
  displayName,
  analytics,
  platformId,
  platformName = "Telegram",
  instagramSocial = null,
  linkedinInsights = null,
  xInsights = null,
}: WrapShareMediaProps) {
  const catalog = useMemo(
    () =>
      buildPlatformStoryCatalog({
        platformId,
        displayName,
        analytics,
        instagramSocial,
        linkedinInsights,
        xInsights,
      }),
    [
      platformId,
      displayName,
      analytics,
      instagramSocial,
      linkedinInsights,
      xInsights,
    ]
  )
  const specs = catalog.storySpecs
  const fingerprint = useMemo(() => wrapStoriesFingerprint(specs), [specs])
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

    if (specs.length === 0) {
      setStoriesReady(true)
      setCaptureProgress(null)
      return () => {
        cancelled = true
        controller.abort()
      }
    }

    void (async () => {
      try {
        const cached = await getWrapStories(wrapId, fingerprint)
        if (cancelled || controller.signal.aborted) return

        if (cached && cached.length > 0) {
          const restored = storiesFromStored(cached)
          if (cancelled || controller.signal.aborted) {
            revokeStoryUrls(restored)
            return
          }
          storiesRef.current = restored
          setStories(restored)
          setStoriesReady(true)
          setCaptureProgress(null)
          return
        }
      } catch (error) {
        console.warn("Failed to load cached wrap stories:", error)
      }

      if (cancelled || controller.signal.aborted) return

      const result = await generateWrapStories(
        specs,
        controller.signal,
        (progress) => {
          if (!cancelled) setCaptureProgress(progress)
        }
      )

      if (cancelled || controller.signal.aborted) {
        revokeStoryUrls(result.stories, result.videoPanSources)
        return
      }

      storiesRef.current = result.stories
      setStories(result.stories)
      setStoriesReady(true)
      setCaptureProgress(null)

      // Pan sources are only used during generation; revoke unused ones.
      revokeStoryUrls([], result.videoPanSources)

      try {
        const stored = await storiesToStored(result.stories)
        if (!cancelled && !controller.signal.aborted) {
          await saveWrapStories(wrapId, fingerprint, stored)
        }
      } catch (error) {
        console.warn("Failed to persist wrap stories:", error)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
      revokeStoryUrls(storiesRef.current)
      storiesRef.current = []
    }
  }, [wrapId, fingerprint, specs])

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

  const currentStory = stories[storyIndex] ?? stories[0]
  const cover = stories[0]

  const carouselItems: StoryItem[] = stories.map((s) => ({
    id: s.id,
    image: s.image,
  }))

  const canOpenStories = storiesReady && stories.length > 0
  const progressPct = Math.round((captureProgress?.progress ?? 0) * 100)
  const mediaReady = storiesReady || specs.length === 0

  const videoChartSlides = useMemo((): VideoChartSlide[] => {
    const byId = new Map(stories.map((s) => [s.id, s]))
    return catalog.videoSlideIds
      .map((id): VideoChartSlide | null => {
        const story = byId.get(id)
        if (!story?.image) return null
        return {
          id: story.id,
          src: story.image,
          heading: story.heading,
          motion: "fit",
        }
      })
      .filter((s): s is VideoChartSlide => s != null)
  }, [stories, catalog.videoSlideIds])

  return (
    <>
      {!mediaReady ? (
        <section
          className={cn(
            "flex min-h-[min(72vw,22rem)] flex-col items-center justify-center gap-4 rounded-2xl px-6 py-12",
            "bg-[#041512] text-white ring-1 ring-foreground/10"
          )}
          aria-busy
          aria-live="polite"
        >
          <AppLoader
            size="md"
            fullscreen={false}
            label="Crafting stories and video"
          />
          <div className="text-center">
            <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-emerald-200/90 uppercase">
              Crafting stories & video
            </p>
            <p className="mt-1.5 max-w-xs truncate text-sm text-white/70">
              {captureProgress?.label ?? "Preparing charts…"}
            </p>
          </div>
          <div className="h-1 w-36 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-linear-to-r from-emerald-300 to-teal-400 transition-[width] duration-300"
              style={{ width: `${Math.max(progressPct, 6)}%` }}
            />
          </div>
          <p className="text-[0.65rem] text-white/45 tabular-nums">
            {captureProgress
              ? `${captureProgress.index + 1}/${captureProgress.total}`
              : "…"}
          </p>
        </section>
      ) : (
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
              platformName={platformName}
              chartSlides={videoChartSlides}
              ready
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

              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-white/25 text-white ring-1 ring-white/40 backdrop-blur-sm sm:size-14">
                  <Images className="size-5 sm:size-6" aria-hidden />
                </span>
              </span>

              <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent px-3 pt-10 pb-3 text-white">
                <span className="font-heading text-base font-semibold tracking-tight">
                  Story highlights
                </span>
                <span className="mt-0.5 block text-xs text-white/80">
                  {stories.length === 0
                    ? "Charts not ready yet"
                    : `Tap to open · ${stories.length} slides`}
                </span>
              </span>
            </button>
          </div>
        </section>
      )}

      {storiesOpen && carouselItems.length > 0 ? (
        <MediaFullscreenChrome
          title="Stories"
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
