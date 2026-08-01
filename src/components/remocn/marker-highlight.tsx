"use client";

import {
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface MarkerHighlightProps {
  before?: string;
  highlight: string;
  /** Plain text between the first and second highlight. */
  middle?: string;
  /** Optional second marker word (e.g. the person's name). */
  highlight2?: string;
  after?: string;
  markerColor?: string;
  baseColor?: string;
  highlightedTextColor?: string;
  fontSize?: number;
  fontWeight?: number;
  speed?: number;
  className?: string;
  /** Scene backdrop. Defaults to white. */
  backgroundColor?: string;
}

function MarkedWord({
  text,
  markerScale,
  textColor,
  markerColor,
}: {
  text: string;
  markerScale: number;
  textColor: string;
  markerColor: string;
}) {
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: "0 -0.1em",
          background: markerColor,
          transformOrigin: "left center",
          transform: `scaleX(${markerScale})`,
          zIndex: 0,
        }}
      />
      <span style={{ position: "relative", zIndex: 1, color: textColor }}>
        {text}
      </span>
    </span>
  );
}

export function MarkerHighlight({
  before = "",
  highlight,
  middle = "",
  highlight2 = "",
  after = "",
  markerColor = "#facc15",
  baseColor = "#171717",
  highlightedTextColor = "#171717",
  fontSize = 72,
  fontWeight = 600,
  speed = 1,
  className,
  backgroundColor = "white",
}: MarkerHighlightProps) {
  const frame = useCurrentFrame() * speed;
  const { fps } = useVideoConfig();

  const markerScale = spring({
    frame: frame - 15,
    fps,
    config: { damping: 14 },
  });

  const markerScale2 = spring({
    frame: frame - 28,
    fps,
    config: { damping: 14 },
  });

  const textColor = interpolateColors(
    interpolate(markerScale, [0.5, 0.8], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    [0, 1],
    [baseColor, highlightedTextColor],
  );

  const textColor2 = interpolateColors(
    interpolate(markerScale2, [0.5, 0.8], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    [0, 1],
    [baseColor, highlightedTextColor],
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: backgroundColor,
        padding: "0 8%",
        textAlign: "center",
      }}
    >
      <span
        className={className}
        style={{
          fontSize,
          fontWeight,
          color: baseColor,
          letterSpacing: "-0.03em",
          fontFamily:
            "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif",
          lineHeight: 1.25,
        }}
      >
        {before}
        <MarkedWord
          text={highlight}
          markerScale={markerScale}
          textColor={textColor}
          markerColor={markerColor}
        />
        {middle}
        {highlight2 ? (
          <MarkedWord
            text={highlight2}
            markerScale={markerScale2}
            textColor={textColor2}
            markerColor={markerColor}
          />
        ) : null}
        {after}
      </span>
    </div>
  );
}
