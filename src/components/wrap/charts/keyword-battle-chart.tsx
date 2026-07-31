import { useMemo, useState, type FormEvent } from "react"
import { Search } from "lucide-react"

import { EChartsPieChart } from "@/components/evilcharts/charts/echarts-pie-chart"
import { Button } from "@/components/ui/button"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { SENT_RECEIVED_PIE, fmt } from "@/components/wrap/chart-theme"
import type { KeywordStats } from "@/platform/analytics-types"
import { cn } from "@/lib/utils"

type KeywordBattleChartProps = {
  keywords: KeywordStats | undefined
  exportName: string
  youLabel?: string
  themLabel?: string
  className?: string
}

const SUGGESTION_LIMIT = 6

/** Interactive “who says X more?” donut — search a word, compare you vs them. */
export function KeywordBattleChart({
  keywords,
  exportName,
  youLabel = "You",
  themLabel = "Them",
  className,
}: KeywordBattleChartProps) {
  const counts = keywords?.counts ?? {}
  const hasIndex = Object.keys(counts).length > 0

  const suggestions = useMemo(
    () => topKeywords(counts, SUGGESTION_LIMIT),
    [counts]
  )

  const [query, setQuery] = useState("")
  const [active, setActive] = useState("")

  function runSearch(raw: string) {
    setQuery(raw)
    setActive(normalizeQuery(raw))
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    runSearch(query)
  }

  const match = active ? readPair(counts[active]) : undefined
  const you = match?.[0] ?? 0
  const them = match?.[1] ?? 0
  const total = you + them
  const searched = active.length > 0

  const data =
    total > 0
      ? [
          {
            side: "you",
            count: you,
            pctLabel: `${Math.round((you / total) * 100)}%`,
          },
          {
            side: "them",
            count: them,
            pctLabel: `${Math.round((them / total) * 100)}%`,
          },
        ].filter((d) => d.count > 0)
      : []

  const pieConfig = {
    you: { ...SENT_RECEIVED_PIE.sent!, label: youLabel },
    them: { ...SENT_RECEIVED_PIE.received!, label: themLabel },
  }

  const winner =
    total === 0
      ? null
      : you === them
        ? "Tie"
        : you > them
          ? youLabel
          : themLabel

  const description = !hasIndex
    ? "Re-import your export to unlock keyword battle"
    : !searched
      ? "Search a word to see who says it more"
      : total === 0
        ? `No matches for “${active}” in this chat`
        : `${fmt(total)}× “${active}” · ${winner === "Tie" ? "even split" : `${winner} leads`}`

  return (
    <WrapChartCard
      title="Keyword battle"
      description={description}
      exportName={exportName}
      exportSize="compact"
      layout="flow"
      // Flow body (search + legend) but chart capture so the donut canvas is included.
      captureMode="chart"
      exportLines={
        searched && total > 0
          ? [
              `Word ${active}`,
              `${youLabel} ${fmt(you)}`,
              `${themLabel} ${fmt(them)}`,
            ]
          : undefined
      }
      className={className}
      chartClassName="flex flex-col gap-3 pb-3 pt-3"
    >
      <div className="flex flex-col gap-3 px-4" data-export-ignore>
        <form
          className="flex items-center gap-1.5"
          onSubmit={onSubmit}
          role="search"
        >
          <label className="sr-only" htmlFor="keyword-battle-input">
            Search keyword
          </label>
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute inset-s-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="keyword-battle-input"
              type="search"
              value={query}
              onChange={(e) => runSearch(e.target.value)}
              placeholder='Try “sorry” or “money”'
              autoComplete="off"
              spellCheck={false}
              disabled={!hasIndex}
              className={cn(
                "h-8 w-full rounded-md border border-border bg-transparent pe-2 ps-7 text-xs outline-none",
                "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            size="xs"
            disabled={!hasIndex || !normalizeQuery(query)}
          >
            Battle
          </Button>
        </form>

        {suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((word) => {
              const selected = active === word
              return (
                <button
                  key={word}
                  type="button"
                  onClick={() => runSearch(word)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  {word}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      <div className="h-56 w-full sm:h-64">
        {data.length > 0 ? (
          <EChartsPieChart
            className="h-full w-full px-3"
            data={data}
            dataKey="count"
            nameKey="side"
            config={pieConfig}
          >
            <EChartsPieChart.Legend isClickable />
            <EChartsPieChart.Tooltip />
            <EChartsPieChart.Pie isClickable innerRadius="48%" outerRadius="72%">
              <EChartsPieChart.Label dataKey="pctLabel" position="inside" />
            </EChartsPieChart.Pie>
          </EChartsPieChart>
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            {!hasIndex
              ? "Keyword index missing. Re-import this chat’s export to enable battles."
              : !searched
                ? "Pick a suggestion or type any word you both use."
                : `Neither of you said “${active}” (in the indexed vocabulary).`}
          </div>
        )}
      </div>
    </WrapChartCard>
  )
}

function normalizeQuery(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^['\u2019]+|['\u2019]+$/g, "")
}

function readPair(entry: unknown): [number, number] | undefined {
  if (entry == null) return undefined
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
  return undefined
}

/** Highest-frequency words, skipping tiny tokens already filtered in Rust. */
function topKeywords(
  counts: Record<string, [number, number]>,
  limit: number
): string[] {
  return Object.entries(counts)
    .map(([word, pair]) => {
      const [you, them] = readPair(pair) ?? [0, 0]
      return { word, total: you + them }
    })
    .filter((e) => e.total > 0 && e.word.length >= 4)
    .sort((a, b) => b.total - a.total || a.word.localeCompare(b.word))
    .slice(0, limit)
    .map((e) => e.word)
}
