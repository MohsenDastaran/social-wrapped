import React from "react"
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion"
import { TransitionSeries, linearTiming } from "@remotion/transitions"

import { LogoEnter, type Logo } from "../src/components/remocn/logo-enter"
import { MarkerHighlight } from "../src/components/remocn/marker-highlight"
import { PaperSticker } from "../src/components/remocn/paper-sticker"
import { RollingNumber } from "../src/components/remocn/rolling-number"
import { SoftBlurIn } from "../src/components/remocn/soft-blur-in"
import { whipPan } from "../src/components/remocn/whip-pan"

export type VideoChartSlide = {
  /** Story id (activity, heatmap, circadian, …) for sequencing. */
  id?: string
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
const SCENE_LOGOS = 240 // ~4s — MarkerHighlight CTA + logos
const MAX_CHARTS = 5

/** Deep-dive chart order (after early activity / sent-received beats). */
const DEEP_DIVE_ORDER = ["heatmap", "circadian", "emojis"] as const
/** Teaser sticker scenes (60fps). */
const SCENE_HEATMAP_STICKER = 150
const SCENE_CLOCK_STICKER = 160
const SCENE_EMOJI_STICKER = 160
const SCENE_PLATFORMS_STICKER = 200
const STICKER_STEP = 6
const DESK = "#f1eee7"

const HEATMAP_STICKER_LABELS = ["Your year", "on the calendar"]
const PLATFORM_STICKER_LABELS = [
  "for",
  "Telegram",
  "Instagram",
  "WhatsApp",
  "LinkedIn",
  "& more",
]

const BG = "#041512"
const INK = "#ecfdf5"
const MUTED = "rgba(167, 243, 208, 0.78)"
const ACCENT = "#34d399"
const MARKER = "#facc15"
const PAPER = "#fbfaf6"
const PAPER_INK = "#041512"

function MarkSvg({
  path,
  viewBox = "0 0 24 24",
}: {
  path: string
  viewBox?: string
}) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path fill="#ffffff" d={path} />
    </svg>
  )
}

/** Inline white marks — external SVGs used brand fills that vanished on brand circles. */
const TelegramMark = () => (
  <MarkSvg path="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
)

const WhatsAppMark = () => (
  <MarkSvg path="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
)

const InstagramMark = () => (
  <MarkSvg path="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077" />
)

const LinkedInMark = () => (
  <MarkSvg path="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
)

/** Supported-platform stack for the LogoEnter outro. */
export const SUPPORTED_PLATFORM_LOGOS: Logo[] = [
  { mark: <TelegramMark />, bg: "#229ED9" },
  { mark: <InstagramMark />, bg: "#E1306C" },
  { mark: <WhatsAppMark />, bg: "#25D366" },
  { mark: <LinkedInMark />, bg: "#0A66C2" },
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
  const opacity = interpolate(
    frame,
    [0, 16, SCENE_CHART - 18, SCENE_CHART],
    [0, 1, 1, 0.95],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  )
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

export function slidesIncludeClock(slides: VideoChartSlide[]): boolean {
  return slides.slice(0, MAX_CHARTS).some((s) => s.id === "circadian" && s.src)
}

export function slidesIncludeEmojis(slides: VideoChartSlide[]): boolean {
  return slides.slice(0, MAX_CHARTS).some((s) => s.id === "emojis" && s.src)
}

export function slidesIncludeHeatmap(slides: VideoChartSlide[]): boolean {
  return slides.slice(0, MAX_CHARTS).some((s) => s.id === "heatmap" && s.src)
}

/** Must be TransitionSeries.Transition itself — wrappers fail Remotion's child-type check. */
const whipTiming = linearTiming({ durationInFrames: WHIP })
const whipPresentation = whipPan({ direction: "left", blur: 22 })

/**
 * Raw remocn PaperSticker stack — cream desk, staggered slap-ins, no PaperWobble.
 * `at={i * step * 2}` mirrors the docs' `at={i * 6}` at step 3, scaled for 60fps.
 */
function RawStickerScene({ labels }: { labels: string[] }) {
  return (
    <AbsoluteFill
      style={{
        background: DESK,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 22,
        padding: 72,
      }}
    >
      {labels.map((label, i) => (
        <PaperSticker
          key={`${label}-${i}`}
          at={i * STICKER_STEP * 2}
          seed={label}
          step={STICKER_STEP}
        >
          <span
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 40,
              color: "#26242c",
            }}
          >
            {label}
          </span>
        </PaperSticker>
      ))}
    </AbsoluteFill>
  )
}

