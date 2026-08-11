import { fmt } from "@/components/wrap/chart-theme"
import { OverviewKpiPanel } from "@/components/wrap/overview-kpi-panel"
import { StoryExportHost } from "@/components/wrap/story-export-host"
import type { WhatsAppInsights } from "@/platform/whatsapp-types"
import {
  Ban,
  CalendarDays,
  MonitorSmartphone,
  Users,
  UsersRound,
} from "lucide-react"

type WhatsAppAccountInsightsProps = {
  data: WhatsAppInsights
}

function formatJoined(ts?: number | null): string | null {
  if (ts == null || ts <= 0) return null
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(new Date(ts * 1000))
  } catch {
    return null
  }
}

/** Profile header + overview KPIs for WhatsApp Account Information reports. */
export function WhatsAppAccountInsights({ data }: WhatsAppAccountInsightsProps) {
  const username = data.profile.username?.trim()
  const phone = data.profile.phone?.trim()
  const about = data.profile.about?.trim()
  const joined = formatJoined(data.profile.registrationTimestamp)
  const headline = [username ? `@${username}` : null, phone]
    .filter(Boolean)
    .join(" · ")

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          WhatsApp account
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {[headline || "WhatsApp account", joined ? `Joined ${joined}` : null]
            .filter(Boolean)
            .join(" · ")}
          {about ? ` · ${about.slice(0, 100)}${about.length > 100 ? "…" : ""}` : ""}
        </p>
      </header>

      <StoryExportHost exportName="wa-overview-kpis" storyCaptureWidth={560}>
        <OverviewKpiPanel
          sections={[
            {
              title: "Your account",
              stats: [
                {
                  label: "Contacts",
                  value: fmt(data.contactCount),
                  icon: Users,
                  accent: "text-emerald-600 dark:text-emerald-400",
                },
                {
                  label: "Groups",
                  value: fmt(data.groupCount),
                  icon: UsersRound,
                  accent: "text-teal-600 dark:text-teal-400",
                },
                {
                  label: "Blocked",
                  value: fmt(data.blockedCount),
                  icon: Ban,
                  accent: "text-amber-600 dark:text-amber-400",
                },
                {
                  label: "Devices",
                  value: fmt(data.deviceCount),
                  icon: MonitorSmartphone,
                  accent: "text-sky-600 dark:text-sky-400",
                },
                ...(data.sessionDays7d != null
                  ? [
                      {
                        label: "Active days (7d)",
                        value: fmt(data.sessionDays7d),
                        icon: CalendarDays,
                        accent: "text-emerald-600 dark:text-emerald-400",
                      },
                    ]
                  : []),
                ...(data.sessionDays30d != null
                  ? [
                      {
                        label: "Active days (30d)",
                        value: fmt(data.sessionDays30d),
                        icon: CalendarDays,
                        accent: "text-teal-600 dark:text-teal-400",
                      },
                    ]
                  : []),
              ],
            },
          ]}
        />
      </StoryExportHost>
    </section>
  )
}
