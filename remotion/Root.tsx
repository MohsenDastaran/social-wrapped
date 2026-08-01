import React from "react"
import { Composition } from "remotion"

import {
  SocialWrappedVideo,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  videoDurationFrames,
  type SocialWrappedVideoProps,
} from "./Composition"

const defaultProps = {
  displayName: "Alex",
  totalMessages: 12840,
  sentMessages: 6120,
  receivedMessages: 6720,
  chatCount: 48,
  chartSlides: [],
} satisfies SocialWrappedVideoProps

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SocialWrapped"
        component={SocialWrappedVideo}
        durationInFrames={videoDurationFrames(0)}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: videoDurationFrames(props.chartSlides?.length ?? 0),
        })}
      />
    </>
  )
}
