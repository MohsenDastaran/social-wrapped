import { useLayoutEffect, useRef, type Ref } from "react"
import {
  Globe,
  LayoutGrid,
  MessageCircle,
  Music2,
  Share2,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  PLATFORM_CATEGORY_LABELS,
  PLATFORM_CATEGORY_ORDER,
  type PlatformCategory,
} from "@/lib/platforms"
import { cn } from "@/lib/utils"

export type PlatformCategoryFilterValue = PlatformCategory | "all"

const CATEGORY_ICONS = {
  messaging: MessageCircle,
  social: Share2,
  music: Music2,
  google: Globe,
  ai: Sparkles,
} as const satisfies Record<PlatformCategory, LucideIcon>

const FILTERS: {
  value: PlatformCategoryFilterValue
  label: string
  icon: LucideIcon
}[] = [
  { value: "all", label: "All", icon: LayoutGrid },
  ...PLATFORM_CATEGORY_ORDER.map((category) => ({
    value: category,
    label: PLATFORM_CATEGORY_LABELS[category],
    icon: CATEGORY_ICONS[category],
  })),
]

type PlatformCategoryFilterProps = {
  value: PlatformCategoryFilterValue
  onValueChange: (value: PlatformCategoryFilterValue) => void
  counts: Record<PlatformCategoryFilterValue, number>
  className?: string
  ref?: Ref<HTMLDivElement>
}

export function PlatformCategoryFilter({
  value,
  onValueChange,
  counts,
  className,
  ref,
}: PlatformCategoryFilterProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const selected = scrollerRef.current?.querySelector<HTMLElement>(
      '[data-state="on"], [aria-pressed="true"]'
    )
    selected?.scrollIntoView({ inline: "nearest", block: "nearest" })
  }, [value])

  return (
    <div
      ref={ref}
      className={cn(
        "sticky top-14 z-20 isolate -mx-6 border-b border-border/50 bg-background/90 backdrop-blur-md",
        "supports-backdrop-filter:bg-background/70",
        "sm:mx-0 sm:w-fit sm:max-w-full sm:rounded-full sm:border-0 sm:bg-muted/70 sm:p-0.5 sm:ring-1 sm:ring-foreground/10",
        className
      )}
    >
      <div
        ref={scrollerRef}
        className="scroll-fade-b max-h-20 overflow-x-hidden overflow-y-auto overscroll-y-contain px-6 py-1.5 sm:scroll-fade-x sm:max-h-none sm:overflow-x-auto sm:overflow-y-visible sm:px-0 sm:py-0"
      >
        <ToggleGroup
          value={[value]}
          onValueChange={(next) => {
            const selected = next[0]
            if (selected == null) return
            onValueChange(
              selected === "all" ? "all" : (selected as PlatformCategory)
            )
          }}
          variant="default"
          size="sm"
          spacing={1}
          className="flex w-full min-w-0 flex-wrap sm:w-max sm:flex-nowrap"
          aria-label="Filter by category"
        >
          {FILTERS.map((filter) => {
            const Icon = filter.icon
            const count = counts[filter.value]
            const empty = filter.value !== "all" && count === 0

            return (
              <ToggleGroupItem
                key={filter.value}
                value={filter.value}
                disabled={empty}
                className={cn(
                  "h-7 min-h-7 shrink-0 rounded-full px-2.5 text-[11px] font-medium",
                  "text-muted-foreground hover:bg-muted hover:text-foreground",
                  "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                  "data-[state=on]:hover:bg-primary data-[state=on]:hover:text-primary-foreground",
                  "data-[state=on]:shadow-sm"
                )}
              >
                <Icon data-icon="inline-start" />
                {filter.label}
                <span
                  className={cn(
                    "font-heading text-[0.6rem] font-semibold tabular-nums opacity-65",
                    empty && "opacity-40"
                  )}
                >
                  {count}
                </span>
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
      </div>
    </div>
  )
}
