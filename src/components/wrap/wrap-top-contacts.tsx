import { ContactBarRaceChart } from "@/components/wrap/charts/contact-bar-race-chart"
import { chatDisplay } from "@/components/wrap/chat-display"
import { fmt } from "@/components/wrap/chart-theme"
import { Button } from "@/components/ui/button"
import { useDomExport } from "@/hooks/use-dom-export"
import type { ChatResult, WrapAnalytics } from "@/platform/analytics-types"
import { cn } from "@/lib/utils"
import { scrollYClass } from "@/lib/scroll"
import {
  Bookmark,
  ChevronRight,
  Clock3,
  Download,
  Ghost,
  Loader2,
  MessagesSquare,
  Search,
  UserX,
  Users,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useMemo, useState } from "react"

const CARD_EXPORT = {
  minWidth: 1,
  pixelRatio: 3,
  captureMode: "dom",
} as const
const LIST_EXPORT = {
  minWidth: 1,
  pixelRatio: 3,
  captureMode: "dom",
} as const

const VISIBLE_CONTACTS = 50

type EntityLabel = "contact" | "chat"

type WrapTopContactsProps = {
  analytics: WrapAnalytics
  onSelect: (chatId: number) => void
  /** Extra context under the section title (e.g. X archive ID limits). */
  description?: string
  /** ChatGPT wrap uses “chats”; messaging platforms keep “contacts”. */
  entityLabel?: EntityLabel
}

function namesMatch(a: string, b: string): boolean {
  const x = a.trim().toLowerCase()
  const y = b.trim().toLowerCase()
  if (!x || !y) return false
  return x === y || x.includes(y) || y.includes(x)
}

/** How often this contact left messages unanswered ≥ 24h (not you). */
export function contactGhostScore(chat: ChatResult, selfName: string): number {
  return (chat.analytics.ghosting?.participants ?? [])
    .filter((p) => !namesMatch(p.name, selfName))
    .reduce((sum, p) => sum + p.count, 0)
}

