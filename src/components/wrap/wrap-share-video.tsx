import { Player } from "@remotion/player"
import { Play } from "lucide-react"
import { useMemo, useState } from "react"

import { MediaFullscreenChrome } from "@/components/media-fullscreen-chrome"
import {
  SocialWrappedVideo,
  type SocialWrappedVideoProps,
} from "@sw-remotion/Composition"
import { cn } from "@/lib/utils"

const FPS = 30
const DURATION_FRAMES = 330
const COMP_WIDTH = 1080
const COMP_HEIGHT = 1440

type WrapShareVideoProps = {
  displayName: string
  totalMessages: number
  sentMessages: number
  receivedMessages: number
  chatCount: number
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
  shareText,
  shareFileName,
  className,
}: WrapShareVideoProps) {
  const [open, setOpen] = useState(false)

  const inputProps = useMemo<SocialWrappedVideoProps>(
    () => ({
      displayName,
      totalMessages,
      sentMessages,
      receivedMessages,
      chatCount,
    }),
    [displayName, totalMessages, sentMessages, receivedMessages, chatCount]
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group relative aspect-[3/4] w-full overflow-hidden rounded-2xl text-start",
          "bg-[#041512] ring-1 ring-foreground/10",
          "transition-transform active:scale-[0.98]",
          className
        )}
        aria-label="Play wrap video"
      >
        <Player
          component={SocialWrappedVideo}
          inputProps={inputProps}
          durationInFrames={DURATION_FRAMES}
          compositionWidth={COMP_WIDTH}
          compositionHeight={COMP_HEIGHT}
          fps={FPS}
          style={{ width: "100%", height: "100%" }}
          controls={false}
          loop
          autoPlay
          clickToPlay={false}
          acknowledgeRemotionLicense
        />
        <span className="pointer-events-none absolute inset-0 bg-black/15" />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-white/25 text-white ring-1 ring-white/40 backdrop-blur-sm transition-transform group-hover:scale-105 sm:size-14">
            <Play className="size-5 fill-current sm:size-6" aria-hidden />
          </span>
        </span>
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-3 pt-10 pb-3 text-white">
          <span className="font-heading text-base font-semibold tracking-tight">
            Your wrap
          </span>
          <span className="mt-0.5 block text-xs text-white/80">
            Tap to open fullscreen
          </span>
        </span>
      </button>

      {open ? (
        <MediaFullscreenChrome
          title="Wrap video"
          shareText={shareText}
          mediaUrl=""
          fileName={shareFileName}
          onClose={() => setOpen(false)}
        >
          <div className="flex h-full max-h-dvh w-full max-w-[min(100%,28rem)] items-center justify-center">
            <Player
              component={SocialWrappedVideo}
              inputProps={inputProps}
              durationInFrames={DURATION_FRAMES}
              compositionWidth={COMP_WIDTH}
              compositionHeight={COMP_HEIGHT}
              fps={FPS}
              style={{
                width: "100%",
                height: "auto",
                aspectRatio: `${COMP_WIDTH} / ${COMP_HEIGHT}`,
                maxHeight: "100%",
              }}
              controls
              loop
              autoPlay
              acknowledgeRemotionLicense
            />
          </div>
        </MediaFullscreenChrome>
      ) : null}
    </>
  )
}
