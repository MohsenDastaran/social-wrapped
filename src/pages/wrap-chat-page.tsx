import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Hash } from "lucide-react"
import { Link, Navigate, useParams } from "react-router"

import { Button } from "@/components/ui/button"
import { MarkerHighlight } from "@/components/ui/animated/animated-text-08"
import { chatDisplay } from "@/components/wrap/chat-display"
import { WrapChatAnalytics } from "@/components/wrap/wrap-chat-analytics"
import { WrapKpi } from "@/components/wrap/wrap-kpi"
import { fmt } from "@/components/wrap/chart-theme"
import { getWrap, wrapPath } from "@/lib/wrap-history"

/** Per-contact analytics — `/wrap/:wrapId/chat/:chatId`. */
export function WrapChatPage() {
  const { wrapId, chatId: chatIdParam } = useParams<{
    wrapId: string
    chatId: string
  }>()
  const wrap = wrapId ? getWrap(wrapId) : undefined
  const chatId = chatIdParam != null ? Number(chatIdParam) : NaN

  if (!wrap?.analytics?.account || !Number.isFinite(chatId)) {
    return <Navigate to="/history" replace />
  }

  const chat = wrap.analytics.chats.find((c) => c.chatId === chatId)
  if (!chat) {
    return <Navigate to={wrapPath(wrap.id)} replace />
  }

  const display = chatDisplay(chat)
  const a = chat.analytics

  return (
    <div className="-mt-4 flex w-full max-w-4xl flex-col items-stretch gap-6 text-start sm:-mt-6 sm:gap-8 md:max-w-4xl lg:max-w-5xl">
      <header className="text-start">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 mb-1 h-8 text-muted-foreground"
          render={<Link to={wrapPath(wrap.id)} />}
          nativeButton={false}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to wrap
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
      </header>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <WrapKpi
          label="Sent"
          value={fmt(a.sentMessages)}
          icon={ArrowUpRight}
          accent="violet"
        />
        <WrapKpi
          label="Received"
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
      </div>

      <WrapChatAnalytics
        chat={chat}
        selfName={wrap.analytics.displayName || wrap.stats.displayName}
      />
    </div>
  )
}
