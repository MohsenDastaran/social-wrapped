import type {
  AnalyticsResult,
  ContentMixStats,
} from "@/platform/analytics-types"

const EMPTY_CONTENT_MIX: ContentMixStats = {
  total: 0,
  totalVoiceDurationSecs: 0,
  types: [],
  byParticipant: [],
}

type LegacyVoiceText = {
  totalText?: number
  totalVoice?: number
  totalVoiceDurationSecs?: number
}

type LooseParticipant = {
  name?: string
  total?: number
  totalVoiceDurationSecs?: number
  total_voice_duration_secs?: number
  types?: ContentMixStats["types"]
}

type LooseAnalytics = Partial<AnalyticsResult> & {
  voiceText?: LegacyVoiceText
  contentMix?:
    | (Partial<ContentMixStats> & {
        by_participant?: LooseParticipant[]
      })
    | null
}

function normalizeTypes(
  types: ContentMixStats["types"] | undefined
): ContentMixStats["types"] {
  if (!Array.isArray(types)) return []
  return types.map((t) => ({
    kind: t.kind,
    label: t.label || t.kind,
    count: t.count ?? 0,
    pct: t.pct ?? 0,
  }))
}

function normalizeParticipants(
  raw: LooseParticipant[] | undefined
): NonNullable<ContentMixStats["byParticipant"]> {
  if (!Array.isArray(raw)) return []
  return raw.map((p) => ({
    name: p.name ?? "",
    total: p.total ?? p.types?.reduce((s, t) => s + (t.count ?? 0), 0) ?? 0,
    totalVoiceDurationSecs:
      p.totalVoiceDurationSecs ?? p.total_voice_duration_secs ?? 0,
    types: normalizeTypes(p.types),
  }))
}

/** Ensure contentMix.types is always usable; migrate legacy voiceText. */
export function normalizeContentMix(
  analytics: LooseAnalytics
): ContentMixStats {
  const mix = analytics.contentMix
  if (mix && Array.isArray(mix.types) && mix.types.length > 0) {
    const byParticipant = normalizeParticipants(
      mix.byParticipant ?? mix.by_participant
    )
    return {
      total: mix.total ?? mix.types.reduce((s, t) => s + (t.count ?? 0), 0),
      totalVoiceDurationSecs: mix.totalVoiceDurationSecs ?? 0,
      types: normalizeTypes(mix.types),
      byParticipant,
    }
  }

  const legacy = analytics.voiceText
  if (legacy && ((legacy.totalText ?? 0) > 0 || (legacy.totalVoice ?? 0) > 0)) {
    const text = legacy.totalText ?? 0
    const voice = legacy.totalVoice ?? 0
    const total = text + voice
    const types = [
      text > 0
        ? {
            kind: "normal",
            label: "Normal",
            count: text,
            pct: total ? (text / total) * 100 : 0,
          }
        : null,
      voice > 0
        ? {
            kind: "voice",
            label: "Voice",
            count: voice,
            pct: total ? (voice / total) * 100 : 0,
          }
        : null,
    ].filter(Boolean) as ContentMixStats["types"]
    return {
      total,
      totalVoiceDurationSecs: legacy.totalVoiceDurationSecs ?? 0,
      types,
      byParticipant: [],
    }
  }

  return { ...EMPTY_CONTENT_MIX, types: [], byParticipant: [] }
}
