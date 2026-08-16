import { Sparkles } from "lucide-react"

import { fmt } from "@/components/wrap/chart-theme"
import { TopListeningRanksCard } from "@/components/wrap/top-listening-ranks"
import type { ChatGptInsights } from "@/platform/chatgpt-types"

type ChatGptModelsCardProps = {
  data: ChatGptInsights
}

/** Ranked model slugs from assistant messages in the ChatGPT archive. */
export function ChatGptModelsCard({ data }: ChatGptModelsCardProps) {
  const items = data.models.filter((m) => m.name && m.count > 0)
  if (items.length === 0) return null

  const total = items.reduce((sum, m) => sum + m.count, 0)
  return (
    <section className="flex flex-col gap-4 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Models you used
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {fmt(data.conversationCount)} conversations · {fmt(data.messageCount)}{" "}
          messages · {fmt(total)} assistant replies with a model name
        </p>
      </header>
      <TopListeningRanksCard
        title="Models"
        description="Which ChatGPT models answered you most"
        exportName="chatgpt-models"
        items={items}
        icon={Sparkles}
        accent="teal"
        limit={16}
      />
    </section>
  )
}
