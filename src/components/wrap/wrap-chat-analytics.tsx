import { ActivityOverTimeChart } from "@/components/wrap/charts/activity-over-time-chart"
import { CalendarHeatmap } from "@/components/wrap/charts/calendar-heatmap"
import { GhostingChart } from "@/components/wrap/charts/ghosting-chart"
import { KeywordBattleChart } from "@/components/wrap/charts/keyword-battle-chart"
import { MessageTypesChart, buildMessageTypesScopes } from "@/components/wrap/charts/message-types-chart"
import { WordCloudChart } from "@/components/wrap/charts/word-cloud-chart"
import { CircadianRhythmCard } from "@/components/wrap/circadian-rhythm-card"
import { ComparisonKpiCard } from "@/components/wrap/comparison-kpi-card"
import { chatDisplay } from "@/components/wrap/chat-display"
import { ProfanityRankingCard } from "@/components/wrap/profanity-ranking-card"
import { fmt, fmtResponseTime } from "@/components/wrap/chart-theme"
import {
  TopEmojisCard,
  type EmojiScope,
} from "@/components/wrap/top-emojis-card"
import type {
  ChatResult,
  EmojiEntry,
  EmojiStats,
} from "@/platform/analytics-types"
import { filterEmojiEntries } from "@/lib/emoji"
import {
  omitHumanChatMetrics,
  type PlatformCategory,
} from "@/lib/platforms"

type WrapChatAnalyticsProps = {
  chat: ChatResult
  /** Account display name — used to split “You” vs contact emoji scopes. */
  selfName: string
  wrapId: string
  category?: PlatformCategory
}

