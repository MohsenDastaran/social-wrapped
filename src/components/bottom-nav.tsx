import { NavLink } from "react-router"

import { NAV_ITEMS } from "@/components/nav-items"
import { cn } from "@/lib/utils"

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 md:hidden"
    >
      <div className="flex items-center gap-1 rounded-full border border-border/40 bg-foreground/95 p-1.5 text-background shadow-lg shadow-black/10 backdrop-blur">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-all duration-300 ease-out",
                  isActive
                    ? "bg-background pr-4 text-foreground"
                    : "text-background/70 hover:text-background"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="size-4 shrink-0" />
                  <span
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-out",
                      isActive ? "max-w-24 opacity-100" : "max-w-0 opacity-0"
                    )}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
