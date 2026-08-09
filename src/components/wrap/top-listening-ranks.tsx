import { useMemo } from "react"
import type { LucideIcon } from "lucide-react"

import { fmt } from "@/components/wrap/chart-theme"
import { WrapChartCard } from "@/components/wrap/wrap-chart-card"
import { formatListeningMs } from "@/platform/apple-music-types"
import { listScrollFillClass } from "@/lib/scroll"
import { cn } from "@/lib/utils"

export type ListeningRankItem = {
  name: string
  count: number
  msPlayed?: number
}

type TopListeningRanksCardProps = {
  title: string
  description: string
  exportName: string
  items: ListeningRankItem[]
  icon: LucideIcon
  accent: "rose" | "teal"
  /** @default 12 */
  limit?: number
  /** When true, splits `Artist — Track` into subtitle + title. */
  splitArtistTrack?: boolean
}

const ACCENT = {
  rose: {
    wash: "from-rose-500/18 via-rose-500/5 to-transparent dark:from-rose-400/14 dark:via-rose-400/4",
    ring: "ring-rose-500/30",
    bar: "bg-rose-500 dark:bg-rose-400",
    barTrack: "bg-rose-500/12 dark:bg-rose-400/12",
    badge: "bg-rose-600 text-white dark:bg-rose-400 dark:text-rose-950",
    badgeSoft:
      "bg-rose-500/12 text-rose-800 dark:bg-rose-400/15 dark:text-rose-200",
    avatar:
      "bg-rose-500/15 text-rose-800 ring-rose-500/25 dark:bg-rose-400/15 dark:text-rose-100",
    medal: ["#e11d48", "#fb7185", "#fda4af"] as const,
  },
  teal: {
    wash: "from-teal-500/18 via-teal-500/5 to-transparent dark:from-teal-400/14 dark:via-teal-400/4",
    ring: "ring-teal-500/30",
    bar: "bg-teal-600 dark:bg-teal-400",
    barTrack: "bg-teal-500/12 dark:bg-teal-400/12",
    badge: "bg-teal-700 text-white dark:bg-teal-400 dark:text-teal-950",
    badgeSoft:
      "bg-teal-500/12 text-teal-900 dark:bg-teal-400/15 dark:text-teal-100",
    avatar:
      "bg-teal-500/15 text-teal-900 ring-teal-500/25 dark:bg-teal-400/15 dark:text-teal-100",
    medal: ["#0f766e", "#2dd4bf", "#99f6e4"] as const,
  },
} as const

type AccentKey = keyof typeof ACCENT

function splitTrackLabel(name: string): { primary: string; secondary?: string } {
  const sep = " — "
  const idx = name.indexOf(sep)
  if (idx === -1) return { primary: name }
  return {
    secondary: name.slice(0, idx),
    primary: name.slice(idx + sep.length),
  }
}

function initials(name: string): string {
  const cleaned = name.replace(/[^\p{L}\p{N}\s]/gu, " ").trim()
  if (!cleaned) return "?"
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
}

function shareOf(count: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((count / total) * 100)
}

/** Ranked artists or tracks — podium #1–#3 plus a scored list. */
export function TopListeningRanksCard({
  title,
  description,
  exportName,
  items,
  icon: Icon,
  accent,
  limit = 12,
  splitArtistTrack = false,
}: TopListeningRanksCardProps) {
  const ranked = useMemo(
    () => items.filter((item) => item.name && item.count > 0).slice(0, limit),
    [items, limit]
  )

  if (ranked.length === 0) return null

  const palette = ACCENT[accent]
  const peak = ranked[0]?.count ?? 1
  const totalPlays = ranked.reduce((sum, item) => sum + item.count, 0)
  const podium = ranked.slice(0, Math.min(3, ranked.length))
  const rest = ranked.slice(3)

  const exportLines = ranked
    .slice(0, 5)
    .map((item, i) => `#${i + 1} ${item.name} · ${fmt(item.count)}`)

  return (
    <WrapChartCard
      title={title}
      description={description}
      exportName={exportName}
      exportSize="default"
      layout="flow"
      className="min-h-0 flex-1"
      storyCaptureWidth={560}
      exportLines={exportLines}
      headerExtra={
        <span
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-xl",
            palette.badgeSoft
          )}
          aria-hidden
        >
          <Icon className="size-4" />
        </span>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 p-4 pt-2 sm:p-5 sm:pt-2">
        <div className="shrink-0">
          <Podium
            items={podium}
            peak={peak}
            totalPlays={totalPlays}
            accent={accent}
            splitArtistTrack={splitArtistTrack}
          />
        </div>

        {rest.length > 0 ? (
          <ol
            className={cn(
              "flex list-none flex-col gap-1 border-t border-border/50 pt-3",
              listScrollFillClass
            )}
          >
            {rest.map((item, index) => {
              const rank = index + 4
              const labels = splitArtistTrack
                ? splitTrackLabel(item.name)
                : { primary: item.name }
              return (
                <li key={`${item.name}-${rank}`} className="shrink-0">
                  <RankRow
                    rank={rank}
                    labels={labels}
                    count={item.count}
                    msPlayed={item.msPlayed}
                    barShare={peak > 0 ? item.count / peak : 0}
                    playShare={shareOf(item.count, totalPlays)}
                    accent={accent}
                  />
                </li>
              )
            })}
          </ol>
        ) : null}
      </div>
    </WrapChartCard>
  )
}

