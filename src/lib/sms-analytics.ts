import type { ChatResult } from "@/platform/analytics-types"

/** Enough inbound volume to count as a blast / service thread, not a short ping. */
const MIN_RECEIVED = 10
/** Sent share at or below this is treated as non-personal (banks, OTPs, orgs). */
const MAX_SENT_SHARE = 0.02

/**
 * Banks, OTPs, and other inbound-only senders: lots received, almost nothing sent.
 */
export function isSmsBroadcastContact(chat: ChatResult): boolean {
  if (chat.isGroup || chat.isSavedMessages) return false
  const sent = chat.analytics.sentMessages ?? 0
  const received = chat.analytics.receivedMessages ?? 0
  const total = chat.analytics.totalMessages || sent + received
  if (received < MIN_RECEIVED || total < MIN_RECEIVED) return false
  if (sent <= 1) return true
  return sent / total <= MAX_SENT_SHARE
}

/** Top inbound-heavy SMS senders, ranked by how much they messaged you. */
export function smsBroadcastContacts(
  chats: ChatResult[],
  limit = 8
): ChatResult[] {
  const seen = new Set<number>()
  const matches: ChatResult[] = []
  for (const chat of chats) {
    if (seen.has(chat.chatId) || !isSmsBroadcastContact(chat)) continue
    seen.add(chat.chatId)
    matches.push(chat)
  }
  return matches
    .sort(
      (a, b) =>
        b.analytics.receivedMessages - a.analytics.receivedMessages ||
        b.analytics.totalMessages - a.analytics.totalMessages
    )
    .slice(0, limit)
}
