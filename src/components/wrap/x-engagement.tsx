import { CalendarHeatmap } from "@/components/wrap/charts/calendar-heatmap"
import {
  CircadianPolarChart,
  peakHourLabel,
} from "@/components/wrap/charts/circadian-polar-chart"
import { fmt } from "@/components/wrap/chart-theme"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { WrapKpi } from "@/components/wrap/wrap-kpi"
import type { XInsights } from "@/platform/x-types"
import { cn } from "@/lib/utils"
import { AtSign, Heart, MessagesSquare } from "lucide-react"

type XEngagementProps = {
  data: XInsights
}

function padHourly(raw?: number[] | null): number[] {
  return Array.from({ length: 24 }, (_, i) => Number(raw?.[i] ?? 0) || 0)
}

/** Likes, tweet heatmaps, mentions, DM counts. */
export function XEngagement({ data }: XEngagementProps) {
  const heatmap = data.tweetHeatmap ?? []
  const hourly = padHourly(data.tweetHourly)
  const hasHourly = hourly.some((n) => n > 0)
  const mentions = data.topMentions ?? []
  const years = data.tweetsByYear ?? []

  const peak = hasHourly ? peakHourLabel(hourly) : null
  const tweetTotal = hourly.reduce((a, b) => a + b, 0)

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Engagement
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Likes, tweet timing, mentions, and direct messages from this archive.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <WrapKpi
          label="Likes"
          value={fmt(data.likeCount)}
          icon={Heart}
          accent="amber"
        />
        <WrapKpi
          label="DM threads"
          value={fmt(data.dmThreadCount)}
          icon={MessagesSquare}
          accent="sky"
        />
        <WrapKpi
          label="DM messages"
          value={fmt(data.dmMessageCount)}
          icon={MessagesSquare}
          accent="teal"
        />
        <WrapKpi
          label="Group DMs"
          value={fmt(data.groupDmThreadCount)}
          icon={MessagesSquare}
          accent="violet"
        />
      </div>

      {heatmap.length > 0 ? (
        <CalendarHeatmap
          days={heatmap}
          title="Tweet activity"
          description="Days you posted on X"
          exportName="x-tweet-heatmap"
        />
      ) : null}

      {hasHourly ? (
        <WrapChartCard
          title="When you tweet"
          description={`Peak ${peak} · ${fmt(tweetTotal)} tweets (UTC)`}
          exportName="x-tweet-hours"
          exportSize="compact"
          exportLines={[`Peak ${peak}`, `Total ${fmt(tweetTotal)}`]}
          chartClassName="h-80 sm:h-[22rem]"
        >
          <CircadianPolarChart
            series={[{ name: "Tweets", hourly }]}
            showLegend={false}
            className="h-full w-full p-2"
          />
        </WrapChartCard>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {years.length > 0 ? (
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
            <h3 className="text-sm font-medium">Tweets by year</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {years.map((y) => {
                const max = Math.max(...years.map((x) => x.count), 1)
                return (
                  <li key={y.year} className="flex items-center gap-3 text-sm">
                    <span className="w-12 shrink-0 tabular-nums text-muted-foreground">
                      {y.year}
                    </span>
                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-zinc-600/80"
                        style={{
                          width: `${Math.max(4, (y.count / max) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-end tabular-nums">
                      {fmt(y.count)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        {mentions.length > 0 ? (
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
            <div className="flex items-center gap-2">
              <AtSign className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Top mentions</h3>
            </div>
            <ul
              className={cn(
                "mt-3 flex max-h-72 flex-col gap-1.5 overflow-y-auto overscroll-contain"
              )}
            >
              {mentions.slice(0, 20).map((m) => (
                <li
                  key={m.name}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate">@{m.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {fmt(m.count)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}
