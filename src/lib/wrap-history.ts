import type { PlatformId } from "@/lib/platforms"
import type { TelegramExportStats } from "@/platform/import"

const STORAGE_KEY = "social-wrapped:wraps"

export type WrapRecord = {
  id: string
  platformId: PlatformId
  fileName: string
  createdAt: string
  stats: TelegramExportStats
}

function readAll(): WrapRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WrapRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(wraps: WrapRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wraps))
}

/** Persist a new wrap and return it. Newest first. */
export function saveWrap(
  input: Omit<WrapRecord, "id" | "createdAt">
): WrapRecord {
  const wrap: WrapRecord = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  writeAll([wrap, ...readAll()])
  return wrap
}

export function listWraps(): WrapRecord[] {
  return readAll()
}

export function getWrap(id: string): WrapRecord | undefined {
  return readAll().find((wrap) => wrap.id === id)
}

export function wrapPath(id: string): string {
  return `/wrap/${id}`
}
