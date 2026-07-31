import { chatDisplay } from "@/components/wrap/chat-display"
import { fmt } from "@/components/wrap/chart-theme"
import type { ChatResult, WrapAnalytics } from "@/platform/analytics-types"
import { cn } from "@/lib/utils"
import {
  ChevronRight,
  Clock3,
  MessagesSquare,
  UserX,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

type WrapTopContactsProps = {
  analytics: WrapAnalytics
  onSelect: (chatId: number) => void
}

/** Contact insight cards — top DMs, recent, faded, and groups. */
export function WrapTopContacts({ analytics, onSelect }: WrapTopContactsProps) {
  const topContacts = analytics.topContacts?.length
    ? analytics.topContacts
    : analytics.chats.filter((c) => !c.isGroup).slice(0, 20)
  const recent = analytics.recentContacts ?? []
  const faded = analytics.fadedContacts ?? []
  const groups = analytics.topGroups ?? []

  if (
    topContacts.length === 0 &&
    recent.length === 0 &&
    faded.length === 0 &&
    groups.length === 0
  ) {
    return null
  }

  const max = Math.max(...topContacts.map((c) => c.analytics.totalMessages), 1)

  return (
    <section className="flex flex-col gap-4">
      <header className="text-start">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Top contacts
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          People and groups you message most. Tap one to open their stats.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InsightListCard
          title="Recently active"
          description="Most messages in the last 90 days"
          icon={Clock3}
          chats={recent}
          onSelect={onSelect}
        />
        <InsightListCard
          title="Faded friendships"
          description="Talked a lot before, quiet in the last 90 days"
          icon={UserX}
          chats={faded}
          onSelect={onSelect}
        />
        <InsightListCard
          title="Top groups"
          description="Group chats by lifetime volume"
          icon={MessagesSquare}
          chats={groups}
          onSelect={onSelect}
        />
      </div>

      {topContacts.length > 0 ? (
        <>
          {/* chart card commented in file — keep list */}
          <div className="overflow-hidden rounded-xl bg-card shadow-[0_16px_48px_-20px] shadow-foreground/45 ring-1 ring-foreground/15 dark:shadow-foreground/25">
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-2.5">
              <Users className="size-3.5 text-muted-foreground" aria-hidden />
              <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Top {topContacts.length} contacts
              </p>
            </div>
            <ul className="divide-y divide-border/50">
              {topContacts.map((chat, index) => (
                <ContactRow
                  key={chat.chatId}
                  chat={chat}
                  index={index}
                  max={max}
                  onSelect={onSelect}
                />
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </section>
  )
}

function InsightListCard({
  title,
  description,
  icon: Icon,
  chats,
  onSelect,
}: {
  title: string
  description: string
  icon: LucideIcon
  chats: ChatResult[]
  onSelect: (chatId: number) => void
}) {
  if (chats.length === 0) return null

  const max = Math.max(...chats.map((c) => c.analytics.totalMessages), 1)

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-start gap-2 border-b border-border/60 px-3 py-2.5">
        <Icon
          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="min-w-0 text-start">
          <p className="text-sm font-semibold tracking-tight">{title}</p>
          <p className="text-[0.65rem] text-muted-foreground">{description}</p>
        </div>
      </div>
      <ul className="divide-y divide-border/50">
        {chats.map((chat, index) => {
          const d = chatDisplay(chat)
          const pct = (chat.analytics.totalMessages / max) * 100
          return (
            <li key={chat.chatId}>
              <button
                type="button"
                onClick={() => onSelect(chat.chatId)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-start transition-colors hover:bg-muted/50 active:bg-muted/70"
              >
                <span className="w-4 shrink-0 text-center text-[0.65rem] font-semibold text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1.5">
                    <p
                      className={cn(
                        "truncate text-xs font-medium",
                        d.isDeleted && "text-muted-foreground"
                      )}
                    >
                      {d.title}
                    </p>
                    <p className="shrink-0 text-[0.65rem] text-muted-foreground tabular-nums">
                      {fmt(chat.analytics.totalMessages)}
                    </p>
                  </div>
                  {d.subtitle ? (
                    <p className="truncate text-[0.6rem] text-muted-foreground">
                      {d.subtitle}
                      {d.isDeleted ? (
                        <span className="ms-1 rounded bg-muted px-1 py-px text-[0.55rem] font-medium tracking-wide uppercase">
                          Deleted
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-teal-600 dark:bg-teal-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ContactRow({
  chat,
  index,
  max,
  onSelect,
}: {
  chat: ChatResult
  index: number
  max: number
  onSelect: (chatId: number) => void
}) {
  const d = chatDisplay(chat)
  const pct = (chat.analytics.totalMessages / max) * 100
  const sentPct =
    chat.analytics.totalMessages > 0
      ? (chat.analytics.sentMessages / chat.analytics.totalMessages) * 100
      : 0

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(chat.chatId)}
        className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/50 active:bg-muted/70"
      >
        <span className="w-6 shrink-0 text-center text-xs font-semibold text-muted-foreground tabular-nums">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0">
              <p
                className={cn(
                  "truncate text-sm font-medium",
                  d.isDeleted && "text-muted-foreground"
                )}
              >
                {d.title}
                {d.isDeleted ? (
                  <span className="ms-1.5 inline-flex rounded bg-muted px-1.5 py-0.5 align-middle text-[0.6rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    Deleted
                  </span>
                ) : null}
              </p>
              {d.subtitle ? (
                <p className="truncate text-[0.65rem] text-muted-foreground">
                  {d.subtitle}
                </p>
              ) : null}
            </div>
            <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {fmt(chat.analytics.totalMessages)}
            </p>
          </div>
          <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-teal-600 dark:bg-teal-400"
              style={{ width: `${(pct * sentPct) / 100}%` }}
              title="Sent"
            />
            <div
              className="h-full bg-amber-600 dark:bg-amber-400"
              style={{ width: `${(pct * (100 - sentPct)) / 100}%` }}
              title="Received"
            />
          </div>
          <p className="mt-1 text-[0.65rem] text-muted-foreground">
            Sent {fmt(chat.analytics.sentMessages)} · Received{" "}
            {fmt(chat.analytics.receivedMessages)}
          </p>
        </div>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </button>
    </li>
  )
}
