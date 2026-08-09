import { fmt } from "@/components/wrap/chart-theme"
import { StoryExportHost } from "@/components/wrap/story-export-host"
import { WrapKpi } from "@/components/wrap/wrap-kpi"
import {
  formatListeningMs,
  type AppleMusicInsights,
} from "@/platform/apple-music-types"
import { Clock, Disc3, Heart, Library, Music2, SkipForward, Users } from "lucide-react"

type AppleMusicListeningInsightsProps = {
  data: AppleMusicInsights
}

/** Profile + listening KPIs. */
export function AppleMusicListeningInsights({
  data,
}: AppleMusicListeningInsightsProps) {
  const name =
    data.profile.displayName?.trim() || "Apple Music Library"
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
          {exported ? ` · exported ${exported}` : ""}
        </p>
      </header>

      <StoryExportHost exportName="apple-music-listen-kpis">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <WrapKpi
            label="Plays"
            value={fmt(data.playCount)}
            icon={Music2}
            accent="violet"
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
            label="Played tracks"
            value={fmt(data.uniqueTrackCount)}
            icon={Disc3}
            accent="emerald"
          />
        </div>
      </StoryExportHost>

      <StoryExportHost exportName="apple-music-library-kpis">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <WrapKpi
            label="Library tracks"
            value={fmt(data.libraryTrackCount)}
            icon={Library}
            accent="violet"
          />
          <WrapKpi
            label="Apple Music"
            value={fmt(data.appleMusicTrackCount)}
            icon={Music2}
            accent="teal"
          />
          <WrapKpi
            label="Skips"
            value={fmt(data.skipCount)}
            icon={SkipForward}
            accent="amber"
          />
          <WrapKpi
            label="Loved"
            value={fmt(data.lovedCount)}
            icon={Heart}
            accent="emerald"
          />
        </div>
      </StoryExportHost>
    </section>
  )
}
