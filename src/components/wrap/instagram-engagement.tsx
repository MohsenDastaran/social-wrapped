import { CalendarHeatmap } from "@/components/wrap/charts/calendar-heatmap"
import {
  CircadianPolarChart,
  peakHourLabel,
} from "@/components/wrap/charts/circadian-polar-chart"
import { IgCountedList } from "@/components/wrap/instagram-list-panels"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { WrapKpi } from "@/components/wrap/wrap-kpi"
import { fmt } from "@/components/wrap/chart-theme"
import type { InstagramSocialInsights } from "@/platform/analytics-types"
import {
  Heart,
  MessageCircle,
  MessageSquareHeart,
  MessageSquareText,
} from "lucide-react"

type InstagramEngagementProps = {
  data: InstagramSocialInsights
}

/** Outbound likes + comments you wrote / liked (not inbound engagement). */
export function InstagramEngagement({ data }: InstagramEngagementProps) {
  const likedPosts = data.likedPostsCount ?? 0
  const likedComments = data.likedCommentsCount ?? 0
  const commentsWritten = data.commentsWrittenCount ?? 0
  const heatmap = data.likeHeatmap ?? []
  const hourly = padHourly(data.likeHourly)
  const hasMix = likedPosts > 0 || likedComments > 0 || commentsWritten > 0
  const hasHourly = hourly.some((n) => n > 0)
  const hasLists =
    (data.topCommentedAccounts?.length ?? 0) > 0 ||
    (data.topReelCommentedAccounts?.length ?? 0) > 0 ||
    (data.topLikedCommentAccounts?.length ?? 0) > 0

  if (!hasMix && heatmap.length === 0 && !hasHourly && !hasLists) {
    return (
      <section className="flex flex-col gap-3 text-start">
        <header>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Likes & comments
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This ZIP didn’t include liked posts, liked comments, or comments you
            wrote. Re-download with activity selected.
          </p>
        </header>
      </section>
    )
  }

  const peak = hasHourly ? peakHourLabel(hourly) : null
  const likeTotal = hourly.reduce((a, b) => a + b, 0)

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Likes & comments
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your outbound likes and comments from this download — not who engaged
          with your posts.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <WrapKpi
          label="Liked posts"
          value={hasMix ? fmt(likedPosts) : "—"}
          icon={Heart}
          accent="teal"
        />
        <WrapKpi
          label="Liked comments"
          value={hasMix ? fmt(likedComments) : "—"}
          icon={MessageSquareHeart}
          accent="amber"
        />
        <WrapKpi
          label="Comments written"
          value={hasMix ? fmt(commentsWritten) : "—"}
          icon={MessageSquareText}
          accent="emerald"
        />
      </div>

      {heatmap.length > 0 ? (
        <CalendarHeatmap
          days={heatmap}
          title="Like activity"
          description="Days you liked posts and reels"
          exportName="ig-like-heatmap"
        />
      ) : null}

      {hasHourly ? (
        <WrapChartCard
          title="When you like"
          description={`Peak ${peak} · ${fmt(likeTotal)} likes (UTC)`}
          exportName="ig-like-hours"
          exportLines={[`Peak ${peak}`, `Total ${fmt(likeTotal)}`]}
          chartClassName="h-80 sm:h-[22rem]"
        >
          <CircadianPolarChart
            series={[{ name: "Likes", hourly }]}
            showLegend={false}
            className="h-full w-full p-2"
          />
        </WrapChartCard>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <IgCountedList
          title="Accounts you comment on"
          description="Posts you left a comment on"
          icon={MessageCircle}
          items={data.topCommentedAccounts ?? []}
          emptyLabel="No post comments in this ZIP."
        />
        <IgCountedList
          title="Reels you comment on"
          description="Reels you left a comment on"
          icon={MessageSquareHeart}
          items={data.topReelCommentedAccounts ?? []}
          emptyLabel="No reel comments in this ZIP."
        />
        <IgCountedList
          title="Comments you liked"
          description="Accounts whose comments you liked"
          icon={Heart}
          items={data.topLikedCommentAccounts ?? []}
          emptyLabel="No liked comments in this ZIP."
        />
      </div>
    </section>
  )
}

function padHourly(raw?: number[]): number[] {
  const out = Array.from({ length: 24 }, () => 0)
  if (!raw) return out
  for (let i = 0; i < 24; i++) out[i] = Number(raw[i] ?? 0) || 0
  return out
}
