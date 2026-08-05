import { motion, type Easing, type Transition } from "motion/react"
import { NavLink } from "react-router"

import { NAV_ITEMS, type NavItem } from "@/components/nav-items"
import { cn } from "@/lib/utils"

const SPRING_CONFIG_TEXT = {
  type: "spring",
  stiffness: 320,
  damping: 32,
  mass: 1.3,
} as Transition

const EASE_CUBIC_CONFIG = {
  duration: 0.5,
  ease: [0.32, 0.72, 0, 1] as Easing,
} as Transition

/** Desktop primary nav with morphing hover (hidden on mobile — use BottomNav). */
export function MorphNavMenu({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Primary"
      className={cn("hidden items-center md:flex", className)}
    >
      <ul className="flex min-h-10 items-center gap-2 rounded-lg bg-card/80 p-1.5 ring-1 ring-border/60 md:gap-3">
        {NAV_ITEMS.map((item) => (
          <MorphNavItem key={item.id} item={item} />
        ))}
      </ul>
    </nav>
  )
}

function MorphNavItem({ item }: { item: NavItem }) {
  return (
    <li className="text-xs font-semibold md:text-sm">
      <NavLink
        to={item.to}
        end={item.to === "/"}
        className={({ isActive }) =>
          cn(
            "block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
            isActive && "bg-primary"
          )
        }
      >
        {({ isActive }) => (
          <motion.span
            className="relative block overflow-hidden rounded-md px-2.5 py-2"
            initial="initial"
            whileHover="hover"
          >
            {/* Base text layer - invisible normally, visible when active (highest z-index) */}
            <span
              className="relative z-30"
              style={{
                color: isActive ? "var(--primary-foreground)" : "transparent",
              }}
            >
              {item.label}
            </span>

            {/* Normal state text */}
            <motion.span
              className="absolute inset-0 z-2 flex h-full w-full items-center justify-center"
              style={{ color: isActive ? "transparent" : "var(--foreground)" }}
              initial={{ y: 0, scale: 1, rotate: 0 }}
              variants={{
                hover: isActive
                  ? {}
                  : {
                      y: -100,
                      scale: 0.5,
                      rotate: -30,
                    },
              }}
              transition={SPRING_CONFIG_TEXT}
            >
              {item.label}
            </motion.span>

            {/* Background fill animation */}
            <motion.span
              className="absolute inset-0 z-1 h-full w-full scale-x-150 overflow-hidden bg-primary"
              initial={{ y: 100, rotate: -40 }}
              variants={{
                hover: isActive
                  ? {}
                  : {
                      y: 0,
                      rotate: 0,
                    },
              }}
              transition={EASE_CUBIC_CONFIG}
              aria-hidden
            >
              <motion.span
                className="absolute inset-0 h-full w-full bg-foreground"
                initial={{ y: 150, rotate: -60 }}
                variants={{
                  hover: isActive
                    ? {}
                    : {
                        y: 0,
                        rotate: 0,
                      },
                }}
                transition={EASE_CUBIC_CONFIG}
              />
            </motion.span>

            {/* Hover text */}
            <motion.span
              className="absolute inset-0 z-2 flex items-center justify-center"
              style={{ color: isActive ? "transparent" : "var(--background)" }}
              initial={{ y: 180, rotate: -60, scale: 0.5 }}
              variants={{
                hover: isActive
                  ? {}
                  : {
                      y: 0,
                      rotate: 0,
                      scale: 1,
                    },
              }}
              transition={SPRING_CONFIG_TEXT}
            >
              {item.label}
            </motion.span>
          </motion.span>
        )}
      </NavLink>
    </li>
  )
}
