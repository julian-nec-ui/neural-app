"use client";

// The stage: the canvas, the start button and the boost gauge.

import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader } from "./Loader";
import { useCamera } from "../render/camera";
import { createEngineRenderer } from "../render/renderer";
import type { EngineRenderer } from "../render/renderer";
import { StartContext, useEngineClock } from "../sim/clock";
import type { EngineFrame } from "../sim/clock";
import Joystick from "./Joystick";

/* =========================================================
   THE VIEW: the canvas, and the
   pointer: drag to turn the engine, wheel or pinch to zoom, double-click to
   come back to the first view.
   ========================================================= */

// The dashboard's push button, under the compass: as on a car, a brushed chrome ring in a dark bezel, the button's face
// dark and a little domed, ENGINE START / STOP in white on it, and a small lamp above the words: dim while the engine is
// off, amber while it is starting, green while it runs. As wide as the compass, so that the four buttons would fit in it
const DASH_D = 3 * 37 + 2 * 4; // the start button's width (as the old compass's)
const JOY_D = 90; // the joystick's, under it: smaller (7% bigger than the 84 it was, its centre kept where it was)
const JOY_D0 = 84;

function DashStartButton() {
  const { toggle, on, starting, caught } = useContext(StartContext);
  const running = on && (caught || !starting); // green once it has caught: its first few cylinders fired
  const ref = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const el = ref.current;

    if (!el) return;

    const stop = (e: Event) => e.stopPropagation(); // (a press must not turn the view)

    el.addEventListener("pointerdown", stop);
    el.addEventListener("dblclick", stop);

    return () => {
      el.removeEventListener("pointerdown", stop);
      el.removeEventListener("dblclick", stop);
    };
  }, []);

  const [pressed, setPressed] = useState(false); // held down: the button sinks into its well, and springs back
  const [pulse, setPulse] = useState(0); // each press plays the push, down and back up, even for the quickest tap
  const [heavy, setHeavy] = useState(false); // the press that starts the engine: it goes down against more resistance, and comes back later
  const D = DASH_D;
  const ring = D * 0.86; // the chrome ring's outside
  const face = D * 0.66; // the button's face
  const lamp = starting && !running
    ? { c: "linear-gradient(180deg, #ffd08a 0%, #ff7a00 45%, #c44800 100%)", glow: "0 0 2.5px 0.5px rgba(255, 110, 0, 0.8)" } // a vivid orange, its glow tight
    : running
    ? { c: "linear-gradient(180deg, #8dff7a 0%, #12d425 45%, #077a12 100%)", glow: "0 0 2.5px 0.5px rgba(18, 212, 37, 0.8)" } // a deep, pure green, its glow tight
    : { c: "#24402a", glow: "inset 0 0 2px rgba(0, 0, 0, 0.8)" };
  const action = on ? "Stop the engine" : "Start the engine";

  return (
    <div style={{ position: "absolute", left: 12, top: 10, width: D, height: D, pointerEvents: "none" }}>
      {/* the push: down into the well, held a moment, and up again past its rest, settling (two names, so that each
          press starts it afresh) */}
      <style>{[0, 1].map((k) => `@keyframes ak-push-${k} { 0% { transform: translateY(0) scale(1); filter: brightness(1); } 18% { transform: translateY(2.5px) scale(0.93); filter: brightness(0.78); } 55% { transform: translateY(2.5px) scale(0.93); filter: brightness(0.78); } 75% { transform: translateY(-0.6px) scale(1.012); filter: brightness(1.04); } 100% { transform: translateY(0) scale(1); filter: brightness(1); } }`).join(" ") + " " + [0, 1].map((k) => `@keyframes ak-heavy-${k} { 0% { transform: translateY(0) scale(1); filter: brightness(1); } 12% { transform: translateY(1px) scale(0.975); filter: brightness(0.92); } 30% { transform: translateY(2.8px) scale(0.925); filter: brightness(0.74); } 68% { transform: translateY(2.8px) scale(0.925); filter: brightness(0.74); } 86% { transform: translateY(-0.5px) scale(1.01); filter: brightness(1.03); } 100% { transform: translateY(0) scale(1); filter: brightness(1); } }`).join(" ")}</style>
      {/* the bezel: a dark recess round the ring */}
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 50% 45%, #1b1d21 60%, #0b0c0e 72%, #000 100%)", boxShadow: "0 3px 10px rgba(0,0,0,0.7), inset 0 2px 3px rgba(255,255,255,0.06)" }} />
      {/* the chrome ring: bright along its top left, dark at its bottom right, a fine dark line inside it */}
      <div
        style={{
          position: "absolute",
          left: (D - ring) / 2,
          top: (D - ring) / 2,
          width: ring,
          height: ring,
          borderRadius: "50%",
          background: "conic-gradient(from 210deg, #f4f6f8, #b9bec6 18%, #6c727b 38%, #9aa0a8 52%, #e2e5e9 66%, #8d939b 82%, #f4f6f8)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.35), inset 0 -3px 5px rgba(0,0,0,0.45), 0 0 0 1px #050506",
        }}
      />
      {/* the band between the chrome ring and the button: the intake's red while the engine is off (or starting), a
          metallic green while it runs */}
      <div
        style={{
          position: "absolute",
          left: (D - face) / 2 - 5,
          top: (D - face) / 2 - 5,
          width: face + 10,
          height: face + 10,
          borderRadius: "50%",
          background: running
            ? "conic-gradient(from 210deg, #8ff07a, #14c021 20%, #0a5e12 45%, #10951c 60%, #6fe35c 75%, #0c7016 90%, #8ff07a)"
            : "conic-gradient(from 210deg, #ff5a5a, #cc0000 25%, #7a0000 50%, #b30000 70%, #ff4040 85%, #ff5a5a)",
          boxShadow: running ? "0 0 3px 0 rgba(18, 200, 35, 0.6), inset 0 0 0 1px rgba(0,0,0,0.5)" : "0 0 6px 1px rgba(204, 0, 0, 0.45), inset 0 0 0 1px rgba(0,0,0,0.5)",
          transition: "background 0.4s ease, box-shadow 0.4s ease",
        }}
      />
      {/* the well the button sits in: dark, deep, a shadow down its upper wall */}
      <div style={{ position: "absolute", left: (D - face) / 2 - 1.5, top: (D - face) / 2 - 1.5, width: face + 3, height: face + 3, borderRadius: "50%", background: "#050607", boxShadow: "inset 0 3px 4px rgba(0,0,0,0.9)" }} />
      <button
        ref={ref}
        type="button"
        onClick={() => { setHeavy(!on); setPulse(pulse + 1); toggle(); }}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") setPressed(true); }}
        onKeyUp={() => setPressed(false)}
        aria-pressed={on}
        aria-label={action}
        title={action}
        style={{
          position: "absolute",
          left: (D - face) / 2,
          top: (D - face) / 2,
          // pressed, it goes down into its well: a little smaller and lower, its rim's light gone, its face shaded; let go,
          // it springs back up, overshooting a hair, as a real button's spring does
          transform: pressed ? "translateY(2px) scale(0.94)" : "translateY(0) scale(1)",
          animation: pulse ? (heavy ? `ak-heavy-${pulse % 2} 0.95s cubic-bezier(0.4, 0, 0.3, 1)` : `ak-push-${pulse % 2} 0.5s ease-out`) : "none",
          transition: pressed ? "transform 0.06s ease-out, box-shadow 0.06s ease-out, filter 0.06s" : "transform 0.32s cubic-bezier(0.34, 1.8, 0.64, 1) 0.06s, box-shadow 0.32s ease 0.06s, filter 0.32s 0.06s",
          filter: pressed ? "brightness(0.82)" : "none",
          width: face,
          height: face,
          borderRadius: "50%",
          border: "none",
          padding: 0,
          cursor: "pointer",
          pointerEvents: "auto",
          // the face: dark, domed, lit softly from the upper left, and over all of it a fine raised texture: a grid of small
          // domed studs, each lit on its upper left and shadowed below, crossed by a faint diamond knurl, a turned ring round its rim
          background: [
            "radial-gradient(circle at 38% 30%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 35%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)",
            "radial-gradient(circle, rgba(0,0,0,0) 0 44%, rgba(255,255,255,0.10) 45.5%, rgba(0,0,0,0.55) 47%, rgba(0,0,0,0) 48.5%)",
            "radial-gradient(circle at 38% 34%, rgba(255,255,255,0.30) 0 0.45px, rgba(150,156,166,0.18) 0.8px, rgba(0,0,0,0.6) 1.25px, rgba(0,0,0,0) 1.6px) 0 0 / 3.4px 3.4px",
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.035) 0 0.6px, rgba(0,0,0,0.18) 0.6px 1.7px)",
            "repeating-linear-gradient(-45deg, rgba(255,255,255,0.03) 0 0.6px, rgba(0,0,0,0.16) 0.6px 1.7px)",
            "radial-gradient(circle at 38% 30%, #3e424a 0%, #26292e 38%, #17191c 70%, #0f1012 100%)",
          ].join(", "),
          boxShadow: pressed
            ? "inset 0 3px 6px rgba(0,0,0,0.75), inset 0 -1px 2px rgba(255,255,255,0.06), 0 0 0 rgba(0,0,0,0)"
            : "inset 0 2px 3px rgba(255,255,255,0.16), inset 0 -4px 6px rgba(0,0,0,0.6), 0 3px 4px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.05)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: face * 0.012,
        }}
      >
        {/* the lamp: a small pill, ribbed, above the words */}
        <span
          style={{
            width: face * 0.2,
            height: face * 0.075,
            borderRadius: 2,
            marginBottom: face * 0.045,
            background: `repeating-linear-gradient(90deg, transparent 0 2px, rgba(255,255,255,0.3) 2px 2.6px), ${lamp.c}`,
            boxShadow: lamp.glow,
            border: "1px solid rgba(0,0,0,0.6)",
            transition: "background 0.3s ease, box-shadow 0.3s ease",
          }}
        />
        {/* the words, as one small drawing: each line stretched to its set width (textLength), so that they fit the
            face the same on every screen and in every browser, whatever its font and its text scaling */}
        <svg width={face * 0.8} height={face * 0.503} viewBox="0 0 70 44" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
          {/* raised letters: a dark shadow under them, a bright edge over them, and their faces brushed silver, lit from above */}
          <defs>
            <linearGradient id="ak-start-face" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.45" stopColor="#dfe3e8" />
              <stop offset="0.55" stopColor="#aeb4bc" />
              <stop offset="1" stopColor="#e9ecef" />
            </linearGradient>
          </defs>
          {[
            { dx: 0.35, dy: 0.9, fill: "rgba(0,0,0,0.85)", stroke: "none" },
            { dx: -0.25, dy: -0.4, fill: "rgba(255,255,255,0.45)", stroke: "none" },
            { dx: 0, dy: 0, fill: "url(#ak-start-face)", stroke: "rgba(40,44,50,0.55)" },
          ].map((l, k) => (
            <g key={k} transform={`translate(${l.dx} ${l.dy})`} fill={l.fill} stroke={l.stroke} strokeWidth={0.25} fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" textAnchor="middle">
              <text x="35" y="11" fontSize="12" textLength="58" lengthAdjust="spacingAndGlyphs">ENGINE</text>
              <text x="35" y="24.5" fontSize="12" textLength="47" lengthAdjust="spacingAndGlyphs">START</text>
              <rect x="9" y="28" width="52" height="1.4" rx="0.5" />
              <text x="35" y="42" fontSize="12" textLength="38" lengthAdjust="spacingAndGlyphs">STOP</text>
            </g>
          ))}
        </svg>
      </button>
    </div>
  );
}

