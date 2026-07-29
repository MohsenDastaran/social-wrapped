import type { ReactElement, ReactNode } from "react"
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

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-heading mb-2 text-base font-semibold tracking-tight text-foreground">
      {children}
    </h3>
  )
}

/** Reusable privacy explainer — use the default trigger, a custom one, or open programmatically. */
export function DataSafetyDialog({
  trigger = DEFAULT_TRIGGER,
  open,
  onOpenChange,
}: DataSafetyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent className="flex max-h-[min(85dvh,40rem)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 gap-1.5 border-b border-border/60 px-4 pt-4 pb-3 pe-12 text-start sm:px-5">
          <DialogTitle className="font-heading text-lg font-semibold tracking-tight sm:text-xl">
            Your data stays with you
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Social Wrapped is built so personal chat history never needs to
            leave your device to become meaningful. Don’t take our word for
            it — here’s how it works, and how you can check.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 text-start sm:px-5">
          <section className="mb-6">
            <SectionHeading>Processing stays on your device</SectionHeading>
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
              Your chat exports are read and analyzed on the phone or computer
              you are using. There is no account signup required for analysis,
              and no silent upload of your archive to a remote server so we can
              “generate insights” for you.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The stories you uncover — who you talk to most, late-night
              threads, forgotten jokes — are produced where your files already
              live. You keep the keys to your social memory.
            </p>
          </section>

          <section className="mb-6">
            <SectionHeading>What the network is (and isn’t) for</SectionHeading>
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
              Opening this page’s links, checking for updates, or similar
              optional actions may use the network — intentionally, and under
              your control. That is not a pipeline for shipping your private
              conversations to train models or build profiles.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              If analysis required our servers, you would need a working
              connection every time you ran it. You don’t — and you can prove
              that yourself with the checks below.
            </p>
          </section>

          <section className="mb-6">
            <SectionHeading>Verify it yourself</SectionHeading>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              Skepticism is healthy. These checks don’t require trusting a
              privacy policy — only watching what your device actually does.
            </p>

            <h4 className="font-heading mb-1.5 text-sm font-semibold tracking-tight text-foreground">
              In a browser
            </h4>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              Open DevTools (usually F12 or right-click → Inspect), go to the
              Network tab, and clear the log. Then import or analyze a chat
              export. You should not see large uploads of your archive leaving
              the page. If something does request the network, you can inspect
              the URL, size, and payload — nothing about your chats should be
              posted to a remote API for “insights.”
            </p>

            <h4 className="font-heading mb-1.5 text-sm font-semibold tracking-tight text-foreground">
              On a phone
            </h4>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              Turn on Airplane Mode, or temporarily disable Wi‑Fi and mobile
              data. If Social Wrapped can still open your export and produce
              results while offline, those files never needed the internet to
              be processed. (You may not be able to open external links like
              GitHub while offline — that’s expected.)
            </p>

            <h4 className="font-heading mb-1.5 text-sm font-semibold tracking-tight text-foreground">
              On desktop
            </h4>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Disconnect from Wi‑Fi / Ethernet, or use your OS network
              controls to block the app. Run the same analysis offline. Same
              idea as on mobile: if it works without a connection, your
              archive stayed local.
            </p>
          </section>

          <section className="mb-1">
            <SectionHeading>Open source, inspectable</SectionHeading>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The project is open source. You (or someone you trust) can read
              how exports are handled, see that analysis is designed to run
              locally, and report anything that doesn’t match what we claim
              here. Privacy isn’t a slogan for us — it’s the product: personal
              insights without giving yourself away.
            </p>
          </section>
        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 px-4 py-3 sm:px-5">
          <DialogClose render={<Button variant="outline">Got it</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
