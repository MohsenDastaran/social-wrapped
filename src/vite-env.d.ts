/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full URL of GET user-count endpoint. See docs/user-counter-backend.md */
  readonly VITE_USER_STATS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "../wasm-pkg/social_wrapped_wasm" {
  export default function init(): Promise<void>
  export function greet(name: string): string
}

declare module "../wasm-pkg/social_wrapped_wasm.js" {
  export default function init(): Promise<void>
  export function greet(name: string): string
}
