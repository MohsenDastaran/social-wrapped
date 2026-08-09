import { useEffect, useMemo, useRef, useState } from "react"
import {
  AnimatedWordRenderer,
  WordCloud,
  type Word,
} from "@isoterik/react-word-cloud"

import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { fmt } from "@/components/wrap/chart-theme"
import type { KeywordStats } from "@/platform/analytics-types"
import { cn } from "@/lib/utils"

export type WordCloudCountMode = "all" | "you" | "them"

type WordCloudChartProps = {
  keywords: KeywordStats | undefined
  exportName: string
  /** Which side of the keyword index to visualize. @default "all" */
  mode?: WordCloudCountMode
  title?: string
  description?: string
  /** Max words laid out in the cloud. @default 72 */
  limit?: number
  className?: string
}

const DEFAULT_LIMIT = 72
const MIN_WORD_LEN = 3

/**
 * Reusable keyword word cloud for wrap analytics (account or per-chat).
 * Uses the same `KeywordStats` index as Keyword Battle.
 */
export function WordCloudChart({
  keywords,
  exportName,
  mode = "all",
  title = "Word cloud",
  description,
  limit = DEFAULT_LIMIT,
  className,
}: WordCloudChartProps) {
  const words = useMemo(
    () => keywordsToWords(keywords?.counts ?? {}, mode, limit),
    [keywords, mode, limit]
  )

  if (words.length === 0) return null

  const totalMentions = words.reduce((sum, w) => sum + w.value, 0)
  const resolvedDescription =
    description ??
    `${fmt(words.length)} words · ${fmt(totalMentions)} mentions${
      mode === "you" ? " from you" : mode === "them" ? " from them" : ""
    }`

  return (
    <WrapChartCard
      title={title}
      description={resolvedDescription}
      exportName={exportName}
      exportSize="default"
      layout="flow"
      captureMode="dom"
      className={className}
      chartClassName="h-64 sm:h-72"
    >
      <WordCloudCanvas words={words} />
    </WrapChartCard>
  )
}

function WordCloudCanvas({ words }: { words: Word[] }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const colors = useChartColors()

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    const update = () => {
      const rect = el.getBoundingClientRect()
      setSize({
        width: Math.max(0, Math.floor(rect.width)),
        height: Math.max(0, Math.floor(rect.height)),
      })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const maxValue = words[0]?.value ?? 1
  const minValue = words[words.length - 1]?.value ?? 1

  return (
    <div ref={hostRef} className={cn("h-full w-full px-2 pb-2 pt-1")}>
      {size.width > 0 && size.height > 0 ? (
        <WordCloud
          words={words}
          width={size.width}
          height={size.height}
          font="Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
          fontWeight={600}
          padding={2}
          spiral="archimedean"
          rotate={() => 0}
          fontSize={(word) =>
            scaleFontSize(word.value, minValue, maxValue, 12, 42)
          }
          fill={(_, index) => colors[index % colors.length]!}
          enableTooltip
          renderWord={(data, ref) => (
            <AnimatedWordRenderer data={data} ref={ref} animationDelay={12} />
          )}
        />
      ) : null}
    </div>
  )
}

function useChartColors(): string[] {
  const [colors, setColors] = useState(() => readChartColors())

  useEffect(() => {
    setColors(readChartColors())
    const observer = new MutationObserver(() => {
      setColors(readChartColors())
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => observer.disconnect()
  }, [])

  return colors
}

function readChartColors(): string[] {
  const style = getComputedStyle(document.documentElement)
  const fromTheme = [1, 2, 3, 4, 5]
    .map((n) => style.getPropertyValue(`--chart-${n}`).trim())
    .filter(Boolean)
  if (fromTheme.length > 0) return fromTheme
  return [
    "oklch(0.7 0.14 165)",
    "oklch(0.6 0.12 200)",
    "oklch(0.65 0.14 145)",
    "oklch(0.55 0.1 230)",
    "oklch(0.5 0.1 165)",
  ]
}

function scaleFontSize(
  value: number,
  minValue: number,
  maxValue: number,
  minPx: number,
  maxPx: number
): number {
  if (maxValue <= minValue) return (minPx + maxPx) / 2
  const t = Math.sqrt((value - minValue) / (maxValue - minValue))
  return minPx + t * (maxPx - minPx)
}

function readPair(entry: unknown): [number, number] {
  if (entry == null) return [0, 0]
  if (Array.isArray(entry) && entry.length >= 2) {
    return [Number(entry[0]) || 0, Number(entry[1]) || 0]
  }
  if (typeof entry === "object") {
    const o = entry as Record<string, unknown>
    return [
      Number(o[0] ?? o.you ?? 0) || 0,
      Number(o[1] ?? o.them ?? 0) || 0,
    ]
  }
  return [0, 0]
}

/** Convert KeywordStats counts into d3-cloud words for a given side. */
export function keywordsToWords(
  counts: Record<string, [number, number]>,
  mode: WordCloudCountMode,
  limit: number
): Word[] {
  return Object.entries(counts)
    .map(([text, pair]) => {
      const [you, them] = readPair(pair)
      const value =
        mode === "you" ? you : mode === "them" ? them : you + them
      return { text, value }
    })
    .filter(
      (w) =>
        w.value > 0 &&
        w.text.length >= MIN_WORD_LEN &&
        !/^\d+$/.test(w.text)
    )
    .sort((a, b) => b.value - a.value || a.text.localeCompare(b.text))
    .slice(0, limit)
}
