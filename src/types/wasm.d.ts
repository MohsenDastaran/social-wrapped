type WasmProgressCallback = (
  phase: "reading" | "computing",
  current: number,
  total: number
) => void

declare module "@/wasm-pkg/social_wrapped_wasm" {
  export default function init(): Promise<void>
  export function greet(name: string): string
  export function load_telegram_mock(): Promise<string>
  export function summarize_telegram_bytes(data: Uint8Array): string
  export function summarize_telegram_bytes_with_progress(
    data: Uint8Array,
    onProgress: WasmProgressCallback
  ): string
  /** Full analytics pass — returns WrapAnalytics JSON. */
  export function analyze_telegram_bytes_with_progress(
    data: Uint8Array,
    onProgress: WasmProgressCallback
  ): string
}

declare module "@/wasm-pkg/social_wrapped_wasm.js" {
  export default function init(): Promise<void>
  export function greet(name: string): string
  export function load_telegram_mock(): Promise<string>
  export function summarize_telegram_bytes(data: Uint8Array): string
  export function summarize_telegram_bytes_with_progress(
    data: Uint8Array,
    onProgress: WasmProgressCallback
  ): string
  /** Full analytics pass — returns WrapAnalytics JSON. */
  export function analyze_telegram_bytes_with_progress(
    data: Uint8Array,
    onProgress: WasmProgressCallback
  ): string
}

declare module "../wasm-pkg/social_wrapped_wasm.js" {
  export default function init(): Promise<void>
  export function greet(name: string): string
  export function load_telegram_mock(): Promise<string>
  export function summarize_telegram_bytes(data: Uint8Array): string
  export function summarize_telegram_bytes_with_progress(
    data: Uint8Array,
    onProgress: WasmProgressCallback
  ): string
  /** Full analytics pass — returns WrapAnalytics JSON. */
  export function analyze_telegram_bytes_with_progress(
    data: Uint8Array,
    onProgress: WasmProgressCallback
  ): string
}
