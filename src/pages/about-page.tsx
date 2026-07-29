import { useCallback, useState } from "react"
import { ArrowUpRight, Code2, UserRound } from "lucide-react"

import { DataSafetyDialog } from "@/components/data-safety-dialog"
import {
  AnimatedTextRoller,
  type AnimatedTextItem,
} from "@/components/ui/animated/animated-text-04"
import { TextReveal } from "@/components/ui/animated/animated-text-06"
import {
  CraftButton,
  CraftButtonIcon,
  CraftButtonLabel,
} from "@/components/ui/animated/link-button"
import { Skiper39 as CanvasCrowd } from "@/components/ui/animated/skiper39"

const DEVELOPER_URL = "https://github.com/MohsenDastaran"
const SOURCE_URL = "https://github.com/MohsenDastaran/social-wrapped"

const PLATFORM_GOALS: (AnimatedTextItem & { detail: string })[] = [
  {
    text: "a digital mirror",
    color: "text-teal-600 dark:text-teal-400",
    detail:
      "Your social life is hidden in plain text. Uncover the patterns in your friendships, find your closest circles, and watch how relationships grow over the years.",
  },
  {
    text: "taking back control",
    color: "text-sky-600 dark:text-sky-400",
    detail:
      "See what the algorithms see. Inspect, explore, and visualize your own digital footprint — on your terms, not theirs.",
  },
  {
    text: "celebrating connections",
    color: "text-orange-500 dark:text-orange-400",
    detail:
      "Every gigabyte is a memory. Relive inside jokes, find the day a friendship began, and rescue forgotten moments from old chat logs.",
  },
  {
    text: "digital mindfulness",
    color: "text-emerald-600 dark:text-emerald-400",
    detail:
      "Understand your digital energy. See who you talk to most, when you're most present, and whether your habits match what matters to you.",
  },
  {
    text: "uncompromising privacy",
    color: "text-violet-600 dark:text-violet-400",
    detail:
      "Personal insights without giving yourself away. Your stories stay with you — private by design, not by policy.",
  },
  {
    text: "a universal Wrapped",
    color: "text-rose-600 dark:text-rose-400",
    detail:
      "A cross-platform celebration of the people and moments that shaped your year — one story you can share, keep, and come back to.",
  },
]

export function AboutPage() {
  const [index, setIndex] = useState(0)
  const onIndexChange = useCallback((next: number) => setIndex(next), [])

  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <CanvasCrowd />
      </div>

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center rounded-3xl bg-background/75 px-3 py-6 shadow-[0_0_80px_24px] shadow-background/80 backdrop-blur-[2px] sm:px-6 dark:bg-background/70 dark:shadow-background/90">
        <p className="mb-4 text-center text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:mb-6 sm:text-sm sm:tracking-[0.2em]">
          Why Social Wrapped
        </p>

        <AnimatedTextRoller
          prefix="Made for"
          items={PLATFORM_GOALS}
          intervalMs={4000}
          stacked
          onIndexChange={onIndexChange}
          className="w-full"
        />

        <TextReveal
          key={PLATFORM_GOALS[index].detail}
          text={PLATFORM_GOALS[index].detail}
          as="p"
          mode="word"
          delay={0.05}
          stagger={0.035}
          duration={0.35}
          blur="6px"
          y={8}
          once={false}
          className="w-full max-w-lg px-1 text-center text-sm font-medium leading-relaxed text-muted-foreground sm:px-0 sm:text-base md:text-lg"
        />

        <div className="mt-8 flex w-full max-w-lg flex-col items-center gap-4">
          <DataSafetyDialog />

          <div className="flex flex-wrap items-center justify-center gap-3">
            <CraftButton
              render={
                <a href={DEVELOPER_URL} target="_blank" rel="noreferrer" />
              }
            >
              <UserRound
                className="relative z-2 size-3.5 shrink-0 opacity-70 transition-colors duration-500 group-hover/button:text-foreground group-hover/button:opacity-100"
                aria-hidden
              />
              <CraftButtonLabel>Developer</CraftButtonLabel>
              <CraftButtonIcon>
                <ArrowUpRight className="size-3" aria-hidden />
              </CraftButtonIcon>
            </CraftButton>

            <CraftButton
              render={
                <a href={SOURCE_URL} target="_blank" rel="noreferrer" />
              }
            >
              <Code2
                className="relative z-2 size-3.5 shrink-0 opacity-70 transition-colors duration-500 group-hover/button:text-foreground group-hover/button:opacity-100"
                aria-hidden
              />
              <CraftButtonLabel>Source code</CraftButtonLabel>
              <CraftButtonIcon>
                <ArrowUpRight className="size-3" aria-hidden />
              </CraftButtonIcon>
            </CraftButton>
          </div>
        </div>
      </div>
    </>
  )
}
