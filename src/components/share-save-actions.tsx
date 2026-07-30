import { useState, type ReactNode } from "react"
import { Check, Download, Loader2, Share2 } from "lucide-react"

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
  /** Compact icon-only pill (fullscreen header). */
  iconOnly?: boolean
}

type ActionTone = "neutral" | "primary" | "success"

function ActionButton({
  label,
  icon,
  tone,
  overlay,
  compact,
  disabled,
  onClick,
}: {
  label: string
  icon: ReactNode
  tone: ActionTone
  overlay: boolean
  compact: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all",
        "disabled:pointer-events-none disabled:opacity-45",
        "active:scale-[0.97]",
        compact
          ? "size-10 rounded-full"
          : "min-h-11 flex-1 gap-2 rounded-xl px-4 py-2.5 text-sm",
        overlay &&
          compact &&
          tone === "neutral" && [
            "text-white hover:bg-white/15",
            "focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none",
          ],
        overlay &&
          compact &&
          tone === "primary" && [
            "bg-primary text-primary-foreground shadow-sm",
            "hover:bg-primary/90",
            "focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
          ],
        overlay &&
          compact &&
          tone === "success" && [
            "bg-emerald-500 text-white",
            "hover:bg-emerald-500/90",
          ],
        overlay &&
          !compact && [
            "flex-col gap-1.5 border border-white/15 bg-white/10 text-white backdrop-blur-md",
            "hover:bg-white/15",
            "focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none",
          ],
        overlay &&
          !compact &&
          tone === "primary" && [
            "border-primary/40 bg-primary text-primary-foreground",
            "hover:bg-primary/90",
          ],
        overlay &&
          !compact &&
          tone === "success" && [
            "border-emerald-400/40 bg-emerald-500 text-white",
          ],
        !overlay &&
          compact && [
            "bg-muted text-foreground ring-1 ring-foreground/10 hover:bg-muted/80",
          ],
        !overlay &&
          !compact &&
          tone === "neutral" && [
            "bg-card text-foreground ring-1 ring-foreground/10 hover:bg-muted/60",
          ],
        !overlay &&
          !compact &&
          tone === "primary" && [
            "bg-primary text-primary-foreground hover:bg-primary/90",
          ],
        !overlay &&
          !compact &&
          tone === "success" && [
            "bg-emerald-600 text-white hover:bg-emerald-600/90",
          ]
      )}
    >
      {icon}
      {!compact ? (
        <span className={cn(overlay && "text-xs font-semibold tracking-tight")}>
          {label}
        </span>
      ) : null}
    </button>
  )
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
  downloadLabel = "Save",
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
    busy === "share" ? "Sharing…" : copied ? "Copied!" : shareLabel
  const downloadCaption = busy === "download" ? "Saving…" : downloadLabel

  const shareIcon =
    busy === "share" ? (
      <Loader2 className="size-4 animate-spin" aria-hidden />
    ) : copied ? (
      <Check className="size-4" aria-hidden />
    ) : (
      <Share2 className="size-4" aria-hidden />
    )

  const downloadIcon =
    busy === "download" ? (
      <Loader2 className="size-4 animate-spin" aria-hidden />
    ) : (
      <Download className="size-4" aria-hidden />
    )

  const shellClass = cn(
    "inline-flex items-center",
    iconOnly
      ? cn(
          "rounded-full p-1 shadow-lg backdrop-blur-xl",
          overlay
            ? "border border-white/20 bg-black/50"
            : "border border-border/80 bg-background/90"
        )
      : "w-full gap-2",
    className
  )

  return (
    <div className={shellClass} role="group" aria-label="Share and save">
      <ActionButton
        label={shareCaption}
        icon={shareIcon}
        tone={copied ? "success" : "neutral"}
        overlay={overlay}
        compact={iconOnly}
        disabled={busy !== null}
        onClick={() => void handleShare()}
      />

      <ActionButton
        label={downloadCaption}
        icon={downloadIcon}
        tone="primary"
        overlay={overlay}
        compact={iconOnly}
        disabled={busy !== null || !mediaUrl}
        onClick={() => void handleDownload()}
      />
    </div>
  )
}
