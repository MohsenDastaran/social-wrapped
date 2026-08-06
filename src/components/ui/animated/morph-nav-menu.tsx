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

const ACTIVE_PILL_SPRING = {
  type: "spring",
  stiffness: 380,
  damping: 30,
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
        className="relative block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        {({ isActive }) => (
          <>
            {isActive ? (
              <motion.span
                layoutId="desktop-nav-active"
                className="absolute inset-0 rounded-md bg-primary shadow-sm ring-1 ring-primary/30"
                transition={ACTIVE_PILL_SPRING}
                aria-hidden
              />
            ) : null}

            {isActive ? (
              <span
                className="relative z-10 block px-3 py-2 text-primary-foreground"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <MorphNavItemHover label={item.label} />
            )}
          </>
        )}
      </NavLink>
    </li>
  )
}

function MorphNavItemHover({ label }: { label: string }) {
  return (
    <motion.span
      className="relative block overflow-hidden rounded-md px-3 py-2 text-foreground"
      initial="initial"
      whileHover="hover"
      variants={{
        initial: {},
        hover: {},
      }}
    >
      <span className="relative text-transparent">{label}</span>

      <motion.span
        className="absolute inset-0 z-2 flex h-full w-full items-center justify-center text-foreground"
        initial={{ y: 0, scale: 1, rotate: 0 }}
        variants={{
          hover: {
            y: -100,
            scale: 0.5,
            rotate: -30,
          },
        }}
        transition={SPRING_CONFIG_TEXT}
      >
        {label}
      </motion.span>

      <motion.span
        className="absolute inset-0 z-1 h-full w-full scale-x-150 overflow-hidden bg-primary"
        initial={{ y: 100, rotate: -40 }}
        variants={{
          hover: {
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
            hover: {
              y: 0,
              rotate: 0,
            },
          }}
          transition={EASE_CUBIC_CONFIG}
        />
      </motion.span>

      <motion.span
        className="absolute inset-0 z-2 flex items-center justify-center text-background"
        initial={{ y: 180, rotate: -60, scale: 0.5 }}
        variants={{
          hover: {
            y: 0,
            rotate: 0,
            scale: 1,
          },
        }}
        transition={SPRING_CONFIG_TEXT}
      >
        {label}
      </motion.span>
    </motion.span>
  )
}