/** Per-contact analytics charts — used on the contact detail page. */
export function WrapChatAnalytics({
  chat,
  selfName,
  wrapId,
  category,
}: WrapChatAnalyticsProps) {
  const hideHuman = omitHumanChatMetrics(category)
  const a = chat.analytics
  const display = chatDisplay(chat)
  const isSavedMessages = display.isSavedMessages
  const emojiScopes = buildEmojiScopes(
    a.emojis,
    selfName,
    display.isDeleted ? (display.subtitle ?? "Contact") : display.title
  )
  const contactLabel = display.isDeleted
    ? (display.subtitle ?? "Contact")
    : display.title
  const messageTypesScopes = buildMessageTypesScopes(
    a.contentMix?.types ?? [],
    a.contentMix?.totalVoiceDurationSecs ?? 0,
    a.contentMix?.byParticipant ?? [],
    selfName,
    contactLabel
  )

  const responseRows = a.responseTime.participants.map((p) => ({
    name: truncate(p.name, 18),
    values: {
      avgMin: Math.round(p.avgSecs / 60),
      medianMin: Math.round(p.medianSecs / 60),
    },
  }))

  const lengthRows = a.messageLength.participants.map((p) => ({
    name: truncate(p.name, 18),
    values: { avgChars: Math.round(p.avgChars) },
  }))

  const initiatorNames = new Set([
    ...a.initiatorFinisher.initiators.map((p) => p.name),
    ...a.initiatorFinisher.finishers.map((p) => p.name),
  ])
  const initiatorRows = [...initiatorNames].map((name) => ({
    name: truncate(name, 18),
    values: {
      starts:
        a.initiatorFinisher.initiators.find((p) => p.name === name)?.count ?? 0,
      closes:
        a.initiatorFinisher.finishers.find((p) => p.name === name)?.count ?? 0,
    },
  }))

  const lateNightRows = a.lateNight.participants
    .filter((p) => p.count > 0)
    .map((p) => ({
      name: truncate(p.name, 18),
      values: { count: p.count },
    }))

  const editTypoRows = (a.editTypo?.participants ?? [])
    .filter((p) => p.edits > 0)
    .map((p) => ({
      name: truncate(p.name, 18),
      values: { edits: p.edits },
    }))

  return (
    <section className="flex flex-col gap-4">
      <ActivityOverTimeChart
        series={a.activityOverTime}
        title={
          isSavedMessages
            ? "Saved Messages activity"
            : `Messages with ${display.title}`
        }
        exportName={`chat-${chat.chatId}-activity-over-time`}
        sentLabel="You"
        receivedLabel={
          display.isDeleted
            ? (display.subtitle ?? display.title)
            : chat.chatName
        }
      />

      <WordCloudChart
        keywords={a.keywords}
        youLabel={selfName}
        themLabel={
          display.isDeleted
            ? (display.subtitle ?? "Contact")
            : display.title
        }
        enableScopeToggle={!isSavedMessages}
        mode={isSavedMessages ? "you" : "all"}
        title={isSavedMessages ? "Saved Messages word cloud" : "Word cloud"}
        description={
          isSavedMessages
            ? "Words you saved most often"
            : "Most used words in this chat"
        }
        exportName={`chat-${chat.chatId}-word-cloud`}
      />

      {!hideHuman && !isSavedMessages ? (
        <ProfanityRankingCard
          wrapId={wrapId}
          chatId={chat.chatId}
          selfName={selfName}
          stats={a.profanity}
          exportName={`chat-${chat.chatId}-profanity`}
        />
      ) : null}

      {!isSavedMessages ? (
        <>
          <KeywordBattleChart
            keywords={a.keywords}
            exportName={`chat-${chat.chatId}-keyword-battle`}
            youLabel="You"
            themLabel={
              display.isDeleted
                ? (display.subtitle ?? "Them")
                : truncate(chat.chatName || display.title, 14)
            }
          />

          {!hideHuman ? (
            <GhostingChart
              ghosting={a.ghosting}
              exportName={`chat-${chat.chatId}-ghosting`}
              selfName={selfName}
              contactName={chat.chatName || display.title}
              isDirectChat={!chat.isGroup && !isSavedMessages}
              youLabel="You"
              themLabel={
                display.isDeleted
                  ? (display.subtitle ?? "Them")
                  : truncate(chat.chatName || display.title, 14)
              }
            />
          ) : null}
        </>
      ) : null}

      <MessageTypesChart
        types={a.contentMix?.types ?? []}
        totalVoiceDurationSecs={a.contentMix?.totalVoiceDurationSecs ?? 0}
        exportName={`chat-${chat.chatId}-message-types`}
        scopes={isSavedMessages ? undefined : messageTypesScopes}
      />

      {!isSavedMessages ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ComparisonKpiCard
            title="Response time"
            description="Avg & median reply delay"
            exportName={`chat-${chat.chatId}-response`}
            exportLines={a.responseTime.participants.map(
              (p) => `${p.name} ${fmtResponseTime(p.avgSecs)}`
            )}
            rows={responseRows}
            metrics={[
              {
                key: "avgMin",
                label: "Average",
                accent: "teal",
                format: (m) => (m < 1 ? "<1m" : `${m}m`),
              },
              {
                key: "medianMin",
                label: "Median",
                accent: "amber",
                format: (m) => (m < 1 ? "<1m" : `${m}m`),
              },
            ]}
            highlightKey="avgMin"
            lowerIsBetter
            highlightLabel="Fastest"
          />

          <ComparisonKpiCard
            title="Message length"
            description="Average characters per message"
            exportName={`chat-${chat.chatId}-length`}
            rows={lengthRows}
            metrics={[
              {
                key: "avgChars",
                label: "Avg chars",
                accent: "violet",
                format: (n) => fmt(n),
              },
            ]}
            highlightLabel="Longer"
          />

          {!hideHuman ? (
            <ComparisonKpiCard
              title="Who starts / closes"
              description="After 6h+ of silence"
              exportName={`chat-${chat.chatId}-initiator`}
              rows={initiatorRows}
              metrics={[
                { key: "starts", label: "Starts", accent: "teal" },
                { key: "closes", label: "Closes", accent: "amber" },
              ]}
              highlightKey="starts"
              highlightLabel="Opener"
            />
          ) : null}

          {!hideHuman ? (
            <ComparisonKpiCard
              title="Late night (1–5 AM)"
              description={`${fmt(a.lateNight.totalLateNight)} messages`}
              exportName={`chat-${chat.chatId}-late-night`}
              rows={lateNightRows}
              metrics={[
                {
                  key: "count",
                  label: "Messages",
                  accent: "indigo",
                },
              ]}
              highlightLabel="Night owl"
            />
          ) : null}

          <ComparisonKpiCard
            title="Edited messages"
            description={`${fmt(a.editTypo?.totalEdits ?? 0)} messages edited after sending`}
            exportName={`chat-${chat.chatId}-edits`}
            exportLines={(a.editTypo?.participants ?? []).map(
              (p) => `${p.name} ${p.edits} edits`
            )}
            rows={editTypoRows}
            metrics={[
              { key: "edits", label: "Edits", accent: "violet" },
            ]}
            highlightKey="edits"
            highlightLabel="Editor"
          />
        </div>
      ) : null}

      {!hideHuman ? (
        <TopEmojisCard
          emojis={a.emojis.topOverall}
          exportName={`chat-${chat.chatId}-emojis`}
          description="Most used in this chat"
          limit={10}
          scopes={isSavedMessages ? undefined : emojiScopes}
        />
      ) : null}

      {!isSavedMessages ? (
        <CircadianRhythmCard
          participants={a.circadian.participants}
          exportName={`chat-${chat.chatId}-circadian`}
        />
      ) : null}

      {a.heatmap.days.length > 0 && (
        <CalendarHeatmap
          days={a.heatmap.days}
          description="Messages per day in this chat"
          exportName={`chat-${chat.chatId}-heatmap`}
        />
      )}
    </section>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

function namesMatch(a: string, b: string): boolean {
  const x = a.trim().toLowerCase()
  const y = b.trim().toLowerCase()
  if (!x || !y) return false
  return x === y || x.includes(y) || y.includes(x)
}

function mergeEmojiLists(lists: EmojiEntry[][]): EmojiEntry[] {
  const map = new Map<string, number>()
  for (const list of lists) {
    for (const e of list) {
      if (!e.emoji) continue
      map.set(e.emoji, (map.get(e.emoji) ?? 0) + e.count)
    }
  }
  return [...map.entries()]
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count)
}

