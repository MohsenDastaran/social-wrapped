"use client"

import { motion } from "framer-motion"
import NumberFlow, { continuous } from "@number-flow/react"
import { useEffect, useState } from "react"

import { AnimatedLines } from "@/components/animated-lines"
import { HIGH_PRIORITY_PLATFORMS } from "@/lib/platforms"
import { ArrowDown } from "lucide-react"

function scrollToPlatforms() {
  const el = document.getElementById("platforms")
  if (!el) return
  el.scrollIntoView({ behavior: "smooth", block: "start" })
  history.replaceState(null, "", "#platforms")
}

/** Home hero — theme-aware primary/sky backdrop + CTA into wrap history. */
export function Hero() {
  const [hasAnimatedStats, setHasAnimatedStats] = useState(false)

  const stats = [
    { value: 100, suffix: "%", label: "Runs on your device" },
    { value: 0, suffix: "", label: "Cloud uploads" },
    { value: 0, suffix: "", label: "API requests" },
    { value: HIGH_PRIORITY_PLATFORMS.length, suffix: "", label: "Platforms" },
  ]

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setHasAnimatedStats(true)
    })

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [])

  return (
    <section className="relative mb-7 w-full sm:mb-9">
      <div
        className="relative mx-auto w-full overflow-hidden rounded-3xl border border-border/60 bg-card px-5 py-8 shadow-[0_18px_50px_-34px] shadow-foreground/40 sm:px-8 sm:py-10 dark:shadow-black/50"
        style={{
          backgroundImage: `
            linear-gradient(
              to bottom,
              color-mix(in oklch, oklch(0.72 0.12 230) 28%, var(--card)),
              color-mix(in oklch, var(--primary) 22%, var(--card)) 48%,
              color-mix(in oklch, var(--primary) 38%, var(--card))
            )
          `,
        }}
      >
        <div className="pointer-events-none absolute -inset-s-16 -top-20 size-56 rounded-full bg-sky-400/25 blur-3xl dark:bg-sky-400/20" />
        <div className="pointer-events-none absolute -inset-e-12 -bottom-28 size-60 rounded-full bg-primary/30 blur-3xl dark:bg-primary/40" />
        <AnimatedLines />

        <div className="relative z-10 flex flex-col items-center text-center">
          <motion.p
            className="mb-2 text-[0.7rem] font-semibold tracking-[0.2em] text-primary uppercase sm:text-xs"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            Social Wrapped
          </motion.p>

          <motion.h1
            className="max-w-xl font-heading text-2xl leading-tight font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05, ease: "easeOut" }}
          >
            Your wraps live here
          </motion.h1>

          <motion.p
            className="mt-2.5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
          >
            Reopen past exports, stories, and chat insights anytime — everything
            stays on this device until you clear it.
          </motion.p>

          <motion.div
            className="mt-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25, ease: "easeOut" }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <a
                href="#platforms"
                onClick={(event) => {
                  event.preventDefault()
                  scrollToPlatforms()
                }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm ring-1 ring-primary/30"
              >
                Browse Platforms
                <ArrowDown className="size-3.5" />
              </a>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          className="relative z-10 mt-8 grid grid-cols-2 gap-4 sm:mt-10 md:grid-cols-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-foreground sm:text-3xl">
                <NumberFlow
                  value={hasAnimatedStats ? stat.value : 0}
                  suffix={stat.suffix}
                  plugins={[continuous]}
                />
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
