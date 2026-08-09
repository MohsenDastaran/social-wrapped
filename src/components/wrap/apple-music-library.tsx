import { useMemo } from "react"

import {
  CountSeriesChart,
  heatmapDaysToMonthly,
} from "@/components/wrap/charts/count-series-chart"
import { fmt } from "@/components/wrap/chart-theme"
import {
  formatListeningMs,
  type AppleMusicInsights,
} from "@/platform/apple-music-types"
import { listScrollMaxClass } from "@/lib/scroll"
import { cn } from "@/lib/utils"

type AppleMusicLibraryInsightsProps = {
  data: AppleMusicInsights
}

/** Genres, albums, playlists, loved tracks, library growth. */
export function AppleMusicLibraryInsights({
  data,
}: AppleMusicLibraryInsightsProps) {
  const genres = data.topGenres ?? []
  const albums = data.topAlbums ?? []
  const loved = data.lovedTracks ?? []
  const playlists = data.playlists?.topPlaylists ?? []
  const decades = data.decades ?? []
  const growth = data.libraryGrowthHeatmap ?? []
  const growthMonthly = useMemo(() => heatmapDaysToMonthly(growth), [growth])

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Your library
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Genres, albums, playlists, and how your library grew over time.
        </p>
      </header>

      {growthMonthly.length > 0 ? (
        <CountSeriesChart
          data={growthMonthly}
          title="Library growth"
          description="Tracks added each month"
          exportName="apple-music-library-growth"
          valueLabel="Tracks added"
          variant="area"
          accent="violet"
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {genres.length > 0 ? (
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
            <h3 className="text-sm font-medium">Top genres</h3>
            <ul
              className={cn(
                "mt-3 flex flex-col gap-2 text-sm",
                listScrollMaxClass
              )}
            >
              {genres.slice(0, 15).map((g) => (
                <li
                  key={g.name}
                  className="flex min-w-0 items-baseline justify-between gap-2"
                >
                  <span className="truncate text-foreground">{g.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {fmt(g.count)}
                    {g.msPlayed ? ` · ${formatListeningMs(g.msPlayed)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {albums.length > 0 ? (
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
            <h3 className="text-sm font-medium">Top albums</h3>
            <ul
              className={cn(
                "mt-3 flex flex-col gap-2 text-sm",
                listScrollMaxClass
              )}
            >
              {albums.slice(0, 15).map((a) => (
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
      </div>

      {decades.length > 0 ? (
        <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
          <h3 className="text-sm font-medium">Plays by decade</h3>
          <ul className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
            {decades.map((d) => (
              <li key={d.decade}>
                <span className="text-foreground">{d.decade}s</span>:{" "}
                {fmt(d.count)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {loved.length > 0 ? (
        <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
          <h3 className="text-sm font-medium">Loved tracks</h3>
          <ul
            className={cn(
              "mt-3 flex flex-col gap-2 text-sm",
              listScrollMaxClass
            )}
          >
            {loved.slice(0, 15).map((t) => (
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

      {playlists.length > 0 ? (
        <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
          <h3 className="text-sm font-medium">
            Playlists ({fmt(data.playlists.userPlaylistCount)} user)
          </h3>
          <ul
            className={cn(
              "mt-3 flex flex-col gap-2 text-sm",
              listScrollMaxClass
            )}
          >
            {playlists.slice(0, 15).map((p) => (
              <li
                key={p.name}
                className="flex min-w-0 items-baseline justify-between gap-2"
              >
                <span className="truncate text-foreground">{p.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {fmt(p.trackCount)} tracks
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
