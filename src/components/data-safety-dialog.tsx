import type { ReactElement } from "react"
import { ChevronRight, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface DataSafetyDialogProps {
  /**
   * Trigger element. Pass `null` when opening only via `open` / `onOpenChange`.
   * Defaults to the “Your data is safe” button.
   */
  trigger?: ReactElement | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const DEFAULT_TRIGGER = (
  <Button variant="outline" className="gap-1.5 rounded-full pe-2.5">
    <ShieldCheck className="size-3.5" />
    Your data is safe
    <ChevronRight className="size-3.5 opacity-70" aria-hidden />
  </Button>
)

/** Reusable privacy explainer — use the default trigger, a custom one, or open programmatically. */
export function DataSafetyDialog({
  trigger = DEFAULT_TRIGGER,
  open,
  onOpenChange,
}: DataSafetyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your data stays with you</DialogTitle>
          <DialogDescription>
            Social Wrapped is built so personal chat history never needs to
            leave your device to become meaningful.
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4 text-start text-xs/relaxed text-muted-foreground sm:text-sm">
          <p className="mb-4 leading-relaxed">
            Your exports are processed on your phone or computer. There is no
            account signup required for analysis, and no silent upload of your
            chat archive to a remote server for “insights.”
          </p>
          <p className="mb-4 leading-relaxed">
            That means the stories you uncover — who you talk to most, late-night
            threads, forgotten jokes — are generated where your files already
            live. You keep the keys to your social memory.
          </p>
          <p className="mb-4 leading-relaxed">
            When something optional needs the network (for example opening this
            page’s links), it is intentional and under your control — never a
            hidden pipeline for training models on your private conversations.
          </p>
          <p className="mb-4 leading-relaxed">
            Privacy here is the product: personal insights without giving
            yourself away.
          </p>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Got it</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
