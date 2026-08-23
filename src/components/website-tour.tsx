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
import { preloadStepMedia } from "@/lib/preload-media"
import {
  completeWebsiteTour,
  getWebsiteTourState,
  shouldShowWebsiteTour,
  subscribeWebsiteTour,
} from "@/lib/website-tour"

const TOUR_STEPS: StepFlowItem[] = [
  {
    serial: "01",
    title: "Welcome to Social Wrapped",
    description:
      "Social Wrapped is a tool that helps you wrap your social media data into a personalized analysis.",
    image: "/social-wrapped-bg.png",
    imageAlt: "Social Wrapped background artwork",
  },
  {
    serial: "02",
    title: "Pick a platform",
    description:
      "Telegram, Instagram, Spotify, Google Takeout, and more. Open a card to start that import.",
    image: "/images/tour/2.png",
    imageAlt: "People illustrations for supported platforms",
  },
  {
    serial: "03",
    title: "Download the export",
    description:
      "Read the instructions for each platform, then download the export from the platform, then choose the file here.",
    image: "/images/tour/3.png",
    imageAlt: "People illustrations",
  },
  {
    serial: "04",
    title: "Import the data into Social Wrapped",
    description:
      "Import the data into Social Wrapped by choosing the file here. Parsing runs in the browser.",
    image: "/images/tour/4.png",
    imageAlt: "Social Wrapped background artwork",
  },
  {
    serial: "05",
    title: "See the results & Enjoy!",
    description:
      "Charts, ranked people, listening stats, stories & video are rendered locally. Share it with your friends & family.",
    image: "/images/tour/5.webm",
    imageAlt: "Social Wrapped mark",
    poster: "/images/tour/5.png",
  },
]

/** Blocking first-visit walkthrough of every product step. */
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

  useEffect(() => {
    if (!open) return
    preloadStepMedia(TOUR_STEPS)
  }, [open])

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
        className="top-[50%] flex! h-[min(96dvh,calc(100%-0.75rem))] max-h-[min(96dvh,calc(100%-0.75rem))] w-[calc(100%-0.75rem)] max-w-5xl translate-y-[-50%] flex-col gap-0 overflow-hidden p-0 sm:h-[min(92dvh,calc(100%-1.5rem))] sm:max-h-[min(92dvh,calc(100%-1.5rem))] sm:w-[calc(100%-1.5rem)] sm:max-w-6xl lg:max-w-[76rem]"
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
            className="min-w-32 rounded-full"
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