/** Contact insight cards — top DMs, recent, faded, ghosters, and groups. */
export function WrapTopContacts({
  analytics,
  onSelect,
  description = "People and groups you message most. Search to find anyone, then tap to open their stats.",
  entityLabel = "contact",
}: WrapTopContactsProps) {
  const selfName = analytics.displayName
  const savedMessages =
    analytics.savedMessages ??
    analytics.chats.find(
      (c) => c.isSavedMessages || /^saved messages$/i.test(c.chatName.trim())
    ) ??
    null
  const isNotSaved = (c: ChatResult) =>
    !c.isSavedMessages && !/^saved messages$/i.test(c.chatName.trim())
  const directory = useMemo(() => {
    const byId = new Map<number, ChatResult>()
    const lists = [
      analytics.topContacts,
      analytics.chats.filter((c) => !c.isGroup),
      analytics.recentContacts,
      analytics.fadedContacts,
      analytics.topGhosters,
    ]
    for (const list of lists) {
      for (const chat of list ?? []) {
        if (!isNotSaved(chat) || chat.isGroup) continue
        if (!byId.has(chat.chatId)) byId.set(chat.chatId, chat)
      }
    }
    return [...byId.values()].sort(
      (a, b) => b.analytics.totalMessages - a.analytics.totalMessages
    )
  }, [analytics])
  const topContacts = (
    analytics.topContacts?.length ? analytics.topContacts : directory
  ).filter(isNotSaved)
  const recent = (analytics.recentContacts ?? []).filter(isNotSaved)
  const faded = (analytics.fadedContacts ?? []).filter(isNotSaved)
  const groups = analytics.topGroups ?? []
  const ghosters = (
    analytics.topGhosters?.length
      ? analytics.topGhosters
      : [...analytics.chats]
          .filter((c) => !c.isGroup && contactGhostScore(c, selfName) > 0)
          .sort(
            (a, b) =>
              contactGhostScore(b, selfName) - contactGhostScore(a, selfName)
          )
          .slice(0, 5)
  ).filter(isNotSaved)

  if (
    !savedMessages &&
    directory.length === 0 &&
    recent.length === 0 &&
    faded.length === 0 &&
    groups.length === 0 &&
    ghosters.length === 0
  ) {
    return null
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="text-start">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          {entityLabel === "chat" ? "Top chats" : "Top contacts"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </header>

      {savedMessages ? (
        <SavedMessagesCard chat={savedMessages} onSelect={onSelect} />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InsightListCard
          title="Recently active"
          description="Most messages in the last 90 days"
          icon={Clock3}
          exportName="recently-active-contacts"
          chats={recent}
          onSelect={onSelect}
        />
        <InsightListCard
          title="Faded friendships"
          description="Talked a lot before, quiet in the last 90 days"
          icon={UserX}
          exportName="faded-friendships"
          chats={faded}
          onSelect={onSelect}
        />
        <InsightListCard
          title="Ghosting experts"
          description="Left your messages unanswered for 24h+"
          icon={Ghost}
          exportName="ghosting-experts"
          chats={ghosters}
          onSelect={onSelect}
          valueFn={(chat) => contactGhostScore(chat, selfName)}
          barClassName="bg-rose-600 dark:bg-rose-400"
        />
        <InsightListCard
          title="Top groups"
          description="Group chats by lifetime volume"
          icon={MessagesSquare}
          exportName="top-groups"
          chats={groups}
          onSelect={onSelect}
        />
      </div>

      {directory.length > 1 ? (
        <ContactBarRaceChart
          chats={directory}
          title={entityLabel === "chat" ? "Chat race" : "Contact race"}
        />
      ) : null}

      {directory.length > 0 ? (
        <TopContactsList
          chats={topContacts}
          directory={directory}
          entityLabel={entityLabel}
          onSelect={onSelect}
        />
      ) : null}
    </section>
  )
}

function SavedMessagesCard({
  chat,
  onSelect,
}: {
  chat: ChatResult
  onSelect: (chatId: number) => void
}) {
  const { ref } = useDomExport<HTMLDivElement>(CARD_EXPORT)
  const total = chat.analytics.totalMessages

  return (
    <div
      ref={ref}
      className="flex items-center gap-2 overflow-hidden rounded-xl bg-card px-3 py-2.5 ring-1 ring-foreground/10 sm:px-4"
    >
      <button
        type="button"
        onClick={() => onSelect(chat.chatId)}
        className="flex min-w-0 flex-1 items-center gap-3 text-start transition-colors hover:opacity-90"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/25 dark:text-sky-300">
          <Bookmark className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight">Saved Messages</p>
          <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
            Notes to yourself · {fmt(total)}{" "}
            {total === 1 ? "message" : "messages"} analysed
          </p>
        </div>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </button>
    </div>
  )
}

function IconExportButton({
  title,
  exporting,
  exportError,
  onExport,
}: {
  title: string
  exporting: boolean
  exportError?: string | null
  onExport: () => void
}) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        data-export-ignore
        disabled={exporting}
        onClick={(e) => {
          e.stopPropagation()
          onExport()
        }}
        aria-label={`Export ${title}`}
        className="shrink-0"
      >
        {exporting ? <Loader2 className="animate-spin" /> : <Download />}
      </Button>
      {exportError ? (
        <p
          role="alert"
          className="max-w-28 text-end text-[0.55rem] leading-tight text-destructive"
          data-export-ignore
        >
          {exportError}
        </p>
      ) : null}
    </div>
  )
}

function InsightListCard({
  title,
  description,
  icon: Icon,
  exportName,
  chats,
  onSelect,
  valueFn,
  barClassName = "bg-teal-600 dark:bg-teal-400",
}: {
  title: string
  description: string
  icon: LucideIcon
  exportName: string
  chats: ChatResult[]
  onSelect: (chatId: number) => void
  /** Override the numeric metric (default: total messages). */
  valueFn?: (chat: ChatResult) => number
  barClassName?: string
}) {
  const { ref, exporting, exportError, exportPng } =
    useDomExport<HTMLDivElement>(CARD_EXPORT)

  if (chats.length === 0) return null

  const values = chats.map((c) =>
    valueFn ? valueFn(c) : c.analytics.totalMessages
  )
  const max = Math.max(...values, 1)

  return (
    <div
      ref={ref}
      className="flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
    >
      <div className="flex items-start gap-2 border-b border-border/60 px-3 py-2.5">
        <Icon
          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="min-w-0 flex-1 text-start">
          <p className="text-sm font-semibold tracking-tight">{title}</p>
          <p className="text-[0.65rem] text-muted-foreground">{description}</p>
        </div>
        <IconExportButton
          title={title}
          exporting={exporting}
          exportError={exportError}
          onExport={() => void exportPng(`${exportName}.png`)}
        />
      </div>
      <ul className="divide-y divide-border/50">
        {chats.map((chat, index) => {
          const d = chatDisplay(chat)
          const value = values[index] ?? 0
          const pct = (value / max) * 100
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
                      {fmt(value)}
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
                      className={cn("h-full rounded-full", barClassName)}
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

function contactMatches(chat: ChatResult, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const d = chatDisplay(chat)
  return [d.title, d.subtitle, chat.chatName]
    .filter((s): s is string => Boolean(s))
    .some((s) => s.toLowerCase().includes(q))
}

function TopContactsList({
  chats,
  directory,
  entityLabel,
  onSelect,
}: {
  chats: ChatResult[]
  directory: ChatResult[]
  entityLabel: EntityLabel
  onSelect: (chatId: number) => void
}) {
  const { ref, exporting, exportError, exportPng } =
    useDomExport<HTMLDivElement>(LIST_EXPORT)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ranked = directory.length > 0 ? directory : chats
  const searching = searchOpen && query.trim().length > 0
  const visible = searching
    ? ranked.filter((chat) => contactMatches(chat, query))
    : ranked.slice(0, VISIBLE_CONTACTS)
  const max = Math.max(
    ...(searching ? visible : ranked.slice(0, VISIBLE_CONTACTS)).map(
      (c) => c.analytics.totalMessages
    ),
    1
  )
  const rankById = useMemo(() => {
    const map = new Map<number, number>()
    ranked.forEach((chat, index) => map.set(chat.chatId, index))
    return map
  }, [ranked])
  const noun = entityLabel === "chat" ? "chats" : "contacts"
  const title = searching
    ? `${visible.length} ${visible.length === 1 ? "match" : "matches"}`
    : `Top ${Math.min(VISIBLE_CONTACTS, ranked.length)} ${noun}`

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-xl bg-card shadow-[0_16px_48px_-20px] ring-1 shadow-foreground/45 ring-foreground/15 dark:shadow-foreground/25"
    >
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-2.5">
        <Users className="size-3.5 text-muted-foreground" aria-hidden />
        <p className="min-w-0 flex-1 text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {title}
        </p>
        <Button
          type="button"
          variant={searchOpen ? "secondary" : "outline"}
          size="icon-xs"
          data-export-ignore
          aria-label={searchOpen ? "Close contact search" : "Search contacts"}
          aria-pressed={searchOpen}
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            setSearchOpen((open) => {
              if (open) setQuery("")
              return !open
            })
          }}
        >
          {searchOpen ? <X /> : <Search />}
        </Button>
        <IconExportButton
          title={title}
          exporting={exporting}
          exportError={exportError}
          onExport={() => void exportPng("top-contacts.png")}
        />
      </div>
      {searchOpen ? (
        <div
          className="border-b border-border/60 px-4 py-2"
          data-export-ignore
        >
          <label className="sr-only" htmlFor="top-contacts-search">
            Search contacts
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute inset-s-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="top-contacts-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a contact…"
              autoComplete="off"
              spellCheck={false}
              className={cn(
                "h-8 w-full rounded-md border border-border bg-background pe-3 ps-8 text-sm outline-none",
                "placeholder:text-muted-foreground",
                "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
                "[&::-webkit-search-cancel-button]:hidden"
              )}
            />
          </div>
        </div>
      ) : null}
      {visible.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          {searching
            ? "No contacts match that name."
            : "No contacts in this export."}
        </p>
      ) : (
        <ul
          className={cn(
            "divide-y divide-border/50",
            "max-h-[min(40rem,70vh)]",
            scrollYClass
          )}
        >
          {visible.map((chat) => (
            <ContactRow
              key={chat.chatId}
              chat={chat}
              index={rankById.get(chat.chatId) ?? 0}
              max={max}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
      {!searching && ranked.length > VISIBLE_CONTACTS ? (
        <p
          className="border-t border-border/60 px-4 py-2 text-[0.65rem] text-muted-foreground"
          data-export-ignore
        >
          Showing {VISIBLE_CONTACTS} of {fmt(ranked.length)}. Search to find
          someone else.
        </p>
      ) : null}
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
