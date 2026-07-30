import { EChartsPeakBarChart } from "@/components/evilcharts/blocks/peak-echarts-bar-chart"
import { CONTACT_SENT_RECEIVED_BAR, fmt } from "@/components/wrap/chart-theme"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import type { ChatResult } from "@/platform/analytics-types"
import { cn } from "@/lib/utils"
import { ChevronRight, Users } from "lucide-react"

const TOP_N = 20
const CHART_N = 12

const PEAK_SERIES = [
  {
    dataKey: "received",
    label: "Received",
    swatch: "bg-[#d97706] dark:bg-[#fbbf24]",
  },
  {
    dataKey: "sent",
    label: "Sent",
    swatch: "bg-[#0d9488] dark:bg-[#2dd4bf]",
  },
] as const

type ContactBarRow = {
  name: string
  fullName: string
  sent: number
  received: number
}

type WrapTopContactsProps = {
  chats: ChatResult[]
  selectedChatId: number | null
  onSelect: (chatId: number) => void
}

/** Ranked top contacts by message volume — click to open contact stats. */
export function WrapTopContacts({
  chats,
  selectedChatId,
  onSelect,
}: WrapTopContactsProps) {
  const top = chats.slice(0, TOP_N)
  if (top.length === 0) return null

  const max = Math.max(...top.map((c) => c.analytics.totalMessages), 1)
  const chartData: ContactBarRow[] = top.slice(0, CHART_N).map((c) => ({
    name: truncate(c.chatName, 10),
    fullName: c.chatName,
    sent: c.analytics.sentMessages,
    received: c.analytics.receivedMessages,
  }))

  return (
    <section className="flex flex-col gap-4">
      <header className="text-start">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Top contacts
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your most active chats by message volume. Tap one to see their stats.
        </p>
      </header>

      {/* <WrapChartCard
        title={`Top ${Math.min(CHART_N, top.length)} by volume`}
        description="Each bar stacks messages you sent and received"
        exportName="top-contacts-volume"
        exportLines={top.slice(0, 5).map((c, i) => {
          const a = c.analytics
          return `#${i + 1} ${c.chatName} · ${fmt(a.totalMessages)} (↑${fmt(a.sentMessages)} ↓${fmt(a.receivedMessages)})`
        })}
        chartClassName="h-72 sm:h-80"
      >
        <EChartsPeakBarChart
          data={chartData}
          config={CONTACT_SENT_RECEIVED_BAR}
          xDataKey="name"
          series={[...PEAK_SERIES]}
          peakEyebrow="Top contact"
          formatValue={fmt}
          formatPeakDetail={(row) => (
            <>
              messages with{" "}
              <span className="font-medium text-foreground">{row.fullName}</span>
            </>
          )}
        />
      </WrapChartCard> */}

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
          <Users className="size-3.5 text-muted-foreground" aria-hidden />
          <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Top {top.length} contacts
          </p>
        </div>
        <ul className="divide-y divide-border/50">
          {top.map((chat, index) => {
            const selected = chat.chatId === selectedChatId
            const pct = (chat.analytics.totalMessages / max) * 100
            const sentPct =
              chat.analytics.totalMessages > 0
                ? (chat.analytics.sentMessages / chat.analytics.totalMessages) *
                  100
                : 0
            return (
              <li key={chat.chatId}>
                <button
                  type="button"
                  onClick={() => onSelect(chat.chatId)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-start transition-colors",
                    selected
                      ? "bg-primary/10"
                      : "hover:bg-muted/50 active:bg-muted/70"
                  )}
                >
                  <span className="w-6 shrink-0 text-center text-xs font-semibold text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {chat.chatName}
                      </p>
                      <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {fmt(chat.analytics.totalMessages)}
                      </p>
                    </div>
                    <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-teal-600 dark:bg-teal-400"
                        style={{ width: `${(pct * sentPct) / 100}%` }}
                        title="Sent"
                      />
                      <div
                        className="h-full bg-amber-600 dark:bg-amber-400"
                        style={{
                          width: `${(pct * (100 - sentPct)) / 100}%`,
                        }}
                        title="Received"
                      />
                    </div>
                    <p className="mt-1 text-[0.65rem] text-muted-foreground">
                      Sent {fmt(chat.analytics.sentMessages)} · Received{" "}
                      {fmt(chat.analytics.receivedMessages)}
                    </p>
                  </div>
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      selected && "text-primary"
                    )}
                    aria-hidden
                  />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}
