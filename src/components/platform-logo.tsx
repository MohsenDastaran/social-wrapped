import { cn } from "@/lib/utils"

/** Simple Icons brand SVGs in /public/images/platforms */
export type PlatformLogoId =
  | "telegram"
  | "whatsapp"
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

type PlatformLogoProps = {
  id: PlatformLogoId
  className?: string
  title?: string
}

export function PlatformLogo({ id, className, title }: PlatformLogoProps) {
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
