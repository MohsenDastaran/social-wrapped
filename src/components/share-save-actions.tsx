import { useState, type ReactNode } from "react"
import { Check, Download, Loader2, Share2 } from "lucide-react"

import { DotmSquare12 } from "@/components/ui/dotm-square-12"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  copyShareText,
  downloadMediaUrl,
  filenameFromUrl,
} from "@/lib/media-share"
import { cn } from "@/lib/utils"

export type ShareDownloadMenuItem = {
  id: string
  title: string
  description: string
  icon: ReactNode
  onSelect: () => void
}

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
  /**
   * When false, download shows a DotmSquare12 loader and stays disabled
   * (e.g. wrap video still encoding). Defaults to ready when `mediaUrl` is set.
   */
  downloadReady?: boolean
  /** 0–1 encode progress while preparing the downloadable file. */
  downloadProgress?: number
  /** Optional status line, e.g. "Encoding" / "Retry". */
  downloadStatus?: string
  /**
   * When the file isn't ready yet (or encode failed), invoke this to finish
   * encoding then download. If omitted, Save stays disabled until ready.
   */
  onRequestDownload?: () => Promise<void>
  /** When set, Save opens a quality / format menu instead of downloading immediately. */
  downloadMenu?: {
    label?: string
    items: ShareDownloadMenuItem[]
  }
}

type ActionTone = "neutral" | "primary" | "success"

