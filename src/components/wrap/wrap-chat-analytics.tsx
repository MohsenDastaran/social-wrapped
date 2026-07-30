import { useMemo, useState } from "react"

import {
  EChartsPieChart,
  type ChartConfig as PieConfig,
} from "@/components/evilcharts/charts/echarts-pie-chart"
import { CalendarHeatmap } from "@/components/wrap/charts/calendar-heatmap"
import { CircadianPolarChart } from "@/components/wrap/charts/circadian-polar-chart"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import type { AnalyticsResult, WrapAnalytics } from "@/platform/analytics-types"
import {
  Clock,
  MessageSquare,
  Mic,
  Moon,
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

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({
  icon: Icon,
  label,
}: {
  icon: typeof MessageSquare
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3.5 text-muted-foreground" />
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
    </div>
  )
}

type ParticipantBarProps = {
  name: string
  value: string
  pct?: number
  accent?: "teal" | "amber" | "violet"
}
function ParticipantBar({ name, value, pct, accent = "teal" }: ParticipantBarProps) {
  const barColor = {
    teal: "bg-teal-500",
    amber: "bg-amber-500",
    violet: "bg-violet-500",
  }[accent]
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
        <span className="truncate font-medium">{name}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {value}
        </span>
      </div>
      {pct !== undefined ? (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${barColor} transition-[width]`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      ) : null}
    </div>
  )
}

// ── Pie config helpers ────────────────────────────────────────────────────────

function makeDominancePieConfig(participants: string[]): PieConfig {
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
  return Object.fromEntries(
    participants.map((name, i) => [
      name,
      { label: name, colors: palettes[i % palettes.length] },
    ])
  )
}

// ── Chat analytics panel ──────────────────────────────────────────────────────

function ChatAnalyticsPanel({ chatName, a }: { chatName: string; a: AnalyticsResult }) {
  const dominancePieConfig = useMemo(
    () => makeDominancePieConfig(a.volume.participants.map((p) => p.name)),
    [a.volume.participants]
  )
  const dominanceData = a.volume.participants.map((p) => ({
    name: p.name,
    count: p.count,
  }))

  const vtPieConfig: PieConfig = {
    text: {
      label: "Text",
      colors: {
        light: ["#99f6e4", "#14b8a6"],
        dark: ["#5eead4", "#2dd4bf"],
      },
    },
    voice: {
      label: "Voice",
      colors: {
        light: ["#fde68a", "#f59e0b"],
        dark: ["#fcd34d", "#fbbf24"],
      },
    },
  }
  const vtData = [
    { kind: "text", count: a.voiceText.totalText },
    { kind: "voice", count: a.voiceText.totalVoice },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* ── Volume totals ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {a.volume.participants.slice(0, 4).map((p, i) => {
          const accents = ["teal", "amber", "violet", "teal"] as const
          return (
            <div
              key={p.name}
              className={`rounded-xl px-4 py-3 ring-1 bg-linear-to-br ${
                i === 0
                  ? "from-teal-500/15 to-teal-500/5 ring-teal-500/25"
                  : i === 1
                    ? "from-amber-500/15 to-amber-500/5 ring-amber-500/25"
                    : i === 2
                      ? "from-violet-500/15 to-violet-500/5 ring-violet-500/25"
                      : "from-rose-500/15 to-rose-500/5 ring-rose-500/25"
              }`}
            >
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {p.name}
              </p>
              <p className="font-heading mt-1 text-2xl font-semibold tabular-nums">
                {fmt(p.count)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {p.pct.toFixed(1)}% of chat
              </p>
            </div>
          )
        })}
      </div>

      {/* ── Dominance pie ─────────────────────────────────────────────── */}
      <WrapChartCard
        title={`${chatName} · dominance`}
        description="Who sent more in this chat"
        exportName={`chat-${chatName}-dominance`}
        exportLines={a.volume.participants.map(
          (p) => `${p.name} ${fmt(p.count)} (${p.pct.toFixed(1)}%)`
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

      {/* ── Response times ────────────────────────────────────────────── */}
      {a.responseTime.participants.length > 0 ? (
        <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <SectionLabel icon={Clock} label="Avg response time" />
          <div className="mt-3 flex flex-col gap-2">
            {a.responseTime.participants.map((p) => (
              <ParticipantBar
                key={p.name}
                name={p.name}
                value={`avg ${fmtResponseTime(p.avgSecs)} · median ${fmtResponseTime(p.medianSecs)}`}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Message length ─────────────────────────────────────────────── */}
      {a.messageLength.participants.length > 0 ? (
        <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <SectionLabel icon={MessageSquare} label="Avg message length" />
          <div className="mt-3 flex flex-col gap-2">
            {a.messageLength.participants.map((p) => {
              const maxAvg = Math.max(
                ...a.messageLength.participants.map((x) => x.avgChars)
              )
              return (
                <ParticipantBar
                  key={p.name}
                  name={p.name}
                  value={`${p.avgChars.toFixed(1)} chars/msg`}
                  pct={(p.avgChars / maxAvg) * 100}
                  accent="teal"
                />
              )
            })}
          </div>
        </div>
      ) : null}

      {/* ── Voice vs text ─────────────────────────────────────────────── */}
      {a.voiceText.totalVoice > 0 ? (
        <WrapChartCard
          title="Voice vs text"
          description="Voice memos vs text messages in this chat"
          exportName={`chat-${chatName}-voice-text`}
          exportLines={[
            `Voice ${fmt(a.voiceText.totalVoice)} (${fmtDuration(a.voiceText.totalVoiceDurationSecs)})`,
            `Text ${fmt(a.voiceText.totalText)}`,
          ]}
          chartClassName="h-44 sm:h-48"
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
      ) : null}

      {/* ── Late night ────────────────────────────────────────────────── */}
      {a.lateNight.totalLateNight > 0 ? (
        <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <SectionLabel icon={Moon} label={`Late-night (1–5 AM) · ${fmt(a.lateNight.totalLateNight)} msgs`} />
          <div className="mt-3 flex flex-col gap-2">
            {a.lateNight.participants
              .filter((p) => p.count > 0)
              .map((p) => (
                <ParticipantBar
                  key={p.name}
                  name={p.name}
                  value={`${fmt(p.count)} (${p.pctOfParticipantTotal.toFixed(1)}%)`}
                  pct={p.pctOfParticipantTotal}
                  accent="violet"
                />
              ))}
          </div>
        </div>
      ) : null}

      {/* ── Initiator / finisher ──────────────────────────────────────── */}
      {a.initiatorFinisher.initiators.length > 0 ? (
        <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <SectionLabel icon={Zap} label="Conversation dynamics" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Usually starts
              </p>
              {a.initiatorFinisher.initiators.slice(0, 3).map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between py-0.5 text-sm"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {p.pct.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Usually closes
              </p>
              {a.initiatorFinisher.finishers.slice(0, 3).map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between py-0.5 text-sm"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {p.pct.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Top emojis ───────────────────────────────────────────────── */}
      {a.emojis.topOverall.length > 0 ? (
        <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <SectionLabel icon={Shuffle} label="Top emojis" />
          <div className="mt-3 flex flex-wrap gap-2">
            {a.emojis.topOverall.slice(0, 10).map((e) => (
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
        </div>
      ) : null}

      {/* ── Circadian ────────────────────────────────────────────────── */}
      {a.circadian.participants.length > 0 ? (
        <WrapChartCard
          title="Activity by hour"
          description="Circadian rhythm for this chat — estimated sleep windows shown."
          exportName={`chat-${chatName}-circadian`}
          exportLines={a.circadian.participants.map(
            (p) => `${p.name} sleep ${p.sleepStartHour}:00–${p.sleepEndHour}:00`
          )}
          chartClassName="h-64 sm:h-72"
        >
          <CircadianPolarChart
            participants={a.circadian.participants}
            className="h-full w-full"
          />
        </WrapChartCard>
      ) : null}

      {/* ── Heatmap ───────────────────────────────────────────────────── */}
      {a.heatmap.days.length > 0 ? (
        <WrapChartCard
          title="Activity heatmap"
          description="Messages per day in this chat over the last year."
          exportName={`chat-${chatName}-heatmap`}
          exportLines={[
            `${a.heatmap.days.length} active days`,
          ]}
          chartClassName="h-44 sm:h-48"
        >
          <CalendarHeatmap days={a.heatmap.days} className="h-full w-full" />
        </WrapChartCard>
      ) : null}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

type WrapChatAnalyticsProps = {
  analytics: WrapAnalytics
}

export function WrapChatAnalytics({ analytics }: WrapChatAnalyticsProps) {
  if (!analytics?.account) return null
  const chats = analytics.chats ?? []

  const [chatId, setChatId] = useState<number>(chats[0]?.chatId ?? -1)

  const chat = useMemo(
    () => chats.find((c) => c.chatId === chatId) ?? chats[0],
    [chats, chatId]
  )

  if (chats.length === 0) {
    return null
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="text-start">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Chat breakdown
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a chat to see detailed user-vs-user stats. Showing top{" "}
          {chats.length} chats by volume.
        </p>
      </header>

      <label className="flex flex-col gap-1.5 text-start">
        <span className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Users className="size-3.5" />
          Select chat
        </span>
        <select
          value={chatId}
          onChange={(e) => setChatId(Number(e.target.value))}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {chats.map((c) => (
            <option key={c.chatId} value={c.chatId}>
              {c.chatName} · {fmt(c.analytics.totalMessages)} msgs
            </option>
          ))}
        </select>
      </label>

      {chat ? (
        <ChatAnalyticsPanel chatName={chat.chatName} a={chat.analytics} />
      ) : null}
    </section>
  )
}
