type WasmProgressCallback = (
  phase: "reading" | "computing",
  current: number,
  total: number
) => void

type WasmModuleExports = {
  default: () => Promise<void>
  greet: (name: string) => string
  load_telegram_mock: () => Promise<string>
  summarize_telegram_bytes: (data: Uint8Array) => string
  summarize_telegram_bytes_with_progress: (
    data: Uint8Array,
    onProgress: WasmProgressCallback
  ) => string
  analyze_telegram_bytes_with_progress: (
    data: Uint8Array,
    onProgress: WasmProgressCallback
  ) => string
  preview_whatsapp_bytes: (
    data: Uint8Array,
    fileName?: string | null
  ) => string
  analyze_whatsapp_bytes_with_progress: (
    data: Uint8Array,
    meName: string,
    fileName: string | null | undefined,
    onProgress: WasmProgressCallback
  ) => string
  preview_instagram_bytes: (data: Uint8Array) => string
  analyze_instagram_bytes_with_progress: (
    data: Uint8Array,
    meName: string | null | undefined,
    onProgress: WasmProgressCallback
  ) => string
  analyze_google_zip_bytes_with_progress: (
    data: Uint8Array,
    youtubeOnly: boolean,
    onProgress: WasmProgressCallback
  ) => string
  merge_google_insights_json: (a: string, b: string) => string
  google_shell_analytics_json: (
    displayName: string,
    fileSizeBytes: bigint
  ) => string
}

declare module "@/wasm-pkg/social_wrapped_wasm" {
  const init: WasmModuleExports["default"]
  export default init
  export const greet: WasmModuleExports["greet"]
  export const load_telegram_mock: WasmModuleExports["load_telegram_mock"]
  export const summarize_telegram_bytes: WasmModuleExports["summarize_telegram_bytes"]
  export const summarize_telegram_bytes_with_progress: WasmModuleExports["summarize_telegram_bytes_with_progress"]
  export const analyze_telegram_bytes_with_progress: WasmModuleExports["analyze_telegram_bytes_with_progress"]
  export const preview_whatsapp_bytes: WasmModuleExports["preview_whatsapp_bytes"]
  export const analyze_whatsapp_bytes_with_progress: WasmModuleExports["analyze_whatsapp_bytes_with_progress"]
  export const preview_instagram_bytes: WasmModuleExports["preview_instagram_bytes"]
  export const analyze_instagram_bytes_with_progress: WasmModuleExports["analyze_instagram_bytes_with_progress"]
  export const analyze_google_zip_bytes_with_progress: WasmModuleExports["analyze_google_zip_bytes_with_progress"]
  export const merge_google_insights_json: WasmModuleExports["merge_google_insights_json"]
  export const google_shell_analytics_json: WasmModuleExports["google_shell_analytics_json"]
}

declare module "@/wasm-pkg/social_wrapped_wasm.js" {
  const init: WasmModuleExports["default"]
  export default init
  export const greet: WasmModuleExports["greet"]
  export const load_telegram_mock: WasmModuleExports["load_telegram_mock"]
  export const summarize_telegram_bytes: WasmModuleExports["summarize_telegram_bytes"]
  export const summarize_telegram_bytes_with_progress: WasmModuleExports["summarize_telegram_bytes_with_progress"]
  export const analyze_telegram_bytes_with_progress: WasmModuleExports["analyze_telegram_bytes_with_progress"]
  export const preview_whatsapp_bytes: WasmModuleExports["preview_whatsapp_bytes"]
  export const analyze_whatsapp_bytes_with_progress: WasmModuleExports["analyze_whatsapp_bytes_with_progress"]
  export const preview_instagram_bytes: WasmModuleExports["preview_instagram_bytes"]
  export const analyze_instagram_bytes_with_progress: WasmModuleExports["analyze_instagram_bytes_with_progress"]
  export const analyze_google_zip_bytes_with_progress: WasmModuleExports["analyze_google_zip_bytes_with_progress"]
  export const merge_google_insights_json: WasmModuleExports["merge_google_insights_json"]
  export const google_shell_analytics_json: WasmModuleExports["google_shell_analytics_json"]
}

declare module "../wasm-pkg/social_wrapped_wasm.js" {
  const init: WasmModuleExports["default"]
  export default init
  export const greet: WasmModuleExports["greet"]
  export const load_telegram_mock: WasmModuleExports["load_telegram_mock"]
  export const summarize_telegram_bytes: WasmModuleExports["summarize_telegram_bytes"]
  export const summarize_telegram_bytes_with_progress: WasmModuleExports["summarize_telegram_bytes_with_progress"]
  export const analyze_telegram_bytes_with_progress: WasmModuleExports["analyze_telegram_bytes_with_progress"]
  export const preview_whatsapp_bytes: WasmModuleExports["preview_whatsapp_bytes"]
  export const analyze_whatsapp_bytes_with_progress: WasmModuleExports["analyze_whatsapp_bytes_with_progress"]
  export const preview_instagram_bytes: WasmModuleExports["preview_instagram_bytes"]
  export const analyze_instagram_bytes_with_progress: WasmModuleExports["analyze_instagram_bytes_with_progress"]
  export const analyze_google_zip_bytes_with_progress: WasmModuleExports["analyze_google_zip_bytes_with_progress"]
  export const merge_google_insights_json: WasmModuleExports["merge_google_insights_json"]
  export const google_shell_analytics_json: WasmModuleExports["google_shell_analytics_json"]
}
