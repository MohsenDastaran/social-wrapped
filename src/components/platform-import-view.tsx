import { useId, useRef, useState, type ChangeEvent, type DragEvent } from "react"
import { ArrowLeft, CircleHelp, FileUp, Upload, X } from "lucide-react"
import { Link, useNavigate } from "react-router"

import { AppLoader } from "@/components/app-loader"
import { PlatformImportHelpDialog } from "@/components/platform-import-help-dialog"
import { PlatformLogo } from "@/components/platform-logo"
import { WhatsAppIdentityPicker } from "@/components/whatsapp-identity-picker"
import { Button } from "@/components/ui/button"
import { type PlatformConfig } from "@/lib/platforms"
import { cn } from "@/lib/utils"
import { saveWrap, wrapEntryPath } from "@/lib/wrap-history"
import { formatInvokeError } from "@/platform/api"
import {
  importPlatformFiles,
  type ImportProgress,
} from "@/platform/import"

export type PlatformImportViewProps = {
  platform: PlatformConfig
  /** Override title (defaults to platform.importTitle). */
  title?: string
  /** Override description (defaults to platform.importDescription). */
  description?: string
  /** Override accepted extensions list. */
  acceptedFiles?: string[]
  /** Override HTML accept attribute. */
  accept?: string
  onFileSelect?: (file: File) => void
  className?: string
}

type IdentityPrompt = {
  chatName: string
  senders: string[]
  resolve: (meName: string) => void
  reject: (error: Error) => void
}

function allowsMultiple(platformId: string): boolean {
  return (
    platformId === "google" ||
    platformId === "youtube" ||
    platformId === "spotify"
  )
}

function fileAllowed(name: string, acceptedFiles: string[]): boolean {
  const lower = name.toLowerCase()
  return acceptedFiles.some((ext) => {
    const normalized = ext.startsWith(".")
      ? ext.toLowerCase()
      : `.${ext.toLowerCase()}`
    return lower.endsWith(normalized)
  })
}

