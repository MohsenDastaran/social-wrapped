import { isTauri } from "@tauri-apps/api/core"

export type SaveBlobResult =
  | { ok: true; method: "tauri" | "file-picker" | "anchor" }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; error: string }

/**
 * Cross-platform file save for PNG/media blobs.
 *
 * 1. Tauri → native save dialog + filesystem write (fixes Linux WebKitGTK)
 * 2. Chromium → File System Access API
 * 3. Fallback → `<a download>` with delayed revoke (website / older browsers)
 */
export async function saveBlob(
  blob: Blob,
  filename: string
): Promise<SaveBlobResult> {
  try {
    if (isTauri()) {
      return await saveViaTauri(blob, filename)
    }
    if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
      try {
        return await saveViaFilePicker(blob, filename)
      } catch (error) {
        // User cancel or unsupported in this context — fall through.
        if (isAbortError(error)) {
          return { ok: false, cancelled: true }
        }
      }
    }
    await saveViaAnchor(blob, filename)
    return { ok: true, method: "anchor" }
  } catch (error) {
    return {
      ok: false,
      cancelled: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/** @deprecated Prefer `saveBlob` — kept for call sites that ignore the result. */
export function downloadBlob(blob: Blob, filename: string): void {
  void saveBlob(blob, filename)
}

async function saveViaTauri(
  blob: Blob,
  filename: string
): Promise<SaveBlobResult> {
  const { save } = await import("@tauri-apps/plugin-dialog")
  const { writeFile } = await import("@tauri-apps/plugin-fs")

  const ext = extensionOf(filename)
  const path = await save({
    defaultPath: filename,
    title: "Save export",
    filters: ext
      ? [{ name: ext.toUpperCase(), extensions: [ext] }]
      : undefined,
  })

  if (path == null) {
    return { ok: false, cancelled: true }
  }

  const bytes = new Uint8Array(await blob.arrayBuffer())
  await writeFile(path, bytes)
  return { ok: true, method: "tauri" }
}

async function saveViaFilePicker(
  blob: Blob,
  filename: string
): Promise<SaveBlobResult> {
  const ext = extensionOf(filename) ?? "png"
  const mime = blob.type || mimeForExt(ext)

  const handle = await window.showSaveFilePicker({
    suggestedName: filename,
    types: [
      {
        description: `${ext.toUpperCase()} file`,
        accept: { [mime]: [`.${ext}`] },
      },
    ],
  })

  const writable = await handle.createWritable()
  try {
    await writable.write(blob)
  } finally {
    await writable.close()
  }
  return { ok: true, method: "file-picker" }
}

async function saveViaAnchor(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.rel = "noopener"
  anchor.style.display = "none"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Delay revoke — immediate revoke races WebKitGTK / some Chromium builds.
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000)
}

function extensionOf(filename: string): string | undefined {
  const i = filename.lastIndexOf(".")
  if (i < 0 || i === filename.length - 1) return undefined
  return filename.slice(i + 1).toLowerCase()
}

function mimeForExt(ext: string): string {
  switch (ext) {
    case "png":
      return "image/png"
    case "jpg":
    case "jpeg":
      return "image/jpeg"
    case "webp":
      return "image/webp"
    case "webm":
      return "video/webm"
    case "mp4":
      return "video/mp4"
    default:
      return "application/octet-stream"
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  )
}

declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string
      types?: Array<{
        description?: string
        accept: Record<string, string[]>
      }>
    }) => Promise<FileSystemFileHandle>
  }

  interface FileSystemFileHandle {
    createWritable: () => Promise<FileSystemWritableFileStream>
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write: (data: Blob | BufferSource | string) => Promise<void>
    close: () => Promise<void>
  }
}
