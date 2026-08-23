"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StepFlowItem = {
  id?: string;
  serial?: string;
  title: string;
  description?: string;
  image: string;
  imageAlt?: string;
};

export type StepFlowProps = {
  steps?: StepFlowItem[];
  defaultStep?: number;
  highlightColor?: string;
  className?: string;
  textClassName?: string;
  imageClassName?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  /** Controlled active step (0-based). */
  step?: number;
  onStepChange?: (index: number) => void;
  /** Block jumping ahead — only Next can reveal unseen steps. */
  lockFutureSteps?: boolean;
  /** Small previous / next controls under the layout. */
  showControls?: boolean;
  completeLabel?: string;
  onComplete?: () => void;
};

const defaultSteps: StepFlowItem[] = [
  {
    serial: "01",
    title: "Map the system",
    description: "Turn scattered product ideas into a clear structure your team can build from.",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "A focused workspace with a laptop and design notes",
  },
  {
    serial: "02",
    title: "Shape the interface",
    description: "Compose layouts, components, and states with a visual language that stays consistent.",
    image:
      "https://images.unsplash.com/photo-1559028012-481c04fa702d?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Design wireframes and interface sketches on a desk",
  },
  {
    serial: "03",
    title: "Refine the motion",
    description: "Add purposeful transitions so every interaction feels responsive, calm, and premium.",
    image:
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Abstract architecture with strong perspective lines",
  },
  {
    serial: "04",
    title: "Ship the page",
    description: "Package the final experience into reusable React code that is ready for production.",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Analytics dashboard on a monitor",
  },
];

