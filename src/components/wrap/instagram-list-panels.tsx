import { fmt } from "@/components/wrap/chart-theme"
import type { IgCountedHandle } from "@/platform/analytics-types"
import { listScrollClass } from "@/lib/scroll"
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

/** Alias of `listScrollClass` for older Instagram/Google imports. */
export const IG_LIST_SCROLL_CLASS = listScrollClass

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
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="flex shrink-0 items-start gap-2 border-b border-border/60 bg-muted/25 px-3 py-2.5">
        <Icon
          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold tracking-tight">{title}</p>
            {!empty ? (
              <span className="shrink-0 text-[0.65rem] font-medium text-muted-foreground tabular-nums">
                {fmt(count)}
              </span>
            ) : null}
          </div>
          <p className="text-[0.65rem] text-muted-foreground">{description}</p>
        </div>
      </div>
      {empty ? (
        <p className="px-3 py-6 text-xs text-muted-foreground">{emptyLabel}</p>
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
  const max = Math.max(...items.map((i) => i.count), 1)

  return (
    <IgListPanel
      title={title}
      description={description}
      icon={icon}
      count={items.length}
      empty={items.length === 0}
      emptyLabel={emptyLabel}
    >
      <ul className="divide-y divide-border/50">
        {items.map((item, index) => {
          const pct = (item.count / max) * 100
          return (
            <li key={`${item.username}-${index}`} className="px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="w-5 shrink-0 text-center text-[0.65rem] font-semibold text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <a
                    href={`https://www.instagram.com/${encodeURIComponent(item.username)}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-xs font-medium hover:underline"
                  >
                    @{item.username}
                  </a>
                </div>
                <span className="shrink-0 text-[0.65rem] text-muted-foreground tabular-nums">
                  {fmt(item.count)}
                </span>
              </div>
              <div className="ms-7 mt-1 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-teal-600 dark:bg-teal-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </IgListPanel>
  )
}
