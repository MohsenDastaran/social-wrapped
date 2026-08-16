"use client"

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion"
import { ArrowUpRight, Sparkles, Star, XIcon } from "lucide-react"
import { useEffect, useId, useMemo, useState } from "react"

import { PlatformLogo } from "@/components/platform-logo"
import { Button } from "@/components/ui/button"

const SOURCE_URL = "https://github.com/MohsenDastaran/social-wrapped"

const gettingStartedSteps = [
  { label: "01", value: "Download your data" },
  { label: "02", value: "Import it in Social Wrapped" },
  { label: "03", value: "See the analytics" },
]

type DemoPlatformId = "telegram" | "instagram"

type PreviewDetailsCardProps = {
  onTryDemo?: (platform: DemoPlatformId) => void
  onDismiss?: () => void
  loading?: boolean
}

export function PreviewDetailsCard({
  onTryDemo,
  onDismiss,
  loading = false,
}: PreviewDetailsCardProps) {
  const [isActive, setIsActive] = useState(false)
  const previewId = useId()
  const descriptionId = useMemo(() => `${previewId}-description`, [previewId])
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    setIsActive(true)
  }, [])

  function handleTryDemo(platform: DemoPlatformId) {
    onDismiss?.()
    onTryDemo?.(platform)
  }

  const flyoutVariants: Variants = useMemo(
    () => ({
      hidden: {
        opacity: 0,
        y: shouldReduceMotion ? 0 : 12,
        scale: shouldReduceMotion ? 1 : 0.96,
      },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.28, ease: [0.19, 1, 0.22, 1] },
      },
      exit: {
        opacity: 0,
        y: shouldReduceMotion ? 0 : 8,
        scale: shouldReduceMotion ? 1 : 0.95,
        transition: shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
      },
    }),
    [shouldReduceMotion]
  )

  return (
    <section
      aria-labelledby={`${previewId}-title`}
      aria-describedby={descriptionId}
    >
      <div className="relative w-full">
        <motion.div className="relative flex w-full flex-col gap-4 rounded-3xl border border-border/60 bg-card/80 px-5 py-5 text-muted-foreground shadow-[0_25px_70px_-20px_rgba(15,23,42,0.5)] backdrop-blur-2xl sm:px-7 sm:py-6">
          <div className="flex items-center justify-between text-xs tracking-[0.32em] uppercase">
            <span className="inline-flex items-center gap-2 text-(--muted-foreground)/70">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary/15">
                <Sparkles className="size-4 text-primary" aria-hidden />
              </span>
              Getting started
            </span>
            {onDismiss ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-8 shrink-0 text-(--muted-foreground)/70 hover:text-foreground"
                aria-label="Dismiss"
                onClick={onDismiss}
              >
                <XIcon />
              </Button>
            ) : (
              <ArrowUpRight
                className="size-4 text-(--muted-foreground)/70 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 rtl:group-hover:-translate-x-1"
                aria-hidden
              />
            )}
          </div>

          <div className="flex flex-col gap-2 text-start">
            <h3
              id={`${previewId}-title`}
              className="text-xl font-semibold text-muted-foreground sm:text-2xl"
            >
              Don&apos;t know what to do?
            </h3>
            <p
              id={descriptionId}
              className="text-sm leading-relaxed text-muted-foreground"
            >
              Three simple steps to your wrap demo.
            </p>
          </div>

          <AnimatePresence>
            {isActive && (
              <motion.div
                key="preview"
                id={previewId}
                variants={flyoutVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 text-sm text-muted-foreground shadow-[0_25px_70px_-20px_rgba(15,23,42,0.5)]"
                role="region"
                aria-live="polite"
              >
                <div className="mb-4 flex items-center justify-between text-[11px] tracking-[0.36em] text-(--muted-foreground)/70 uppercase">
                  How it works
                  <span className="rounded-full bg-primary/15 px-3 py-1 text-[0.65rem] font-semibold text-primary/85">
                    3 steps
                  </span>
                </div>
                <ul className="flex flex-col gap-3">
                  {gettingStartedSteps.map((item) => (
                    <li
                      key={item.label}
                      className="flex items-center justify-between gap-3 text-sm text-(--muted-foreground)/80"
                    >
                      <span className="text-[11px] tracking-[0.28em] text-(--muted-foreground)/70 uppercase">
                        {item.label}
                      </span>
                      <span className="font-medium text-muted-foreground">
                        {item.value}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href={SOURCE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex items-center justify-between gap-3 rounded-xl px-1 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className="inline-flex items-center gap-2 font-medium">
                    <Star className="size-3.5 text-primary" aria-hidden />
                    Say wow :) & Give us a
                    <span className="font-medium text-foreground">Star</span>
                  </span>
                  <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                </a>

                {onTryDemo ? (
                  <div className="mt-4 flex flex-col gap-2">
                    <p className="text-[11px] tracking-[0.28em] text-(--muted-foreground)/70 uppercase">
                      Try a{" "}
                      <span className="font-semibold text-primary">demo</span>{" "}
                      with
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="min-w-0 flex-1"
                        disabled={loading}
                        onClick={() => handleTryDemo("telegram")}
                      >
                        <PlatformLogo
                          id="telegram"
                          className="size-4"
                          title="Telegram"
                        />
                        Telegram
                      </Button>
                      <span className="shrink-0 text-[11px] tracking-[0.28em] text-(--muted-foreground)/70 uppercase">
                        or
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-w-0 flex-1"
                        disabled={loading}
                        onClick={() => handleTryDemo("instagram")}
                      >
                        <PlatformLogo
                          id="instagram"
                          className="size-4"
                          title="Instagram"
                        />
                        Instagram
                      </Button>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}
