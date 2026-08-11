/// <reference lib="webworker" />
// Runs the WASM WhatsApp parser off the main thread.
// Flow: file → preview → (identity for chats | analyze for account report) → done.

import init, {
  analyze_whatsapp_bytes_with_progress,
  preview_whatsapp_bytes,
} from "@/wasm-pkg/social_wrapped_wasm.js"

import type {
  ImportProgressPhase,
  ImportWorkerResponse,
  WhatsAppImportWorkerRequest,
} from "@/platform/import"

function post(message: ImportWorkerResponse): void {
  self.postMessage(message)
}

function normalizePhase(value: unknown): ImportProgressPhase {
  return value === "computing" ? "computing" : "reading"
}

let pendingBytes: Uint8Array | null = null
let pendingFileName: string | null = null
let ready = false

async function ensureInit(): Promise<void> {
  if (ready) return
  await init()
  ready = true
}

async function runAnalyze(meName: string): Promise<void> {
  if (!pendingBytes) {
    post({
      type: "error",
      message: "Import session expired. Choose the file again.",
    })
    return
  }

  await ensureInit()
  const bytes = pendingBytes
  const fileName = pendingFileName
  pendingBytes = null
  pendingFileName = null

  const analyticsJson = analyze_whatsapp_bytes_with_progress(
    bytes,
    meName,
    fileName,
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
  pendingFileName = file.name

  const previewJson = preview_whatsapp_bytes(pendingBytes, file.name)
  const preview = JSON.parse(previewJson) as {
    chatName: string
    senders: string[]
    suggestedMe?: string | null
    isAccountReport?: boolean
  }

  // Account Information report — no chat senders / identity picker.
  if (preview.isAccountReport) {
    await runAnalyze("")
    return
  }

  if (!preview.senders?.length) {
    pendingBytes = null
    pendingFileName = null
    post({
      type: "error",
      message: "No senders found in this WhatsApp export.",
    })
    return
  }

  const suggested = preview.suggestedMe?.trim()
  if (suggested && preview.senders.includes(suggested)) {
    await runAnalyze(suggested)
    return
  }

  post({
    type: "need_identity",
    chatName: preview.chatName ?? "WhatsApp Chat",
    senders: preview.senders,
  })
}

self.onmessage = async (
  event: MessageEvent<WhatsAppImportWorkerRequest>
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
    pendingFileName = null
    post({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
