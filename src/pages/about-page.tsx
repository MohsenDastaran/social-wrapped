import { Info } from "lucide-react"

import { PagePlaceholder } from "@/components/page-placeholder"
import { Skiper39 as CanvasCrowd } from "@/components/ui/animated/skiper39"

export function AboutPage() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <CanvasCrowd />
      </div>

      <PagePlaceholder
        icon={Info}
        title="About"
        description="Social Wrapped turns your exported chat and listening data into a Rust-powered, offline-first summary — built with Tauri, React, and WASM."
      />
    </>
  )
}
