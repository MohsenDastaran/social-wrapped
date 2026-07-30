import { useEffect, useRef, useState } from "react"
import type { EChartsType } from "echarts/core"
import * as echarts from "echarts/core"

/**
 * Initializes an ECharts instance only after the container has non-zero
 * clientWidth/clientHeight — avoids the noisy "Can't get DOM width or height"
 * warning when charts mount inside flex/% layouts that haven't laid out yet.
 */
export function useSizedEcharts() {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<EChartsType | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let disposed = false

    const init = () => {
      if (disposed || chartRef.current) return false
      if (el.clientWidth <= 0 || el.clientHeight <= 0) return false
      chartRef.current = echarts.init(el, undefined, { renderer: "canvas" })
      setReady(true)
      return true
    }

    init()

    const ro = new ResizeObserver(() => {
      if (disposed) return
      if (!chartRef.current) {
        init()
        return
      }
      chartRef.current.resize()
    })
    ro.observe(el)

    return () => {
      disposed = true
      ro.disconnect()
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  return { containerRef, chartRef, ready }
}
