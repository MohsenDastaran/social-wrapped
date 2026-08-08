/// <reference lib="webworker" />
// Spotify Account Data / Extended History → ZIP or JSON → analyze → done.

import { zipSync } from "fflate"

import init, {
  analyze_spotify_bytes_with_progress,
  preview_spotify_bytes,
} from "@/wasm-pkg/social_wrapped_wasm.js"

import type {
  ImportProgressPhase,
  ImportWorkerResponse,
  SpotifyImportWorkerRequest,
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

async function filesToBytes(files: File[]): Promise<Uint8Array> {
  if (files.length === 1) {
    const file = files[0]!
    const lower = file.name.toLowerCase()
    if (lower.endsWith(".zip")) {
      return new Uint8Array(await file.arrayBuffer())
    }
    // Single JSON — pass raw bytes (parser accepts streaming-history arrays).
    return new Uint8Array(await file.arrayBuffer())
  }

  // Multiple JSON / mixed files → ZIP so Identity + history stay together.
  const entries: Record<string, Uint8Array> = {}
  for (const file of files) {
    const name = file.name.replace(/^.*[/\\]/, "")
    entries[`Spotify Account Data/${name}`] = new Uint8Array(
      await file.arrayBuffer()
    )
  }
  return zipSync(entries)
}

async function handleFiles(files: File[]): Promise<void> {
  await ensureInit()
  const bytes = await filesToBytes(files)

  preview_spotify_bytes(bytes)

  const analyticsJson = analyze_spotify_bytes_with_progress(
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
  event: MessageEvent<SpotifyImportWorkerRequest>
) => {
  try {
    const message = event.data
    if (message.type === "files") {
      await handleFiles(message.files)
      return
    }
    if (message.type === "file") {
      await handleFiles([message.file])
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