const stickerLabelStyle: React.CSSProperties = {
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  fontWeight: 700,
  color: PAPER_INK,
  letterSpacing: "-0.03em",
  lineHeight: 1.2,
  textAlign: "center",
}

/** Paper sticker tease right before “Your clock”. */
function ClockStickerIntro() {
  return (
    <SceneShell>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: "0 72px",
        }}
      >
        <PaperSticker
          at={12}
          seed="clock-tease-main"
          step={STICKER_STEP}
          background={PAPER}
          borderColor="rgba(4,21,18,0.35)"
          padding="26px 34px"
          maxTilt={2.2}
        >
          <span style={{ ...stickerLabelStyle, fontSize: 44, maxWidth: 760 }}>
            See when you sent your messages
          </span>
        </PaperSticker>
        <PaperSticker
          at={36}
          seed="clock-tease-sub"
          step={STICKER_STEP}
          background="#ecfdf5"
          borderColor="rgba(13,148,136,0.45)"
          padding="14px 22px"
          maxTilt={1.6}
        >
          <span
            style={{ ...stickerLabelStyle, fontSize: 26, color: "#0f766e" }}
          >
            Your daily rhythm, hour by hour
          </span>
        </PaperSticker>
      </AbsoluteFill>
    </SceneShell>
  )
}

/** Paper sticker tease right before “Top emojis”. */
function EmojiStickerIntro() {
  return (
    <SceneShell>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: "0 72px",
        }}
      >
        <PaperSticker
          at={12}
          seed="emoji-tease-main"
          step={STICKER_STEP}
          background={PAPER}
          borderColor="rgba(4,21,18,0.35)"
          padding="26px 34px"
          maxTilt={2.2}
        >
          <span style={{ ...stickerLabelStyle, fontSize: 44, maxWidth: 760 }}>
            The emojis you reached for most
          </span>
        </PaperSticker>
        <PaperSticker
          at={36}
          seed="emoji-tease-sub"
          step={STICKER_STEP}
          background="#ecfdf5"
          borderColor="rgba(13,148,136,0.45)"
          padding="14px 22px"
          maxTilt={1.6}
        >
          <span
            style={{ ...stickerLabelStyle, fontSize: 26, color: "#0f766e" }}
          >
            Your reaction vocabulary, ranked
          </span>
        </PaperSticker>
      </AbsoluteFill>
    </SceneShell>
  )
}

function chartSequenceNodes(
  slides: VideoChartSlide[],
  keyPrefix: string
): React.ReactNode[] {
  return slides.flatMap((slide, index) => {
    const chartNodes = [
      <TransitionSeries.Transition
        key={`whip-${keyPrefix}-${index}`}
        timing={whipTiming}
        presentation={whipPresentation}
      />,
      <TransitionSeries.Sequence
        key={`chart-${keyPrefix}-${slide.id ?? index}-${index}`}
        durationInFrames={SCENE_CHART}
      >
        <ChartBeat id={slide.id} src={slide.src} heading={slide.heading} />
      </TransitionSeries.Sequence>,
    ]

    if (slide.id === "heatmap") {
      return [
        <TransitionSeries.Transition
          key="whip-heatmap-sticker"
          timing={whipTiming}
          presentation={whipPresentation}
        />,
        <TransitionSeries.Sequence
          key="heatmap-sticker"
          durationInFrames={SCENE_HEATMAP_STICKER}
        >
          <RawStickerScene labels={HEATMAP_STICKER_LABELS} />
        </TransitionSeries.Sequence>,
        ...chartNodes,
      ]
    }

    if (slide.id === "circadian") {
      return [
        <TransitionSeries.Transition
          key="whip-clock-sticker"
          timing={whipTiming}
          presentation={whipPresentation}
        />,
        <TransitionSeries.Sequence
          key="clock-sticker"
          durationInFrames={SCENE_CLOCK_STICKER}
        >
          <ClockStickerIntro />
        </TransitionSeries.Sequence>,
        ...chartNodes,
      ]
    }

    if (slide.id === "emojis") {
      return [
        <TransitionSeries.Transition
          key="whip-emoji-sticker"
          timing={whipTiming}
          presentation={whipPresentation}
        />,
        <TransitionSeries.Sequence
          key="emoji-sticker"
          durationInFrames={SCENE_EMOJI_STICKER}
        >
          <EmojiStickerIntro />
        </TransitionSeries.Sequence>,
        ...chartNodes,
      ]
    }

    return chartNodes
  })
}

