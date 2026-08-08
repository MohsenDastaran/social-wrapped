import { CalendarHeatmap } from "@/components/wrap/charts/calendar-heatmap"
import {
  CircadianPolarChart,
  peakHourLabel,
} from "@/components/wrap/charts/circadian-polar-chart"
import { fmt } from "@/components/wrap/chart-theme"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import {
  formatListeningMs,
  type SpotifyInsights,
} from "@/platform/spotify-types"
import { listScrollMaxClass } from "@/lib/scroll"
import { cn } from "@/lib/utils"

type SpotifyEngagementProps = {
  data: SpotifyInsights
}

function padHourly(raw?: number[] | null): number[] {
  return Array.from({ length: 24 }, (_, i) => Number(raw?.[i] ?? 0) || 0)
}

/** Heatmap, hourly patterns, top artists & tracks. */
export function SpotifyEngagement({ data }: SpotifyEngagementProps) {
  const heatmap = data.listenHeatmap ?? []
  const hourly = padHourly(data.listenHourly)
  const hasHourly = hourly.some((n) => n > 0)
  const peak = hasHourly ? peakHourLabel(hourly) : null
  const playTotal = hourly.reduce((a, b) => a + b, 0)
  const artists = data.topArtists ?? []
  const tracks = data.topTracks ?? []
  const years = data.playsByYear ?? []

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          When & what you play
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Listening patterns and your most-played artists and tracks.
        </p>
      </header>

      {heatmap.length > 0 &&
      !(heatmap.length === 1 && heatmap[0]?.date === "1970-01-01") ? (
        <CalendarHeatmap
          days={heatmap}
          title="Listening activity"
          description="Days you played tracks"
          exportName="spotify-listen-heatmap"
        />
      ) : null}

      {hasHourly && playTotal > 0 ? (
        <WrapChartCard
          title="When you listen"
          description={`Peak ${peak} · ${fmt(playTotal)} plays (UTC)`}
          exportName="spotify-listen-hours"
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {artists.length > 0 ? (
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
            <h3 className="text-sm font-medium">Top artists</h3>
            <ul
              className={cn(
                "mt-3 flex flex-col gap-2 text-sm",
                listScrollMaxClass
              )}
            >
              {artists.slice(0, 15).map((a) => (
                <li
                  key={a.name}
                  className="flex min-w-0 items-baseline justify-between gap-2"
                >
                  <span className="truncate text-foreground">{a.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {fmt(a.count)}
                    {a.msPlayed ? ` · ${formatListeningMs(a.msPlayed)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {tracks.length > 0 ? (
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
            <h3 className="text-sm font-medium">Top tracks</h3>
            <ul
              className={cn(
                "mt-3 flex flex-col gap-2 text-sm",
                listScrollMaxClass
              )}
            >
              {tracks.slice(0, 15).map((t) => (
                <li
                  key={t.name}
                  className="flex min-w-0 items-baseline justify-between gap-2"
                >
                  <span className="truncate text-foreground">{t.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {fmt(t.count)}
                    {t.msPlayed ? ` · ${formatListeningMs(t.msPlayed)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {years.length > 1 ? (
        <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
          <h3 className="text-sm font-medium">Plays by year</h3>
          <ul className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
            {years.map((y) => (
              <li key={y.year}>
                <span className="text-foreground">{y.year}</span>: {fmt(y.count)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
