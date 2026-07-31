import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Link, Navigate, useParams } from "react-router"

import { Button } from "@/components/ui/button"
import { MarkerHighlight } from "@/components/ui/animated/animated-text-08"
import { WrapChatAnalytics } from "@/components/wrap/wrap-chat-analytics"
import { WrapMainAnalytics } from "@/components/wrap/wrap-main-analytics"
import { WrapShareMedia } from "@/components/wrap/wrap-share-media"
import { WrapTopContacts } from "@/components/wrap/wrap-top-contacts"
import { getPlatform } from "@/lib/platforms"
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
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null)

  useEffect(() => {
    setSelectedChatId(null)
  }, [wrapId])

  useEffect(() => {
    if (selectedChatId == null) return
    const frame = requestAnimationFrame(() => {
      document.getElementById("contact-stats")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [selectedChatId])

  if (!wrap?.analytics?.account) {
    return <Navigate to="/history" replace />
  }

  const platform = getPlatform(wrap.platformId)
  const hasFullAnalytics =
    wrap.analytics.chats.length > 0 ||
    wrap.analytics.account.heatmap.days.length > 0 ||
    wrap.analytics.account.emojis.topOverall.length > 0

  const selectedChat =
    selectedChatId != null
      ? wrap.analytics.chats.find((c) => c.chatId === selectedChatId)
      : undefined

  return (
    <div className="-mt-4 flex w-full max-w-4xl flex-col items-stretch gap-6 text-start sm:-mt-6 sm:gap-8 md:max-w-4xl lg:max-w-5xl">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-start">
          <Button
            variant="ghost"
            size="sm"
            className="-ms-2 mb-1 h-8 text-muted-foreground"
            render={<Link to="/history" />}
            nativeButton={false}
          >
            <ArrowLeft data-icon="inline-start" />
            History
          </Button>
          <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
            <MarkerHighlight
              highlight={platform?.name ?? "Export"}
              after="Analytics for"
              className="leading-tight"
              markerColor="bg-emerald-600"
              highlightedTextColor="text-gray-950"
            />{" "}
            <MarkerHighlight
              highlight={wrap.stats.displayName}
              className="leading-tight"
              markerColor="bg-emerald-600"
              highlightedTextColor="text-gray-950"
            />
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {platform?.name ?? "Export"} wrap · {formatDate(wrap.createdAt)}
          </p>
        </div>
      </header>

      {!hasFullAnalytics ? (
        <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-500/25 dark:text-amber-100">
          This wrap was saved before full analytics. Re-import the export to
          unlock heatmaps, circadian charts, and per-chat breakdowns.
        </p>
      ) : null}

      <WrapShareMedia displayName={wrap.stats.displayName} stats={wrap.stats} />

      <WrapMainAnalytics analytics={wrap.analytics} />

      <WrapTopContacts
        analytics={wrap.analytics}
        selectedChatId={selectedChatId}
        onSelect={setSelectedChatId}
      />

      {selectedChat ? (
        <WrapChatAnalytics
          chat={selectedChat}
          onClose={() => setSelectedChatId(null)}
        />
      ) : wrap.analytics.chats.length > 0 ? (
        <p className="rounded-xl bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground ring-1 ring-border/50">
          Select a contact above to see their analytics.
        </p>
      ) : null}
    </div>
  )
}
