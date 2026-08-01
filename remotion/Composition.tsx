import React from "react"
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion"
import { TransitionSeries, linearTiming } from "@remotion/transitions"

import {
  LogoEnter,
  type Logo,
} from "../src/components/remocn/logo-enter"
import { MarkerHighlight } from "../src/components/remocn/marker-highlight"
import { RollingNumber } from "../src/components/remocn/rolling-number"
import { SoftBlurIn } from "../src/components/remocn/soft-blur-in"
import { whipPan } from "../src/components/remocn/whip-pan"

export type VideoChartSlide = {
  /** Object URL or static path of a composed story PNG (charts + captions). */
  src: string
  heading: string
}

export type SocialWrappedVideoProps = {
  displayName: string
  totalMessages: number
  sentMessages: number
  receivedMessages: number
  chatCount: number
  /** Platform label for the MarkerHighlight intro (e.g. "Telegram"). */
  platformName?: string
  /** Composed Main Analytics story frames — same charts users see in Stories. */
  chartSlides?: VideoChartSlide[]
}

export const VIDEO_FPS = 60
/** Match composed story frames (Instagram 9:16). */
export const VIDEO_WIDTH = 1080
export const VIDEO_HEIGHT = 1920

/** Whip-pan natural length is ~26f @ 30fps → ~52f @ 60fps. */
const WHIP = 52
/** Scene lengths @ 60fps — hold long enough to read before the whip. */
const SCENE_MARKER = 210 // ~3.5s
const SCENE_TOTAL = 250 // ~4.2s
const SCENE_CHART = 270 // ~4.5s
const SCENE_STATS = 420 // ~7s
const SCENE_LOGOS = 220 // ~3.7s
const MAX_CHARTS = 4

const BG = "#041512"
const INK = "#ecfdf5"
const MUTED = "rgba(167, 243, 208, 0.78)"
const ACCENT = "#34d399"
const MARKER = "#facc15"

function PlatformMark({ id }: { id: string }) {
  return (
    <Img
      src={`/images/platforms/${id}.svg`}
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  )
}

/** Supported-platform stack for the LogoEnter outro. */
export const SUPPORTED_PLATFORM_LOGOS: Logo[] = [
  { mark: <PlatformMark id="telegram" />, bg: "#229ED9" },
  { mark: <PlatformMark id="whatsapp" />, bg: "#25D366" },
  { mark: <PlatformMark id="instagram" />, bg: "#E1306C" },
  { mark: <PlatformMark id="x" />, bg: "#0A0A0A" },
  { mark: <PlatformMark id="spotify" />, bg: "#1DB954" },
]

function SceneShell({ children }: { children: React.ReactNode }) {
  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 75% 48% at 50% 30%, rgba(16,185,129,0.22), transparent 72%)",
        }}
      />
      {children}
    </AbsoluteFill>
  )
}

