import { CalendarHeatmap } from "@/components/wrap/charts/calendar-heatmap"
import {
  CircadianPolarChart,
  peakHourLabel,
} from "@/components/wrap/charts/circadian-polar-chart"
import { WordCloudChart } from "@/components/wrap/charts/word-cloud-chart"
import { fmt } from "@/components/wrap/chart-theme"
import { CountedRankList } from "@/components/wrap/google/counted-rank-list"
import { OverviewKpiPanel } from "@/components/wrap/overview-kpi-panel"
import { StoryExportHost } from "@/components/wrap/story-export-host"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { WrapKpi } from "@/components/wrap/wrap-kpi"
import { listScrollMaxClass } from "@/lib/scroll"
import { cn } from "@/lib/utils"
import type {
  FacebookInsights,
  FbYearCount,
} from "@/platform/facebook-types"
import {
  BadgeCheck,
  FileText,
  Heart,
  LogIn,
  Megaphone,
  MessageCircle,
  ThumbsUp,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react"

type FacebookInsightsProps = {
  data: FacebookInsights
}

function namedItems(names: string[]) {
  return names
    .filter((name) => name.trim())
    .map((name) => ({ name, count: 1 }))
}

function YearGrowth({ years }: { years: FbYearCount[] }) {
  const max = Math.max(...years.map((y) => y.count), 1)
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
      <h3 className="text-sm font-medium">Friends by year</h3>
      <p className="text-xs text-muted-foreground">When your friend list grew</p>
      <ul className={cn("mt-2 flex flex-col gap-2", listScrollMaxClass)}>
        {years.map((y) => (
          <li key={y.year} className="flex items-center gap-3 text-sm">
            <span className="w-12 shrink-0 text-muted-foreground tabular-nums">
              {y.year}
            </span>
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-sky-600/80"
                style={{ width: `${Math.max(4, (y.count / max) * 100)}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-end tabular-nums">
              {fmt(y.count)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Friends, following, and unfriended. */
export function FacebookNetworkInsights({ data }: FacebookInsightsProps) {
  const hasNetwork =
    data.friendCount > 0 ||
    data.followingCount > 0 ||
    data.unfriendedCount > 0

  if (!hasNetwork) {
    return (
      <section className="flex flex-col gap-3 text-start">
        <header>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Facebook network
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This ZIP didn’t include friends or following. Re-download with
            connections selected.
          </p>
        </header>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Facebook network
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Friends, people you follow, and unfriended names from this download.
        </p>
      </header>

      <StoryExportHost exportName="facebook-network-kpis" storyCaptureWidth={560}>
        <OverviewKpiPanel
          sections={[
            {
              title: "Your network",
              stats: [
                {
                  label: "Friends",
                  value: fmt(data.friendCount),
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
                  label: "Unfriended",
                  value: fmt(data.unfriendedCount),
                  icon: UserMinus,
                  accent: "text-violet-600 dark:text-violet-400",
                },
              ],
            },
          ]}
        />
      </StoryExportHost>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data.friendsByYear.length > 0 ? (
          <YearGrowth years={data.friendsByYear} />
        ) : null}
        <CountedRankList
          title="Recent friends"
          description="Names from your friends file"
          icon={Users}
          items={namedItems(data.recentFriends)}
          emptyLabel="No friend names in this ZIP."
          accent="sky"
          showCount={false}
        />
        {data.unfriended.length > 0 ? (
          <CountedRankList
            title="Unfriended"
            description="People you removed"
            icon={UserMinus}
            items={namedItems(data.unfriended)}
            emptyLabel="No removed friends in this ZIP."
            accent="violet"
            showCount={false}
          />
        ) : null}
      </div>
    </section>
  )
}

/** Outbound reactions and comments you wrote. */
export function FacebookEngagement({ data }: FacebookInsightsProps) {
  const hourly = data.reactionHourly
  const hasHourly = hourly.some((n) => n > 0)
  const hasMix = data.reactionCount > 0 || data.commentsWrittenCount > 0
  const hasLists =
    data.topReactedNames.length > 0 ||
    data.topCommentedNames.length > 0 ||
    data.reactionTypes.length > 0

  if (!hasMix && data.reactionHeatmap.length === 0 && !hasHourly && !hasLists) {
    return (
      <section className="flex flex-col gap-3 text-start">
        <header>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Reactions & comments
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This ZIP didn’t include likes, reactions, or comments you wrote.
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
          Reactions & comments
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your outbound likes, reactions, and comments from this download.
        </p>
      </header>

      <StoryExportHost exportName="facebook-engage-kpis" storyCaptureWidth={560}>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <WrapKpi
            label="Reactions"
            value={hasMix ? fmt(data.reactionCount) : "—"}
            icon={ThumbsUp}
            accent="sky"
          />
          <WrapKpi
            label="Comments written"
            value={hasMix ? fmt(data.commentsWrittenCount) : "—"}
            icon={MessageCircle}
            accent="emerald"
          />
        </div>
      </StoryExportHost>

      {data.reactionHeatmap.length > 0 ? (
        <CalendarHeatmap
          days={data.reactionHeatmap}
          title="Reaction activity"
          description="Days you reacted or commented"
          exportName="facebook-reaction-heatmap"
        />
      ) : null}

      {hasHourly ? (
        <WrapChartCard
          title="When you react"
          description={`Peak ${peak} · ${fmt(likeTotal)} reactions (UTC)`}
          exportName="facebook-reaction-hours"
          exportSize="compact"
          exportLines={[`Peak ${peak}`, `Total ${fmt(likeTotal)}`]}
          chartClassName="h-80 sm:h-[22rem]"
        >
          <CircadianPolarChart
            series={[{ name: "Reactions", hourly }]}
            showLegend={false}
            className="h-full w-full p-2"
          />
        </WrapChartCard>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CountedRankList
          title="People you react to"
          description="Names from reaction titles"
          icon={Heart}
          items={data.topReactedNames}
          emptyLabel="No reaction names in this ZIP."
          accent="sky"
        />
        <CountedRankList
          title="People you comment on"
          description="Names from comment titles"
          icon={MessageCircle}
          items={data.topCommentedNames}
          emptyLabel="No comment names in this ZIP."
          accent="emerald"
        />
        <CountedRankList
          title="Reaction types"
          description="Like, Love, and the rest"
          icon={ThumbsUp}
          items={data.reactionTypes}
          emptyLabel="No reaction types in this ZIP."
          accent="amber"
        />
      </div>
    </section>
  )
}

/** Your posts — heatmap and word cloud. */
export function FacebookPosts({ data }: FacebookInsightsProps) {
  const hasKeywords = Object.keys(data.postKeywords).length > 0
  if (data.postCount === 0 && data.postHeatmap.length === 0 && !hasKeywords) {
    return null
  }

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Your posts
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Status updates and wall posts in this download.
        </p>
      </header>

      <StoryExportHost exportName="facebook-posts-kpis" storyCaptureWidth={560}>
        <div className="grid grid-cols-1 gap-3 sm:max-w-xs">
          <WrapKpi
            label="Posts"
            value={fmt(data.postCount)}
            icon={FileText}
            accent="violet"
          />
        </div>
      </StoryExportHost>

      {data.postHeatmap.length > 0 ? (
        <CalendarHeatmap
          days={data.postHeatmap}
          title="Post activity"
          description="Days you posted"
          exportName="facebook-post-heatmap"
        />
      ) : null}

      {hasKeywords ? (
        <WordCloudChart
          keywords={{ counts: data.postKeywords }}
          mode="you"
          enableScopeToggle={false}
          youLabel="You"
          exportName="facebook-post-word-cloud"
          title="Words in your posts"
          description="From post text in this download"
        />
      ) : null}
    </section>
  )
}

/** Pages liked and groups joined or left. */
export function FacebookPagesGroups({ data }: FacebookInsightsProps) {
  const hasPages = data.pageLikeCount > 0 || data.topPages.length > 0
  const hasGroups =
    data.groupsJoinedCount > 0 ||
    data.groupsLeftCount > 0 ||
    data.recentGroups.length > 0
  if (!hasPages && !hasGroups) return null

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Pages & groups
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pages you liked and group membership events.
        </p>
      </header>

      <StoryExportHost exportName="facebook-pages-kpis" storyCaptureWidth={560}>
        <OverviewKpiPanel
          sections={[
            {
              title: "Pages & groups",
              stats: [
                {
                  label: "Pages liked",
                  value: fmt(data.pageLikeCount),
                  icon: BadgeCheck,
                  accent: "text-sky-600 dark:text-sky-400",
                },
                {
                  label: "Groups joined",
                  value: fmt(data.groupsJoinedCount),
                  icon: UserPlus,
                  accent: "text-emerald-600 dark:text-emerald-400",
                },
                {
                  label: "Groups left",
                  value: fmt(data.groupsLeftCount),
                  icon: UserMinus,
                  accent: "text-violet-600 dark:text-violet-400",
                },
              ],
            },
          ]}
        />
      </StoryExportHost>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CountedRankList
          title="Pages you liked"
          description="Most recent likes first in the archive"
          icon={BadgeCheck}
          items={data.topPages}
          emptyLabel="No page likes in this ZIP."
          accent="sky"
        />
        <CountedRankList
          title="Recent groups"
          description="Joined or left"
          icon={Users}
          items={namedItems(data.recentGroups)}
          emptyLabel="No group membership events in this ZIP."
          accent="emerald"
          showCount={false}
        />
      </div>
    </section>
  )
}

/** Advertisers using your activity — names only. */
export function FacebookAds({ data }: FacebookInsightsProps) {
  if (data.advertiserCount === 0 && data.advertisers.length === 0) return null

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Advertisers
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Companies Facebook lists as using your activity or information.
        </p>
      </header>

      <StoryExportHost exportName="facebook-ads-kpis" storyCaptureWidth={560}>
        <div className="grid grid-cols-1 gap-3 sm:max-w-xs">
          <WrapKpi
            label="Advertisers"
            value={fmt(data.advertiserCount)}
            icon={Megaphone}
            accent="amber"
          />
        </div>
      </StoryExportHost>

      <CountedRankList
        title="Advertiser names"
        description="From this download — not a ranking"
        icon={Megaphone}
        items={namedItems(data.advertisers)}
        emptyLabel="No advertisers listed in this ZIP."
        accent="amber"
        showCount={false}
      />
    </section>
  )
}

/** Login activity — sites only, never IPs. */
export function FacebookLoginActivity({ data }: FacebookInsightsProps) {
  if (
    data.loginCount === 0 &&
    data.loginHeatmap.length === 0 &&
    data.topLoginSites.length === 0
  ) {
    return null
  }

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Login activity
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          When and where you signed in. IP addresses from the export are not
          shown.
        </p>
      </header>

      <StoryExportHost exportName="facebook-login-kpis" storyCaptureWidth={560}>
        <div className="grid grid-cols-1 gap-3 sm:max-w-xs">
          <WrapKpi
            label="Logins"
            value={fmt(data.loginCount)}
            icon={LogIn}
            accent="teal"
          />
        </div>
      </StoryExportHost>

      {data.loginHeatmap.length > 0 ? (
        <CalendarHeatmap
          days={data.loginHeatmap}
          title="Login days"
          description="Days with a recorded sign-in"
          exportName="facebook-login-heatmap"
        />
      ) : null}

      <CountedRankList
        title="Sites you signed in from"
        description="Host names only — no IP addresses"
        icon={LogIn}
        items={data.topLoginSites}
        emptyLabel="No login sites in this ZIP."
        accent="teal"
      />
    </section>
  )
}
