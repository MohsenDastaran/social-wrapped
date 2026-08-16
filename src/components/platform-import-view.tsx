import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react"
import { ArrowLeft, CircleHelp, FileUp, Upload, X } from "lucide-react"
import { Link, useNavigate, useSearchParams } from "react-router"

import { AppLoader } from "@/components/app-loader"
import LightRays from "@/components/LightRays"
import { PlatformImportHelpDialog } from "@/components/platform-import-help-dialog"
import { PlatformLogo } from "@/components/platform-logo"
import { GoogleProductLogo } from "@/components/wrap/google/google-product-logo"
import { GOOGLE_IMPORT_PRODUCTS } from "@/components/wrap/google/google-products"
import { WhatsAppIdentityPicker } from "@/components/whatsapp-identity-picker"
import { Button } from "@/components/ui/button"
import {
  platformImportAreaViewTransitionName,
  platformLogoViewTransitionName,
  type PlatformConfig,
} from "@/lib/platforms"
import {
  buildInstagramDemoFile,
  buildTelegramDemoFile,
  INSTAGRAM_DEMO_FILE_NAME,
  TELEGRAM_DEMO_FILE_NAME,
} from "@/lib/telegram-demo-export"
import { cn } from "@/lib/utils"
import { saveWrap, wrapEntryPath } from "@/lib/wrap-history"
import { formatInvokeError } from "@/platform/api"
import { importPlatformFiles, type ImportProgress } from "@/platform/import"

