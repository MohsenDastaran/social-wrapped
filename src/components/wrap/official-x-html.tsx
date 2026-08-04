import { useState } from "react"
import { ExternalLink, FileCode2, Loader2 } from "lucide-react"
import { motion } from "motion/react"

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

/** Opens X’s bundled `Your archive.html` in a new tab (no in-app preview). */
export function OfficialXHtml({
  wrapId,
  hasArchiveBlob,
  className,
}: OfficialXHtmlProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function openArchive() {
    if (!hasArchiveBlob) {
      setError(
        "This wrap doesn’t include the archive ZIP. Re-import your X data archive to enable Official X HTML."
      )
      return
    }

    setBusy(true)
    setError("")
    try {
      await registerXArchiveServiceWorker()
      await ensureXArchiveCached(wrapId)
      if (navigator.serviceWorker && navigator.serviceWorker.controller == null) {
        await navigator.serviceWorker.ready
      }
      const opened = window.open(
        officialXArchiveUrl(wrapId),
        "_blank",
        "noopener,noreferrer"
      )
      if (!opened) {
        setError("Pop-up blocked. Allow pop-ups for this site, then try again.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={cn("text-start", className)}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl ring-1 ring-border"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,color-mix(in_oklab,var(--foreground)_12%,transparent),transparent_55%),radial-gradient(90%_70%_at_100%_100%,color-mix(in_oklab,var(--muted-foreground)_10%,transparent),transparent_50%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[linear-gradient(to_right,color-mix(in_oklab,var(--foreground)_8%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--foreground)_8%,transparent)_1px,transparent_1px)] bg-size-[28px_28px] mask-[radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
        />

        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-8">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.3 }}
              className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-foreground text-background shadow-sm"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="size-5 fill-current"
              >
                <path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" />
              </svg>
            </motion.div>
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                From your archive
              </p>
              <h2 className="font-heading mt-1 text-2xl font-semibold tracking-tight">
                Official X HTML
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Open X’s original archive viewer with your tweets, media, and
                data — the same{" "}
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <FileCode2 className="size-3.5" aria-hidden />
                  Your archive.html
                </span>{" "}
                that ships in the ZIP.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <Button
              type="button"
              size="lg"
              disabled={busy || !hasArchiveBlob}
              onClick={() => void openArchive()}
              className="min-w-46"
            >
              {busy ? (
                <>
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                  Preparing…
                </>
              ) : (
                <>
                  <ExternalLink data-icon="inline-start" />
                  Open archive
                </>
              )}
            </Button>
            {!hasArchiveBlob ? (
              <p className="max-w-[16rem] text-xs text-muted-foreground sm:text-end">
                Re-import the X ZIP to unlock this.
              </p>
            ) : busy ? (
              <p className="max-w-[16rem] text-xs text-muted-foreground sm:text-end">
                Unpacking files for the first open…
              </p>
            ) : (
              <p className="max-w-[16rem] text-xs text-muted-foreground sm:text-end">
                Opens in a new tab · works best on desktop
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive ring-1 ring-destructive/20"
        >
          {error}
        </p>
      ) : null}
    </section>
  )
}
