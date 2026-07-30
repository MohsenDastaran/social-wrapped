import { useEffect, useRef, useState, type ReactNode } from "react"
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

/**
 * Chart host that waits until the box has non-zero size before mounting
 * children. Prevents ECharts "Can't get DOM width or height" warnings when
 * charts init while flex/percentage parents are still 0×0.
 */
function SizedChartHost({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const markReady = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        setReady(true)
        return true
      }
      return false
    }

    if (markReady()) return

    const ro = new ResizeObserver(() => {
      if (markReady()) ro.disconnect()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} className={cn("relative w-full shrink-0", className)}>
      {/* Absolute fill gives ECharts concrete pixel bounds (not % of collapsing flex). */}
      {ready ? <div className="absolute inset-0 min-h-0">{children}</div> : null}
    </div>
  )
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
      <SizedChartHost className={chartClassName}>{children}</SizedChartHost>
    </div>
  )
}
