import type { LucideIcon } from "lucide-react"
import {
  CalendarDays,
  Clapperboard,
  Footprints,
  Image,
  Monitor,
  NotebookPen,
  Search,
  Shield,
} from "lucide-react"

import type { GoogleInsights } from "@/platform/google-types"
import { fmt } from "@/components/wrap/chart-theme"

export type GoogleProductId =
  | "youtube"
  | "chrome"
  | "my-activity"
  | "fit"
  | "keep"
  | "calendar"
  | "photos"
  | "access-log"

export type GoogleProductMeta = {
  id: GoogleProductId
  label: string
  description: string
  icon: LucideIcon
  accent: "teal" | "amber" | "emerald" | "sky" | "violet"
}

const CATALOG: GoogleProductMeta[] = [
  {
    id: "youtube",
    label: "YouTube",
    description: "Watches, searches, and subscriptions",
    icon: Clapperboard,
    accent: "teal",
  },
  {
    id: "chrome",
    label: "Chrome",
    description: "Browsing history and top domains",
    icon: Monitor,
    accent: "sky",
  },
  {
    id: "my-activity",
    label: "My Activity",
    description: "Search, Maps, Gemini, and more",
    icon: Search,
    accent: "amber",
  },
  {
    id: "fit",
    label: "Fit",
    description: "Steps, active minutes, workouts",
    icon: Footprints,
    accent: "emerald",
  },
  {
    id: "keep",
    label: "Keep",
    description: "Notes you wrote and edited",
    icon: NotebookPen,
    accent: "violet",
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "Events from your calendars",
    icon: CalendarDays,
    accent: "sky",
  },
  {
    id: "photos",
    label: "Photos",
    description: "Library metadata by album",
    icon: Image,
    accent: "violet",
  },
  {
    id: "access-log",
    label: "Access log",
    description: "Device and product access",
    icon: Shield,
    accent: "amber",
  },
]

export function isGoogleProductId(value: string): value is GoogleProductId {
  return CATALOG.some((p) => p.id === value)
}

export function getGoogleProductMeta(
  id: GoogleProductId
): GoogleProductMeta | undefined {
  return CATALOG.find((p) => p.id === id)
}

export function productHasData(
  insights: GoogleInsights,
  id: GoogleProductId
): boolean {
  switch (id) {
    case "youtube":
      return insights.youtube != null
    case "chrome":
      return insights.chrome != null
    case "my-activity":
      return insights.myActivity != null
    case "fit":
      return insights.fit != null
    case "keep":
      return insights.keep != null
    case "calendar":
      return insights.calendar != null
    case "photos":
      return insights.photos != null
    case "access-log":
      return insights.accessLog != null
  }
}

/** Products present in this wrap, in catalog order. */
export function availableGoogleProducts(
  insights: GoogleInsights
): GoogleProductMeta[] {
  return CATALOG.filter((p) => productHasData(insights, p.id))
}

/** Short headline stat for overview cards. */
export function productHighlight(
  insights: GoogleInsights,
  id: GoogleProductId
): string {
  switch (id) {
    case "youtube": {
      const yt = insights.youtube
      if (!yt) return "—"
      return `${fmt(yt.watchCount)} watches`
    }
    case "chrome": {
      const ch = insights.chrome
      if (!ch) return "—"
      return `${fmt(ch.visitCount)} visits`
    }
    case "my-activity": {
      const ma = insights.myActivity
      if (!ma) return "—"
      return `${fmt(ma.totalEvents)} events`
    }
    case "fit": {
      const fit = insights.fit
      if (!fit) return "—"
      return `${fmt(fit.totalSteps)} steps`
    }
    case "keep": {
      const keep = insights.keep
      if (!keep) return "—"
      return `${fmt(keep.noteCount)} notes`
    }
    case "calendar": {
      const cal = insights.calendar
      if (!cal) return "—"
      return `${fmt(cal.eventCount)} events`
    }
    case "photos": {
      const ph = insights.photos
      if (!ph) return "—"
      return `${fmt(ph.photoCount)} photos`
    }
    case "access-log": {
      const al = insights.accessLog
      if (!al) return "—"
      return `${fmt(al.entryCount)} entries`
    }
  }
}
