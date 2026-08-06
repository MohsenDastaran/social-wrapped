import { useMemo, useState, type ReactNode } from "react"
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
import { cn } from "@/lib/utils"

export type MessageTypesScope = {
  id: string
  label: string
  types: ContentTypeCount[]
  totalVoiceDurationSecs?: number
}

type MessageTypesChartProps = {
  types: ContentTypeCount[]
  totalVoiceDurationSecs?: number
  exportName: string
  /**
   * Optional All / You / Contact scopes.
   * When set (and more than one has data), a segmented toggle appears.
   */
  scopes?: MessageTypesScope[]
}

/** Pie of message content types, with optional “hide normal” + scope toggle. */
export function MessageTypesChart({
  types,
  totalVoiceDurationSecs = 0,
  exportName,
  scopes,
}: MessageTypesChartProps) {
  const [hideNormal, setHideNormal] = useState(true)

  const usableScopes = useMemo(
    () =>
      (scopes ?? []).filter((s) => s.types.some((t) => t.count > 0)),
    [scopes]
  )
  const showToggle = usableScopes.length > 1
  const [scopeId, setScopeId] = useState(() => usableScopes[0]?.id ?? "all")
  const activeScope =
    usableScopes.find((s) => s.id === scopeId) ?? usableScopes[0]

  const baseTypes = activeScope?.types ?? types
  const voiceSecs =
    activeScope?.totalVoiceDurationSecs ?? totalVoiceDurationSecs

  const hasNormal = baseTypes.some((t) => t.kind === "normal" && t.count > 0)
  const source = useMemo(
    () => (hideNormal ? baseTypes.filter((t) => t.kind !== "normal") : baseTypes),
    [hideNormal, baseTypes]
  )
  const total = source.reduce((sum, t) => sum + t.count, 0)
  const data = source.map((t) => ({
    kind: t.kind,
    count: t.count,
    pctLabel: `${Math.round(total > 0 ? (t.count / total) * 100 : 0)}%`,
  }))
  const keys = data.map((t) => t.kind)
  const scopeSuffix = activeScope && showToggle ? `-${activeScope.id}` : ""

  return (
    <WrapChartCard
      title="Message types"
      description={
        baseTypes.length === 0
          ? "Re-import your export to unlock the type breakdown"
          : hideNormal
            ? "Share among non-normal messages only"
            : voiceSecs > 0
              ? `${fmtDuration(voiceSecs)} of voice · share by type`
              : "Share of messages by content type"
      }
      exportName={`${exportName}${scopeSuffix}`}
      exportSize="compact"
      exportLines={source.map((t) => {
        const pct = total > 0 ? (t.count / total) * 100 : 0
        return `${t.label} ${fmt(t.count)} (${pct.toFixed(1)}%)`
      })}
      className="@container/msg-types"
      headerExtra={
        <div
          className="flex max-w-full flex-wrap items-center justify-end gap-1.5"
          data-export-ignore
        >
          {showToggle ? (
            <div
              className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-0.5"
              role="group"
              aria-label="Message types scope"
            >
              {usableScopes.map((scope) => (
                <ScopeButton
                  key={scope.id}
                  active={scope.id === (activeScope?.id ?? scopeId)}
                  onClick={() => setScopeId(scope.id)}
                >
                  {scope.label}
                </ScopeButton>
              ))}
            </div>
          ) : null}
          {hasNormal ? (
            <Button
              type="button"
              variant={hideNormal ? "default" : "outline"}
              size="xs"
              onClick={() => setHideNormal((v) => !v)}
              aria-pressed={hideNormal}
              aria-label={
                hideNormal ? "Show normal messages" : "Hide normal messages"
              }
              className="shrink-0"
            >
              {hideNormal ? (
                <Eye data-icon="inline-start" />
              ) : (
                <EyeOff data-icon="inline-start" />
              )}
              <span className="hidden @min-[420px]/msg-types:inline">
                {hideNormal ? "Show normal" : "Hide normal"}
              </span>
              <span className="@min-[420px]/msg-types:hidden">
                {hideNormal ? "Normal" : "Hide"}
              </span>
            </Button>
          ) : null}
        </div>
      }
      chartClassName="h-64 min-h-[16rem] w-full sm:h-72 md:h-80"
    >
      {data.length > 0 ? (
        <EChartsPieChart
          className="h-full w-full min-w-0 p-2 sm:p-3"
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

function ScopeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors sm:px-2.5 sm:text-xs",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

/** Build All / You / Contact scopes from content-mix byParticipant. */
export function buildMessageTypesScopes(
  types: ContentTypeCount[],
  totalVoiceDurationSecs: number,
  byParticipant: Array<{
    name: string
    types: ContentTypeCount[]
    totalVoiceDurationSecs?: number
  }>,
  selfName: string,
  contactName: string
): MessageTypesScope[] | undefined {
  if (!byParticipant.length) return undefined

  const namesMatch = (a: string, b: string) => {
    const x = a.trim().toLowerCase()
    const y = b.trim().toLowerCase()
    if (!x || !y) return false
    return x === y || x.includes(y) || y.includes(x)
  }

  const self = byParticipant.find((p) => namesMatch(p.name, selfName))
  const others = byParticipant.filter((p) => !namesMatch(p.name, selfName))

  const mergeTypes = (
    lists: ContentTypeCount[][]
  ): ContentTypeCount[] => {
    const map = new Map<string, ContentTypeCount>()
    for (const list of lists) {
      for (const t of list) {
        const prev = map.get(t.kind)
        if (prev) {
          prev.count += t.count
        } else {
          map.set(t.kind, { ...t })
        }
      }
    }
    const merged = [...map.values()]
    const total = merged.reduce((s, t) => s + t.count, 0)
    for (const t of merged) {
      t.pct = total > 0 ? (t.count / total) * 100 : 0
    }
    return merged.sort((a, b) => b.count - a.count)
  }

  const youTypes = self?.types ?? []
  const themTypes =
    others.length === 1
      ? (others[0]?.types ?? [])
      : mergeTypes(others.map((o) => o.types))

  const themVoice =
    others.length === 1
      ? (others[0]?.totalVoiceDurationSecs ?? 0)
      : others.reduce((s, o) => s + (o.totalVoiceDurationSecs ?? 0), 0)

  const truncate = (s: string, n: number) =>
    s.length > n ? `${s.slice(0, n - 1)}…` : s

  const scopes: MessageTypesScope[] = [
    {
      id: "all",
      label: "All",
      types,
      totalVoiceDurationSecs,
    },
    {
      id: "you",
      label: truncate(self?.name || selfName || "You", 14),
      types: youTypes,
      totalVoiceDurationSecs: self?.totalVoiceDurationSecs ?? 0,
    },
    {
      id: "them",
      label: truncate(
        others.length === 1
          ? (others[0]?.name ?? contactName)
          : contactName || "Contact",
        14
      ),
      types: themTypes,
      totalVoiceDurationSecs: themVoice,
    },
  ]

  const withData = scopes.filter((s) => s.types.some((t) => t.count > 0))
  return withData.length > 1 ? scopes : undefined
}
