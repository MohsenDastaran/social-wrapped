import { ArrowUpRight, FileArchive, Lock, Sparkles } from "lucide-react"
import { Link } from "react-router"

import { PlatformCardFace } from "@/components/platform-card-face"
import { PlatformLogo } from "@/components/platform-logo"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import {
  isPlatformEnabled,
  platformImportPath,
  platformLogoViewTransitionName,
  type PlatformConfig,
} from "@/lib/platforms"
import { cn } from "@/lib/utils"

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
  const importPath = platformImportPath(platform.id)
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
        to={importPath}
        viewTransition
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
        "group/home-card relative overflow-hidden bg-card p-0 shadow-[0_12px_40px_-24px] ring-1 shadow-foreground/35",
        platform.accentClass,
        disabled
          ? "cursor-not-allowed opacity-55 saturate-50"
          : "transition-[box-shadow,border-color] duration-500 hover:shadow-[0_18px_36px_-22px] hover:shadow-foreground/40",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-linear-to-br",
          platform.gradientClass
        )}
      />
      <div className="pointer-events-none absolute -inset-e-10 -top-12 size-36 rounded-full bg-white/40 blur-2xl dark:bg-white/10" />
      <div className="pointer-events-none absolute -inset-s-8 -bottom-16 size-32 rounded-full bg-foreground/5 blur-2xl" />

      <div className="relative flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          {/*
            Unique view-transition-name on a non-transformed box so home ↔
            import can morph. Hover scale/rotate stays on an inner wrapper.
          */}
          <span
            style={{
              viewTransitionName: platformLogoViewTransitionName(platform.id),
            }}
            className="flex size-11 items-center justify-center rounded-xl bg-background/90 shadow-sm ring-1 ring-foreground/10"
          >
            <span className="flex size-full items-center justify-center transition-transform duration-500 group-hover/home-card:scale-105 group-hover/home-card:-rotate-6">
              <PlatformLogo
                id={platform.id}
                title={platform.name}
                className="size-6 drop-shadow-sm"
              />
            </span>
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-bold tracking-[0.16em] uppercase shadow-sm",
              disabled
                ? "bg-muted text-muted-foreground ring-1 ring-border"
                : "bg-primary text-primary-foreground ring-1 shadow-primary/35 ring-primary/50"
            )}
          >
            {disabled ? (
              <>
                <Lock className="size-3" aria-hidden />
                Soon
              </>
            ) : (
              <>
                <span className="relative flex size-1.5" aria-hidden>
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-foreground/55" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary-foreground" />
                </span>
                Ready
                <Sparkles className="size-3 opacity-90" aria-hidden />
              </>
            )}
          </span>
        </div>

        <div>
          <CardTitle className="font-heading text-lg font-semibold tracking-tight">
            {platform.name}
          </CardTitle>
          <CardDescription className="mt-1 line-clamp-2 text-xs leading-relaxed sm:text-sm">
            {cardDescription}
          </CardDescription>
        </div>

        <div className="flex items-center justify-between gap-3 pt-0.5">
          <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-muted-foreground">
            <FileArchive className="size-3.5" aria-hidden />
            {platform.acceptedFiles.join(" · ")}
          </span>
          {!disabled ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              Import
              <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-300 group-hover/home-card:translate-x-0.5 group-hover/home-card:-translate-y-0.5 rtl:group-hover/home-card:-translate-x-0.5">
                <ArrowUpRight className="size-3" aria-hidden />
              </span>
            </span>
          ) : (
            <Lock className="size-3.5 text-muted-foreground" aria-hidden />
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
      to={importPath}
      viewTransition
      className={cn(
        "group/home-card block w-full text-start outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
    >
      {featuredCard}
    </Link>
  )
}
