import { EChartsPieChart } from "@/components/evilcharts/charts/echarts-pie-chart"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { SENT_RECEIVED_PIE, fmt } from "@/components/wrap/chart-theme"
import type { GhostingStats } from "@/platform/analytics-types"

type GhostingChartProps = {
  ghosting: GhostingStats | undefined
  exportName: string
  youLabel?: string
  themLabel?: string
  selfName: string
  /** 1:1 chat title — participant names that are not this contact are You. */
  contactName?: string
  isDirectChat?: boolean
  className?: string
}

function namesMatch(a: string, b: string): boolean {
  const x = a.trim().toLowerCase()
  const y = b.trim().toLowerCase()
  if (!x || !y) return false
  return x === y || x.includes(y) || y.includes(x)
}

function isYouParticipant(
  name: string,
  selfName: string,
  youLabel: string,
  contactName: string | undefined,
  isDirectChat: boolean
): boolean {
  if (namesMatch(name, selfName) || namesMatch(name, youLabel)) {
    return true
  }
  if (isDirectChat && contactName?.trim()) {
    if (namesMatch(name, contactName)) return false
    return true
  }
  return false
}

/** Donut: who left messages unanswered for 24h+ in this chat. */
export function GhostingChart({
  ghosting,
  exportName,
  youLabel = "You",
  themLabel = "Them",
  selfName,
  contactName,
  isDirectChat = false,
  className,
}: GhostingChartProps) {
  const parts = ghosting?.participants ?? []
  let you = 0
  let them = 0
  for (const p of parts) {
    if (isYouParticipant(p.name, selfName, youLabel, contactName, isDirectChat)) {
      you += p.count
    } else {
      them += p.count
    }
  }
  const total = you + them

  const data =
    total > 0
      ? [
          {
            side: "you",
            count: you,
            pctLabel: `${Math.round((you / total) * 100)}%`,
          },
          {
            side: "them",
            count: them,
            pctLabel: `${Math.round((them / total) * 100)}%`,
          },
        ].filter((d) => d.count > 0)
      : []

  const pieConfig = {
    you: { ...SENT_RECEIVED_PIE.sent!, label: youLabel },
    them: { ...SENT_RECEIVED_PIE.received!, label: themLabel },
  }

  const winner =
    total === 0
      ? null
      : you === them
        ? "Tie"
        : you > them
          ? youLabel
          : themLabel

  const description =
    total === 0
      ? "No 24h+ unanswered gaps in this chat"
      : `${fmt(total)} ghost moments · ${
          winner === "Tie" ? "even split" : `${winner} ghosts more`
        }`

  return (
    <WrapChartCard
      title="Ghosting index"
      description={description}
      exportName={exportName}
      exportSize="compact"
      layout="flow"
      captureMode="chart"
      exportLines={
        total > 0
          ? [
              `${youLabel} ${fmt(you)}`,
              `${themLabel} ${fmt(them)}`,
            ]
          : undefined
      }
      className={className}
      chartClassName="pb-3 pt-1"
    >
      <div className="h-56 w-full sm:h-64">
        {data.length > 0 ? (
          <EChartsPieChart
            className="h-full w-full px-3"
            data={data}
            dataKey="count"
            nameKey="side"
            config={pieConfig}
          >
            <EChartsPieChart.Legend isClickable />
            <EChartsPieChart.Tooltip />
            <EChartsPieChart.Pie isClickable innerRadius="48%" outerRadius="72%">
              <EChartsPieChart.Label dataKey="pctLabel" position="inside" />
            </EChartsPieChart.Pie>
          </EChartsPieChart>
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Re-import your export to unlock ghosting stats, or this chat has no
            24h+ reply gaps.
          </div>
        )}
      </div>
    </WrapChartCard>
  )
}
