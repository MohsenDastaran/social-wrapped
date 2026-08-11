import { fmt } from "@/components/wrap/chart-theme"
import { OverviewKpiPanel } from "@/components/wrap/overview-kpi-panel"
import { StoryExportHost } from "@/components/wrap/story-export-host"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import type {
  IgCountedHandle,
  IgHandle,
  InstagramSocialInsights as InstagramSocialInsightsData,
} from "@/platform/analytics-types"
import { listScrollMaxClass } from "@/lib/scroll"
import { cn } from "@/lib/utils"
import {
  ExternalLink,
  Heart,
  ShieldBan,
  Star,
  UserMinus,
  UserPlus,
  UserRoundMinus,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

type InstagramSocialInsightsProps = {
  data: InstagramSocialInsightsData
}

type AccentKey = "teal" | "sky" | "amber" | "violet" | "rose"

const ACCENT = {
  teal: {
    wash: "from-teal-500/14 via-teal-500/4 to-transparent dark:from-teal-400/12 dark:via-teal-400/3",
    ring: "ring-teal-500/25",
    bar: "bg-teal-600 dark:bg-teal-400",
    barTrack: "bg-teal-500/12 dark:bg-teal-400/12",
    badgeSoft:
      "bg-teal-500/12 text-teal-900 dark:bg-teal-400/15 dark:text-teal-100",
    avatar:
      "bg-teal-500/15 text-teal-900 ring-teal-500/25 dark:bg-teal-400/15 dark:text-teal-100",
  },
  sky: {
    wash: "from-sky-500/14 via-sky-500/4 to-transparent dark:from-sky-400/12 dark:via-sky-400/3",
    ring: "ring-sky-500/25",
    bar: "bg-sky-600 dark:bg-sky-400",
    barTrack: "bg-sky-500/12 dark:bg-sky-400/12",
    badgeSoft:
      "bg-sky-500/12 text-sky-900 dark:bg-sky-400/15 dark:text-sky-100",
    avatar:
      "bg-sky-500/15 text-sky-900 ring-sky-500/25 dark:bg-sky-400/15 dark:text-sky-100",
  },
  amber: {
    wash: "from-amber-500/14 via-amber-500/4 to-transparent dark:from-amber-400/12 dark:via-amber-400/3",
    ring: "ring-amber-500/25",
    bar: "bg-amber-600 dark:bg-amber-400",
    barTrack: "bg-amber-500/12 dark:bg-amber-400/12",
    badgeSoft:
      "bg-amber-500/12 text-amber-950 dark:bg-amber-400/15 dark:text-amber-100",
    avatar:
      "bg-amber-500/15 text-amber-950 ring-amber-500/25 dark:bg-amber-400/15 dark:text-amber-100",
  },
  violet: {
    wash: "from-violet-500/14 via-violet-500/4 to-transparent dark:from-violet-400/12 dark:via-violet-400/3",
    ring: "ring-violet-500/25",
    bar: "bg-violet-600 dark:bg-violet-400",
    barTrack: "bg-violet-500/12 dark:bg-violet-400/12",
    badgeSoft:
      "bg-violet-500/12 text-violet-950 dark:bg-violet-400/15 dark:text-violet-100",
    avatar:
      "bg-violet-500/15 text-violet-950 ring-violet-500/25 dark:bg-violet-400/15 dark:text-violet-100",
  },
  rose: {
    wash: "from-rose-500/14 via-rose-500/4 to-transparent dark:from-rose-400/12 dark:via-rose-400/3",
    ring: "ring-rose-500/25",
    bar: "bg-rose-600 dark:bg-rose-400",
    barTrack: "bg-rose-500/12 dark:bg-rose-400/12",
    badgeSoft:
      "bg-rose-500/12 text-rose-900 dark:bg-rose-400/15 dark:text-rose-100",
    avatar:
      "bg-rose-500/15 text-rose-900 ring-rose-500/25 dark:bg-rose-400/15 dark:text-rose-100",
  },
} as const

function profileHref(handle: IgHandle): string {
  if (handle.href?.trim()) return handle.href.trim()
  return `https://www.instagram.com/${encodeURIComponent(handle.username)}/`
}

function initials(username: string): string {
  const cleaned = username.replace(/[^\p{L}\p{N}]+/gu, " ").trim()
  if (!cleaned) return "?"
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
}

/** Outbound Instagram graph + like favorites (never inbound “who liked you”). */
export function InstagramSocialInsights({
  data,
}: InstagramSocialInsightsProps) {
  const hasNetwork =
    data.followerCount > 0 ||
    data.followingCount > 0 ||
    data.unfollowedRecentlyCount > 0 ||
    (data.blockedCount ?? 0) > 0 ||
    (data.closeFriendsCount ?? 0) > 0
  const hasFollowGaps =
    data.notFollowingBack.length > 0 || data.fansYouDontFollow.length > 0
  const hasLists =
    (data.blockedProfiles?.length ?? 0) > 0 ||
    (data.closeFriends?.length ?? 0) > 0
  const hasLikes =
    data.topLikedAccounts.length > 0 || data.topStoryLikedAccounts.length > 0

  if (!hasNetwork && !hasFollowGaps && !hasLikes) {
    return (
      <section className="flex flex-col gap-3 text-start">
        <header>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Instagram social insights
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This ZIP didn’t include followers, following, or like history.
            Re-download from Accounts Center with connections and activity
            selected.
          </p>
        </header>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Instagram social insights
        </h2>
      </header>

      <StoryExportHost exportName="ig-network-kpis" storyCaptureWidth={560}>
        <OverviewKpiPanel
          sections={[
            {
              title: "Your network",
              stats: [
                {
                  label: "Followers",
                  value: hasNetwork ? fmt(data.followerCount) : "—",
                  icon: Users,
                  accent: "text-teal-600 dark:text-teal-400",
                },
                {
                  label: "Following",
                  value: hasNetwork ? fmt(data.followingCount) : "—",
                  icon: UserPlus,
                  accent: "text-sky-600 dark:text-sky-400",
                },
                {
                  label: "Unfollowed",
                  value: hasNetwork ? fmt(data.unfollowedRecentlyCount) : "—",
                  icon: UserRoundMinus,
                  accent: "text-amber-600 dark:text-amber-400",
                },
                {
                  label: "Blocked",
                  value: fmt(data.blockedCount ?? 0),
                  icon: ShieldBan,
                  accent: "text-amber-600 dark:text-amber-400",
                },
                {
                  label: "Close friends",
                  value: fmt(data.closeFriendsCount ?? 0),
                  icon: Star,
                  accent: "text-violet-600 dark:text-violet-400",
                },
              ],
            },
          ]}
        />
      </StoryExportHost>

      {hasLists ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <HandleListCard
            title="Blocked accounts"
            description="Profiles you’ve blocked"
            icon={ShieldBan}
            handles={data.blockedProfiles ?? []}
            emptyLabel="No blocked profiles in this ZIP."
            accent="amber"
          />
          <HandleListCard
            title="Close friends"
            description="Accounts on your close friends list"
            icon={Star}
            handles={data.closeFriends ?? []}
            emptyLabel="No close friends in this ZIP."
            accent="violet"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <HandleListCard
          title="Not following you back"
          description="People you follow who don’t follow you"
          icon={UserMinus}
          handles={data.notFollowingBack}
          emptyLabel="Everyone you follow follows you back — or following/followers weren’t in this ZIP."
          accent="rose"
        />
        <HandleListCard
          title="Followers you don’t follow"
          description="People who follow you that you don’t follow"
          icon={UserPlus}
          handles={data.fansYouDontFollow}
          emptyLabel="You follow everyone who follows you — or following/followers weren’t in this ZIP."
          accent="sky"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CountedRankCard
          title="Who you like most"
          description="Top accounts behind posts and reels you’ve liked"
          icon={Heart}
          items={data.topLikedAccounts}
          emptyLabel="No liked posts in this ZIP."
          accent="rose"
          exportName="ig-top-liked"
        />
        <CountedRankCard
          title="Stories you’ve liked most"
          description="Top accounts whose stories you’ve hearted"
          icon={Users}
          items={data.topStoryLikedAccounts}
          emptyLabel="No story likes in this ZIP."
          accent="teal"
          exportName="ig-story-hearts"
        />
      </div>
    </section>
  )
}

function Monogram({
  username,
  accent,
  size = "sm",
}: {
  username: string
  accent: AccentKey
  size?: "sm" | "md" | "lg"
}) {
  const palette = ACCENT[accent]
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 tabular-nums",
        palette.avatar,
        size === "sm" && "size-8 text-[0.65rem]",
        size === "md" && "size-10 text-xs",
        size === "lg" && "size-12 text-sm"
      )}
      aria-hidden
    >
      {initials(username)}
    </span>
  )
}

