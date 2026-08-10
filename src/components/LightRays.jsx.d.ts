import type { ComponentType } from "react"

type LightRaysProps = {
  raysOrigin?: string
  raysColor?: string
  raysSpeed?: number
  lightSpread?: number
  rayLength?: number
  pulsating?: boolean
  fadeDistance?: number
  saturation?: number
  followMouse?: boolean
  mouseInfluence?: number
  noiseAmount?: number
  distortion?: number
  className?: string
}

declare const LightRays: ComponentType<LightRaysProps>

export default LightRays
