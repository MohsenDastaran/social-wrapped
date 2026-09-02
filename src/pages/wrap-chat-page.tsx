import { useEffect, useState } from "react"
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Hash, Timer } from "lucide-react"
import { Link, Navigate, useParams } from "react-router"

import { AppLoader } from "@/components/app-loader"
import { Button } from "@/components/ui/button"
import { MarkerHighlight } from "@/components/ui/animated/animated-text-08"
import { ScrollProgressIndicator } from "@/components/ui/animated/skiper89"
import { chatDisplay } from "@/components/wrap/chat-display"
import { WrapChatAnalytics } from "@/components/wrap/wrap-chat-analytics"
import { WrapKpi } from "@/components/wrap/wrap-kpi"
import { fmt, fmtDuration } from "@/components/wrap/chart-theme"
import { averageTalkSecs } from "@/lib/call-analytics"
import { getPlatform, wrapUiCopy } from "@/lib/platforms"
import { getWrap, wrapPath, type WrapRecord } from "@/lib/wrap-history"

/** Per-contact analytics — `/wrap/:wrapId/chat/:chatId`. */
export function WrapChatPage() {
  const { wrapId, chatId: chatIdParam } = useParams<{
    wrapId: string
    chatId: string
  }>()
  const chatId = chatIdParam != null ? Number(chatIdParam) : NaN
  const [wrap, setWrap] = useState<WrapRecord | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    if (!wrapId) {
      setWrap(null)
      return
    }
    setWrap(undefined)
    void getWrap(wrapId).then((next) => {
      if (!cancelled) setWrap(next ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [wrapId])

  if (wrap === undefined) {
    return (
      <AppLoader
        size="md"
        fullscreen={false}
        label="Loading chat"
        className="flex min-h-[40vh] w-full"
      />
    )
  }

  if (!wrap?.analytics?.account || !Number.isFinite(chatId)) {
    return <Navigate to="/history" replace />
  }

  const platform = getPlatform(wrap.platformId)
  const chat = wrap.analytics.chats.find((c) => c.chatId === chatId)
  if (!chat) {
    return <Navigate to={wrapPath(wrap.id)} replace />
  }

  const display = chatDisplay(chat)
  const a = chat.analytics
  const isSavedMessages = display.isSavedMessages
  const copy = wrapUiCopy(wrap.platformId)
  const avgTalkSecs = Math.round(
    averageTalkSecs(
      a.contentMix?.totalVoiceDurationSecs ?? 0,
      a.contentMix?.types
    )
  )
  const totalTalkSecs = a.contentMix?.totalVoiceDurationSecs ?? 0

  return (
    <div className="-mt-4 flex w-full max-w-4xl flex-col items-stretch gap-6 text-start sm:-mt-6 sm:gap-8 md:max-w-4xl lg:max-w-5xl">
      <ScrollProgressIndicator />
      <header className="text-start">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 mb-1 h-8 text-muted-foreground"
          render={
            <Link
              to={wrap.platformId === "whatsapp" ? "/history" : wrapPath(wrap.id)}
            />
          }
          nativeButton={false}
        >
          <ArrowLeft data-icon="inline-start" />
          {wrap.platformId === "whatsapp" ? "History" : "Back to wrap"}
        </Button>
        <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          <MarkerHighlight
            before="Analytics between"
            highlight={wrap.stats.displayName}
            className="leading-tight"
            markerColor="bg-sky-500"
            highlightedTextColor="text-gray-950"
          />{" "}
          &{" "}
          <MarkerHighlight
            highlight={display.title}
            className="leading-tight"
            markerColor="bg-sky-500"
            highlightedTextColor="text-gray-950"
          />
          {display.isDeleted ? (
            <span className="ms-2 inline-flex rounded-md bg-muted px-2 py-0.5 align-middle text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
              Deleted
            </span>
          ) : null}
        </h1>
        {display.subtitle ? (
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {display.subtitle}
          </p>
        ) : null}
        {chat.handle &&
        chat.handle.trim() &&
        chat.handle.trim().toLowerCase() !== display.title.trim().toLowerCase() ? (
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums sm:text-sm">
            {chat.handle}
          </p>
        ) : null}
      </header>

      {isSavedMessages ? (
        <div className="grid grid-cols-1 gap-2 sm:max-w-xs sm:gap-3">
          <WrapKpi
            label={copy.isCalls ? "Total calls" : "Total messages"}
            value={fmt(a.totalMessages)}
            icon={Hash}
            accent="emerald"
          />
        </div>
      ) : (
        <div
          className={
            copy.isCalls && (avgTalkSecs > 0 || totalTalkSecs > 0)
              ? "grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
              : "grid grid-cols-3 gap-2 sm:gap-3"
          }
        >
          <WrapKpi
            label={copy.outgoing}
            value={fmt(a.sentMessages)}
            icon={ArrowUpRight}
            accent="violet"
          />
          <WrapKpi
            label={copy.incoming}
            value={fmt(a.receivedMessages)}
            icon={ArrowDownLeft}
            accent="sky"
          />
          <WrapKpi
            label="Total"
            value={fmt(a.totalMessages)}
            icon={Hash}
            accent="emerald"
          />
          {copy.isCalls && avgTalkSecs > 0 ? (
            <WrapKpi
              label="Avg talk"
              value={fmtDuration(avgTalkSecs)}
              icon={Timer}
              accent="teal"
            />
          ) : null}
        </div>
      )}

      <WrapChatAnalytics
        chat={chat}
        selfName={wrap.analytics.displayName || wrap.stats.displayName}
        wrapId={wrap.id}
        category={platform?.category}
        platformId={wrap.platformId}
      />
    </div>
  )
}
