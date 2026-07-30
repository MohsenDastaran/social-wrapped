import { useState } from "react"
import { Check, Download, Share2 } from "lucide-react"

import {
  copyShareText,
  downloadMediaUrl,
  filenameFromUrl,
} from "@/lib/media-share"
import { cn } from "@/lib/utils"

export type ShareSaveActionsProps = {
  /** Media URL to download (video or current story image). */
  mediaUrl: string
  /** Preferred download filename. */
  fileName?: string
  /** Attribution text copied / shared with the system share sheet. */
  shareText: string
  /** Visual style for overlays on dark fullscreen surfaces. */
  appearance?: "default" | "overlay"
  className?: string
  shareLabel?: string
  downloadLabel?: string
  /** Icon-only controls (more reliable on narrow fullscreen headers). */
  iconOnly?: boolean
}

/**
 * Reusable Share + Download actions.
 * Share copies (or system-shares) the app attribution text;
 * Download saves the current media file.
 */
export function ShareSaveActions({
  mediaUrl,
  fileName,
  shareText,
  appearance = "default",
  className,
  shareLabel = "Share",
  downloadLabel = "Download",
  iconOnly = false,
}: ShareSaveActionsProps) {
  const [busy, setBusy] = useState<"share" | "download" | null>(null)
  const [copied, setCopied] = useState(false)

  const overlay = appearance === "overlay"

  async function handleShare() {
    setBusy("share")
    setCopied(false)
    try {
      await copyShareText(shareText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error(error)
    } finally {
      setBusy(null)
    }
  }

  async function handleDownload() {
    setBusy("download")
    try {
      const name =
        fileName ??
        filenameFromUrl(mediaUrl, `social-wrapped-${Date.now()}.bin`)
      await downloadMediaUrl(mediaUrl, name)
    } catch (error) {
      console.error(error)
    } finally {
      setBusy(null)
    }
  }

  const shareCaption =
    busy === "share" ? "Sharing…" : copied ? "Copied" : shareLabel
  const downloadCaption =
    busy === "download" ? "Saving…" : downloadLabel

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void handleShare()}
        aria-label={shareCaption}
        title={shareCaption}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors disabled:opacity-50",
          iconOnly && "size-10 px-0",
          overlay
            ? "bg-white/20 text-white ring-1 ring-white/40 backdrop-blur-md hover:bg-white/30"
            : "bg-muted text-foreground ring-1 ring-foreground/10 hover:bg-muted/80"
        )}
      >
        {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
        {iconOnly ? null : <span>{shareCaption}</span>}
      </button>
      <button
        type="button"
        disabled={busy !== null || !mediaUrl}
        onClick={() => void handleDownload()}
        aria-label={downloadCaption}
        title={downloadCaption}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors disabled:opacity-50",
          iconOnly && "size-10 px-0",
          overlay
            ? "bg-white text-black hover:bg-white/90"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        <Download className="size-4" />
        {iconOnly ? null : <span>{downloadCaption}</span>}
      </button>
    </div>
  )
}
