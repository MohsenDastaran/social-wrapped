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
  Bookmark,
  BookOpen,
  Ban,
  CalendarDays,
  File,
  Folder,
  Footprints,
  FormInput,
  Globe,
  HardDrive,
  HeartPulse,
  Image,
  Mail,
  MapPinned,
  Monitor,
  NotebookPen,
  Puzzle,
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
    case "gmail":
      return insights.gmail ? <GmailSection data={insights.gmail} /> : null
    case "drive":
      return insights.drive ? <DriveSection data={insights.drive} /> : null
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
  const hasExtras =
    (data.bookmarkCount ?? 0) > 0 ||
    (data.extensionCount ?? 0) > 0 ||
    (data.readingListCount ?? 0) > 0 ||
    (data.savedAddressCount ?? 0) > 0

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
      {hasExtras ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <WrapKpi
            label="Bookmarks"
            value={fmt(data.bookmarkCount ?? 0)}
            icon={Bookmark}
            accent="amber"
          />
          <WrapKpi
            label="Extensions"
            value={fmt(data.extensionCount ?? 0)}
            icon={Puzzle}
            accent="violet"
          />
          <WrapKpi
            label="Reading list"
            value={fmt(data.readingListCount ?? 0)}
            icon={BookOpen}
            accent="sky"
          />
          <WrapKpi
            label="Autofill rows"
            value={fmt(data.savedAddressCount ?? 0)}
            icon={FormInput}
            accent="teal"
          />
        </div>
      ) : null}
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CountedRankList
          title="Top domains"
          description="Sites you visited most"
          icon={Globe}
          items={data.topDomains ?? []}
          emptyLabel="No domains in this export."
          accent="teal"
        />
        <CountedRankList
          title="Top page titles"
          description="Pages you opened most"
          icon={Monitor}
          items={data.topTitles ?? []}
          emptyLabel="No page titles in this export."
          accent="sky"
        />
      </div>
      {(data.topBookmarkFolders?.length ?? 0) > 0 ||
      (data.topExtensions?.length ?? 0) > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CountedRankList
            title="Bookmark folders"
            description="Where your saved links live"
            icon={Bookmark}
            items={data.topBookmarkFolders ?? []}
            emptyLabel="No bookmark folders in this export."
            accent="amber"
          />
          <CountedRankList
            title="Extensions"
            description="Chrome extensions in this export"
            icon={Puzzle}
            items={data.topExtensions ?? []}
            emptyLabel="No extensions in this export."
            accent="violet"
          />
        </div>
      ) : null}
    </section>
  )
}

function MyActivitySection({
  data,
}: {
  data: NonNullable<GoogleInsights["myActivity"]>
}) {
  const products = (data.products ?? []).filter((p) => (p.eventCount ?? 0) >= 1)
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
          No products with activity in this export.
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
            description={`Most frequent ${active.name.toLowerCase()} activity`}
            icon={active.name === "Maps" ? MapPinned : Search}
            items={active.topItems ?? []}
            emptyLabel="No ranked items in this export."
            accent="sky"
          />
        </>
      ) : null}
    </section>
  )
}

