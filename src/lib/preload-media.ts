const VIDEO_URL = /\.(mp4|webm|ogg|ogv|mov|m4v)(?:[?#]|$)/i

const ready = new Map<string, boolean>()
const inflight = new Map<string, Promise<void>>()
const listeners = new Map<string, Set<() => void>>()

export function isVideoUrl(src: string) {
  return VIDEO_URL.test(src)
}

function emit(src: string) {
  const subs = listeners.get(src)
  if (!subs) return
  for (const listener of subs) listener()
}

function markSettled(src: string) {
  ready.set(src, true)
  inflight.delete(src)
  emit(src)
}

function loadImage(src: string) {
  return new Promise<void>((resolve) => {
    const image = new Image()
    const finish = () => resolve()
    image.onload = finish
    image.onerror = finish
    image.decoding = "async"
    image.src = src
    if (image.complete && image.naturalWidth > 0) {
      void image.decode().then(finish, finish)
    }
  })
}

const videoPool = new Map<string, HTMLVideoElement>()

function loadVideo(src: string) {
  return new Promise<void>((resolve) => {
    let video = videoPool.get(src)
    if (!video) {
      video = document.createElement("video")
      video.preload = "auto"
      video.muted = true
      video.playsInline = true
      video.setAttribute("playsinline", "")
      videoPool.set(src, video)
    }
    if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      resolve()
      return
    }
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      video.removeEventListener("canplaythrough", finish)
      video.removeEventListener("loadeddata", onLoaded)
      video.removeEventListener("error", finish)
      resolve()
    }
    const onLoaded = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) finish()
    }
    video.addEventListener("canplaythrough", finish)
    video.addEventListener("loadeddata", onLoaded)
    video.addEventListener("error", finish)
    if (!video.src) video.src = src
    video.load()
    if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) finish()
  })
}

/** Warm the HTTP cache so later <img> / <video> mounts skip a loading flash. */
export function preloadMediaUrl(src: string) {
  if (!src || ready.get(src)) return Promise.resolve()
  const pending = inflight.get(src)
  if (pending) return pending

  const task = (isVideoUrl(src) ? loadVideo(src) : loadImage(src))
    .catch(() => undefined)
    .then(() => {
      markSettled(src)
    })
  inflight.set(src, task)
  return task
}

export function preloadMediaUrls(urls: Array<string | undefined>) {
  for (const url of urls) {
    if (url) void preloadMediaUrl(url)
  }
}

export function preloadStepMedia(
  steps: Array<{ image: string; poster?: string }>,
) {
  preloadMediaUrls(steps.flatMap((step) => [step.image, step.poster]))
}

export function isMediaReady(src: string) {
  return ready.get(src) === true
}

export function subscribeMediaReady(src: string, listener: () => void) {
  let subs = listeners.get(src)
  if (!subs) {
    subs = new Set()
    listeners.set(src, subs)
  }
  subs.add(listener)
  void preloadMediaUrl(src)
  return () => {
    subs.delete(listener)
  }
}
