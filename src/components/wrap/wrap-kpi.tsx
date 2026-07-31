import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const KPI_ACCENTS = {
  teal: "text-teal-600 dark:text-teal-400",
  amber: "text-amber-600 dark:text-amber-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  sky: "text-sky-600 dark:text-sky-400",
  violet: "text-violet-600 dark:text-violet-400",
} as const

export type WrapKpiAccent = keyof typeof KPI_ACCENTS

export type WrapKpiProps = {
  label: string
  value: string
  icon: LucideIcon
  accent: WrapKpiAccent
  /** Softer fill when nested inside another card. */
  inset?: boolean
  className?: string
}

/** Compact metric tile — label + icon + big number. */
export function WrapKpi({
  label,
  value,
  icon: Icon,
  accent,
  inset = false,
  className,
}: WrapKpiProps) {
  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-4 ring-1 sm:px-5 sm:py-5",
        inset
          ? "bg-muted/40 ring-foreground/5"
          : "bg-card ring-foreground/10",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {label}
        </p>
        <Icon
          aria-hidden
          className={cn("size-4 shrink-0 sm:size-5", KPI_ACCENTS[accent])}
        />
      </div>
      <p className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
        {value}
      </p>
    </div>
  )
}
