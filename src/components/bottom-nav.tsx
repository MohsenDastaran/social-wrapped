import { NavLink } from "react-router"

import { NAV_ITEMS } from "@/components/nav-items"
import { cn } from "@/lib/utils"

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 md:hidden"
    >
      <div className="flex items-center gap-1 rounded-full border border-border/40 bg-foreground/95 p-1.5 text-background shadow-lg shadow-black/10">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium whitespace-nowrap",
                  isActive
                    ? "bg-primary pr-4 font-semibold text-primary-foreground"
                    : "text-background/70"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="size-4 shrink-0" />
                  {isActive ? <span>{item.label}</span> : null}
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
