import { HIGH_PRIORITY_PLATFORMS } from "@/lib/platforms"

export const SITE_ORIGIN = "https://wrapped.dastaran.com"

const HOME_TITLE = "Social Wrapped — your social exports, on your device"
const HOME_DESCRIPTION =
  "Review official exports from Telegram, WhatsApp, Instagram, Google Takeout, and more. Charts are built on your device. Nothing is uploaded."

const PRIVACY_TITLE = "Privacy — Social Wrapped"
const PRIVACY_DESCRIPTION =
  "Social Wrapped keeps your exports on this device. No account, no archive upload, and the Android app has no internet permission."

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
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    index: true,
  },
  "/privacy": {
    title: PRIVACY_TITLE,
    description: PRIVACY_DESCRIPTION,
    index: true,
  },
  "/about": {
    title: "About — Social Wrapped",
    description: ABOUT_DESCRIPTION,
    index: true,
  },
  "/docs": {
    title: PRIVACY_TITLE,
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

function upsertProperty(property: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[property="${property}"]`
  )
  if (!el) {
    el = document.createElement("meta")
    el.setAttribute("property", property)
    document.head.appendChild(el)
  }
  el.content = content
}

function upsertJsonLd(data: Record<string, unknown> | null) {
  const existing = document.head.querySelector<HTMLScriptElement>(
    'script[data-seo="ld"]'
  )
  if (!data) {
    existing?.remove()
    return
  }
  const el = existing ?? document.createElement("script")
  el.type = "application/ld+json"
  el.dataset.seo = "ld"
  el.textContent = JSON.stringify(data)
  if (!existing) document.head.appendChild(el)
}

/** Set title, description, robots, and canonical for the current URL. */
export function applyRouteMeta(pathname: string) {
  const path = normalizePath(pathname)
  const meta = metaForPath(path)
  document.title = meta.title
  upsertMeta("description", meta.description)
  upsertMeta("robots", meta.index ? "index,follow" : "noindex,follow")
  const canonicalPath = meta.canonicalPath ?? path
  const canonical = `${SITE_ORIGIN}${canonicalPath === "/" ? "/" : canonicalPath}`
  upsertCanonical(canonical)
  const image = `${SITE_ORIGIN}/social-wrapped.png`
  upsertProperty("og:title", meta.title)
  upsertProperty("og:description", meta.description)
  upsertProperty("og:url", canonical)
  upsertProperty("og:type", "website")
  upsertProperty("og:image", image)
  upsertMeta("twitter:card", "summary_large_image")
  upsertMeta("twitter:title", meta.title)
  upsertMeta("twitter:description", meta.description)
  upsertMeta("twitter:image", image)
  if (canonicalPath === "/") {
    upsertJsonLd({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Social Wrapped",
      url: `${SITE_ORIGIN}/`,
      description: HOME_DESCRIPTION,
    })
  } else if (canonicalPath === "/privacy") {
    upsertJsonLd({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Privacy",
      url: `${SITE_ORIGIN}/privacy`,
      description: PRIVACY_DESCRIPTION,
      isPartOf: {
        "@type": "WebSite",
        name: "Social Wrapped",
        url: `${SITE_ORIGIN}/`,
      },
    })
  } else {
    upsertJsonLd(null)
  }
}
