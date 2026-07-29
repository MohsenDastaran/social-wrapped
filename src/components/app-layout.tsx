import { Outlet } from "react-router"

import { BottomNav } from "@/components/bottom-nav"
import { SiteHeader } from "@/components/site-header"

export function AppLayout() {
  return (
    <div className="relative flex min-h-svh flex-col">
      <SiteHeader />

      <main className="relative z-10 flex flex-1 flex-col items-center px-6 pb-24 pt-10 text-center md:pb-10">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
