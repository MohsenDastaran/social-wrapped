import { renderMediaOnWeb } from "@remotion/web-renderer"

import {
  SocialWrappedVideo,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  videoDurationFrames,
  type SocialWrappedVideoProps,
} from "@sw-remotion/Composition"

/** Client-side MP4 render for share/download. */
export async function renderWrapVideoBlob(
  props: SocialWrappedVideoProps,
  options?: {
    signal?: AbortSignal
    onProgress?: (progress: number) => void
    /** 0–1 scale; 0.5 keeps share downloads snappy. */
    scale?: number
  }
): Promise<Blob> {
  const durationInFrames = videoDurationFrames(props.chartSlides?.length ?? 0)

  const { getBlob } = await renderMediaOnWeb({
    composition: {
      id: "SocialWrapped",
      component: SocialWrappedVideo,
      durationInFrames,
      fps: VIDEO_FPS,
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
      defaultProps: {
        displayName: "You",
        totalMessages: 0,
        sentMessages: 0,
        receivedMessages: 0,
        chatCount: 0,
        chartSlides: [],
      },
    },
    inputProps: props,
    container: "mp4",
    videoCodec: "h264",
    muted: true,
    scale: options?.scale ?? 0.5,
    signal: options?.signal,
    onProgress: ({ progress }) => {
      options?.onProgress?.(progress)
    },
  })

  return getBlob()
}
