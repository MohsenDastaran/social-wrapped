import React from "react"
import { Composition } from "remotion"

import {
  SocialWrappedVideo,
  type SocialWrappedVideoProps,
} from "./Composition"

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SocialWrapped"
        component={SocialWrappedVideo}
        durationInFrames={330}
        fps={30}
        width={1080}
        height={1440}
        defaultProps={
          {
            displayName: "Alex",
            totalMessages: 12840,
            sentMessages: 6120,
            receivedMessages: 6720,
            chatCount: 48,
          } satisfies SocialWrappedVideoProps
        }
      />
    </>
  )
}
