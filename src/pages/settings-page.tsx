import { useState, type FormEvent } from "react"

import { EChartsAudienceAreaChart } from "@/components/evilcharts/blocks/audience-echarts-area-chart"
import { EChartsExamplePieChart } from "@/components/evilcharts/blocks/example-echarts-pie-chart"
import { EChartsProgressRingsPieChart } from "@/components/evilcharts/blocks/progress-rings-echarts-pie-chart"
import { Button } from "@/components/ui/button"
import { formatInvokeError, greet as greetApi } from "@/platform/api"
import reactLogo from "@/assets/react.svg"

export function SettingsPage() {
  const [name, setName] = useState("")
  const [greetMsg, setGreetMsg] = useState("")

  async function handleGreet(event: FormEvent) {
    event.preventDefault()
    try {
      setGreetMsg(await greetApi(name))
    } catch (error) {
      setGreetMsg(formatInvokeError(error))
    }
  }

  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-10">
      <div className="flex w-full flex-col items-center">
        <h1 className="text-2xl font-semibold">Settings</h1>

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
      </div>

      <section className="flex w-full flex-col gap-3 text-start">
        <h2 className="text-sm font-semibold tracking-tight">Mock charts</h2>
        <p className="text-xs text-muted-foreground">
          Preview of chart components with sample data — not connected to your
          exports yet.
        </p>

        <div className="flex w-full flex-col gap-4">
          <div className="h-72 w-full overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 sm:h-80 md:h-96">
            <EChartsAudienceAreaChart />
          </div>

          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-72 w-full overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 sm:h-80">
              <EChartsExamplePieChart />
            </div>
            <div className="h-72 w-full overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 sm:h-80">
              <EChartsProgressRingsPieChart />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
