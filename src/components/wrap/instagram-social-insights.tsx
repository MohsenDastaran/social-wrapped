import { fmt } from "@/components/wrap/chart-theme"
import { StoryExportHost } from "@/components/wrap/story-export-host"
import { WrapKpi } from "@/components/wrap/wrap-kpi"
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
  UserMinus,
  UserPlus,
  UserRoundMinus,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

type InstagramSocialInsightsProps = {
  data: InstagramSocialInsightsData
}

function profileHref(handle: IgHandle): string {
  if (handle.href?.trim()) return handle.href.trim()
  return `https://www.instagram.com/${encodeURIComponent(handle.username)}/`
}

/** Outbound Instagram graph + like favorites (never inbound “who liked you”). */
export function InstagramSocialInsights({
  data,
}: InstagramSocialInsightsProps) {
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

      <StoryExportHost exportName="ig-network-kpis">
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <WrapKpi
            label="Followers"
            value={hasNetwork ? fmt(data.followerCount) : "—"}
            icon={Users}
            accent="teal"
          />
          <WrapKpi
            label="Following"
            value={hasNetwork ? fmt(data.followingCount) : "—"}
            icon={UserPlus}
            accent="sky"
          />
          <WrapKpi
            label="Unfollowed recently"
            value={hasNetwork ? fmt(data.unfollowedRecentlyCount) : "—"}
            icon={UserRoundMinus}
            accent="amber"
          />
        </div>
      </StoryExportHost>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <HandleList
          title="Not following you back"
          description="People you follow who don’t follow you"
          icon={UserMinus}
          handles={data.notFollowingBack}
          emptyLabel="Everyone you follow follows you back — or following/followers weren’t in this ZIP."
        />
        <HandleList
          title="Followers you don’t follow"
          description="People who follow you that you don’t follow"
          icon={UserPlus}
          handles={data.fansYouDontFollow}
          emptyLabel="You follow everyone who follows you — or following/followers weren’t in this ZIP."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data.topLikedAccounts.length > 0 ? (
          <StoryExportHost exportName="ig-top-liked">
            <CountedList
              title="Who you like most"
              description="Top 10 accounts behind posts and reels you’ve liked"
              icon={Heart}
              items={data.topLikedAccounts}
              emptyLabel="No liked posts in this ZIP."
              embedded
            />
          </StoryExportHost>
        ) : (
          <CountedList
            title="Who you like most"
            description="Top 10 accounts behind posts and reels you’ve liked"
            icon={Heart}
            items={data.topLikedAccounts}
            emptyLabel="No liked posts in this ZIP."
          />
        )}
        {data.topStoryLikedAccounts.length > 0 ? (
          <StoryExportHost exportName="ig-story-hearts">
            <CountedList
              title="Stories you’ve liked most"
              description="Top 10 accounts whose stories you’ve hearted"
              icon={Users}
              items={data.topStoryLikedAccounts}
              emptyLabel="No story likes in this ZIP."
              embedded
            />
          </StoryExportHost>
        ) : (
          <CountedList
            title="Stories you’ve liked most"
            description="Top 10 accounts whose stories you’ve hearted"
            icon={Users}
            items={data.topStoryLikedAccounts}
            emptyLabel="No story likes in this ZIP."
          />
        )}
      </div>
    </section>
  )
}

function ListPanel({
  title,
  description,
  icon: Icon,
  count,
  children,
  empty,
  emptyLabel,
  /** Drop outer ring when already inside StoryExportHost card chrome. */
  embedded = false,
}: {
  title: string
  description: string
  icon: LucideIcon
  count: number
  children: ReactNode
  empty: boolean
  emptyLabel: string
  embedded?: boolean
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden",
        embedded
          ? "rounded-xl"
          : "rounded-xl ring-1 ring-foreground/10"
      )}
    >
      <div className="flex shrink-0 items-start gap-2 border-b border-border/60 bg-muted/25 px-3 py-2.5">
        <Icon
          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold tracking-tight">{title}</p>
            {!empty ? (
              <span className="shrink-0 text-[0.65rem] font-medium text-muted-foreground tabular-nums">
                {fmt(count)}
              </span>
            ) : null}
          </div>
          <p className="text-[0.65rem] text-muted-foreground">{description}</p>
        </div>
      </div>
      {empty ? (
        <p className="px-3 py-6 text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className={listScrollMaxClass}>{children}</div>
      )}
    </div>
  )
}

function HandleList({
  title,
  description,
  icon,
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
    <ListPanel
      title={title}
      description={description}
      icon={icon}
      count={handles.length}
      empty={handles.length === 0}
      emptyLabel={emptyLabel}
    >
      <ul className="divide-y divide-border/50">
        {handles.map((handle, index) => (
          <li key={`${handle.username}-${index}`}>
            <a
              href={profileHref(handle)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-2 px-3 py-2 text-start transition-colors hover:bg-muted/50"
            >
              <span className="w-5 shrink-0 text-center text-[0.65rem] font-semibold text-muted-foreground tabular-nums">
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
    </ListPanel>
  )
}

function CountedList({
  title,
  description,
  icon,
  items,
  emptyLabel,
  /** Cap for UI + story capture — long lists freeze DOM export. */
  limit = 10,
  embedded = false,
}: {
  title: string
  description: string
  icon: LucideIcon
  items: IgCountedHandle[]
  emptyLabel: string
  limit?: number
  embedded?: boolean
}) {
  const visible = items.slice(0, limit)
  const max = Math.max(...visible.map((i) => i.count), 1)

  return (
    <ListPanel
      title={title}
      description={description}
      icon={icon}
      count={visible.length}
      empty={items.length === 0}
      emptyLabel={emptyLabel}
      embedded={embedded}
    >
      <ul className="divide-y divide-border/50">
        {visible.map((item, index) => {
          const pct = (item.count / max) * 100
          return (
            <li key={`${item.username}-${index}`} className="px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="w-5 shrink-0 text-center text-[0.65rem] font-semibold text-muted-foreground tabular-nums">
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
              <div className="ms-7 mt-1 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-teal-600 dark:bg-teal-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </ListPanel>
  )
}
