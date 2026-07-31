import { useEffect } from "react"
import { Outlet, useLocation } from "react-router"

import { BottomNav } from "@/components/bottom-nav"
import { SiteHeader } from "@/components/site-header"

/** Reset scroll when the route changes (e.g. wrap → contact). */
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" })
  }, [pathname])

  return null
}

export function AppLayout() {
  return (
    <div className="relative flex min-h-svh flex-col">
      <ScrollToTop />
      <SiteHeader />

      <main className="relative z-10 flex flex-1 flex-col items-center px-6 pt-10 pb-24 text-center md:pb-10">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
