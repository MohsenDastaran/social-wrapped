import { useCallback, useState } from "react"

import {
  AnimatedTextRoller,
  type AnimatedTextItem,
} from "@/components/ui/animated/animated-text-04"
import { TextReveal } from "@/components/ui/animated/animated-text-06"
import { Skiper39 as CanvasCrowd } from "@/components/ui/animated/skiper39"

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

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-6 px-2">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Why Social Wrapped
        </p>

        <AnimatedTextRoller
          prefix="Made for"
          items={PLATFORM_GOALS}
          intervalMs={4000}
          lineHeightRem={3.25}
          
          onIndexChange={onIndexChange}
          className="drop-shadow-sm"
        />

        <TextReveal
          key={PLATFORM_GOALS[index].detail}
          text={PLATFORM_GOALS[index].detail}
          as="p"
          mode="word"
          delay={0.05}
          stagger={0.04}
          duration={0.4}
          blur="6px"
          y={8}
          once={false}
          className="max-w-lg text-center text-base font-medium leading-relaxed text-muted-foreground sm:text-lg"
        />
      </div>
    </>
  )
}
