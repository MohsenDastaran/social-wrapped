import { useMemo } from "react"
import { Disc3, Heart, ListMusic, Mic2, Search } from "lucide-react"

import {
  CountSeriesChart,
  heatmapDaysToMonthly,
} from "@/components/wrap/charts/count-series-chart"
import { fmt } from "@/components/wrap/chart-theme"
import { TopListeningRanksCard } from "@/components/wrap/top-listening-ranks"
import {
  formatListeningMs,
  type SpotifyInsights,
} from "@/platform/spotify-types"
import { listScrollMaxClass } from "@/lib/scroll"
import { cn } from "@/lib/utils"

type SpotifyLibraryInsightsProps = {
  data: SpotifyInsights
}

/** Albums, saved tracks, playlists, searches, podcasts. */
export function SpotifyLibraryInsights({ data }: SpotifyLibraryInsightsProps) {
  const albums = data.topAlbums ?? []
  const podcasts = data.topPodcasts ?? []
  const saved = data.savedTracks ?? []
  const searches = data.topSearchQueries ?? []
  const playlists = data.playlists?.topPlaylists ?? []
  const growth = data.libraryGrowthHeatmap ?? []
  const growthMonthly = useMemo(() => heatmapDaysToMonthly(growth), [growth])
  const hasRanks = albums.length > 0 || podcasts.length > 0

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Your library
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Saved music, playlists, albums, and what you searched for.
        </p>
      </header>

      {hasRanks ? (
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2 lg:gap-5">
          {albums.length > 0 ? (
            <div className="flex min-h-0 flex-col">
              <TopListeningRanksCard
                title="Top albums"
                description="Albums you returned to most"
                exportName="spotify-top-albums"
                items={albums}
                icon={Disc3}
                accent="teal"
                limit={12}
                splitArtistTrack
              />
            </div>
          ) : null}

          {podcasts.length > 0 ? (
            <div className="flex min-h-0 flex-col">
              <TopListeningRanksCard
                title="Top podcasts"
                description="Shows you pressed play on"
                exportName="spotify-top-podcasts"
                items={podcasts}
                icon={Mic2}
                accent="rose"
                limit={12}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {growthMonthly.length > 1 ? (
        <CountSeriesChart
          data={growthMonthly}
          title="Playlist adds"
          description="Tracks added to playlists each month"
          exportName="spotify-library-growth"
          valueLabel="Tracks added"
          variant="area"
          accent="violet"
        />
      ) : null}

      {saved.length > 0 ? (
        <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
          <div className="flex items-center gap-2">
            <Heart className="size-3.5 text-muted-foreground" aria-hidden />
            <h3 className="text-sm font-medium">
              Saved tracks ({fmt(data.savedTrackCount)})
            </h3>
          </div>
          <ul
            className={cn(
              "mt-3 flex flex-col gap-2 text-sm",
              listScrollMaxClass
            )}
          >
            {saved.slice(0, 15).map((t) => (
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
              Playlists ({fmt(data.playlists.userPlaylistCount)})
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

      {searches.length > 0 ? (
        <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
          <div className="flex items-center gap-2">
            <Search className="size-3.5 text-muted-foreground" aria-hidden />
            <h3 className="text-sm font-medium">Top searches</h3>
          </div>
          <ul
            className={cn(
              "mt-3 flex flex-col gap-2 text-sm",
              listScrollMaxClass
            )}
          >
            {searches.slice(0, 15).map((q) => (
              <li
                key={q.name}
                className="flex min-w-0 items-baseline justify-between gap-2"
              >
                <span className="truncate text-foreground">{q.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {fmt(q.count)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