function HandleListCard({
  title,
  description,
  icon: Icon,
  handles,
  emptyLabel,
  accent,
}: {
  title: string
  description: string
  icon: LucideIcon
  handles: IgHandle[]
  emptyLabel: string
  accent: AccentKey
}) {
  const palette = ACCENT[accent]
  const empty = handles.length === 0

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10"
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden border-b border-border/50 bg-linear-to-br px-4 py-3.5",
          palette.wash
        )}
      >
        <div className="relative flex items-start gap-3">
          <span
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-xl",
              palette.badgeSoft
            )}
            aria-hidden
          >
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-heading text-sm font-semibold tracking-tight">
                {title}
              </p>
              {!empty ? (
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2 py-0.5 text-[0.65rem] font-semibold tabular-nums",
                    palette.badgeSoft
                  )}
                >
                  {fmt(handles.length)}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </div>

      {empty ? (
        <p className="px-4 py-8 text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ol className={cn("flex list-none flex-col gap-0.5 p-2", listScrollMaxClass)}>
          {handles.map((handle, index) => (
            <li key={`${handle.username}-${index}`} className="shrink-0">
              <a
                href={profileHref(handle)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-start transition-colors hover:bg-muted/50"
              >
                <span className="w-5 shrink-0 text-center text-[0.7rem] font-bold text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <Monogram username={handle.username} accent={accent} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  @{handle.username}
                </span>
                <ExternalLink
                  className="size-3.5 shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </a>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function CountedRankCard({
  title,
  description,
  icon: Icon,
  items,
  emptyLabel,
  accent,
  exportName,
  limit = 10,
}: {
  title: string
  description: string
  icon: LucideIcon
  items: IgCountedHandle[]
  emptyLabel: string
  accent: AccentKey
  exportName: string
  limit?: number
}) {
  const palette = ACCENT[accent]
  const ranked = items
    .filter((item) => item.username && item.count > 0)
    .slice(0, limit)

  if (ranked.length === 0) {
    return (
      <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
        <div className="border-b border-border/50 px-4 py-3.5">
          <p className="font-heading text-sm font-semibold tracking-tight">
            {title}
          </p>
          <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
            {description}
          </p>
        </div>
        <p className="px-4 py-8 text-xs text-muted-foreground">{emptyLabel}</p>
      </div>
    )
  }

  const peak = ranked[0]?.count ?? 1
  const lead = ranked[0]!
  const rest = ranked.slice(1)
  const exportLines = ranked
    .slice(0, 5)
    .map((item, i) => `#${i + 1} @${item.username} · ${fmt(item.count)}`)

  return (
    <WrapChartCard
      title={title}
      description={description}
      exportName={exportName}
      exportSize="default"
      layout="flow"
      className="min-h-0"
      storyCaptureWidth={560}
      exportLines={exportLines}
      headerExtra={
        <span
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-xl",
            palette.badgeSoft
          )}
          aria-hidden
        >
          <Icon className="size-4" />
        </span>
      }
    >
      <div className="flex min-h-0 flex-col gap-4 p-4 pt-2 sm:p-5 sm:pt-2">
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl bg-linear-to-br p-4 ring-1",
            palette.wash,
            palette.ring
          )}
        >
          <span
            className="pointer-events-none absolute -inset-e-2 -top-4 font-heading text-[5.5rem] font-bold leading-none text-foreground/5 select-none"
            aria-hidden
          >
            01
          </span>
          <div className="relative flex items-center gap-3.5">
            <Monogram username={lead.username} accent={accent} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-[0.65rem] font-bold tracking-[0.14em] uppercase",
                    palette.badgeSoft
                  )}
                >
                  #1
                </span>
                <span className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
                  Top account
                </span>
              </div>
              <a
                href={`https://www.instagram.com/${encodeURIComponent(lead.username)}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block truncate font-heading text-lg font-semibold tracking-tight text-foreground hover:underline sm:text-xl"
              >
                @{lead.username}
              </a>
              <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">
                  {fmt(lead.count)}
                </span>{" "}
                times
              </p>
              <div
                className={cn(
                  "mt-3 h-1.5 w-full overflow-hidden rounded-full",
                  palette.barTrack
                )}
              >
                <div className={cn("h-full w-full rounded-full", palette.bar)} />
              </div>
            </div>
          </div>
        </div>

        {rest.length > 0 ? (
          <ol
            className={cn(
              "flex list-none flex-col gap-0.5 border-t border-border/50 pt-3",
              listScrollMaxClass
            )}
          >
            {rest.map((item, index) => {
              const rank = index + 2
              const barShare = peak > 0 ? item.count / peak : 0
              return (
                <li key={`${item.username}-${rank}`} className="shrink-0">
                  <a
                    href={`https://www.instagram.com/${encodeURIComponent(item.username)}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-xl px-1.5 py-2 transition-colors hover:bg-muted/45"
                  >
                    <span className="w-5 shrink-0 text-center text-[0.7rem] font-bold text-muted-foreground tabular-nums">
                      {rank}
                    </span>
                    <Monogram username={item.username} accent={accent} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          @{item.username}
                        </p>
                        <span className="shrink-0 text-[0.7rem] font-semibold text-muted-foreground tabular-nums">
                          {fmt(item.count)}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "mt-1.5 h-1.5 w-full overflow-hidden rounded-full",
                          palette.barTrack
                        )}
                      >
                        <div
                          className={cn("h-full rounded-full", palette.bar)}
                          style={{ width: `${Math.max(barShare * 100, 6)}%` }}
                        />
                      </div>
                    </div>
                  </a>
                </li>
              )
            })}
          </ol>
        ) : null}
      </div>
    </WrapChartCard>
  )
}
