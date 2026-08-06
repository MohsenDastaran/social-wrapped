import { fmt } from "@/components/wrap/chart-theme"
import { StoryExportHost } from "@/components/wrap/story-export-host"
import { WrapKpi } from "@/components/wrap/wrap-kpi"
import type { TikTokInsights } from "@/platform/tiktok-types"
import { Heart, MessageCircle, Play, Star, Users } from "lucide-react"

type TikTokActivityInsightsProps = {
  data: TikTokInsights
}

/** Profile + watch / like / favorite / comment KPIs. */
export function TikTokActivityInsights({ data }: TikTokActivityInsightsProps) {
  const username = data.profile.username
    ? `@${data.profile.username}`
    : data.profile.nickname || "TikTok account"
  const bio = data.profile.bio?.trim()
  const region = data.profile.region?.trim()

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          TikTok profile & activity
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {username}
          {region ? ` · ${region}` : ""}
          {bio ? ` · ${bio.slice(0, 120)}${bio.length > 120 ? "…" : ""}` : ""}
        </p>
      </header>

      <StoryExportHost exportName="tiktok-network-kpis">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <WrapKpi
            label="Followers"
            value={fmt(data.profile.followerCount)}
            icon={Users}
            accent="sky"
          />
          <WrapKpi
            label="Following"
            value={fmt(data.profile.followingCount)}
            icon={Users}
            accent="teal"
          />
          <WrapKpi
            label="Watches"
            value={fmt(data.watchCount)}
            icon={Play}
            accent="violet"
          />
          <WrapKpi
            label="Likes"
            value={fmt(data.likeCount)}
            icon={Heart}
            accent="amber"
          />
        </div>
      </StoryExportHost>

      <StoryExportHost exportName="tiktok-engage-kpis">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <WrapKpi
            label="Favorite videos"
            value={fmt(data.favouriteVideoCount)}
            icon={Star}
            accent="amber"
          />
          <WrapKpi
            label="Comments"
            value={fmt(data.commentCount)}
            icon={MessageCircle}
            accent="sky"
          />
          <WrapKpi
            label="DM threads"
            value={fmt(data.dmThreadCount)}
            icon={MessageCircle}
            accent="teal"
          />
          <WrapKpi
            label="DM messages"
            value={fmt(data.dmMessageCount)}
            icon={MessageCircle}
            accent="emerald"
          />
        </div>
      </StoryExportHost>
    </section>
  )
}
