import { CalendarHeatmap } from "@/components/wrap/charts/calendar-heatmap"
import {
  CircadianPolarChart,
  peakHourLabel,
} from "@/components/wrap/charts/circadian-polar-chart"
import { fmt } from "@/components/wrap/chart-theme"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import type { TikTokInsights } from "@/platform/tiktok-types"
import { listScrollMaxClass } from "@/lib/scroll"
import { cn } from "@/lib/utils"

type TikTokEngagementProps = {
  data: TikTokInsights
}

function padHourly(raw?: number[] | null): number[] {
  return Array.from({ length: 24 }, (_, i) => Number(raw?.[i] ?? 0) || 0)
}

/** Watch/like heatmaps, hourly patterns, recent comments. */
export function TikTokEngagement({ data }: TikTokEngagementProps) {
  const watchHeatmap = data.watchHeatmap ?? []
  const likeHeatmap = data.likeHeatmap ?? []
  const watchHourly = padHourly(data.watchHourly)
  const likeHourly = padHourly(data.likeHourly)
  const hasWatchHourly = watchHourly.some((n) => n > 0)
  const hasLikeHourly = likeHourly.some((n) => n > 0)
  const comments = data.recentComments ?? []

  const watchPeak = hasWatchHourly ? peakHourLabel(watchHourly) : null
  const watchTotal = watchHourly.reduce((a, b) => a + b, 0)
  const likePeak = hasLikeHourly ? peakHourLabel(likeHourly) : null
  const likeTotal = likeHourly.reduce((a, b) => a + b, 0)

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Watching & engagement
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          When you watch and like, plus recent comments from this download.
        </p>
      </header>

      {watchHeatmap.length > 0 ? (
        <CalendarHeatmap
          days={watchHeatmap}
          title="Watch activity"
          description="Days you watched videos"
          exportName="tiktok-watch-heatmap"
        />
      ) : null}

      {likeHeatmap.length > 0 ? (
        <CalendarHeatmap
          days={likeHeatmap}
          title="Like activity"
          description="Days you liked videos"
          exportName="tiktok-like-heatmap"
        />
      ) : null}

      {hasWatchHourly ? (
        <WrapChartCard
          title="When you watch"
          description={`Peak ${watchPeak} · ${fmt(watchTotal)} watches (UTC)`}
          exportName="tiktok-watch-hours"
          exportSize="compact"
          exportLines={[`Peak ${watchPeak}`, `Total ${fmt(watchTotal)}`]}
          chartClassName="h-80 sm:h-[22rem]"
        >
          <CircadianPolarChart
            series={[{ name: "Watches", hourly: watchHourly }]}
            showLegend={false}
            className="h-full w-full p-2"
          />
        </WrapChartCard>
      ) : null}

      {hasLikeHourly ? (
        <WrapChartCard
          title="When you like"
          description={`Peak ${likePeak} · ${fmt(likeTotal)} likes (UTC)`}
          exportName="tiktok-like-hours"
          exportSize="compact"
          exportLines={[`Peak ${likePeak}`, `Total ${fmt(likeTotal)}`]}
          chartClassName="h-80 sm:h-[22rem]"
        >
          <CircadianPolarChart
            series={[{ name: "Likes", hourly: likeHourly }]}
            showLegend={false}
            className="h-full w-full p-2"
          />
        </WrapChartCard>
      ) : null}

      {comments.length > 0 ? (
        <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
          <h3 className="text-sm font-medium">Recent comments</h3>
          <ul
            className={cn(
              "mt-3 flex flex-col gap-2 text-sm text-muted-foreground",
              listScrollMaxClass
            )}
          >
            {comments.slice(0, 12).map((c, i) => (
              <li key={`${c.date}-${i}`} className="min-w-0">
                <span className="text-foreground">{c.comment}</span>
                <span className="ms-2 text-xs opacity-70">{c.date}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
