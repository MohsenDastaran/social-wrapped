import { NavLink } from "react-router"

import { ModeToggle } from "@/components/mode-toggle"
import { NAV_ITEMS } from "@/components/nav-items"
import { cn } from "@/lib/utils"

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

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.id}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    buttonNavClass,
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "hover:bg-muted hover:text-foreground"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="size-4" />
                    <span aria-current={isActive ? "page" : undefined}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <ModeToggle />
      </div>
    </header>
  )
}

const buttonNavClass =
  "inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-xs/relaxed font-medium transition-all outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
