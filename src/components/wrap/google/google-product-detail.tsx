import { ActivityOverTimeChart } from "@/components/wrap/charts/activity-over-time-chart"
import { CalendarHeatmap } from "@/components/wrap/charts/calendar-heatmap"
import {
  CircadianPolarChart,
  peakHourLabel,
} from "@/components/wrap/charts/circadian-polar-chart"
import { CountedRankList } from "@/components/wrap/google/counted-rank-list"
import type { GoogleProductId } from "@/components/wrap/google/google-products"
import { YouTubeSection } from "@/components/wrap/google/youtube-section"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { WrapKpi } from "@/components/wrap/wrap-kpi"
import { fmt } from "@/components/wrap/chart-theme"
import type { GoogleInsights } from "@/platform/google-types"
import {
  CalendarDays,
  Footprints,
  Globe,
  Image,
  MapPinned,
  Monitor,
  NotebookPen,
  Search,
  Shield,
} from "lucide-react"
import { useState } from "react"

function padHourly(hourly: number[] | undefined): number[] {
  return Array.from({ length: 24 }, (_, i) => hourly?.[i] ?? 0)
}

type GoogleProductDetailProps = {
  insights: GoogleInsights
  productId: GoogleProductId
}

/** Full analytics for one Google Takeout product. */
export function GoogleProductDetail({
  insights,
  productId,
}: GoogleProductDetailProps) {
  switch (productId) {
    case "youtube":
      return insights.youtube ? (
        <YouTubeSection data={insights.youtube} standalone />
      ) : null
    case "chrome":
      return insights.chrome ? <ChromeSection data={insights.chrome} /> : null
    case "my-activity":
      return insights.myActivity ? (
        <MyActivitySection data={insights.myActivity} />
      ) : null
    case "fit":
      return insights.fit ? <FitSection data={insights.fit} /> : null
    case "keep":
      return insights.keep ? <KeepSection data={insights.keep} /> : null
    case "calendar":
      return insights.calendar ? (
        <CalendarSection data={insights.calendar} />
      ) : null
    case "photos":
      return insights.photos ? <PhotosSection data={insights.photos} /> : null
    case "access-log":
      return insights.accessLog ? (
        <AccessLogSection data={insights.accessLog} />
      ) : null
  }
}

function ChromeSection({
  data,
}: {
  data: NonNullable<GoogleInsights["chrome"]>
}) {
  const hourly = padHourly(data.hourly)
  const peak = peakHourLabel(hourly)
  const hourTotal = hourly.reduce((a, b) => a + b, 0)
  return (
    <section className="flex flex-col gap-5 text-start">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <WrapKpi
          label="Visits"
          value={fmt(data.visitCount)}
          icon={Monitor}
          accent="sky"
        />
        <WrapKpi
          label="Unique URLs"
          value={fmt(data.uniqueUrls)}
          icon={Globe}
          accent="teal"
        />
        <WrapKpi
          label="Domains"
          value={fmt(data.uniqueDomains)}
          icon={Globe}
          accent="violet"
        />
      </div>
      {data.activity?.daily?.length ? (
        <ActivityOverTimeChart
          series={data.activity}
          title="Visits over time"
          exportName="chrome-visits-over-time"
          sentLabel="Visits"
          receivedLabel="—"
        />
      ) : null}
      {(data.heatmap?.length ?? 0) > 0 ? (
        <CalendarHeatmap
          days={data.heatmap}
          title="Browsing activity"
          exportName="chrome-heatmap"
        />
      ) : null}
      {hourly.some((n) => n > 0) ? (
        <WrapChartCard
          title="When you browse"
          description={`Peak ${peak} · ${fmt(hourTotal)} visits (UTC)`}
          exportName="chrome-hours"
          exportSize="compact"
          chartClassName="h-80 sm:h-[22rem]"
        >
          <CircadianPolarChart
            series={[{ name: "Visits", hourly }]}
            showLegend={false}
            className="h-full w-full p-2"
          />
        </WrapChartCard>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <CountedRankList
          title="Top domains"
          icon={Globe}
          items={data.topDomains ?? []}
          emptyLabel="No domains"
        />
        <CountedRankList
          title="Top page titles"
          icon={Monitor}
          items={data.topTitles ?? []}
          emptyLabel="No titles"
        />
      </div>
    </section>
  )
}

function MyActivitySection({
  data,
}: {
  data: NonNullable<GoogleInsights["myActivity"]>
}) {
  const products = (data.products ?? []).filter((p) => (p.eventCount ?? 0) >= 10)
  const [selected, setSelected] = useState(products[0]?.name ?? "")
  const active =
    products.find((p) => p.name === selected) ?? products[0] ?? null
  const hourly = padHourly(active?.hourly)
  const peak = hourly.some((n) => n > 0) ? peakHourLabel(hourly) : null
  const hourTotal = hourly.reduce((a, b) => a + b, 0)

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          My Activity
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {fmt(data.totalEvents)} timed events across Google products. Pick one
          to dig in.
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        {products.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => setSelected(p.name)}
            className={
              p.name === active?.name
                ? "rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                : "rounded-md bg-muted/60 px-2.5 py-1 text-xs font-medium ring-1 ring-foreground/10"
            }
          >
            {p.name} · {fmt(p.eventCount)}
          </button>
        ))}
      </div>
      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No products with 10+ events in this export.
        </p>
      ) : null}
      {active ? (
        <>
          {active.activity?.daily?.length ? (
            <ActivityOverTimeChart
              series={active.activity}
              title={`${active.name} over time`}
              exportName={`myactivity-${active.name}`}
              sentLabel="Events"
              receivedLabel="—"
            />
          ) : null}
          {(active.heatmap?.length ?? 0) > 0 ? (
            <CalendarHeatmap
              days={active.heatmap}
              title={`${active.name} activity`}
              exportName={`myactivity-heat-${active.name}`}
            />
          ) : null}
          {hourly.some((n) => n > 0) ? (
            <WrapChartCard
              title={`When · ${active.name}`}
              description={
                peak
                  ? `Peak ${peak} · ${fmt(hourTotal)} events (UTC)`
                  : undefined
              }
              exportName={`myactivity-hours-${active.name}`}
              exportSize="compact"
              chartClassName="h-80 sm:h-[22rem]"
            >
              <CircadianPolarChart
                series={[{ name: active.name, hourly }]}
                showLegend={false}
                className="h-full w-full p-2"
              />
            </WrapChartCard>
          ) : null}
          <CountedRankList
            title={`Top ${active.name} items`}
            icon={active.name === "Maps" ? MapPinned : Search}
            items={active.topItems ?? []}
            emptyLabel="No ranked items"
          />
        </>
      ) : null}
    </section>
  )
}

