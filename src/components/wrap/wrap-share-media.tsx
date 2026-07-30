import { useState } from "react"
import { Download, ImageIcon, Play, Share2, Video } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  downloadMockPng,
  recordMockVideo,
} from "@/lib/mock-export"
import type { TelegramExportStats } from "@/platform/import"
import { cn } from "@/lib/utils"

function formatCount(n: number): string {
  return new Intl.NumberFormat().format(n)
}

type WrapShareMediaProps = {
  displayName: string
  stats: TelegramExportStats
}

/** Top share strip — mock wrap video + Instagram-style story images. */
export function WrapShareMedia({ displayName, stats }: WrapShareMediaProps) {
  const [videoOpen, setVideoOpen] = useState(false)
  const [storiesOpen, setStoriesOpen] = useState(false)
  const [storyIndex, setStoryIndex] = useState(0)
  const [busy, setBusy] = useState(false)

  const stories = [
    {
      eyebrow: "Your year in chat",
      title: `${formatCount(stats.totalMessages)} messages`,
      subtitle: `${displayName}'s wrap`,
      gradient: "from-teal-600 via-cyan-500 to-amber-400",
      colors: ["#0f766e", "#06b6d4", "#fbbf24"] as [string, string, string],
      lines: [
        `${formatCount(stats.sentMessages)} sent`,
        `${formatCount(stats.receivedMessages)} received`,
      ],
    },
    {
      eyebrow: "Conversations",
      title: `${formatCount(stats.chatCount)} chats`,
      subtitle: "Across your whole export",
      gradient: "from-sky-700 via-teal-500 to-lime-300",
      colors: ["#0369a1", "#14b8a6", "#bef264"] as [string, string, string],
      lines: [`File · ${(stats.fileSizeBytes / 1_048_576).toFixed(1)} MB`],
    },
    {
      eyebrow: "Split",
      title: "Sent vs received",
      subtitle: "Who talked more?",
      gradient: "from-amber-500 via-orange-500 to-rose-500",
      colors: ["#f59e0b", "#f97316", "#f43f5e"] as [string, string, string],
      lines: [
        `You · ${formatCount(stats.sentMessages)}`,
        `Them · ${formatCount(stats.receivedMessages)}`,
      ],
    },
  ]

  const active = stories[storyIndex] ?? stories[0]

  async function handleDownloadVideo() {
    setBusy(true)
    try {
      await recordMockVideo(`wrap-${displayName}-mock.webm`, (ctx, t) => {
        const { width, height } = ctx.canvas
        const g = ctx.createLinearGradient(0, 0, width, height)
        g.addColorStop(0, "#0f766e")
        g.addColorStop(0.5, "#0891b2")
        g.addColorStop(1, "#f59e0b")
        ctx.fillStyle = g
        ctx.fillRect(0, 0, width, height)

        ctx.fillStyle = "rgba(255,255,255,0.15)"
        ctx.beginPath()
        ctx.arc(width * (0.3 + t * 0.4), height * 0.25, 180, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = "#fff"
        ctx.font = "600 28px system-ui"
        ctx.fillText("Social Wrapped", 48, 96)
        ctx.font = "700 56px system-ui"
        ctx.fillText(displayName, 48, 280)
        ctx.font = "600 42px system-ui"
        ctx.fillText(`${formatCount(stats.totalMessages)} messages`, 48, 360)
        ctx.globalAlpha = 0.4 + t * 0.6
        ctx.font = "500 28px system-ui"
        ctx.fillText("Mock wrap video · replace later", 48, height - 80)
        ctx.globalAlpha = 1
      })
    } finally {
      setBusy(false)
    }
  }

  function handleDownloadStory() {
    downloadMockPng(`wrap-story-${storyIndex + 1}.png`, {
      title: active.title,
      subtitle: active.subtitle,
      lines: active.lines,
      gradient: active.colors,
    })
  }

  return (
    <>
      <section className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setVideoOpen(true)}
          className={cn(
            "group relative flex aspect-[3/4] flex-col items-start justify-end overflow-hidden rounded-2xl p-4 text-start text-white",
            "bg-linear-to-br from-teal-700 via-cyan-600 to-amber-400",
            "ring-1 ring-foreground/10 transition-transform active:scale-[0.98]"
          )}
        >
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_45%)]" />
          <span className="mb-auto flex size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Video className="size-5" />
          </span>
          <span className="relative text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/80">
            Share
          </span>
          <span className="relative font-heading text-lg font-semibold tracking-tight">
            Wrap video
          </span>
          <span className="relative mt-1 text-xs text-white/80">
            Preview & download
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStoryIndex(0)
            setStoriesOpen(true)
          }}
          className={cn(
            "group relative flex aspect-[3/4] flex-col items-start justify-end overflow-hidden rounded-2xl p-4 text-start text-white",
            "bg-linear-to-br from-sky-700 via-teal-500 to-lime-300",
            "ring-1 ring-foreground/10 transition-transform active:scale-[0.98]"
          )}
        >
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.28),transparent_40%)]" />
          <span className="mb-auto flex size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <ImageIcon className="size-5" />
          </span>
          <span className="relative text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/80">
            Stories
          </span>
          <span className="relative font-heading text-lg font-semibold tracking-tight">
            Story images
          </span>
          <span className="relative mt-1 text-xs text-white/80">
            Highlight cards
          </span>
        </button>
      </section>

      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Wrap video</DialogTitle>
            <DialogDescription>
              Mock preview — swap in a real rendered video later. Download works
              as a short WebM placeholder.
            </DialogDescription>
          </DialogHeader>

          <div className="relative mx-auto aspect-[9/16] w-full max-w-[240px] overflow-hidden rounded-2xl bg-linear-to-br from-teal-700 via-cyan-600 to-amber-400 shadow-lg">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
              <Play className="size-12 opacity-90" />
              <p className="font-heading text-xl font-semibold tracking-tight">
                {displayName}
              </p>
              <p className="text-sm text-white/85">
                {formatCount(stats.totalMessages)} messages
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-stretch">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={busy}
              onClick={() => void handleDownloadVideo()}
            >
              <Download data-icon="inline-start" />
              {busy ? "Rendering…" : "Download"}
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={busy}
              onClick={() => void handleDownloadVideo()}
            >
              <Share2 data-icon="inline-start" />
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={storiesOpen} onOpenChange={setStoriesOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Story images</DialogTitle>
            <DialogDescription>
              Instagram-style highlight frames from your main stats. Mock
              gradients for now.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center gap-1.5">
            {stories.map((story, index) => (
              <button
                key={story.eyebrow}
                type="button"
                aria-label={`Story ${index + 1}`}
                onClick={() => setStoryIndex(index)}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  index === storyIndex ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>

          <div
            className={cn(
              "relative mx-auto aspect-[9/16] w-full max-w-[240px] overflow-hidden rounded-2xl bg-linear-to-br p-5 text-white shadow-lg",
              active.gradient
            )}
          >
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/75">
              {active.eyebrow}
            </p>
            <p className="font-heading mt-8 text-3xl font-semibold tracking-tight">
              {active.title}
            </p>
            <p className="mt-2 text-sm text-white/85">{active.subtitle}</p>
            <ul className="mt-10 flex flex-col gap-2 text-sm font-medium">
              {active.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div className="flex justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={storyIndex === 0}
              onClick={() => setStoryIndex((i) => Math.max(0, i - 1))}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={storyIndex >= stories.length - 1}
              onClick={() =>
                setStoryIndex((i) => Math.min(stories.length - 1, i + 1))
              }
            >
              Next
            </Button>
          </div>

          <DialogFooter className="gap-2 sm:justify-stretch">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleDownloadStory}
            >
              <Download data-icon="inline-start" />
              Download PNG
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleDownloadStory}
            >
              <Share2 data-icon="inline-start" />
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
