"use client"

import { motion } from "framer-motion"
import NumberFlow, { continuous } from "@number-flow/react"
import { ArrowUpRight } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router"

import { AnimatedLines } from "@/components/animated-lines"
import { HIGH_PRIORITY_PLATFORMS } from "@/lib/platforms"

/** Home hero — primary/sky backdrop + CTA into wrap history. */
export function Hero() {
  const [hasAnimatedStats, setHasAnimatedStats] = useState(false)

  const stats = [
    { value: 100, suffix: "%", label: "On-device" },
    { value: HIGH_PRIORITY_PLATFORMS.length, suffix: "", label: "Platforms" },
    { value: 0, suffix: "", label: "Cloud uploads" },
    { value: 1, suffix: "", label: "Private story" },
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
      <div className="relative mx-auto w-full overflow-hidden rounded-3xl bg-linear-to-b from-sky-500 via-primary to-emerald-950 px-5 py-8 sm:px-8 sm:py-10">
        <AnimatedLines />

        <div className="relative z-10 flex flex-col items-center text-center">
          <motion.p
            className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-white/80 sm:text-xs"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            Social Wrapped
          </motion.p>

          <motion.h1
            className="font-heading max-w-xl text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05, ease: "easeOut" }}
          >
            Your wraps live here
          </motion.h1>

          <motion.p
            className="mt-2.5 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base"
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
            <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }}>
              <Link
                to="/history"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm"
              >
                Open history
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <ArrowUpRight className="size-3.5" />
                </span>
              </Link>
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
              <p className="text-2xl font-bold text-white sm:text-3xl">
                <NumberFlow
                  value={hasAnimatedStats ? stat.value : 0}
                  suffix={stat.suffix}
                  plugins={[continuous]}
                />
              </p>
              <p className="mt-0.5 text-xs text-white/70 sm:text-sm">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
