export default async function init(): Promise<void> {}

export function greet(_name: string): string {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}

export async function load_telegram_mock(): Promise<string> {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}
