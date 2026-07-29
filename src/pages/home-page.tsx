import { useState } from "react"

import { AppLoader } from "@/components/app-loader"
import { Button } from "@/components/ui/button"
import { formatInvokeError, loadTelegramMock } from "@/platform/api"

export function HomePage() {
  const [telegramReport, setTelegramReport] = useState("")
  const [telegramError, setTelegramError] = useState("")
  const [telegramLoading, setTelegramLoading] = useState(false)

  async function handleTelegramMock() {
    setTelegramLoading(true)
    setTelegramReport("")
    setTelegramError("")
    try {
      setTelegramReport(await loadTelegramMock())
    } catch (error) {
      setTelegramError(formatInvokeError(error))
    } finally {
      setTelegramLoading(false)
    }
  }

  return (
    <div className="flex w-full flex-col items-center">
      <h1 className="text-2xl font-semibold drop-shadow-sm">
        Welcome to Tauri + React
      </h1>

      <div className="mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleTelegramMock}
          disabled={telegramLoading}
          className="min-w-36 gap-1.5"
        >
          {telegramLoading ? (
            <>
              <AppLoader size="sm" label="Loading Telegram mock" />
              Loading…
            </>
          ) : (
            "Use Telegram Mock"
          )}
        </Button>
      </div>

      {telegramError ? (
        <p className="mt-4 text-sm text-destructive">{telegramError}</p>
      ) : null}

      {telegramReport ? (
        <pre className="mt-4 w-full max-w-xl whitespace-pre-wrap rounded-md bg-background/90 p-4 text-left font-mono text-xs leading-relaxed backdrop-blur-sm">
          {telegramReport}
        </pre>
      ) : null}

      <p className="mt-10 font-mono text-xs text-muted-foreground">
        (Press <kbd className="rounded border px-1">d</kbd> to toggle dark
        mode)
      </p>
    </div>
  )
}
