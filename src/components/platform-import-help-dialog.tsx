import type { ComponentProps, ReactElement, ReactNode } from "react"
import { CircleHelp, ExternalLink } from "lucide-react"

import { PlatformLogo } from "@/components/platform-logo"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { openExternalUrl } from "@/lib/app-links"
import {
  getPlatformImportDoc,
  type PlatformImportDoc,
} from "@/lib/platform-import-docs"
import { isPlatformEnabled, type PlatformConfig } from "@/lib/platforms"
import { scrollYClass } from "@/lib/scroll"
import { cn } from "@/lib/utils"

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 font-heading text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </h3>
  )
}

const HELP_LABEL = "Need help?"

function helpTriggerSurfaceClass(platform: PlatformConfig) {
  return cn(
    "rounded-full border bg-background/80 text-foreground shadow-sm backdrop-blur-sm",
    "hover:bg-background hover:text-foreground",
    platform.accentClass
  )
}

type PlatformImportHelpTriggerProps = ComponentProps<typeof Button> & {
  platform: PlatformConfig
  layout: "compact" | "full"
}

/** Compact (card) or always-expanded (import page) trigger for the help dialog. */
export function PlatformImportHelpTrigger({
  platform,
  layout,
  className,
  ...props
}: PlatformImportHelpTriggerProps) {
  if (layout === "full") {
    return (
      <Button
        variant="outline"
        className={cn(helpTriggerSurfaceClass(platform), className)}
        {...props}
      >
        <CircleHelp data-icon="inline-start" />
        {HELP_LABEL}
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label={HELP_LABEL}
      className={cn(
        "group/fab relative h-8 w-[3.75rem] justify-start gap-0 overflow-hidden rounded-full px-2 text-[0.65rem] font-medium tracking-wide",
        "border-foreground/10 bg-background/90 text-muted-foreground shadow-sm backdrop-blur-sm",
        "transition-[width,color,background-color] duration-300 ease-out",
        "hover:border-foreground/20 hover:bg-background hover:text-foreground",
        "sm:w-8 sm:hover:w-[3.75rem] sm:focus-visible:w-[3.75rem] sm:aria-expanded:w-[3.75rem]",
        platform.accentClass,
        className
      )}
      {...props}
    >
      <CircleHelp
        aria-hidden
        className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 transition-[left,transform] duration-300 sm:left-1/2 sm:-translate-x-1/2 sm:group-hover/fab:left-2 sm:group-hover/fab:translate-x-0 sm:group-focus-visible/fab:left-2 sm:group-focus-visible/fab:translate-x-0 sm:group-aria-expanded/fab:left-2 sm:group-aria-expanded/fab:translate-x-0"
      />
      <span className="ml-5 pr-1 opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover/fab:opacity-100 sm:group-focus-visible/fab:opacity-100 sm:group-aria-expanded/fab:opacity-100">
        Help
      </span>
    </Button>
  )
}

type PlatformImportHelpDialogProps = {
  platform: PlatformConfig
  /** Trigger element (e.g. Need help? button). */
  trigger: ReactElement
  /** Export documentation — overrides the registry entry for this platform. */
  importDoc?: PlatformImportDoc
  /** Official export/download URL — overrides `importDoc.officialExportUrl`. */
  officialExportUrl?: string
}

/** Export / import steps for the current platform — opened from the import page. */
export function PlatformImportHelpDialog({
  platform,
  trigger,
  importDoc: importDocProp,
  officialExportUrl: officialExportUrlProp,
}: PlatformImportHelpDialogProps) {
  const enabled = isPlatformEnabled(platform.id)
  const importDoc = importDocProp ?? getPlatformImportDoc(platform.id)
  const officialExportUrl =
    officialExportUrlProp ?? importDoc?.officialExportUrl
  const officialExportLabel =
    importDoc?.officialExportLabel ?? "Official export guide"

  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="flex max-h-[min(88dvh,44rem)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 items-center gap-0 border-b border-border/50 px-5 pe-12 pt-7 pb-5 text-center sm:px-7">
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
          {/* <DialogDescription className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {platform.summary}
          </DialogDescription> */}
          {/* <span
            className={cn(
              "mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold tracking-wide uppercase ring-1",
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
          </span> */}
        </DialogHeader>

        <div
          className={cn(
            "min-h-0 flex-1 px-5 py-5 text-start sm:px-7",
            scrollYClass
          )}
        >
          <div className="flex flex-col gap-6">
            {!enabled ? (
              <p className="rounded-xl bg-muted/70 px-3.5 py-3 text-sm leading-relaxed text-muted-foreground ring-1 ring-border/50">
                Import isn’t enabled yet — you can still prepare an export with
                the steps below.
              </p>
            ) : null}

            {officialExportUrl ? (
              <Button
                variant="outline"
                className="w-full justify-center"
                nativeButton={false}
                render={
                  <a
                    href={officialExportUrl}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
                onClick={(event) => {
                  event.preventDefault()
                  void openExternalUrl(officialExportUrl)
                }}
              >
                <ExternalLink data-icon="inline-start" />
                {officialExportLabel}
              </Button>
            ) : null}

            <section>
              <h3 className="mb-3 font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                How to download &amp; import
              </h3>
              <ol className="flex flex-col gap-4">
                {platform.steps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground font-heading text-xs font-semibold text-background tabular-nums"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="font-heading text-sm leading-snug font-medium tracking-tight text-foreground sm:text-base">
                        {step}
                      </p>
                      {index === platform.steps.length - 1 &&
                      platform.importHint ? (
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {platform.importHint}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {importDoc ? (
              <section>
                <SectionHeading>Documentation</SectionHeading>
                <h4 className="mb-2 font-heading text-base font-semibold tracking-tight text-foreground">
                  {importDoc.title}
                </h4>
                <div className="flex flex-col gap-2.5">
                  {importDoc.paragraphs.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="text-sm leading-relaxed text-foreground/80"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="flex flex-col gap-4 rounded-xl bg-muted/40 px-3.5 py-4 ring-1 ring-border/40">
              <div>
                <SectionHeading>Export path</SectionHeading>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {platform.exportPath}
                </p>
              </div>
              <div>
                <SectionHeading>Formats</SectionHeading>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {platform.formats}
                </p>
              </div>
              <div>
                <SectionHeading>What you can analyze</SectionHeading>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {platform.extractable}
                </p>
              </div>
            </div>

            {enabled ? (
              <p className="rounded-xl bg-primary/10 px-3.5 py-3 text-sm leading-relaxed text-foreground ring-1 ring-primary/20">
                Processing stays on your device. Your archive is not uploaded
                for analysis.
              </p>
            ) : null}
          </div>
        </div>
        <DialogFooter className="shrink-0 border-t border-border/60 px-5 py-3 sm:px-7">
          <DialogClose
            render={
              <Button variant="outline" size="default">
                Close
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
