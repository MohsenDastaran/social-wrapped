import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { BootSplash } from "@/components/boot-splash"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { applyRouteMeta } from "@/lib/site-meta"

applyRouteMeta(window.location.pathname)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <BootSplash>
        <App />
      </BootSplash>
    </ThemeProvider>
  </StrictMode>
)
