import { fmt } from "@/components/wrap/chart-theme"
import { listScrollClass } from "@/lib/scroll"
import type { CountedItem } from "@/platform/google-types"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export function CountedRankList({
  title,
  description,
  icon: Icon,
  items,
  emptyLabel,
}: {
  title: string
  description?: string
  icon: LucideIcon
  items: CountedItem[]
  emptyLabel: string
}) {
  const empty = items.length === 0
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="flex shrink-0 items-start gap-2 border-b border-border/60 bg-muted/25 px-3 py-2.5">
        <Icon
          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight">{title}</p>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {fmt(items.length)}
        </span>
      </div>
      {empty ? (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <ul className={cn(listScrollClass, "divide-y divide-border/50")}>
          {items.map((item, index) => (
            <li
              key={`${item.name}-${index}`}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate">
                <span className="me-2 tabular-nums text-muted-foreground">
                  {index + 1}.
                </span>
                {item.name}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {fmt(item.count)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
