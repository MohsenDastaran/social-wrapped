import { cn } from "@/lib/utils"

/**
 * Vertical scroll containment for list panels.
 * Thumb/track styling is global in `index.css` (thin + primary).
 */
export const scrollYClass = "overflow-y-auto overscroll-contain"

/** Fixed-height list panel scroll (Instagram / Google ranked lists). */
export const listScrollClass = cn("h-72", scrollYClass)

/** Cap-height list scroll (LinkedIn / Instagram social panels). */
export const listScrollMaxClass = cn("max-h-72", scrollYClass)

/** Fills leftover height in equal-height card pairs (ranked lists). */
export const listScrollFillClass = cn("min-h-0 flex-1", scrollYClass)
