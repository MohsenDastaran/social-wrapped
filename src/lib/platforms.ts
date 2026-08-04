import type { PlatformLogoId } from "@/components/platform-logo"

/** Single source of truth for whether a platform is available to use. */
export const PLATFORM_ENABLED = {
  telegram: true,
  whatsapp: true,
  x: true,
  google: true,
  instagram: true,
  tiktok: false,
  spotify: false,
  youtube: true,
  linkedin: true,
} as const satisfies Record<PlatformLogoId, boolean>

export type PlatformId = keyof typeof PLATFORM_ENABLED

export function isPlatformEnabled(id: PlatformId): boolean {
  return PLATFORM_ENABLED[id]
}

export type PlatformConfig = {
  id: PlatformId
  name: string
  accentClass: string
  /** Soft wash for featured home cards */
  gradientClass: string
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
    gradientClass:
      "from-sky-500/25 via-sky-400/10 to-transparent dark:from-sky-400/20 dark:via-sky-500/5",
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
    acceptedFiles: [".json"],
    accept: ".json,.zip,application/json,application/zip",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    accentClass: "border-emerald-500/50",
    gradientClass:
      "from-emerald-500/25 via-emerald-400/10 to-transparent dark:from-emerald-400/20 dark:via-emerald-500/5",
    summary: "Export a chat as a .txt file (with optional media attachments).",
    exportPath: "Chat → ⋮ / Settings → Export Chat",
    formats: ".txt (+ optional media)",
    extractable:
      "Timestamped message logs with sender names, system events, and media references.",
    steps: [
      "Open an individual or group chat.",
      "Use Export Chat and choose whether to include media.",
      "Save the .txt, or the ZIP if you included media.",
      "In Social Wrapped, import that .txt or ZIP from Home → WhatsApp.",
    ],
    importHint:
      "ZIP exports with media work — we read the chat .txt inside and ignore media binaries.",
    importTitle: "Import WhatsApp data",
    importDescription:
      "Upload a WhatsApp chat export (.txt) or a ZIP that includes media. Everything is processed on your device.",
    acceptedFiles: [".zip"],
    accept: ".txt,.zip,text/plain,application/zip",
  },
  {
    id: "x",
    name: "X (Twitter)",
    accentClass: "border-zinc-500/50",
    gradientClass:
      "from-zinc-500/20 via-zinc-400/10 to-transparent dark:from-zinc-300/15 dark:via-zinc-500/5",
    summary: "Request your full archive ZIP from account settings.",
    exportPath: "Account Settings → Download an archive of your data",
    formats: "JS + HTML (ZIP)",
    extractable:
      "Tweets, DMs, likes, followers, following, blocks, and the official archive HTML viewer.",
    steps: [
      "Open X → Settings and privacy → Your account → Download an archive of your data.",
      "Confirm and wait for the email, then download the ZIP (do not unzip).",
      "In Social Wrapped, import that ZIP from Home → X (Twitter).",
    ],
    importHint:
      "Upload the complete archive ZIP. Media is skipped for analytics; the Official X HTML viewer uses the full ZIP.",
    importTitle: "Import X (Twitter) data",
    importDescription:
      "Upload your X data archive ZIP. Tweets, DMs, and likes are analyzed on your device — plus the official archive HTML.",
    acceptedFiles: [".zip"],
    accept: ".zip,application/zip",
  },
  {
    id: "google",
    name: "Google Ecosystem",
    accentClass: "border-blue-500/50",
    gradientClass:
      "from-blue-500/25 via-blue-400/10 to-transparent dark:from-blue-400/20 dark:via-blue-500/5",
    summary:
      "Import Google Takeout ZIP parts — Chrome, My Activity, Fit, Keep, and more.",
    exportPath: "Google Takeout (takeout.google.com)",
    formats: "JSON, CSV, HTML, ICS (ZIP)",
    extractable:
      "YouTube, Chrome history, My Activity, Fit, Keep, Calendar, Photos metadata, Access Log.",
    steps: [
      "Open Google Takeout and select the services you want (YouTube, Chrome, My Activity, Fit, Keep, Calendar, Photos, …).",
      "Export and download all ZIP parts when ready — do not unzip.",
      "In Social Wrapped, import every Takeout ZIP part together from Home → Google.",
    ],
    importHint:
      "Multi-part Takeout downloads are supported. Mail and Drive file bodies are skipped.",
    importTitle: "Import Google Takeout",
    importDescription:
      "Upload one or more Google Takeout ZIP archives. Everything is processed on your device — Mail/Drive binaries are skipped.",
    acceptedFiles: [".zip"],
    accept: ".zip,application/zip",
  },
  {
    id: "instagram",
    name: "Instagram",
    accentClass: "border-fuchsia-500/50",
    gradientClass:
      "from-fuchsia-500/25 via-rose-400/10 to-transparent dark:from-fuchsia-400/20 dark:via-rose-500/5",
    summary: "Download your information from Meta Accounts Center.",
    exportPath:
      "Accounts Center → Your information and permissions → Download your information",
    formats: "JSON or HTML",
    extractable:
      "DMs, posts, stories metadata, comments, likes, saved posts, and search history.",
    steps: [
      "Request a download from Meta Accounts Center.",
      "Choose JSON when available, then download the archive ZIP.",
      "In Social Wrapped, import that ZIP from Home → Instagram (media binaries are skipped).",
    ],
    importHint:
      "Use the JSON Meta download ZIP. We analyze Direct messages only in v1.",
    importTitle: "Import Instagram data",
    importDescription:
      "Upload your Instagram information download ZIP (JSON). Chats are processed on your device — media files are ignored.",
    acceptedFiles: [".zip"],
    accept: ".zip,application/zip",
  },
  {
    id: "tiktok",
    name: "TikTok",
    accentClass: "border-cyan-500/50",
    gradientClass:
      "from-cyan-500/25 via-teal-400/10 to-transparent dark:from-cyan-400/20 dark:via-teal-500/5",
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
    importDescription: "Upload your TikTok data download as JSON, TXT, or ZIP.",
    acceptedFiles: [".json", ".txt", ".zip"],
    accept: ".json,.txt,.zip,application/json,text/plain,application/zip",
  },
  {
    id: "spotify",
    name: "Spotify",
    accentClass: "border-green-500/50",
    gradientClass:
      "from-green-500/25 via-lime-400/10 to-transparent dark:from-green-400/20 dark:via-lime-500/5",
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
    gradientClass:
      "from-red-500/25 via-orange-400/10 to-transparent dark:from-red-400/20 dark:via-orange-500/5",
    summary: "Pull watch and search history via Google Takeout.",
    exportPath: "Google Takeout → YouTube and YouTube Music",
    formats: "HTML, CSV (ZIP)",
    extractable:
      "Watch history, search history, playlists, comments, subscriptions, and channel info.",
    steps: [
      "Use Google Takeout and include YouTube and YouTube Music.",
      "Download the archive ZIP when ready (HTML history is fine).",
      "In Social Wrapped, import that ZIP from Home → YouTube.",
    ],
    importHint:
      "Full Takeout multi-ZIPs work too — only YouTube data is analyzed on this path.",
    importTitle: "Import YouTube data",
    importDescription:
      "Upload YouTube data from Google Takeout — one or more ZIP parts. Processed on your device.",
    acceptedFiles: [".zip"],
    accept: ".zip,application/zip",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    accentClass: "border-sky-600/50",
    gradientClass:
      "from-sky-600/25 via-blue-500/10 to-transparent dark:from-sky-500/20 dark:via-blue-600/5",
    summary:
      "Request a full archive ZIP from Settings → Data privacy.",
    exportPath: "Settings → Data privacy → Get a copy of your data",
    formats: "CSV (ZIP)",
    extractable:
      "Connections, messages, reactions, comments, shares, invitations, endorsements, and job applications.",
    steps: [
      "Open LinkedIn → Settings & Privacy → Data privacy → Get a copy of your data.",
      "Request the larger archive (not the fast download) and wait for the email.",
      "Download the ZIP when ready — do not unzip.",
      "In Social Wrapped, import that ZIP from Home → LinkedIn.",
    ],
    importHint:
      "Use the Complete LinkedIn Data Export ZIP. Media URLs are skipped; emails in Connections are never shown.",
    importTitle: "Import LinkedIn data",
    importDescription:
      "Upload your LinkedIn data export ZIP. Connections, messages, and engagement are processed on your device.",
    acceptedFiles: [".zip"],
    accept: ".zip,application/zip",
  },
]

export function getPlatform(
  id: string | undefined
): PlatformConfig | undefined {
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
