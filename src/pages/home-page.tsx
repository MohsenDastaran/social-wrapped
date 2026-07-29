import { useState, type FormEvent } from "react"

import { AppLoader } from "@/components/app-loader"
import { Button } from "@/components/ui/button"
import {
  formatInvokeError,
  greet as greetApi,
  loadTelegramMock,
} from "@/platform/api"
import reactLogo from "@/assets/react.svg"

export function HomePage() {
  const [name, setName] = useState("")
  const [greetMsg, setGreetMsg] = useState("")
  const [telegramReport, setTelegramReport] = useState("")
  const [telegramError, setTelegramError] = useState("")
  const [telegramLoading, setTelegramLoading] = useState(false)

  async function handleGreet(event: FormEvent) {
    event.preventDefault()
    try {
      setGreetMsg(await greetApi(name))
    } catch (error) {
      setGreetMsg(formatInvokeError(error))
    }
  }

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

      <div className="mt-6 flex items-center justify-center gap-2">
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src="/vite.svg" className="h-24 p-6" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank" rel="noreferrer">
          <img src="/tauri.svg" className="h-24 p-6" alt="Tauri logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="h-24 p-6" alt="React logo" />
        </a>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        Click on the Tauri, Vite, and React logos to learn more.
      </p>

      <form
        className="mt-6 flex items-center justify-center gap-2"
        onSubmit={handleGreet}
      >
        <input
          id="greet-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter a name..."
          className="rounded-md border border-border bg-background/90 px-3 py-2 text-sm shadow-sm backdrop-blur-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        />
        <Button type="submit">Greet</Button>
      </form>

      {greetMsg ? <p className="mt-4 text-sm">{greetMsg}</p> : null}

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
