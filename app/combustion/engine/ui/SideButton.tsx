// A quiet button that moves the engine a step on the stage: almost invisible against what is behind it, only its edge
// and a soft shadow show, and a chevron; it brightens a little under the pointer. The four stand together in the stage's
// top left corner, as a compass

import { useEffect, useRef, useState } from "react";

// Held down, how long before it moves on its own (ms), and then how fast, in steps a second: evenly, a little every
// frame, not step by step
const HOLD_AFTER = 320;
const HOLD_RATE = 14;

// Where the button stands: its position on the stage, as style properties
type Place = { [property: string]: string | number };

export type SideDirection = "left" | "right" | "up" | "down";

const LABEL: Record<SideDirection, string> = {
  left: "Move the engine to the left",
  right: "Move the engine to the right",
  up: "Move the engine up",
  down: "Move the engine down",
};

// The chevron is drawn pointing right, and turned to point the button's way
const TURN: Record<SideDirection, string | undefined> = {
  left: "scaleX(-1)",
  right: undefined,
  up: "rotate(-90deg)",
  down: "rotate(90deg)",
};

// `onPress(k)`: move by k steps (1 for a click; a share of one, every frame, while held)
export default function SideButton({ direction, onPress, place }: { direction: SideDirection; onPress: (k: number) => void; place: Place }) {
  const [hover, setHover] = useState(false);
  const label = LABEL[direction];
  const ref = useRef<HTMLButtonElement | null>(null);
  const press = useRef(onPress);

  press.current = onPress;

  // A press moves the engine one step at once; held, it goes on stepping, after a short pause, until it is let go (the
  // camera stops it at the stage's edge). The listeners are native, as the stage's own are: inside the stage, which turns
  // the view when it is dragged and takes the pointer for that, the press must stay the button's
  useEffect(() => {
    const el = ref.current;

    if (!el) return;

    let delay: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    let last = 0;
    const release = () => {
      clearTimeout(delay);
      cancelAnimationFrame(frame);
      delay = undefined;
      frame = 0;
    };
    // held: every frame, as far as the time since the last one takes it at HOLD_RATE
    const glide = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);

      last = now;
      press.current(dt * HOLD_RATE);
      frame = requestAnimationFrame(glide);
    };
    const down = (e: PointerEvent) => {
      e.stopPropagation();

      if (e.button !== 0) return;

      release();
      el.setPointerCapture(e.pointerId);
      press.current(1); // one step at once
      delay = setTimeout(() => {
        last = performance.now();
        frame = requestAnimationFrame(glide);
      }, HOLD_AFTER);
    };
    const stop = (e: Event) => e.stopPropagation();

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("lostpointercapture", release);
    el.addEventListener("dblclick", stop);

    return () => {
      release();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", release);
      el.removeEventListener("pointercancel", release);
      el.removeEventListener("lostpointercapture", release);
      el.removeEventListener("dblclick", stop);
    };
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      // the keyboard's press (Enter, Space) comes as a click with no pointer: one step
      onClick={(e) => {
        if (e.detail === 0) onPress(1);
      }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      aria-label={label}
      title={label}
      style={{
        position: "absolute",
        pointerEvents: "auto",
        ...place,
        width: 37,
        height: 35,
        borderRadius: 10,
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        // raised keys: their edge in the light grey (#a8b5be), lit from above, a shadow under them; under the pointer
        // the edge and the chevron brighten, the key lifts a little and glows faintly
        color: hover ? "#ffffff" : "#c9d3da",
        background: hover
          ? "linear-gradient(180deg, rgba(120, 135, 147, 0.55), rgba(45, 54, 63, 0.75))"
          : "linear-gradient(180deg, rgba(86, 98, 110, 0.45), rgba(24, 30, 37, 0.7))",
        border: `1px solid ${hover ? "#dfe6eb" : "#a8b5be"}`,
        boxShadow: hover
          ? "0 4px 10px rgba(0, 0, 0, 0.7), 0 0 8px rgba(168, 181, 190, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 2px rgba(0, 0, 0, 0.4)"
          : "0 3px 6px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.25), inset 0 -2px 2px rgba(0, 0, 0, 0.4)",
        transform: hover ? "translateY(-1px)" : "none",
        backdropFilter: "blur(2px)",
        transition: "color 0.2s ease, background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease",
      }}
    >
      {/* A double chevron: a bold one in front, and a fainter, thinner one trailing behind it, like a wake. Under the
          pointer the two draw a little apart and lean the way the engine will go */}
      <svg
        width="19"
        height="17"
        viewBox="0 0 22 18"
        aria-hidden="true"
        style={{ transform: TURN[direction], overflow: "visible" }}
      >
        <path
          d="M4.5 4l5 5-5 5"
          fill="none"
          stroke={hover ? "#8fd0f0" : "#57afdb"} // the small chevron
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            opacity: hover ? 1 : 0.85,
            transform: hover ? "translateX(-1px)" : "none",
            transition: "transform 0.25s ease, opacity 0.25s ease",
          }}
        />
        <path
          d="M10.5 3l6 6-6 6"
          fill="none"
          stroke={hover ? "#b3e6ff" : "#66ccff"} // the big chevron
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: hover ? "translateX(1.5px)" : "none", transition: "transform 0.25s ease" }}
        />
      </svg>
    </button>
  );
}
