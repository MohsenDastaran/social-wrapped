import { useMemo, useState, type ReactNode } from "react"

import { fmt } from "@/components/wrap/chart-theme"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import type { EmojiEntry } from "@/platform/analytics-types"
import { withEmojiPresentation } from "@/lib/emoji"
import { cn } from "@/lib/utils"

export type EmojiScope = {
  id: string
  label: string
  emojis: EmojiEntry[]
}

type TopEmojisCardProps = {
  emojis: EmojiEntry[]
  exportName: string
  title?: string
  description?: string
  /** @default 12 */
  limit?: number
  className?: string
  /**
   * Optional All / You / Contact (etc.) scopes.
   * When set, a segmented toggle appears in the card header.
   */
  scopes?: EmojiScope[]
}

/** Ranked emoji grid — no chart, just the glyphs and counts. */
export function TopEmojisCard({
  emojis,
  exportName,
  title = "Top emojis",
  description = "Most used emoji characters in messages",
  limit = 12,
  className,
  scopes,
}: TopEmojisCardProps) {
  const usableScopes = useMemo(
    () =>
      (scopes ?? []).filter((s) =>
        s.emojis.some((e) => e.emoji && e.count > 0)
      ),
    [scopes]
  )
  const showToggle = usableScopes.length > 1

  const [scopeId, setScopeId] = useState(() => usableScopes[0]?.id ?? "all")
  const activeScope = usableScopes.find((s) => s.id === scopeId) ?? usableScopes[0]
  const source = activeScope?.emojis ?? emojis

  const items = source.slice(0, limit).filter((e) => e.emoji && e.count > 0)
  const hasAny =
    items.length > 0 ||
    emojis.some((e) => e.emoji && e.count > 0) ||
    usableScopes.length > 0

  if (!hasAny) return null

  const peak = items[0]?.count ?? 1
  const scopeSuffix = activeScope && showToggle ? `-${activeScope.id}` : ""

  return (
    <WrapChartCard
      title={title}
      description={description}
      exportName={`${exportName}${scopeSuffix}`}
      exportSize="compact"
      layout="flow"
      exportLines={items
        .slice(0, 5)
        .map((e) => `${withEmojiPresentation(e.emoji)} ${fmt(e.count)}`)}
      className={className}
      headerExtra={
        showToggle ? (
          <div
            className="flex items-center gap-1 rounded-lg bg-muted p-0.5"
            role="group"
            aria-label="Emoji scope"
            data-export-ignore
          >
            {usableScopes.map((scope) => (
              <ScopeButton
                key={scope.id}
                active={scope.id === (activeScope?.id ?? scopeId)}
                onClick={() => setScopeId(scope.id)}
              >
                {scope.label}
              </ScopeButton>
            ))}
          </div>
        ) : null
      }
    >
      {items.length > 0 ? (
        <ol className="grid list-none grid-cols-3 gap-2 p-4 sm:grid-cols-4 md:grid-cols-6">
          {items.map((entry, index) => {
            const share = peak > 0 ? entry.count / peak : 0
            const isTop = index === 0
            const glyph = withEmojiPresentation(entry.emoji)
            return (
              <li
                key={`${entry.emoji}-${index}`}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-center",
                  isTop
                    ? "bg-primary/10 ring-1 ring-primary/25"
                    : "bg-muted/45 ring-1 ring-foreground/5"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1.5 start-1.5 font-semibold tabular-nums text-muted-foreground",
                    isTop ? "text-[0.65rem] text-primary" : "text-[0.6rem]"
                  )}
                >
                  #{index + 1}
                </span>
                <span
                  className={cn(
                    "leading-none [font-variant-emoji:emoji]",
                    isTop ? "text-4xl sm:text-[2.75rem]" : "text-3xl"
                  )}
                  role="img"
                  aria-label={`Rank ${index + 1}`}
                >
                  {glyph}
                </span>
                <span className="font-heading text-xs font-semibold tabular-nums tracking-tight text-foreground">
                  {fmt(entry.count)}
                </span>
                <span
                  className="mt-0.5 h-0.5 w-full max-w-12 overflow-hidden rounded-full bg-foreground/10"
                  aria-hidden
                >
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      isTop ? "bg-primary" : "bg-foreground/35"
                    )}
                    style={{ width: `${Math.max(share * 100, 8)}%` }}
                  />
                </span>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No emojis in this view.
        </p>
      )}
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
        "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors sm:px-3 sm:text-xs",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}
