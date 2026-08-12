import { fmt } from "@/components/wrap/chart-theme"
import { OverviewKpiPanel } from "@/components/wrap/overview-kpi-panel"
import { StoryExportHost } from "@/components/wrap/story-export-host"
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

      <StoryExportHost exportName="spotify-listen-kpis" storyCaptureWidth={560}>
        <OverviewKpiPanel
          sections={[
            {
              title: "Your listening",
              stats: [
                {
                  label: "Plays",
                  value: fmt(data.playCount),
                  icon: Music2,
                  accent: "text-emerald-600 dark:text-emerald-400",
                },
                {
                  label: "Listening time",
                  value: formatListeningMs(data.totalMsPlayed),
                  icon: Clock,
                  accent: "text-teal-600 dark:text-teal-400",
                },
                {
                  label: "Artists",
                  value: fmt(data.uniqueArtistCount),
                  icon: Users,
                  accent: "text-sky-600 dark:text-sky-400",
                },
                {
                  label: "Tracks",
                  value: fmt(data.uniqueTrackCount),
                  icon: Disc3,
                  accent: "text-violet-600 dark:text-violet-400",
                },
              ],
            },
          ]}
        />
      </StoryExportHost>

      <StoryExportHost exportName="spotify-skip-kpis" storyCaptureWidth={560}>
        <OverviewKpiPanel
          sections={[
            {
              title: "Playback details",
              stats: [
                {
                  label: "Short plays",
                  value: fmt(data.skipCount),
                  icon: SkipForward,
                  accent: "text-amber-600 dark:text-amber-400",
                },
                {
                  label: "Format",
                  value: data.format === "extended" ? "Extended" : "Account",
                  icon: Music2,
                  accent: "text-emerald-600 dark:text-emerald-400",
                },
              ],
            },
          ]}
        />
      </StoryExportHost>
    </section>
  )
}
