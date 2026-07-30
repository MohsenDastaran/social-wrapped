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
import { Inbox, MessageSquare, Send, Users } from "lucide-react"

function formatCount(n: number): string {
  return new Intl.NumberFormat().format(n)
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof Send
}) {
  return (
    <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em]">
          {label}
        </p>
      </div>
      <p className="font-heading mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  )
}

function mockMonthly(total: number) {
  const weights = [0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.19]
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]
  return months.map((month, index) => ({
    month,
    messages: Math.round(total * (weights[index] ?? 0.1)),
  }))
}

const areaConfig = {
  messages: {
    label: "Messages",
    colors: {
      light: ["#14b8a6", "#0ea5e9", "#84cc16"],
      dark: ["#2dd4bf", "#38bdf8", "#a3e635"],
    },
  },
} satisfies AreaConfig

function volumePieConfig(sentKey: string, receivedKey: string): PieConfig {
  return {
    [sentKey]: {
      label: "Sent",
      colors: {
        light: ["#99f6e4", "#14b8a6", "#0f766e"],
        dark: ["#5eead4", "#2dd4bf", "#0d9488"],
      },
    },
    [receivedKey]: {
      label: "Received",
      colors: {
        light: ["#fde68a", "#f59e0b", "#b45309"],
        dark: ["#fcd34d", "#fbbf24", "#d97706"],
      },
    },
  }
}

type WrapMainAnalyticsProps = {
  stats: TelegramExportStats
}

/** Whole-export analytics — real totals + mock trend charts. */
export function WrapMainAnalytics({ stats }: WrapMainAnalyticsProps) {
  const monthly = mockMonthly(stats.totalMessages)
  const volumeData = [
    { side: "sent", count: stats.sentMessages },
    { side: "received", count: stats.receivedMessages },
  ]

  return (
    <section className="flex flex-col gap-4">
      <header className="text-start">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Main analytics
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview across your entire export. Charts are mock-filled until
          deeper parsing lands.
        </p>
      </header>

      <div className="rounded-xl bg-muted/40 px-4 py-3 ring-1 ring-border/50">
        <p className="font-heading text-lg font-semibold tracking-tight">
          {stats.displayName}
          {stats.username ? (
            <span className="ms-2 text-sm font-medium text-muted-foreground">
              @{stats.username}
            </span>
          ) : null}
        </p>
        {stats.aboutPreview ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {stats.aboutPreview}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Sent"
          value={formatCount(stats.sentMessages)}
          icon={Send}
        />
        <StatCard
          label="Received"
          value={formatCount(stats.receivedMessages)}
          icon={Inbox}
        />
        <StatCard
          label="Total messages"
          value={formatCount(stats.totalMessages)}
          icon={MessageSquare}
        />
        <StatCard
          label="Chats"
          value={formatCount(stats.chatCount)}
          icon={Users}
        />
      </div>

      <WrapChartCard
        title="Messages over time"
        description="Mock monthly volume for the whole account"
        exportName="main-messages-over-time"
        exportLines={[
          `Total ${formatCount(stats.totalMessages)}`,
          `${formatCount(stats.chatCount)} chats`,
        ]}
        chartClassName="h-56 sm:h-64"
      >
        <EChartsAreaChart
          data={monthly}
          config={areaConfig}
          xDataKey="month"
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

      <WrapChartCard
        title="Sent vs received"
        description="Share of outbound and inbound messages"
        exportName="main-sent-vs-received"
        exportLines={[
          `Sent ${formatCount(stats.sentMessages)}`,
          `Received ${formatCount(stats.receivedMessages)}`,
        ]}
        chartClassName="h-64 sm:h-72"
      >
        <EChartsPieChart
          className="h-full w-full p-3"
          data={volumeData}
          dataKey="count"
          nameKey="side"
          config={volumePieConfig("sent", "received")}
        >
          <EChartsPieChart.Legend isClickable />
          <EChartsPieChart.Tooltip />
          <EChartsPieChart.Pie isClickable>
            <EChartsPieChart.Label dataKey="count" position="inside" />
          </EChartsPieChart.Pie>
        </EChartsPieChart>
      </WrapChartCard>

      {stats.sampleMessages.length > 0 ? (
        <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Sample messages
          </p>
          <ul className="flex flex-col gap-2">
            {stats.sampleMessages.map((line, index) => (
              <li
                key={`${index}-${line.slice(0, 24)}`}
                className="text-sm leading-relaxed text-foreground/90"
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