function ChartBeat({ src }: VideoChartSlide) {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [0, 16, SCENE_CHART - 18, SCENE_CHART], [0, 1, 1, 0.95], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const scale = interpolate(frame, [0, 24], [1.04, 1], {
    extrapolateRight: "clamp",
  })

  return (
    <SceneShell>
      <AbsoluteFill
        style={{
          opacity,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${scale})`,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            backgroundColor: BG,
          }}
        />
      </AbsoluteFill>
    </SceneShell>
  )
}

/** Must be TransitionSeries.Transition itself — wrappers fail Remotion's child-type check. */
const whipTiming = linearTiming({ durationInFrames: WHIP })
const whipPresentation = whipPan({ direction: "left", blur: 22 })

/**
 * TransitionSeries duration = sum(scene) − sum(transitions).
 * Scenes: marker → totals → charts|stats → logos.
 */
export function videoDurationFrames(chartCount: number): number {
  const charts = Math.min(Math.max(chartCount, 0), MAX_CHARTS)
  if (charts === 0) {
    return (
      SCENE_MARKER +
      SCENE_TOTAL +
      SCENE_STATS +
      SCENE_LOGOS -
      WHIP * 3
    )
  }
  return (
    SCENE_MARKER +
    SCENE_TOTAL +
    charts * SCENE_CHART +
    SCENE_LOGOS -
    WHIP * (2 + charts)
  )
}

/**
 * Portrait wrap highlight reel for the share-media video tile.
 * MarkerHighlight intro → stats/charts → LogoEnter supported platforms.
 */
export const SocialWrappedVideo: React.FC<SocialWrappedVideoProps> = ({
  displayName,
  totalMessages,
  sentMessages,
  receivedMessages,
  chatCount,
  platformName = "Telegram",
  chartSlides = [],
}) => {
  const safeName = displayName.trim() || "you"
  const platform = platformName.trim() || "Telegram"
  const total = Math.max(0, Math.floor(totalMessages))
  const sent = Math.max(0, Math.floor(sentMessages))
  const received = Math.max(0, Math.floor(receivedMessages))
  const chats = Math.max(0, Math.floor(chatCount))

  const slides = chartSlides.slice(0, MAX_CHARTS).filter((s) => s.src)
  const hasCharts = slides.length > 0

  const midScenes = hasCharts
    ? slides.flatMap((slide, index) => [
        <TransitionSeries.Transition
          key={`whip-chart-${index}`}
          timing={whipTiming}
          presentation={whipPresentation}
        />,
        <TransitionSeries.Sequence
          key={`chart-${slide.src}-${index}`}
          durationInFrames={SCENE_CHART}
        >
          <ChartBeat src={slide.src} heading={slide.heading} />
        </TransitionSeries.Sequence>,
      ])
    : [
        <TransitionSeries.Transition
          key="whip-stats"
          timing={whipTiming}
          presentation={whipPresentation}
        />,
        <TransitionSeries.Sequence
          key="stats"
          durationInFrames={SCENE_STATS}
        >
          <SceneShell>
            <AbsoluteFill style={{ top: "-18%" }}>
              <RollingNumber
                from={0}
                to={sent}
                fontSize={72}
                color={INK}
                speed={4.2}
              />
            </AbsoluteFill>
            <AbsoluteFill style={{ top: "-4%" }}>
              <SoftBlurIn
                text="sent"
                fontSize={30}
                fontWeight={500}
                color={MUTED}
                speed={1.3}
              />
            </AbsoluteFill>
            <AbsoluteFill style={{ top: "18%" }}>
              <RollingNumber
                from={0}
                to={received}
                fontSize={72}
                color={INK}
                speed={4.6}
              />
            </AbsoluteFill>
            <AbsoluteFill style={{ top: "32%" }}>
              <SoftBlurIn
                text="received"
                fontSize={30}
                fontWeight={500}
                color={MUTED}
                speed={1.3}
              />
            </AbsoluteFill>
            <AbsoluteFill style={{ top: "52%" }}>
              <RollingNumber
                from={0}
                to={chats}
                fontSize={72}
                color={INK}
                speed={5}
              />
            </AbsoluteFill>
            <AbsoluteFill style={{ top: "66%" }}>
              <SoftBlurIn
                text="chats"
                fontSize={30}
                fontWeight={500}
                color={MUTED}
                speed={1.3}
              />
            </AbsoluteFill>
          </SceneShell>
        </TransitionSeries.Sequence>,
      ]

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE_MARKER}>
          <SceneShell>
            <MarkerHighlight
              before="Made "
              highlight={platform}
              after={` analysis for ${safeName}`}
              markerColor={MARKER}
              baseColor={INK}
              highlightedTextColor="#041512"
              backgroundColor="transparent"
              fontSize={52}
              fontWeight={700}
              speed={1.05}
            />
          </SceneShell>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          timing={whipTiming}
          presentation={whipPresentation}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_TOTAL}>
          <SceneShell>
            <AbsoluteFill>
              <RollingNumber
                from={0}
                to={total}
                fontSize={92}
                color={INK}
                speed={3.4}
              />
            </AbsoluteFill>
            <AbsoluteFill style={{ top: "14%" }}>
              <SoftBlurIn
                text="messages"
                fontSize={36}
                fontWeight={500}
                color={MUTED}
                speed={1.25}
              />
            </AbsoluteFill>
          </SceneShell>
        </TransitionSeries.Sequence>

        {midScenes}

        <TransitionSeries.Transition
          timing={whipTiming}
          presentation={whipPresentation}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_LOGOS}>
          <SceneShell>
            <AbsoluteFill style={{ bottom: "34%" }}>
              <SoftBlurIn
                text="Supported platforms"
                fontSize={34}
                fontWeight={600}
                color={MUTED}
                speed={1.2}
              />
            </AbsoluteFill>
            <LogoEnter
              logos={SUPPORTED_PLATFORM_LOGOS}
              diameter={108}
              overlap={34}
              ringColor={BG}
              orientation="horizontal"
              stagger={7}
              speed={1}
            />
            <AbsoluteFill style={{ top: "34%" }}>
              <SoftBlurIn
                text="Made with Social Wrapped"
                fontSize={28}
                fontWeight={600}
                color={ACCENT}
                speed={1.15}
              />
            </AbsoluteFill>
          </SceneShell>
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  )
}
