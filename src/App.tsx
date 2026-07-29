import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  formatInvokeError,
  greet as greetApi,
  loadTelegramMock,
} from "@/platform/api"
import reactLogo from "@/assets/react.svg"

export function App() {
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
    <main className="flex min-h-svh flex-col items-center px-6 pt-[10vh] text-center">
      <h1 className="text-2xl font-semibold">Welcome to Tauri + React</h1>

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
          className="rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
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
        >
          {telegramLoading ? "Loading…" : "Use Telegram Mock"}
        </Button>
      </div>

      {telegramError ? (
        <p className="mt-4 text-sm text-destructive">{telegramError}</p>
      ) : null}

      {telegramReport ? (
        <pre className="mt-4 max-w-xl w-full rounded-md bg-muted p-4 text-left font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {telegramReport}
        </pre>
      ) : null}

      <p className="mt-auto pb-6 font-mono text-xs text-muted-foreground">
        (Press <kbd className="rounded border px-1">d</kbd> to toggle dark mode)
      </p>
    </main>
  )
}

export default App
