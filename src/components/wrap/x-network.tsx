import { fmt } from "@/components/wrap/chart-theme"
import { StoryExportHost } from "@/components/wrap/story-export-host"
import { WrapKpi } from "@/components/wrap/wrap-kpi"
import type { XInsights } from "@/platform/x-types"
import { Ban, MessageCircle, Repeat2, UserMinus, UserPlus, Users } from "lucide-react"

type XNetworkInsightsProps = {
  data: XInsights
}

/** Followers, following, blocks/mutes, and tweet mix KPIs. */
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

      <StoryExportHost exportName="x-network-kpis">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <WrapKpi
            label="Followers"
            value={fmt(data.followerCount)}
            icon={Users}
            accent="sky"
          />
          <WrapKpi
            label="Following"
            value={fmt(data.followingCount)}
            icon={UserPlus}
            accent="teal"
          />
          <WrapKpi
            label="Blocked"
            value={fmt(data.blockCount)}
            icon={Ban}
            accent="amber"
          />
          <WrapKpi
            label="Muted"
            value={fmt(data.muteCount)}
            icon={UserMinus}
            accent="violet"
          />
        </div>
      </StoryExportHost>

      <StoryExportHost exportName="x-tweet-kpis">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <WrapKpi
            label="Tweets"
            value={fmt(data.tweetCount)}
            icon={MessageCircle}
            accent="sky"
          />
          <WrapKpi
            label="Originals"
            value={fmt(data.originalCount)}
            icon={MessageCircle}
            accent="emerald"
          />
          <WrapKpi
            label="Replies"
            value={fmt(data.replyCount)}
            icon={MessageCircle}
            accent="teal"
          />
          <WrapKpi
            label="Retweets"
            value={fmt(data.retweetCount)}
            icon={Repeat2}
            accent="amber"
          />
        </div>
      </StoryExportHost>
    </section>
  )
}
