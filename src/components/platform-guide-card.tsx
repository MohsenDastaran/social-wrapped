import type { ReactNode } from "react"
import { ChevronRight, Lock } from "lucide-react"

import {
  PlatformLogo,
  type PlatformLogoId,
} from "@/components/platform-logo"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type PlatformGuide = {
  id: PlatformLogoId
  name: string
  enabled: boolean
  accentClass: string
  /** Short card blurb */
  summary: string
  exportPath: string
  formats: string
  extractable: string
  steps: string[]
  importHint?: string
}

/** Tier 1 high-priority platforms from docs/target-platforms.md */
export const HIGH_PRIORITY_PLATFORMS: PlatformGuide[] = [
  {
    id: "telegram",
    name: "Telegram",
    enabled: true,
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
      "In Social Wrapped, import that export folder (or its result.json) from Home / Settings.",
    ],
    importHint:
      "Prefer JSON over HTML. Keep the export folder intact if you included media.",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    enabled: false,
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
  },
  {
    id: "x",
    name: "X (Twitter)",
    enabled: false,
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
  },
  {
    id: "google",
    name: "Google Ecosystem",
    enabled: false,
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
  },
  {
    id: "instagram",
    name: "Instagram",
    enabled: false,
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
  },
  {
    id: "tiktok",
    name: "TikTok",
    enabled: false,
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
  },
  {
    id: "spotify",
    name: "Spotify",
    enabled: false,
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
  },
  {
    id: "youtube",
    name: "YouTube",
    enabled: false,
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
  },
]

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-heading mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h3>
  )
}

type PlatformGuideCardProps = {
  platform: PlatformGuide
  className?: string
}

export function PlatformGuideCard({
  platform,
  className,
}: PlatformGuideCardProps) {
  const disabled = !platform.enabled

  const card = (
    <Card
      className={cn(
        "flex flex-row items-center gap-4 bg-card py-5 pe-4 ps-5 shadow-lg ring-1",
        platform.accentClass,
        disabled
          ? "cursor-not-allowed opacity-55 saturate-50"
          : "transition-[box-shadow,transform] duration-300 group-hover/platform:shadow-xl group-hover/platform:ring-foreground/20 group-active/platform:scale-[0.99]",
        className
      )}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-background ring-1 ring-foreground/10">
        <PlatformLogo id={platform.id} title={platform.name} className="size-7" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <CardTitle className="font-heading text-base font-semibold tracking-tight sm:text-lg">
            {platform.name}
          </CardTitle>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide",
              platform.enabled
                ? "bg-primary/15 text-primary ring-1 ring-primary/25"
                : "bg-muted text-muted-foreground ring-1 ring-border"
            )}
          >
            {platform.enabled ? (
              "Available"
            ) : (
              <>
                <Lock className="size-2.5" aria-hidden />
                Soon
              </>
            )}
          </span>
        </div>
        <CardDescription className="line-clamp-2 text-sm leading-relaxed">
          {platform.summary}
        </CardDescription>
      </div>

      {!disabled ? (
        <span
          className={cn(
            "relative flex size-10 shrink-0 items-center justify-center rounded-full",
            "bg-muted text-foreground ring-1 ring-foreground/10",
            "transition-colors duration-300",
            "group-hover/platform:bg-primary group-hover/platform:text-primary-foreground group-hover/platform:ring-primary/30"
          )}
          aria-hidden
        >
          <ChevronRight className="size-4 transition-transform duration-300 ease-out group-hover/platform:translate-x-0.5 rtl:rotate-180 rtl:group-hover/platform:-translate-x-0.5" />
          <ChevronRight className="absolute size-4 opacity-0 transition-all duration-300 ease-out group-hover/platform:translate-x-1 group-hover/platform:opacity-40 rtl:rotate-180 rtl:group-hover/platform:-translate-x-1" />
        </span>
      ) : (
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground ring-1 ring-border"
          aria-hidden
        >
          <Lock className="size-3.5" />
        </span>
      )}
    </Card>
  )

  if (disabled) {
    return (
      <div aria-disabled="true" className="w-full">
        {card}
      </div>
    )
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className={cn(
              "group/platform w-full cursor-pointer text-start outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            {card}
          </button>
        }
      />

      <DialogContent className="flex max-h-[min(88dvh,44rem)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 items-center gap-0 border-b border-border/50 px-5 pt-7 pb-5 pe-12 text-center sm:px-7">
          <span
            className={cn(
              "mb-4 flex size-20 items-center justify-center rounded-[1.35rem] shadow-sm ring-1 ring-inset",
              "bg-linear-to-br from-background to-muted/80",
              platform.accentClass
            )}
          >
            <PlatformLogo
              id={platform.id}
              title={platform.name}
              className="size-11 drop-shadow-sm"
            />
          </span>
          <DialogTitle className="font-heading text-2xl font-semibold tracking-tight sm:text-[1.7rem]">
            {platform.name}
          </DialogTitle>
          <DialogDescription className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {platform.summary}
          </DialogDescription>
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-primary ring-1 ring-primary/25">
            Available to import
          </span>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 text-start sm:px-7">
          <div className="mb-7 space-y-4 rounded-xl bg-muted/40 px-3.5 py-4 ring-1 ring-border/40">
            <div>
              <SectionHeading>Export path</SectionHeading>
              <p className="text-sm leading-relaxed text-foreground/80">
                {platform.exportPath}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <SectionHeading>Formats</SectionHeading>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {platform.formats}
                </p>
              </div>
              <div className="sm:col-span-2">
                <SectionHeading>What you can analyze</SectionHeading>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {platform.extractable}
                </p>
              </div>
            </div>
          </div>

          <section>
            <h3 className="font-heading mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              How to download &amp; import
            </h3>
            <ol className="space-y-5">
              {platform.steps.map((step, index) => (
                <li key={step} className="flex gap-3.5">
                  <span
                    className="font-heading flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold tabular-nums text-background"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 pt-1">
                    <p className="font-heading text-base font-medium leading-snug tracking-tight text-foreground sm:text-lg">
                      {step}
                    </p>
                    {index === platform.steps.length - 1 && platform.importHint ? (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {platform.importHint}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <p className="mt-7 rounded-xl bg-primary/10 px-3.5 py-3 text-sm leading-relaxed text-foreground ring-1 ring-primary/20">
            Processing stays on your device. Your archive is not uploaded for
            analysis.
          </p>
        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 px-5 py-3 sm:px-7">
          <DialogClose render={<Button variant="outline">Close</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
