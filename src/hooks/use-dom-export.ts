import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { flushSync } from "react-dom"

import {
  downloadElementAsPng,
  type DomExportOptions,
} from "@/lib/dom-export"

type UseDomExportResult<T extends HTMLElement> = {
  /** Attach to the root node that should be captured. */
  ref: RefObject<T | null>
  /** True while a capture is in flight. */
  exporting: boolean
  /** Last export failure message (clears automatically). */
  exportError: string | null
  /** Capture the ref node and download a PNG. */
  exportPng: (filename: string, options?: DomExportOptions) => Promise<void>
}

/**
 * Reusable hook for “download this DOM node as a high-res PNG” buttons.
 * Pair with `data-export-ignore` on controls that should not appear in the image.
 */
export function useDomExport<T extends HTMLElement = HTMLDivElement>(
  defaultOptions?: DomExportOptions
): UseDomExportResult<T> {
  const ref = useRef<T | null>(null)
  const optionsRef = useRef(defaultOptions)
  optionsRef.current = defaultOptions
  const busyRef = useRef(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  useEffect(() => {
    if (!exportError) return
    const id = window.setTimeout(() => setExportError(null), 4_000)
    return () => window.clearTimeout(id)
  }, [exportError])

  const exportPng = useCallback(
    async (filename: string, options?: DomExportOptions) => {
      const node = ref.current
      if (!node || busyRef.current) return
      busyRef.current = true
      flushSync(() => {
        setExporting(true)
        setExportError(null)
      })
      try {
        await downloadElementAsPng(node, filename, {
          ...optionsRef.current,
          ...options,
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Export failed"
        setExportError(message)
        console.error("Export failed:", error)
      } finally {
        busyRef.current = false
        setExporting(false)
      }
    },
    []
  )

  return { ref, exporting, exportError, exportPng }
}
