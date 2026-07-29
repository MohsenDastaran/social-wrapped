import { DotmSquare12 } from "@/components/ui/dotm-square-12"
import { cn } from "@/lib/utils"

/** Shared brand animation for every loader size. */
const LOADER_ANIMATION = {
  speed: 1.35,
  pattern: "full" as const,
  color: "#42b2ae",
  animated: true as const,
  opacityBase: 0.12,
  opacityMid: 0.42,
  opacityPeak: 0.98,
}

const LOADER_SIZES = {
  /** Inline spinner for buttons and compact UI. */
  sm: { size: 18, dotSize: 2.6 },
  /** Medium inline / card loading. */
  md: { size: 36, dotSize: 5.2 },
  /** Full-page / boot splash. */
  lg: { size: 108, dotSize: 15.5 },
} as const

export type AppLoaderSize = keyof typeof LOADER_SIZES

interface AppLoaderProps {
  /** `sm` for buttons, `md` for cards, `lg` for full-page splash. */
  size?: AppLoaderSize
  /** When true (default for `lg`), fills the viewport as a splash screen. */
  fullscreen?: boolean
  className?: string
  label?: string
}

/** Project-wide loading indicator — reusable DotmSquare12 at any size. */
export function AppLoader({
  size = "lg",
  fullscreen,
  className,
  label = "Loading",
}: AppLoaderProps) {
  const dims = LOADER_SIZES[size]
  const isFullscreen = fullscreen ?? size === "lg"

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center",
        isFullscreen &&
          "flex min-h-svh w-full flex-col gap-4 bg-background",
        className
      )}
    >
      <DotmSquare12
        {...LOADER_ANIMATION}
        size={dims.size}
        dotSize={dims.dotSize}
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}
