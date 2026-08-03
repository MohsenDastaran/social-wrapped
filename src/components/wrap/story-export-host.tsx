import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type StoryExportHostProps = {
  /** Matches story/video catalog `exportName`. */
  exportName: string
  children: ReactNode
  className?: string
  /**
   * Park width for story capture (square-ish IG panels).
   * Compact default keeps list panels readable in 9:16.
   */
  storyCaptureWidth?: number
}

/**
 * Capture host for list/KPI panels that aren't WrapChartCards.
 * Stories/video look up `[data-export-name]` + prefer `[data-export-region="chart"]`.
 */
export function StoryExportHost({
  exportName,
  children,
  className,
  storyCaptureWidth = 480,
}: StoryExportHostProps) {
  return (
    <div
      data-export-name={exportName}
      data-export-mode="dom"
      data-export-min-width={storyCaptureWidth}
      data-export-story-width={storyCaptureWidth}
      data-export-pixel-ratio={3}
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl bg-card text-card-foreground ring-1 ring-foreground/10",
        className
      )}
    >
      <div data-export-region="chart" className="min-w-0 p-3 sm:p-4">
        {children}
      </div>
    </div>
  )
}
