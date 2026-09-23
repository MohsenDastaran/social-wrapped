import { HIGH_PRIORITY_PLATFORMS } from "@/lib/platforms"

export const SITE_ORIGIN = "https://wrapped.dastaran.com"

const HOME_DESCRIPTION =
  "Review official social exports on your device. Telegram, Instagram, Google Takeout, and more — nothing is uploaded."

const PRIVACY_DESCRIPTION =
  "How Social Wrapped keeps exports on this device, what is open to audit, and how to verify it."

const ABOUT_DESCRIPTION =
  "Social Wrapped is a local review of the archives you already download from the apps you use."

type RouteMeta = {
  title: string
  description: string
  /** Path used in the canonical URL. Defaults to the normalized path. */
  canonicalPath?: string
  index: boolean
}

function importMeta(name: string, description: string): RouteMeta {
  return {
    title: `${name} — Social Wrapped`,
    description,
    index: true,
  }
}

const STATIC_ROUTES: Record<string, RouteMeta> = {
  "/": {
    title: "Social Wrapped",
    description: HOME_DESCRIPTION,
    index: true,
  },
  "/privacy": {
    title: "Privacy — Social Wrapped",
    description: PRIVACY_DESCRIPTION,
    index: true,
  },
  "/about": {
    title: "About — Social Wrapped",
    description: ABOUT_DESCRIPTION,
    index: true,
  },
  "/docs": {
    title: "Privacy — Social Wrapped",
    description: PRIVACY_DESCRIPTION,
    canonicalPath: "/privacy",
    index: true,
  },
  "/history": {
    title: "History — Social Wrapped",
    description: "Wraps saved on this device.",
    index: false,
  },
  "/settings": {
    title: "Settings — Social Wrapped",
    description: "Settings stored on this device.",
    index: false,
  },
}

for (const platform of HIGH_PRIORITY_PLATFORMS) {
  STATIC_ROUTES[`/import/${platform.id}`] = importMeta(
    platform.importTitle,
    platform.importDescription
  )
}

/** Indexable URLs for sitemap.xml. Keep that file in sync with this list. */
export const INDEXABLE_PATHS = Object.entries(STATIC_ROUTES)
  .filter(([, meta]) => meta.index && !meta.canonicalPath)
  .map(([path]) => path)

export function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/"
  const trimmed = pathname.replace(/\/+$/, "")
  return trimmed || "/"
}

export function metaForPath(pathname: string): RouteMeta {
  const path = normalizePath(pathname)
  const known = STATIC_ROUTES[path]
  if (known) return known
  if (path === "/wrap" || path.startsWith("/wrap/")) {
    return {
      title: "Wrap — Social Wrapped",
      description: "A wrap saved on this device.",
      index: false,
    }
  }
  return {
    title: "Page not found — Social Wrapped",
    description: "This page is not part of Social Wrapped.",
    index: false,
  }
}

function upsertMeta(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement("meta")
    el.name = name
    document.head.appendChild(el)
  }
  el.content = content
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement("link")
    el.rel = "canonical"
    document.head.appendChild(el)
  }
  el.href = href
}

/** Set title, description, robots, and canonical for the current URL. */
export function applyRouteMeta(pathname: string) {
  const path = normalizePath(pathname)
  const meta = metaForPath(path)
  document.title = meta.title
  upsertMeta("description", meta.description)
  upsertMeta("robots", meta.index ? "index,follow" : "noindex,follow")
  const canonicalPath = meta.canonicalPath ?? path
  upsertCanonical(
    `${SITE_ORIGIN}${canonicalPath === "/" ? "/" : canonicalPath}`
  )
}
