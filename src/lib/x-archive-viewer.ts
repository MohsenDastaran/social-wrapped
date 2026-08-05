import { unzip } from "fflate"
import { getArchiveBlob } from "@/lib/wrap-history"

const SW_URL = "/x-archive-sw.js"
const SW_SCOPE = "/"

function mimeForPath(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html; charset=utf-8"
  if (lower.endsWith(".js")) return "application/javascript; charset=utf-8"
  if (lower.endsWith(".css")) return "text/css; charset=utf-8"
  if (lower.endsWith(".json")) return "application/json; charset=utf-8"
  if (lower.endsWith(".svg")) return "image/svg+xml"
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  if (lower.endsWith(".gif")) return "image/gif"
  if (lower.endsWith(".webp")) return "image/webp"
  if (lower.endsWith(".mp4")) return "video/mp4"
  if (lower.endsWith(".woff2")) return "font/woff2"
  if (lower.endsWith(".woff")) return "font/woff"
  if (lower.endsWith(".ttf")) return "font/ttf"
  if (lower.endsWith(".ico")) return "image/x-icon"
  return "application/octet-stream"
}

function normalizeZipPath(name: string): string {
  return name.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "")
}

export function officialXArchiveUrl(wrapId: string): string {
  return `/x-archive/${encodeURIComponent(wrapId)}/Your%20archive.html`
}

export async function registerXArchiveServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null
  try {
    return await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE })
  } catch (error) {
    console.warn("X archive service worker registration failed:", error)
    return null
  }
}

async function cacheExists(wrapId: string): Promise<boolean> {
  const cache = await caches.open(`x-archive-${wrapId}`)
  const keys = await cache.keys()
  return keys.length > 0
}

function unzipBlob(bytes: Uint8Array): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    unzip(bytes, (err, data) => {
      if (err) reject(err)
      else resolve(data ?? {})
    })
  })
}

/** Unpack the stored ZIP into Cache Storage so the SW can serve Official X HTML. */
export async function ensureXArchiveCached(
  wrapId: string,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  if (await cacheExists(wrapId)) return

  const blob = await getArchiveBlob(wrapId)
  if (!blob) {
    throw new Error(
      "Official archive ZIP isn’t stored for this wrap. Re-import the X ZIP to enable Official X HTML."
    )
  }

  const bytes = new Uint8Array(await blob.arrayBuffer())
  const files = await unzipBlob(bytes)
  const entries = Object.entries(files).filter(([name]) => {
    const n = normalizeZipPath(name)
    return n && !n.endsWith("/")
  })

  const cache = await caches.open(`x-archive-${wrapId}`)
  const total = entries.length
  let done = 0
  const batchSize = 40

  for (let i = 0; i < entries.length; i += batchSize) {
    const slice = entries.slice(i, i + batchSize)
    await Promise.all(
      slice.map(async ([rawName, data]) => {
        const path = normalizeZipPath(rawName)
        const url = `/x-archive/${encodeURIComponent(wrapId)}/${path
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`
        await cache.put(
          url,
          new Response(data.slice(), {
            headers: {
              "Content-Type": mimeForPath(path),
              "Cache-Control": "no-cache",
            },
          })
        )
      })
    )
    done = Math.min(total, i + slice.length)
    onProgress?.(done, total)
  }
}

export async function clearXArchiveCache(wrapId: string): Promise<void> {
  await caches.delete(`x-archive-${wrapId}`)
}
