import {
  ArrowLeft,
  Inbox,
  MessageSquare,
  Send,
  Users,
} from "lucide-react"
import { Link, Navigate, useParams } from "react-router"

import { PlatformLogo } from "@/components/platform-logo"
import { Button } from "@/components/ui/button"
import { getPlatform } from "@/lib/platforms"
import { cn } from "@/lib/utils"
import { getWrap } from "@/lib/wrap-history"
import type { TelegramExportStats } from "@/platform/import"

function formatCount(n: number): string {
  return new Intl.NumberFormat().format(n)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
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

function WrapStats({ stats }: { stats: TelegramExportStats }) {
  return (
    <>
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
    </>
  )
}

/** Dedicated wrap result page — `/wrap/:wrapId`, also opened from History. */
export function WrapPage() {
  const { wrapId } = useParams<{ wrapId: string }>()
  const wrap = wrapId ? getWrap(wrapId) : undefined

  if (!wrap) {
    return <Navigate to="/history" replace />
  }

  const platform = getPlatform(wrap.platformId)

  return (
    <div className="flex w-full max-w-lg flex-col items-stretch text-start">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="default"
          className="text-muted-foreground"
          render={<Link to="/history" />}
          nativeButton={false}
        >
          <ArrowLeft data-icon="inline-start" />
          History
        </Button>
      </div>

      <header className="mb-8 flex flex-col items-center text-center">
        {platform ? (
          <span
            className={cn(
              "mb-4 flex size-16 items-center justify-center rounded-[1.2rem] shadow-sm ring-1 ring-inset",
              "bg-linear-to-br from-background to-muted/80",
              platform.accentClass
            )}
          >
            <PlatformLogo
              id={platform.id}
              title={platform.name}
              className="size-9 drop-shadow-sm"
            />
          </span>
        ) : null}
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {platform?.name ?? "Export"} wrap
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {wrap.fileName} · {formatDate(wrap.createdAt)}
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <WrapStats stats={wrap.stats} />
      </section>
    </div>
  )
}
