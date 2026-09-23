import { RouterProvider, createBrowserRouter } from "react-router"

import { AppLayout } from "@/components/app-layout"
import { AboutPage } from "@/pages/about-page"
import { HistoryPage } from "@/pages/history-page"
import { HomePage } from "@/pages/home-page"
import { ImportPage } from "@/pages/import-page"
import { NotFoundPage } from "@/pages/not-found-page"
import { PrivacyPage } from "@/pages/privacy-page"
import { SettingsPage } from "@/pages/settings-page"
import { WrapChatPage } from "@/pages/wrap-chat-page"
import { WrapGoogleProductPage } from "@/pages/wrap-google-product-page"
import { WrapPage } from "@/pages/wrap-page"
import type { ReactNode } from "react"

/**
 * Data router is required for `Link viewTransition` / named shared-element
 * morphs (`document.startViewTransition`). BrowserRouter ignores that prop.
 * Trailing-slash aliases render the same page with no redirect.
 */
function slash(path: string, render: () => ReactNode) {
  return [
    { path, element: render() },
    { path: `${path}/`, element: render() },
  ]
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      ...slash("import/:platformId", () => <ImportPage />),
      ...slash("wrap/:wrapId", () => <WrapPage />),
      ...slash("wrap/:wrapId/chat/:chatId", () => <WrapChatPage />),
      ...slash("wrap/:wrapId/google/:productId", () => (
        <WrapGoogleProductPage />
      )),
      ...slash("docs", () => <PrivacyPage />),
      ...slash("history", () => <HistoryPage />),
      ...slash("settings", () => <SettingsPage />),
      ...slash("privacy", () => <PrivacyPage />),
      ...slash("about", () => <AboutPage />),
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}

export default App
