import { useEffect, useState } from "react"
import { History, Trash2 } from "lucide-react"
import { Link } from "react-router"

import { AppLoader } from "@/components/app-loader"
import { PlatformLogo } from "@/components/platform-logo"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { getPlatform } from "@/lib/platforms"
import { cn } from "@/lib/utils"
import {
  deleteWrap,
  listWraps,
  wrapEntryPath,
  type WrapRecord,
} from "@/lib/wrap-history"

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

function formatCount(n: number): string {
  return new Intl.NumberFormat().format(n)
}

function formatBytes(size: number): string {
  if (size >= 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`
  }
  return `${(size / 1024).toFixed(1)} KB`
}

function wrapMetaLine(wrap: WrapRecord): string {
  const date = formatDate(wrap.createdAt)
  const messages = wrap.stats.totalMessages
  if (messages > 0) {
    return `${formatCount(messages)} messages · ${date}`
  }
  const bytes = wrap.stats.fileSizeBytes || wrap.analytics.fileSizeBytes || 0
  if (bytes > 0) {
    return `${formatBytes(bytes)} · ${date}`
  }
  return date
}

function wrapTitle(wrap: WrapRecord): string {
  if (wrap.platformId === "whatsapp") {
    return (
      wrap.analytics.chats[0]?.chatName ||
      wrap.stats.aboutPreview ||
      wrap.stats.displayName
    )
  }
  return wrap.stats.displayName
}

export function HistoryPage() {
  const [wraps, setWraps] = useState<WrapRecord[] | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void listWraps().then((next) => {
      if (!cancelled) setWraps(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function confirmDelete(wrap: WrapRecord) {
    setDeletingId(wrap.id)
    try {
      await deleteWrap(wrap.id)
      setWraps((prev) => (prev ? prev.filter((w) => w.id !== wrap.id) : prev))
    } finally {
      setDeletingId(null)
    }
  }

  if (wraps === null) {
    return (
      <AppLoader
        size="md"
        fullscreen={false}
        label="Loading history"
        className="flex min-h-[40vh] w-full"
      />
    )
  }

  return (
    <div className="flex w-full max-w-4xl flex-col items-stretch">
      <header className="relative mb-7 overflow-hidden rounded-3xl border border-border/60 bg-card px-5 py-8 text-center shadow-[0_18px_50px_-34px] shadow-foreground/50 sm:mb-9 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -inset-s-20 -top-24 size-60 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -inset-e-16 size-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="relative">
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-primary sm:text-xs">
            Your digital archive
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            History
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Reopen any wrap you’ve analyzed on this device — stories, chats, and
            insights stay private until you clear them.
          </p>
        </div>
      </header>

      {wraps.length === 0 ? (
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-xl border border-border/60 bg-background/85 p-8 text-center shadow-sm backdrop-blur-sm">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <History className="size-6" />
          </div>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            No wraps yet
          </h2>
          <p className="text-sm text-muted-foreground">
            Your analyzed exports will show up here. Import a platform file to
            create your first wrap.
          </p>
          <Link
            to="/"
            className="mt-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Choose a platform
          </Link>
        </div>
      ) : (
        <ul className="mx-auto flex w-full max-w-lg flex-col gap-3">
          {wraps.map((wrap) => {
            const platform = getPlatform(wrap.platformId)
            const title = wrapTitle(wrap)
            const busy = deletingId === wrap.id
            return (
              <li
                key={wrap.id}
                className="flex items-stretch gap-1.5 rounded-xl bg-card ring-1 ring-foreground/10 transition-colors hover:bg-muted/40"
              >
                <Link
                  to={wrapEntryPath(wrap)}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3"
                >
                  {platform ? (
                    <span
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
                        "bg-linear-to-br from-background to-muted/80",
                        platform.accentClass
                      )}
                    >
                      <PlatformLogo
                        id={platform.id}
                        title={platform.name}
                        className="size-6"
                      />
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1 text-start">
                    <p className="truncate font-heading text-sm font-semibold tracking-tight">
                      {title}
                      {platform ? (
                        <span className="ms-1.5 font-sans text-xs font-medium text-muted-foreground">
                          · {platform.name}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {wrapMetaLine(wrap)}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center pe-2">
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={busy}
                          aria-label={`Delete ${title}`}
                          className="text-muted-foreground hover:text-destructive"
                        />
                      }
                    >
                      <Trash2 />
                    </AlertDialogTrigger>
                    <AlertDialogContent size="sm">
                      <AlertDialogHeader>
                        <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                          <Trash2 />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Delete wrap?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes “{title}” from history on this
                          device. You can re-import the export anytime.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel variant="outline">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          disabled={busy}
                          onClick={() => void confirmDelete(wrap)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
