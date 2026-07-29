declare module "@/wasm-pkg/social_wrapped_wasm" {
  export default function init(): Promise<void>
  export function greet(name: string): string
  export function load_telegram_mock(): Promise<string>
}

declare module "@/wasm-pkg/social_wrapped_wasm.js" {
  export default function init(): Promise<void>
  export function greet(name: string): string
  export function load_telegram_mock(): Promise<string>
}

declare module "../wasm-pkg/social_wrapped_wasm.js" {
  export default function init(): Promise<void>
  export function greet(name: string): string
  export function load_telegram_mock(): Promise<string>
}
