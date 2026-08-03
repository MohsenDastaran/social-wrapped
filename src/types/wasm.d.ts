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
  export function analyze_telegram_bytes_with_progress(
    data: Uint8Array,
    onProgress: WasmProgressCallback
  ): string
  export function preview_whatsapp_bytes(
    data: Uint8Array,
    fileName?: string | null
  ): string
  export function analyze_whatsapp_bytes_with_progress(
    data: Uint8Array,
    meName: string,
    fileName: string | null | undefined,
    onProgress: WasmProgressCallback
  ): string
  export function preview_instagram_bytes(data: Uint8Array): string
  export function analyze_instagram_bytes_with_progress(
    data: Uint8Array,
    meName: string | null | undefined,
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
  export function analyze_telegram_bytes_with_progress(
    data: Uint8Array,
    onProgress: WasmProgressCallback
  ): string
  export function preview_whatsapp_bytes(
    data: Uint8Array,
    fileName?: string | null
  ): string
  export function analyze_whatsapp_bytes_with_progress(
    data: Uint8Array,
    meName: string,
    fileName: string | null | undefined,
    onProgress: WasmProgressCallback
  ): string
  export function preview_instagram_bytes(data: Uint8Array): string
  export function analyze_instagram_bytes_with_progress(
    data: Uint8Array,
    meName: string | null | undefined,
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
  export function analyze_telegram_bytes_with_progress(
    data: Uint8Array,
    onProgress: WasmProgressCallback
  ): string
  export function preview_whatsapp_bytes(
    data: Uint8Array,
    fileName?: string | null
  ): string
  export function analyze_whatsapp_bytes_with_progress(
    data: Uint8Array,
    meName: string,
    fileName: string | null | undefined,
    onProgress: WasmProgressCallback
  ): string
  export function preview_instagram_bytes(data: Uint8Array): string
  export function analyze_instagram_bytes_with_progress(
    data: Uint8Array,
    meName: string | null | undefined,
    onProgress: WasmProgressCallback
  ): string
}
