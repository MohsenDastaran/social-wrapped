"use client"

import { motion } from "framer-motion"

/** Alternating primary + sky stripes — opacity tuned for both themes. */
const stripes = [
  { width: 88, baseHeight: 55, color: "color-mix(in oklch, var(--primary) 45%, transparent)" },
  { width: 92, baseHeight: 65, color: "color-mix(in oklch, oklch(0.65 0.12 230) 40%, transparent)" },
  { width: 88, baseHeight: 80, color: "color-mix(in oklch, var(--primary) 55%, transparent)" },
  { width: 92, baseHeight: 90, color: "color-mix(in oklch, oklch(0.58 0.12 225) 48%, transparent)" },
  { width: 88, baseHeight: 100, color: "color-mix(in oklch, var(--primary) 62%, transparent)" },
  { width: 92, baseHeight: 95, color: "color-mix(in oklch, oklch(0.55 0.11 220) 52%, transparent)" },
  { width: 88, baseHeight: 85, color: "color-mix(in oklch, var(--primary) 50%, transparent)" },
  { width: 92, baseHeight: 70, color: "color-mix(in oklch, oklch(0.62 0.12 228) 42%, transparent)" },
  { width: 88, baseHeight: 60, color: "color-mix(in oklch, var(--primary) 40%, transparent)" },
]

export function AnimatedLines() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-end justify-center overflow-hidden opacity-80 dark:opacity-90">
      {stripes.map((stripe, i) => {
        const minH = stripe.baseHeight * 0.35
        const maxH = stripe.baseHeight
        const duration = 1.2 + Math.random() * 1.4
        const delay = i * 0.15

        return (
          <motion.div
            key={i}
            className="origin-bottom rounded-t-sm"
            style={{
              width: stripe.width,
              background: `linear-gradient(to top, ${stripe.color}, transparent)`,
            }}
            initial={{ height: `${minH}%` }}
            animate={{
              height: [
                `${minH}%`,
                `${maxH}%`,
                `${minH + (maxH - minH) * 0.4}%`,
                `${maxH * 0.85}%`,
                `${minH}%`,
              ],
            }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeInOut",
            }}
          />
        )
      })}
    </div>
  )
}
