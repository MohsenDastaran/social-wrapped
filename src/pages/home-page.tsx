import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, ShieldCheck, XIcon } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Link, useNavigate } from "react-router"

import { Hero } from "@/components/hero"
import { PlatformImportCard } from "@/components/platform-guide-card"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert"
import { PlatformSearchInput } from "@/components/platform-search-input"
import { PreviewDetailsCard } from "@/components/uitripled/preview-details-card-shadcnui"
import { Button } from "@/components/ui/button"
import { HIGH_PRIORITY_PLATFORMS } from "@/lib/platforms"

const TRUST_ALERT_KEY = "social-wrapped:privacy-trust-alert"
const TRUST_ALERT_MAX_PRIVACY_CLICKS = 2
const ONBOARDING_VIEWS_KEY = "social-wrapped:home-onboarding-views"
const ONBOARDING_SESSION_KEY = "social-wrapped:home-onboarding-session"
const GETTING_STARTED_DISMISS_KEY = "social-wrapped:getting-started-dismissed"
const ONBOARDING_MAX_VIEWS = 2

type TrustAlertState = {
  privacyClicks: number
  dismissed: boolean
}

function readTrustAlertState(): TrustAlertState {
  try {
    const raw = localStorage.getItem(TRUST_ALERT_KEY)
    if (!raw) return { privacyClicks: 0, dismissed: false }
    const parsed = JSON.parse(raw) as Partial<TrustAlertState>
    return {
      privacyClicks:
        typeof parsed.privacyClicks === "number" && parsed.privacyClicks >= 0
          ? parsed.privacyClicks
          : 0,
      dismissed: Boolean(parsed.dismissed),
    }
  } catch {
    return { privacyClicks: 0, dismissed: false }
  }
}

function writeTrustAlertState(state: TrustAlertState) {
  localStorage.setItem(TRUST_ALERT_KEY, JSON.stringify(state))
}

function isTrustAlertVisible(state: TrustAlertState): boolean {
  return (
    !state.dismissed && state.privacyClicks < TRUST_ALERT_MAX_PRIVACY_CLICKS
  )
}

