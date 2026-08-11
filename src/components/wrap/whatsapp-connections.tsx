import { fmt } from "@/components/wrap/chart-theme"
import { StoryExportHost } from "@/components/wrap/story-export-host"
import type { WhatsAppContact, WhatsAppInsights } from "@/platform/whatsapp-types"
import { listScrollMaxClass } from "@/lib/scroll"
import { cn } from "@/lib/utils"
import { Users, UsersRound } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

type WhatsAppConnectionsInsightsProps = {
  data: WhatsAppInsights
}

function contactLabel(c: WhatsAppContact): string {
  const name = c.name?.trim()
  const phone = c.phone?.trim() || "Unknown"
  return name || phone
}

function contactSub(c: WhatsAppContact): string | null {
  const name = c.name?.trim()
  const phone = c.phone?.trim()
  if (name && phone) return phone
  return null
}

function initials(label: string): string {
  const cleaned = label.replace(/[^\p{L}\p{N}]+/gu, " ").trim()
  if (!cleaned) return "?"
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
}

function LabelListCard({
  title,
  description,
  icon: Icon,
  count,
  empty,
  emptyLabel,
  children,
  exportName,
}: {
  title: string
  description: string
  icon: LucideIcon
  count: number
  empty: boolean
  emptyLabel: string
  children: ReactNode
  exportName?: string
}) {
  const body = (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <div className="relative shrink-0 overflow-hidden border-b border-border/50 bg-linear-to-br from-emerald-500/14 via-emerald-500/4 to-transparent px-4 py-3.5 dark:from-emerald-400/12 dark:via-emerald-400/3">
        <div className="relative flex items-start gap-3">
          <span
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-100"
            aria-hidden
          >
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-heading text-sm font-semibold tracking-tight">
                {title}
              </p>
              {!empty ? (
                <span className="shrink-0 rounded-md bg-emerald-500/12 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-900 tabular-nums dark:bg-emerald-400/15 dark:text-emerald-100">
                  {fmt(count)}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </div>
      {empty ? (
        <p className="px-4 py-8 text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ol className={cn("flex list-none flex-col gap-0.5 p-2", listScrollMaxClass)}>
          {children}
        </ol>
      )}
    </div>
  )

  if (!exportName) return body
  return (
    <StoryExportHost exportName={exportName} storyCaptureWidth={560}>
      {body}
    </StoryExportHost>
  )
}

/** Contacts + groups from the account report. */
export function WhatsAppConnectionsInsights({
  data,
}: WhatsAppConnectionsInsightsProps) {
  const contacts = data.contacts ?? []
  const groups = data.groups ?? []

  if (contacts.length === 0 && groups.length === 0) {
    return (
      <section className="flex flex-col gap-3 text-start">
        <header>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Connections
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This report didn’t include contacts or groups.
          </p>
        </header>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Connections
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Phone numbers and groups from your WhatsApp account report.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <LabelListCard
          title="Contacts"
          description="Numbers synced to WhatsApp"
          icon={Users}
          count={contacts.length}
          empty={contacts.length === 0}
          emptyLabel="No contacts in this report."
          exportName="wa-connections-list"
        >
          {contacts.map((c, index) => {
            const label = contactLabel(c)
            const sub = contactSub(c)
            return (
              <li key={`${c.phone}-${index}`} className="shrink-0">
                <div className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <span className="w-5 shrink-0 text-center text-[0.7rem] font-bold text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <span
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[0.65rem] font-semibold text-emerald-900 ring-1 ring-emerald-500/25 dark:bg-emerald-400/15 dark:text-emerald-100"
                    aria-hidden
                  >
                    {initials(label)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {label}
                    </p>
                    {sub ? (
                      <p className="truncate text-[0.7rem] text-muted-foreground">
                        {sub}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </LabelListCard>

        <LabelListCard
          title="Groups"
          description="Group chats you’re in"
          icon={UsersRound}
          count={groups.length}
          empty={groups.length === 0}
          emptyLabel="No groups in this report."
        >
          {groups.map((name, index) => (
            <li key={`${name}-${index}`} className="shrink-0">
              <div className="flex items-center gap-3 rounded-xl px-2 py-2">
                <span className="w-5 shrink-0 text-center text-[0.7rem] font-bold text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <span
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-[0.65rem] font-semibold text-teal-900 ring-1 ring-teal-500/25 dark:bg-teal-400/15 dark:text-teal-100"
                  aria-hidden
                >
                  {initials(name)}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {name}
                </p>
              </div>
            </li>
          ))}
        </LabelListCard>
      </div>
    </section>
  )
}
