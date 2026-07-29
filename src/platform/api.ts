import { invoke, isTauri } from "@tauri-apps/api/core";

type WasmModule = typeof import("../wasm-pkg/social_wrapped_wasm");

let wasmInit: Promise<WasmModule> | null = null;

/** Tauri invoke rejections are often plain strings, not Error instances. */
export function formatInvokeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

async function getWasm(): Promise<WasmModule> {
  if (!wasmInit) {
    wasmInit = import("../wasm-pkg/social_wrapped_wasm.js").then(async (mod) => {
      await mod.default();
      return mod;
    });
  }
  return wasmInit;
}

export async function greet(name: string): Promise<string> {
  if (isTauri()) {
    return invoke<string>("greet", { name });
  }
  const wasm = await getWasm();
  return wasm.greet(name);
}

/// Reads the Telegram mock export and returns a plain-text summary.
/// Only works in the desktop/mobile Tauri app (requires local filesystem access).
export async function loadTelegramMock(): Promise<string> {
  if (isTauri()) {
    return invoke<string>("load_telegram_mock");
  }
  throw new Error(
    "Telegram mock loading requires the desktop app — not available in browser.",
  );
}
