import { useState, type ComponentType } from "react"

import { BottomNav } from "@/components/bottom-nav"
import type { PageId } from "@/components/nav-items"
import { SiteHeader } from "@/components/site-header"
import { Skiper39 } from "@/components/ui/skiper-ui/skiper39"
import { AboutPage } from "@/pages/about-page"
import { DocsPage } from "@/pages/docs-page"
import { HistoryPage } from "@/pages/history-page"
import { HomePage } from "@/pages/home-page"
import { SettingsPage } from "@/pages/settings-page"

const PAGES: Record<PageId, ComponentType> = {
  home: HomePage,
  docs: DocsPage,
  history: HistoryPage,
  settings: SettingsPage,
  about: AboutPage,
}

export function App() {
  const [activePage, setActivePage] = useState<PageId>("home")
  const ActivePageComponent = PAGES[activePage]

  return (
    <div className="relative flex min-h-svh flex-col">
      {activePage === "about" ? (
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <Skiper39 />
        </div>
      ) : null}

      <SiteHeader activePage={activePage} onNavigate={setActivePage} />

      <main className="relative z-10 flex flex-1 flex-col items-center px-6 pb-24 pt-10 text-center md:pb-10">
        <ActivePageComponent />
      </main>

      <BottomNav activePage={activePage} onNavigate={setActivePage} />
    </div>
  )
}

export default App
