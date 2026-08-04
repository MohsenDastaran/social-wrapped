/* Official X archive static file server.
 * Serves Cache Storage entries populated by the app under /x-archive/:wrapId/*
 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  const match = url.pathname.match(/^\/x-archive\/([^/]+)\/(.*)$/)
  if (!match) return

  const wrapId = match[1]
  let path = decodeURIComponent(match[2] || "")
  if (!path || path.endsWith("/")) {
    path = (path || "") + "Your archive.html"
  }

  event.respondWith(serveArchiveFile(wrapId, path, event.request))
})

async function serveArchiveFile(wrapId, path, request) {
  const cache = await caches.open(`x-archive-${wrapId}`)
  const exact = await cache.match(request)
  if (exact) return exact

  const candidates = [
    `/x-archive/${wrapId}/${path}`,
    `/x-archive/${wrapId}/${path.replace(/^\.\//, "")}`,
  ]
  for (const candidate of candidates) {
    const hit = await cache.match(candidate)
    if (hit) return hit
  }

  // Case-insensitive / alternate separators
  const keys = await cache.keys()
  const lower = path.replace(/\\/g, "/").toLowerCase()
  for (const key of keys) {
    const keyPath = new URL(key.url).pathname
    const suffix = keyPath.slice(`/x-archive/${wrapId}/`.length)
    if (suffix.replace(/\\/g, "/").toLowerCase() === lower) {
      const hit = await cache.match(key)
      if (hit) return hit
    }
  }

  return new Response(`Archive file not found: ${path}`, {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
