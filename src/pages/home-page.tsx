import { useMemo, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { Hero } from "@/components/hero"
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
      <Hero />

      <section
        className="mb-6 flex flex-col gap-4"
        aria-label="Platform search"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PlatformSearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => setQuery("")}
            placeholder="Find a platform or file type…"
            className="sm:max-w-md"
          />
          <p
            className="inline-flex shrink-0 items-baseline gap-2 self-start rounded-full bg-primary/10 px-3 py-1.5 ring-1 ring-primary/25 sm:self-auto"
            aria-live="polite"
          >
            <span className="font-heading text-xl font-semibold tabular-nums leading-none tracking-tight text-primary">
              {filteredPlatforms.length}
            </span>
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-foreground/75">
              {filteredPlatforms.length === 1 ? "platform" : "platforms"}
            </span>
          </p>
        </div>
      </section>

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
