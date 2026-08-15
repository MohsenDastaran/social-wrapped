import { Crown } from "lucide-react"
import { useSyncExternalStore } from "react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { fmt } from "@/components/wrap/chart-theme"
import {
  PROFANITY_LANGUAGES,
  getProfanityLanguage,
  getProfanityLanguageVersion,
  isProfanityLangId,
  setProfanityLanguage,
  subscribeProfanityLanguageVersion,
  type ProfanityLangId,
} from "@/lib/profanity-language"
import { cn } from "@/lib/utils"
import type { ProfanityStats } from "@/platform/analytics-types"

type ProfanityRankingCardProps = {
  wrapId: string
  chatId?: number
  selfName: string
  stats: ProfanityStats | undefined
  exportName: string
}

function LanguageChips({
  value,
  onChange,
  compact,
}: {
  value: ProfanityLangId | null
  onChange: (lang: ProfanityLangId) => void
  compact?: boolean
}) {
  return (
    <ToggleGroup
      value={value ? [value] : []}
      onValueChange={(groupValue) => {
        const next = groupValue[0]
        if (isProfanityLangId(next)) onChange(next)
      }}
      variant="outline"
      spacing={1}
      size="sm"
      className={cn(
        "flex w-full flex-wrap",
        compact ? "justify-end" : "justify-start"
      )}
      aria-label="Chat language"
    >
      {PROFANITY_LANGUAGES.map((lang) => (
        <ToggleGroupItem
          key={lang.id}
          value={lang.id}
          className={cn(
            "rounded-full",
            compact && "h-6 px-2 text-[0.65rem]"
          )}
        >
          {lang.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** Language-gated ranking of who accounts for the most bad-word hits. */
export function ProfanityRankingCard({
  wrapId,
  chatId,
  selfName,
  stats,
  exportName,
}: ProfanityRankingCardProps) {
  useSyncExternalStore(
    subscribeProfanityLanguageVersion,
    getProfanityLanguageVersion,
    getProfanityLanguageVersion
  )
  const lang = getProfanityLanguage(wrapId, chatId)
  if (stats == null) return null
  const ranking = lang ? stats?.byLanguage?.[lang] : undefined
  const rows = ranking?.participants ?? []
  const totalHits = ranking?.totalHits ?? 0
  const leader = rows[0]
  const youName = selfName.trim()

  const description = !lang
    ? "Pick the language this chat uses"
    : totalHits === 0
      ? "No spicy words showed up in this language"
      : leader
        ? `${leader.name === youName ? "You" : leader.name} · ${Math.round(leader.pct)}% of spicy words`
        : `${fmt(totalHits)} spicy words`

  return (
    <WrapChartCard
      title="Who swears the most"
      description={description}
      exportName={exportName}
      exportSize="compact"
      layout="flow"
      exportLines={
        lang && totalHits > 0
          ? rows.map(
              (row) =>
                `${row.name === youName ? "You" : row.name} ${Math.round(row.pct)}% (${fmt(row.hits)})`
            )
          : undefined
      }
    >
      {lang ? (
        <div className="px-4 pt-1" data-export-ignore>
          <LanguageChips
            compact
            value={lang}
            onChange={(next) => setProfanityLanguage(wrapId, next, chatId)}
          />
        </div>
      ) : null}
      {!lang ? (
        <div className="flex flex-col gap-3 p-4 pt-2" data-export-ignore>
          <p className="text-sm text-muted-foreground">
            What language is this chat? Rankings stay hidden until you pick one.
          </p>
          <LanguageChips
            value={null}
            onChange={(next) => setProfanityLanguage(wrapId, next, chatId)}
          />
        </div>
      ) : totalHits === 0 || rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Nobody in this scope matched the {lang.toUpperCase()} list.
        </p>
      ) : (
        <ol className="flex flex-col gap-2.5 p-4 pt-2">
          {rows.map((row, index) => {
            const isYou = row.name === youName
            const isLeader = index === 0 && row.hits > 0
            const label = isYou ? "You" : row.name
            const width = Math.max(row.pct, row.hits > 0 ? 4 : 0)
            return (
              <li key={row.name} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      "flex min-w-0 items-center gap-1.5 text-sm font-medium",
                      isYou && "text-primary"
                    )}
                  >
                    {isLeader ? (
                      <Crown
                        className="size-3.5 shrink-0 text-amber-500"
                        aria-hidden
                      />
                    ) : (
                      <span className="w-3.5 shrink-0 text-center text-[0.65rem] tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                    )}
                    <span className="truncate">{label}</span>
                  </span>
                  <span className="shrink-0 font-heading text-sm font-semibold tabular-nums">
                    {Math.round(row.pct)}%
                    <span className="ms-1.5 text-[0.65rem] font-medium text-muted-foreground">
                      {fmt(row.hits)}
                    </span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      isLeader ? "bg-primary" : "bg-primary/55"
                    )}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </WrapChartCard>
  )
}
