import { fmt } from "@/components/wrap/chart-theme"
import { listScrollMaxClass } from "@/lib/scroll"
import type { CountedItem } from "@/platform/google-types"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

type AccentKey = "teal" | "sky" | "amber" | "violet" | "rose" | "emerald"

const ACCENT = {
  teal: {
    wash: "from-teal-500/14 via-teal-500/4 to-transparent dark:from-teal-400/12 dark:via-teal-400/3",
    badgeSoft:
      "bg-teal-500/12 text-teal-900 dark:bg-teal-400/15 dark:text-teal-100",
    avatar:
      "bg-teal-500/15 text-teal-900 ring-teal-500/25 dark:bg-teal-400/15 dark:text-teal-100",
  },
  sky: {
    wash: "from-sky-500/14 via-sky-500/4 to-transparent dark:from-sky-400/12 dark:via-sky-400/3",
    badgeSoft:
      "bg-sky-500/12 text-sky-900 dark:bg-sky-400/15 dark:text-sky-100",
    avatar:
      "bg-sky-500/15 text-sky-900 ring-sky-500/25 dark:bg-sky-400/15 dark:text-sky-100",
  },
  amber: {
    wash: "from-amber-500/14 via-amber-500/4 to-transparent dark:from-amber-400/12 dark:via-amber-400/3",
    badgeSoft:
      "bg-amber-500/12 text-amber-950 dark:bg-amber-400/15 dark:text-amber-100",
    avatar:
      "bg-amber-500/15 text-amber-950 ring-amber-500/25 dark:bg-amber-400/15 dark:text-amber-100",
  },
  violet: {
    wash: "from-violet-500/14 via-violet-500/4 to-transparent dark:from-violet-400/12 dark:via-violet-400/3",
    badgeSoft:
      "bg-violet-500/12 text-violet-950 dark:bg-violet-400/15 dark:text-violet-100",
    avatar:
      "bg-violet-500/15 text-violet-950 ring-violet-500/25 dark:bg-violet-400/15 dark:text-violet-100",
  },
  rose: {
    wash: "from-rose-500/14 via-rose-500/4 to-transparent dark:from-rose-400/12 dark:via-rose-400/3",
    badgeSoft:
      "bg-rose-500/12 text-rose-900 dark:bg-rose-400/15 dark:text-rose-100",
    avatar:
      "bg-rose-500/15 text-rose-900 ring-rose-500/25 dark:bg-rose-400/15 dark:text-rose-100",
  },
  emerald: {
    wash: "from-emerald-500/14 via-emerald-500/4 to-transparent dark:from-emerald-400/12 dark:via-emerald-400/3",
    badgeSoft:
      "bg-emerald-500/12 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-100",
    avatar:
      "bg-emerald-500/15 text-emerald-900 ring-emerald-500/25 dark:bg-emerald-400/15 dark:text-emerald-100",
  },
} as const

function initials(label: string): string {
  const cleaned = label.replace(/[^\p{L}\p{N}]+/gu, " ").trim()
  if (!cleaned) return "?"
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
}

function Monogram({ label, accent }: { label: string; accent: AccentKey }) {
  const palette = ACCENT[accent]
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-semibold ring-1 tabular-nums",
        palette.avatar
      )}
      aria-hidden
    >
      {initials(label)}
    </span>
  )
}

export function CountedRankList({
  title,
  description,
  icon: Icon,
  items,
  emptyLabel,
  accent = "teal",
  limit,
}: {
  title: string
  description?: string
  icon: LucideIcon
  items: CountedItem[]
  emptyLabel: string
  accent?: AccentKey
  limit?: number
}) {
  const palette = ACCENT[accent]
  const ranked = (limit ? items.slice(0, limit) : items).filter(
    (item) => item.name.trim() && item.count > 0
  )
  const empty = ranked.length === 0

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <div
        className={cn(
          "relative shrink-0 overflow-hidden border-b border-border/50 bg-linear-to-br px-4 py-3.5",
          palette.wash
        )}
      >
        <div className="relative flex items-start gap-3">
          <span
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-xl",
              palette.badgeSoft
            )}
            aria-hidden
          >
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-heading text-sm font-semibold tracking-tight">
                {title}
              </p>
              {!empty ? (
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2 py-0.5 text-[0.65rem] font-semibold tabular-nums",
                    palette.badgeSoft
                  )}
                >
                  {fmt(ranked.length)}
                </span>
              ) : null}
            </div>
            {description ? (
              <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {empty ? (
        <p className="px-4 py-8 text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ol className={cn("flex list-none flex-col gap-0.5 p-2", listScrollMaxClass)}>
          {ranked.map((item, index) => (
            <li key={`${item.name}-${index}`} className="shrink-0">
              <div className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-start">
                <span className="w-5 shrink-0 text-center text-[0.7rem] font-bold text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <Monogram label={item.name} accent={accent} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {item.name}
                </span>
                <span className="shrink-0 text-[0.7rem] font-semibold text-muted-foreground tabular-nums">
                  {fmt(item.count)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
