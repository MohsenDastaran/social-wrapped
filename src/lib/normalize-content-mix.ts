import type {
  AnalyticsResult,
  ContentMixStats,
} from "@/platform/analytics-types"

const EMPTY_CONTENT_MIX: ContentMixStats = {
  total: 0,
  totalVoiceDurationSecs: 0,
  types: [],
}

type LegacyVoiceText = {
  totalText?: number
  totalVoice?: number
  totalVoiceDurationSecs?: number
}

type LooseAnalytics = Partial<AnalyticsResult> & {
  voiceText?: LegacyVoiceText
  contentMix?: Partial<ContentMixStats> | null
}

/** Ensure contentMix.types is always usable; migrate legacy voiceText. */
export function normalizeContentMix(
  analytics: LooseAnalytics
): ContentMixStats {
  const mix = analytics.contentMix
  if (mix && Array.isArray(mix.types) && mix.types.length > 0) {
    return {
      total: mix.total ?? mix.types.reduce((s, t) => s + (t.count ?? 0), 0),
      totalVoiceDurationSecs: mix.totalVoiceDurationSecs ?? 0,
      types: mix.types.map((t) => ({
        kind: t.kind,
        label: t.label || t.kind,
        count: t.count ?? 0,
        pct: t.pct ?? 0,
      })),
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
    }
  }

  return { ...EMPTY_CONTENT_MIX, types: [] }
}
