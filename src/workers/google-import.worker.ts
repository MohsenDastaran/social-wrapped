/// <reference lib="webworker" />
// Google / YouTube Takeout — sequential multi-ZIP analyze → merge → done.

import init, {
  analyze_google_zip_bytes_with_progress,
  google_shell_analytics_json,
  merge_google_insights_json,
} from "@/wasm-pkg/social_wrapped_wasm.js"

import type {
  ImportProgressPhase,
  ImportWorkerResponse,
} from "@/platform/import"

export type GoogleImportWorkerRequest =
  | { type: "files"; files: File[]; youtubeOnly: boolean }

function post(message: ImportWorkerResponse): void {
  self.postMessage(message)
}

function normalizePhase(value: unknown): ImportProgressPhase {
  return value === "computing" ? "computing" : "reading"
}

let ready = false

async function ensureInit(): Promise<void> {
  if (ready) return
  await init()
  ready = true
}

type PartialResult = {
  analytics?: unknown
  googleInsights?: unknown
}

async function handleFiles(
  files: File[],
  youtubeOnly: boolean
): Promise<void> {
  await ensureInit()

  if (!files.length) {
    post({ type: "error", message: "No files selected." })
    return
  }

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0)
  let processedBytes = 0
  let mergedInsightsJson: string | null = null
  let displayName = youtubeOnly ? "YouTube" : "Google"

    for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const bytes = new Uint8Array(await file.arrayBuffer())

    let analyticsJson: string
    try {
      analyticsJson = analyze_google_zip_bytes_with_progress(
        bytes,
        youtubeOnly,
        (phase: string, current: number, total: number) => {
          const local = total > 0 ? Math.min(1, current / total) : 0
          const overallCurrent = processedBytes + local * file.size
          post({
            type: "progress",
            phase: normalizePhase(phase),
            current: Math.round(overallCurrent),
            total: totalBytes || 1,
          })
        }
      )
    } catch (error) {
      // Empty / unsupported ZIP parts (no analyzable products) — skip them.
      const msg = error instanceof Error ? error.message : String(error)
      if (
        msg.includes("No supported Google Takeout products") ||
        msg.includes("No YouTube data found")
      ) {
        processedBytes += file.size
        continue
      }
      throw error
    }

    const partial = JSON.parse(analyticsJson) as PartialResult
    const insightsJson = JSON.stringify(partial.googleInsights ?? {})
    const insights = partial.googleInsights as
      | { displayName?: string }
      | undefined
    if (insights?.displayName) {
      displayName = insights.displayName
    }

    if (!mergedInsightsJson) {
      mergedInsightsJson = insightsJson
    } else {
      mergedInsightsJson = merge_google_insights_json(
        mergedInsightsJson,
        insightsJson
      )
    }

    processedBytes += file.size
    post({
      type: "progress",
      phase: "computing",
      current: processedBytes,
      total: totalBytes || 1,
    })
  }

  if (!mergedInsightsJson) {
    post({ type: "error", message: "No insights produced from these archives." })
    return
  }

  const merged = JSON.parse(mergedInsightsJson) as {
    displayName?: string
    youtube?: { channelTitle?: string }
  }
  if (merged.displayName) {
    displayName = merged.displayName
  } else if (merged.youtube?.channelTitle) {
    displayName = merged.youtube.channelTitle
  }

  const analyticsJson = google_shell_analytics_json(
    displayName,
    BigInt(totalBytes)
  )
  const analytics = JSON.parse(analyticsJson) as Record<string, unknown>
  analytics.displayName = displayName
  analytics.fileSizeBytes = totalBytes

  post({
    type: "done",
    analyticsJson: JSON.stringify({
      analytics,
      googleInsights: JSON.parse(mergedInsightsJson),
    }),
  })
}

self.onmessage = async (
  event: MessageEvent<GoogleImportWorkerRequest>
) => {
  try {
    const message = event.data
    if (message.type === "files") {
      await handleFiles(message.files, message.youtubeOnly)
      return
    }
    post({ type: "error", message: "Unknown worker request." })
  } catch (error) {
    post({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