function ActionButton({
  label,
  icon,
  tone,
  overlay,
  compact,
  wide,
  disabled,
  softDisabled,
  onClick,
}: {
  label: string
  icon: ReactNode
  tone: ActionTone
  overlay: boolean
  compact: boolean
  /** Compact but wide enough for loader + percent text. */
  wide?: boolean
  disabled?: boolean
  softDisabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled || softDisabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-busy={softDisabled || undefined}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all",
        "disabled:pointer-events-none",
        disabled && !softDisabled && "disabled:opacity-45",
        "active:scale-[0.97]",
        compact && !wide && "size-10 rounded-full",
        compact &&
          wide &&
          "h-10 gap-1.5 rounded-full px-2.5 text-[0.7rem] font-semibold tracking-tight tabular-nums",
        !compact && "min-h-11 flex-1 gap-2 rounded-xl px-4 py-2.5 text-sm",
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
      {!compact || wide ? (
        <span className={cn(overlay && !wide && "text-xs font-semibold tracking-tight")}>
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
  downloadReady,
  downloadProgress,
  downloadStatus,
  onRequestDownload,
  downloadMenu,
}: ShareSaveActionsProps) {
  const [busy, setBusy] = useState<"share" | "download" | null>(null)
  const [copied, setCopied] = useState(false)

  const overlay = appearance === "overlay"
  const hasDownloadMenu = Boolean(downloadMenu?.items.length)
  const canDownload =
    !hasDownloadMenu &&
    Boolean(mediaUrl) &&
    (downloadReady ?? Boolean(mediaUrl))
  const preparingDownload = !canDownload && !hasDownloadMenu
  /** Encode-on-demand: Save opens a chooser / starts encode via callback. */
  const encodeOnDemand =
    !hasDownloadMenu && Boolean(onRequestDownload) && preparingDownload
  const activelyEncoding =
    downloadProgress != null && downloadProgress < 1 && !hasDownloadMenu
  const progressPct =
    downloadProgress != null
      ? Math.round(Math.min(1, Math.max(0, downloadProgress)) * 100)
      : null

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
    if (hasDownloadMenu) return
    setBusy("download")
    try {
      if (canDownload) {
        const name =
          fileName ??
          filenameFromUrl(mediaUrl, `social-wrapped-${Date.now()}.bin`)
        await downloadMediaUrl(mediaUrl, name)
        return
      }
      if (onRequestDownload) {
        await onRequestDownload()
        return
      }
    } catch (error) {
      console.error(error)
    } finally {
      setBusy(null)
    }
  }

  const shareCaption =
    busy === "share" ? "Sharing…" : copied ? "Copied!" : shareLabel

  const downloadCaption =
    busy === "download" && canDownload
      ? "Saving…"
      : activelyEncoding
        ? progressPct != null
          ? `${progressPct}%`
          : (downloadStatus ?? "Encoding…")
        : encodeOnDemand || hasDownloadMenu
          ? (downloadStatus ?? downloadLabel)
          : preparingDownload
            ? progressPct != null
              ? `${progressPct}%`
              : (downloadStatus ?? "Encoding…")
            : downloadLabel

  const shareIcon =
    busy === "share" ? (
      <Loader2 className="size-4 animate-spin" aria-hidden />
    ) : copied ? (
      <Check className="size-4" aria-hidden />
    ) : (
      <Share2 className="size-4" aria-hidden />
    )

  const downloadIcon =
    busy === "download" && canDownload ? (
      <Loader2 className="size-4 animate-spin" aria-hidden />
    ) : activelyEncoding ? (
      <DotmSquare12
        size={18}
        dotSize={2.6}
        speed={1.35}
        pattern="full"
        color={overlay ? "#ffffff" : "#42b2ae"}
        animated
        opacityBase={0.12}
        opacityMid={0.42}
        opacityPeak={0.98}
        ariaLabel="Preparing download"
      />
    ) : preparingDownload && !encodeOnDemand ? (
      <DotmSquare12
        size={18}
        dotSize={2.6}
        speed={1.35}
        pattern="full"
        color={overlay ? "#ffffff" : "#42b2ae"}
        animated
        opacityBase={0.12}
        opacityMid={0.42}
        opacityPeak={0.98}
        ariaLabel="Preparing download"
      />
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

  const downloadBlocked =
    preparingDownload && !onRequestDownload && !hasDownloadMenu

  const downloadButtonClass = cn(
    "inline-flex items-center justify-center font-medium transition-all",
    "disabled:pointer-events-none",
    "active:scale-[0.97]",
    iconOnly && !activelyEncoding && "size-10 rounded-full",
    iconOnly &&
      activelyEncoding &&
      "h-10 gap-1.5 rounded-full px-2.5 text-[0.7rem] font-semibold tracking-tight tabular-nums",
    !iconOnly && "min-h-11 flex-1 gap-2 rounded-xl px-4 py-2.5 text-sm",
    overlay &&
      iconOnly && [
        "bg-primary text-primary-foreground shadow-sm",
        "hover:bg-primary/90",
        "focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
      ],
    overlay &&
      !iconOnly && [
        "flex-col gap-1.5 border border-primary/40 bg-primary text-primary-foreground backdrop-blur-md",
        "hover:bg-primary/90",
        "focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
      ],
    !overlay &&
      iconOnly && [
        "bg-primary text-primary-foreground shadow-sm",
        "hover:bg-primary/90",
      ],
    !overlay &&
      !iconOnly && [
        "border border-primary/30 bg-primary text-primary-foreground",
        "hover:bg-primary/90",
      ]
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

      {hasDownloadMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={busy !== null}
            render={
              <button
                type="button"
                aria-label={downloadCaption}
                title={downloadCaption}
                className={downloadButtonClass}
              />
            }
          >
            {downloadIcon}
            {!iconOnly ? <span>{downloadCaption}</span> : null}
            <span className="sr-only">{downloadCaption}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="bottom"
            sideOffset={8}
            className="w-72"
            positionerClassName="z-[260]"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {downloadMenu?.label ?? "Download quality"}
              </DropdownMenuLabel>
              {downloadMenu!.items.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className="items-start gap-3 py-2"
                  onClick={() => item.onSelect()}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background p-2 text-foreground [&_svg]:size-4">
                    {item.icon}
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm text-popover-foreground">
                      {item.title}
                    </span>
                    <span className="text-xs leading-snug text-muted-foreground">
                      {item.description}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <ActionButton
          label={downloadCaption}
          icon={downloadIcon}
          tone="primary"
          overlay={overlay}
          compact={iconOnly}
          wide={iconOnly && activelyEncoding}
          disabled={busy !== null}
          softDisabled={downloadBlocked}
          onClick={() => void handleDownload()}
        />
      )}
    </div>
  )
}
