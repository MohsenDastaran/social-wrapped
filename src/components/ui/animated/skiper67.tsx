"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Play } from "lucide-react";
import {
  MediaControlBar,
  MediaController,
  MediaMuteButton,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaTimeDisplay,
  MediaTimeRange,
  MediaVolumeRange,
} from "media-chrome/react";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";

import { MediaFullscreenChrome } from "@/components/media-fullscreen-chrome";
import { cn } from "@/lib/utils";

export type VideoPlayerProps = ComponentProps<typeof MediaController>;

export const VideoPlayer = ({ style, ...props }: VideoPlayerProps) => (
  <MediaController
    style={{
      ...style,
    }}
    {...props}
  />
);

export type VideoPlayerControlBarProps = ComponentProps<typeof MediaControlBar>;

export const VideoPlayerControlBar = (props: VideoPlayerControlBarProps) => (
  <MediaControlBar {...props} />
);

export type VideoPlayerTimeRangeProps = ComponentProps<typeof MediaTimeRange>;

export const VideoPlayerTimeRange = ({
  className,
  ...props
}: VideoPlayerTimeRangeProps) => (
  <MediaTimeRange
    className={cn(
      "[--media-range-thumb-opacity:0] [--media-range-track-height:2px]",
      className,
    )}
    {...props}
  />
);

export type VideoPlayerTimeDisplayProps = ComponentProps<
  typeof MediaTimeDisplay
>;

export const VideoPlayerTimeDisplay = ({
  className,
  ...props
}: VideoPlayerTimeDisplayProps) => (
  <MediaTimeDisplay className={cn("p-2.5", className)} {...props} />
);

export type VideoPlayerVolumeRangeProps = ComponentProps<
  typeof MediaVolumeRange
>;

export const VideoPlayerVolumeRange = ({
  className,
  ...props
}: VideoPlayerVolumeRangeProps) => (
  <MediaVolumeRange className={cn("p-2.5", className)} {...props} />
);

export type VideoPlayerPlayButtonProps = ComponentProps<typeof MediaPlayButton>;

export const VideoPlayerPlayButton = ({
  className,
  ...props
}: VideoPlayerPlayButtonProps) => (
  <MediaPlayButton className={cn("", className)} {...props} />
);

export type VideoPlayerSeekBackwardButtonProps = ComponentProps<
  typeof MediaSeekBackwardButton
>;

export const VideoPlayerSeekBackwardButton = ({
  className,
  ...props
}: VideoPlayerSeekBackwardButtonProps) => (
  <MediaSeekBackwardButton className={cn("p-2.5", className)} {...props} />
);

export type VideoPlayerSeekForwardButtonProps = ComponentProps<
  typeof MediaSeekForwardButton
>;

export const VideoPlayerSeekForwardButton = ({
  className,
  ...props
}: VideoPlayerSeekForwardButtonProps) => (
  <MediaSeekForwardButton className={cn("p-2.5", className)} {...props} />
);

export type VideoPlayerMuteButtonProps = ComponentProps<typeof MediaMuteButton>;

export const VideoPlayerMuteButton = ({
  className,
  ...props
}: VideoPlayerMuteButtonProps) => (
  <MediaMuteButton className={cn("", className)} {...props} />
);

export type VideoPlayerContentProps = ComponentProps<"video">;

export const VideoPlayerContent = ({
  className,
  ...props
}: VideoPlayerContentProps) => (
  <video className={cn("mb-0 mt-0", className)} {...props} />
);

export type Skiper67Props = {
  /** Video source for preview + popover player. */
  videoSrc?: string
  /** Extra classes on the outer section. */
  className?: string
  /** Hide the large “click to play” caption (tighter layouts). */
  compact?: boolean
  /** Filename used when downloading the video file. */
  shareFileName?: string
}

export const Skiper67 = ({
  videoSrc = "/showreel/skiper-ui-showreel.mp4",
  className,
  compact = false,
  shareFileName = "social-wrapped.mp4",
}: Skiper67Props) => {
  const [showVideoPopOver, setShowVideoPopOver] = useState(false);

  return (
    <section
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-[#f5f4f3] dark:bg-muted/40",
        compact ? "h-full min-h-0" : "h-full min-h-72",
        className,
      )}
    >
      {!compact ? (
        <div className="absolute top-1/4 grid content-start justify-items-center gap-6 text-center">
          <span className="after:to-foreground relative max-w-[12ch] text-xs uppercase leading-tight opacity-40 after:absolute after:start-1/2 after:top-full after:h-16 after:w-px after:bg-gradient-to-b after:from-transparent after:content-['']">
            Click the video to play
          </span>
        </div>
      ) : null}
      <AnimatePresence>
        {showVideoPopOver && (
          <VideoPopOver
            videoSrc={videoSrc}
            shareFileName={shareFileName}
            setShowVideoPopOver={setShowVideoPopOver}
          />
        )}
      </AnimatePresence>
      <div
        onClick={() => setShowVideoPopOver(true)}
        className={cn(
          "relative cursor-pointer overflow-hidden rounded-xl shadow-md ring-1 ring-black/10",
          compact ? "absolute inset-0 size-auto rounded-2xl" : "size-45",
        )}
      >
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/20">
          <span className="flex size-12 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur-sm sm:size-14">
            <Play className="size-5 fill-white sm:size-6" />
          </span>
        </div>
        <video
          autoPlay
          muted
          playsInline
          loop
          className="h-full w-full object-cover"
        >
          <source src={videoSrc} />
        </video>
      </div>
    </section>
  );
};

const VideoPopOver = ({
  videoSrc,
  shareFileName,
  setShowVideoPopOver,
}: {
  videoSrc: string;
  shareFileName: string;
  setShowVideoPopOver: (showVideoPopOver: boolean) => void;
}) => {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowVideoPopOver(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [setShowVideoPopOver]);

  return (
    <MediaFullscreenChrome
      title="Wrap video"
      mediaUrl={videoSrc}
      fileName={shareFileName}
      onClose={() => setShowVideoPopOver(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.25 }}
        className="relative mx-auto h-full w-full max-w-5xl"
      >
        <VideoPlayer
          style={{ width: "100%", height: "100%" }}
          className="h-full w-full"
        >
          <VideoPlayerContent
            src={videoSrc}
            autoPlay
            slot="media"
            className="h-full w-full object-contain"
            style={{ width: "100%", height: "100%" }}
          />
          <VideoPlayerControlBar className="absolute inset-x-0 bottom-0 flex w-full items-center justify-center px-5 mix-blend-exclusion md:px-10 md:py-5">
            <VideoPlayerPlayButton className="h-4 bg-transparent" />
            <VideoPlayerTimeRange className="bg-transparent" />
            <VideoPlayerMuteButton className="size-4 bg-transparent" />
          </VideoPlayerControlBar>
        </VideoPlayer>
      </motion.div>
    </MediaFullscreenChrome>
  );
};
