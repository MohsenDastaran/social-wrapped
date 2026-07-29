import { History } from "lucide-react"

import { PagePlaceholder } from "@/components/page-placeholder"

export function HistoryPage() {
  return (
    <PagePlaceholder
      icon={History}
      title="History"
      description="Your parsed export history will show up here once analytics runs are wired in."
    />
  )
}
