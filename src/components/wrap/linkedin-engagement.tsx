import { CalendarHeatmap } from "@/components/wrap/charts/calendar-heatmap"
import {
  CircadianPolarChart,
  peakHourLabel,
} from "@/components/wrap/charts/circadian-polar-chart"
import { fmt } from "@/components/wrap/chart-theme"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { WrapKpi } from "@/components/wrap/wrap-kpi"
import type { LinkedInInsights } from "@/platform/linkedin-types"
import { cn } from "@/lib/utils"
import {
  Bookmark,
  Heart,
  MessageSquareText,
  Repeat2,
  Share2,
  Vote,
} from "lucide-react"

type LinkedInEngagementProps = {
  data: LinkedInInsights
}

function padHourly(raw?: number[] | null): number[] {
  return Array.from({ length: 24 }, (_, i) => Number(raw?.[i] ?? 0) || 0)
}

/** Reactions, comments, shares, and reaction timing. */
export function LinkedInEngagement({ data }: LinkedInEngagementProps) {
  const reactions = data.reactionsCount ?? 0
  const comments = data.commentsCount ?? 0
  const shares = data.sharesCount ?? 0
  const saved = data.savedCount ?? 0
  const votes = data.votesCount ?? 0
  const reposts = data.repostsCount ?? 0
  const heatmap = data.reactionHeatmap ?? []
  const hourly = padHourly(data.reactionHourly)
  const hasMix =
    reactions > 0 ||
    comments > 0 ||
    shares > 0 ||
    saved > 0 ||
    votes > 0 ||
    reposts > 0
  const hasHourly = hourly.some((n) => n > 0)
  const types = data.reactionCountsByType ?? []

  if (!hasMix && heatmap.length === 0 && !hasHourly) {
    return (
      <section className="flex flex-col gap-3 text-start">
        <header>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Engagement
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This ZIP didn’t include reactions, comments, or shares.
          </p>
        </header>
      </section>
    )
  }

  const peak = hasHourly ? peakHourLabel(hourly) : null
  const reactionTotal = hourly.reduce((a, b) => a + b, 0)

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Engagement
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your outbound reactions, comments, and shares from this archive.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <WrapKpi
          label="Reactions"
          value={hasMix ? fmt(reactions) : "—"}
          icon={Heart}
          accent="sky"
        />
        <WrapKpi
          label="Comments"
          value={hasMix ? fmt(comments) : "—"}
          icon={MessageSquareText}
          accent="teal"
        />
        <WrapKpi
          label="Shares"
          value={hasMix ? fmt(shares) : "—"}
          icon={Share2}
          accent="amber"
        />
        <WrapKpi
          label="Saved"
          value={hasMix ? fmt(saved) : "—"}
          icon={Bookmark}
          accent="emerald"
        />
        <WrapKpi
          label="Votes"
          value={hasMix ? fmt(votes) : "—"}
          icon={Vote}
          accent="violet"
        />
        <WrapKpi
          label="Reposts"
          value={hasMix ? fmt(reposts) : "—"}
          icon={Repeat2}
          accent="sky"
        />
      </div>

      {types.length > 0 ? (
        <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border/60">
          <h3 className="text-sm font-medium">Reaction mix</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {types.map((t) => (
              <li
                key={t.name}
                className={cn(
                  "rounded-md bg-background px-2.5 py-1 text-xs ring-1 ring-border/70"
                )}
              >
                <span className="font-medium">{t.name}</span>
                <span className="ms-1.5 tabular-nums text-muted-foreground">
                  {fmt(t.count)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {heatmap.length > 0 ? (
        <CalendarHeatmap
          days={heatmap}
          title="Reaction activity"
          description="Days you reacted on LinkedIn"
          exportName="li-reaction-heatmap"
        />
      ) : null}

      {hasHourly ? (
        <WrapChartCard
          title="When you react"
          description={`Peak ${peak} · ${fmt(reactionTotal)} reactions (UTC)`}
          exportName="li-reaction-hours"
          exportSize="compact"
          exportLines={[`Peak ${peak}`, `Total ${fmt(reactionTotal)}`]}
          chartClassName="h-80 sm:h-[22rem]"
        >
          <CircadianPolarChart
            series={[{ name: "Reactions", hourly }]}
            showLegend={false}
            className="h-full w-full p-2"
          />
        </WrapChartCard>
      ) : null}
    </section>
  )
}
