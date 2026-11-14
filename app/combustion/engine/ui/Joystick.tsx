// The joystick that moves the engine on the stage, under the start button: a small dashboard stick, as on a machine's
// control panel. A dark knurled bezel with a brushed steel ring, four small engraved arrows on it, a rubber boot in
// the well, and the stick: a short chrome shaft and a grippy black knob with a bright cap. Drag the knob and it leans
// that way (it goes no further than the well's edge); the engine glides on the stage that way, the faster the further
// the knob is pushed; let go and it springs back to the middle. A tap on it, without a drag, does nothing. The keys:
// with it focused, the arrows step the engine as the old buttons did.

import { useEffect, useRef } from "react";

type Props = {
  size: number; // the bezel's diameter, px
  onMove: (dx: number, dy: number) => void; // steps sideways (+ right) and up (+ up), as many as this frame's share
  onCenter?: () => void; // a double tap on its middle: the engine back to the middle of the stage
  style?: Record<string, string | number>;
};

const RATE = 7; // steps a second at full push: half what it was, slower and easier to place
const DEAD = 0.12; // a share of the throw at the middle that does nothing

export default function Joystick({ size, onMove, onCenter, style }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const bootRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const move = useRef(onMove);

  move.current = onMove;

  const center = useRef(onCenter);

  center.current = onCenter;

  const S = size;
  const well = S * 0.62; // the boot's well
  const knob = S * 0.36;
  const throw_ = (well - knob) / 2 + S * 0.06; // how far the knob's middle can go

  useEffect(() => {
    const root = rootRef.current;
    const k = knobRef.current;
    const sh = shadowRef.current;
    const boot = bootRef.current;
    const dot = dotRef.current;

    if (!root || !k || !sh || !boot || !dot) return;

    let held = false;
    let ox = 0;
    let oy = 0;
    let px = 0; // the knob's lean, -1..1 each way
    let py = 0;
    let frame = 0;
    let last = 0;
    let lastAng = -Math.PI / 2; // up, until the stick is first moved

    const draw = () => {
      const x = px * throw_;
      const y = py * throw_;
      const lean = Math.hypot(px, py);

      k.style.transform = `translate(${x}px, ${y}px) scale(${1 - 0.04 * lean})`;
      // the shaft's shadow lies under the knob's foot, the other way as it leans
      sh.style.transform = `translate(${x * 0.45}px, ${y * 0.45 + 3}px) scale(${1 + 0.15 * lean})`;
      sh.style.opacity = String(0.55 - 0.15 * lean);
      // the boot's folds bunch up on the side it leans toward
      boot.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
      // the green lamp on the silver ring: where the stick leans, round the ring; lit as it leans, out at the middle
      if (lean > 0.05) lastAng = Math.atan2(py, px); // (at rest it stays where the stick last pointed, dimmed)
      const rr = S * 0.37;

      dot.style.transform = `translate(${Math.cos(lastAng) * rr}px, ${Math.sin(lastAng) * rr}px)`;
      dot.style.opacity = String(0.7 + 0.3 * Math.min(1, lean / 0.25));
      boot.style.boxShadow = `inset ${-x * 0.35}px ${-y * 0.35 + 2}px ${S * 0.07}px rgba(0,0,0,0.85), inset ${x * 0.15}px ${y * 0.15}px ${S * 0.03}px rgba(255,255,255,0.06)`;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);

      last = now;

      const r = Math.hypot(px, py);

      if (r > DEAD) {
        const g = ((r - DEAD) / (1 - DEAD)) ** 2 / r; // very gently at first, faster only as it is pushed far: fine control near the middle
        move.current(px * g * RATE * dt, -py * g * RATE * dt);
      }

      if (held || r > 0.002) frame = requestAnimationFrame(tick);
      else frame = 0;
    };

    const spring = () => {
      // back to the middle, quickly, with a little overshoot
      const t0 = performance.now();
      const sx = px;
      const sy = py;
      const back = (now: number) => {
        if (held) return;

        const u = Math.min(1, (now - t0) / 260);
        const e = 1 - (1 - u) ** 3 * (1 + 2.2 * u);

        px = sx * (1 - e);
        py = sy * (1 - e);
        draw();

        if (u < 1) requestAnimationFrame(back);
        else {
          px = 0;
          py = 0;
          draw();
        }
      };

      requestAnimationFrame(back);
    };

    const at = (e: PointerEvent) => {
      const dx = (e.clientX - ox) / throw_;
      const dy = (e.clientY - oy) / throw_;
      const r = Math.hypot(dx, dy);

      px = r > 1 ? dx / r : dx;
      py = r > 1 ? dy / r : dy;
      draw();
    };

    // a double tap on the middle (the knob's cap): two quick taps that hardly move it, the engine back to the middle
    let tapStart = 0;
    let tapCentred = false;
    let engaged = false;
    let tapMax = 0;
    let lastTap = -1e9;

    const down = (e: PointerEvent) => {
      e.stopPropagation(); // (a drag here must not turn the view)

      if (e.button !== 0) return;

      const b = root.getBoundingClientRect();

      ox = b.left + b.width / 2;
      oy = b.top + b.height / 2;
      tapStart = performance.now();
      tapCentred = Math.hypot(e.clientX - ox, e.clientY - oy) < knob * 0.6;
      tapMax = 0;
      held = true;
      root.setPointerCapture(e.pointerId);
      root.style.cursor = "grabbing"; // (held: the hand closes round the stick)
      document.documentElement.style.cursor = "grabbing";
      k.style.transition = "none";
      engaged = !tapCentred; // (a press on the middle moves nothing until it is dragged off it: a tap stays a tap)
      if (engaged) at(e);

      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    const drag = (e: PointerEvent) => {
      if (held) {
        tapMax = Math.max(tapMax, Math.hypot(e.clientX - ox, e.clientY - oy));
        if (!engaged && tapMax > knob * 0.4) engaged = true;
        if (engaged) at(e);
      }
    };
    const up = () => {
      if (!held) return;

      held = false;
      root.style.cursor = "pointer"; // (still the pointing hand, over it)
      document.documentElement.style.cursor = "";
      spring();

      const now = performance.now();

      if (tapCentred && tapMax < knob * 0.7 && now - tapStart < 300) {
        if (now - lastTap < 380) {
          // the double tap: everything back as it was when the page opened: the stick at rest in the middle, the green
          // lamp at north, the engine in the middle of the stage
          px = 0;
          py = 0;
          lastAng = -Math.PI / 2;
          draw();
          center.current?.();
          lastTap = -1e9;
        } else lastTap = now;
      } else lastTap = -1e9;
    };
    const stop = (e: Event) => e.stopPropagation();
    const key = (e: KeyboardEvent) => {
      const m: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
      const d = m[e.key];

      if (!d) return;

      e.preventDefault();
      move.current(d[0], d[1]);
    };

    root.addEventListener("pointerdown", down);
    root.addEventListener("pointermove", drag);
    root.addEventListener("pointerup", up);
    root.addEventListener("pointercancel", up);
    root.addEventListener("lostpointercapture", up);
    root.addEventListener("dblclick", stop);
    root.addEventListener("wheel", stop);
    root.addEventListener("keydown", key);
    draw();

    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("pointerdown", down);
      root.removeEventListener("pointermove", drag);
      root.removeEventListener("pointerup", up);
      root.removeEventListener("pointercancel", up);
      root.removeEventListener("lostpointercapture", up);
      root.removeEventListener("dblclick", stop);
      root.removeEventListener("wheel", stop);
      root.removeEventListener("keydown", key);
    };
  }, [S, throw_]);

  const arrow = (rot: number) => (
    <svg
      key={rot}
      viewBox="0 0 10 10"
      width={S * 0.14}
      height={S * 0.14}
      style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(-50%, -50%) rotate(${rot}deg) translateY(${-S * 0.405}px)`, pointerEvents: "none" }}
    >
      {/* in the air filters' red (#cc0000), inlaid: a bright lower lip under it */}
      <path d="M5 1.5 L8.6 7.2 L1.4 7.2 Z" fill="rgba(255,255,255,0.22)" transform="translate(0 0.6)" />
      <path d="M5 1.5 L8.6 7.2 L1.4 7.2 Z" fill="#cc0000" stroke="#4a0000" strokeWidth="0.5" />
    </svg>
  );

  return (
    <div
      ref={rootRef}
      role="slider"
      aria-label="Move the engine on the stage (drag, or the arrow keys)"
      tabIndex={0}
      style={{
        position: "absolute",
        width: S,
        height: S,
        borderRadius: "50%",
        touchAction: "none",
        cursor: "pointer", // the pointing hand (index up, thumb out, the rest curled): an active control
        pointerEvents: "auto",
        outline: "none",
        // the bezel: a knurled dark rim (fine radial teeth), a chrome lip, a drop shadow onto the stage
        background: `repeating-conic-gradient(from 0deg, #1a1d22 0deg 3deg, #2a2e35 3deg 6deg)`,
        boxShadow: "0 6px 14px rgba(0,0,0,0.7), 0 2px 3px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -2px 3px rgba(0,0,0,0.8)",
        ...style,
      }}
    >
      {/* the brushed steel ring inside the knurled rim */}
      <div
        style={{
          position: "absolute",
          inset: S * 0.075,
          borderRadius: "50%",
          background: "conic-gradient(from 200deg, #6b7280, #d1d5db 12%, #7b828d 25%, #4b5059 38%, #a9afb8 52%, #e5e7eb 62%, #6b7280 75%, #3f444c 88%, #6b7280)",
          boxShadow: "inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.6), 0 0 0 1px #0a0b0d",
          pointerEvents: "none",
        }}
      />
      {/* fine concentric lines of the brushing */}
      <div
        style={{
          position: "absolute",
          inset: S * 0.075,
          borderRadius: "50%",
          background: "repeating-radial-gradient(circle, rgba(255,255,255,0.05) 0 1px, rgba(0,0,0,0.05) 1px 2px)",
          pointerEvents: "none",
        }}
      />
      {[0, 90, 180, 270].map(arrow)}
      {/* the green lamp on the ring, following the stick: a domed metallic green bead in a dark seat, glowing */}
      <div
        ref={dotRef}
        style={{
          position: "absolute",
          left: S / 2 - S * 0.045,
          top: S / 2 - S * 0.045,
          width: S * 0.09,
          height: S * 0.09,
          borderRadius: "50%",
          // a vivid emerald, set off the silver by a dark seat round it and a strong green glow
          background: "radial-gradient(circle at 34% 28%, #f2ffe6 0%, #7dff4f 14%, #22e03a 34%, #00a82a 58%, #006b1d 82%, #003d10 100%)",
          boxShadow: "0 0 0 1.5px #031207, 0 0 0 3px rgba(0, 0, 0, 0.55), 0 0 7px 3px rgba(40, 255, 70, 0.85), 0 0 16px 5px rgba(40, 255, 70, 0.4), inset 0 -1px 2px rgba(0,0,0,0.65)",
          opacity: 0.7,
          pointerEvents: "none",
          willChange: "transform, opacity",
        }}
      />
      {/* the well, and the rubber boot in it */}
      <div
        style={{
          position: "absolute",
          left: (S - well) / 2 - 2,
          top: (S - well) / 2 - 2,
          width: well + 4,
          height: well + 4,
          borderRadius: "50%",
          background: "#050607",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.95), 0 1px 0 rgba(255,255,255,0.18)",
          pointerEvents: "none",
        }}
      />
      <div
        ref={bootRef}
        style={{
          position: "absolute",
          left: (S - well) / 2,
          top: (S - well) / 2,
          width: well,
          height: well,
          borderRadius: "50%",
          // rubber: ribbed folds round it, darker toward its rim
          background: "radial-gradient(circle, #24272c 0%, #1a1c20 45%, #0d0e10 100%), repeating-radial-gradient(circle, transparent 0 3px, rgba(0,0,0,0.5) 3px 4px)",
          backgroundBlendMode: "multiply",
          pointerEvents: "none",
        }}
      >
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `repeating-radial-gradient(circle, rgba(255,255,255,0.05) 0 ${S * 0.02}px, rgba(0,0,0,0.35) ${S * 0.02}px ${S * 0.04}px)` }} />
      </div>
      {/* the knob's shadow on the boot */}
      <div
        ref={shadowRef}
        style={{
          position: "absolute",
          left: (S - knob * 1.05) / 2,
          top: (S - knob * 1.05) / 2,
          width: knob * 1.05,
          height: knob * 1.05,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,0,0,0.85), rgba(0,0,0,0) 70%)",
          pointerEvents: "none",
        }}
      />
      {/* the knob: a grippy black dome, its ribs round it, a bright machined cap with a red dot */}
      <div
        ref={knobRef}
        style={{
          position: "absolute",
          left: (S - knob) / 2,
          top: (S - knob) / 2 - 2,
          width: knob,
          height: knob,
          borderRadius: "50%",
          background: "radial-gradient(circle at 38% 30%, #5b616b 0%, #2a2d33 35%, #121417 70%, #050607 100%)",
          boxShadow: "0 4px 6px rgba(0,0,0,0.75), inset 0 -2px 3px rgba(0,0,0,0.9), inset 0 1px 1px rgba(255,255,255,0.35)",
          pointerEvents: "none",
          willChange: "transform",
        }}
      >
        {/* its grip: sharp ribs round its outer band, each with a lit edge and a shadowed one, and a fine knurl between them */}
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "repeating-conic-gradient(from 0deg, rgba(255,255,255,0.22) 0deg 0.8deg, rgba(255,255,255,0.05) 0.8deg 3.2deg, rgba(0,0,0,0.6) 3.2deg 4.2deg, rgba(0,0,0,0.2) 4.2deg 7.5deg)", WebkitMaskImage: "radial-gradient(circle, transparent 0 56%, #000 60%)", maskImage: "radial-gradient(circle, transparent 0 56%, #000 60%)" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 0.7px, rgba(0,0,0,0.25) 0.7px 1.8px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.04) 0 0.7px, rgba(0,0,0,0.22) 0.7px 1.8px)", WebkitMaskImage: "radial-gradient(circle, #000 0 50%, transparent 56%)", maskImage: "radial-gradient(circle, #000 0 50%, transparent 56%)" }} />
        {/* the light on the dome, over the texture */}
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 36% 28%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 28%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.4) 100%)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.85), inset 0 1.5px 0 rgba(255,255,255,0.18)" }} />
        <div
          style={{
            position: "absolute",
            inset: knob * 0.24,
            borderRadius: "50%",
            // machined: turned in fine rings, a bright chamfer round its edge, a dark step down to the dome
            background: "repeating-radial-gradient(circle, rgba(255,255,255,0.14) 0 0.5px, rgba(0,0,0,0.12) 0.5px 1.1px), conic-gradient(from 210deg, #9ca3af, #f3f4f6 15%, #9ca3af 35%, #6b7280 55%, #e5e7eb 75%, #9ca3af)",
            boxShadow: "0 0 0 1px #0a0b0d, 0 0 0 2px rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.55), inset 0 1px 1px rgba(255,255,255,0.7), inset 0 -1.5px 1.5px rgba(0,0,0,0.55)",
          }}
        >
          <div style={{ position: "absolute", left: "50%", top: "50%", width: knob * 0.1, height: knob * 0.1, transform: "translate(-50%, -50%)", borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #ff8080, #cc0000 60%, #600000)", boxShadow: "0 0 3px rgba(255,40,40,0.6)" }} />
        </div>
      </div>
    </div>
  );
}
