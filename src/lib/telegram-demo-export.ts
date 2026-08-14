/** In-memory Telegram Desktop `result.json` for the getting-started demo. */

import { generateTelegramDemoJson } from "@/platform/api"

export const TELEGRAM_DEMO_FILE_NAME = "Demo · Telegram"

export async function buildTelegramDemoFile(): Promise<File> {
  const json = await generateTelegramDemoJson()
  return new File([json], "result.json", { type: "application/json" })
}
