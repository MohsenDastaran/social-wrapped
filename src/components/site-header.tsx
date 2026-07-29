import { motion } from "motion/react"
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

        <nav aria-label="Primary" className="relative hidden items-center gap-0.5 md:flex">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.id}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "relative inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs/relaxed outline-none transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring/30",
                    isActive
                      ? "font-semibold text-primary"
                      : "font-medium text-muted-foreground hover:text-foreground"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <motion.span
                        layoutId="header-nav-active"
                        className="absolute inset-0 rounded-full bg-primary/15 ring-1 ring-primary/25"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    ) : null}
                    <Icon className="relative size-3.5" />
                    <span
                      className="relative"
                      aria-current={isActive ? "page" : undefined}
                    >
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
