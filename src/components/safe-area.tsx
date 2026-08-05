import type { CSSProperties, ComponentProps } from "react"

import { cn } from "@/lib/utils"

export type SafeAreaEdge = "top" | "right" | "bottom" | "left"

const ALL_EDGES: SafeAreaEdge[] = ["top", "right", "bottom", "left"]

type SafeAreaProps = ComponentProps<"div"> & {
  /** Which edges receive safe-area padding. Defaults to all four. */
  edges?: SafeAreaEdge[]
}

function paddingForEdges(edges: SafeAreaEdge[]): CSSProperties {
  const style: CSSProperties = {}
  if (edges.includes("top")) {
    style.paddingTop = "var(--safe-area-inset-top)"
  }
  if (edges.includes("right")) {
    style.paddingRight = "var(--safe-area-inset-right)"
  }
  if (edges.includes("bottom")) {
    style.paddingBottom = "var(--safe-area-inset-bottom)"
  }
  if (edges.includes("left")) {
    style.paddingLeft = "var(--safe-area-inset-left)"
  }
  return style
}

/** Pads children by CSS `--safe-area-inset-*` (native-injected on Android). */
export function SafeArea({
  edges = ALL_EDGES,
  className,
  style,
  ...props
}: SafeAreaProps) {
  return (
    <div
      className={cn(className)}
      style={{ ...paddingForEdges(edges), ...style }}
      {...props}
    />
  )
}

SafeArea.displayName = "SafeArea"