let demoImportStarted = false

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
  const [searchParams, setSearchParams] = useSearchParams()
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
  const selectedCount = files.length

  useEffect(() => {
    if (selectedCount === 0) return
    const frame = requestAnimationFrame(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        left: 0,
        behavior: "smooth",
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [selectedCount])

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

  async function runAnalyze(selected: File[], displayName?: string) {
    if (!selected.length) return
    setError("")
    const totalSize = selected.reduce((s, f) => s + f.size, 0)
    setProgress({
      phase: "reading",
      percent: 0,
      overallPercent: 0,
      current: 0,
      total: totalSize,
    })
    try {
      const {
        analytics,
        instagramSocial,
        googleInsights,
        linkedinInsights,
        xInsights,
        chatgptInsights,
        whatsappInsights,
        tiktokInsights,
        spotifyInsights,
        appleMusicInsights,
      } = await importPlatformFiles(
        platform,
        selected,
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
          displayName ??
          (selected.length === 1
            ? selected[0].name
            : platform.id === "spotify"
              ? `${selected.length} Spotify files`
              : `${selected.length} Takeout ZIPs`),
        analytics,
        instagramSocial,
        googleInsights,
        linkedinInsights,
        xInsights,
        chatgptInsights,
        whatsappInsights,
        tiktokInsights,
        spotifyInsights,
        appleMusicInsights,
        archiveBlob:
          platform.id === "x" && selected[0] ? selected[0] : undefined,
      })
      navigate(wrapEntryPath(wrap), { replace: true })
    } catch (err) {
      setError(formatInvokeError(err))
      setProgress(null)
      setIdentityPrompt(null)
    }
  }

  function handleAnalyze() {
    void runAnalyze(files)
  }

  useEffect(() => {
    if (demoImportStarted) return
    if (searchParams.get("demo") !== "1") return
    if (platform.id !== "telegram" && platform.id !== "instagram") return
    demoImportStarted = true
    setSearchParams({}, { replace: true })
    void (async () => {
      try {
        if (platform.id === "instagram") {
          const file = await buildInstagramDemoFile()
          setFiles([file])
          await runAnalyze([file], INSTAGRAM_DEMO_FILE_NAME)
        } else {
          const file = await buildTelegramDemoFile()
          setFiles([file])
          await runAnalyze([file], TELEGRAM_DEMO_FILE_NAME)
        }
      } catch (err) {
        setError(formatInvokeError(err))
        setProgress(null)
      } finally {
        demoImportStarted = false
      }
    })()
    // Run once when an import page is opened with ?demo=1.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform.id, searchParams, setSearchParams])

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
                : platform.category === "ai"
                  ? progress?.phase === "computing"
                    ? `Building your ${platform.name} wrap`
                    : `Reading your ${platform.name} conversations`
                : platform.id === "google" || platform.id === "youtube"
                  ? progress?.phase === "computing"
                    ? "Building your Google wrap"
                    : `Reading Takeout ZIP${files.length > 1 ? "s" : ""} on your device`
                  : progress?.phase === "computing"
                    ? "Building your wrap from chats and messages"
                    : "Parsing JSON on your device"

  const totalSelected = files.reduce((s, f) => s + f.size, 0)
  const hasSelectedFiles = files.length > 0

  return (
    <>
      {hasSelectedFiles ? (
        <div
          className="pointer-events-none fixed inset-0 z-1 overflow-hidden"
          aria-hidden
        >
          <LightRays
            raysOrigin="bottom-center"
            raysColor="#ffffff"
            raysSpeed={1}
            lightSpread={1}
            rayLength={2}
            pulsating={false}
            fadeDistance={1}
            saturation={1}
            followMouse={false}
            mouseInfluence={0.1}
            noiseAmount={0}
            distortion={0}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "relative z-10 flex w-full max-w-lg flex-col items-stretch text-start",
          className
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="default"
            className="text-muted-foreground"
            render={<Link to="/" viewTransition />}
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
                className="rounded-full border-primary/50 bg-primary/15 text-primary shadow-md ring-1 shadow-primary/45 ring-primary/30 transition-shadow hover:border-primary/65 hover:bg-primary/25 hover:shadow-lg hover:shadow-primary/55"
              >
                <CircleHelp data-icon="inline-start" />
                Need help?
              </Button>
            }
          />
        </div>

        <header className="mb-8 flex flex-col items-center text-center">
          <span
            style={{
              viewTransitionName: platformLogoViewTransitionName(platform.id),
            }}
            className={cn(
              "mb-5 flex size-28 items-center justify-center rounded-[1.75rem] shadow-sm ring-1 ring-inset sm:size-32 sm:rounded-[2rem]",
              "bg-linear-to-br from-background to-muted/80",
              platform.accentClass
            )}
          >
            <PlatformLogo
              id={platform.id}
              title={platform.name}
              className="size-16 drop-shadow-sm sm:size-18"
            />
          </span>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
          {platform.id === "google" ? (
            <div className="mt-5 w-full max-w-md text-start">
              <p className="mb-2 text-center text-[0.7rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Products we support
              </p>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {GOOGLE_IMPORT_PRODUCTS.map((product) => (
                  <li
                    key={product.id}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 text-center ring-1",
                      product.analyzed
                        ? "bg-card ring-foreground/10"
                        : "bg-muted/40 ring-border/50"
                    )}
                    title={
                      product.analyzed
                        ? `Analyzed · ${product.label}`
                        : product.caption
                    }
                  >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-background ring-1 ring-foreground/10">
                      <GoogleProductLogo
                        id={product.id}
                        title={product.label}
                        className="size-5"
                      />
                    </span>
                    <span className="text-[0.7rem] leading-tight font-medium">
                      {product.label}
                    </span>
                    {!product.analyzed ? (
                      <span className="text-[0.6rem] leading-tight text-muted-foreground">
                        Listed only
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            Accepted: {acceptedFiles.join(", ")}
            {multi ? " · multiple ZIPs OK" : null}
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
          <span
            style={{
              viewTransitionName: platformImportAreaViewTransitionName(
                platform.id
              ),
            }}
            className="flex size-16 items-center justify-center rounded-full bg-background ring-1 ring-foreground/10"
          >
            <Upload className="size-6 text-primary" aria-hidden />
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
                className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 shadow-[0_10px_28px_-18px] ring-1 shadow-primary/40 ring-primary/20 dark:border-primary/30 dark:bg-primary/12 dark:shadow-primary/25"
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
            "Analyze files"
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
    </>
  )
}
