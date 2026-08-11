import { fmt } from "@/components/wrap/chart-theme"
import { OverviewKpiPanel } from "@/components/wrap/overview-kpi-panel"
import { StoryExportHost } from "@/components/wrap/story-export-host"
import type {
  LinkedInCounted,
  LinkedInInsights,
} from "@/platform/linkedin-types"
import { listScrollMaxClass } from "@/lib/scroll"
import { cn } from "@/lib/utils"
import { Building2, Network, UserMinus, UserPlus, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

type LinkedInNetworkInsightsProps = {
  data: LinkedInInsights
}

/** Network KPIs: connections, invites, follows, top companies. */
export function LinkedInNetworkInsights({
  data,
}: LinkedInNetworkInsightsProps) {
  const hasNetwork =
    data.connectionCount > 0 ||
    data.invitationOutgoing > 0 ||
    data.invitationIncoming > 0 ||
    data.activeFollows > 0 ||
    data.unfollows > 0 ||
    data.companyFollows > 0

  const headline = data.profile.headline?.trim()
  const geo = data.profile.geoLocation?.trim()
  const industry = data.profile.industry?.trim()

  if (!hasNetwork && !headline) {
    return (
      <section className="flex flex-col gap-3 text-start">
        <header>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            LinkedIn network
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This ZIP didn’t include Connections or follow history. Re-download
            the complete archive from Data privacy settings.
          </p>
        </header>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          LinkedIn network
        </h2>
        {headline || geo || industry ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {[headline, industry, geo].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </header>

      <StoryExportHost exportName="li-network-kpis" storyCaptureWidth={560}>
        <OverviewKpiPanel
          sections={[
            {
              title: "Your network",
              stats: [
                {
                  label: "Connections",
                  value: hasNetwork ? fmt(data.connectionCount) : "—",
                  icon: Users,
                  accent: "text-sky-600 dark:text-sky-400",
                },
                {
                  label: "Invites sent",
                  value: hasNetwork ? fmt(data.invitationOutgoing) : "—",
                  icon: UserPlus,
                  accent: "text-teal-600 dark:text-teal-400",
                },
                {
                  label: "Invites received",
                  value: hasNetwork ? fmt(data.invitationIncoming) : "—",
                  icon: Network,
                  accent: "text-amber-600 dark:text-amber-400",
                },
                {
                  label: "Active follows",
                  value: hasNetwork ? fmt(data.activeFollows) : "—",
                  icon: UserPlus,
                  accent: "text-emerald-600 dark:text-emerald-400",
                },
                {
                  label: "Unfollows",
                  value: hasNetwork ? fmt(data.unfollows) : "—",
                  icon: UserMinus,
                  accent: "text-violet-600 dark:text-violet-400",
                },
                {
                  label: "Company follows",
                  value: hasNetwork ? fmt(data.companyFollows) : "—",
                  icon: Building2,
                  accent: "text-sky-600 dark:text-sky-400",
                },
              ],
            },
          ]}
        />
      </StoryExportHost>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data.topConnectionCompanies.length > 0 ? (
          <CountedList
            title="Top companies in your network"
            description="Where your connections work"
            icon={Building2}
            items={data.topConnectionCompanies}
          />
        ) : null}
        {data.connectionsByYear.length > 0 ? (
          <YearGrowth years={data.connectionsByYear} />
        ) : null}
      </div>
    </section>
  )
}

function YearGrowth({
  years,
}: {
  years: LinkedInInsights["connectionsByYear"]
}) {
  const max = Math.max(...years.map((y) => y.count), 1)
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
      <h3 className="text-sm font-medium">Connections by year</h3>
      <p className="text-xs text-muted-foreground">
        When you grew your network
      </p>
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

function CountedList({
  title,
  description,
  icon: Icon,
  items,
}: {
  title: string
  description: string
  icon: LucideIcon
  items: LinkedInCounted[]
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <ul className={cn("mt-1 flex flex-col gap-1.5", listScrollMaxClass)}>
        {items.slice(0, 20).map((item) => (
          <li
            key={item.name}
            className="flex items-baseline justify-between gap-3 pe-2 text-sm"
          >
            <span className="min-w-0 truncate">{item.name}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {fmt(item.count)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
