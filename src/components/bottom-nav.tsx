import { motion } from "motion/react"
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
                  "relative flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium whitespace-nowrap transition-all duration-300 ease-out",
                  isActive
                    ? "bg-primary pr-4 text-primary-foreground shadow-md"
                    : "text-background/70 hover:bg-background/10 hover:text-background"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-transform duration-300",
                      isActive && "scale-110"
                    )}
                  />
                  <span
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-out",
                      isActive
                        ? "max-w-24 font-semibold opacity-100"
                        : "max-w-0 opacity-0"
                    )}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-primary-foreground/10"
                      layoutId="activeNavIndicator"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
