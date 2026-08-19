/// <reference lib="webworker" />
// Facebook JSON ZIP → preview (optional identity) → analyze → done.

import init, {
  analyze_facebook_bytes_with_progress,
  preview_facebook_bytes,
} from "@/wasm-pkg/social_wrapped_wasm.js"

import type {
  FacebookImportWorkerRequest,
  ImportProgressPhase,
  ImportWorkerResponse,
} from "@/platform/import"

function post(message: ImportWorkerResponse): void {
  self.postMessage(message)
}

function normalizePhase(value: unknown): ImportProgressPhase {
  return value === "computing" ? "computing" : "reading"
}

let pendingBytes: Uint8Array | null = null
let ready = false

async function ensureInit(): Promise<void> {
  if (ready) return
  await init()
  ready = true
}

async function runAnalyze(meName: string | null): Promise<void> {
  if (!pendingBytes) {
    post({
      type: "error",
      message: "Import session expired. Choose the file again.",
    })
    return
  }

  await ensureInit()
  const bytes = pendingBytes
  pendingBytes = null

  const analyticsJson = analyze_facebook_bytes_with_progress(
    bytes,
    meName,
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

async function handleFile(file: File): Promise<void> {
  await ensureInit()
  pendingBytes = new Uint8Array(await file.arrayBuffer())

  const previewJson = preview_facebook_bytes(pendingBytes)
  const preview = JSON.parse(previewJson) as {
    displayName?: string
    suggestedMe?: string | null
    senders: string[]
    threadCount?: number
    messageCount?: number
  }

  // No Messenger senders — still analyze friends / activity using the profile name.
  if (!preview.senders?.length) {
    await runAnalyze(preview.suggestedMe?.trim() || preview.displayName || null)
    return
  }

  const suggested = preview.suggestedMe?.trim()
  if (suggested && preview.senders.includes(suggested)) {
    await runAnalyze(suggested)
    return
  }

  post({
    type: "need_identity",
    chatName: preview.displayName ?? "Facebook",
    senders: preview.senders,
  })
}

self.onmessage = async (
  event: MessageEvent<FacebookImportWorkerRequest>
) => {
  try {
    const message = event.data
    if (message.type === "file") {
      await handleFile(message.file)
      return
    }
    if (message.type === "identity") {
      await runAnalyze(message.meName)
      return
    }
    post({ type: "error", message: "Unknown worker request." })
  } catch (error) {
    pendingBytes = null
    post({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
