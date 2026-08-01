import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

import { ShareSaveActions } from "@/components/share-save-actions"
import { cn } from "@/lib/utils"

export type MediaFullscreenChromeProps = {
  title?: string
  shareText: string
  mediaUrl: string
  fileName: string
  onClose: () => void
  children: ReactNode
  className?: string
  /** When false, Save shows DotmSquare12 until the file URL is ready. */
  downloadReady?: boolean
  /** 0–1 encode progress for the downloadable file. */
  downloadProgress?: number
  downloadStatus?: string
  /** Encode-then-save when the file isn't ready yet. */
  onRequestDownload?: () => Promise<void>
}

/** Shared fullscreen shell: close + share/save overlay the media (ported to body). */
export function MediaFullscreenChrome({
  title,
  shareText,
  mediaUrl,
  fileName,
  onClose,
  children,
  className,
  downloadReady,
  downloadProgress,
  downloadStatus,
  onRequestDownload,
}: MediaFullscreenChromeProps) {
  if (typeof document === "undefined") return null

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[200] flex h-dvh w-screen items-center justify-center bg-black",
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Media viewer"}
    >
      <div className="absolute inset-0 z-[200] flex min-h-0 items-center justify-center">
        {children}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[210] h-28 bg-gradient-to-b from-black/80 via-black/40 to-transparent" />

      <div className="absolute inset-x-0 top-0 z-[220] flex items-center justify-between gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-lg ring-2 ring-white/80"
          aria-label="Close"
        >
          <X className="size-5" strokeWidth={2.5} />
        </button>

        <ShareSaveActions
          appearance="overlay"
          iconOnly
          mediaUrl={mediaUrl}
          fileName={fileName}
          shareText={shareText}
          downloadReady={downloadReady}
          downloadProgress={downloadProgress}
          downloadStatus={downloadStatus}
          onRequestDownload={onRequestDownload}
          className="pointer-events-auto shrink-0"
        />
      </div>
    </div>,
    document.body
  )
}
