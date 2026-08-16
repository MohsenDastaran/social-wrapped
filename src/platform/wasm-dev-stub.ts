export default async function init(): Promise<void> {}

export function greet(_name: string): string {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}

export async function load_telegram_mock(): Promise<string> {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}

export function generate_telegram_demo_json(): string {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}

export function generate_instagram_demo_zip(): Uint8Array {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}

export function summarize_telegram_bytes(_data: Uint8Array): string {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}

export function summarize_telegram_bytes_with_progress(
  _data: Uint8Array,
  _onProgress: (
    phase: "reading" | "computing",
    current: number,
    total: number
  ) => void
): string {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}

export function analyze_telegram_bytes_with_progress(
  _data: Uint8Array,
  _onProgress: (
    phase: "reading" | "computing",
    current: number,
    total: number
  ) => void
): string {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}

export function preview_whatsapp_bytes(
  _data: Uint8Array,
  _fileName?: string | null
): string {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}

export function analyze_whatsapp_bytes_with_progress(
  _data: Uint8Array,
  _meName: string,
  _fileName: string | null | undefined,
  _onProgress: (
    phase: "reading" | "computing",
    current: number,
    total: number
  ) => void
): string {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}

export function preview_instagram_bytes(_data: Uint8Array): string {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}

export function analyze_instagram_bytes_with_progress(
  _data: Uint8Array,
  _meName: string | null | undefined,
  _onProgress: (
    phase: "reading" | "computing",
    current: number,
    total: number
  ) => void
): string {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}

export function preview_linkedin_bytes(_data: Uint8Array): string {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}

export function analyze_linkedin_bytes_with_progress(
  _data: Uint8Array,
  _meName: string | null | undefined,
  _onProgress: (
    phase: "reading" | "computing",
    current: number,
    total: number
  ) => void
): string {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}

export function preview_x_bytes(_data: Uint8Array): string {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}

export function analyze_x_bytes_with_progress(
  _data: Uint8Array,
  _onProgress: (
    phase: "reading" | "computing",
    current: number,
    total: number
  ) => void
): string {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}

export function preview_tiktok_bytes(_data: Uint8Array): string {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}

export function analyze_tiktok_bytes_with_progress(
  _data: Uint8Array,
  _meName: string | null | undefined,
  _onProgress: (
    phase: "reading" | "computing",
    current: number,
    total: number
  ) => void
): string {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}

export function preview_spotify_bytes(_data: Uint8Array): string {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}

export function analyze_spotify_bytes_with_progress(
  _data: Uint8Array,
  _onProgress: (
    phase: "reading" | "computing",
    current: number,
    total: number
  ) => void
): string {
  throw new Error("WASM module not built. Run: bun run build:wasm:dev")
}