function FitSection({ data }: { data: NonNullable<GoogleInsights["fit"]> }) {
  const distanceKm = (data.totalDistanceM ?? 0) / 1000
  const hasExtras =
    (data.totalDistanceM ?? 0) > 0 ||
    (data.totalCalories ?? 0) > 0 ||
    (data.totalHeartMinutes ?? 0) > 0

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
      {hasExtras ? (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {(data.totalDistanceM ?? 0) > 0 ? (
            <WrapKpi
              label="Distance"
              value={`${distanceKm >= 100 ? fmt(Math.round(distanceKm)) : distanceKm.toFixed(1)} km`}
              icon={MapPinned}
              accent="sky"
            />
          ) : null}
          {(data.totalCalories ?? 0) > 0 ? (
            <WrapKpi
              label="Calories"
              value={fmt(data.totalCalories)}
              icon={HeartPulse}
              accent="amber"
            />
          ) : null}
          {(data.totalHeartMinutes ?? 0) > 0 ? (
            <WrapKpi
              label="Heart points"
              value={fmt(data.totalHeartMinutes)}
              icon={HeartPulse}
              accent="violet"
            />
          ) : null}
        </div>
      ) : null}
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
        description="Workouts and activities you logged most"
        icon={Footprints}
        items={data.activityTypes ?? []}
        emptyLabel="No recorded workouts in this export."
        accent="emerald"
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
      {data.activity?.daily?.length || data.activity?.monthly?.length ? (
        <ActivityOverTimeChart
          series={data.activity}
          title="Note edits over time"
          exportName="keep-over-time"
          sentLabel="Edits"
          receivedLabel="—"
        />
      ) : null}
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
      {data.activity?.daily?.length || data.activity?.monthly?.length ? (
        <ActivityOverTimeChart
          series={data.activity}
          title="Events over time"
          exportName="calendar-over-time"
          sentLabel="Events"
          receivedLabel="—"
        />
      ) : null}
      {(data.heatmap?.length ?? 0) > 0 ? (
        <CalendarHeatmap
          days={data.heatmap}
          title="Event days"
          exportName="calendar-heatmap"
        />
      ) : null}
      <CountedRankList
        title="Frequent events"
        description="Event titles that repeat most"
        icon={CalendarDays}
        items={data.topSummaries ?? []}
        emptyLabel="No event titles in this export."
        accent="sky"
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
      {data.activity?.daily?.length || data.activity?.monthly?.length ? (
        <ActivityOverTimeChart
          series={data.activity}
          title="Photos over time"
          exportName="photos-over-time"
          sentLabel="Photos"
          receivedLabel="—"
        />
      ) : null}
      {(data.heatmap?.length ?? 0) > 0 ? (
        <CalendarHeatmap
          days={data.heatmap}
          title="Photos taken"
          exportName="photos-heatmap"
        />
      ) : null}
      <CountedRankList
        title="Albums"
        description="Where most of your photos live"
        icon={Image}
        items={data.byAlbum ?? []}
        emptyLabel="No albums in this export."
        accent="violet"
      />
    </section>
  )
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(1)} GB`
}

function GmailSection({
  data,
}: {
  data: NonNullable<GoogleInsights["gmail"]>
}) {
  const hourly = padHourly(data.hourly)
  const peak = peakHourLabel(hourly)
  const hourTotal = hourly.reduce((a, b) => a + b, 0)

  return (
    <section className="flex flex-col gap-5 text-start">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <WrapKpi
          label="Messages"
          value={fmt(data.messageCount)}
          icon={Mail}
          accent="sky"
        />
        <WrapKpi
          label="Sent"
          value={fmt(data.sentCount)}
          icon={Mail}
          accent="teal"
        />
        <WrapKpi
          label="Spam"
          value={fmt(data.spamCount)}
          icon={Ban}
          accent="amber"
        />
        <WrapKpi
          label="Blocked"
          value={fmt(data.blockedAddressCount)}
          icon={Ban}
          accent="violet"
        />
      </div>
      {data.activity?.daily?.length || data.activity?.monthly?.length ? (
        <ActivityOverTimeChart
          series={data.activity}
          title="Mail over time"
          exportName="gmail-over-time"
          sentLabel="Messages"
          receivedLabel="—"
        />
      ) : null}
      {(data.heatmap?.length ?? 0) > 0 ? (
        <CalendarHeatmap
          days={data.heatmap}
          title="Mail activity"
          exportName="gmail-heatmap"
        />
      ) : null}
      {hourly.some((n) => n > 0) ? (
        <WrapChartCard
          title="When you mail"
          description={`Peak ${peak} · ${fmt(hourTotal)} messages (UTC)`}
          exportName="gmail-hours"
          exportSize="compact"
          chartClassName="h-80 sm:h-[22rem]"
        >
          <CircadianPolarChart
            series={[{ name: "Messages", hourly }]}
            showLegend={false}
            className="h-full w-full p-2"
          />
        </WrapChartCard>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CountedRankList
          title="Top labels"
          description="Gmail labels on the most messages"
          icon={Mail}
          items={data.topLabels ?? []}
          emptyLabel="No labels in this export."
          accent="sky"
        />
        <CountedRankList
          title="Top senders"
          description="Addresses that appear most in From"
          icon={Mail}
          items={data.topSenders ?? []}
          emptyLabel="No senders in this export."
          accent="teal"
        />
      </div>
    </section>
  )
}

function DriveSection({
  data,
}: {
  data: NonNullable<GoogleInsights["drive"]>
}) {
  return (
    <section className="flex flex-col gap-5 text-start">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <WrapKpi
          label="Files"
          value={fmt(data.fileCount)}
          icon={HardDrive}
          accent="emerald"
        />
        <WrapKpi
          label="Library size"
          value={fmtBytes(data.totalBytes)}
          icon={HardDrive}
          accent="sky"
        />
      </div>
      {data.activity?.daily?.length || data.activity?.monthly?.length ? (
        <ActivityOverTimeChart
          series={data.activity}
          title="Files over time"
          exportName="drive-over-time"
          sentLabel="Files"
          receivedLabel="—"
        />
      ) : null}
      {(data.heatmap?.length ?? 0) > 0 ? (
        <CalendarHeatmap
          days={data.heatmap}
          title="File activity"
          exportName="drive-heatmap"
        />
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CountedRankList
          title="Extensions"
          description="File types in your Drive library"
          icon={File}
          items={data.topExtensions ?? []}
          emptyLabel="No file types in this export."
          accent="emerald"
        />
        <CountedRankList
          title="Folders"
          description="Top-level folders by file count"
          icon={Folder}
          items={data.topFolders ?? []}
          emptyLabel="No folders in this export."
          accent="sky"
        />
      </div>
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
      {data.activity?.daily?.length || data.activity?.monthly?.length ? (
        <ActivityOverTimeChart
          series={data.activity}
          title="Access over time"
          exportName="access-over-time"
          sentLabel="Entries"
          receivedLabel="—"
        />
      ) : null}
      {(data.heatmap?.length ?? 0) > 0 ? (
        <CalendarHeatmap
          days={data.heatmap}
          title="Access activity"
          exportName="access-heatmap"
        />
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CountedRankList
          title="Products"
          description="Google products you accessed most"
          icon={Shield}
          items={data.topProducts ?? []}
          emptyLabel="No products in this export."
          accent="sky"
        />
        <CountedRankList
          title="Cities"
          description="Places where access was logged"
          icon={MapPinned}
          items={data.topCities ?? []}
          emptyLabel="No cities in this export."
          accent="teal"
        />
      </div>
    </section>
  )
}
