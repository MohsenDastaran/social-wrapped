import type { ReactNode } from "react"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { downloadMockPng } from "@/lib/mock-export"
import { cn } from "@/lib/utils"

export type WrapChartCardProps = {
  title: string
  description?: string
  exportName: string
  exportLines?: string[]
  className?: string
  chartClassName?: string
  children: ReactNode
}

/** Chart frame with an individual mock PNG export action. */
export function WrapChartCard({
  title,
  description,
  exportName,
  exportLines,
  className,
  chartClassName,
  children,
}: WrapChartCardProps) {
  function handleExport() {
    downloadMockPng(`${exportName}.png`, {
      title,
      subtitle: description ?? "Chart export mock — replace with real render",
      lines: exportLines,
      width: 1280,
      height: 720,
      gradient: ["#134e4a", "#0e7490", "#65a30d"],
    })
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0 text-start">
          <h3 className="font-heading text-sm font-semibold tracking-tight">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={handleExport}
          aria-label={`Export ${title}`}
        >
          <Download data-icon="inline-start" />
          Export
        </Button>
      </div>
      <div className={cn("min-h-0 w-full flex-1", chartClassName)}>
        {children}
      </div>
    </div>
  )
}
