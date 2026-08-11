import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from "react-router"

import { AppLayout } from "@/components/app-layout"
import { AboutPage } from "@/pages/about-page"
import { HistoryPage } from "@/pages/history-page"
import { HomePage } from "@/pages/home-page"
import { ImportPage } from "@/pages/import-page"
import { PrivacyPage } from "@/pages/privacy-page"
import { SettingsPage } from "@/pages/settings-page"
import { WrapChatPage } from "@/pages/wrap-chat-page"
import { WrapGoogleProductPage } from "@/pages/wrap-google-product-page"
import { WrapPage } from "@/pages/wrap-page"

/**
 * Data router is required for `Link viewTransition` / named shared-element
 * morphs (`document.startViewTransition`). BrowserRouter ignores that prop.
 */
const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "import/:platformId", element: <ImportPage /> },
      { path: "wrap/:wrapId", element: <WrapPage /> },
      { path: "wrap/:wrapId/chat/:chatId", element: <WrapChatPage /> },
      {
        path: "wrap/:wrapId/google/:productId",
        element: <WrapGoogleProductPage />,
      },
      { path: "docs", element: <Navigate to="/privacy" replace /> },
      { path: "history", element: <HistoryPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "privacy", element: <PrivacyPage /> },
      { path: "about", element: <AboutPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}

export default App
