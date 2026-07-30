import { useEffect, useState } from "react"
import { ImageIcon, Images, Video } from "lucide-react"

import { MediaFullscreenChrome } from "@/components/media-fullscreen-chrome"
import { Skiper67 } from "@/components/ui/animated/skiper67"
import { StoryCarousel, type StoryItem } from "@/components/ui/story-carousel"
import { DEFAULT_APP_SHARE_TEXT } from "@/lib/media-share"
import type { TelegramExportStats } from "@/platform/import"
import { cn } from "@/lib/utils"

function formatCount(n: number): string {
  return new Intl.NumberFormat().format(n)
}

const MOCK_VIDEO_SRC = "/showreel/skiper-ui-showreel.mp4"

type WrapShareMediaProps = {
  displayName: string
  stats: TelegramExportStats
}

function buildStories(
  displayName: string,
  stats: TelegramExportStats
): StoryItem[] {
  return [
    {
      id: "1",
      image:
        "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80",
      heading: `${formatCount(stats.totalMessages)} messages`,
      subtext: `${displayName}'s wrap — total across every chat.`,
    },
    {
      id: "2",
      image:
        "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
      heading: `${formatCount(stats.chatCount)} chats`,
      subtext: "Conversations pulled from your export.",
    },
    {
      id: "3",
      image:
        "https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?auto=format&fit=crop&w=800&q=80",
      heading: "Sent vs received",
      subtext: `${formatCount(stats.sentMessages)} sent · ${formatCount(stats.receivedMessages)} received`,
    },
  ]
}

/** Share strip — video + stories tiles in one row; fullscreen on tap. */
export function WrapShareMedia({ displayName, stats }: WrapShareMediaProps) {
  const stories = buildStories(displayName, stats)
  const cover = stories[0]
  const [storiesOpen, setStoriesOpen] = useState(false)
  const [storyIndex, setStoryIndex] = useState(0)

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

  return (
    <>
      <section className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Video className="size-3.5" aria-hidden />
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em]">
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
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em]">
              Stories
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStoryIndex(0)
              setStoriesOpen(true)
            }}
            className={cn(
              "group relative aspect-[3/4] overflow-hidden rounded-2xl text-start ring-1 ring-foreground/10",
              "transition-transform active:scale-[0.98]"
            )}
          >
            <img
              src={cover?.image}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
            <span className="absolute inset-0 bg-black/25" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur-sm ring-1 ring-white/40 sm:size-14">
                <Images className="size-5 sm:size-6" aria-hidden />
              </span>
            </span>
            <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent px-3 pb-3 pt-10 text-white">
              <span className="font-heading text-base font-semibold tracking-tight">
                Story highlights
              </span>
              <span className="mt-0.5 block text-xs text-white/80">
                Tap to open · {stories.length} slides
              </span>
            </span>
          </button>
        </div>
      </section>

      {storiesOpen ? (
        <MediaFullscreenChrome
          title="Stories"
          shareText={storyShareText}
          mediaUrl={currentStory?.image ?? ""}
          fileName={`social-wrapped-story-${storyIndex + 1}.jpg`}
          onClose={() => setStoriesOpen(false)}
        >
          <StoryCarousel
            items={stories}
            interval={5000}
            alwaysShowControls
            onIndexChange={setStoryIndex}
            className="mx-0 h-full max-h-full w-full max-w-[min(100%,28rem)] rounded-3xl"
          />
        </MediaFullscreenChrome>
      ) : null}
    </>
  )
}
