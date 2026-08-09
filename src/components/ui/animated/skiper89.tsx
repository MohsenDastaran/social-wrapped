import NumberFlow, { continuous } from "@number-flow/react"
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "motion/react"
import { useState } from "react"

import { cn } from "@/lib/utils"

type ScrollProgressIndicatorProps = {
  className?: string
}

const SVG_SIZE = 40
const STROKE_WIDTH = 2
const SVG_CENTER = SVG_SIZE / 2
const SVG_RADIUS = SVG_CENTER - STROKE_WIDTH - 1
const CIRCUMFERENCE = 2 * Math.PI * SVG_RADIUS

/**
 * Fixed circular scroll-progress indicator (Skiper 89).
 * Tracks document scroll — place once on long analytics / wrap pages.
 */
export function ScrollProgressIndicator({
  className,
}: ScrollProgressIndicatorProps) {
  const { scrollYProgress } = useScroll()
  const [progressPercent, setProgressPercent] = useState(0)

  const clampedProgress = useTransform(scrollYProgress, (value) =>
    Math.min(Math.max(value, 0), 1)
  )
  const progressAsPercent = useTransform(clampedProgress, (value) =>
    Math.round(value * 100)
  )
  const strokeDashoffset = useTransform(
    clampedProgress,
    (value) => CIRCUMFERENCE * (1 - value)
  )

  useMotionValueEvent(progressAsPercent, "change", (value) => {
    setProgressPercent(value)
  })

  return (
    <div
      className={cn(
        // Clear mobile bottom nav; sit lower on desktop. Non-interactive.
        "pointer-events-none fixed end-3 bottom-24 z-40 md:end-4 md:bottom-6",
        className
      )}
      aria-hidden
    >
      <div className="relative flex size-11 items-center justify-center rounded-xl border border-foreground/10 bg-background/80 shadow-sm backdrop-blur md:size-12 md:rounded-2xl">
        <svg
          className="absolute inset-0 size-full"
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          role="presentation"
        >
          <circle
            cx={SVG_CENTER}
            cy={SVG_CENTER}
            r={SVG_RADIUS}
            stroke="currentColor"
            strokeWidth={STROKE_WIDTH}
            className="opacity-25"
            fill="none"
          />
          <g transform={`rotate(-90 ${SVG_CENTER} ${SVG_CENTER})`}>
            <motion.circle
              cx={SVG_CENTER}
              cy={SVG_CENTER}
              r={SVG_RADIUS}
              stroke="currentColor"
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              style={{ strokeDashoffset }}
            />
          </g>
        </svg>
        <NumberFlow
          value={progressPercent}
          suffix="%"
          plugins={[continuous]}
          className="relative z-10 text-[0.58rem] font-semibold tabular-nums tracking-tight text-foreground md:text-[0.65rem]"
        />
      </div>
    </div>
  )
}

/** Demo / playground for the scroll progress control. */
const Skiper89 = () => {
  return (
    <div
      className={cn(
        "flex w-full max-w-3xl flex-col items-center justify-center gap-[10vh] py-[50vh]"
      )}
    >
      <ScrollProgressIndicator />

      <div className="-mt-10 mb-20 grid content-start justify-items-center gap-6 text-center">
        <span className="relative max-w-[12ch] text-xs leading-tight uppercase opacity-40 after:absolute after:top-full after:left-1/2 after:h-16 after:w-px after:bg-linear-to-b after:from-transparent after:to-foreground after:content-['']">
          see the progress while scroll
        </span>
      </div>

      {Array.from({ length: 20 }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "flex items-center justify-center px-4 text-justify text-base leading-relaxed text-foreground/70"
          )}
        >
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Repellendus,
          fugiat sint eos itaque soluta provident voluptatibus mollitia? Quas
          sit excepturi minima at id nihil consectetur libero, eligendi dicta
          molestias itaque delectus ullam facilis omnis voluptatibus hic
          mollitia deleniti sed earum voluptates reprehenderit commodi porro
          assumenda eum! Doloremque est quasi temporibus!
        </div>
      ))}
    </div>
  )
}

export { Skiper89 }
