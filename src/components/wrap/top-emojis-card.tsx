import { fmt } from "@/components/wrap/chart-theme"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import type { EmojiEntry } from "@/platform/analytics-types"
import { withEmojiPresentation } from "@/lib/emoji"
import { cn } from "@/lib/utils"

type TopEmojisCardProps = {
  emojis: EmojiEntry[]
  exportName: string
  title?: string
  description?: string
  /** @default 12 */
  limit?: number
  className?: string
}

/** Ranked emoji grid — no chart, just the glyphs and counts. */
export function TopEmojisCard({
  emojis,
  exportName,
  title = "Top emojis",
  description = "Most used emoji characters in messages",
  limit = 12,
  className,
}: TopEmojisCardProps) {
  const items = emojis.slice(0, limit).filter((e) => e.emoji && e.count > 0)
  if (items.length === 0) return null

  const peak = items[0]?.count ?? 1

  return (
    <WrapChartCard
      title={title}
      description={description}
      exportName={exportName}
      exportSize="compact"
      layout="flow"
      exportLines={items
        .slice(0, 5)
        .map((e) => `${withEmojiPresentation(e.emoji)} ${fmt(e.count)}`)}
      className={className}
    >
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
    </WrapChartCard>
  )
}