export function StepFlow({
  steps = defaultSteps,
  defaultStep = 0,
  highlightColor = "rgb(229 229 229)",
  className,
  textClassName,
  imageClassName,
  autoPlay = false,
  autoPlayInterval = 3500,
  step,
  onStepChange,
  lockFutureSteps = false,
  showControls = false,
  completeLabel = "Get started",
  onComplete,
}: StepFlowProps) {
  const reduceMotion = useReducedMotion() === true;
  const safeSteps = steps.length > 0 ? steps : defaultSteps;
  const lastIndex = safeSteps.length - 1;
  const initialStep = Math.min(Math.max(defaultStep, 0), lastIndex);
  const isControlled = step !== undefined;
  const [uncontrolledIndex, setUncontrolledIndex] = React.useState(initialStep);
  const activeIndex = isControlled
    ? Math.min(Math.max(step, 0), lastIndex)
    : uncontrolledIndex;
  const [farthestIndex, setFarthestIndex] = React.useState(activeIndex);
  const activeStep = safeSteps[activeIndex] ?? safeSteps[0];
  const isLast = activeIndex >= lastIndex;

  const setActiveIndex = React.useCallback(
    (index: number, fromNav = false) => {
      const next = Math.min(Math.max(index, 0), lastIndex);
      if (lockFutureSteps && next > farthestIndex && !fromNav) return;
      if (next > farthestIndex) setFarthestIndex(next);
      if (!isControlled) setUncontrolledIndex(next);
      onStepChange?.(next);
    },
    [farthestIndex, isControlled, lastIndex, lockFutureSteps, onStepChange],
  );

  React.useEffect(() => {
    if (activeIndex > farthestIndex) setFarthestIndex(activeIndex);
  }, [activeIndex, farthestIndex]);

  React.useEffect(() => {
    if (!autoPlay || lockFutureSteps || isControlled || safeSteps.length <= 1) {
      return
    }

    const interval = window.setInterval(() => {
      setUncontrolledIndex((index) => (index + 1) % safeSteps.length);
    }, Math.max(1200, autoPlayInterval));

    return () => window.clearInterval(interval);
  }, [autoPlay, autoPlayInterval, isControlled, lockFutureSteps, safeSteps.length]);

  function goPrevious() {
    setActiveIndex(activeIndex - 1, true);
  }

  function goNext() {
    if (isLast) {
      onComplete?.();
      return;
    }
    setActiveIndex(activeIndex + 1, true);
  }

  return (
    <section
      className={cn(
        "relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[25px] bg-white p-3 text-neutral-950 sm:p-4 dark:bg-neutral-950 dark:text-white",
        className,
      )}
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2 md:items-center lg:grid-cols-[minmax(0,0.94fr)_minmax(280px,1.08fr)] lg:gap-8 lg:overflow-hidden">
        <div
          className={cn(
            "relative order-2 flex flex-col justify-center rounded-[22px] p-1 sm:p-2 lg:order-1 lg:min-h-0 lg:justify-center",
            textClassName,
          )}
        >
          <div className="flex flex-col gap-2 px-2 py-1 sm:px-4 lg:hidden">
            <span className="text-sm font-medium tracking-wide text-neutral-500 sm:text-base dark:text-neutral-400">
              {activeStep.serial ?? String(activeIndex + 1).padStart(2, "0")}
            </span>
            <h3 className="text-balance text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl dark:text-white">
              {activeStep.title}
            </h3>
            {activeStep.description ? (
              <p className="max-w-xl text-sm leading-6 text-neutral-600 sm:text-base dark:text-neutral-300">
                {activeStep.description}
              </p>
            ) : null}
          </div>

          <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:gap-1">
            {safeSteps.map((item, index) => {
              const isActive = activeIndex === index;
              const isLocked = lockFutureSteps && index > farthestIndex;
              return (
                <button
                  key={item.id ?? `${item.serial ?? index}-${item.title}`}
                  type="button"
                  disabled={isLocked}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "group relative z-10 flex w-full flex-col items-start rounded-2xl px-4 py-2.5 text-start outline-none transition-[color,background-color,transform] duration-200",
                    isLocked ? "cursor-not-allowed" : "cursor-pointer",
                    !isActive &&
                      !isLocked &&
                      "hover:translate-x-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-800/80",
                    "focus-visible:ring-2 focus-visible:ring-neutral-950/20 dark:focus-visible:ring-white/25",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="step-flow-highlight"
                      className="absolute inset-0 -z-10 rounded-2xl shadow-sm"
                      style={{ backgroundColor: highlightColor }}
                      transition={
                        reduceMotion
                          ? { duration: 0.1 }
                          : { type: "spring", bounce: 0.2, duration: 0.45 }
                      }
                    />
                  )}
                  <span
                    className={cn(
                      "text-xs font-medium tracking-wide transition-colors",
                      isActive
                        ? "text-neutral-700"
                        : "text-neutral-400 group-hover:text-neutral-600 dark:text-neutral-500 dark:group-hover:text-neutral-300",
                    )}
                  >
                    {item.serial ?? String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 text-balance text-lg font-semibold tracking-tight transition-colors xl:text-xl",
                      isActive
                        ? "text-neutral-950"
                        : "text-neutral-500 group-hover:text-neutral-800 dark:text-neutral-400 dark:group-hover:text-neutral-100",
                    )}
                  >
                    {item.title}
                  </span>
                  {item.description ? (
                    <AnimatePresence initial={false}>
                      {isActive ? (
                        <motion.span
                          className="mt-1.5 max-w-[34rem] text-sm leading-5 text-neutral-600"
                          initial={
                            reduceMotion
                              ? { opacity: 1 }
                              : { opacity: 0, y: 6 }
                          }
                          animate={{ opacity: 1, y: 0 }}
                          exit={
                            reduceMotion
                              ? { opacity: 0 }
                              : { opacity: 0, y: -4 }
                          }
                          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        >
                          {item.description}
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={cn(
            "relative order-1 flex h-40 items-center justify-center overflow-hidden rounded-[20px] bg-neutral-200 p-2 sm:h-52 md:h-full md:min-h-[240px] md:p-4 lg:order-2 lg:min-h-0 lg:p-6 dark:bg-neutral-900",
            imageClassName,
          )}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={activeStep.id ?? activeStep.title}
              src={activeStep.image}
              alt={activeStep.imageAlt ?? activeStep.title}
              className="h-full max-h-full min-h-0 w-full rounded-[20px] border border-black/10 object-cover shadow-[0_24px_60px_-30px_rgba(0,0,0,0.45)] lg:max-h-[560px] lg:rounded-[24px] dark:border-white/10"
              initial={
                reduceMotion
                  ? { opacity: 1 }
                  : { opacity: 0, scale: 1.04, y: 10, filter: "blur(14px)" }
              }
              animate={
                reduceMotion
                  ? { opacity: 1 }
                  : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
              }
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.985, y: -8, filter: "blur(10px)" }
              }
              transition={
                reduceMotion
                  ? { duration: 0.1 }
                  : { type: "spring", bounce: 0, duration: 0.7 }
              }
            />
          </AnimatePresence>
        </div>
      </div>

      {showControls ? (
        <div className="mt-3 flex shrink-0 items-center justify-between gap-2 border-t border-neutral-200/80 pt-3 sm:gap-3 dark:border-neutral-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={activeIndex === 0}
            onClick={goPrevious}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            <span className="max-sm:hidden">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          <p className="text-xs font-medium tracking-wide text-neutral-500 tabular-nums dark:text-neutral-400">
            {String(activeIndex + 1).padStart(2, "0")} /{" "}
            {String(safeSteps.length).padStart(2, "0")}
          </p>
          <Button type="button" size="sm" className="rounded-full" onClick={goNext}>
            {isLast ? completeLabel : "Next"}
            {isLast ? null : <ChevronRightIcon data-icon="inline-end" />}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export default StepFlow;
