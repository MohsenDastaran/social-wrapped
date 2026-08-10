import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
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
  /**
   * Fixed mode when no All / You / Contact toggle is shown.
   * Ignored when the scope toggle is active.
   * @default "all"
   */
  mode?: WordCloudCountMode
  /** Label for the “you” scope (e.g. account display name). */
  youLabel?: string
  /** Label for the contact scope (e.g. chat name). */
  themLabel?: string
  /**
   * Show All / You / Contact toggle when both sides have words.
   * @default true when both labels are provided
   */
  enableScopeToggle?: boolean
  title?: string
  description?: string
  /** Max words laid out in the cloud. @default 72 */
  limit?: number
  className?: string
}

const DEFAULT_LIMIT = 72
const MIN_WORD_LEN = 3

type WordScope = {
  id: WordCloudCountMode
  label: string
  words: Word[]
}

/**
 * Reusable keyword word cloud for wrap analytics (account or per-chat).
 * Optional All / User / Contact toggle (same pattern as Top emojis).
 */
export function WordCloudChart({
  keywords,
  exportName,
  mode = "all",
  youLabel,
  themLabel,
  enableScopeToggle,
  title = "Word cloud",
  description,
  limit = DEFAULT_LIMIT,
  className,
}: WordCloudChartProps) {
  const counts = keywords?.counts ?? {}

  const scopes = useMemo(() => {
    const allWords = keywordsToWords(counts, "all", limit)
    const youWords = keywordsToWords(counts, "you", limit)
    const themWords = keywordsToWords(counts, "them", limit)

    const wantToggle =
      enableScopeToggle ?? Boolean(youLabel && themLabel)

    if (!wantToggle) {
      const fixed =
        mode === "you" ? youWords : mode === "them" ? themWords : allWords
      const label =
        mode === "you"
          ? (youLabel ?? "You")
          : mode === "them"
            ? (themLabel ?? "Contact")
            : "All"
      return fixed.length > 0
        ? ([{ id: mode, label, words: fixed }] satisfies WordScope[])
        : []
    }

    const next: WordScope[] = [
      { id: "all", label: "All", words: allWords },
      { id: "you", label: truncateLabel(youLabel || "You"), words: youWords },
      {
        id: "them",
        label: truncateLabel(themLabel || "Contact"),
        words: themWords,
      },
    ]
    return next.filter((s) => s.words.length > 0)
  }, [counts, limit, mode, youLabel, themLabel, enableScopeToggle])

  const showToggle = scopes.length > 1
  const [scopeId, setScopeId] = useState<WordCloudCountMode>(
    () => scopes[0]?.id ?? mode
  )

  const activeScope =
    scopes.find((s) => s.id === scopeId) ?? scopes[0] ?? null

  // Keep selection valid when keywords / labels change.
  useEffect(() => {
    if (!scopes.some((s) => s.id === scopeId) && scopes[0]) {
      setScopeId(scopes[0].id)
    }
  }, [scopes, scopeId])

  if (!activeScope) return null

  const words = activeScope.words
  const totalMentions = words.reduce((sum, w) => sum + w.value, 0)
  const scopeSuffix = showToggle ? `-${activeScope.id}` : ""
  const resolvedDescription =
    description ??
    `${fmt(words.length)} words · ${fmt(totalMentions)} mentions${
      activeScope.id === "you"
        ? ` from ${activeScope.label}`
        : activeScope.id === "them"
          ? ` from ${activeScope.label}`
          : ""
    }`

  return (
    <WrapChartCard
      title={title}
      description={resolvedDescription}
      exportName={`${exportName}${scopeSuffix}`}
      exportSize="default"
      layout="chart"
      captureMode="dom"
      className={className}
      // Fixed host (chart layout) so the SVG cannot grow the card via min-content.
      chartClassName="h-56 sm:h-64"
      headerExtra={
        showToggle ? (
          <div
            className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-0.5"
            role="group"
            aria-label="Word cloud scope"
            data-export-ignore
          >
            {scopes.map((scope) => (
              <ScopeButton
                key={scope.id}
                active={scope.id === activeScope.id}
                onClick={() => setScopeId(scope.id)}
              >
                {scope.label}
              </ScopeButton>
            ))}
          </div>
        ) : null
      }
    >
      <WordCloudCanvas key={activeScope.id} words={words} />
    </WrapChartCard>
  )
}

function ScopeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors sm:px-3 sm:text-xs",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
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
      // Content box only — padding must not inflate the d3-cloud layout size.
      setSize({
        width: Math.max(0, el.clientWidth),
        height: Math.max(0, el.clientHeight),
      })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const maxValue = words[0]?.value ?? 1
  const minValue = words[words.length - 1]?.value ?? 1
  const { minPx, maxPx } = fontRangeForSize(size.width, size.height)

  return (
    <div
      ref={hostRef}
      className="h-full min-h-0 w-full overflow-hidden px-2 pb-2 pt-1"
    >
      {size.width > 0 && size.height > 0 ? (
        <WordCloud
          words={words}
          width={size.width}
          height={size.height}
          font="Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
          fontWeight={600}
          padding={1}
          spiral="rectangular"
          rotate={() => 0}
          fontSize={(word) =>
            scaleFontSize(word.value, minValue, maxValue, minPx, maxPx)
          }
          fill={(_, index) => colors[index % colors.length]!}
          enableTooltip
          svgProps={{
            width: "100%",
            height: "100%",
            preserveAspectRatio: "xMidYMid meet",
            className: "block h-full w-full overflow-hidden",
          }}
          renderWord={(data, ref) => (
            <AnimatedWordRenderer data={data} ref={ref} animationDelay={12} />
          )}
        />
      ) : null}
    </div>
  )
}

/** Scale word sizes to the host so wide desktop cards stay filled, not sparse. */
function fontRangeForSize(width: number, height: number): {
  minPx: number
  maxPx: number
} {
  if (width <= 0 || height <= 0) return { minPx: 11, maxPx: 36 }
  const shortSide = Math.min(width, height)
  const maxPx = Math.round(
    Math.min(52, Math.max(28, shortSide * 0.2 + width * 0.012))
  )
  const minPx = Math.round(Math.max(10, maxPx * 0.28))
  return { minPx, maxPx }
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

function truncateLabel(s: string, n = 14): string {
  const t = s.trim()
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
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
