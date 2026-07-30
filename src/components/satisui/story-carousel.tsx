'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

export interface StoryItem {
  id: string;
  image: string;
  heading: string;
  subtext: string;
}

export interface StoryCarouselProps {
  /** Array of story data objects to display. */
  items: StoryItem[];
  /**
   * Duration in milliseconds that each slide is displayed.
   * @default 5000
   */
  interval?: number;
  /**
   * Whether the carousel should automatically loop back to the start after the last slide.
   * @default true
   */
  loop?: boolean;
  className?: string;
}

/**
 * An Instagram-story style carousel component.
 * Features auto-advancing slides, segmented progress bars, and pause-on-hover interaction.
 * Uses a requestAnimationFrame timer loop for smooth, drift-free progress tracking.
 */
export function StoryCarousel({
  items,
  interval = 5000,
  loop = true,
  className,
}: StoryCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Time tracking refs to allow mutation without re-renders during the animation loop
  const lastTimeRef = useRef<number>(Date.now());
  const elapsedRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const advance = useCallback(() => {
    if (!api) return;
    api.scrollNext();
  }, [api]);

  // Handle Slide Change Events
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
      setProgress(0);
      // Reset timer state immediately upon slide change to prevent progress bleed
      elapsedRef.current = 0;
      lastTimeRef.current = Date.now();
    };

    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  // Main Timer Loop
  useEffect(() => {
    if (!api || isPaused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const isLastSlide = current === items.length - 1;
    if (!loop && isLastSlide && progress === 100) {
      return;
    }

    // CRITICAL: Reset the reference time when the effect starts (or resumes from pause).
    // This prevents the progress bar from "jumping" forward by the duration of the pause.
    lastTimeRef.current = Date.now();

    const animate = () => {
      const now = Date.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      elapsedRef.current += delta;
      const newProgress = (elapsedRef.current / interval) * 100;

      if (newProgress >= 100) {
        setProgress(100);
        if (!loop && isLastSlide) {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          return;
        }
        advance();
      } else {
        setProgress(newProgress);
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [api, isPaused, interval, advance, current, loop, items.length, progress]);

  const handlePause = () => setIsPaused(true);
  const handleResume = () => setIsPaused(false);

  const handleJump = (index: number) => {
    if (!api) return;
    api.scrollTo(index);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!api) return;
    api.scrollPrev();
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!api) return;
    api.scrollNext();
  };

  return (
    <div
      className={cn(
        'relative w-full max-w-sm mx-auto aspect-[9/16] overflow-hidden rounded-3xl bg-neutral-950 shadow-2xl group select-none',
        className
      )}
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      onTouchStart={handlePause}
      onTouchEnd={handleResume}
    >
      <Carousel
        setApi={setApi}
        opts={{ loop: loop, duration: 20 }}
        // HACK: [&>div]:h-full targets the internal Embla wrapper.
        // Without this, the wrapper collapses and 'fill' images won't render.
        className='w-full h-full [&>div]:h-full'
      >
        <CarouselContent className='h-full -ms-0'>
          {items.map((item, index) => (
            <CarouselItem
              key={item.id}
              className='ps-0 h-full w-full basis-full relative'
            >
              <div className='relative w-full h-full'>
                <Image
                  src={item.image}
                  alt={item.heading}
                  fill
                  className='object-cover pointer-events-none'
                  priority={index === 0}
                  sizes='(max-width: 768px) 100vw, 400px'
                />
                <div className='absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 pointer-events-none' />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className='absolute top-4 start-4 end-4 z-20 flex gap-2 h-1'>
        {items.map((_, index) => {
          const isPast = index < current;
          const isCurrent = index === current;
          return (
            <button
              key={index}
              className='flex-1 h-full rounded-full bg-white/30 overflow-hidden transition-colors hover:bg-white/50 focus:outline-none'
              onClick={() => handleJump(index)}
              aria-label={`Go to story ${index + 1}`}
            >
              <div
                className='h-full bg-white origin-start'
                style={{
                  width: '100%',
                  // OPTIMIZATION: scaleX is more performant than animating width as it avoids layout thrashing.
                  transform: `scaleX(${
                    isPast ? 1 : isCurrent ? progress / 100 : 0
                  })`,
                  transition: isCurrent ? 'none' : 'transform 0.1s linear',
                }}
              />
            </button>
          );
        })}
      </div>

      <button
        onClick={handlePrev}
        className={cn(
          'absolute start-2 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full',
          'bg-black/20 backdrop-blur-sm text-white/80 border border-white/10',
          'hover:bg-black/40 hover:text-white hover:scale-105 transition-all duration-200',
          'opacity-0 group-hover:opacity-100 disabled:opacity-0'
        )}
        disabled={!loop && current === 0}
        aria-label='Previous slide'
      >
        <ChevronLeft className='w-6 h-6' />
      </button>

      <button
        onClick={handleNext}
        className={cn(
          'absolute end-2 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full',
          'bg-black/20 backdrop-blur-sm text-white/80 border border-white/10',
          'hover:bg-black/40 hover:text-white hover:scale-105 transition-all duration-200',
          'opacity-0 group-hover:opacity-100 disabled:opacity-0'
        )}
        disabled={!loop && current === items.length - 1}
        aria-label='Next slide'
      >
        <ChevronRight className='w-6 h-6' />
      </button>

      <div className='absolute bottom-10 start-6 end-6 z-20 text-white pointer-events-none'>
        <div
          key={current}
          className='animate-in fade-in slide-in-from-bottom-2 duration-500'
        >
          <h2 className='text-2xl font-bold leading-tight mb-2 drop-shadow-md'>
            {items[current].heading}
          </h2>
          <p className='text-sm text-white/90 font-medium leading-relaxed drop-shadow-md'>
            {items[current].subtext}
          </p>
        </div>
      </div>
    </div>
  );
}
