import { isTauri } from "@tauri-apps/api/core"

const WEBSITE_TOUR_KEY = "social-wrapped:website-tour-complete"

type WebsiteTourState = {
  nonce: number
}

type Listener = () => void

let state: WebsiteTourState = { nonce: 0 }
const listeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) listener()
}

export function subscribeWebsiteTour(onStoreChange: Listener) {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

export function getWebsiteTourState() {
  return state
}

/** Open the product tour, including after the first visit. */
export function showWebsiteTour() {
  state = { nonce: state.nonce + 1 }
  emit()
}

export function isWebsiteTourComplete() {
  try {
    return localStorage.getItem(WEBSITE_TOUR_KEY) === "1"
  } catch {
    return false
  }
}

export function completeWebsiteTour() {
  try {
    localStorage.setItem(WEBSITE_TOUR_KEY, "1")
  } catch {
    // Private mode: overlay still closes for this session.
  }
}

/** First visit on the public website only — native apps skip this. */
export function shouldShowWebsiteTour() {
  if (typeof window === "undefined") return false
  if (isTauri()) return false
  return !isWebsiteTourComplete()
}
