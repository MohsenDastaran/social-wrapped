import { invoke, isTauri } from "@tauri-apps/api/core";

type WasmModule = typeof import("../wasm-pkg/social_wrapped_wasm");

let wasmInit: Promise<WasmModule> | null = null;

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
