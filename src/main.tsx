import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { BootSplash } from "@/components/boot-splash"
import { ThemeProvider } from "@/components/theme-provider.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <BootSplash>
        <App />
      </BootSplash>
    </ThemeProvider>
  </StrictMode>
)
