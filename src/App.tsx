import { BrowserRouter, Navigate, Route, Routes } from "react-router"

import { AppLayout } from "@/components/app-layout"
import { AboutPage } from "@/pages/about-page"
import { DocsPage } from "@/pages/docs-page"
import { HistoryPage } from "@/pages/history-page"
import { HomePage } from "@/pages/home-page"
import { ImportPage } from "@/pages/import-page"
import { SettingsPage } from "@/pages/settings-page"
import { WrapChatPage } from "@/pages/wrap-chat-page"
import { WrapPage } from "@/pages/wrap-page"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="import/:platformId" element={<ImportPage />} />
          <Route path="wrap/:wrapId" element={<WrapPage />} />
          <Route path="wrap/:wrapId/chat/:chatId" element={<WrapChatPage />} />
          <Route path="docs" element={<DocsPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
