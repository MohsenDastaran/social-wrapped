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
  instagram: {
    title: "Export your Instagram information",
    paragraphs: [
      "Meta is gradually moving people to Meta Accounts. You may see either Accounts Centre or Meta Account settings as the place to manage exports.",
      "Export a copy of your Instagram information from Accounts Centre → Your information and permissions → Export your information. Choose Export to device (not an external service) so you get a ZIP you can import here.",
      "Android: Profile → Menu (top right) → Accounts Centre → Your information and permissions → Export your information → Create export. Select your profile, choose Export to device, then pick which info to include, a date range, format, notification email, and media quality. Prefer JSON. Tap Start export.",
      "Computer: Menu → Settings → Accounts Centre → Your information and permissions → Export your information → Create export. Select your profile, choose Export to device, customise the same options (prefer JSON), then Start export.",
      "When the export is ready (Instagram email and in-app notification; it can take up to 30 days), open Available downloads in Export your information. You have four days to download. Save the ZIP and import it in Social Wrapped without unzipping. Media quality mainly affects file size — Social Wrapped skips media binaries.",
    ],
    officialExportUrl:
      "https://help.instagram.com/181231772500920/?helpref=uf_share",
    officialExportLabel: "Instagram export help",
  },
}

export function getPlatformImportDoc(
  id: PlatformId
): PlatformImportDoc | undefined {
  return PLATFORM_IMPORT_DOCS[id]
}
