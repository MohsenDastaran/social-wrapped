import { useEffect, useState, type ReactNode } from "react"

import { AppLoader } from "@/components/app-loader"

const BOOT_MIN_MS = 700

interface BootSplashProps {
  children: ReactNode
}

/** Shows the global DotmSquare12 loader on first paint, then reveals the app. */
export function BootSplash({ children }: BootSplashProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const started = performance.now()
    let cancelled = false

    const finish = () => {
      if (cancelled) return
      const elapsed = performance.now() - started
      const remaining = Math.max(0, BOOT_MIN_MS - elapsed)
      window.setTimeout(() => {
        if (!cancelled) setReady(true)
      }, remaining)
    }

    if (document.readyState === "complete") {
      finish()
    } else {
      window.addEventListener("load", finish, { once: true })
    }

    return () => {
      cancelled = true
      window.removeEventListener("load", finish)
    }
  }, [])

  if (!ready) {
    return <AppLoader />
  }

  return children
}
