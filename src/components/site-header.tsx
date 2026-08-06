import { NavLink } from "react-router"

import { ModeToggle } from "@/components/mode-toggle"
import { MorphNavMenu } from "@/components/ui/animated/morph-nav-menu"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="relative mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <NavLink
          to="/"
          className="relative z-10 text-sm font-semibold tracking-tight"
          end
        >
          Social Wrapped
        </NavLink>

        <MorphNavMenu className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10">
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