function buildEmojiScopes(
  stats: EmojiStats,
  selfName: string,
  contactName: string
): EmojiScope[] | undefined {
  const parts = stats.byParticipant ?? []
  if (parts.length === 0) return undefined

  const self = parts.find((p) => namesMatch(p.name, selfName))
  const others = parts.filter((p) => !namesMatch(p.name, selfName))

  const youEmojis = filterEmojiEntries(self?.topEmojis ?? [])
  const themEmojis = filterEmojiEntries(
    others.length === 1
      ? (others[0]?.topEmojis ?? [])
      : mergeEmojiLists(others.map((o) => o.topEmojis))
  )

  const youLabel = truncate(self?.name || selfName || "You", 14)
  const themLabel = truncate(
    others.length === 1
      ? (others[0]?.name ?? contactName)
      : contactName || "Contact",
    14
  )

  const scopes: EmojiScope[] = [
    { id: "all", label: "All", emojis: filterEmojiEntries(stats.topOverall) },
    { id: "you", label: youLabel, emojis: youEmojis },
    { id: "them", label: themLabel, emojis: themEmojis },
  ]

  // Need at least All + one side to make the toggle useful.
  const withData = scopes.filter((s) =>
    s.emojis.some((e) => e.emoji && e.count > 0)
  )
  return withData.length > 1 ? scopes : undefined
}
