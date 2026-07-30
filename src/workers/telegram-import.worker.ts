/// <reference lib="webworker" />
// Runs the WASM Telegram parser off the main thread so the app never freezes.
// Progress messages are posted while the (synchronous) parse is running.

import init, {
  analyze_telegram_bytes_with_progress,
} from "@/wasm-pkg/social_wrapped_wasm.js"

import type {
  ImportProgressPhase,
  ImportWorkerRequest,
  ImportWorkerResponse,
} from "@/platform/import"

function post(message: ImportWorkerResponse): void {
  self.postMessage(message)
}

function normalizePhase(value: unknown): ImportProgressPhase {
  return value === "computing" ? "computing" : "reading"
}

self.onmessage = async (event: MessageEvent<ImportWorkerRequest>) => {
  try {
    await init()

    const bytes = new Uint8Array(await event.data.file.arrayBuffer())
    const analyticsJson = analyze_telegram_bytes_with_progress(
      bytes,
      (phase: string, current: number, total: number) => {
        post({
          type: "progress",
          phase: normalizePhase(phase),
          current,
          total,
        })
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
