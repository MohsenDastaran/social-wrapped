export const PROFANITY_LANGUAGES = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "fa", label: "فارسی" },
  { id: "fr", label: "Français" },
  { id: "it", label: "Italiano" },
  { id: "pt", label: "Português" },
] as const

export type ProfanityLangId = (typeof PROFANITY_LANGUAGES)[number]["id"]

const PREFIX = "social-wrapped:profanity-lang:"

type Listener = () => void
const listeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) listener()
}

export function subscribeProfanityLanguage(onStoreChange: Listener) {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

function wrapKey(wrapId: string) {
  return `${PREFIX}${wrapId}`
}

function chatKey(wrapId: string, chatId: number) {
  return `${PREFIX}${wrapId}:${chatId}`
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeRaw(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private mode: in-memory listeners still update this session.
  }
}

export function isProfanityLangId(value: string | null): value is ProfanityLangId {
  return PROFANITY_LANGUAGES.some((lang) => lang.id === value)
}

export function getProfanityLanguage(
  wrapId: string,
  chatId?: number
): ProfanityLangId | null {
  if (chatId != null) {
    const override = readRaw(chatKey(wrapId, chatId))
    if (isProfanityLangId(override)) return override
  }
  const inherited = readRaw(wrapKey(wrapId))
  return isProfanityLangId(inherited) ? inherited : null
}

export function setProfanityLanguage(
  wrapId: string,
  lang: ProfanityLangId,
  chatId?: number
) {
  if (chatId != null) {
    writeRaw(chatKey(wrapId, chatId), lang)
  } else {
    writeRaw(wrapKey(wrapId), lang)
  }
  emit()
}

/** Snapshot for `useSyncExternalStore` — version bumps on every write. */
let version = 0

export function subscribeProfanityLanguageVersion(onStoreChange: Listener) {
  return subscribeProfanityLanguage(() => {
    version += 1
    onStoreChange()
  })
}

export function getProfanityLanguageVersion() {
  return version
}
