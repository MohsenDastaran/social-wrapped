import { fmt } from "@/components/wrap/chart-theme"
import type {
  IgCountedHandle,
  IgHandle,
  InstagramSocialInsights as InstagramSocialInsightsData,
} from "@/platform/analytics-types"
import { cn } from "@/lib/utils"
import { ExternalLink, Heart, UserMinus, UserPlus, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

type InstagramSocialInsightsProps = {
  data: InstagramSocialInsightsData
}

function profileHref(handle: IgHandle): string {
  if (handle.href?.trim()) return handle.href.trim()
  return `https://www.instagram.com/${encodeURIComponent(handle.username)}/`
}

/** Outbound Instagram graph + like favorites (never inbound “who liked you”). */
export function InstagramSocialInsights({ data }: InstagramSocialInsightsProps) {
  const hasNetwork =
    data.followerCount > 0 ||
    data.followingCount > 0 ||
    data.unfollowedRecentlyCount > 0
  const hasFollowGaps =
    data.notFollowingBack.length > 0 || data.fansYouDontFollow.length > 0
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
            This ZIP didn’t include followers, following, or like history. Re-download
            from Accounts Center with connections and activity selected.
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
        <p className="mt-1 text-sm text-muted-foreground">
          Outbound follows and likes from your download — Meta doesn’t export who
          liked your posts or viewed your stories.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Kpi
          label="Followers"
          value={data.followerCount}
          empty={!hasNetwork}
        />
        <Kpi
          label="Following"
          value={data.followingCount}
          empty={!hasNetwork}
        />
        <Kpi
          label="Unfollowed recently"
          value={data.unfollowedRecentlyCount}
          empty={!hasNetwork}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <HandleList
          title="Didn’t follow back"
          description="You follow them; they don’t follow you"
          icon={UserMinus}
          handles={data.notFollowingBack}
          emptyLabel="No follow gaps, or following/followers weren’t in this ZIP."
        />
        <HandleList
          title="Fans you don’t follow"
          description="They follow you; you don’t follow them"
          icon={UserPlus}
          handles={data.fansYouDontFollow}
          emptyLabel="No one-way fans, or following/followers weren’t in this ZIP."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CountedList
          title="Accounts you like most"
          description="Posts and reels you liked"
          icon={Heart}
          items={data.topLikedAccounts}
          emptyLabel="No liked posts in this ZIP."
        />
        <CountedList
          title="Stories you heart most"
          description="Stories you liked"
          icon={Users}
          items={data.topStoryLikedAccounts}
          emptyLabel="No story likes in this ZIP."
        />
      </div>
    </section>
  )
}

function Kpi({
  label,
  value,
  empty,
}: {
  label: string
  value: number
  empty: boolean
}) {
  return (
    <div className="text-start">
      <p className="text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-heading text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl",
          empty && "text-muted-foreground"
        )}
      >
        {empty ? "—" : fmt(value)}
      </p>
    </div>
  )
}

function HandleList({
  title,
  description,
  icon: Icon,
  handles,
  emptyLabel,
}: {
  title: string
  description: string
  icon: LucideIcon
  handles: IgHandle[]
  emptyLabel: string
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-start gap-2">
        <Icon
          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">{title}</p>
          <p className="text-[0.65rem] text-muted-foreground">{description}</p>
        </div>
      </div>
      {handles.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-border/50 border-y border-border/50">
          {handles.map((handle, index) => (
            <li key={`${handle.username}-${index}`}>
              <a
                href={profileHref(handle)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-2 py-2 text-start transition-colors hover:bg-muted/40"
              >
                <span className="w-4 shrink-0 text-center text-[0.65rem] font-semibold text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium">
                  @{handle.username}
                </span>
                <ExternalLink
                  className="size-3 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CountedList({
  title,
  description,
  icon: Icon,
  items,
  emptyLabel,
}: {
  title: string
  description: string
  icon: LucideIcon
  items: IgCountedHandle[]
  emptyLabel: string
}) {
  const max = Math.max(...items.map((i) => i.count), 1)

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-start gap-2">
        <Icon
          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">{title}</p>
          <p className="text-[0.65rem] text-muted-foreground">{description}</p>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-border/50 border-y border-border/50">
          {items.map((item, index) => {
            const pct = (item.count / max) * 100
            return (
              <li key={`${item.username}-${index}`} className="py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="w-4 shrink-0 text-center text-[0.65rem] font-semibold text-muted-foreground tabular-nums">
                      {index + 1}
                    </span>
                    <a
                      href={`https://www.instagram.com/${encodeURIComponent(item.username)}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-xs font-medium hover:underline"
                    >
                      @{item.username}
                    </a>
                  </div>
                  <span className="shrink-0 text-[0.65rem] text-muted-foreground tabular-nums">
                    {fmt(item.count)}
                  </span>
                </div>
                <div className="mt-1 ms-6 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-teal-600 dark:bg-teal-400"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
