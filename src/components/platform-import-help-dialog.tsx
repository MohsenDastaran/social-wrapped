import type { ReactElement, ReactNode } from "react"
import { Lock } from "lucide-react"

import { PlatformLogo } from "@/components/platform-logo"
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
import { isPlatformEnabled, type PlatformConfig } from "@/lib/platforms"
import { scrollYClass } from "@/lib/scroll"
import { cn } from "@/lib/utils"

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-heading mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h3>
  )
}

type PlatformImportHelpDialogProps = {
  platform: PlatformConfig
  /** Trigger element (e.g. Need help? button). */
  trigger: ReactElement
}

/** Export / import steps for the current platform — opened from the import page. */
export function PlatformImportHelpDialog({
  platform,
  trigger,
}: PlatformImportHelpDialogProps) {
  const enabled = isPlatformEnabled(platform.id)

  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="flex max-h-[min(88dvh,44rem)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 items-center gap-0 border-b border-border/50 px-5 pt-7 pb-5 pe-12 text-center sm:px-7">
          <span
            className={cn(
              "mb-4 flex size-20 items-center justify-center rounded-[1.35rem] shadow-sm ring-1 ring-inset",
              "bg-linear-to-br from-background to-muted/80",
              platform.accentClass
            )}
          >
            <PlatformLogo
              id={platform.id}
              title={platform.name}
              className="size-11 drop-shadow-sm"
            />
          </span>
          <DialogTitle className="font-heading text-2xl font-semibold tracking-tight sm:text-[1.7rem]">
            {platform.name}
          </DialogTitle>
          <DialogDescription className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {platform.summary}
          </DialogDescription>
          <span
            className={cn(
              "mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide ring-1",
              enabled
                ? "bg-primary/15 text-primary ring-primary/25"
                : "bg-muted text-muted-foreground ring-border"
            )}
          >
            {enabled ? (
              "Available to import"
            ) : (
              <>
                <Lock className="size-3" aria-hidden />
                Coming soon
              </>
            )}
          </span>
        </DialogHeader>

        <div
          className={cn(
            "min-h-0 flex-1 px-5 py-5 text-start sm:px-7",
            scrollYClass
          )}
        >
          {!enabled ? (
            <p className="mb-5 rounded-xl bg-muted/70 px-3.5 py-3 text-sm leading-relaxed text-muted-foreground ring-1 ring-border/50">
              Import isn’t enabled yet — you can still prepare an export with the
              steps below.
            </p>
          ) : null}

          <div className="mb-7 space-y-4 rounded-xl bg-muted/40 px-3.5 py-4 ring-1 ring-border/40">
            <div>
              <SectionHeading>Export path</SectionHeading>
              <p className="text-sm leading-relaxed text-foreground/80">
                {platform.exportPath}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <SectionHeading>Formats</SectionHeading>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {platform.formats}
                </p>
              </div>
              <div className="sm:col-span-2">
                <SectionHeading>What you can analyze</SectionHeading>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {platform.extractable}
                </p>
              </div>
            </div>
          </div>

          <section>
            <h3 className="font-heading mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              How to download &amp; import
            </h3>
            <ol className="space-y-5">
              {platform.steps.map((step, index) => (
                <li key={step} className="flex gap-3.5">
                  <span
                    className="font-heading flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold tabular-nums text-background"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 pt-1">
                    <p className="font-heading text-base font-medium leading-snug tracking-tight text-foreground sm:text-lg">
                      {step}
                    </p>
                    {index === platform.steps.length - 1 &&
                    platform.importHint ? (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {platform.importHint}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {enabled ? (
            <p className="mt-7 rounded-xl bg-primary/10 px-3.5 py-3 text-sm leading-relaxed text-foreground ring-1 ring-primary/20">
              Processing stays on your device. Your archive is not uploaded for
              analysis.
            </p>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 px-5 py-3 sm:px-7">
          <DialogClose
            render={<Button variant="outline" size="default">Close</Button>}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
