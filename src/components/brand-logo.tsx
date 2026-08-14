import { cn } from "@/lib/utils"

type BrandLogoProps = {
  className?: string
  title?: string
}

/** In-app Social Wrapped mark. SVG for sharp UI; PNG is used for OS/favicon assets. */
export function BrandLogo({ className, title }: BrandLogoProps) {
  return (
    <img
      src="/social-wrapped.svg"
      alt=""
      title={title}
      draggable={false}
      className={cn("size-7 object-contain", className)}
    />
  )
}
