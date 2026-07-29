import { AnimatePresence, motion } from "motion/react"
import { useSyncExternalStore } from "react"

import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)"

function subscribeSystemTheme(onStoreChange: () => void) {
  const media = window.matchMedia(COLOR_SCHEME_QUERY)
  media.addEventListener("change", onStoreChange)
  return () => media.removeEventListener("change", onStoreChange)
}

function getSystemIsDark() {
  return window.matchMedia(COLOR_SCHEME_QUERY).matches
}

function useResolvedDark(theme: string) {
  const systemIsDark = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemIsDark,
    () => false
  )

  if (theme === "dark") return true
  if (theme === "light") return false
  return systemIsDark
}

export function ModeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const isDark = useResolvedDark(theme)

  return (
    <motion.button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      className={cn(
        "relative inline-flex size-9 items-center justify-center overflow-hidden rounded-full",
        "border border-border/70 bg-background/80 text-foreground shadow-sm backdrop-blur-sm",
        "outline-none transition-colors duration-300",
        "hover:border-ring/50 hover:bg-muted/80",
        "focus-visible:ring-2 focus-visible:ring-ring/40",
        "dark:border-border/50 dark:bg-card/70 dark:hover:bg-muted/50",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-500",
          "bg-[radial-gradient(circle_at_30%_30%,rgba(251,191,36,0.35),transparent_55%)]",
          !isDark && "opacity-100"
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-500",
          "bg-[radial-gradient(circle_at_70%_30%,rgba(96,165,250,0.28),transparent_55%)]",
          isDark && "opacity-100"
        )}
      />

      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="sun"
            initial={{ opacity: 0, rotate: -90, scale: 0.4, y: 6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1, y: 0 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.4, y: -6 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className="relative z-10 inline-flex text-amber-400"
          >
            <SunIcon />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ opacity: 0, rotate: 90, scale: 0.4, y: -6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1, y: 0 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.4, y: 6 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className="relative z-10 inline-flex text-slate-700 dark:text-slate-200"
          >
            <MoonIcon />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

function SunIcon() {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      className="size-4.5"
      initial="hidden"
      animate="visible"
    >
      <motion.circle
        cx="12"
        cy="12"
        r="4"
        fill="currentColor"
        variants={{
          hidden: { scale: 0.6, opacity: 0 },
          visible: {
            scale: 1,
            opacity: 1,
            transition: { type: "spring", stiffness: 360, damping: 16 },
          },
        }}
      />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <motion.line
          key={deg}
          x1="12"
          y1="3.2"
          x2="12"
          y2="5.4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          transform={`rotate(${deg} 12 12)`}
          variants={{
            hidden: { opacity: 0, pathLength: 0 },
            visible: {
              opacity: 1,
              pathLength: 1,
              transition: {
                delay: 0.05 + i * 0.03,
                duration: 0.28,
                ease: "easeOut",
              },
            },
          }}
        />
      ))}
    </motion.svg>
  )
}

function MoonIcon() {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-4.5"
      initial={{ rotate: -20 }}
      animate={{ rotate: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 16 }}
    >
      <path d="M20.2 14.3A8.2 8.2 0 0 1 9.7 3.8a8.3 8.3 0 1 0 10.5 10.5Z" />
    </motion.svg>
  )
}
