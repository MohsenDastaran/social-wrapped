import {
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { Download, Loader2 } from "lucide-react"

import { AppLoader } from "@/components/app-loader"
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
  /** Full-bleed time series / calendar heatmap (~53 weeks × cell). */
  wide: { minWidth: 1040, pixelRatio: 3 },
}

export type WrapChartCardProps = {
  title: string
  description?: string
  exportName: string
  /** @deprecated Kept for call-site compatibility; real export captures the card DOM. */
  exportLines?: string[]
  /** Export frame width preset. Use `compact` for pie charts. @default "default" */
  exportSize?: WrapChartExportSize
  /**
   * Optional fixed layout width used while crafting 9:16 story / video slides.
   * Use for portrait-friendly grids (e.g. emoji) that look tiny when captured
   * at full desktop card width.
   */
  storyCaptureWidth?: number
  /**
   * Keep the live on-screen card width while crafting stories (word cloud packing
   * depends on width — parking narrow makes a different layout).
   */
  preserveStoryWidth?: boolean
  /**
   * `chart` — absolute host for ECharts (needs fixed height via `chartClassName`).
   * `flow` — normal document flow for non-chart content (emoji grids, lists).
   * @default "chart"
   */
  layout?: "chart" | "flow"
  /**
   * Override PNG capture strategy. Defaults to `dom` for `flow` layout and
   * `chart` otherwise. Use `chart` with `flow` when the card embeds an ECharts
   * canvas (e.g. calendar heatmap) so the canvas is snapshotted.
   */
  captureMode?: "chart" | "dom"
  /** Extra controls next to the export button (e.g. filters). */
  headerExtra?: ReactNode
  /** Hide the default PNG export — the card supplies its own (e.g. MP4). */
  hideExport?: boolean
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
  ...rest
}: {
  className?: string
  children: ReactNode
} & HTMLAttributes<HTMLDivElement>) {
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
    <div
      ref={ref}
      className={cn("relative w-full shrink-0", className)}
      {...rest}
    >
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
  storyCaptureWidth,
  preserveStoryWidth = false,
  layout = "chart",
  captureMode,
  headerExtra,
  hideExport = false,
  className,
  chartClassName,
  children,
}: WrapChartCardProps) {
  const resolvedCaptureMode =
    captureMode ?? (layout === "flow" ? "dom" : "chart")
  const exportDims = EXPORT_SIZES[exportSize]

  const { ref, exporting, exportError, exportPng } = useDomExport<HTMLDivElement>({
    ...exportDims,
    // Flow cards (KPI grids, emoji lists) need full HTML paint — not the chart compositor.
    // Override when a flow card still embeds an ECharts canvas.
    captureMode: resolvedCaptureMode,
  })

  return (
    <div className="relative min-h-0">
      {exporting ? (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/80 backdrop-blur-sm"
          data-export-ignore
          role="status"
          aria-live="polite"
          aria-label="Exporting chart"
        >
          <AppLoader size="md" fullscreen={false} label="Exporting" />
          <p className="text-sm text-muted-foreground">Exporting…</p>
        </div>
      ) : null}
      <div
        ref={ref}
        data-export-name={exportName}
        data-export-mode={resolvedCaptureMode}
        data-export-min-width={exportDims.minWidth}
        data-export-pixel-ratio={exportDims.pixelRatio}
        {...(storyCaptureWidth
          ? { "data-export-story-width": String(storyCaptureWidth) }
          : {})}
        {...(preserveStoryWidth ? { "data-export-preserve-width": "true" } : {})}
        className={cn(
          "relative flex min-h-0 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10",
          className
        )}
      >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 px-3 pt-3 sm:gap-3 sm:px-4 sm:pt-4">
        <div className="min-w-0 flex-1 basis-[min(100%,12rem)] text-start">
          <h3 className="font-heading text-sm font-semibold tracking-tight">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
          {exportError ? (
            <p
              role="alert"
              className="mt-1 text-[0.65rem] text-destructive"
              data-export-ignore
            >
              {exportError}
            </p>
          ) : null}
        </div>
        <div className="ms-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-1.5">
          {headerExtra}
          {hideExport ? null : (
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
          )}
        </div>
      </div>
      {layout === "flow" ? (
        <div
          data-export-region="chart"
          className={cn("flex min-h-0 w-full flex-1 flex-col", chartClassName)}
        >
          {children}
        </div>
      ) : (
        <SizedChartHost
          data-export-region="chart"
          className={chartClassName}
        >
          {children}
        </SizedChartHost>
      )}
    </div>
    </div>
  )
}
