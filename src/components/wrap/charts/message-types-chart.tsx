import { useMemo, useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import { EChartsPieChart } from "@/components/evilcharts/charts/echarts-pie-chart"
import {
  contentMixPieConfig,
  fmt,
  fmtDuration,
} from "@/components/wrap/chart-theme"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { Button } from "@/components/ui/button"
import type { ContentTypeCount } from "@/platform/analytics-types"

type MessageTypesChartProps = {
  types: ContentTypeCount[]
  totalVoiceDurationSecs?: number
  exportName: string
}

/** Pie of message content types, with optional “hide normal” re-percentage. */
export function MessageTypesChart({
  types,
  totalVoiceDurationSecs = 0,
  exportName,
}: MessageTypesChartProps) {
  const [hideNormal, setHideNormal] = useState(true)

  const hasNormal = types.some((t) => t.kind === "normal" && t.count > 0)
  const source = useMemo(
    () => (hideNormal ? types.filter((t) => t.kind !== "normal") : types),
    [hideNormal, types]
  )
  const total = source.reduce((sum, t) => sum + t.count, 0)
  const data = source.map((t) => ({
    kind: t.kind,
    count: t.count,
    pctLabel: `${Math.round(total > 0 ? (t.count / total) * 100 : 0)}%`,
  }))
  const keys = data.map((t) => t.kind)

  return (
    <WrapChartCard
      title="Message types"
      description={
        types.length === 0
          ? "Re-import your export to unlock the type breakdown"
          : hideNormal
            ? "Share among non-normal messages only"
            : totalVoiceDurationSecs > 0
              ? `${fmtDuration(totalVoiceDurationSecs)} of voice · share by type`
              : "Share of messages by content type"
      }
      exportName={exportName}
      exportSize="compact"
      exportLines={source.map((t) => {
        const pct = total > 0 ? (t.count / total) * 100 : 0
        return `${t.label} ${fmt(t.count)} (${pct.toFixed(1)}%)`
      })}
      headerExtra={
        hasNormal ? (
          <Button
            type="button"
            variant={hideNormal ? "default" : "outline"}
            size="xs"
            data-export-ignore
            onClick={() => setHideNormal((v) => !v)}
            aria-pressed={hideNormal}
            aria-label={
              hideNormal ? "Show normal messages" : "Hide normal messages"
            }
          >
            {hideNormal ? (
              <Eye data-icon="inline-start" />
            ) : (
              <EyeOff data-icon="inline-start" />
            )}
            {hideNormal ? "Show normal Messages" : "Hide normal Messages"}
          </Button>
        ) : null
      }
      chartClassName="h-72 sm:h-80"
    >
      {data.length > 0 ? (
        <EChartsPieChart
          className="h-full w-full p-3"
          data={data}
          dataKey="count"
          nameKey="kind"
          config={contentMixPieConfig(keys)}
        >
          <EChartsPieChart.Legend isClickable lines={2} />
          <EChartsPieChart.Tooltip />
          <EChartsPieChart.Pie isClickable>
            <EChartsPieChart.Label
              dataKey="pctLabel"
              position="inside"
              minPercent={5}
            />
          </EChartsPieChart.Pie>
        </EChartsPieChart>
      ) : (
        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
          {hideNormal
            ? "No non-normal messages in this set."
            : "No type data yet. Re-import after updating to see normal, link, emoji, image, video, and more."}
        </div>
      )}
    </WrapChartCard>
  )
}