function readOnboardingViews(): number {
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

function isGettingStartedDismissed(): boolean {
  try {
    return localStorage.getItem(GETTING_STARTED_DISMISS_KEY) === "1"
  } catch {
    return false
  }
}

function dismissGettingStarted() {
  localStorage.setItem(GETTING_STARTED_DISMISS_KEY, "1")
}

/** Count at most one home view per browser session. */
function bumpOnboardingViews(): number {
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

export function HomePage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [showTrustAlert, setShowTrustAlert] = useState(false)
  const [showGettingStarted, setShowGettingStarted] = useState(false)
  const reduceMotion = useReducedMotion()
  const filteredPlatforms = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return HIGH_PRIORITY_PLATFORMS

    return HIGH_PRIORITY_PLATFORMS.filter((platform) =>
      [
        platform.name,
        platform.summary,
        platform.acceptedFiles.join(" "),
        platform.formats,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search)
    )
  }, [query])

  useEffect(() => {
    if (window.location.hash !== "#platforms") return
    const el = document.getElementById("platforms")
    if (!el) return
    const frameId = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    })
    return () => cancelAnimationFrame(frameId)
  }, [])

  useEffect(() => {
    const views = bumpOnboardingViews()
    const inOnboarding = views <= ONBOARDING_MAX_VIEWS
    setShowGettingStarted(inOnboarding && !isGettingStartedDismissed())
    setShowTrustAlert(inOnboarding && isTrustAlertVisible(readTrustAlertState()))
  }, [])

  function dismissTrustAlert() {
    writeTrustAlertState({
      ...readTrustAlertState(),
      dismissed: true,
    })
    setShowTrustAlert(false)
  }

  function handlePrivacyClick() {
    const state = readTrustAlertState()
    const privacyClicks = state.privacyClicks + 1
    const next: TrustAlertState = {
      privacyClicks,
      dismissed:
        state.dismissed || privacyClicks >= TRUST_ALERT_MAX_PRIVACY_CLICKS,
    }
    writeTrustAlertState(next)
    if (!isTrustAlertVisible(next)) {
      setShowTrustAlert(false)
    }
  }

  function handleDismissGettingStarted() {
    dismissGettingStarted()
    setShowGettingStarted(false)
  }

  return (
    <div className="flex w-full max-w-4xl flex-col items-stretch text-start">
      <Hero />

      <AnimatePresence>
        {showGettingStarted ? (
          <motion.div
            key="getting-started-popup"
            className="fixed z-40 w-[min(calc(100%-2rem),22rem)] inset-e-4 bottom-24 max-h-[min(70dvh,36rem)] overflow-x-hidden overflow-y-auto md:bottom-6"
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 28, x: 16, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 16, x: 12, scale: 0.96 }
            }
            transition={{
              duration: 0.45,
              ease: [0.19, 1, 0.22, 1],
            }}
          >
            <PreviewDetailsCard
              onTryDemo={() => navigate("/import/telegram?demo=1")}
              onDismiss={handleDismissGettingStarted}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <section
        id="platforms"
        className="scroll-mt-6"
        aria-label="Choose a platform"
      >
        {showTrustAlert ? (
          <Alert
            variant="default"
            className="relative mb-6 grid-cols-1 gap-0 overflow-hidden rounded-2xl border-primary/25 bg-primary/6 px-3 py-2.5 shadow-[0_10px_28px_-24px] shadow-foreground/40 ring-1 ring-primary/10"
          >
            <div
              className="pointer-events-none absolute -inset-e-8 -top-10 size-28 rounded-full bg-primary/15 blur-2xl"
              aria-hidden
            />
            <div className="relative flex items-start gap-3">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30"
                aria-hidden
              >
                <ShieldCheck className="size-4" strokeWidth={2.25} />
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div className="min-w-0 flex-1">
                  <AlertTitle className="font-heading col-start-auto min-h-0 text-[0.95rem] leading-tight tracking-tight">
                    Don&apos;t you trust us?
                  </AlertTitle>
                  <AlertDescription className="col-start-auto mt-0.5 text-xs leading-snug text-muted-foreground">
                    No accounts, no uploads — analysis stays on this device.
                  </AlertDescription>
                </div>

                <Button
                  size="sm"
                  className="w-fit shrink-0 rounded-full"
                  render={
                    <Link to="/privacy" onClick={handlePrivacyClick} />
                  }
                  nativeButton={false}
                >
                  Peek at Privacy
                  <ArrowUpRight data-icon="inline-end" />
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"
                onClick={dismissTrustAlert}
              >
                <XIcon />
              </Button>
            </div>
          </Alert>
        ) : null}

        <section
          className="mb-6 flex flex-col gap-4"
          aria-label="Platform search"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <PlatformSearchInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClear={() => setQuery("")}
              placeholder="Find a platform or file type…"
              className="sm:max-w-md"
            />
            <p
              className="inline-flex shrink-0 items-baseline gap-2 self-start rounded-full bg-primary/10 px-3 py-1.5 ring-1 ring-primary/25 sm:self-auto"
              aria-live="polite"
            >
              <span className="font-heading text-xl font-semibold tabular-nums leading-none tracking-tight text-primary">
                {filteredPlatforms.length}
              </span>
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-foreground/75">
                {filteredPlatforms.length === 1 ? "platform" : "platforms"}
              </span>
            </p>
          </div>
        </section>

        <motion.ul layout className="grid list-none gap-4 p-0 sm:grid-cols-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {filteredPlatforms.map((platform, index) => (
              <motion.li
                key={platform.id}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: -10, scale: 0.96 }
                }
                transition={{
                  duration: 0.32,
                  delay: reduceMotion ? 0 : Math.min(index * 0.045, 0.25),
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <PlatformImportCard platform={platform} featured />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>

        {filteredPlatforms.length === 0 ? (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 text-center text-sm leading-relaxed text-muted-foreground"
          >
            Nothing matched “{query.trim()}”. Try a platform name or a file type
            such as JSON, ZIP, or CSV.
          </motion.p>
        ) : null}
      </section>
    </div>
  )
}
