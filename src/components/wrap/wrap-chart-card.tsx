import { useEffect, useRef, useState, type ReactNode } from "react"
import { Download, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useDomExport } from "@/hooks/use-dom-export"
import { cn } from "@/lib/utils"

export type WrapChartExportSize = "compact" | "default" | "wide"

const EXPORT_SIZES: Record<
  WrapChartExportSize,
  { minWidth: number; pixelRatio: number }
> = {
  /** Pie / square charts — smaller frame, HD backing store. */
  compact: { minWidth: 480, pixelRatio: 3 },
  /** Typical bar / area cards. */
  default: { minWidth: 720, pixelRatio: 3 },
  /** Full-bleed time series. */
  wide: { minWidth: 900, pixelRatio: 3 },
}

export type WrapChartCardProps = {
  title: string
  description?: string
  exportName: string
  /** @deprecated Kept for call-site compatibility; real export captures the card DOM. */
  exportLines?: string[]
  /** Export frame width preset. Use `compact` for pie charts. @default "default" */
  exportSize?: WrapChartExportSize
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
      {ready ? <div className="absolute inset-0 min-h-0">{children}</div> : null}
    </div>
  )
}

/** Chart frame with a real PNG export of the full card (hi-res on mobile). */
export function WrapChartCard({
  title,
  description,
  exportName,
  exportSize = "default",
  className,
  chartClassName,
  children,
}: WrapChartCardProps) {
  const { ref, exporting, exportPng } = useDomExport<HTMLDivElement>(
    EXPORT_SIZES[exportSize]
  )

  return (
    <div
      ref={ref}
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
          data-export-ignore
          disabled={exporting}
          onClick={() => void exportPng(`${exportName}.png`)}
          aria-label={`Export ${title}`}
        >
          {exporting ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <Download data-icon="inline-start" />
          )}
          {exporting ? "Exporting…" : "Export"}
        </Button>
      </div>
      <SizedChartHost className={chartClassName}>{children}</SizedChartHost>
    </div>
  )
}
