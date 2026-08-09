import { useMemo } from "react"
import { Disc3, Library, ListMusic, Heart } from "lucide-react"

import {
  CountSeriesChart,
  heatmapDaysToMonthly,
} from "@/components/wrap/charts/count-series-chart"
import { fmt } from "@/components/wrap/chart-theme"
import { TopListeningRanksCard } from "@/components/wrap/top-listening-ranks"
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
  const hasRanks = genres.length > 0 || albums.length > 0

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

      {hasRanks ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          {genres.length > 0 ? (
            <TopListeningRanksCard
              title="Top genres"
              description="Where your play counts land"
              exportName="apple-music-top-genres"
              items={genres}
              icon={Library}
              accent="rose"
              limit={12}
            />
          ) : null}

          {albums.length > 0 ? (
            <TopListeningRanksCard
              title="Top albums"
              description="Albums you returned to most"
              exportName="apple-music-top-albums"
              items={albums}
              icon={Disc3}
              accent="teal"
              limit={12}
              splitArtistTrack
            />
          ) : null}
        </div>
      ) : null}

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
          <div className="flex items-center gap-2">
            <Heart className="size-3.5 text-muted-foreground" aria-hidden />
            <h3 className="text-sm font-medium">Loved tracks</h3>
          </div>
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
          <div className="flex items-center gap-2">
            <ListMusic className="size-3.5 text-muted-foreground" aria-hidden />
            <h3 className="text-sm font-medium">
              Playlists ({fmt(data.playlists.userPlaylistCount)} user)
            </h3>
          </div>
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
