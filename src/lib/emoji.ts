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

/**
 * True for lone ZWJ components (♀️ / ♂️ / ⚕️) that leak from sequences like 🤦‍♀️
 * when older imports counted codepoints instead of grapheme clusters.
 */
export function isEmojiComponentLeak(emoji: string): boolean {
  if (!emoji) return true
  const stripped = [...emoji].filter((c) => {
    const cp = c.codePointAt(0) ?? 0
    return cp !== 0xfe0e && cp !== 0xfe0f && cp !== 0x200d
  })
  if (stripped.length === 0) return true
  if (stripped.length > 1) return false
  const cp = stripped[0]!.codePointAt(0) ?? 0
  // ♀ ♂ ⚕ — common ZWJ gender / profession signs
  return cp === 0x2640 || cp === 0x2642 || cp === 0x2695
}

/** Drop leaked component-only glyphs from ranked emoji lists. */
export function filterEmojiEntries<T extends { emoji: string }>(
  entries: T[]
): T[] {
  return entries.filter((e) => e.emoji && !isEmojiComponentLeak(e.emoji))
}
