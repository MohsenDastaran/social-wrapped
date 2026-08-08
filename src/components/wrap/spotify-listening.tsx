import { fmt } from "@/components/wrap/chart-theme"
import { StoryExportHost } from "@/components/wrap/story-export-host"
import { WrapKpi } from "@/components/wrap/wrap-kpi"
import {
  formatListeningMs,
  type SpotifyInsights,
} from "@/platform/spotify-types"
import { Clock, Disc3, Music2, SkipForward, Users } from "lucide-react"

type SpotifyListeningInsightsProps = {
  data: SpotifyInsights
}

/** Profile + listening KPIs. */
export function SpotifyListeningInsights({
  data,
}: SpotifyListeningInsightsProps) {
  const name =
    data.profile.displayName?.trim() ||
    data.profile.username?.trim() ||
    "Spotify account"
  const country = data.profile.country?.trim()
  const created = data.profile.creationTime?.trim()

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Spotify listening
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {name}
          {country ? ` · ${country}` : ""}
          {created ? ` · since ${created}` : ""}
        </p>
      </header>

      <StoryExportHost exportName="spotify-listen-kpis">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <WrapKpi
            label="Plays"
            value={fmt(data.playCount)}
            icon={Music2}
            accent="emerald"
          />
          <WrapKpi
            label="Listening time"
            value={formatListeningMs(data.totalMsPlayed)}
            icon={Clock}
            accent="teal"
          />
          <WrapKpi
            label="Artists"
            value={fmt(data.uniqueArtistCount)}
            icon={Users}
            accent="sky"
          />
          <WrapKpi
            label="Tracks"
            value={fmt(data.uniqueTrackCount)}
            icon={Disc3}
            accent="violet"
          />
        </div>
      </StoryExportHost>

      <StoryExportHost exportName="spotify-skip-kpis">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4">
          <WrapKpi
            label="Short plays (under 30s)"
            value={fmt(data.skipCount)}
            icon={SkipForward}
            accent="amber"
          />
          <WrapKpi
            label="Format"
            value={data.format === "extended" ? "Extended" : "Account"}
            icon={Music2}
            accent="emerald"
          />
        </div>
      </StoryExportHost>
    </section>
  )
}
