import type { ReactNode } from "react"
import { ArrowUpRight, FileArchive, Lock } from "lucide-react"
import { Link } from "react-router"

import { PlatformCardFace } from "@/components/platform-card-face"
import { PlatformLogo } from "@/components/platform-logo"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
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
import {
  isPlatformEnabled,
  platformImportPath,
  type PlatformConfig,
} from "@/lib/platforms"
import { cn } from "@/lib/utils"

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-heading mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h3>
  )
}

function PlatformGuideDialogBody({ platform }: { platform: PlatformConfig }) {
  const enabled = isPlatformEnabled(platform.id)

  return (
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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 text-start sm:px-7">
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
                  {index === platform.steps.length - 1 && platform.importHint ? (
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
  )
}

type PlatformGuideCardProps = {
  platform: PlatformConfig
  className?: string
  /** Controlled open — used by Docs deep-links (`?platform=`). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/** Docs card — opens export/import instructions in a dialog. */
export function PlatformGuideCard({
  platform,
  className,
  open,
  onOpenChange,
}: PlatformGuideCardProps) {
  const disabled = !isPlatformEnabled(platform.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {disabled ? (
        <div aria-disabled="true" className="w-full">
          <PlatformCardFace platform={platform} className={className} />
        </div>
      ) : (
        <DialogTrigger
          render={
            <button
              type="button"
              className={cn(
                "group/platform w-full cursor-pointer text-start outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              )}
            >
              <PlatformCardFace platform={platform} className={className} />
            </button>
          }
        />
      )}
      <PlatformGuideDialogBody platform={platform} />
    </Dialog>
  )
}

type PlatformImportCardProps = {
  platform: PlatformConfig
  /** Optional card description override. */
  description?: string
  /** Richer composition intended for the main platform picker. */
  featured?: boolean
  className?: string
}

/** Home card — navigates to the shared import page for this platform. */
export function PlatformImportCard({
  platform,
  description,
  featured = false,
  className,
}: PlatformImportCardProps) {
  const disabled = !isPlatformEnabled(platform.id)
  const cardDescription =
    description ?? `Ready for ${platform.acceptedFiles.join(" or ")} exports.`

  if (!featured) {
    if (disabled) {
      return (
        <div aria-disabled="true" className="w-full">
          <PlatformCardFace
            platform={platform}
            description={cardDescription}
            className={className}
          />
        </div>
      )
    }

    return (
      <Link
        to={platformImportPath(platform.id)}
        className={cn(
          "group/platform block w-full text-start outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
      >
        <PlatformCardFace
          platform={platform}
          description={cardDescription}
          className={className}
        />
      </Link>
    )
  }

  const featuredCard = (
    <Card
      className={cn(
        "group/home-card relative min-h-44 overflow-hidden bg-card p-0 shadow-[0_12px_40px_-24px] shadow-foreground/35 ring-1",
        platform.accentClass,
        disabled
          ? "cursor-not-allowed opacity-55 saturate-50"
          : "transition-[box-shadow,transform,border-color] duration-500 hover:-translate-y-1 hover:shadow-[0_22px_44px_-22px] hover:shadow-foreground/40",
        className
      )}
    >
      <div className="pointer-events-none absolute -inset-e-12 -top-14 size-48 rounded-full bg-primary/10 blur-3xl transition-transform duration-700 group-hover/home-card:scale-125" />
      <div className="pointer-events-none absolute -bottom-20 inset-e-20 size-40 rounded-full bg-muted blur-3xl" />

      <div className="relative flex h-full min-h-44 flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-4">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-background/90 shadow-sm ring-1 ring-foreground/10 transition-transform duration-500 group-hover/home-card:-rotate-6 group-hover/home-card:scale-110">
            <PlatformLogo
              id={platform.id}
              title={platform.name}
              className="size-8 drop-shadow-sm"
            />
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] ring-1",
              disabled
                ? "bg-muted text-muted-foreground ring-border"
                : "bg-primary/15 text-primary ring-primary/25"
            )}
          >
            {disabled ? (
              <>
                <Lock className="size-3" aria-hidden />
                Coming soon
              </>
            ) : (
              "Import ready"
            )}
          </span>
        </div>

        <div className="mt-7">
          <CardTitle className="font-heading text-xl font-semibold tracking-tight">
            {platform.name}
          </CardTitle>
          <CardDescription className="mt-1.5 max-w-[30ch] text-sm leading-relaxed">
            {cardDescription}
          </CardDescription>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <FileArchive className="size-3.5" aria-hidden />
            {platform.acceptedFiles.join(" · ")}
          </span>
          {!disabled ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              Start import
              <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-300 group-hover/home-card:translate-x-1 group-hover/home-card:-translate-y-1 rtl:group-hover/home-card:-translate-x-1">
                <ArrowUpRight className="size-3.5" aria-hidden />
              </span>
            </span>
          ) : (
            <Lock className="size-4 text-muted-foreground" aria-hidden />
          )}
        </div>
      </div>
    </Card>
  )

  if (disabled) {
    return <div aria-disabled="true">{featuredCard}</div>
  }

  return (
    <Link
      to={platformImportPath(platform.id)}
      className={cn(
        "group/home-card block w-full text-start outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
    >
      {featuredCard}
    </Link>
  )
}
