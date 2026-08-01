import React from "react"
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
} from "remotion"

import { RollingNumber } from "../src/components/remocn/rolling-number"
import { SoftBlurIn } from "../src/components/remocn/soft-blur-in"

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
  /** Composed Main Analytics story frames — same charts users see in Stories. */
  chartSlides?: VideoChartSlide[]
}

export const VIDEO_FPS = 60
/** Match composed story frames (Instagram 9:16). */
export const VIDEO_WIDTH = 1080
export const VIDEO_HEIGHT = 1920

/** ~2s intro / message beat before charts. */
const INTRO_END = 120
/** ~2.5s per chart slide. */
const CHART_HOLD = 150
/** Fallback sent/received/chats when charts missing (~5.3s). */
const STATS_TAIL = 320
const OUTRO = 60
const MAX_CHARTS = 4

const BG = "#041512"
const INK = "#ecfdf5"
const MUTED = "rgba(167, 243, 208, 0.78)"
const ACCENT = "#34d399"

export function videoDurationFrames(chartCount: number): number {
  const charts = Math.min(Math.max(chartCount, 0), MAX_CHARTS)
  if (charts === 0) return INTRO_END + STATS_TAIL + OUTRO
  return INTRO_END + charts * CHART_HOLD + OUTRO
}

function ChartBeat({ src }: VideoChartSlide) {
  const frame = useCurrentFrame()
  const opacity = interpolate(
    frame,
    [0, 20, CHART_HOLD - 24, CHART_HOLD - 2],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  )
  const scale = interpolate(frame, [0, 28], [1.05, 1], {
    extrapolateRight: "clamp",
  })

  return (
    <AbsoluteFill style={{ opacity, backgroundColor: BG }}>
      <AbsoluteFill
        style={{
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
    </AbsoluteFill>
  )
}

/**
 * Portrait wrap highlight reel for the share-media video tile.
 * Stats beats + optional composed story chart frames (same captures as Stories).
 */
export const SocialWrappedVideo: React.FC<SocialWrappedVideoProps> = ({
  displayName,
  totalMessages,
  sentMessages,
  receivedMessages,
  chatCount,
  chartSlides = [],
}) => {
  const frame = useCurrentFrame()
  const glow = interpolate(frame, [0, 60, 480], [0.16, 0.3, 0.2], {
    extrapolateRight: "clamp",
  })

  const safeName = displayName.trim() || "Your wrap"
  const total = Math.max(0, Math.floor(totalMessages))
  const sent = Math.max(0, Math.floor(sentMessages))
  const received = Math.max(0, Math.floor(receivedMessages))
  const chats = Math.max(0, Math.floor(chatCount))

  const slides = chartSlides.slice(0, MAX_CHARTS).filter((s) => s.src)
  const hasCharts = slides.length > 0
  const chartsStart = INTRO_END
  const outroFrom = hasCharts
    ? chartsStart + slides.length * CHART_HOLD
    : INTRO_END + STATS_TAIL

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 75% 48% at 50% 30%, rgba(16,185,129,${glow}), transparent 72%)`,
        }}
      />

      <Sequence from={0} durationInFrames={100} premountFor={20}>
        <AbsoluteFill>
          <SoftBlurIn
            text="Social Wrapped"
            fontSize={40}
            fontWeight={700}
            color={MUTED}
            speed={1.2}
          />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={28} durationInFrames={90} premountFor={20}>
        <AbsoluteFill style={{ top: "12%" }}>
          <SoftBlurIn
            text={safeName}
            fontSize={58}
            fontWeight={700}
            color={INK}
          />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={90} durationInFrames={100} premountFor={24}>
        <AbsoluteFill>
          <RollingNumber
            from={0}
            to={total}
            fontSize={92}
            color={INK}
            speed={3.2}
          />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={118} durationInFrames={80} premountFor={16}>
        <AbsoluteFill style={{ top: "14%" }}>
          <SoftBlurIn
            text="messages"
            fontSize={36}
            fontWeight={500}
            color={MUTED}
            speed={1.25}
          />
        </AbsoluteFill>
      </Sequence>

      {slides.map((slide, index) => (
        <Sequence
          key={`${slide.src}-${index}`}
          from={chartsStart + index * CHART_HOLD}
          durationInFrames={CHART_HOLD}
          premountFor={20}
        >
          <ChartBeat src={slide.src} heading={slide.heading} />
        </Sequence>
      ))}

      {!hasCharts ? (
        <>
          <Sequence from={200} durationInFrames={100} premountFor={16}>
            <AbsoluteFill>
              <RollingNumber
                from={0}
                to={sent}
                fontSize={78}
                color={INK}
                speed={4.2}
              />
            </AbsoluteFill>
          </Sequence>
          <Sequence from={220} durationInFrames={80} premountFor={12}>
            <AbsoluteFill style={{ top: "14%" }}>
              <SoftBlurIn
                text="sent"
                fontSize={34}
                fontWeight={500}
                color={MUTED}
                speed={1.3}
              />
            </AbsoluteFill>
          </Sequence>

          <Sequence from={300} durationInFrames={100} premountFor={16}>
            <AbsoluteFill>
              <RollingNumber
                from={0}
                to={received}
                fontSize={78}
                color={INK}
                speed={4.6}
              />
            </AbsoluteFill>
          </Sequence>
          <Sequence from={320} durationInFrames={80} premountFor={12}>
            <AbsoluteFill style={{ top: "14%" }}>
              <SoftBlurIn
                text="received"
                fontSize={34}
                fontWeight={500}
                color={MUTED}
                speed={1.3}
              />
            </AbsoluteFill>
          </Sequence>

          <Sequence from={400} durationInFrames={90} premountFor={16}>
            <AbsoluteFill>
              <RollingNumber
                from={0}
                to={chats}
                fontSize={78}
                color={INK}
                speed={5}
              />
            </AbsoluteFill>
          </Sequence>
          <Sequence from={418} durationInFrames={70} premountFor={12}>
            <AbsoluteFill style={{ top: "14%" }}>
              <SoftBlurIn
                text="chats"
                fontSize={34}
                fontWeight={500}
                color={MUTED}
                speed={1.3}
              />
            </AbsoluteFill>
          </Sequence>
        </>
      ) : null}

      <Sequence from={outroFrom} durationInFrames={OUTRO} premountFor={12}>
        <AbsoluteFill>
          <SoftBlurIn
            text="Made with Social Wrapped"
            fontSize={30}
            fontWeight={600}
            color={ACCENT}
            speed={1.2}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  )
}
