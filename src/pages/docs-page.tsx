import { BookOpen } from "lucide-react"

import { PagePlaceholder } from "@/components/page-placeholder"

export function DocsPage() {
  return (
    <PagePlaceholder
      icon={BookOpen}
      title="Docs"
      description="Documentation for social-wrapped is coming soon. Check the docs/ folder in the repo for current guides."
    />
  )
}
