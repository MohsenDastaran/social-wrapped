import type { PlatformLogoId } from "@/components/platform-logo"

/** Single source of truth for whether a platform is available to use. */
export const PLATFORM_ENABLED = {
  telegram: true,
  whatsapp: false,
  x: false,
  google: false,
  instagram: false,
  tiktok: false,
  spotify: false,
  youtube: false,
} as const satisfies Record<PlatformLogoId, boolean>

export type PlatformId = keyof typeof PLATFORM_ENABLED

export function isPlatformEnabled(id: PlatformId): boolean {
  return PLATFORM_ENABLED[id]
}

export type PlatformConfig = {
  id: PlatformId
  name: string
  accentClass: string
  /** Short blurb on list cards */
  summary: string
  exportPath: string
  formats: string
  extractable: string
  steps: string[]
  importHint?: string
  /** Dedicated import page */
  importTitle: string
  importDescription: string
  /** Human-readable accepted file labels */
  acceptedFiles: string[]
  /** HTML `accept` attribute for the file picker */
  accept: string
}

/** Tier 1 high-priority platforms from docs/target-platforms.md */
export const HIGH_PRIORITY_PLATFORMS: PlatformConfig[] = [
  {
    id: "telegram",
    name: "Telegram",
    accentClass: "border-sky-500/50",
    summary:
      "Export chats from Telegram Desktop as JSON, then import them locally.",
    exportPath: "Telegram Desktop → Settings → Advanced → Export Telegram Data",
    formats: "JSON, HTML",
    extractable:
      "Complete message history for DMs, groups, and channels — including media metadata, stickers, reactions, polls, and timestamps.",
    steps: [
      "Open Telegram Desktop (export is most complete from the desktop app).",
      "Go to Settings → Advanced → Export Telegram Data.",
      "Choose Machine-readable JSON (preferred). Optionally include media.",
      "Select the chats you want, then start the export and wait for the folder to finish.",
      "In Social Wrapped, import that export folder (or its result.json) from Home.",
    ],
    importHint:
      "Prefer JSON over HTML. Keep the export folder intact if you included media.",
    importTitle: "Import Telegram data",
    importDescription:
      "Choose your Telegram Desktop export — typically result.json or the export folder ZIP. Everything is processed on your device.",
    acceptedFiles: [".json", ".zip"],
    accept: ".json,.zip,application/json,application/zip",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    accentClass: "border-emerald-500/50",
    summary: "Export a chat as a .txt file (with optional media attachments).",
    exportPath: "Chat → ⋮ / Settings → Export Chat",
    formats: ".txt (+ optional media)",
    extractable:
      "Timestamped message logs with sender names, system events, and media references.",
    steps: [
      "Open an individual or group chat.",
      "Use Export Chat and choose whether to include media.",
      "Save the .txt (and media folder if included).",
      "Import into Social Wrapped when WhatsApp support ships.",
    ],
    importTitle: "Import WhatsApp data",
    importDescription:
      "Upload a WhatsApp chat export (.txt). Media folders are optional.",
    acceptedFiles: [".txt", ".zip"],
    accept: ".txt,.zip,text/plain,application/zip",
  },
  {
    id: "x",
    name: "X (Twitter)",
    accentClass: "border-zinc-500/50",
    summary: "Request your full archive ZIP from account settings.",
    exportPath: "Account Settings → Download an archive of your data",
    formats: "JSON + HTML (ZIP)",
    extractable:
      "Tweets, DMs, likes, bookmarks, followers, following, and engagement history.",
    steps: [
      "Request your archive from X settings and wait for the email.",
      "Download and unzip the archive.",
      "Import into Social Wrapped when X support ships.",
    ],
    importTitle: "Import X (Twitter) data",
    importDescription:
      "Upload your X data archive ZIP after you download it from account settings.",
    acceptedFiles: [".zip"],
    accept: ".zip,application/zip",
  },
  {
    id: "google",
    name: "Google Ecosystem",
    accentClass: "border-blue-500/50",
    summary: "Use Google Takeout to package Chat, Maps, Chrome, and more.",
    exportPath: "Google Takeout (takeout.google.com)",
    formats: "JSON, CSV, GeoJSON, KML",
    extractable:
      "Chat/Hangouts, location history, Keep, Chrome history, Calendar, Maps places, and more.",
    steps: [
      "Open Google Takeout and select the services you want.",
      "Export and download the archive when ready.",
      "Import into Social Wrapped when Google support ships.",
    ],
    importTitle: "Import Google Takeout",
    importDescription:
      "Upload a Google Takeout archive (.zip) or extracted JSON/CSV files.",
    acceptedFiles: [".zip", ".json", ".csv"],
    accept: ".zip,.json,.csv,application/zip,application/json,text/csv",
  },
  {
    id: "instagram",
    name: "Instagram",
    accentClass: "border-fuchsia-500/50",
    summary: "Download your information from Meta Accounts Center.",
    exportPath:
      "Accounts Center → Your information and permissions → Download your information",
    formats: "JSON or HTML",
    extractable:
      "DMs, posts, stories metadata, comments, likes, saved posts, and search history.",
    steps: [
      "Request a download from Meta Accounts Center.",
      "Choose JSON when available, then download the archive.",
      "Import into Social Wrapped when Instagram support ships.",
    ],
    importTitle: "Import Instagram data",
    importDescription:
      "Upload your Instagram information download (JSON preferred, or ZIP).",
    acceptedFiles: [".json", ".zip", ".html"],
    accept: ".json,.zip,.html,application/json,application/zip,text/html",
  },
  {
    id: "tiktok",
    name: "TikTok",
    accentClass: "border-cyan-500/50",
    summary: "Request a copy of your TikTok account data from settings.",
    exportPath: "Settings → Account → Download your data",
    formats: "JSON or TXT",
    extractable:
      "Watch history, likes, comments, DMs, favorites, and profile details.",
    steps: [
      "Request your data download in TikTok settings.",
      "Download the archive when TikTok notifies you.",
      "Import into Social Wrapped when TikTok support ships.",
    ],
    importTitle: "Import TikTok data",
    importDescription:
      "Upload your TikTok data download as JSON, TXT, or ZIP.",
    acceptedFiles: [".json", ".txt", ".zip"],
    accept: ".json,.txt,.zip,application/json,text/plain,application/zip",
  },
  {
    id: "spotify",
    name: "Spotify",
    accentClass: "border-green-500/50",
    summary: "Download your listening history and library as JSON.",
    exportPath: "Account → Privacy settings → Download your data",
    formats: "JSON",
    extractable:
      "Extended streaming history, playlists, library, and listening timestamps.",
    steps: [
      "Request your data (and extended streaming history if offered).",
      "Download the ZIP when Spotify emails you.",
      "Import into Social Wrapped when Spotify support ships.",
    ],
    importTitle: "Import Spotify data",
    importDescription:
      "Upload your Spotify privacy export ZIP or JSON streaming history files.",
    acceptedFiles: [".zip", ".json"],
    accept: ".zip,.json,application/zip,application/json",
  },
  {
    id: "youtube",
    name: "YouTube",
    accentClass: "border-red-500/50",
    summary: "Pull watch and search history via Google Takeout.",
    exportPath: "Google Takeout → YouTube and YouTube Music",
    formats: "JSON, CSV",
    extractable:
      "Watch history, search history, playlists, comments, subscriptions, and more.",
    steps: [
      "Use Google Takeout and include YouTube.",
      "Download the archive when ready.",
      "Import into Social Wrapped when YouTube support ships.",
    ],
    importTitle: "Import YouTube data",
    importDescription:
      "Upload YouTube data from Google Takeout — ZIP, JSON, or CSV.",
    acceptedFiles: [".zip", ".json", ".csv"],
    accept: ".zip,.json,.csv,application/zip,application/json,text/csv",
  },
]

export function getPlatform(id: string | undefined): PlatformConfig | undefined {
  if (!id) return undefined
  return HIGH_PRIORITY_PLATFORMS.find((platform) => platform.id === id)
}

export function platformImportPath(id: PlatformId): string {
  return `/import/${id}`
}

/** Deep-link into Docs and open that platform’s guide dialog. */
export function platformDocsPath(id: PlatformId): string {
  return `/docs?platform=${id}`
}
