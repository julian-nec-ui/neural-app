"use client";

// The Center button: a target, nothing else: its rings in blue and green, and in the middle, on a dark disc, a green C. A
// click brings the engine back square to the screen, seen from the timing drive's end, in the middle of the stage and well filled.

import { useState } from "react";
import type { ReactNode } from "react";

const RING = 52; // the target's size, in CSS pixels

// The target: an outer ring of matte blue, a thin pale gap, a ring of matte green, and in the middle a broad dark disc with a
// C in bright metallic green; each ring domed with a light from above. Raised off the page with a soft shadow; on hover it
// lifts and glows a little, pressed it sinks in
export function CenterButton({ onCenter }: { onCenter: () => void }) {
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);

  const lift = down ? 0 : hover ? 2 : 1;
  const shadow = down
    ? "0 1px 2px rgba(0,0,0,0.6), inset 0 2px 5px rgba(0,0,0,0.5)"
    : `${hover ? "0 0 12px rgba(80,200,140,0.35), " : ""}0 ${2 + lift * 2}px ${5 + lift * 4}px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(0,0,0,0.35)`;

  const ring = (size: number, background: string, ringShadow: string, children?: ReactNode) => (
    <span
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: "50%",
        background,
        boxShadow: ringShadow,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </span>
  );

  return (
    <button
      type="button"
      aria-label="Center the engine"
      title="Center: the engine square to the screen, from the timing drive's end"
      onClick={onCenter}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => {
        setHover(false);
        setDown(false);
      }}
      onPointerDown={() => setDown(true)}
      onPointerUp={() => setDown(false)}
      onPointerCancel={() => setDown(false)}
      onDoubleClick={(event) => event.stopPropagation()}
      style={{
        position: "relative",
        display: "inline-block",
        width: RING,
        height: RING,
        padding: 0,
        border: "none",
        borderRadius: "50%",
        background: "transparent",
        boxShadow: shadow,
        // (25 px to the left of where the row puts it, whatever the row does)
        transform: `translate(-25px, ${down ? 1 : hover ? -1 : 0}px) scale(${down ? 0.96 : hover ? 1.04 : 1})`,
        transition: "transform 120ms ease, box-shadow 160ms ease",
        cursor: "pointer",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        flex: "0 0 auto",
      }}
    >
      {/* the blue ring */}
      {ring(RING, "radial-gradient(circle at 50% 30%, #4f8fe0 0%, #2563c4 55%, #173f86 100%)", "inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -2px 3px rgba(0,0,0,0.4)")}
      {/* the pale gap */}
      {ring(RING * 0.8, "radial-gradient(circle at 50% 30%, #e9eef4 0%, #c8d1dc 100%)", "inset 0 1px 2px rgba(0,0,0,0.35)")}
      {/* the green ring */}
      {ring(RING * 0.67, "radial-gradient(circle at 50% 30%, #58d48f 0%, #20a35c 55%, #12693a 100%)", "0 1px 1px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -2px 2px rgba(0,0,0,0.35)")}
      {/* the dark disc, sunk a little, and the C on it */}
      {ring(
        RING * 0.52,
        "radial-gradient(circle at 50% 35%, #2a313c 0%, #161b22 70%, #0d1015 100%)",
        "inset 0 2px 3px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.15)",
        // (an SVG letter, so that it can be filled with the gradient: bright metallic green, a light band across its top, the
        // deep green under it, a lighter edge at its foot)
        <svg width={RING * 0.52} height={RING * 0.52} viewBox="0 0 30 30" aria-hidden="true" style={{ display: "block", filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.85))" }}>
          <defs>
            <linearGradient id="ak-center-c" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={hover ? "#d9ffe7" : "#c3ffd9"} />
              <stop offset="0.38" stopColor={hover ? "#5cff9e" : "#3cf08a"} />
              <stop offset="0.52" stopColor={hover ? "#10b45a" : "#0c9c4c"} />
              <stop offset="0.78" stopColor={hover ? "#1fe27a" : "#17cf6d"} />
              <stop offset="1" stopColor={hover ? "#a6ffcb" : "#8cf5b8"} />
            </linearGradient>
          </defs>
          <text x="15" y="16" textAnchor="middle" dominantBaseline="central" fontFamily="ui-sans-serif, system-ui, sans-serif" fontWeight="900" fontSize="21" fill="url(#ak-center-c)">
            C
          </text>
        </svg>
      )}
    </button>
  );
}
