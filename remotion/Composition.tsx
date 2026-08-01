import React from "react"
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion"

import { RollingNumber } from "../src/components/remocn/rolling-number"
import { SoftBlurIn } from "../src/components/remocn/soft-blur-in"

export type SocialWrappedVideoProps = {
  displayName: string
  totalMessages: number
  sentMessages: number
  receivedMessages: number
  chatCount: number
}

const BG = "#041512"
const INK = "#ecfdf5"
const MUTED = "rgba(167, 243, 208, 0.78)"
const ACCENT = "#34d399"

/**
 * Portrait wrap highlight reel for the share-media video tile.
 * Uses remocn SoftBlurIn + RollingNumber. Composition duration: 300f @ 30fps.
 *
 * RollingNumber keys off composition `durationInFrames`, so `speed` is tuned
 * so each beat's count settles inside its Sequence window.
 */
export const SocialWrappedVideo: React.FC<SocialWrappedVideoProps> = ({
  displayName,
  totalMessages,
  sentMessages,
  receivedMessages,
  chatCount,
}) => {
  const frame = useCurrentFrame()
  const glow = interpolate(frame, [0, 45, 280], [0.16, 0.3, 0.2], {
    extrapolateRight: "clamp",
  })

  const safeName = displayName.trim() || "Your wrap"
  const total = Math.max(0, Math.floor(totalMessages))
  const sent = Math.max(0, Math.floor(sentMessages))
  const received = Math.max(0, Math.floor(receivedMessages))
  const chats = Math.max(0, Math.floor(chatCount))

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 75% 48% at 50% 30%, rgba(16,185,129,${glow}), transparent 72%)`,
        }}
      />

      {/* Intro */}
      <Sequence from={0} durationInFrames={75} premountFor={12}>
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
      <Sequence from={18} durationInFrames={60} premountFor={12}>
        <AbsoluteFill style={{ top: "12%" }}>
          <SoftBlurIn
            text={safeName}
            fontSize={58}
            fontWeight={700}
            color={INK}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Total messages */}
      <Sequence from={70} durationInFrames={100} premountFor={15}>
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
      <Sequence from={95} durationInFrames={75} premountFor={10}>
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

      {/* Sent */}
      <Sequence from={160} durationInFrames={55} premountFor={10}>
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
      <Sequence from={168} durationInFrames={45} premountFor={8}>
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

      {/* Received */}
      <Sequence from={205} durationInFrames={55} premountFor={10}>
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
      <Sequence from={213} durationInFrames={45} premountFor={8}>
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

      {/* Chats + close */}
      <Sequence from={250} durationInFrames={50} premountFor={10}>
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
      <Sequence from={258} durationInFrames={42} premountFor={8}>
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

      <Sequence from={285} durationInFrames={45} premountFor={8}>
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
