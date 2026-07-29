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
  /** Line height in rem for each rolling item (default 2). */
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

export function AnimatedTextRoller({
  prefix = "Hello,",
  items = DEFAULT_ITEMS,
  intervalMs = 2200,
  className,
  lineHeightRem = 2,
  stacked = false,
  onIndexChange,
}: AnimatedTextRollerProps) {
  const [index, setIndex] = useState(0)

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

  const lineStyle = { height: `${lineHeightRem}rem` }

  return (
    <div
      className={cn(
        stacked
          ? "flex w-full flex-col items-center gap-1 text-center"
          : "flex flex-wrap items-center justify-center gap-x-2 gap-y-1",
        className
      )}
    >
      {prefix ? (
        <p className="text-3xl font-semibold tracking-tight text-black sm:text-4xl">
          {prefix}
        </p>
      ) : null}
      <div
        className={cn("overflow-hidden", stacked ? "w-full" : "text-start")}
        style={lineStyle}
      >
        <div
          className="transition-transform duration-700 ease-in-out"
          style={{
            transform: `translateY(-${index * lineHeightRem}rem)`,
          }}
        >
          {items.map((item, i) => (
            <p
              key={`${item.text}-${i}`}
              className={cn(
                "flex items-center text-3xl font-semibold leading-tight tracking-tight capitalize sm:text-4xl",
                stacked ? "w-full justify-center text-center" : "justify-start",
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
