import { useMemo, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import {
  HIGH_PRIORITY_PLATFORMS,
} from "@/lib/platforms"
import { PlatformGuideCard } from "@/components/platform-guide-card"
import { PlatformSearchInput } from "@/components/platform-search-input"

export function DocsPage() {
  const [query, setQuery] = useState("")
  const reduceMotion = useReducedMotion()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return HIGH_PRIORITY_PLATFORMS

    return HIGH_PRIORITY_PLATFORMS.filter((platform) => {
      const haystack = [
        platform.name,
        platform.summary,
        platform.exportPath,
        platform.formats,
        platform.extractable,
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [query])

  return (
    <div className="flex w-full max-w-2xl flex-col items-stretch text-start">
      <header className="mb-6 px-1 text-center sm:mb-8">
        <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-sm sm:tracking-[0.2em]">
          Import guides
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Download & import your data
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          Official exports from each platform, analyzed locally. Tap a card for
          download & import steps — only Telegram import is ready today.
        </p>
      </header>

      <div className="sticky top-14 z-20 -mx-1 mb-4 bg-background/80 px-1 py-2 backdrop-blur-md supports-backdrop-filter:bg-background/70">
        <PlatformSearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery("")}
          placeholder="Search platforms…"
        />
        <p className="mt-2 px-1 text-xs text-muted-foreground" aria-live="polite">
          {filtered.length === HIGH_PRIORITY_PLATFORMS.length
            ? `${filtered.length} platforms`
            : `${filtered.length} of ${HIGH_PRIORITY_PLATFORMS.length} platforms`}
        </p>
      </div>

      <motion.ul layout className="flex list-none flex-col gap-3 p-0">
        <AnimatePresence mode="popLayout" initial={false}>
          {filtered.map((platform, index) => (
            <motion.li
              key={platform.id}
              layout={!reduceMotion}
              initial={
                reduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -8, scale: 0.96 }
              }
              transition={{
                duration: 0.22,
                delay: reduceMotion ? 0 : Math.min(index * 0.03, 0.15),
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <PlatformGuideCard platform={platform} />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      {filtered.length === 0 ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 text-center text-sm text-muted-foreground"
        >
          No platforms match “{query.trim()}”.
        </motion.p>
      ) : null}
    </div>
  )
}
