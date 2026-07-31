import { useEffect, useState } from "react"
import { History } from "lucide-react"
import { Link } from "react-router"

import { AppLoader } from "@/components/app-loader"
import { PlatformLogo } from "@/components/platform-logo"
import { getPlatform } from "@/lib/platforms"
import { cn } from "@/lib/utils"
import { listWraps, wrapPath, type WrapRecord } from "@/lib/wrap-history"

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

function formatCount(n: number): string {
  return new Intl.NumberFormat().format(n)
}

export function HistoryPage() {
  const [wraps, setWraps] = useState<WrapRecord[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void listWraps().then((next) => {
      if (!cancelled) setWraps(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

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

  if (wraps.length === 0) {
    return (
      <div className="flex w-full max-w-xl flex-col items-center gap-4 rounded-xl border border-border/60 bg-background/85 p-8 text-center shadow-sm backdrop-blur-sm">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <History className="size-6" />
        </div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          History
        </h1>
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
    )
  }

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <header className="text-center sm:text-start">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          History
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reopen any wrap you’ve analyzed on this device.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {wraps.map((wrap) => {
          const platform = getPlatform(wrap.platformId)
          return (
            <li key={wrap.id}>
              <Link
                to={wrapPath(wrap.id)}
                className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 transition-colors hover:bg-muted/40"
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
                    {wrap.stats.displayName}
                    {platform ? (
                      <span className="ms-1.5 font-sans text-xs font-medium text-muted-foreground">
                        · {platform.name}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {formatCount(wrap.stats.totalMessages)} messages ·{" "}
                    {formatDate(wrap.createdAt)}
                  </p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