/**
 * TransitionSeries duration = sum(scene) − sum(transitions).
 * Scenes: marker → totals → charts (+ sticker teasers) → platform stickers → logos.
 */
export function videoDurationFrames(
  chartCount: number,
  options?: {
    includeHeatmapSticker?: boolean
    includeClockSticker?: boolean
    includeEmojiSticker?: boolean
  }
): number {
  const charts = Math.min(Math.max(chartCount, 0), MAX_CHARTS)
  const heatmap = options?.includeHeatmapSticker ? SCENE_HEATMAP_STICKER : 0
  const heatmapWhip = options?.includeHeatmapSticker ? 1 : 0
  const clock = options?.includeClockSticker ? SCENE_CLOCK_STICKER : 0
  const clockWhip = options?.includeClockSticker ? 1 : 0
  const emoji = options?.includeEmojiSticker ? SCENE_EMOJI_STICKER : 0
  const emojiWhip = options?.includeEmojiSticker ? 1 : 0
  // Platforms sticker always precedes the logos outro.
  const platforms = SCENE_PLATFORMS_STICKER
  const platformsWhip = 1

  if (charts === 0) {
    return (
      SCENE_MARKER +
      SCENE_TOTAL +
      SCENE_STATS +
      platforms +
      SCENE_LOGOS -
      WHIP * (3 + platformsWhip)
    )
  }
  return (
    SCENE_MARKER +
    SCENE_TOTAL +
    charts * SCENE_CHART +
    heatmap +
    clock +
    emoji +
    platforms +
    SCENE_LOGOS -
    WHIP * (2 + charts + heatmapWhip + clockWhip + emojiWhip + platformsWhip)
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
  const deepIdSet = new Set<string>([...DEEP_DIVE_ORDER])
  const earlySlides = slides.filter((s) => !s.id || !deepIdSet.has(s.id))
  const deepSlides = DEEP_DIVE_ORDER.map((id) =>
    slides.find((s) => s.id === id)
  ).filter((s): s is VideoChartSlide => Boolean(s?.src))

  const midScenes = hasCharts
    ? [
        ...chartSequenceNodes(earlySlides, "early"),
        ...chartSequenceNodes(deepSlides, "deep"),
      ]
    : [
        <TransitionSeries.Transition
          key="whip-stats"
          timing={whipTiming}
          presentation={whipPresentation}
        />,
        <TransitionSeries.Sequence key="stats" durationInFrames={SCENE_STATS}>
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
              before="See "
              highlight={platform}
              middle=" Analysis for "
              highlight2={safeName}
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

        <TransitionSeries.Sequence durationInFrames={SCENE_PLATFORMS_STICKER}>
          <RawStickerScene labels={PLATFORM_STICKER_LABELS} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          timing={whipTiming}
          presentation={whipPresentation}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_LOGOS}>
          <SceneShell>
            <AbsoluteFill style={{ top: "-28%" }}>
              <MarkerHighlight
                before="Use "
                highlight="Social Wrapped"
                after=""
                markerColor={MARKER}
                baseColor={INK}
                highlightedTextColor="#041512"
                backgroundColor="transparent"
                fontSize={58}
                fontWeight={700}
                speed={1.05}
              />
            </AbsoluteFill>
            <AbsoluteFill style={{ top: "8%" }}>
              <LogoEnter
                logos={SUPPORTED_PLATFORM_LOGOS}
                diameter={96}
                overlap={28}
                ringColor={BG}
                orientation="horizontal"
                stagger={7}
                speed={1}
              />
            </AbsoluteFill>
            {/* <AbsoluteFill style={{ top: "34%" }}>
              <SoftBlurIn
                text="& more"
                fontSize={32}
                fontWeight={600}
                color={MUTED}
                speed={1.15}
              />
            </AbsoluteFill> */}
          </SceneShell>
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  )
}
