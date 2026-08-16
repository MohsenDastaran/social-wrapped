/// <reference lib="webworker" />
// ChatGPT data-export ZIP → analyze → done (identity from user.json; no picker).

import init, {
  analyze_chatgpt_bytes_with_progress,
  preview_chatgpt_bytes,
} from "@/wasm-pkg/social_wrapped_wasm.js"

import type {
  ChatGptImportWorkerRequest,
  ImportProgressPhase,
  ImportWorkerResponse,
} from "@/platform/import"

function post(message: ImportWorkerResponse): void {
  self.postMessage(message)
}

function normalizePhase(value: unknown): ImportProgressPhase {
  return value === "computing" ? "computing" : "reading"
}

let ready = false

async function ensureInit(): Promise<void> {
  if (ready) return
  await init()
  ready = true
}

async function handleFile(file: File): Promise<void> {
  await ensureInit()
  const bytes = new Uint8Array(await file.arrayBuffer())

  preview_chatgpt_bytes(bytes)

  const analyticsJson = analyze_chatgpt_bytes_with_progress(
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
}

self.onmessage = async (event: MessageEvent<ChatGptImportWorkerRequest>) => {
  try {
    const message = event.data
    if (message.type === "file") {
      await handleFile(message.file)
      return
    }
    post({ type: "error", message: "Unknown worker request." })
  } catch (error) {
    post({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