function FitSection({ data }: { data: NonNullable<GoogleInsights["fit"]> }) {
  return (
    <section className="flex flex-col gap-5 text-start">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <WrapKpi
          label="Total steps"
          value={fmt(data.totalSteps)}
          icon={Footprints}
          accent="emerald"
        />
        <WrapKpi
          label="Active minutes"
          value={fmt(data.totalActiveMinutes)}
          icon={Footprints}
          accent="teal"
        />
        <WrapKpi
          label="Activities"
          value={fmt(data.activityFileCount)}
          icon={Footprints}
          accent="amber"
        />
      </div>
      {data.stepsActivity?.daily?.length ? (
        <ActivityOverTimeChart
          series={data.stepsActivity}
          title="Steps over time"
          exportName="fit-steps-over-time"
          sentLabel="Steps"
          receivedLabel="—"
        />
      ) : null}
      {(data.stepsHeatmap?.length ?? 0) > 0 ? (
        <CalendarHeatmap
          days={data.stepsHeatmap}
          title="Step activity"
          exportName="fit-heatmap"
        />
      ) : null}
      <CountedRankList
        title="Activity types"
        icon={Footprints}
        items={data.activityTypes ?? []}
        emptyLabel="No recorded workouts"
      />
    </section>
  )
}

function KeepSection({ data }: { data: NonNullable<GoogleInsights["keep"]> }) {
  return (
    <section className="flex flex-col gap-5 text-start">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <WrapKpi
          label="Notes"
          value={fmt(data.noteCount)}
          icon={NotebookPen}
          accent="amber"
        />
        <WrapKpi
          label="Pinned"
          value={fmt(data.pinnedCount)}
          icon={NotebookPen}
          accent="sky"
        />
        <WrapKpi
          label="Archived"
          value={fmt(data.archivedCount)}
          icon={NotebookPen}
          accent="violet"
        />
      </div>
      {(data.heatmap?.length ?? 0) > 0 ? (
        <CalendarHeatmap
          days={data.heatmap}
          title="Note edits"
          exportName="keep-heatmap"
        />
      ) : null}
    </section>
  )
}

function CalendarSection({
  data,
}: {
  data: NonNullable<GoogleInsights["calendar"]>
}) {
  return (
    <section className="flex flex-col gap-5 text-start">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <WrapKpi
          label="Events"
          value={fmt(data.eventCount)}
          icon={CalendarDays}
          accent="sky"
        />
        <WrapKpi
          label="All-day"
          value={fmt(data.allDayCount)}
          icon={CalendarDays}
          accent="teal"
        />
        <WrapKpi
          label="Timed"
          value={fmt(data.timedCount)}
          icon={CalendarDays}
          accent="amber"
        />
      </div>
      {(data.heatmap?.length ?? 0) > 0 ? (
        <CalendarHeatmap
          days={data.heatmap}
          title="Event days"
          exportName="calendar-heatmap"
        />
      ) : null}
      <CountedRankList
        title="Frequent events"
        icon={CalendarDays}
        items={data.topSummaries ?? []}
        emptyLabel="No event titles"
      />
    </section>
  )
}

function PhotosSection({
  data,
}: {
  data: NonNullable<GoogleInsights["photos"]>
}) {
  return (
    <section className="flex flex-col gap-5 text-start">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <WrapKpi
          label="Photos"
          value={fmt(data.photoCount)}
          icon={Image}
          accent="violet"
        />
        <WrapKpi
          label="With location"
          value={fmt(data.withGeoCount)}
          icon={MapPinned}
          accent="emerald"
        />
      </div>
      {(data.heatmap?.length ?? 0) > 0 ? (
        <CalendarHeatmap
          days={data.heatmap}
          title="Photos taken"
          exportName="photos-heatmap"
        />
      ) : null}
      <CountedRankList
        title="Albums"
        icon={Image}
        items={data.byAlbum ?? []}
        emptyLabel="No albums"
      />
    </section>
  )
}

function AccessLogSection({
  data,
}: {
  data: NonNullable<GoogleInsights["accessLog"]>
}) {
  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Access log
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Device and product access activity.
        </p>
      </header>
      <WrapKpi
        label="Entries"
        value={fmt(data.entryCount)}
        icon={Shield}
        accent="sky"
      />
      {(data.heatmap?.length ?? 0) > 0 ? (
        <CalendarHeatmap
          days={data.heatmap}
          title="Access activity"
          exportName="access-heatmap"
        />
      ) : null}
      <CountedRankList
        title="Products"
        icon={Shield}
        items={data.topProducts ?? []}
        emptyLabel="No products"
      />
    </section>
  )
}
