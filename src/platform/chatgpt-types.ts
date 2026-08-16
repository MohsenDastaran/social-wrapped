export type ChatGptCounted = {
  name: string
  count: number
}

export type ChatGptProfile = {
  displayName: string
  plusUser: boolean
}

export type ChatGptInsights = {
  profile: ChatGptProfile
  conversationCount: number
  messageCount: number
  models: ChatGptCounted[]
}

export function emptyChatGptInsights(): ChatGptInsights {
  return {
    profile: { displayName: "", plusUser: false },
    conversationCount: 0,
    messageCount: 0,
    models: [],
  }
}

export function normalizeChatGptInsights(
  raw?: Partial<ChatGptInsights> | null
): ChatGptInsights {
  const base = emptyChatGptInsights()
  if (!raw) return base
  return {
    ...base,
    ...raw,
    profile: { ...base.profile, ...(raw.profile ?? {}) },
    models: Array.isArray(raw.models) ? raw.models : base.models,
  }
}
