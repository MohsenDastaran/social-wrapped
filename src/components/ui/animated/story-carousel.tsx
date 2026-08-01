"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import { cn } from "@/lib/utils"

export interface StoryItem {
  id: string
  image: string
  /** Optional — omit when captions are baked into the image. */
  heading?: string
  /** Optional — omit when captions are baked into the image. */
  subtext?: string
}

export interface StoryCarouselProps {
  /** Array of story data objects to display. */
  items: StoryItem[]
  /**
   * Duration in milliseconds that each slide is displayed.
   * @default 5000
   */
  interval?: number
  /**
   * Whether the carousel should automatically loop back to the start after the last slide.
   * @default true
   */
  loop?: boolean
  className?: string
  /** Keep prev/next controls visible (useful in fullscreen). */
  alwaysShowControls?: boolean
  /** Fires whenever the active slide changes. */
  onIndexChange?: (index: number) => void
  /**
   * How the slide image fills the frame.
   * Use `contain` for pre-composed story PNGs so nothing is cropped on tall phones.
   * @default "cover"
   */
  imageFit?: "cover" | "contain"
}

/**
 * An Instagram-story style carousel component.
 * Features auto-advancing slides, segmented progress bars, and pause-on-hover interaction.
 */
export function StoryCarousel({
  items,
  interval = 5000,
  loop = true,
  className,
  alwaysShowControls = false,
  onIndexChange,
  imageFit = "cover",
}: StoryCarouselProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const lastTimeRef = useRef<number>(Date.now())
  const elapsedRef = useRef<number>(0)
  const rafRef = useRef<number | null>(null)

  const advance = useCallback(() => {
    if (!api) return
    api.scrollNext()
  }, [api])

  useEffect(() => {
    if (!api) return

    const onSelect = () => {
      const index = api.selectedScrollSnap()
      setCurrent(index)
      setProgress(0)
      elapsedRef.current = 0
      lastTimeRef.current = Date.now()
      onIndexChange?.(index)
    }

    onSelect()
    api.on("select", onSelect)
    return () => {
      api.off("select", onSelect)
    }
  }, [api, onIndexChange])

  useEffect(() => {
    if (!api || isPaused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    const isLastSlide = current === items.length - 1
    if (!loop && isLastSlide && progress === 100) {
      return
    }

    lastTimeRef.current = Date.now()

    const animate = () => {
      const now = Date.now()
      const delta = now - lastTimeRef.current
      lastTimeRef.current = now

      elapsedRef.current += delta
      const newProgress = (elapsedRef.current / interval) * 100

      if (newProgress >= 100) {
        setProgress(100)
        if (!loop && isLastSlide) {
          if (rafRef.current) cancelAnimationFrame(rafRef.current)
          return
        }
        advance()
      } else {
        setProgress(newProgress)
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [api, isPaused, interval, advance, current, loop, items.length, progress])

  const handlePause = () => setIsPaused(true)
  const handleResume = () => setIsPaused(false)

  const handleJump = (index: number) => {
    if (!api) return
    api.scrollTo(index)
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!api) return
    api.scrollPrev()
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!api) return
    api.scrollNext()
  }

  if (items.length === 0) return null

  return (
    <div
      className={cn(
        "group relative mx-auto aspect-[9/16] w-full max-w-sm select-none overflow-hidden rounded-3xl bg-neutral-950 shadow-2xl",
        className
      )}
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      onTouchStart={handlePause}
      onTouchEnd={handleResume}
    >
      <Carousel
        setApi={setApi}
        opts={{ loop, duration: 20 }}
        className="h-full w-full [&>div]:h-full"
      >
        <CarouselContent className="-ms-0 h-full">
          {items.map((item) => (
            <CarouselItem
              key={item.id}
              className="relative h-full w-full basis-full ps-0"
            >
              <div className="relative h-full w-full">
                <img
                  src={item.image}
                  alt={item.heading || "Story slide"}
                  className={cn(
                    "pointer-events-none absolute inset-0 size-full",
                    imageFit === "contain" ? "object-contain" : "object-cover"
                  )}
                  draggable={false}
                />
                {item.heading || item.subtext ? (
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/30 via-transparent to-black/80" />
                ) : null}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className="absolute inset-x-4 top-[max(4.5rem,calc(env(safe-area-inset-top)+3.25rem))] z-20 flex h-1 gap-2">
        {items.map((_, index) => {
          const isPast = index < current
          const isCurrent = index === current
          return (
            <button
              key={index}
              type="button"
              className="h-full flex-1 overflow-hidden rounded-full bg-white/30 transition-colors hover:bg-white/50 focus:outline-none"
              onClick={() => handleJump(index)}
              aria-label={`Go to story ${index + 1}`}
            >
              <div
                className="h-full origin-left bg-white"
                style={{
                  width: "100%",
                  transform: `scaleX(${
                    isPast ? 1 : isCurrent ? progress / 100 : 0
                  })`,
                  transition: isCurrent ? "none" : "transform 0.1s linear",
                }}
              />
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={handlePrev}
        className={cn(
          "absolute start-2 top-1/2 z-30 -translate-y-1/2 rounded-full p-2",
          "border border-white/10 bg-black/20 text-white/80 backdrop-blur-sm",
          "transition-all duration-200 hover:scale-105 hover:bg-black/40 hover:text-white",
          alwaysShowControls
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100",
          "disabled:opacity-0"
        )}
        disabled={!loop && current === 0}
        aria-label="Previous slide"
      >
        <ChevronLeft className="size-6" />
      </button>

      <button
        type="button"
        onClick={handleNext}
        className={cn(
          "absolute end-2 top-1/2 z-30 -translate-y-1/2 rounded-full p-2",
          "border border-white/10 bg-black/20 text-white/80 backdrop-blur-sm",
          "transition-all duration-200 hover:scale-105 hover:bg-black/40 hover:text-white",
          alwaysShowControls
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100",
          "disabled:opacity-0"
        )}
        disabled={!loop && current === items.length - 1}
        aria-label="Next slide"
      >
        <ChevronRight className="size-6" />
      </button>

      {items[current]?.heading || items[current]?.subtext ? (
        <div className="pointer-events-none absolute inset-x-6 bottom-10 z-20 text-white">
          <div
            key={current}
            className="animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            {items[current]?.heading ? (
              <h2 className="mb-2 text-2xl font-bold leading-tight drop-shadow-md">
                {items[current]?.heading}
              </h2>
            ) : null}
            {items[current]?.subtext ? (
              <p className="text-sm font-medium leading-relaxed text-white/90 drop-shadow-md">
                {items[current]?.subtext}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
