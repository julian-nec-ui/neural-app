"use client";

// The Center button: a target, its rings in blue and green round a white dot, CENTER beside it. A click brings the engine
// back square to the screen, seen from the timing drive's end, in the middle of the stage and well filled.

import { useState } from "react";
import type { ReactNode } from "react";

const RING = 38; // the target's size, in CSS pixels

export function CenterButton({ onCenter }: { onCenter: () => void }) {
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);

  // matte, raised: a soft drop shadow under it, a light rim above and a dark one below; pressed, it sinks in
  const lift = down ? 0 : hover ? 2 : 1;
  const shadow = down
    ? "inset 0 2px 5px rgba(0,0,0,0.55), inset 0 -1px 1px rgba(255,255,255,0.08), 0 1px 1px rgba(0,0,0,0.4)"
    : `0 ${2 + lift * 2}px ${6 + lift * 4}px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06), inset 0 1px 1px rgba(255,255,255,0.18), inset 0 -2px 3px rgba(0,0,0,0.35)`;

  return (
    <button
      type="button"
      aria-label="Center the engine"
      title="Center the engine: square to the screen, from the timing drive's end"
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
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        padding: "5px 13px 5px 6px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.09)",
        background: hover
          ? "linear-gradient(180deg, #2b3340 0%, #1a2029 100%)"
          : "linear-gradient(180deg, #252c37 0%, #161b23 100%)",
        boxShadow: shadow,
        transform: `translate(-20px, ${down ? 1 : hover ? -1 : 0}px)`, // (20 px to the left of where the row puts it, whatever the row does)
        transition: "transform 120ms ease, box-shadow 120ms ease, background 160ms ease",
        cursor: "pointer",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        flex: "0 0 auto",
      }}
    >
      <Target hover={hover} down={down} />
      <span
        style={{
          font: "700 11.5px/1 ui-sans-serif, system-ui, sans-serif",
          letterSpacing: "0.16em",
          color: hover ? "#f1f5f9" : "#cbd5e1",
          textShadow: "0 1px 0 rgba(0,0,0,0.7), 0 -1px 0 rgba(255,255,255,0.05)",
          transition: "color 160ms ease",
        }}
      >
        CENTER
      </span>
    </button>
  );
}

// The target itself: an outer ring of matte blue, a thin pale gap, a ring of matte green, another gap and the white dot in
// the middle; each ring domed with a light from above, the whole a little sunk into the button
function Target({ hover, down }: { hover: boolean; down: boolean }) {
  const glow = hover && !down ? "0 0 10px rgba(80,200,140,0.35), " : "";
  const ring = (size: number, background: string, shadow: string, children?: ReactNode) => (
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
        boxShadow: shadow,
      }}
    >
      {children}
    </span>
  );

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        width: RING,
        height: RING,
        borderRadius: "50%",
        boxShadow: `${glow}0 2px 4px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(0,0,0,0.35)`,
        transform: down ? "scale(0.96)" : hover ? "scale(1.04)" : "scale(1)",
        transition: "transform 120ms ease, box-shadow 160ms ease",
      }}
    >
      {/* the blue ring */}
      {ring(RING, "radial-gradient(circle at 50% 30%, #4f8fe0 0%, #2563c4 55%, #173f86 100%)", "inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -2px 3px rgba(0,0,0,0.4)")}
      {/* the pale gap */}
      {ring(RING * 0.7, "radial-gradient(circle at 50% 30%, #e9eef4 0%, #c8d1dc 100%)", "inset 0 1px 2px rgba(0,0,0,0.35)")}
      {/* the green ring */}
      {ring(RING * 0.56, "radial-gradient(circle at 50% 30%, #58d48f 0%, #20a35c 55%, #12693a 100%)", "0 1px 1px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -2px 2px rgba(0,0,0,0.35)")}
      {/* the pale gap, and the white dot */}
      {ring(RING * 0.3, "radial-gradient(circle at 50% 30%, #e9eef4 0%, #c8d1dc 100%)", "inset 0 1px 2px rgba(0,0,0,0.35)")}
      {ring(RING * 0.18, "radial-gradient(circle at 45% 35%, #ffffff 0%, #f4f6f8 60%, #d5dbe3 100%)", "0 1px 2px rgba(0,0,0,0.45)")}
    </span>
  );
}
