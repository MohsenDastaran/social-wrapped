import { Crown, Languages } from "lucide-react"
import { useMemo, useState, useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { fmt } from "@/components/wrap/chart-theme"
import {
  PROFANITY_LANGUAGES,
  getProfanityLanguage,
  getProfanityLanguageVersion,
  setProfanityLanguage,
  subscribeProfanityLanguageVersion,
  type ProfanityLangId,
} from "@/lib/profanity-language"
import { cn } from "@/lib/utils"
import type { ProfanityParticipant, ProfanityStats } from "@/platform/analytics-types"

type ProfanityRankingCardProps = {
  wrapId: string
  chatId?: number
  selfName: string
  stats: ProfanityStats | undefined
  exportName: string
  /** Hide the account owner (wrap-wide ranking of contacts). */
  excludeSelf?: boolean
}

function LanguageGrid({
  value,
  onChange,
}: {
  value: ProfanityLangId | null
  onChange: (lang: ProfanityLangId) => void
}) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {PROFANITY_LANGUAGES.map((lang) => {
        const selected = value === lang.id
        return (
          <li key={lang.id}>
            <button
              type="button"
              onClick={() => onChange(lang.id)}
              aria-pressed={selected}
              className={cn(
                "flex h-full w-full flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-start transition-colors",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                selected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background hover:bg-muted/60"
              )}
            >
              <span className="text-sm font-semibold leading-tight" dir="auto">
                {lang.native}
              </span>
              <span className="text-[0.65rem] text-muted-foreground">
                {lang.native === lang.label ? lang.id.toUpperCase() : lang.label}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function rankingRows(
  participants: ProfanityParticipant[],
  youName: string,
  excludeSelf: boolean
): { rows: ProfanityParticipant[]; totalHits: number } {
  const filtered = excludeSelf
    ? participants.filter((row) => row.name !== youName)
    : participants
  const totalHits = filtered.reduce((sum, row) => sum + row.hits, 0)
  const rows = filtered.map((row) => ({
    ...row,
    pct: totalHits > 0 ? (row.hits / totalHits) * 100 : 0,
  }))
  return { rows, totalHits }
}

/** Language-gated ranking of who accounts for the most bad-word hits. */
export function ProfanityRankingCard({
  wrapId,
  chatId,
  selfName,
  stats,
  exportName,
  excludeSelf = false,
}: ProfanityRankingCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  useSyncExternalStore(
    subscribeProfanityLanguageVersion,
    getProfanityLanguageVersion,
    getProfanityLanguageVersion
  )
  const lang = getProfanityLanguage(wrapId, chatId)
  const youName = selfName.trim()
  const { rows, totalHits } = useMemo(() => {
    const ranking = lang ? stats?.byLanguage?.[lang] : undefined
    return rankingRows(ranking?.participants ?? [], youName, excludeSelf)
  }, [lang, stats, youName, excludeSelf])

  if (stats == null) return null

  const leader = rows[0]
  const langMeta = PROFANITY_LANGUAGES.find((item) => item.id === lang)
  const description = !lang
    ? "Pick the language this chat uses"
    : totalHits === 0
      ? "No spicy words showed up in this language"
      : leader
        ? `${leader.name} · ${Math.round(leader.pct)}% of spicy words`
        : `${fmt(totalHits)} spicy words`

  function pickLanguage(next: ProfanityLangId) {
    setProfanityLanguage(wrapId, next, chatId)
    setPickerOpen(false)
  }

  return (
    <WrapChartCard
      title="Who swears the most"
      description={description}
      exportName={exportName}
      exportSize="compact"
      layout="flow"
      headerExtra={
        lang ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            data-export-ignore
            onClick={() => setPickerOpen(true)}
          >
            <Languages data-icon="inline-start" />
            Change language
          </Button>
        ) : null
      }
      exportLines={
        lang && totalHits > 0
          ? rows.map(
              (row) =>
                `${row.name} ${Math.round(row.pct)}% (${fmt(row.hits)})`
            )
          : undefined
      }
    >
      {!lang ? (
        <div className="flex flex-col gap-3 p-4 pt-2" data-export-ignore>
          <p className="text-sm text-muted-foreground">
            Rankings stay hidden until you pick the language this chat uses.
          </p>
          <LanguageGrid value={null} onChange={pickLanguage} />
        </div>
      ) : totalHits === 0 || rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Nobody in this scope matched the {langMeta?.label ?? lang} list.
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
                      <Crown className="size-3.5 shrink-0 text-amber-500" aria-hidden />
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

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-md" data-export-ignore>
          <DialogHeader>
            <DialogTitle>Chat language</DialogTitle>
            <DialogDescription>
              Rankings use the bad-word list for the language you pick.
            </DialogDescription>
          </DialogHeader>
          <LanguageGrid value={lang} onChange={pickLanguage} />
        </DialogContent>
      </Dialog>
    </WrapChartCard>
  )
}
