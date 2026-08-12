import { fmt } from "@/components/wrap/chart-theme"
import { OverviewKpiPanel } from "@/components/wrap/overview-kpi-panel"
import { StoryExportHost } from "@/components/wrap/story-export-host"
import {
  formatListeningMs,
  type AppleMusicInsights,
} from "@/platform/apple-music-types"
import {
  Clock,
  Disc3,
  Heart,
  Library,
  Music2,
  SkipForward,
  Users,
} from "lucide-react"

type AppleMusicListeningInsightsProps = {
  data: AppleMusicInsights
}

/** Profile + listening KPIs. */
export function AppleMusicListeningInsights({
  data,
}: AppleMusicListeningInsightsProps) {
  const name = data.profile.displayName?.trim() || "Apple Music Library"
  const libraryId = data.profile.libraryPersistentId?.trim()
  const version = data.profile.applicationVersion?.trim()
  const exported = data.profile.exportDate?.trim()

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Apple Music listening
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {name}
          {libraryId ? ` · ${libraryId}` : ""}
          {version ? ` · v${version}` : ""}
          {exported
            ? ` · exported ${new Date(exported).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}`
            : ""}
        </p>
      </header>

      <StoryExportHost
        exportName="apple-music-listen-kpis"
        storyCaptureWidth={560}
      >
        <OverviewKpiPanel
          sections={[
            {
              title: "Your listening",
              stats: [
                {
                  label: "Plays",
                  value: fmt(data.playCount),
                  icon: Music2,
                  accent: "text-violet-600 dark:text-violet-400",
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
                  label: "Played tracks",
                  value: fmt(data.uniqueTrackCount),
                  icon: Disc3,
                  accent: "text-emerald-600 dark:text-emerald-400",
                },
              ],
            },
          ]}
        />
      </StoryExportHost>

      <StoryExportHost
        exportName="apple-music-library-kpis"
        storyCaptureWidth={560}
      >
        <OverviewKpiPanel
          sections={[
            {
              title: "Your library",
              stats: [
                {
                  label: "Library tracks",
                  value: fmt(data.libraryTrackCount),
                  icon: Library,
                  accent: "text-violet-600 dark:text-violet-400",
                },
                {
                  label: "Apple Music",
                  value: fmt(data.appleMusicTrackCount),
                  icon: Music2,
                  accent: "text-teal-600 dark:text-teal-400",
                },
                {
                  label: "Skips",
                  value: fmt(data.skipCount),
                  icon: SkipForward,
                  accent: "text-amber-600 dark:text-amber-400",
                },
                {
                  label: "Loved",
                  value: fmt(data.lovedCount),
                  icon: Heart,
                  accent: "text-rose-600 dark:text-rose-400",
                },
              ],
            },
          ]}
        />
      </StoryExportHost>
    </section>
  )
}
