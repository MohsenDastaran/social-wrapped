import { fmt } from "@/components/wrap/chart-theme"
import { StoryExportHost } from "@/components/wrap/story-export-host"
import { WrapKpi } from "@/components/wrap/wrap-kpi"
import type { LinkedInInsights } from "@/platform/linkedin-types"
import { cn } from "@/lib/utils"
import {
  Award,
  Briefcase,
  GraduationCap,
  Search,
  Sparkles,
} from "lucide-react"

type LinkedInCareerInsightsProps = {
  data: LinkedInInsights
}

const LIST_SCROLL_CLASS = cn(
  "max-h-72 overflow-y-auto overscroll-contain",
  "[&::-webkit-scrollbar]:w-1.5",
  "[&::-webkit-scrollbar-track]:bg-transparent",
  "[&::-webkit-scrollbar-thumb]:rounded-full",
  "[&::-webkit-scrollbar-thumb]:bg-primary/50",
  "hover:[&::-webkit-scrollbar-thumb]:bg-primary",
  "[scrollbar-width:thin]",
  "[scrollbar-color:var(--primary)_transparent]"
)

/** Positions, skills, endorsements, recommendations, job apps, searches. */
export function LinkedInCareerInsights({ data }: LinkedInCareerInsightsProps) {
  const hasCareer =
    data.positions.length > 0 ||
    data.skills.length > 0 ||
    data.endorsementGivenCount > 0 ||
    data.endorsementReceivedCount > 0 ||
    data.recommendationsGivenCount > 0 ||
    data.recommendationsReceivedCount > 0 ||
    data.jobApplicationCount > 0 ||
    data.topSearchQueries.length > 0

  if (!hasCareer) {
    return null
  }

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Career
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Profile positions, skills, endorsements, and job search activity.
        </p>
      </header>

      <StoryExportHost exportName="li-career-kpis">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <WrapKpi
            label="Job apps"
            value={fmt(data.jobApplicationCount)}
            icon={Briefcase}
            accent="sky"
          />
          <WrapKpi
            label="Endorsements in"
            value={fmt(data.endorsementReceivedCount)}
            icon={Award}
            accent="amber"
          />
          <WrapKpi
            label="Endorsements out"
            value={fmt(data.endorsementGivenCount)}
            icon={Sparkles}
            accent="teal"
          />
          <WrapKpi
            label="Recommendations"
            value={fmt(
              data.recommendationsGivenCount +
                data.recommendationsReceivedCount
            )}
            icon={GraduationCap}
            accent="emerald"
          />
        </div>
      </StoryExportHost>

      {data.positions.length > 0 ? (
        <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
          <h3 className="text-sm font-medium">Positions</h3>
          <ul className={cn("mt-3 flex flex-col gap-3", LIST_SCROLL_CLASS)}>
            {data.positions.map((p, i) => (
              <li key={`${p.company}-${p.title}-${i}`} className="text-sm">
                <p className="font-medium">
                  {p.title || "Role"}
                  {p.company ? (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      at {p.company}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[
                    p.location,
                    [p.startedOn, p.finishedOn || "Present"]
                      .filter(Boolean)
                      .join(" – "),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.skills.length > 0 ? (
        <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
          <h3 className="text-sm font-medium">Skills</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {data.skills.map((skill) => (
              <li
                key={skill}
                className="rounded-md bg-background px-2.5 py-1 text-xs ring-1 ring-border/70"
              >
                {skill}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data.recentJobApplications.length > 0 ? (
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
            <h3 className="text-sm font-medium">Recent job applications</h3>
            <ul className={cn("mt-3 flex flex-col gap-2", LIST_SCROLL_CLASS)}>
              {data.recentJobApplications.map((job, i) => (
                <li
                  key={`${job.company}-${job.title}-${i}`}
                  className="text-sm"
                >
                  <p className="font-medium truncate">
                    {job.title || "Role"}
                    {job.company ? (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {job.company}
                      </span>
                    ) : null}
                  </p>
                  {job.appliedOn ? (
                    <p className="text-xs text-muted-foreground">
                      {job.appliedOn}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {data.topSearchQueries.length > 0 ? (
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
            <div className="flex items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Top searches</h3>
            </div>
            <ul className={cn("mt-3 flex flex-col gap-1.5", LIST_SCROLL_CLASS)}>
              {data.topSearchQueries.slice(0, 15).map((q) => (
                <li
                  key={q.name}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate capitalize">{q.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {fmt(q.count)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}
