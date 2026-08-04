import { useEffect, useState } from "react"
import { Expand, ExternalLink, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  ensureXArchiveCached,
  officialXArchiveUrl,
  registerXArchiveServiceWorker,
} from "@/lib/x-archive-viewer"
import { cn } from "@/lib/utils"

type OfficialXHtmlProps = {
  wrapId: string
  hasArchiveBlob?: boolean
  className?: string
}

/** Embeds X’s bundled `Your archive.html` via iframe + service worker. */
export function OfficialXHtml({
  wrapId,
  hasArchiveBlob,
  className,
}: OfficialXHtmlProps) {
  const [status, setStatus] = useState<"idle" | "preparing" | "ready" | "error">(
    "idle"
  )
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null
  )
  const [error, setError] = useState("")
  const [expanded, setExpanded] = useState(false)
  const src = officialXArchiveUrl(wrapId)

  useEffect(() => {
    if (!hasArchiveBlob) {
      setStatus("error")
      setError(
        "This wrap doesn’t include the archive ZIP for Official X HTML. Re-import the ZIP to enable it."
      )
      return
    }

    let cancelled = false
    setStatus("preparing")
    setError("")

    void (async () => {
      try {
        await registerXArchiveServiceWorker()
        if (cancelled) return
        await ensureXArchiveCached(wrapId, (done, total) => {
          if (!cancelled) setProgress({ done, total })
        })
        if (cancelled) return
        // Wait briefly for SW to control the page when first registered.
        if (navigator.serviceWorker?.controller == null) {
          await navigator.serviceWorker?.ready
        }
        if (!cancelled) setStatus("ready")
      } catch (err) {
        if (!cancelled) {
          setStatus("error")
          setError(err instanceof Error ? err.message : String(err))
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [wrapId, hasArchiveBlob])

  return (
    <section className={cn("flex flex-col gap-3 text-start", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Official X HTML
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            X’s bundled archive viewer (`Your archive.html`). Best on a wide
            desktop viewport.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status === "ready" ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExpanded((v) => !v)}
              >
                <Expand data-icon="inline-start" />
                {expanded ? "Compact" : "Expand"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                render={<a href={src} target="_blank" rel="noreferrer" />}
                nativeButton={false}
              >
                <ExternalLink data-icon="inline-start" />
                Open
              </Button>
            </>
          ) : null}
        </div>
      </header>

      {status === "preparing" ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl bg-muted/40 px-4 py-8 text-sm text-muted-foreground ring-1 ring-border/60">
          <Loader2 className="size-5 animate-spin" />
          <p>Preparing official archive viewer…</p>
          {progress && progress.total > 0 ? (
            <p className="tabular-nums text-xs">
              {progress.done} / {progress.total} files
            </p>
          ) : null}
        </div>
      ) : null}

      {status === "error" ? (
        <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-500/25 dark:text-amber-100">
          {error || "Could not load Official X HTML."}
        </p>
      ) : null}

      {status === "ready" ? (
        <iframe
          title="Official X HTML"
          src={src}
          className={cn(
            "w-full rounded-xl bg-background ring-1 ring-border",
            expanded ? "h-[85vh]" : "h-[70vh]"
          )}
        />
      ) : null}
    </section>
  )
}
