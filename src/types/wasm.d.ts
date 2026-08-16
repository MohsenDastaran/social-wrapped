type WasmProgressCallback = (
  phase: "reading" | "computing",
  current: number,
  total: number
) => void

type WasmModuleExports = {
  default: () => Promise<void>
  greet: (name: string) => string
  load_telegram_mock: () => Promise<string>
  generate_telegram_demo_json: () => string
  generate_instagram_demo_zip: () => Uint8Array
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
  preview_linkedin_bytes: (data: Uint8Array) => string
  analyze_linkedin_bytes_with_progress: (
    data: Uint8Array,
    meName: string | null | undefined,
    onProgress: WasmProgressCallback
  ) => string
  preview_x_bytes: (data: Uint8Array) => string
  analyze_x_bytes_with_progress: (
    data: Uint8Array,
    onProgress: WasmProgressCallback
  ) => string
  preview_chatgpt_bytes: (data: Uint8Array) => string
  analyze_chatgpt_bytes_with_progress: (
    data: Uint8Array,
    onProgress: WasmProgressCallback
  ) => string
  preview_tiktok_bytes: (data: Uint8Array) => string
  analyze_tiktok_bytes_with_progress: (
    data: Uint8Array,
    meName: string | null | undefined,
    onProgress: WasmProgressCallback
  ) => string
  preview_spotify_bytes: (data: Uint8Array) => string
  analyze_spotify_bytes_with_progress: (
    data: Uint8Array,
    onProgress: WasmProgressCallback
  ) => string
  preview_apple_music_bytes: (data: Uint8Array) => string
  analyze_apple_music_bytes_with_progress: (
    data: Uint8Array,
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
  export const generate_telegram_demo_json: WasmModuleExports["generate_telegram_demo_json"]
  export const generate_instagram_demo_zip: WasmModuleExports["generate_instagram_demo_zip"]
  export const summarize_telegram_bytes: WasmModuleExports["summarize_telegram_bytes"]
  export const summarize_telegram_bytes_with_progress: WasmModuleExports["summarize_telegram_bytes_with_progress"]
  export const analyze_telegram_bytes_with_progress: WasmModuleExports["analyze_telegram_bytes_with_progress"]
  export const preview_whatsapp_bytes: WasmModuleExports["preview_whatsapp_bytes"]
  export const analyze_whatsapp_bytes_with_progress: WasmModuleExports["analyze_whatsapp_bytes_with_progress"]
  export const preview_instagram_bytes: WasmModuleExports["preview_instagram_bytes"]
  export const analyze_instagram_bytes_with_progress: WasmModuleExports["analyze_instagram_bytes_with_progress"]
  export const preview_linkedin_bytes: WasmModuleExports["preview_linkedin_bytes"]
  export const analyze_linkedin_bytes_with_progress: WasmModuleExports["analyze_linkedin_bytes_with_progress"]
  export const preview_x_bytes: WasmModuleExports["preview_x_bytes"]
  export const analyze_x_bytes_with_progress: WasmModuleExports["analyze_x_bytes_with_progress"]
  export const preview_chatgpt_bytes: WasmModuleExports["preview_chatgpt_bytes"]
  export const analyze_chatgpt_bytes_with_progress: WasmModuleExports["analyze_chatgpt_bytes_with_progress"]
  export const preview_tiktok_bytes: WasmModuleExports["preview_tiktok_bytes"]
  export const analyze_tiktok_bytes_with_progress: WasmModuleExports["analyze_tiktok_bytes_with_progress"]
  export const preview_spotify_bytes: WasmModuleExports["preview_spotify_bytes"]
  export const analyze_spotify_bytes_with_progress: WasmModuleExports["analyze_spotify_bytes_with_progress"]
  export const preview_apple_music_bytes: WasmModuleExports["preview_apple_music_bytes"]
  export const analyze_apple_music_bytes_with_progress: WasmModuleExports["analyze_apple_music_bytes_with_progress"]
  export const analyze_google_zip_bytes_with_progress: WasmModuleExports["analyze_google_zip_bytes_with_progress"]
  export const merge_google_insights_json: WasmModuleExports["merge_google_insights_json"]
  export const google_shell_analytics_json: WasmModuleExports["google_shell_analytics_json"]
}

declare module "@/wasm-pkg/social_wrapped_wasm.js" {
  const init: WasmModuleExports["default"]
  export default init
  export const greet: WasmModuleExports["greet"]
  export const load_telegram_mock: WasmModuleExports["load_telegram_mock"]
  export const generate_telegram_demo_json: WasmModuleExports["generate_telegram_demo_json"]
  export const generate_instagram_demo_zip: WasmModuleExports["generate_instagram_demo_zip"]
  export const summarize_telegram_bytes: WasmModuleExports["summarize_telegram_bytes"]
  export const summarize_telegram_bytes_with_progress: WasmModuleExports["summarize_telegram_bytes_with_progress"]
  export const analyze_telegram_bytes_with_progress: WasmModuleExports["analyze_telegram_bytes_with_progress"]
  export const preview_whatsapp_bytes: WasmModuleExports["preview_whatsapp_bytes"]
  export const analyze_whatsapp_bytes_with_progress: WasmModuleExports["analyze_whatsapp_bytes_with_progress"]
  export const preview_instagram_bytes: WasmModuleExports["preview_instagram_bytes"]
  export const analyze_instagram_bytes_with_progress: WasmModuleExports["analyze_instagram_bytes_with_progress"]
  export const preview_linkedin_bytes: WasmModuleExports["preview_linkedin_bytes"]
  export const analyze_linkedin_bytes_with_progress: WasmModuleExports["analyze_linkedin_bytes_with_progress"]
  export const preview_x_bytes: WasmModuleExports["preview_x_bytes"]
  export const analyze_x_bytes_with_progress: WasmModuleExports["analyze_x_bytes_with_progress"]
  export const preview_chatgpt_bytes: WasmModuleExports["preview_chatgpt_bytes"]
  export const analyze_chatgpt_bytes_with_progress: WasmModuleExports["analyze_chatgpt_bytes_with_progress"]
  export const preview_tiktok_bytes: WasmModuleExports["preview_tiktok_bytes"]
  export const analyze_tiktok_bytes_with_progress: WasmModuleExports["analyze_tiktok_bytes_with_progress"]
  export const preview_spotify_bytes: WasmModuleExports["preview_spotify_bytes"]
  export const analyze_spotify_bytes_with_progress: WasmModuleExports["analyze_spotify_bytes_with_progress"]
  export const preview_apple_music_bytes: WasmModuleExports["preview_apple_music_bytes"]
  export const analyze_apple_music_bytes_with_progress: WasmModuleExports["analyze_apple_music_bytes_with_progress"]
  export const analyze_google_zip_bytes_with_progress: WasmModuleExports["analyze_google_zip_bytes_with_progress"]
  export const merge_google_insights_json: WasmModuleExports["merge_google_insights_json"]
  export const google_shell_analytics_json: WasmModuleExports["google_shell_analytics_json"]
}

declare module "../wasm-pkg/social_wrapped_wasm.js" {
  const init: WasmModuleExports["default"]
  export default init
  export const greet: WasmModuleExports["greet"]
  export const load_telegram_mock: WasmModuleExports["load_telegram_mock"]
  export const generate_telegram_demo_json: WasmModuleExports["generate_telegram_demo_json"]
  export const generate_instagram_demo_zip: WasmModuleExports["generate_instagram_demo_zip"]
  export const summarize_telegram_bytes: WasmModuleExports["summarize_telegram_bytes"]
  export const summarize_telegram_bytes_with_progress: WasmModuleExports["summarize_telegram_bytes_with_progress"]
  export const analyze_telegram_bytes_with_progress: WasmModuleExports["analyze_telegram_bytes_with_progress"]
  export const preview_whatsapp_bytes: WasmModuleExports["preview_whatsapp_bytes"]
  export const analyze_whatsapp_bytes_with_progress: WasmModuleExports["analyze_whatsapp_bytes_with_progress"]
  export const preview_instagram_bytes: WasmModuleExports["preview_instagram_bytes"]
  export const analyze_instagram_bytes_with_progress: WasmModuleExports["analyze_instagram_bytes_with_progress"]
  export const preview_linkedin_bytes: WasmModuleExports["preview_linkedin_bytes"]
  export const analyze_linkedin_bytes_with_progress: WasmModuleExports["analyze_linkedin_bytes_with_progress"]
  export const preview_x_bytes: WasmModuleExports["preview_x_bytes"]
  export const analyze_x_bytes_with_progress: WasmModuleExports["analyze_x_bytes_with_progress"]
  export const preview_chatgpt_bytes: WasmModuleExports["preview_chatgpt_bytes"]
  export const analyze_chatgpt_bytes_with_progress: WasmModuleExports["analyze_chatgpt_bytes_with_progress"]
  export const preview_tiktok_bytes: WasmModuleExports["preview_tiktok_bytes"]
  export const analyze_tiktok_bytes_with_progress: WasmModuleExports["analyze_tiktok_bytes_with_progress"]
  export const preview_spotify_bytes: WasmModuleExports["preview_spotify_bytes"]
  export const analyze_spotify_bytes_with_progress: WasmModuleExports["analyze_spotify_bytes_with_progress"]
  export const preview_apple_music_bytes: WasmModuleExports["preview_apple_music_bytes"]
  export const analyze_apple_music_bytes_with_progress: WasmModuleExports["analyze_apple_music_bytes_with_progress"]
  export const analyze_google_zip_bytes_with_progress: WasmModuleExports["analyze_google_zip_bytes_with_progress"]
  export const merge_google_insights_json: WasmModuleExports["merge_google_insights_json"]
  export const google_shell_analytics_json: WasmModuleExports["google_shell_analytics_json"]
}
