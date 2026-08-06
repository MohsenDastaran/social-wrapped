"use client"

import { motion } from "framer-motion"

/** Alternating primary (green) and sky stripes for the hero backdrop. */
const stripes = [
  { width: 88, baseHeight: 55, color: "color-mix(in oklch, var(--primary) 70%, transparent)" },
  { width: 92, baseHeight: 65, color: "color-mix(in oklch, oklch(0.62 0.14 230) 65%, transparent)" },
  { width: 88, baseHeight: 80, color: "color-mix(in oklch, var(--primary) 78%, transparent)" },
  { width: 92, baseHeight: 90, color: "color-mix(in oklch, oklch(0.55 0.13 225) 72%, transparent)" },
  { width: 88, baseHeight: 100, color: "color-mix(in oklch, var(--primary) 88%, transparent)" },
  { width: 92, baseHeight: 95, color: "color-mix(in oklch, oklch(0.5 0.12 220) 80%, transparent)" },
  { width: 88, baseHeight: 85, color: "color-mix(in oklch, var(--primary) 80%, transparent)" },
  { width: 92, baseHeight: 70, color: "color-mix(in oklch, oklch(0.58 0.13 228) 68%, transparent)" },
  { width: 88, baseHeight: 60, color: "color-mix(in oklch, var(--primary) 65%, transparent)" },
]

export function AnimatedLines() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-end justify-center overflow-hidden">
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
