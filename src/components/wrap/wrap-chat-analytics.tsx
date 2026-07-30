import { useMemo, useState } from "react"

import {
  EChartsAreaChart,
  type ChartConfig as AreaConfig,
} from "@/components/evilcharts/charts/echarts-area-chart"
import {
  EChartsPieChart,
  type ChartConfig as PieConfig,
} from "@/components/evilcharts/charts/echarts-pie-chart"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import type { TelegramExportStats } from "@/platform/import"

function formatCount(n: number): string {
  return new Intl.NumberFormat().format(n)
}

type MockChat = {
  id: string
  name: string
  you: number
  them: number
  responseYouMin: number
  responseThemMin: number
}

/** Placeholder chats until per-chat parsing is wired. */
function mockChats(stats: TelegramExportStats): MockChat[] {
  const base = Math.max(120, Math.round(stats.totalMessages / Math.max(stats.chatCount, 1)))
  const names = [
    "Alex Rivera",
    "Sam Chen",
    "Family group",
    "Work standup",
    "Jordan Lee",
  ]
  return names.slice(0, Math.min(5, Math.max(2, stats.chatCount))).map((name, index) => {
    const total = Math.round(base * (1.35 - index * 0.18))
    const youShare = 0.42 + (index % 3) * 0.08
    return {
      id: `mock-chat-${index}`,
      name,
      you: Math.round(total * youShare),
      them: Math.round(total * (1 - youShare)),
      responseYouMin: 4 + index * 3,
      responseThemMin: 7 + index * 2,
    }
  })
}

const duelAreaConfig = {
  you: {
    label: "You",
    colors: {
      light: ["#14b8a6", "#0d9488"],
      dark: ["#2dd4bf", "#14b8a6"],
    },
  },
  them: {
    label: "Them",
    colors: {
      light: ["#f59e0b", "#d97706"],
      dark: ["#fbbf24", "#f59e0b"],
    },
  },
} satisfies AreaConfig

const duelPieConfig = {
  you: {
    label: "You",
    colors: {
      light: ["#99f6e4", "#14b8a6", "#0f766e"],
      dark: ["#5eead4", "#2dd4bf", "#0d9488"],
    },
  },
  them: {
    label: "Them",
    colors: {
      light: ["#fed7aa", "#fb923c", "#c2410c"],
      dark: ["#fdba74", "#fb923c", "#ea580c"],
    },
  },
} satisfies PieConfig

type WrapChatAnalyticsProps = {
  stats: TelegramExportStats
}

/** Per-chat (user vs user) analytics — mock until chat-level data exists. */
export function WrapChatAnalytics({ stats }: WrapChatAnalyticsProps) {
  const chats = useMemo(() => mockChats(stats), [stats])
  const [chatId, setChatId] = useState(chats[0]?.id ?? "")
  const chat = chats.find((item) => item.id === chatId) ?? chats[0]

  const weekly = useMemo(() => {
    if (!chat) return []
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    return days.map((day, index) => {
      const wave = 0.7 + Math.sin(index * 1.1) * 0.25
      return {
        day,
        you: Math.round((chat.you / 7) * wave),
        them: Math.round((chat.them / 7) * (1.4 - wave)),
      }
    })
  }, [chat])

  if (!chat) return null

  const pieData = [
    { side: "you", count: chat.you },
    { side: "them", count: chat.them },
  ]

  return (
    <section className="flex flex-col gap-4">
      <header className="text-start">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          User vs user
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick one chat to compare you against the other person. Names and
          series are mock for now.
        </p>
      </header>

      <label className="flex flex-col gap-1.5 text-start">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Chat
        </span>
        <select
          value={chat.id}
          onChange={(event) => setChatId(event.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {chats.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-linear-to-br from-teal-500/15 to-teal-500/5 px-4 py-3 ring-1 ring-teal-500/25">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            You
          </p>
          <p className="font-heading mt-1 text-2xl font-semibold tabular-nums">
            {formatCount(chat.you)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ~{chat.responseYouMin}m avg reply
          </p>
        </div>
        <div className="rounded-xl bg-linear-to-br from-amber-500/15 to-amber-500/5 px-4 py-3 ring-1 ring-amber-500/25">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Them
          </p>
          <p className="font-heading mt-1 text-2xl font-semibold tabular-nums">
            {formatCount(chat.them)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ~{chat.responseThemMin}m avg reply
          </p>
        </div>
      </div>

      <WrapChartCard
        title={`${chat.name} · weekly rhythm`}
        description="Mock messages per weekday"
        exportName={`chat-${chat.id}-weekly`}
        exportLines={[
          chat.name,
          `You ${formatCount(chat.you)}`,
          `Them ${formatCount(chat.them)}`,
        ]}
        chartClassName="h-56 sm:h-64"
      >
        <EChartsAreaChart
          data={weekly}
          config={duelAreaConfig}
          xDataKey="day"
          className="h-full w-full"
          curveType="monotone"
          chartOptions={{
            grid: {
              left: 8,
              right: 8,
              top: 16,
              bottom: 24,
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
          <EChartsAreaChart.Legend />
          <EChartsAreaChart.Area
            dataKey="you"
            variant="gradient"
            strokeVariant="solid"
            strokeWidth={2}
          />
          <EChartsAreaChart.Area
            dataKey="them"
            variant="gradient"
            strokeVariant="solid"
            strokeWidth={2}
          />
        </EChartsAreaChart>
      </WrapChartCard>

      <WrapChartCard
        title={`${chat.name} · dominance`}
        description="Who sent more in this chat"
        exportName={`chat-${chat.id}-dominance`}
        exportLines={[
          `You ${formatCount(chat.you)}`,
          `Them ${formatCount(chat.them)}`,
        ]}
        chartClassName="h-64 sm:h-72"
      >
        <EChartsPieChart
          className="h-full w-full p-3"
          data={pieData}
          dataKey="count"
          nameKey="side"
          config={duelPieConfig}
        >
          <EChartsPieChart.Legend isClickable />
          <EChartsPieChart.Tooltip />
          <EChartsPieChart.Pie isClickable>
            <EChartsPieChart.Label dataKey="count" position="inside" />
          </EChartsPieChart.Pie>
        </EChartsPieChart>
      </WrapChartCard>
    </section>
  )
}
