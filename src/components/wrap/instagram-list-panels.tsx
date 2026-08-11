import { fmt } from "@/components/wrap/chart-theme"
import type { IgCountedHandle } from "@/platform/analytics-types"
import { listScrollClass } from "@/lib/scroll"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

/** Alias of `listScrollClass` for older Instagram/Google imports. */
export const IG_LIST_SCROLL_CLASS = listScrollClass

const ACCENT = {
  wash: "from-teal-500/14 via-teal-500/4 to-transparent dark:from-teal-400/12 dark:via-teal-400/3",
  bar: "bg-teal-600 dark:bg-teal-400",
  barTrack: "bg-teal-500/12 dark:bg-teal-400/12",
  badgeSoft:
    "bg-teal-500/12 text-teal-900 dark:bg-teal-400/15 dark:text-teal-100",
  avatar:
    "bg-teal-500/15 text-teal-900 ring-teal-500/25 dark:bg-teal-400/15 dark:text-teal-100",
} as const

function initials(username: string): string {
  const cleaned = username.replace(/[^\p{L}\p{N}]+/gu, " ").trim()
  if (!cleaned) return "?"
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
}

export function IgListPanel({
  title,
  description,
  icon: Icon,
  count,
  children,
  empty,
  emptyLabel,
}: {
  title: string
  description: string
  icon: LucideIcon
  count: number
  children: ReactNode
  empty: boolean
  emptyLabel: string
}) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <div
        className={cn(
          "relative shrink-0 overflow-hidden border-b border-border/50 bg-linear-to-br px-4 py-3.5",
          ACCENT.wash
        )}
      >
        <div className="relative flex items-start gap-3">
          <span
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-xl",
              ACCENT.badgeSoft
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
                    ACCENT.badgeSoft
                  )}
                >
                  {fmt(count)}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </div>
      {empty ? (
        <p className="px-4 py-8 text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className={listScrollClass}>{children}</div>
      )}
    </div>
  )
}

export function IgCountedList({
  title,
  description,
  icon,
  items,
  emptyLabel,
}: {
  title: string
  description: string
  icon: LucideIcon
  items: IgCountedHandle[]
  emptyLabel: string
}) {
  const ranked = items.filter((item) => item.username && item.count > 0)
  const max = Math.max(...ranked.map((i) => i.count), 1)

  return (
    <IgListPanel
      title={title}
      description={description}
      icon={icon}
      count={ranked.length}
      empty={ranked.length === 0}
      emptyLabel={emptyLabel}
    >
      <ol className="flex list-none flex-col gap-0.5 p-2">
        {ranked.map((item, index) => {
          const barShare = max > 0 ? item.count / max : 0
          return (
            <li key={`${item.username}-${index}`} className="shrink-0">
              <a
                href={`https://www.instagram.com/${encodeURIComponent(item.username)}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/45"
              >
                <span className="w-5 shrink-0 text-center text-[0.7rem] font-bold text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <span
                  className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-semibold ring-1",
                    ACCENT.avatar
                  )}
                  aria-hidden
                >
                  {initials(item.username)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      @{item.username}
                    </p>
                    <span className="shrink-0 text-[0.7rem] font-semibold text-muted-foreground tabular-nums">
                      {fmt(item.count)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "mt-1.5 h-1.5 w-full overflow-hidden rounded-full",
                      ACCENT.barTrack
                    )}
                  >
                    <div
                      className={cn("h-full rounded-full", ACCENT.bar)}
                      style={{ width: `${Math.max(barShare * 100, 6)}%` }}
                    />
                  </div>
                </div>
              </a>
            </li>
          )
        })}
      </ol>
    </IgListPanel>
  )
}
