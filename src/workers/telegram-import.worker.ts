/// <reference lib="webworker" />
// Runs the WASM Telegram parser off the main thread so the app never freezes.
// Progress messages are posted while the (synchronous) parse is running.

import init, {
  analyze_telegram_bytes_with_progress,
} from "@/wasm-pkg/social_wrapped_wasm.js"

import type {
  ImportWorkerRequest,
  ImportWorkerResponse,
} from "@/platform/import"

function post(message: ImportWorkerResponse): void {
  self.postMessage(message)
}

self.onmessage = async (event: MessageEvent<ImportWorkerRequest>) => {
  try {
    await init()

    const bytes = new Uint8Array(await event.data.file.arrayBuffer())
    const analyticsJson = analyze_telegram_bytes_with_progress(
      bytes,
      (loadedBytes: number, totalBytes: number) => {
        post({ type: "progress", loadedBytes, totalBytes })
      }
    )

    post({ type: "done", analyticsJson })
  } catch (error) {
    post({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
