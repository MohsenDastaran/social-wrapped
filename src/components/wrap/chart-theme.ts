import type { ChartConfig as AreaConfig } from "@/components/evilcharts/charts/echarts-area-chart"
import type { ChartConfig as PieConfig } from "@/components/evilcharts/charts/echarts-pie-chart"

export const PALETTES = [
  {
    light: ["#99f6e4", "#14b8a6", "#0f766e"],
    dark: ["#5eead4", "#2dd4bf", "#0d9488"],
  },
  {
    light: ["#fde68a", "#f59e0b", "#b45309"],
    dark: ["#fcd34d", "#fbbf24", "#d97706"],
  },
  {
    light: ["#ddd6fe", "#8b5cf6", "#5b21b6"],
    dark: ["#c4b5fd", "#a78bfa", "#7c3aed"],
  },
  {
    light: ["#fbcfe8", "#ec4899", "#9d174d"],
    dark: ["#f9a8d4", "#f472b6", "#be185d"],
  },
  {
    light: ["#bae6fd", "#0ea5e9", "#0369a1"],
    dark: ["#7dd3fc", "#38bdf8", "#0284c7"],
  },
  {
    light: ["#bbf7d0", "#22c55e", "#15803d"],
    dark: ["#86efac", "#4ade80", "#16a34a"],
  },
] as const

export function pieConfigForKeys(keys: string[]): PieConfig {
  return Object.fromEntries(
    keys.map((key, i) => [
      key,
      { label: key, colors: PALETTES[i % PALETTES.length] },
    ])
  )
}

export function fmt(n: number): string {
  return new Intl.NumberFormat().format(Math.round(n))
}

export function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${secs}s`
}

export function fmtResponseTime(secs: number): string {
  const min = Math.round(secs / 60)
  if (min < 60) return `${min}m`
  return `${(secs / 3600).toFixed(1)}h`
}

export const SENT_RECEIVED_PIE: PieConfig = {
  sent: {
    label: "Sent",
    colors: {
      light: ["#99f6e4", "#14b8a6", "#0f766e"],
      dark: ["#5eead4", "#2dd4bf", "#0d9488"],
    },
  },
  received: {
    label: "Received",
    colors: {
      light: ["#fde68a", "#f59e0b", "#b45309"],
      dark: ["#fcd34d", "#fbbf24", "#d97706"],
    },
  },
}

export const VOICE_TEXT_PIE: PieConfig = {
  text: {
    label: "Text",
    colors: {
      light: ["#99f6e4", "#14b8a6", "#0f766e"],
      dark: ["#5eead4", "#2dd4bf", "#0d9488"],
    },
  },
  voice: {
    label: "Voice",
    colors: {
      light: ["#fde68a", "#f59e0b", "#b45309"],
      dark: ["#fcd34d", "#fbbf24", "#d97706"],
    },
  },
}

export const RESPONSE_AREA: AreaConfig = {
  avgMin: {
    label: "Average",
    colors: {
      light: ["#14b8a6", "#0d9488"],
      dark: ["#2dd4bf", "#14b8a6"],
    },
  },
  medianMin: {
    label: "Median",
    colors: {
      light: ["#f59e0b", "#d97706"],
      dark: ["#fbbf24", "#f59e0b"],
    },
  },
}

export const LENGTH_AREA: AreaConfig = {
  avgChars: {
    label: "Avg chars",
    colors: {
      light: ["#8b5cf6", "#7c3aed"],
      dark: ["#a78bfa", "#8b5cf6"],
    },
  },
}

export const LATE_NIGHT_AREA: AreaConfig = {
  count: {
    label: "Messages",
    colors: {
      light: ["#6366f1", "#4f46e5"],
      dark: ["#818cf8", "#6366f1"],
    },
  },
}

export const CONTACT_VOLUME_AREA: AreaConfig = {
  messages: {
    label: "Messages",
    colors: {
      light: ["#14b8a6", "#0ea5e9", "#84cc16"],
      dark: ["#2dd4bf", "#38bdf8", "#a3e635"],
    },
  },
}

export const INITIATOR_AREA: AreaConfig = {
  starts: {
    label: "Starts",
    colors: {
      light: ["#14b8a6", "#0d9488"],
      dark: ["#2dd4bf", "#14b8a6"],
    },
  },
  closes: {
    label: "Closes",
    colors: {
      light: ["#f59e0b", "#d97706"],
      dark: ["#fbbf24", "#f59e0b"],
    },
  },
}

export const EMOJI_AREA: AreaConfig = {
  count: {
    label: "Uses",
    colors: {
      light: ["#ec4899", "#db2777"],
      dark: ["#f472b6", "#ec4899"],
    },
  },
}
