import { ArrowLeft } from "lucide-react"
import { Link, Navigate, useParams } from "react-router"

import { PlatformLogo } from "@/components/platform-logo"
import { Button } from "@/components/ui/button"
import { WrapChatAnalytics } from "@/components/wrap/wrap-chat-analytics"
import { WrapMainAnalytics } from "@/components/wrap/wrap-main-analytics"
import { WrapShareMedia } from "@/components/wrap/wrap-share-media"
import { getPlatform } from "@/lib/platforms"
import { cn } from "@/lib/utils"
import { getWrap } from "@/lib/wrap-history"

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

/** Dedicated wrap result page — `/wrap/:wrapId`, also opened from History. */
export function WrapPage() {
  const { wrapId } = useParams<{ wrapId: string }>()
  const wrap = wrapId ? getWrap(wrapId) : undefined

  if (!wrap) {
    return <Navigate to="/history" replace />
  }

  const platform = getPlatform(wrap.platformId)

  return (
    <div className="flex w-full max-w-2xl flex-col items-stretch gap-10 text-start">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="default"
          className="text-muted-foreground"
          render={<Link to="/history" />}
          nativeButton={false}
        >
          <ArrowLeft data-icon="inline-start" />
          History
        </Button>
      </div>

      <header className="flex flex-col items-center text-center">
        {platform ? (
          <span
            className={cn(
              "mb-4 flex size-16 items-center justify-center rounded-[1.2rem] shadow-sm ring-1 ring-inset",
              "bg-linear-to-br from-background to-muted/80",
              platform.accentClass
            )}
          >
            <PlatformLogo
              id={platform.id}
              title={platform.name}
              className="size-9 drop-shadow-sm"
            />
          </span>
        ) : null}
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {wrap.stats.displayName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {platform?.name ?? "Export"} wrap · {formatDate(wrap.createdAt)}
        </p>
      </header>

      <WrapShareMedia
        displayName={wrap.stats.displayName}
        stats={wrap.stats}
      />

      <WrapMainAnalytics stats={wrap.stats} />

      <WrapChatAnalytics stats={wrap.stats} />
    </div>
  )
}
