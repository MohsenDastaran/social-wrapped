import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useSyncExternalStore } from "react"
import { useNavigate } from "react-router"

import { PreviewDetailsCard } from "@/components/uitripled/preview-details-card-shadcnui"
import {
  dismissGettingStarted,
  getGettingStartedState,
  subscribeGettingStarted,
} from "@/lib/getting-started"

export function GettingStartedOverlay() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const { visible, nonce } = useSyncExternalStore(
    subscribeGettingStarted,
    getGettingStartedState,
    getGettingStartedState
  )

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key={`getting-started-popup-${nonce}`}
          className="fixed z-40 w-[min(calc(100%-2rem),22rem)] inset-e-4 bottom-24 max-h-[min(70dvh,36rem)] overflow-x-hidden overflow-y-auto md:bottom-6"
          initial={
            reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: 28, x: 16, scale: 0.96 }
          }
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={
            reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: 16, x: 12, scale: 0.96 }
          }
          transition={{
            duration: 0.45,
            ease: [0.19, 1, 0.22, 1],
          }}
        >
          <PreviewDetailsCard
            key={nonce}
            onTryDemo={() => navigate("/import/telegram?demo=1")}
            onDismiss={dismissGettingStarted}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
