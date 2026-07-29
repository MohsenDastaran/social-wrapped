import { Settings } from "lucide-react"

import { PagePlaceholder } from "@/components/page-placeholder"

export function SettingsPage() {
  return (
    <PagePlaceholder
      icon={Settings}
      title="Settings"
      description="App preferences will live here. Use the sun/moon icon in the top bar to switch themes for now."
    />
  )
}
