import type { ReactNode } from "react"
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
}

/** Shared fullscreen shell: close + share/save always visible. */
export function MediaFullscreenChrome({
  title,
  shareText,
  mediaUrl,
  fileName,
  onClose,
  children,
  className,
}: MediaFullscreenChromeProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[110] flex h-dvh w-screen flex-col bg-black",
        className
      )}
    >
      <div className="relative z-20 flex items-center justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-white ring-1 ring-white/40 backdrop-blur-md"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>

        {title ? (
          <p className="min-w-0 truncate text-center text-sm font-medium text-white/90">
            {title}
          </p>
        ) : (
          <span className="min-w-0 flex-1" />
        )}

        <ShareSaveActions
          appearance="overlay"
          iconOnly
          mediaUrl={mediaUrl}
          fileName={fileName}
          shareText={shareText}
          className="shrink-0"
        />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-3">
        {children}
      </div>

      <div className="relative z-20 flex flex-col items-center gap-3 bg-gradient-to-t from-black/90 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <ShareSaveActions
          appearance="overlay"
          mediaUrl={mediaUrl}
          fileName={fileName}
          shareText={shareText}
          className="w-full max-w-sm justify-center"
        />
        <p className="max-w-sm text-center text-xs leading-relaxed text-white/75">
          {shareText}
        </p>
      </div>
    </div>
  )
}
