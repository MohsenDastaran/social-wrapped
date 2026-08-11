import { fmt } from "@/components/wrap/chart-theme"
import { OverviewKpiPanel } from "@/components/wrap/overview-kpi-panel"
import { StoryExportHost } from "@/components/wrap/story-export-host"
import type { TikTokInsights } from "@/platform/tiktok-types"
import {
  Heart,
  MessageCircle,
  MessagesSquare,
  Play,
  Star,
  UserPlus,
  Users,
} from "lucide-react"

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

      <StoryExportHost exportName="tiktok-network-kpis" storyCaptureWidth={560}>
        <OverviewKpiPanel
          sections={[
            {
              title: "Your profile",
              stats: [
                {
                  label: "Followers",
                  value: fmt(data.profile.followerCount),
                  icon: Users,
                  accent: "text-sky-600 dark:text-sky-400",
                },
                {
                  label: "Following",
                  value: fmt(data.profile.followingCount),
                  icon: UserPlus,
                  accent: "text-teal-600 dark:text-teal-400",
                },
                {
                  label: "Watches",
                  value: fmt(data.watchCount),
                  icon: Play,
                  accent: "text-violet-600 dark:text-violet-400",
                },
                {
                  label: "Likes",
                  value: fmt(data.likeCount),
                  icon: Heart,
                  accent: "text-rose-600 dark:text-rose-400",
                },
              ],
            },
          ]}
        />
      </StoryExportHost>

      <StoryExportHost exportName="tiktok-engage-kpis" storyCaptureWidth={560}>
        <OverviewKpiPanel
          sections={[
            {
              title: "Saved & chats",
              stats: [
                {
                  label: "Favorite videos",
                  value: fmt(data.favouriteVideoCount),
                  icon: Star,
                  accent: "text-amber-600 dark:text-amber-400",
                },
                {
                  label: "Comments",
                  value: fmt(data.commentCount),
                  icon: MessageCircle,
                  accent: "text-sky-600 dark:text-sky-400",
                },
                {
                  label: "DM threads",
                  value: fmt(data.dmThreadCount),
                  icon: MessagesSquare,
                  accent: "text-teal-600 dark:text-teal-400",
                },
                {
                  label: "DM messages",
                  value: fmt(data.dmMessageCount),
                  icon: MessagesSquare,
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