function Podium({
  items,
  peak,
  totalPlays,
  accent,
  splitArtistTrack,
}: {
  items: ListeningRankItem[]
  peak: number
  totalPlays: number
  accent: AccentKey
  splitArtistTrack: boolean
}) {
  if (items.length === 0) return null

  const first = items[0]!
  const second = items[1]
  const third = items[2]

  return (
    <div className="flex flex-col gap-3">
      <PodiumHero
        item={first}
        peak={peak}
        totalPlays={totalPlays}
        accent={accent}
        splitArtistTrack={splitArtistTrack}
      />

      {second || third ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {second ? (
            <PodiumSide
              item={second}
              rank={2}
              peak={peak}
              totalPlays={totalPlays}
              accent={accent}
              splitArtistTrack={splitArtistTrack}
            />
          ) : null}
          {third ? (
            <PodiumSide
              item={third}
              rank={3}
              peak={peak}
              totalPlays={totalPlays}
              accent={accent}
              splitArtistTrack={splitArtistTrack}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function PodiumHero({
  item,
  peak,
  totalPlays,
  accent,
  splitArtistTrack,
}: {
  item: ListeningRankItem
  peak: number
  totalPlays: number
  accent: AccentKey
  splitArtistTrack: boolean
}) {
  const palette = ACCENT[accent]
  const labels = splitArtistTrack
    ? splitTrackLabel(item.name)
    : { primary: item.name }
  const barShare = peak > 0 ? item.count / peak : 0
  const playShare = shareOf(item.count, totalPlays)

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-linear-to-br p-4 ring-1 sm:p-5",
        palette.wash,
        palette.ring
      )}
    >
      <span
        className="pointer-events-none absolute -inset-e-3 -top-6 font-heading text-[7rem] font-bold leading-none text-foreground/[0.05] select-none sm:text-[8.5rem]"
        aria-hidden
      >
        01
      </span>

      <div className="relative flex items-start gap-3.5 sm:gap-4">
        <Monogram
          name={labels.primary}
          accent={accent}
          size="lg"
          medal={palette.medal[0]}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 text-[0.65rem] font-bold tracking-[0.14em] uppercase",
                palette.badge
              )}
            >
              #1
            </span>
            <span className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
              Most played
            </span>
          </div>

          {labels.secondary ? (
            <p className="mt-2 truncate text-xs font-medium text-muted-foreground">
              {labels.secondary}
            </p>
          ) : null}
          <p className="mt-0.5 font-heading text-xl font-semibold tracking-tight text-balance text-foreground sm:text-2xl">
            {labels.primary}
          </p>

          <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
            <StatBlock
              value={fmt(item.count)}
              label="plays"
            />
            {item.msPlayed ? (
              <StatBlock
                value={formatListeningMs(item.msPlayed)}
                label="listened"
              />
            ) : null}
            <StatBlock
              value={`${playShare}%`}
              label="of top list"
            />
          </div>

          <div
            className={cn(
              "mt-4 h-2 w-full overflow-hidden rounded-full",
              palette.barTrack
            )}
          >
            <div
              className={cn("h-full rounded-full", palette.bar)}
              style={{ width: `${Math.max(barShare * 100, 8)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function PodiumSide({
  item,
  rank,
  peak,
  totalPlays,
  accent,
  splitArtistTrack,
}: {
  item: ListeningRankItem
  rank: 2 | 3
  peak: number
  totalPlays: number
  accent: AccentKey
  splitArtistTrack: boolean
}) {
  const palette = ACCENT[accent]
  const labels = splitArtistTrack
    ? splitTrackLabel(item.name)
    : { primary: item.name }
  const barShare = peak > 0 ? item.count / peak : 0
  const playShare = shareOf(item.count, totalPlays)

  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl bg-muted/35 p-3 ring-1 ring-border/60 sm:p-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:gap-3">
        <div className="flex items-center gap-2 sm:block">
          <Monogram
            name={labels.primary}
            accent={accent}
            size="md"
            medal={palette.medal[rank - 1]}
            className="size-9 text-xs sm:size-11 sm:text-sm"
          />
          <span
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-md text-[0.7rem] font-bold tabular-nums sm:hidden",
              palette.badgeSoft
            )}
          >
            {rank}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="hidden items-center gap-2 sm:flex">
            <span
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-md text-[0.7rem] font-bold tabular-nums",
                palette.badgeSoft
              )}
            >
              {rank}
            </span>
            <span className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
              #{rank}
            </span>
          </div>

          {labels.secondary ? (
            <p className="mt-0 line-clamp-1 break-words text-[0.65rem] leading-snug text-muted-foreground sm:mt-1.5">
              {labels.secondary}
            </p>
          ) : null}
          <p className="mt-0.5 line-clamp-2 break-words font-heading text-[0.8rem] font-semibold leading-snug tracking-tight text-pretty text-foreground sm:text-sm sm:leading-snug md:text-base">
            {labels.primary}
          </p>

          <p className="mt-1.5 flex flex-wrap gap-x-1.5 gap-y-0.5 text-[0.7rem] leading-snug text-muted-foreground tabular-nums sm:text-xs">
            <span>
              <span className="font-semibold text-foreground">
                {fmt(item.count)}
              </span>{" "}
              plays
            </span>
            {item.msPlayed ? (
              <span>
                ·{" "}
                <span className="font-medium text-foreground">
                  {formatListeningMs(item.msPlayed)}
                </span>
              </span>
            ) : null}
            <span>· {playShare}%</span>
          </p>

          <div
            className={cn(
              "mt-2 h-1.5 w-full overflow-hidden rounded-full",
              palette.barTrack
            )}
          >
            <div
              className={cn("h-full rounded-full", palette.bar)}
              style={{ width: `${Math.max(barShare * 100, 5)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function RankRow({
  rank,
  labels,
  count,
  msPlayed,
  barShare,
  playShare,
  accent,
}: {
  rank: number
  labels: { primary: string; secondary?: string }
  count: number
  msPlayed?: number
  barShare: number
  playShare: number
  accent: AccentKey
}) {
  const palette = ACCENT[accent]
  return (
    <div className="group flex items-center gap-3 rounded-xl px-1.5 py-2 transition-colors hover:bg-muted/45">
      <span className="w-5 shrink-0 text-center text-[0.7rem] font-bold text-muted-foreground tabular-nums">
        {rank}
      </span>
      <Monogram name={labels.primary} accent={accent} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            {labels.secondary ? (
              <p className="truncate text-[0.65rem] text-muted-foreground">
                {labels.secondary}
              </p>
            ) : null}
            <p className="truncate text-sm font-medium text-foreground">
              {labels.primary}
            </p>
          </div>
          <div className="shrink-0 text-end">
            <p className="text-xs font-semibold tabular-nums text-foreground">
              {fmt(count)}
            </p>
            <p className="text-[0.65rem] tabular-nums text-muted-foreground">
              {msPlayed ? `${formatListeningMs(msPlayed)} · ` : ""}
              {playShare}%
            </p>
          </div>
        </div>
        <div
          className={cn(
            "mt-1.5 h-1 w-full overflow-hidden rounded-full",
            palette.barTrack
          )}
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width]",
              palette.bar
            )}
            style={{ width: `${Math.max(barShare * 100, 4)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function Monogram({
  name,
  accent,
  size,
  medal,
  className,
}: {
  name: string
  accent: AccentKey
  size: "sm" | "md" | "lg"
  medal?: string
  className?: string
}) {
  const palette = ACCENT[accent]
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-2xl font-heading font-semibold tracking-tight ring-1",
        palette.avatar,
        size === "lg" && "size-14 text-base sm:size-16 sm:text-lg",
        size === "md" && "size-11 text-sm",
        size === "sm" && "size-8 rounded-xl text-[0.65rem]",
        className
      )}
      style={
        medal
          ? {
              boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${medal} 35%, transparent)`,
            }
          : undefined
      }
      aria-hidden
    >
      {initials(name)}
      {medal ? (
        <span
          className="absolute -end-1 -top-1 size-2.5 rounded-full ring-2 ring-card"
          style={{ backgroundColor: medal }}
        />
      ) : null}
    </span>
  )
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <p className="font-heading text-lg font-semibold tracking-tight tabular-nums text-foreground sm:text-xl">
        {value}
      </p>
      <p className="text-[0.65rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </p>
    </div>
  )
}
