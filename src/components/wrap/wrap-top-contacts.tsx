import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart"
import {
  CONTACT_VOLUME_AREA,
  fmt,
} from "@/components/wrap/chart-theme"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import type { ChatResult } from "@/platform/analytics-types"
import { cn } from "@/lib/utils"
import { ChevronRight, Users } from "lucide-react"

const TOP_N = 20

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
  const chartData = top.slice(0, 12).map((c) => ({
    name: truncate(c.chatName, 10),
    messages: c.analytics.totalMessages,
  }))

  return (
    <section className="flex flex-col gap-4">
      <header className="text-start">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Top contacts
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your most active chats by message volume. Tap one to see their
          stats.
        </p>
      </header>

      <WrapChartCard
        title={`Top ${Math.min(12, top.length)} by volume`}
        description="Message count across your most common contacts"
        exportName="top-contacts-volume"
        exportLines={top
          .slice(0, 5)
          .map(
            (c, i) =>
              `#${i + 1} ${c.chatName} · ${fmt(c.analytics.totalMessages)}`
          )}
        chartClassName="h-56 sm:h-64"
      >
        <EChartsAreaChart
          data={chartData}
          config={CONTACT_VOLUME_AREA}
          xDataKey="name"
          className="h-full w-full"
          curveType="monotone"
          chartOptions={{
            grid: {
              left: 8,
              right: 8,
              top: 16,
              bottom: 28,
              outerBoundsMode: "none",
            },
            yAxis: {
              type: "value",
              show: false,
              scale: true,
              boundaryGap: ["8%", "16%"],
            },
          }}
        >
          <EChartsAreaChart.Tooltip variant="frosted-glass" />
          <EChartsAreaChart.Area
            dataKey="messages"
            variant="gradient"
            strokeVariant="solid"
            strokeWidth={2.5}
          >
            <EChartsAreaChart.ActiveDot variant="ping" />
          </EChartsAreaChart.Area>
        </EChartsAreaChart>
      </WrapChartCard>

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
          <Users className="size-3.5 text-muted-foreground" aria-hidden />
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Top {top.length} contacts
          </p>
        </div>
        <ul className="divide-y divide-border/50">
          {top.map((chat, index) => {
            const selected = chat.chatId === selectedChatId
            const pct = (chat.analytics.totalMessages / max) * 100
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
                  <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {chat.chatName}
                      </p>
                      <p className="shrink-0 tabular-nums text-xs text-muted-foreground">
                        {fmt(chat.analytics.totalMessages)}
                      </p>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-teal-500 transition-[width]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[0.65rem] text-muted-foreground">
                      You {fmt(chat.analytics.sentMessages)} · Them{" "}
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
