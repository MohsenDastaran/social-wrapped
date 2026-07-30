import { downloadBlob } from "@/lib/mock-export"

export const DEFAULT_APP_SHARE_TEXT =
  "This was made with Social Wrapped — your private, on-device social wrap."

/**
 * Share attribution: always copies the text to the clipboard, then opens the
 * system share sheet when available (text only — media uses Download).
 */
export async function copyShareText(text: string): Promise<"copied"> {
  await navigator.clipboard.writeText(text)

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: "Social Wrapped",
        text,
      })
    } catch (error) {
      // Ignore cancel; clipboard already succeeded.
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error(error)
      }
    }
  }

  return "copied"
}

/** Download a remote/local media URL as a file. */
export async function downloadMediaUrl(
  url: string,
  filename: string
): Promise<void> {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error("fetch failed")
    const blob = await response.blob()
    downloadBlob(blob, filename)
    return
  } catch {
    // Cross-origin hosts may block fetch; fall back to a navigation download.
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.rel = "noopener"
    anchor.target = "_blank"
    anchor.click()
  }
}

/** Guess a download filename from a URL, with a fallback stem. */
export function filenameFromUrl(url: string, fallback: string): string {
  try {
    const path = new URL(url, window.location.origin).pathname
    const leaf = path.split("/").pop()
    if (leaf && leaf.includes(".")) return leaf
  } catch {
    // ignore
  }
  return fallback
}
