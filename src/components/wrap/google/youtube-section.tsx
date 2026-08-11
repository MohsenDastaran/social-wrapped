import { ActivityOverTimeChart } from "@/components/wrap/charts/activity-over-time-chart"
import { CalendarHeatmap } from "@/components/wrap/charts/calendar-heatmap"
import {
  CircadianPolarChart,
  peakHourLabel,
} from "@/components/wrap/charts/circadian-polar-chart"
import { CountedRankList } from "@/components/wrap/google/counted-rank-list"
import { OverviewKpiPanel } from "@/components/wrap/overview-kpi-panel"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { fmt } from "@/components/wrap/chart-theme"
import type { YouTubeInsights } from "@/platform/google-types"
import {
  Clapperboard,
  ListVideo,
  MessageSquareText,
  Search,
  Users,
} from "lucide-react"

function padHourly(hourly: number[] | undefined): number[] {
  const out = Array.from({ length: 24 }, (_, i) => hourly?.[i] ?? 0)
  return out
}

type YouTubeSectionProps = {
  data: YouTubeInsights
  /** When true, use as the page hero section (standalone YouTube wrap). */
  standalone?: boolean
}

export function YouTubeSection({ data, standalone = false }: YouTubeSectionProps) {
  const watchHourly = padHourly(data.watchHourly)
  const searchHourly = padHourly(data.searchHourly)
  const hasWatches = (data.watchCount ?? 0) > 0
  const hasSearches = (data.searchCount ?? 0) > 0

  if (!hasWatches && !hasSearches && !(data.subscriptionCount > 0)) {
    return (
      <section className="flex flex-col gap-3 text-start">
        <header>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            YouTube
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No watch or search history found in this export.
          </p>
        </header>
      </section>
    )
  }

  const peak = hasWatches ? peakHourLabel(watchHourly) : null

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          {standalone ? "Your YouTube year" : "YouTube"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.channelTitle
            ? `Channel · ${data.channelTitle}`
            : "Watch history, searches, and subscriptions from Takeout."}
        </p>
      </header>

      <OverviewKpiPanel
        sections={[
          {
            title: "Your year",
            stats: [
              {
                label: "Watches",
                value: fmt(data.watchCount),
                icon: Clapperboard,
                accent: "text-teal-600 dark:text-teal-400",
              },
              {
                label: "Unique videos",
                value: fmt(data.uniqueVideos),
                icon: ListVideo,
                accent: "text-sky-600 dark:text-sky-400",
              },
              {
                label: "Searches",
                value: fmt(data.searchCount),
                icon: Search,
                accent: "text-amber-600 dark:text-amber-400",
              },
              {
                label: "Subscriptions",
                value: fmt(data.subscriptionCount),
                icon: Users,
                accent: "text-violet-600 dark:text-violet-400",
              },
              {
                label: "Comments",
                value: fmt(data.commentCount),
                icon: MessageSquareText,
                accent: "text-emerald-600 dark:text-emerald-400",
              },
            ],
          },
        ]}
      />

      {hasWatches && data.watchActivity?.daily?.length ? (
        <ActivityOverTimeChart
          series={data.watchActivity}
          title="Watches over time"
          exportName="yt-watches-over-time"
          sentLabel="Watches"
          receivedLabel="—"
        />
      ) : null}

      {(data.watchHeatmap?.length ?? 0) > 0 ? (
        <CalendarHeatmap
          days={data.watchHeatmap}
          title="Watch activity"
          description="Days you watched YouTube"
          exportName="yt-watch-heatmap"
        />
      ) : null}

      {hasWatches && watchHourly.some((n) => n > 0) ? (
        <WrapChartCard
          title="When you watch"
          description={
            peak ? `Peak ${peak} · ${fmt(data.watchCount)} watches (UTC)` : undefined
          }
          exportName="yt-watch-hours"
          exportSize="compact"
          chartClassName="h-80 sm:h-[22rem]"
        >
          <CircadianPolarChart
            series={[{ name: "Watches", hourly: watchHourly }]}
            showLegend={false}
            className="h-full w-full p-2"
          />
        </WrapChartCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <CountedRankList
          title="Top channels"
          description="Most watched"
          icon={Users}
          items={data.topChannels ?? []}
          emptyLabel="No channel data"
        />
        <CountedRankList
          title="Top videos"
          description="Most rewatched titles"
          icon={Clapperboard}
          items={data.topVideos ?? []}
          emptyLabel="No video titles"
        />
      </div>

      {hasSearches ? (
        <>
          {(data.searchHeatmap?.length ?? 0) > 0 ? (
            <CalendarHeatmap
              days={data.searchHeatmap}
              title="Search activity"
              description="Days you searched on YouTube"
              exportName="yt-search-heatmap"
            />
          ) : null}
          {searchHourly.some((n) => n > 0) ? (
            <WrapChartCard
              title="When you search"
              exportName="yt-search-hours"
              exportSize="compact"
              chartClassName="h-80 sm:h-[22rem]"
            >
              <CircadianPolarChart
                series={[{ name: "Searches", hourly: searchHourly }]}
                showLegend={false}
                className="h-full w-full p-2"
              />
            </WrapChartCard>
          ) : null}
          <CountedRankList
            title="Top searches"
            icon={Search}
            items={data.topSearches ?? []}
            emptyLabel="No search queries"
          />
        </>
      ) : null}
    </section>
  )
}
