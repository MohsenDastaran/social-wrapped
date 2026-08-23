import { useEffect, useState, useSyncExternalStore } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { StepFlow, type StepFlowItem } from "@/components/step-flow"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { showGettingStarted } from "@/lib/getting-started"
import {
  completeWebsiteTour,
  getWebsiteTourState,
  shouldShowWebsiteTour,
  subscribeWebsiteTour,
} from "@/lib/website-tour"

const TOUR_STEPS: StepFlowItem[] = [
  {
    serial: "01",
    title: "Stay local",
    description:
      "Social Wrapped turns official exports into a year in review on this device. Archives are not uploaded for insights.",
    image: "/social-wrapped.png",
    imageAlt: "Social Wrapped mark",
  },
  {
    serial: "02",
    title: "Pick a platform",
    description:
      "Home lists Telegram, Instagram, Spotify, Google Takeout, and more. Open a card to start that import.",
    image: "/images/peeps/all-peeps.png",
    imageAlt: "People illustrations for supported platforms",
  },
  {
    serial: "03",
    title: "Import the export",
    description:
      "Download the archive from the platform, then choose the file here. Parsing runs in the browser. Each card’s help explains the official export path.",
    image: "/social-wrapped-bg.png",
    imageAlt: "Social Wrapped background artwork",
  },
  {
    serial: "04",
    title: "Read your wrap",
    description:
      "Charts, ranked people, listening stats, stories, and optional video are rendered locally. Share a PNG or MP4 if you want — the archive stays put.",
    image: "/social-wrapped.png",
    imageAlt: "Social Wrapped mark",
  },
  {
    serial: "05",
    title: "History & settings",
    description:
      "Reopen wraps from History. Settings controls retention and storage. Privacy is where you can verify the local-first claim.",
    image: "/images/peeps/all-peeps.png",
    imageAlt: "People illustrations",
  },
]

/** Blocking first-visit walkthrough of every product step (website only). */
export function WebsiteTour() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const lastIndex = TOUR_STEPS.length - 1
  const isLast = step >= lastIndex

  const { nonce } = useSyncExternalStore(
    subscribeWebsiteTour,
    getWebsiteTourState,
    getWebsiteTourState
  )

  useEffect(() => {
    setOpen(shouldShowWebsiteTour())
  }, [])

  useEffect(() => {
    if (nonce === 0) return
    setStep(0)
    setOpen(true)
  }, [nonce])

  function finishTour() {
    completeWebsiteTour()
    setOpen(false)
    showGettingStarted()
  }

  function goPrevious() {
    setStep((index) => Math.max(0, index - 1))
  }

  function goNext() {
    if (isLast) {
      finishTour()
      return
    }
    setStep((index) => Math.min(lastIndex, index + 1))
  }

  return (
    <Dialog
      open={open}
      disablePointerDismissal
      onOpenChange={(next) => {
        if (!next) return
        setOpen(true)
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex! top-[50%] max-h-[min(96dvh,calc(100%-0.75rem))] w-[calc(100%-0.75rem)] max-w-5xl translate-y-[-50%] flex-col gap-0 overflow-hidden p-0 sm:max-h-[min(92dvh,calc(100%-1.5rem))] sm:w-[calc(100%-1.5rem)] sm:max-w-6xl lg:max-w-[76rem]"
      >
        <DialogHeader className="shrink-0 gap-1 px-4 pt-4 pb-2 text-start sm:px-5 sm:pt-5">
          <DialogTitle className="font-heading text-base font-semibold sm:text-lg">
            How Social Wrapped works
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
            Click any step, or use Next and Previous.
          </DialogDescription>
        </DialogHeader>

        <StepFlow
          steps={TOUR_STEPS}
          step={step}
          onStepChange={setStep}
          highlightColor="rgb(229 229 229)"
          className="min-h-0 flex-1 rounded-none bg-transparent px-3 dark:bg-transparent"
        />

        <DialogFooter className="shrink-0 flex-row items-center justify-between gap-2 border-t border-border px-3 py-3 sm:justify-between sm:px-5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={step === 0}
            onClick={goPrevious}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            <span className="max-sm:hidden">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          <p className="text-xs font-medium tracking-wide text-muted-foreground tabular-nums">
            {String(step + 1).padStart(2, "0")} /{" "}
            {String(TOUR_STEPS.length).padStart(2, "0")}
          </p>
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            onClick={goNext}
          >
            {isLast ? "Enter the app" : "Next"}
            {isLast ? null : <ChevronRightIcon data-icon="inline-end" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
