import { NavLink } from "react-router"

import { ModeToggle } from "@/components/mode-toggle"
import { MorphNavMenu } from "@/components/ui/animated/morph-nav-menu"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <NavLink
          to="/"
          className="text-sm font-semibold tracking-tight"
          end
        >
          Social Wrapped
        </NavLink>

        <MorphNavMenu />

        <ModeToggle />
      </div>
    </header>
  )
}
