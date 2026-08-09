import { CalendarHeatmap } from "@/components/wrap/charts/calendar-heatmap"
import { CountSeriesChart } from "@/components/wrap/charts/count-series-chart"
import {
  CircadianPolarChart,
  peakHourLabel,
} from "@/components/wrap/charts/circadian-polar-chart"
import { fmt } from "@/components/wrap/chart-theme"
import { TopListeningRanksCard } from "@/components/wrap/top-listening-ranks"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import type { AppleMusicInsights } from "@/platform/apple-music-types"
import { Disc3, Music2 } from "lucide-react"

type AppleMusicEngagementProps = {
  data: AppleMusicInsights
}

function padHourly(raw?: number[] | null): number[] {
  return Array.from({ length: 24 }, (_, i) => Number(raw?.[i] ?? 0) || 0)
}

/** Heatmap, hourly patterns, top artists & tracks. */
export function AppleMusicEngagement({ data }: AppleMusicEngagementProps) {
  const heatmap = data.listenHeatmap ?? []
  const hourly = padHourly(data.listenHourly)
  const hasHourly = hourly.some((n) => n > 0)
  const peak = hasHourly ? peakHourLabel(hourly) : null
  const playTotal = hourly.reduce((a, b) => a + b, 0)
  const artists = data.topArtists ?? []
  const tracks = data.topTracks ?? []
  const years = data.playsByYear ?? []
  const yearChartData = years
    .slice()
    .sort((a, b) => a.year - b.year)
    .map((y) => ({ label: String(y.year), count: y.count }))

  const hasRanks = artists.length > 0 || tracks.length > 0

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          When & what you play
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Listening patterns from play counts. Heatmap and hourly charts use
          last-play dates — an approximation, since Library.xml does not store
          full play history.
        </p>
      </header>

      {hasRanks ? (
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2 lg:gap-5">
          {artists.length > 0 ? (
            <div className="flex min-h-0 flex-col">
              <TopListeningRanksCard
                title="Top artists"
                description="Who owned your library"
                exportName="apple-music-top-artists"
                items={artists}
                icon={Music2}
                accent="rose"
                limit={12}
              />
            </div>
          ) : null}

          {tracks.length > 0 ? (
            <div className="flex min-h-0 flex-col">
              <TopListeningRanksCard
                title="Top tracks"
                description="Songs you kept coming back to"
                exportName="apple-music-top-tracks"
                items={tracks}
                icon={Disc3}
                accent="teal"
                limit={12}
                splitArtistTrack
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {heatmap.length > 0 &&
      !(heatmap.length === 1 && heatmap[0]?.date === "1970-01-01") ? (
        <CalendarHeatmap
          days={heatmap}
          title="Listening activity"
          description="Plays attributed to each track's last-play date"
          exportName="apple-music-listen-heatmap"
        />
      ) : null}

      {hasHourly && playTotal > 0 ? (
        <WrapChartCard
          title="When you listen"
          description={`Peak ${peak} · ${fmt(playTotal)} plays (UTC)`}
          exportName="apple-music-listen-hours"
          exportSize="compact"
          exportLines={[`Peak ${peak}`, `Total ${fmt(playTotal)}`]}
          chartClassName="h-80 sm:h-[22rem]"
        >
          <CircadianPolarChart
            series={[{ name: "Plays", hourly }]}
            showLegend={false}
            className="h-full w-full p-2"
          />
        </WrapChartCard>
      ) : null}

      {yearChartData.length > 1 ? (
        <CountSeriesChart
          data={yearChartData}
          title="Plays by release year"
          description="Play counts weighted by each track's release year"
          exportName="apple-music-plays-by-year"
          valueLabel="Plays"
          variant="bar"
          accent="rose"
        />
      ) : null}
    </section>
  )
}
