import { Info } from "lucide-react"

import { PagePlaceholder } from "@/components/page-placeholder"

export function AboutPage() {
  return (
    <PagePlaceholder
      icon={Info}
      title="About"
      description="Social Wrapped turns your exported chat and listening data into a Rust-powered, offline-first summary — built with Tauri, React, and WASM."
    />
  )
}
