import { fmt } from "@/components/wrap/chart-theme"
import { StoryExportHost } from "@/components/wrap/story-export-host"
import type { XInsights } from "@/platform/x-types"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
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

type OverviewStat = {
  label: string
  value: string
  icon: LucideIcon
  accent: string
}

type OverviewSection = {
  title: string
  stats: OverviewStat[]
}

function OverviewStatCell({ label, value, icon: Icon, accent }: OverviewStat) {
  return (
    <div className="min-w-0 rounded-xl bg-muted/35 px-3 py-2.5 ring-1 ring-foreground/5">
      <div className="flex items-center gap-1.5">
        <Icon aria-hidden className={cn("size-3.5 shrink-0", accent)} />
        <p className="min-w-0 truncate text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </p>
      </div>
      <p className="mt-1 font-heading text-xl font-semibold tracking-tight text-foreground tabular-nums leading-none sm:text-2xl">
        {value}
      </p>
    </div>
  )
}

/** Followers, tweets, likes/DMs — one capture host for the first X story. */
export function XNetworkInsights({ data }: XNetworkInsightsProps) {
  const username = data.profile.username
    ? `@${data.profile.username}`
    : data.profile.displayName || "X account"
  const bio = data.profile.bio?.trim()

  const sections: OverviewSection[] = [
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
  ]

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
        <div className="flex flex-col gap-3.5">
          {sections.map((section, index) => (
            <div
              key={section.title}
              className={cn(
                "flex flex-col gap-2",
                index > 0 && "border-t border-border/70 pt-3.5"
              )}
            >
              <h3 className="text-[0.7rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {section.title}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {section.stats.map((stat) => (
                  <OverviewStatCell key={stat.label} {...stat} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </StoryExportHost>
    </section>
  )
}
