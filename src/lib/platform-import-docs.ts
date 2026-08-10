import type { PlatformId } from "@/lib/platforms"

/** Long-form export documentation shown in the import help dialog. */
export type PlatformImportDoc = {
  title: string
  paragraphs: string[]
  /** Official page for exporting or downloading data for this platform. */
  officialExportUrl: string
  officialExportLabel?: string
}

/**
 * Per-platform export docs for the import help dialog.
 * Add entries here as you document each platform.
 */
export const PLATFORM_IMPORT_DOCS: Partial<
  Record<PlatformId, PlatformImportDoc>
> = {
  telegram: {
    title: "Telegram Data Export Schema",
    paragraphs: [
      "Telegram allows you to export data connected to your account so that it becomes accessible offline in JSON or in human-readable HTML. To use this feature, make sure you have Telegram Desktop installed on your computer, then go to Settings → Advanced → Export Telegram data.",
      "This document outlines the data layout and schema for the JSON export. To view the HTML export, open export_results.html in a browser (or messages.html for a single-chat export).",
      "The schema below assumes a full export. If you exported a single chat, result.json represents a single Chat object — start reading the schema from there.",
    ],
    officialExportUrl: "https://core.telegram.org/import-export",
    officialExportLabel: "Telegram export documentation",
  },
  x: {
    title: "Download your X data archive",
    paragraphs: [
      "X lets you request a copy of your account data — tweets, DMs, likes, followers, and more — as a ZIP archive.",
      "Open Download your data in X settings, confirm your request, then hit Download archive when the file is ready (you’ll get an email when it’s prepared).",
      "Save the ZIP to your device and do not unzip it. Import that complete archive in Social Wrapped.",
    ],
    officialExportUrl: "https://x.com/settings/download_your_data",
    officialExportLabel: "Open X to download your data",
  },
}

export function getPlatformImportDoc(
  id: PlatformId
): PlatformImportDoc | undefined {
  return PLATFORM_IMPORT_DOCS[id]
}
