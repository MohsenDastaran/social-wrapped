import { FileArchive, Lock, Smartphone, Upload } from "lucide-react"
import { Link } from "react-router"

import { PlatformCardFace } from "@/components/platform-card-face"
import {
  PlatformImportHelpDialog,
  PlatformImportHelpTrigger,
} from "@/components/platform-import-help-dialog"
import { PlatformLogo } from "@/components/platform-logo"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import {
  isAndroidOnlyPlatform,
  isPlatformEnabled,
  platformImportAreaViewTransitionName,
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
  const androidOnly = isAndroidOnlyPlatform(platform.id)
  const deviceImport = platform.importSource === "device"
  const importPath = platformImportPath(platform.id)
  const cardDescription =
    description ??
    (deviceImport
      ? platform.summary
      : `Ready for ${platform.acceptedFiles.join(" or ")} exports.`)

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
          <span className="h-11 w-[3.75rem] shrink-0 sm:w-8" aria-hidden />
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
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[0.7rem] font-medium text-muted-foreground">
            {androidOnly ? (
              <Smartphone className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <FileArchive className="size-3.5 shrink-0" aria-hidden />
            )}
            <span className="truncate">
              {androidOnly
                ? disabled
                  ? "Android only"
                  : "On this phone"
                : platform.acceptedFiles.join(" · ")}
            </span>
          </span>
          {!disabled ? (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <span
                style={{
                  viewTransitionName: platformImportAreaViewTransitionName(
                    platform.id
                  ),
                }}
                className="flex size-8 items-center justify-center rounded-full bg-background ring-1 ring-foreground/10"
                aria-hidden
              >
                <Upload className="size-3.5 text-primary" />
              </span>
            </span>
          ) : (
            <Lock className="size-3.5 text-muted-foreground" aria-hidden />
          )}
        </div>
      </div>

      {disabled ? null : (
        <Link
          to={importPath}
          viewTransition
          aria-label={
            deviceImport ? `Analyze ${platform.name}` : `Import ${platform.name}`
          }
          className="absolute inset-0 z-10 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
      )}

      <div
        className="absolute top-4 end-4 z-20 flex h-11 items-center"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <PlatformImportHelpDialog
          platform={platform}
          trigger={
            <PlatformImportHelpTrigger platform={platform} layout="compact" />
          }
        />
      </div>
    </Card>
  )

  if (disabled) {
    return <div aria-disabled="true">{featuredCard}</div>
  }

  return featuredCard
}
