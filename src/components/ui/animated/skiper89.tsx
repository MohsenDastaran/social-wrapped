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

/**
 * Fixed, draggable circular scroll-progress control (Skiper 89).
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

  useMotionValueEvent(progressAsPercent, "change", (value) => {
    setProgressPercent(value)
  })

  const svgRadius = 22
  const circumference = 2 * Math.PI * svgRadius

  return (
    <motion.div
      drag
      dragMomentum={false}
      className={cn(
        // Clear mobile bottom nav; sit lower on desktop
        "fixed end-4 bottom-24 z-40 cursor-grab active:cursor-grabbing md:bottom-6",
        className
      )}
      aria-hidden
    >
      <div className="relative flex size-16 items-center justify-center rounded-2xl border border-foreground/10 bg-background/70 backdrop-blur">
        <svg
          className="absolute inset-1 size-14"
          viewBox="0 0 56 56"
          role="presentation"
        >
          <circle
            cx="28"
            cy="28"
            r={svgRadius}
            stroke="currentColor"
            strokeWidth="2"
            className="opacity-30"
            fill="none"
          />
          <motion.circle
            cx="28"
            cy="28"
            r={svgRadius}
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            style={{
              pathLength: clampedProgress,
              rotate: -90,
              transformOrigin: "50% 50%",
            }}
          />
        </svg>
        <NumberFlow
          value={progressPercent}
          suffix="%"
          plugins={[continuous]}
          className="relative z-10 text-[0.7rem] font-medium tabular-nums tracking-tight text-foreground"
        />
      </div>
    </motion.div>
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
