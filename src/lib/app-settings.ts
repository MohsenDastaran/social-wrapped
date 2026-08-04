import { useCallback, useSyncExternalStore } from "react"

const STORAGE_KEY = "social-wrapped:settings"

export const MAX_WRAPS_OPTIONS = [5, 10, 25, 50, 100] as const
export type MaxWrapsOption = (typeof MAX_WRAPS_OPTIONS)[number]

export const AUTO_CLEAR_DAYS_OPTIONS = [
  null,
  7,
  14,
  30,
  60,
  90,
  180,
  365,
] as const
export type AutoClearDaysOption = (typeof AUTO_CLEAR_DAYS_OPTIONS)[number]

export type AppSettings = {
  maxWraps: MaxWrapsOption
  autoClearDays: AutoClearDaysOption
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  maxWraps: 10,
  autoClearDays: null,
}

type StoredSettings = {
  maxWraps?: unknown
  autoClearDays?: unknown
}

function isMaxWrapsOption(value: unknown): value is MaxWrapsOption {
  return (
    typeof value === "number" &&
    (MAX_WRAPS_OPTIONS as readonly number[]).includes(value)
  )
}

function isAutoClearDaysOption(value: unknown): value is AutoClearDaysOption {
  if (value === null) return true
  return (
    typeof value === "number" &&
    (AUTO_CLEAR_DAYS_OPTIONS as readonly (number | null)[]).includes(value)
  )
}

function normalizeSettings(raw: StoredSettings | null): AppSettings {
  return {
    maxWraps: isMaxWrapsOption(raw?.maxWraps)
      ? raw.maxWraps
      : DEFAULT_APP_SETTINGS.maxWraps,
    autoClearDays: isAutoClearDaysOption(raw?.autoClearDays)
      ? raw.autoClearDays
      : DEFAULT_APP_SETTINGS.autoClearDays,
  }
}

function readStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_APP_SETTINGS }
    return normalizeSettings(JSON.parse(raw) as StoredSettings)
  } catch {
    return { ...DEFAULT_APP_SETTINGS }
  }
}

let cachedSettings: AppSettings =
  typeof window !== "undefined"
    ? readStoredSettings()
    : { ...DEFAULT_APP_SETTINGS }
const listeners = new Set<() => void>()

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): AppSettings {
  return cachedSettings
}

function getServerSnapshot(): AppSettings {
  return DEFAULT_APP_SETTINGS
}

export function getAppSettings(): AppSettings {
  return cachedSettings
}

export function setAppSettings(partial: Partial<AppSettings>): AppSettings {
  const next = normalizeSettings({
    ...cachedSettings,
    ...partial,
  })
  cachedSettings = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota / private mode */
  }
  emitChange()
  return next
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.storageArea !== localStorage) return
    if (event.key !== STORAGE_KEY) return
    cachedSettings = readStoredSettings()
    emitChange()
  })
}

export function useAppSettings(): [
  AppSettings,
  (partial: Partial<AppSettings>) => AppSettings,
] {
  const settings = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  const update = useCallback((partial: Partial<AppSettings>) => {
    return setAppSettings(partial)
  }, [])

  return [settings, update]
}

export function formatAutoClearDays(days: AutoClearDaysOption): string {
  if (days === null) return "Never"
  return `${days} days`
}
