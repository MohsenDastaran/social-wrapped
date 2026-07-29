"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

export interface AnimatedTextItem {
  text: string
  color?: string
}

interface AnimatedTextRollerProps {
  prefix?: string
  items?: AnimatedTextItem[]
  intervalMs?: number
  className?: string
  /**
   * Line height in rem for the rolling track.
   * Prefer leaving unset — responsive defaults fit phones and desktop.
   */
  lineHeightRem?: number
  /** Stack prefix above the roller and center both (better for long phrases). */
  stacked?: boolean
  onIndexChange?: (index: number) => void
}

const DEFAULT_ITEMS: AnimatedTextItem[] = [
  { text: "Initializing …", color: "text-blue-500" },
  { text: "Fetching Data…", color: "text-orange-400" },
  { text: "Rendering…", color: "text-teal-400" },
  { text: "System Ready", color: "text-sky-500" },
]

/** Mobile / tablet / desktop line heights when lineHeightRem is not set. */
const RESPONSIVE_LINE_REM = { mobile: 2.5, tablet: 2.5, desktop: 4 }

export function AnimatedTextRoller({
  prefix = "Hello,",
  items = DEFAULT_ITEMS,
  intervalMs = 2200,
  className,
  lineHeightRem,
  stacked = false,
  onIndexChange,
}: AnimatedTextRollerProps) {
  const [index, setIndex] = useState(0)
  const [lineRem, setLineRem] = useState(
    lineHeightRem ?? RESPONSIVE_LINE_REM.mobile
  )

  useEffect(() => {
    if (lineHeightRem !== undefined) {
      setLineRem(lineHeightRem)
      return
    }

    const update = () => {
      const width = window.innerWidth
      if (width >= 640) setLineRem(RESPONSIVE_LINE_REM.desktop)
      else if (width >= 400) setLineRem(RESPONSIVE_LINE_REM.tablet)
      else setLineRem(RESPONSIVE_LINE_REM.mobile)
    }

    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [lineHeightRem])

  useEffect(() => {
    if (items.length <= 1) return

    const interval = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % items.length
        onIndexChange?.(next)
        return next
      })
    }, intervalMs)

    return () => clearInterval(interval)
  }, [items.length, intervalMs, onIndexChange])

  useEffect(() => {
    onIndexChange?.(0)
  }, [onIndexChange])

  const lineStyle = { height: `${lineRem}rem` }

  return (
    <div
      className={cn(
        stacked
          ? "flex w-full max-w-full flex-col items-center gap-1 text-center"
          : "flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1",
        className
      )}
    >
      {prefix ? (
        <p className="text-2xl font-semibold tracking-tight text-black sm:text-3xl md:text-4xl">
          {prefix}
        </p>
      ) : null}
      <div
        className={cn(
          "w-full max-w-full overflow-hidden px-1",
          stacked ? "text-center" : "text-start sm:w-auto"
        )}
        style={{
          ...lineStyle,
          translate: "0px -8px",
        }}
      >
        <div
          className="transition-transform duration-700 ease-in-out"
          style={{
            transform: `translateY(-${index * lineRem}rem)`,
          }}
        >
          {items.map((item, i) => (
            <p
              key={`${item.text}-${i}`}
              className={cn(
                "flex items-center px-1 text-xl font-semibold leading-snug tracking-tight text-balance capitalize sm:text-3xl md:text-4xl",
                stacked
                  ? "w-full justify-center text-center"
                  : "justify-start whitespace-nowrap",
                item.color ?? "text-primary"
              )}
              style={lineStyle}
            >
              {item.text}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AnimatedTextRoller
