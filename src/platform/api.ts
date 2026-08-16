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

/// Seeded 3.5-year Telegram `result.json` generated in Rust.
export async function generateTelegramDemoJson(): Promise<string> {
  if (isTauri()) {
    return invoke<string>("generate_telegram_demo_json")
  }
  const wasm = await getWasm()
  return wasm.generate_telegram_demo_json()
}

/** Seeded 3.5-year Instagram Meta JSON ZIP generated in Rust. */
export async function generateInstagramDemoZip(): Promise<Uint8Array> {
  if (isTauri()) {
    const data = await invoke<number[] | Uint8Array>("generate_instagram_demo_zip")
    return data instanceof Uint8Array ? data : new Uint8Array(data)
  }
  const wasm = await getWasm()
  return wasm.generate_instagram_demo_zip()
}
