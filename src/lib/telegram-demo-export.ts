/** In-memory demo exports for the getting-started overlay. */

import {
  generateInstagramDemoZip,
  generateTelegramDemoJson,
} from "@/platform/api"

export const TELEGRAM_DEMO_FILE_NAME = "Demo · Telegram"
export const INSTAGRAM_DEMO_FILE_NAME = "Demo · Instagram"

export async function buildTelegramDemoFile(): Promise<File> {
  const json = await generateTelegramDemoJson()
  return new File([json], "result.json", { type: "application/json" })
}

export async function buildInstagramDemoFile(): Promise<File> {
  const bytes = await generateInstagramDemoZip()
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return new File([copy], "instagram-demo.zip", { type: "application/zip" })
}
