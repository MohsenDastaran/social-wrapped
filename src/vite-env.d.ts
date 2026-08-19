/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API origin from `.env` `BASE_URL` (injected in vite.config). */
  readonly API_BASE_URL: string
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
