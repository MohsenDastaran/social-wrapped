import type { PlatformConfig } from "@/lib/platforms"

/** Parsed stats returned by the Rust core (camelCase JSON). */
export type TelegramExportStats = {
  displayName: string
  username: string | null
  aboutPreview: string
  fileSizeBytes: number
  chatCount: number
  totalMessages: number
  sentMessages: number
  receivedMessages: number
  sampleMessages: string[]
}

export type ImportProgress = {
  /** 0–100, integer. */
  percent: number
  loadedBytes: number
  totalBytes: number
}

export type ImportWorkerRequest = { file: File }

export type ImportWorkerResponse =
  | { type: "progress"; loadedBytes: number; totalBytes: number }
  | { type: "done"; statsJson: string }
  | { type: "error"; message: string }

function validateFile(platform: PlatformConfig, file: File): void {
  if (platform.id !== "telegram") {
    throw new Error(
      `${platform.name} import isn’t wired yet. Only Telegram JSON exports can be analyzed right now.`
    )
  }

  const lower = file.name.toLowerCase()
  if (lower.endsWith(".zip")) {
    throw new Error(
      "ZIP archives aren’t supported yet. Open your Telegram export folder and choose result.json."
    )
  }
  if (!lower.endsWith(".json")) {
    throw new Error("Please choose a Telegram result.json export.")
  }
}

/**
 * Central entry point for importing a platform export.
 *
 * Parsing happens inside a dedicated Web Worker so the UI thread never
 * freezes, even for multi-hundred-MB exports. Works identically in the
 * browser and in Tauri webviews (Linux, Android, …) since both run the
 * same WASM parser off the main thread.
 */
export function importPlatformFile(
  platform: PlatformConfig,
  file: File,
  onProgress?: (progress: ImportProgress) => void
): Promise<TelegramExportStats> {
  validateFile(platform, file)

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/telegram-import.worker.ts", import.meta.url),
      { type: "module", name: "telegram-import" }
    )

    worker.onmessage = (event: MessageEvent<ImportWorkerResponse>) => {
      const message = event.data
      if (message.type === "progress") {
        const { loadedBytes, totalBytes } = message
        onProgress?.({
          percent:
            totalBytes > 0
              ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100))
              : 0,
          loadedBytes,
          totalBytes,
        })
        return
      }

      worker.terminate()
      if (message.type === "done") {
        resolve(JSON.parse(message.statsJson) as TelegramExportStats)
      } else {
        reject(new Error(message.message))
      }
    }

    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || "Import worker failed to start."))
    }

    worker.postMessage({ file } satisfies ImportWorkerRequest)
  })
}
