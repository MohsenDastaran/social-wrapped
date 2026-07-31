/**
 * Force colorful emoji presentation for dual-style symbols (♀, ☹, ❤, …).
 * Those codepoints default to text style unless followed by U+FE0F.
 */
export function withEmojiPresentation(emoji: string): string {
  if (!emoji) return emoji
  return emoji.replace(
    /(\p{Extended_Pictographic})(?!\uFE0E|\uFE0F)(?!\p{Emoji_Modifier})/gu,
    "$1\uFE0F"
  )
}
