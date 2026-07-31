import type { ChatResult } from "@/platform/analytics-types"

export type ChatDisplay = {
  /** Primary title shown in lists / headers. */
  title: string
  /** Secondary line when deleted (e.g. `Chat 37`). */
  subtitle: string | null
  isDeleted: boolean
  isGroup: boolean
}

/** Normalize how a chat is labeled — deleted peers never look like normal names. */
export function chatDisplay(chat: ChatResult): ChatDisplay {
  const isDeleted = chat.isDeleted === true
  const isGroup = chat.isGroup === true
  if (isDeleted) {
    return {
      title: "Deleted account",
      subtitle: `Chat ${chat.chatId}`,
      isDeleted: true,
      isGroup,
    }
  }
  return {
    title: chat.chatName,
    subtitle: null,
    isDeleted: false,
    isGroup,
  }
}
