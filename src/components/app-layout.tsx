import { useEffect } from "react"
import { Outlet, useLocation } from "react-router"

import { BottomNav } from "@/components/bottom-nav"
import { SafeArea } from "@/components/safe-area"
import { SiteHeader } from "@/components/site-header"
import { getAppSettings } from "@/lib/app-settings"
import { enforceRetentionPolicies } from "@/lib/wrap-history"

/** Reset scroll when the route changes (e.g. wrap → contact). */
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" })
  }, [pathname])

  return null
}

/** Drop expired / excess wraps once when the shell mounts. */
function RetentionPruneOnOpen() {
  useEffect(() => {
    void enforceRetentionPolicies(getAppSettings())
  }, [])

  return null
}

export function AppLayout() {
  return (
    <SafeArea
      edges={["top", "left", "right"]}
      className="relative flex min-h-svh flex-col"
    >
      <ScrollToTop />
      <RetentionPruneOnOpen />
      <SiteHeader />

      <main className="relative z-10 flex flex-1 flex-col items-center px-6 pt-10 pb-[calc(6rem+var(--safe-area-inset-bottom))] text-center md:pb-10">
        <Outlet />
      </main>

      <BottomNav />
    </SafeArea>
  )
}
