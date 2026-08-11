import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export type OverviewStat = {
  label: string
  value: string
  icon: LucideIcon
  /** Tailwind text color classes, e.g. `text-sky-600 dark:text-sky-400`. */
  accent: string
}

export type OverviewSection = {
  title?: string
  stats: OverviewStat[]
}

export function OverviewStatCell({ label, value, icon: Icon, accent }: OverviewStat) {
  return (
    <div className="min-w-0 overflow-visible rounded-xl bg-muted/35 px-3 py-3 ring-1 ring-foreground/5">
      <div className="flex items-center gap-1.5">
        <Icon aria-hidden className={cn("size-3.5 shrink-0", accent)} />
        <p className="min-w-0 truncate text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </p>
      </div>
      <p className="mt-1.5 font-heading text-xl font-semibold tracking-tight text-foreground tabular-nums leading-tight sm:text-2xl">
        {value}
      </p>
    </div>
  )
}

/**
 * Compact 2-column KPI grid for wrap pages and story capture.
 * Matches the X overview story layout (flat cells, optional section titles).
 */
export function OverviewKpiPanel({
  sections,
  className,
}: {
  sections: OverviewSection[]
  className?: string
}) {
  const showTitles = sections.some((s) => Boolean(s.title))

  return (
    <div className={cn("flex flex-col gap-3.5", className)}>
      {sections.map((section, index) => (
        <div
          key={section.title ?? `section-${index}`}
          className={cn(
            "flex flex-col gap-2",
            showTitles && index > 0 && "border-t border-border/70 pt-3.5"
          )}
        >
          {section.title ? (
            <h3 className="text-[0.7rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {section.title}
            </h3>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            {section.stats.map((stat) => (
              <OverviewStatCell key={stat.label} {...stat} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
