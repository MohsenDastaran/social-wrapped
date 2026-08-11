import { fmt } from "@/components/wrap/chart-theme"
import { OverviewKpiPanel } from "@/components/wrap/overview-kpi-panel"
import { StoryExportHost } from "@/components/wrap/story-export-host"
import type { XInsights } from "@/platform/x-types"
import {
  Ban,
  Heart,
  MessageCircle,
  MessagesSquare,
  Repeat2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react"

type XNetworkInsightsProps = {
  data: XInsights
}

/** Followers, tweets, likes/DMs — one capture host for the first X story. */
export function XNetworkInsights({ data }: XNetworkInsightsProps) {
  const username = data.profile.username
    ? `@${data.profile.username}`
    : data.profile.displayName || "X account"
  const bio = data.profile.bio?.trim()

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          X network & tweets
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {username}
          {bio ? ` · ${bio.slice(0, 120)}${bio.length > 120 ? "…" : ""}` : ""}
        </p>
      </header>

      <StoryExportHost exportName="x-overview-kpis" storyCaptureWidth={560}>
        <OverviewKpiPanel
          sections={[
            {
              title: "Your network",
              stats: [
                {
                  label: "Followers",
                  value: fmt(data.followerCount),
                  icon: Users,
                  accent: "text-sky-600 dark:text-sky-400",
                },
                {
                  label: "Following",
                  value: fmt(data.followingCount),
                  icon: UserPlus,
                  accent: "text-teal-600 dark:text-teal-400",
                },
                {
                  label: "Blocked",
                  value: fmt(data.blockCount),
                  icon: Ban,
                  accent: "text-amber-600 dark:text-amber-400",
                },
                {
                  label: "Muted",
                  value: fmt(data.muteCount),
                  icon: UserMinus,
                  accent: "text-violet-600 dark:text-violet-400",
                },
              ],
            },
            {
              title: "Your posts",
              stats: [
                {
                  label: "Tweets",
                  value: fmt(data.tweetCount),
                  icon: MessageCircle,
                  accent: "text-sky-600 dark:text-sky-400",
                },
                {
                  label: "Originals",
                  value: fmt(data.originalCount),
                  icon: MessageCircle,
                  accent: "text-emerald-600 dark:text-emerald-400",
                },
                {
                  label: "Replies",
                  value: fmt(data.replyCount),
                  icon: MessageCircle,
                  accent: "text-teal-600 dark:text-teal-400",
                },
                {
                  label: "Retweets",
                  value: fmt(data.retweetCount),
                  icon: Repeat2,
                  accent: "text-amber-600 dark:text-amber-400",
                },
              ],
            },
            {
              title: "Your engagement",
              stats: [
                {
                  label: "Likes",
                  value: fmt(data.likeCount),
                  icon: Heart,
                  accent: "text-amber-600 dark:text-amber-400",
                },
                {
                  label: "DM threads",
                  value: fmt(data.dmThreadCount),
                  icon: MessagesSquare,
                  accent: "text-sky-600 dark:text-sky-400",
                },
                {
                  label: "DM messages",
                  value: fmt(data.dmMessageCount),
                  icon: MessagesSquare,
                  accent: "text-teal-600 dark:text-teal-400",
                },
                {
                  label: "Group DMs",
                  value: fmt(data.groupDmThreadCount),
                  icon: MessagesSquare,
                  accent: "text-violet-600 dark:text-violet-400",
                },
              ],
            },
          ]}
        />
      </StoryExportHost>
    </section>
  )
}
