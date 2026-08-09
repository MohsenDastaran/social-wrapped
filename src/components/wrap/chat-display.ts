import type { ChatResult } from "@/platform/analytics-types"

export type ChatDisplay = {
  /** Primary title shown in lists / headers. */
  title: string
  /** Secondary line when deleted (e.g. `Chat 37`). */
  subtitle: string | null
  isDeleted: boolean
  isGroup: boolean
  isSavedMessages: boolean
}

/** Normalize how a chat is labeled — deleted peers never look like normal names. */
export function chatDisplay(chat: ChatResult): ChatDisplay {
  const isDeleted = chat.isDeleted === true
  const isGroup = chat.isGroup === true
  const isSavedMessages = chat.isSavedMessages === true
  if (isSavedMessages) {
    return {
      title: "Saved Messages",
      subtitle: "Notes to yourself",
      isDeleted: false,
      isGroup: false,
      isSavedMessages: true,
    }
  }
  if (isDeleted) {
    return {
      title: "Deleted account",
      subtitle: `Chat ${chat.chatId}`,
      isDeleted: true,
      isGroup,
      isSavedMessages: false,
    }
  }
  return {
    title: chat.chatName,
    subtitle: null,
    isDeleted: false,
    isGroup,
    isSavedMessages: false,
  }
}
