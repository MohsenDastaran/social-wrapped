import { invoke, isTauri } from "@tauri-apps/api/core"

type WasmModule = typeof import("@/wasm-pkg/social_wrapped_wasm")

let wasmInit: Promise<WasmModule> | null = null

/** Tauri invoke rejections are often plain strings, not Error instances. */
export function formatInvokeError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

async function getWasm(): Promise<WasmModule> {
  if (!wasmInit) {
    wasmInit = import("@/wasm-pkg/social_wrapped_wasm.js").then(async (mod) => {
      await mod.default()
      return mod
    })
  }
  return wasmInit
}

export async function greet(name: string): Promise<string> {
  if (isTauri()) {
    return invoke<string>("greet", { name })
  }
  const wasm = await getWasm()
  return wasm.greet(name)
}

/// Reads the Telegram mock export and returns a plain-text summary.
/// In Tauri: reads from the local filesystem. In the browser: fetches via WASM.
export async function loadTelegramMock(): Promise<string> {
  if (isTauri()) {
    return invoke<string>("load_telegram_mock")
  }
  const wasm = await getWasm()
  return wasm.load_telegram_mock()
}

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

/** Analyze a Telegram `result.json` File from the picker. Stays on-device. */
export async function summarizeTelegramFile(
  file: File
): Promise<TelegramExportStats> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith(".zip")) {
    throw new Error(
      "ZIP archives aren’t supported yet. Open your Telegram export folder and choose result.json."
    )
  }
  if (!lower.endsWith(".json")) {
    throw new Error("Please choose a Telegram result.json export.")
  }

  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // File picker bytes stay in the webview; WASM parses locally (Tauri + browser).
  const wasm = await getWasm()
  const json = wasm.summarize_telegram_bytes(bytes)
  return JSON.parse(json) as TelegramExportStats
}