function formatBytes(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`
  }
  return `${(size / 1024).toFixed(1)} KB`
}

/** Shared import UI — used by every platform’s dedicated import route. */
export function PlatformImportView({
  platform,
  title = platform.importTitle,
  description = platform.importDescription,
  acceptedFiles = platform.acceptedFiles,
  accept = platform.accept,
  onFileSelect,
  className,
}: PlatformImportViewProps) {
  const navigate = useNavigate()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const multi = allowsMultiple(platform.id)
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState("")
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [identityPrompt, setIdentityPrompt] = useState<IdentityPrompt | null>(
    null
  )
  const loading = progress !== null

  function takeFiles(next: FileList | File[] | null) {
    if (!next) return
    const list = Array.from(next)
    const valid = list.filter((f) => fileAllowed(f.name, acceptedFiles))
    if (!valid.length) {
      setError(`Please choose one of: ${acceptedFiles.join(", ")}`)
      return
    }
    setError("")
    if (multi) {
      setFiles((prev) => {
        const map = new Map(prev.map((f) => [`${f.name}:${f.size}`, f]))
        for (const f of valid) {
          map.set(`${f.name}:${f.size}`, f)
        }
        return Array.from(map.values())
      })
    } else {
      setFiles([valid[0]])
      onFileSelect?.(valid[0])
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    takeFiles(event.target.files)
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    takeFiles(event.dataTransfer.files)
  }

  function promptIdentity(
    senders: string[],
    chatName: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      setIdentityPrompt({ chatName, senders, resolve, reject })
    })
  }

  async function handleAnalyze() {
    if (!files.length) return
    setError("")
    const totalSize = files.reduce((s, f) => s + f.size, 0)
    setProgress({
      phase: "reading",
      percent: 0,
      overallPercent: 0,
      current: 0,
      total: totalSize,
    })
    try {
      const { analytics, instagramSocial, googleInsights, linkedinInsights, xInsights, tiktokInsights, spotifyInsights, appleMusicInsights } =
        await importPlatformFiles(
          platform,
          files,
          setProgress,
          platform.id === "whatsapp" ||
            platform.id === "instagram" ||
            platform.id === "linkedin" ||
            platform.id === "tiktok"
            ? promptIdentity
            : undefined
        )
      const wrap = await saveWrap({
        platformId: platform.id,
        fileName:
          files.length === 1
            ? files[0].name
            : platform.id === "spotify"
              ? `${files.length} Spotify files`
              : `${files.length} Takeout ZIPs`,
        analytics,
        instagramSocial,
        googleInsights,
        linkedinInsights,
        xInsights,
        tiktokInsights,
        spotifyInsights,
        appleMusicInsights,
        archiveBlob:
          platform.id === "x" && files[0] ? files[0] : undefined,
      })
      navigate(wrapEntryPath(wrap), { replace: true })
    } catch (err) {
      setError(formatInvokeError(err))
      setProgress(null)
      setIdentityPrompt(null)
    }
  }

  const progressHint =
    platform.id === "whatsapp"
      ? progress?.phase === "computing"
        ? "Building your wrap from this chat"
        : "Reading your WhatsApp export"
      : platform.id === "instagram"
        ? progress?.phase === "computing"
          ? "Building your wrap from Instagram chats"
          : "Reading your Instagram ZIP (messages + social)"
        : platform.id === "linkedin"
          ? progress?.phase === "computing"
            ? "Building your LinkedIn wrap"
            : "Reading your LinkedIn ZIP (messages + network)"
          : platform.id === "tiktok"
            ? progress?.phase === "computing"
              ? "Building your TikTok wrap"
              : "Reading your TikTok ZIP (activity + DMs)"
            : platform.id === "spotify"
              ? progress?.phase === "computing"
                ? "Building your Spotify wrap"
                : "Reading your Spotify listening history"
              : platform.id === "x"
            ? progress?.phase === "computing"
              ? "Building your X wrap"
              : "Reading your X archive ZIP (tweets + DMs)"
            : platform.id === "google" || platform.id === "youtube"
              ? progress?.phase === "computing"
                ? "Building your Google wrap"
                : `Reading Takeout ZIP${files.length > 1 ? "s" : ""} on your device`
              : progress?.phase === "computing"
                ? "Building your wrap from chats and messages"
                : "Parsing JSON on your device"

  const totalSelected = files.reduce((s, f) => s + f.size, 0)

  return (
    <div
      className={cn(
        "flex w-full max-w-lg flex-col items-stretch text-start",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="default"
          className="text-muted-foreground"
          render={<Link to="/" />}
          nativeButton={false}
        >
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
        <PlatformImportHelpDialog
          platform={platform}
          trigger={
            <Button
              variant="outline"
              size="default"
              className="rounded-full text-primary"
            >
              <CircleHelp data-icon="inline-start" />
              Need help?
            </Button>
          }
        />
      </div>

      <header className="mb-8 flex flex-col items-center text-center">
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
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          Accepted: {acceptedFiles.join(", ")}
          {multi
            ? platform.id === "spotify"
              ? " · multiple JSON files OK"
              : " · multiple ZIPs OK"
            : null}
        </p>
      </header>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multi}
        className="sr-only"
        onChange={onInputChange}
      />

      <label
        htmlFor={inputId}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors",
          dragging
            ? "border-primary bg-primary/10"
            : "border-border bg-muted/30 hover:border-foreground/30 hover:bg-muted/50"
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-background ring-1 ring-foreground/10">
          <Upload className="size-5 text-primary" aria-hidden />
        </span>
        <div>
          <p className="font-heading text-base font-semibold tracking-tight">
            {multi ? "Drop Takeout ZIP parts here" : "Drop your export here"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            or click to browse — files stay on your device
          </p>
        </div>
      </label>

      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {files.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          {files.map((file) => (
            <div
              key={`${file.name}:${file.size}`}
              className="flex items-start gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10"
            >
              <FileUp
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden
              />
              <div className="min-w-0 flex-1 text-start">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={loading}
                aria-label={`Remove ${file.name}`}
                onClick={() => {
                  setFiles((prev) =>
                    prev.filter(
                      (f) => !(f.name === file.name && f.size === file.size)
                    )
                  )
                  setError("")
                  if (inputRef.current) inputRef.current.value = ""
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
          {multi && files.length > 1 ? (
            <p className="text-xs text-muted-foreground">
              {files.length} files · {formatBytes(totalSelected)} total
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="default"
            disabled={loading}
            onClick={() => {
              setFiles([])
              setError("")
              if (inputRef.current) inputRef.current.value = ""
            }}
          >
            Clear all
          </Button>
        </div>
      ) : null}

      <Button
        type="button"
        size="lg"
        className="mt-6 w-full"
        disabled={!files.length || loading}
        onClick={() => void handleAnalyze()}
      >
        {progress ? (
          <>
            <AppLoader
              size="sm"
              label={
                progress.phase === "computing"
                  ? "Computing stats"
                  : identityPrompt
                    ? "Waiting for you"
                    : "Reading export"
              }
              className="shrink-0"
            />
            <span className="tabular-nums">
              {identityPrompt
                ? "Choose your name…"
                : progress.phase === "computing"
                  ? "Computing stats…"
                  : "Reading export…"}{" "}
              {!identityPrompt ? `${progress.overallPercent}%` : null}
            </span>
          </>
        ) : (
          "Analyze export"
        )}
      </Button>

      {progress && !identityPrompt ? (
        <div className="mt-3" aria-hidden>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {progress.phase === "computing"
                ? "Phase 2 of 2 — Computing stats"
                : "Phase 1 of 2 — Reading export"}
            </span>
            <span className="tabular-nums">{progress.percent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            {progressHint}
          </p>
        </div>
      ) : null}

      {identityPrompt ? (
        <WhatsAppIdentityPicker
          key={identityPrompt.senders.join("\0")}
          open
          chatName={identityPrompt.chatName}
          senders={identityPrompt.senders}
          onConfirm={(meName) => {
            const prompt = identityPrompt
            setIdentityPrompt(null)
            prompt.resolve(meName)
          }}
          onCancel={() => {
            const prompt = identityPrompt
            setIdentityPrompt(null)
            setProgress(null)
            prompt.reject(new Error("Identity selection was cancelled."))
          }}
        />
      ) : null}
    </div>
  )
}
