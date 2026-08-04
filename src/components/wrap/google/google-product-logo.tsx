import { cn } from "@/lib/utils"
import type { GoogleProductId } from "@/components/wrap/google/google-products"

/** Simple Icons brand SVGs — Google products under /public/images/platforms */
const LOGO_SRC: Record<GoogleProductId, string> = {
  youtube: "/images/platforms/youtube.svg",
  chrome: "/images/platforms/chrome.svg",
  fit: "/images/platforms/fit.svg",
  keep: "/images/platforms/keep.svg",
  calendar: "/images/platforms/calendar.svg",
  photos: "/images/platforms/photos.svg",
  "my-activity": "/images/platforms/google.svg",
  "access-log": "/images/platforms/google.svg",
}

type GoogleProductLogoProps = {
  id: GoogleProductId
  className?: string
  title?: string
}

export function GoogleProductLogo({
  id,
  className,
  title,
}: GoogleProductLogoProps) {
  return (
    <img
      src={LOGO_SRC[id]}
      alt=""
      title={title}
      draggable={false}
      className={cn("size-6 object-contain", className)}
    />
  )
}
