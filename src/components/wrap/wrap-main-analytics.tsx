import {
  EChartsAreaChart,
  type ChartConfig as AreaConfig,
} from "@/components/evilcharts/charts/echarts-area-chart"
import {
  EChartsPieChart,
  type ChartConfig as PieConfig,
} from "@/components/evilcharts/charts/echarts-pie-chart"
import { CalendarHeatmap } from "@/components/wrap/charts/calendar-heatmap"
import { CircadianPolarChart } from "@/components/wrap/charts/circadian-polar-chart"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import type { WrapAnalytics } from "@/platform/analytics-types"
import {
  Clock,
  Inbox,
  MessageSquare,
  Mic,
  Moon,
  Send,
  Shuffle,
  Users,
  Zap,
} from "lucide-react"

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat().format(Math.round(n))
}

function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${secs}s`
}

function fmtResponseTime(secs: number): string {
  const min = Math.round(secs / 60)
  if (min < 60) return `${min}m`
  const h = (secs / 3600).toFixed(1)
  return `${h}h`
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  sub?: string
  icon: typeof Send
  accent?: "teal" | "amber" | "violet" | "rose"
}) {
  const bg = {
    teal: "from-teal-500/15 to-teal-500/5 ring-teal-500/25",
    amber: "from-amber-500/15 to-amber-500/5 ring-amber-500/25",
    violet: "from-violet-500/15 to-violet-500/5 ring-violet-500/25",
    rose: "from-rose-500/15 to-rose-500/5 ring-rose-500/25",
  }[accent ?? "teal"]

  return (
    <div
      className={`rounded-xl bg-linear-to-br px-4 py-3 ring-1 ${bg ?? "from-muted/50 to-muted/20 ring-foreground/10"}`}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em]">
          {label}
        </p>
      </div>
      <p className="font-heading mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  )
}

// ── Chart configs ─────────────────────────────────────────────────────────────

const TEAL_AMBER_PIE: PieConfig = {
  teal: {
    label: "Sent",
    colors: {
      light: ["#99f6e4", "#14b8a6", "#0f766e"],
      dark: ["#5eead4", "#2dd4bf", "#0d9488"],
    },
  },
  amber: {
    label: "Received",
    colors: {
      light: ["#fde68a", "#f59e0b", "#b45309"],
      dark: ["#fcd34d", "#fbbf24", "#d97706"],
    },
  },
}

// ── Main component ─────────────────────────────────────────────────────────────

type WrapMainAnalyticsProps = {
  analytics: WrapAnalytics
}

export function WrapMainAnalytics({ analytics }: WrapMainAnalyticsProps) {
  if (!analytics?.account) return null
  const a = analytics.account

  // ── Stat 22: Sent vs received ──────────────────────────────────────────
  const volumeData = [
    { side: "teal", count: a.volume.sent },
    { side: "amber", count: a.volume.received },
  ]

  // ── Stat 21: Volume by participant (pie) ───────────────────────────────
  const dominancePieConfig: PieConfig = Object.fromEntries(
    a.volume.participants.map((p, i) => {
      const palettes = [
        {
          light: ["#99f6e4", "#14b8a6", "#0f766e"],
          dark: ["#5eead4", "#2dd4bf", "#0d9488"],
        },
        {
          light: ["#fde68a", "#f59e0b", "#b45309"],
          dark: ["#fcd34d", "#fbbf24", "#d97706"],
        },
        {
          light: ["#ddd6fe", "#8b5cf6", "#5b21b6"],
          dark: ["#c4b5fd", "#a78bfa", "#7c3aed"],
        },
        {
          light: ["#fbcfe8", "#ec4899", "#9d174d"],
          dark: ["#f9a8d4", "#f472b6", "#be185d"],
        },
      ]
      return [
        p.name,
        { label: p.name, colors: palettes[i % palettes.length] },
      ]
    })
  )
  const dominanceData = a.volume.participants.map((p) => ({
    name: p.name,
    count: p.count,
  }))

  // ── Stat 23: Voice vs text (pie) ──────────────────────────────────────
  const vtPieConfig: PieConfig = {
    text: {
      label: "Text",
      colors: {
        light: ["#99f6e4", "#14b8a6", "#0f766e"],
        dark: ["#5eead4", "#2dd4bf", "#0d9488"],
      },
    },
    voice: {
      label: "Voice",
      colors: {
        light: ["#fde68a", "#f59e0b", "#b45309"],
        dark: ["#fcd34d", "#fbbf24", "#d97706"],
      },
    },
  }
  const vtData = [
    { kind: "text", count: a.voiceText.totalText },
    { kind: "voice", count: a.voiceText.totalVoice },
  ]

  // ── Stat 15: Response time ────────────────────────────────────────────
  const rtBar = {
    avgMin: {
      label: "Average",
      colors: {
        light: ["#14b8a6", "#0d9488"],
        dark: ["#2dd4bf", "#14b8a6"],
      },
    },
    medianMin: {
      label: "Median",
      colors: {
        light: ["#f59e0b", "#d97706"],
        dark: ["#fbbf24", "#f59e0b"],
      },
    },
  } satisfies AreaConfig
  const rtData = a.responseTime.participants.map((p) => ({
    name: p.name,
    avgMin: Math.round(p.avgSecs / 60),
    medianMin: Math.round(p.medianSecs / 60),
  }))

  // ── Heatmap data ──────────────────────────────────────────────────────
  const heatmapDays = a.heatmap.days

  // ── Circadian data ────────────────────────────────────────────────────
  const circadianParticipants = a.circadian.participants

  return (
    <section className="flex flex-col gap-4">
      <header className="text-start">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Your 2024 wrapped
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Account-wide stats across all {fmt(analytics.chatCount)} chats.
        </p>
      </header>

      {/* Identity card */}
      <div className="rounded-xl bg-muted/40 px-4 py-3 ring-1 ring-border/50">
        <p className="font-heading text-lg font-semibold tracking-tight">
          {analytics.displayName}
          {analytics.username ? (
            <span className="ms-2 text-sm font-medium text-muted-foreground">
              @{analytics.username}
            </span>
          ) : null}
        </p>
        {analytics.aboutPreview ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {analytics.aboutPreview}
          </p>
        ) : null}
      </div>

      {/* ── Stat 21 + 22: Volume overview ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Sent"
          value={fmt(a.sentMessages)}
          icon={Send}
          accent="teal"
        />
        <StatCard
          label="Received"
          value={fmt(a.receivedMessages)}
          icon={Inbox}
          accent="amber"
        />
        <StatCard
          label="Total messages"
          value={fmt(a.totalMessages)}
          icon={MessageSquare}
          accent="violet"
        />
        <StatCard
          label="Chats"
          value={fmt(analytics.chatCount)}
          icon={Users}
          accent="rose"
        />
      </div>

      {/* ── Stat 22: Sent vs received pie ──────────────────────────────── */}
      <WrapChartCard
        title="Sent vs received"
        description="Share of outbound and inbound messages"
        exportName="main-sent-vs-received"
        exportLines={[
          `Sent ${fmt(a.sentMessages)}`,
          `Received ${fmt(a.receivedMessages)}`,
        ]}
        chartClassName="h-56 sm:h-64"
      >
        <EChartsPieChart
          className="h-full w-full p-3"
          data={volumeData}
          dataKey="count"
          nameKey="side"
          config={TEAL_AMBER_PIE}
        >
          <EChartsPieChart.Legend isClickable />
          <EChartsPieChart.Tooltip />
          <EChartsPieChart.Pie isClickable>
            <EChartsPieChart.Label dataKey="count" position="inside" />
          </EChartsPieChart.Pie>
        </EChartsPieChart>
      </WrapChartCard>

      {/* ── Stat 21: Dominance (who sent more overall) ─────────────────── */}
      {a.volume.participants.length > 0 ? (
        <WrapChartCard
          title="Message dominance"
          description="Total volume share across all participants"
          exportName="main-dominance"
          exportLines={a.volume.participants.map(
            (p) => `${p.name} ${p.pct.toFixed(1)}%`
          )}
          chartClassName="h-56 sm:h-64"
        >
          <EChartsPieChart
            className="h-full w-full p-3"
            data={dominanceData}
            dataKey="count"
            nameKey="name"
            config={dominancePieConfig}
          >
            <EChartsPieChart.Legend isClickable />
            <EChartsPieChart.Tooltip />
            <EChartsPieChart.Pie isClickable innerRadius="40%">
              <EChartsPieChart.Label dataKey="count" position="inside" />
            </EChartsPieChart.Pie>
          </EChartsPieChart>
        </WrapChartCard>
      ) : null}

      {/* ── Stat 23: Voice vs text ──────────────────────────────────────── */}
      {a.voiceText.totalVoice > 0 || a.voiceText.totalText > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Voice messages"
              value={fmt(a.voiceText.totalVoice)}
              sub={fmtDuration(a.voiceText.totalVoiceDurationSecs) + " total"}
              icon={Mic}
              accent="amber"
            />
            <StatCard
              label="Text messages"
              value={fmt(a.voiceText.totalText)}
              icon={MessageSquare}
              accent="teal"
            />
          </div>
          <WrapChartCard
            title="Voice vs text"
            description="Ratio of voice memos to text messages"
            exportName="main-voice-vs-text"
            exportLines={[
              `Voice ${fmt(a.voiceText.totalVoice)} (${fmtDuration(a.voiceText.totalVoiceDurationSecs)})`,
              `Text ${fmt(a.voiceText.totalText)}`,
            ]}
            chartClassName="h-48 sm:h-56"
          >
            <EChartsPieChart
              className="h-full w-full p-3"
              data={vtData}
              dataKey="count"
              nameKey="kind"
              config={vtPieConfig}
            >
              <EChartsPieChart.Legend isClickable />
              <EChartsPieChart.Tooltip />
              <EChartsPieChart.Pie isClickable>
                <EChartsPieChart.Label dataKey="count" position="inside" />
              </EChartsPieChart.Pie>
            </EChartsPieChart>
          </WrapChartCard>
        </div>
      ) : null}

      {/* ── Stat 16: Message length balance ────────────────────────────── */}
      {a.messageLength.participants.length > 0 ? (
        <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquare className="size-3.5 text-muted-foreground" />
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Message length balance
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {a.messageLength.participants.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between gap-3"
              >
                <span className="truncate text-sm font-medium">{p.name}</span>
                <span className="shrink-0 tabular-nums text-sm text-muted-foreground">
                  {p.avgChars.toFixed(1)} chars/msg
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Stat 15: Response time ──────────────────────────────────────── */}
      {a.responseTime.participants.length > 0 ? (
        <WrapChartCard
          title="Average response time"
          description="How quickly each person typically replies (minutes)"
          exportName="main-response-time"
          exportLines={a.responseTime.participants.map(
            (p) => `${p.name} avg ${fmtResponseTime(p.avgSecs)}`
          )}
          chartClassName="h-48 sm:h-56"
        >
          <EChartsAreaChart
            data={rtData}
            config={rtBar}
            xDataKey="name"
            className="h-full w-full"
            curveType="linear"
            chartOptions={{
              grid: { left: 8, right: 8, top: 16, bottom: 24 },
              yAxis: {
                type: "value",
                show: true,
                scale: true,
                boundaryGap: ["0%", "20%"],
                axisLabel: { formatter: "{value}m", fontSize: 9 },
              },
            }}
          >
            <EChartsAreaChart.Tooltip variant="frosted-glass" />
            <EChartsAreaChart.Legend />
            <EChartsAreaChart.Area
              dataKey="avgMin"
              variant="gradient"
              strokeVariant="solid"
              strokeWidth={2}
            />
            <EChartsAreaChart.Area
              dataKey="medianMin"
              variant="gradient"
              strokeVariant="solid"
              strokeWidth={2}
            />
          </EChartsAreaChart>
        </WrapChartCard>
      ) : null}

      {/* ── Stat 14: Late-night chats ───────────────────────────────────── */}
      {a.lateNight.totalLateNight > 0 ? (
        <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <div className="mb-3 flex items-center gap-2">
            <Moon className="size-3.5 text-muted-foreground" />
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Late-night chats (1–5 AM)
            </p>
          </div>
          <p className="font-heading mb-2 text-xl font-semibold tabular-nums">
            {fmt(a.lateNight.totalLateNight)} messages
          </p>
          <div className="flex flex-col gap-2">
            {a.lateNight.participants
              .filter((p) => p.count > 0)
              .map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <span className="shrink-0 tabular-nums text-sm text-muted-foreground">
                    {fmt(p.count)} ({p.pctOfParticipantTotal.toFixed(1)}%)
                  </span>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {/* ── Stat 12: Initiator vs finisher ─────────────────────────────── */}
      {a.initiatorFinisher.initiators.length > 0 ? (
        <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="size-3.5 text-muted-foreground" />
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Initiator vs finisher
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Conversation starters
              </p>
              {a.initiatorFinisher.initiators.slice(0, 3).map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between gap-2 py-0.5"
                >
                  <span className="truncate text-sm">{p.name}</span>
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                    {p.pct.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Conversation closers
              </p>
              {a.initiatorFinisher.finishers.slice(0, 3).map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between gap-2 py-0.5"
                >
                  <span className="truncate text-sm">{p.name}</span>
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                    {p.pct.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Stat 9: Top emojis & reactions ──────────────────────────────── */}
      {a.emojis.topOverall.length > 0 ? (
        <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <div className="mb-3 flex items-center gap-2">
            <Shuffle className="size-3.5 text-muted-foreground" />
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Top emojis
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {a.emojis.topOverall.slice(0, 12).map((e) => (
              <div
                key={e.emoji}
                className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1"
              >
                <span className="text-xl leading-none">{e.emoji}</span>
                <span className="tabular-nums text-xs text-muted-foreground">
                  {fmt(e.count)}
                </span>
              </div>
            ))}
          </div>
          {a.emojis.topReactions.length > 0 && (
            <>
              <p className="mb-2 mt-3 text-xs font-medium text-muted-foreground">
                Top reactions
              </p>
              <div className="flex flex-wrap gap-2">
                {a.emojis.topReactions.slice(0, 8).map((e) => (
                  <div
                    key={e.emoji}
                    className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1"
                  >
                    <span className="text-xl leading-none">{e.emoji}</span>
                    <span className="tabular-nums text-xs text-muted-foreground">
                      {fmt(e.count)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}

      {/* ── Stat 4: Circadian rhythm & sleep ────────────────────────────── */}
      {circadianParticipants.length > 0 ? (
        <WrapChartCard
          title="Circadian rhythm"
          description="Message activity by hour of day. Sleep windows estimated from quiet stretches."
          exportName="main-circadian"
          exportLines={circadianParticipants.map(
            (p) =>
              `${p.name} sleep ~${p.sleepStartHour}:00–${p.sleepEndHour}:00`
          )}
          chartClassName="h-72 sm:h-80"
        >
          <CircadianPolarChart
            participants={circadianParticipants}
            className="h-full w-full"
          />
        </WrapChartCard>
      ) : null}

      {/* Sleep window text cards */}
      {circadianParticipants.filter((p) => p.sleepEndHour !== 0).length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {circadianParticipants.slice(0, 4).map((p) => (
            <StatCard
              key={p.name}
              label={`${p.name} · sleep`}
              value={`${p.sleepStartHour}:00–${p.sleepEndHour}:00`}
              icon={Clock}
              accent="violet"
            />
          ))}
        </div>
      ) : null}

      {/* ── Stat 5: Activity heatmap ─────────────────────────────────────── */}
      {heatmapDays.length > 0 ? (
        <WrapChartCard
          title="Activity heatmap"
          description="Messages per day over the last year. Darker = more messages."
          exportName="main-heatmap"
          exportLines={[
            `${heatmapDays.length} active days`,
            `Peak: ${fmt(Math.max(...heatmapDays.map((d) => d.count)))} messages`,
          ]}
          chartClassName="h-44 sm:h-48"
        >
          <CalendarHeatmap days={heatmapDays} className="h-full w-full" />
        </WrapChartCard>
      ) : null}

      {/* Sample messages */}
      {analytics.sampleMessages.length > 0 ? (
        <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Sample messages
          </p>
          <ul className="flex flex-col gap-2">
            {analytics.sampleMessages.map((line, i) => (
              <li
                key={i}
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
