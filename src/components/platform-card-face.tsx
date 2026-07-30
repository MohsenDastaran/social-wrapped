import { ChevronRight, Lock } from "lucide-react"

import { PlatformLogo } from "@/components/platform-logo"
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { isPlatformEnabled, type PlatformConfig } from "@/lib/platforms"
import { cn } from "@/lib/utils"

type PlatformCardFaceProps = {
  platform: PlatformConfig
  /** Override summary line (defaults to platform.summary). */
  description?: string
  className?: string
}

/** Shared face for guide + home import cards. */
export function PlatformCardFace({
  platform,
  description = platform.summary,
  className,
}: PlatformCardFaceProps) {
  const disabled = !isPlatformEnabled(platform.id)

  return (
    <Card
      className={cn(
        "flex flex-row items-center gap-4 bg-card py-5 pe-4 ps-5 shadow-lg ring-1",
        platform.accentClass,
        disabled
          ? "cursor-not-allowed opacity-55 saturate-50"
          : "transition-[box-shadow,transform] duration-300 group-hover/platform:shadow-xl group-hover/platform:ring-foreground/20 group-active/platform:scale-[0.99]",
        className
      )}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-background ring-1 ring-foreground/10">
        <PlatformLogo id={platform.id} title={platform.name} className="size-7" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <CardTitle className="font-heading text-base font-semibold tracking-tight sm:text-lg">
            {platform.name}
          </CardTitle>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide",
              !disabled
                ? "bg-primary/15 text-primary ring-1 ring-primary/25"
                : "bg-muted text-muted-foreground ring-1 ring-border"
            )}
          >
            {!disabled ? (
              "Available"
            ) : (
              <>
                <Lock className="size-2.5" aria-hidden />
                Soon
              </>
            )}
          </span>
        </div>
        <CardDescription className="line-clamp-2 text-sm leading-relaxed">
          {description}
        </CardDescription>
      </div>

      {!disabled ? (
        <span
          className={cn(
            "relative flex size-10 shrink-0 items-center justify-center rounded-full",
            "bg-muted text-foreground ring-1 ring-foreground/10",
            "transition-colors duration-300",
            "group-hover/platform:bg-primary group-hover/platform:text-primary-foreground group-hover/platform:ring-primary/30"
          )}
          aria-hidden
        >
          <ChevronRight className="size-4 transition-transform duration-300 ease-out group-hover/platform:translate-x-0.5 rtl:rotate-180 rtl:group-hover/platform:-translate-x-0.5" />
          <ChevronRight className="absolute size-4 opacity-0 transition-all duration-300 ease-out group-hover/platform:translate-x-1 group-hover/platform:opacity-40 rtl:rotate-180 rtl:group-hover/platform:-translate-x-1" />
        </span>
      ) : (
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground ring-1 ring-border"
          aria-hidden
        >
          <Lock className="size-3.5" />
        </span>
      )}
    </Card>
  )
}
