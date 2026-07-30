import { useMemo, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { PlatformImportCard } from "@/components/platform-guide-card"
import { PlatformSearchInput } from "@/components/platform-search-input"
import { HIGH_PRIORITY_PLATFORMS } from "@/lib/platforms"

export function HomePage() {
  const [query, setQuery] = useState("")
  const reduceMotion = useReducedMotion()
  const filteredPlatforms = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return HIGH_PRIORITY_PLATFORMS

    return HIGH_PRIORITY_PLATFORMS.filter((platform) =>
      [
        platform.name,
        platform.summary,
        platform.acceptedFiles.join(" "),
        platform.formats,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search)
    )
  }, [query])

  return (
    <div className="flex w-full max-w-4xl flex-col items-stretch text-start">
      <header className="relative mb-7 overflow-hidden rounded-3xl border border-border/60 bg-card px-5 py-8 text-center shadow-[0_18px_50px_-34px] shadow-foreground/50 sm:mb-9 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -inset-s-20 -top-24 size-60 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -inset-e-16 size-64 rounded-full bg-muted blur-3xl" />
        <div className="relative">
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-primary sm:text-sm"
          >
            Your digital archive
          </motion.p>
          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.06 }}
            className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Start with a platform
          </motion.h1>
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.12 }}
            className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base"
          >
            Choose an export to turn your conversations, listening history, and
            memories into a private story — processed where your files live.
          </motion.p>
        </div>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PlatformSearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery("")}
          placeholder="Find a platform or file type…"
          className="sm:max-w-md"
        />
        <p className="px-1 text-xs font-medium text-muted-foreground" aria-live="polite">
          {filteredPlatforms.length}{" "}
          {filteredPlatforms.length === 1 ? "platform" : "platforms"}
        </p>
      </div>

      <motion.ul layout className="grid list-none gap-4 p-0 sm:grid-cols-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {filteredPlatforms.map((platform, index) => (
            <motion.li
              key={platform.id}
              layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -10, scale: 0.96 }
              }
              transition={{
                duration: 0.32,
                delay: reduceMotion ? 0 : Math.min(index * 0.045, 0.25),
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <PlatformImportCard platform={platform} featured />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      {filteredPlatforms.length === 0 ? (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 text-center text-sm leading-relaxed text-muted-foreground"
        >
          Nothing matched “{query.trim()}”. Try a platform name or a file type
          such as JSON, ZIP, or CSV.
        </motion.p>
      ) : null}
    </div>
  )
}
