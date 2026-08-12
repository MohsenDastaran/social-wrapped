import {
  CircadianPolarChart,
  peakHourLabel,
} from "@/components/wrap/charts/circadian-polar-chart"
import { IgCountedList } from "@/components/wrap/instagram-list-panels"
import { fmt } from "@/components/wrap/chart-theme"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { WrapKpi } from "@/components/wrap/wrap-kpi"
import type { InstagramSocialInsights } from "@/platform/analytics-types"
import { Clapperboard, Users } from "lucide-react"

type InstagramStoryViewsProps = {
  data: InstagramSocialInsights
}

/** Stories and reels you opened from story_interactions/stories_viewed.json. */
export function InstagramStoryViews({ data }: InstagramStoryViewsProps) {
  const viewed = data.storiesViewedCount ?? 0
  const heatmap = data.storyViewHeatmap ?? []
  const hourly = padHourly(data.storyViewHourly)
  const hasHourly = hourly.some((n) => n > 0)
  const topAccounts = data.topStoryViewedAccounts ?? []

  if (
    viewed === 0 &&
    heatmap.length === 0 &&
    !hasHourly &&
    topAccounts.length === 0
  ) {
    return (
      <section className="flex flex-col gap-3 text-start">
        <header>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Stories & reels you watched
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This ZIP didn’t include stories_viewed.json. Re-export with story
            activity selected.
          </p>
        </header>
      </section>
    )
  }

  const peak = hasHourly ? peakHourLabel(hourly) : null
  const viewTotal = hourly.reduce((a, b) => a + b, 0)

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Stories & reels you watched
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Opens from your story viewing history — mostly reels in recent
          exports.
        </p>
      </header>

      <WrapKpi
        label="Views logged"
        value={fmt(viewed)}
        icon={Clapperboard}
        accent="violet"
        className="max-w-xs"
      />

      {/* {heatmap.length > 0 ? (
        <CalendarHeatmap
          days={heatmap}
          title="Viewing activity"
          description="Days you opened stories or reels"
          exportName="ig-story-view-heatmap"
        />
      ) : null} */}

      {hasHourly ? (
        <WrapChartCard
          title="When you watch"
          description={`Peak ${peak} · ${fmt(viewTotal)} views (UTC)`}
          exportName="ig-story-view-hours"
          exportSize="compact"
          exportLines={[`Peak ${peak}`, `Total ${fmt(viewTotal)}`]}
          chartClassName="h-80 sm:h-[22rem]"
        >
          <CircadianPolarChart
            series={[{ name: "Views", hourly }]}
            showLegend={false}
            className="h-full w-full p-2"
          />
        </WrapChartCard>
      ) : null}

      {topAccounts.length > 0 ? (
        <IgCountedList
          title="Who you watch most"
          description="Top accounts from your viewing history"
          icon={Users}
          items={topAccounts}
          emptyLabel="No story views in this ZIP."
        />
      ) : null}
    </section>
  )
}

function padHourly(raw?: number[]): number[] {
  const out = Array.from({ length: 24 }, () => 0)
  if (!raw) return out
  for (let i = 0; i < 24; i++) out[i] = Number(raw[i] ?? 0) || 0
  return out
}
