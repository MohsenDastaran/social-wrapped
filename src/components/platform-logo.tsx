import { MessageSquare, Phone, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Simple Icons brand SVGs in /public/images/platforms, plus on-device icons. */
export type PlatformLogoId =
  | "telegram"
  | "whatsapp"
  | "sms"
  | "calls"
  | "x"
  | "google"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "spotify"
  | "apple-music"
  | "youtube"
  | "linkedin"
  | "chatgpt"

/** Logos that ship as black fills — invert in dark mode. */
const MONOCHROME_LOGOS = new Set<PlatformLogoId>(["x", "tiktok", "chatgpt"])

const DEVICE_ICONS = {
  sms: MessageSquare,
  calls: Phone,
} as const satisfies Partial<Record<PlatformLogoId, LucideIcon>>

type PlatformLogoProps = {
  id: PlatformLogoId
  className?: string
  title?: string
}

export function PlatformLogo({ id, className, title }: PlatformLogoProps) {
  if (id === "sms" || id === "calls") {
    const DeviceIcon = DEVICE_ICONS[id]
    return (
      <DeviceIcon
        aria-hidden={!title}
        aria-label={title}
        className={cn("size-6 text-foreground", className)}
        strokeWidth={1.75}
      />
    )
  }

  return (
    <img
      src={`/images/platforms/${id}.svg`}
      alt=""
      title={title}
      draggable={false}
      className={cn(
        "size-6 object-contain",
        MONOCHROME_LOGOS.has(id) && "dark:invert",
        className
      )}
    />
  )
}
