const ONBOARDING_VIEWS_KEY = "social-wrapped:home-onboarding-views"
const ONBOARDING_SESSION_KEY = "social-wrapped:home-onboarding-session"
const GETTING_STARTED_DISMISS_KEY = "social-wrapped:getting-started-dismissed"

export const ONBOARDING_MAX_VIEWS = 2

type GettingStartedState = {
  visible: boolean
  nonce: number
}

type Listener = () => void

let state: GettingStartedState = { visible: false, nonce: 0 }
const listeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) listener()
}

export function subscribeGettingStarted(onStoreChange: Listener) {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

export function getGettingStartedState() {
  return state
}

export function showGettingStarted() {
  state = { visible: true, nonce: state.nonce + 1 }
  emit()
}

export function hideGettingStarted() {
  if (!state.visible) return
  state = { ...state, visible: false }
  emit()
}

export function readOnboardingViews(): number {
  try {
    const raw = localStorage.getItem(ONBOARDING_VIEWS_KEY)
    const n = raw ? Number.parseInt(raw, 10) : 0
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

function writeOnboardingViews(count: number) {
  localStorage.setItem(ONBOARDING_VIEWS_KEY, String(count))
}

export function isGettingStartedDismissed(): boolean {
  try {
    return localStorage.getItem(GETTING_STARTED_DISMISS_KEY) === "1"
  } catch {
    return false
  }
}

export function dismissGettingStarted() {
  try {
    localStorage.setItem(GETTING_STARTED_DISMISS_KEY, "1")
  } catch {
    // Private mode: still hide for this session.
  }
  hideGettingStarted()
}

/** Count at most one home view per browser session. */
export function bumpOnboardingViews(): number {
  try {
    if (sessionStorage.getItem(ONBOARDING_SESSION_KEY) === "1") {
      return readOnboardingViews()
    }
    sessionStorage.setItem(ONBOARDING_SESSION_KEY, "1")
  } catch {
    // Private mode: still bump so first vs later loads can differ.
  }

  const next = readOnboardingViews() + 1
  writeOnboardingViews(next)
  return next
}

/** Reminder card after the first visit, while onboarding still applies. */
export function shouldAutoShowGettingStarted() {
  if (isGettingStartedDismissed()) return false
  const views = readOnboardingViews()
  return views > 1 && views <= ONBOARDING_MAX_VIEWS
}