export function EngineStage() {
  const clock = useEngineClock();
  const camera = useCamera();
  const frameRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false); // the engine is drawn: the loader goes

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const frameEl = frameRef.current;

    if (!canvas || !frameEl) return;

    let renderer: EngineRenderer | null = null;
    let mounted = true;

    // Tell React whether the renderer works, from a timer: setState is not called
    // synchronously in the effect body
    const report = (value: boolean) => {
      window.setTimeout(() => {
        if (mounted) {
          setFailed(value);
          setLoaded(true);
        }
      }, 0);
    };

    const render = (frame: EngineFrame) => {
      renderer?.draw(frame);
    };

    const initialize = () => {
      renderer?.dispose();
      renderer = null;

      try {
        renderer = createEngineRenderer(canvas, camera);
        renderer.resize();
        render(clock.frame);

        report(false);
      } catch (error) {
        console.error("Engine renderer:", error);
        report(true);
      }
    };

    const resize = () => {
      renderer?.resize();
    };

    const contextLost = (event: Event) => {
      event.preventDefault();
    };

    const contextRestored = () => {
      if (mounted) initialize();
    };

    canvas.addEventListener("webglcontextlost", contextLost);
    canvas.addEventListener("webglcontextrestored", contextRestored);

    // The engine is built only once the loader is on the screen: a frame for it to be painted, then the build (which
    // keeps the script busy for seconds; the loader moves on regardless)
    let startTimer = 0;
    const startFrame = window.requestAnimationFrame(() => {
      startTimer = window.setTimeout(() => {
        if (mounted) initialize();
      }, 60);
    });

    const unsubscribeClock = clock.subscribe(render);
    const unsubscribeCamera = camera.subscribe(() => render(clock.frame));

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(resize)
        : null;

    observer?.observe(frameEl);
    window.addEventListener("resize", resize);

    // ---- the pointer ----
    const pointers = new Map<number, { x: number; y: number; x0: number; y0: number; live: boolean }>();
    const TAP_SLOP = 10; // how far a finger goes before it drags, in CSS pixels
    let pinch = 0;

    const spread = () => {
      const [a, b] = Array.from(pointers.values());

      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    // a double tap on a touch screen does what a double click does (touch screens do not always send one)
    let lastTap = { t: 0, x: 0, y: 0 };
    let lastTapDone = -1e9;

    const onDown = (event: PointerEvent) => {
      frameEl.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, x0: event.clientX, y0: event.clientY, live: event.pointerType !== "touch" });
      camera.setDragging(true);

      if (pointers.size === 2) pinch = spread();

      if (event.pointerType === "touch" && pointers.size === 1) {
        const now = performance.now();

        if (now - lastTap.t < 320 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 30) {
          camera.nextView();
          lastTapDone = now;
          lastTap = { t: 0, x: 0, y: 0 };
        } else {
          lastTap = { t: now, x: event.clientX, y: event.clientY };
        }
      }
    };

    const onMove = (event: PointerEvent) => {
      const known = pointers.get(event.pointerId);

      if (!known) return;

      // a finger never stays quite still: a tap's little shift is no drag. Until it has gone some way the engine is not
      // turned, so the view shown stays the view shown and a double tap steps on from it (not back to the first)
      if (!known.live && pointers.size === 1) {
        if (Math.hypot(event.clientX - known.x0, event.clientY - known.y0) < TAP_SLOP) return;

        known.live = true;
      }

      const dx = event.clientX - known.x;
      const dy = event.clientY - known.y;

      known.x = event.clientX;
      known.y = event.clientY;

      if (pointers.size === 1) {
        camera.orbit(dx, dy);
      } else if (pointers.size === 2) {
        const now = spread();

        if (pinch > 0 && now > 0) camera.zoomBy(now / pinch);

        pinch = now;
      }
    };

    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);

      if (pointers.size === 0) camera.setDragging(false);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      camera.zoomBy(Math.exp(-event.deltaY * 0.0012));
    };

    // A double click steps through the views, in the buttons' order (the button of the view shown is lit)
    const onDouble = (event: MouseEvent) => {
      // (on a touch screen the double tap has done it already)
      if ((event as PointerEvent).pointerType === "touch" || performance.now() - lastTapDone < 400) return;

      camera.nextView();
    };

    frameEl.addEventListener("pointerdown", onDown);
    frameEl.addEventListener("pointermove", onMove);
    frameEl.addEventListener("pointerup", onUp);
    frameEl.addEventListener("pointercancel", onUp);
    frameEl.addEventListener("wheel", onWheel, { passive: false });
    frameEl.addEventListener("dblclick", onDouble);

    return () => {
      window.cancelAnimationFrame(startFrame);
      window.clearTimeout(startTimer);
      mounted = false;
      unsubscribeClock();
      unsubscribeCamera();

      observer?.disconnect();
      window.removeEventListener("resize", resize);

      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("webglcontextrestored", contextRestored);

      frameEl.removeEventListener("pointerdown", onDown);
      frameEl.removeEventListener("pointermove", onMove);
      frameEl.removeEventListener("pointerup", onUp);
      frameEl.removeEventListener("pointercancel", onUp);
      frameEl.removeEventListener("wheel", onWheel);
      frameEl.removeEventListener("dblclick", onDouble);

      renderer?.dispose();
      renderer = null;
    };
  }, [clock, camera]);

  return (
    <div
      ref={frameRef}
      className="ak-stage"
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        borderRadius: 8,
        background: "#000",
        flex: "1 1 0", // it fills the height the controls under it leave
        minHeight: 0,
        touchAction: "none",
        cursor: "grab",
        userSelect: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label="Animated twin-turbo V12 engine with DOHC 48-valve heads, timing chains, intercoolers and a starter motor, turning in 3D"
        role="img"
        style={{ position: "absolute", inset: 0, display: "block", width: "100%", height: "100%" }}
      />

      <DashStartButton />

      {/* The joystick that moves the engine on the stage, under the start button, centred on it */}
      <Joystick
        size={JOY_D}
        onMove={(dx, dy) => {
          if (dx) camera.nudge(dx);
          if (dy) camera.nudgeY(dy);
        }}
        onCenter={() => camera.recenter()}
        style={{ left: 12 + (DASH_D - JOY_D) / 2, top: 10 + DASH_D + 14 - (JOY_D - JOY_D0) / 2 }}
      />


      <Loader hidden={loaded} />

      {failed && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            color: "#f87171",
            fontSize: 12,
          }}
        >
          WebGL unavailable
        </div>
      )}
    </div>
  );
}
