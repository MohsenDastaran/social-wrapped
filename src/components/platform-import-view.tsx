import { useId, useRef, useState, type ChangeEvent, type DragEvent } from "react"
import {
  ArrowLeft,
  CircleHelp,
  FileUp,
  Inbox,
  MessageSquare,
  Send,
  Upload,
  Users,
} from "lucide-react"
import { Link } from "react-router"

import { AppLoader } from "@/components/app-loader"
import { PlatformLogo } from "@/components/platform-logo"
import { Button } from "@/components/ui/button"
import { platformDocsPath, type PlatformConfig } from "@/lib/platforms"
import { cn } from "@/lib/utils"
import { formatInvokeError } from "@/platform/api"
import {
  importPlatformFile,
  type ImportProgress,
  type TelegramExportStats,
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

function formatCount(n: number): string {
  return new Intl.NumberFormat().format(n)
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof Send
}) {
  return (
    <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em]">
          {label}
        </p>
      </div>
      <p className="font-heading mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  )
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
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState("")
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [stats, setStats] = useState<TelegramExportStats | null>(null)
  const loading = progress !== null

  function takeFile(next: File | null) {
    if (!next) return
    setError("")
    setStats(null)
    setFile(next)
    onFileSelect?.(next)
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null
    takeFile(next)
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    const next = event.dataTransfer.files?.[0] ?? null
    if (!next) return

    const name = next.name.toLowerCase()
    const allowed = acceptedFiles.some((ext) => {
      const normalized = ext.startsWith(".")
        ? ext.toLowerCase()
        : `.${ext.toLowerCase()}`
      return name.endsWith(normalized)
    })

    if (!allowed) {
      setError(`Please choose one of: ${acceptedFiles.join(", ")}`)
      return
    }
    takeFile(next)
  }

  async function handleAnalyze() {
    if (!file) return
    setError("")
    setStats(null)
    setProgress({ percent: 0, loadedBytes: 0, totalBytes: file.size })
    try {
      setStats(await importPlatformFile(platform, file, setProgress))
    } catch (err) {
      setError(formatInvokeError(err))
    } finally {
      setProgress(null)
    }
  }

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
        <Button
          variant="outline"
          size="default"
          className="rounded-full text-primary"
          render={<Link to={platformDocsPath(platform.id)} />}
          nativeButton={false}
        >
          <CircleHelp data-icon="inline-start" />
          Need help?
        </Button>
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
        </p>
      </header>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
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
            Drop your export here
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

      {file ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <FileUp className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1 text-start">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / (1024 * 1024)).toFixed(2)} MB selected
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="default"
            disabled={loading}
            onClick={() => {
              setFile(null)
              setStats(null)
              setError("")
              if (inputRef.current) inputRef.current.value = ""
            }}
          >
            Clear
          </Button>
        </div>
      ) : null}

      <Button
        type="button"
        size="lg"
        className="mt-6 w-full"
        disabled={!file || loading}
        onClick={() => void handleAnalyze()}
      >
        {progress ? (
          <>
            <AppLoader size="sm" label="Analyzing export" className="shrink-0" />
            <span className="tabular-nums">Analyzing… {progress.percent}%</span>
          </>
        ) : (
          "Analyze export"
        )}
      </Button>

      {progress ? (
        <div className="mt-3" aria-hidden>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="mt-1.5 text-center text-xs tabular-nums text-muted-foreground">
            Parsing on your device — {progress.percent}%
          </p>
        </div>
      ) : null}

      {stats ? (
        <section className="mt-8 flex flex-col gap-4">
          <div className="rounded-xl bg-muted/40 px-4 py-3 ring-1 ring-border/50">
            <p className="font-heading text-lg font-semibold tracking-tight">
              {stats.displayName}
              {stats.username ? (
                <span className="ms-2 text-sm font-medium text-muted-foreground">
                  @{stats.username}
                </span>
              ) : null}
            </p>
            {stats.aboutPreview ? (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {stats.aboutPreview}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Sent"
              value={formatCount(stats.sentMessages)}
              icon={Send}
            />
            <StatCard
              label="Received"
              value={formatCount(stats.receivedMessages)}
              icon={Inbox}
            />
            <StatCard
              label="Total messages"
              value={formatCount(stats.totalMessages)}
              icon={MessageSquare}
            />
            <StatCard
              label="Chats"
              value={formatCount(stats.chatCount)}
              icon={Users}
            />
          </div>

          {stats.sampleMessages.length > 0 ? (
            <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Sample messages
              </p>
              <ul className="flex flex-col gap-2">
                {stats.sampleMessages.map((line, index) => (
                  <li
                    key={`${index}-${line.slice(0, 24)}`}
                    className="text-sm leading-relaxed text-foreground/90"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
