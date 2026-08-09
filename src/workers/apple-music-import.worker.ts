/// <reference lib="webworker" />
// Apple Music Library.xml → analyze → done.

import init, {
  analyze_apple_music_bytes_with_progress,
  preview_apple_music_bytes,
} from "@/wasm-pkg/social_wrapped_wasm.js"

import type {
  AppleMusicImportWorkerRequest,
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

  preview_apple_music_bytes(bytes)

  const analyticsJson = analyze_apple_music_bytes_with_progress(
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

self.onmessage = async (
  event: MessageEvent<AppleMusicImportWorkerRequest>
) => {
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
