"use client";

// The stage: the canvas, the labels that follow the parts, the start button and the boost gauge.

import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BANKS, CYLS, FLYWHEEL_WORLD_X, ROD_LIFT, bankPoint } from "../core/constants";
import type { Bank } from "../core/constants";
import { normalizeCycle } from "../core/numbers";
import { SCENE_OPTIONS } from "../core/options";
import { STROKE_COLORS, STROKE_LABEL, strokeOf } from "../core/strokes";
import type { Stroke } from "../core/strokes";
import type { FwVec3 } from "../mesh/builder";
import { MODULES, modulePoint } from "../mesh/exhaust";
import { IC_CORE_Z, IC_STAND_Y, icPlace } from "../mesh/intercooler";
import { PIPES } from "../mesh/plumbing";
import { HDR_CX, IC, TURBO } from "../mesh/turbo";
import { Loader } from "./Loader";
import { CAM_BASE_DISTANCE, useCamera } from "../render/camera";
import { FLOOR_Y } from "../render/look";
import { createEngineRenderer } from "../render/renderer";
import type { EngineRenderer } from "../render/renderer";
import { StartContext, useEngineClock } from "../sim/clock";
import type { EngineFrame } from "../sim/clock";
import SideButton from "./SideButton";

/* =========================================================
   THE VIEW: the canvas, the labels that follow the cylinders, and the
   pointer: drag to turn the engine, wheel or pinch to zoom, double-click to
   come back to the first view.
   ========================================================= */

const LABEL_Y = -448 - ROD_LIFT; // a cylinder's label stands just over its camshafts, in the clear above the head
const LABEL_Z = 0; // in line with the cylinder's axis: it names the cylinder under it
const LABEL_LIFT = 85; // and raised this far, straight up, so that the name stands well above the head and is easy to see

// Which components are named depends on how close the view is. Looking at the whole engine (zoomed out),
// a component is named when it is in the frame, at least this many pixels inside its edges, and not far
// behind the plane the camera looks at: a part at the back of the view, behind the engine, is not named.
// Zoomed in (further than CLOSE_UP times the whole engine's view), the view is of one thing, the one at
// the middle of the stage, and only that is named: the others, in frame or not, are not. The label
// itself is drawn by the component, and kept inside the frame, with room for its text.
const LABEL_MARGIN = 28;
const ANYWHERE = -1e6; // a margin that lets a point be anywhere on the page, so long as it is in front of the camera
const CLOSE_UP = 2.6; // the views of the turbochargers and the intercoolers still name every part: only a much closer view names one
const FOREGROUND = 520; // in an overview, how far behind the nearest component that is named a component may be, and be named
const CLOSE_UP_RADIUS = 0.42; // of the stage's width, from its middle: the one at the middle must be this near it
const LABEL_ROOM_X = 70;
const LABEL_ROOM_Y = 34;

// The parts that are named. Each pair is numbered by its bank (1 is the bank of the cylinders 1 to 6, 2 the other), and each
// name stands in the middle of its part
type PartLabel = { text: string; at: FwVec3; behind: number; band: number };

const PART_LABELS: PartLabel[] = [
  // the one turbocharger, in the V, and its air filter
  ...MODULES.flatMap((m): PartLabel[] => {
    const no = m.bank.numbers.includes(1) ? 1 : 2;

    return [
      { text: `TURBO ${no}`, at: modulePoint(m, [TURBO.x, TURBO.y, TURBO.z]), behind: 300, band: 900 },
      { text: `AIR FILTER ${no}`, at: modulePoint(m, PIPES.intake.pts[PIPES.intake.pts.length - 1]), behind: 300, band: 900 },
    ];
  }),
  { text: "STARTER MOTOR", at: [FLYWHEEL_WORLD_X - 40 - 200, 120, -120], behind: 300, band: 900 },
  // each intercooler is on the side of the bank that feeds it: bank B's, of the cylinders 1 to 6, at +Z
  { text: "INTERCOOLER 1", at: icPlace(1, [IC.x, IC_STAND_Y, IC_CORE_Z]), behind: 300, band: 900 },
  { text: "INTERCOOLER 2", at: icPlace(-1, [IC.x, IC_STAND_Y, -IC_CORE_Z]), behind: 300, band: 900 },
  { text: "CRANKSHAFT", at: [HDR_CX + 270, 30, 0], behind: 300, band: 900 },
];

// The dashboard's push button, under the compass: as on a car, a brushed chrome ring in a dark bezel, the button's face
// dark and a little domed, ENGINE START / STOP in white on it, and a small lamp above the words: dim while the engine is
// off, amber while it is starting, green while it runs. As wide as the compass, so that the four buttons would fit in it
const DASH_D = 3 * 37 + 2 * 4; // the compass's width

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
    ? { c: "#ffb020", glow: "0 0 6px 2px rgba(255, 176, 32, 0.85)" }
    : running
    ? { c: "linear-gradient(180deg, #c8f7b4 0%, #4ccf3e 45%, #1f7a24 100%)", glow: "0 0 7px 2px rgba(74, 222, 58, 0.9)" }
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
            ? "conic-gradient(from 210deg, #b9f5a0, #3fbf3a 20%, #1d6e22 45%, #2f9a30 60%, #9be98a 75%, #237a26 90%, #b9f5a0)"
            : "conic-gradient(from 210deg, #ff5a5a, #cc0000 25%, #7a0000 50%, #b30000 70%, #ff4040 85%, #ff5a5a)",
          boxShadow: running ? "0 0 8px 1px rgba(74, 222, 58, 0.55), inset 0 0 0 1px rgba(0,0,0,0.5)" : "0 0 6px 1px rgba(204, 0, 0, 0.45), inset 0 0 0 1px rgba(0,0,0,0.5)",
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
          // the face: dark grey, domed, lit softly from the upper left
          background: "radial-gradient(circle at 38% 30%, #4a4e55 0%, #2e3136 38%, #1d1f23 70%, #141518 100%)",
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
          <g fill="#f4f6f8" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" textAnchor="middle" style={{ filter: "drop-shadow(0 1px 0.6px rgba(0,0,0,0.7))" }}>
            <text x="35" y="11" fontSize="12" textLength="58" lengthAdjust="spacingAndGlyphs">ENGINE</text>
            <text x="35" y="24.5" fontSize="12" textLength="47" lengthAdjust="spacingAndGlyphs">START</text>
            <rect x="9" y="28" width="52" height="1.4" rx="0.5" />
            <text x="35" y="42" fontSize="12" textLength="38" lengthAdjust="spacingAndGlyphs">STOP</text>
          </g>
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
  const labelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const flywheelLabelRef = useRef<HTMLDivElement | null>(null);
  const partLabelRefs = useRef<Array<HTMLDivElement | null>>([]);
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

    // The stroke each label shows now, so that the text changes only when the
    // stroke does
    const shown: Stroke[] = [];

    const placeLabels = (frame: EngineFrame) => {
      if (!renderer) return;

      // Switched off, none of the component names is shown, whatever the view
      const on = SCENE_OPTIONS.labels;

      // From steeply above the labels would lie on the engine, and from the
      // ends the cylinders hide one another: then they are not shown
      const view = camera.view;
      const steep = Math.abs(view.back[1]) > 0.8 || view.eye[1] > FLOOR_Y - 30;
      const [stageW, stageH] = renderer.frame();

      // Where a label goes: at its anchor, kept inside the frame, with room for its text
      const keep = (x: number, y: number): [number, number] => [
        Math.min(Math.max(x, LABEL_ROOM_X), Math.max(LABEL_ROOM_X, stageW - LABEL_ROOM_X)),
        Math.min(Math.max(y, LABEL_ROOM_Y), Math.max(LABEL_ROOM_Y, stageH - LABEL_ROOM_Y)),
      ];

      // The things that can be named, by the middle of each: the twelve cylinders, the flywheel, then the
      // parts; and how far behind the plane the camera looks at each may be, in an overview
      const stage = renderer;
      const named: Array<{ at: FwVec3; behind: number; band: number }> = [
        ...CYLS.map((cy): { at: FwVec3; behind: number; band: number } => ({ at: bankPoint(cy.bank, cy.x, -150 - ROD_LIFT, 0), behind: 260, band: FOREGROUND })),
        { at: [FLYWHEEL_WORLD_X, 0, 0], behind: 220, band: FOREGROUND },
        ...PART_LABELS.map((p) => ({ at: p.at, behind: p.behind, band: p.band })),
      ];
      // Which banks show their outside to the camera: a bank's top face turned toward the eye. Only their cylinders are numbered
      const bankIndex = CYLS.map((cy) => BANKS.indexOf(cy.bank));
      const seen = BANKS.map((bank: Bank) => {
        const c = bankPoint(bank, HDR_CX + bank.dx, -150 - ROD_LIFT, 0);
        const toEye: FwVec3 = [view.eye[0] - c[0], view.eye[1] - c[1], view.eye[2] - c[2]];
        const len = Math.hypot(toEye[0], toEye[1], toEye[2]) || 1;

        return -(bank.m[3] * toEye[0] + bank.m[4] * toEye[1] + bank.m[5] * toEye[2]) / len > 0.25;
      });
      const closeUp = CAM_BASE_DISTANCE / view.distance > CLOSE_UP;
      let nearestName = -1;
      let nearestDistance = Infinity;
      let foremost = Infinity; // of those in the frame, the one nearest the camera, along the line of sight
      const framed: boolean[] = [];
      const along: number[] = []; // how far each is from the camera, along the line of sight

      for (let k = 0; k < named.length; k++) {
        const c = named[k].at;

        // a cylinder of a bank that turns its back to the camera is not named, and does not count
        if (k < CYLS.length && !seen[bankIndex[k]]) {
          framed.push(false);
          along.push(Infinity);
          continue;
        }

        const [px, py, front] = stage.project(c[0], c[1], c[2]);
        const away = front ? Math.hypot(px - stageW / 2, py - stageH / 2) / stageW : Infinity;

        if (away < nearestDistance) {
          nearestDistance = away;
          nearestName = k;
        }

        framed.push(stage.project(c[0], c[1], c[2], LABEL_MARGIN)[2]);
        along.push(-((c[0] - view.eye[0]) * view.back[0] + (c[1] - view.eye[1]) * view.back[1] + (c[2] - view.eye[2]) * view.back[2]));

        if (framed[k]) foremost = Math.min(foremost, along[k]);
      }

      // Is the k-th of them named in this view?
      const inMainFrame = (k: number) => {
        if (closeUp) return k === nearestName && nearestDistance <= CLOSE_UP_RADIUS;

        // in an overview: in the frame, not far behind the plane the camera looks at, and not far behind
        // the nearest component in the frame: what is behind the others is not what the view is of
        return framed[k] && along[k] <= view.distance + named[k].behind && along[k] <= foremost + named[k].band;
      };

      // The cylinders' labels: all twelve are placed, and shown for the bank that shows its outside
      const spots: Array<[number, number, boolean]> = CYLS.map((cy) => {
        const w = bankPoint(cy.bank, cy.x, LABEL_Y, LABEL_Z);

        return stage.project(w[0], w[1] - LABEL_LIFT, w[2], ANYWHERE);
      });
      const apart = BANKS.map(() => Infinity);

      for (let i = 1; i < CYLS.length; i++) {
        if (CYLS[i].bank !== CYLS[i - 1].bank) continue;

        apart[bankIndex[i]] = Math.min(apart[bankIndex[i]], Math.hypot(spots[i][0] - spots[i - 1][0], spots[i][1] - spots[i - 1][1]));
      }

      for (let i = 0; i < CYLS.length; i++) {
        const el = labelRefs.current[i];

        if (!el) continue;

        const show = !steep && seen[bankIndex[i]] && apart[bankIndex[i]] > 78;
        const [ax, ay, front] = spots[i];
        const [x, y] = keep(ax, ay);

        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
        el.style.opacity = on && front && show && inMainFrame(i) ? "1" : "0";

        const stroke = strokeOf(normalizeCycle(frame.t + CYLS[i].bank.phase[CYLS[i].k]));

        if (shown[i] !== stroke) {
          shown[i] = stroke;

          const name = el.firstElementChild as HTMLElement | null;

          if (name) {
            name.textContent = STROKE_LABEL[stroke];
            name.style.color = STROKE_COLORS[stroke].label;
          }
        }
      }

      const fly = flywheelLabelRef.current;

      if (fly) {
        const [ax, ay, front] = renderer.project(FLYWHEEL_WORLD_X, FLOOR_Y - 12, 0, ANYWHERE);
        const [x, y] = keep(ax, ay);

        fly.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, 0)`;
        fly.style.opacity = on && front && !steep && inMainFrame(CYLS.length) ? "1" : "0";
      }

      for (let i = 0; i < PART_LABELS.length; i++) {
        const el = partLabelRefs.current[i];

        if (!el) continue;

        const at = PART_LABELS[i].at;
        const [ax, ay, front] = renderer.project(at[0], at[1], at[2], ANYWHERE);
        const [x, y] = keep(ax, ay);

        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
        el.style.opacity = on && front && !steep && inMainFrame(CYLS.length + 1 + i) ? "1" : "0";
      }
    };

    const render = (frame: EngineFrame) => {
      renderer?.draw(frame);
      placeLabels(frame);
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

      if (renderer) placeLabels(clock.frame);
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

      {CYLS.map((cy, i) => (
        <div
          key={i}
          ref={(el) => {
            labelRefs.current[i] = el;
          }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            textAlign: "center",
            pointerEvents: "none",
            transform: "translate(-9999px, 0)",
            willChange: "transform, opacity",
            transition: "opacity 0.2s ease",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "clamp(10px, 1.5vw, 16px)", lineHeight: 1.2, color: "#0ea5e9" }}>
            INTAKE
          </div>
          <div style={{ fontSize: "clamp(9px, 1.1vw, 12px)", color: "#cbd5e1", textShadow: "0 0 5px #000, 0 0 2px #000" }}>Cylinder {cy.number}</div>
        </div>
      ))}

      {PART_LABELS.map((label, i) => (
        <div
          key={label.text}
          ref={(el) => {
            partLabelRefs.current[i] = el;
          }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            pointerEvents: "none",
            transform: "translate(-9999px, 0)",
            willChange: "transform, opacity",
            transition: "opacity 0.2s ease",
            fontSize: "clamp(8px, 1vw, 11px)",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#cbd5e1",
            textShadow: "0 0 6px #000, 0 0 2px #000",
            whiteSpace: "nowrap",
            padding: "1px 6px",
            borderRadius: 4,
            background: "rgba(2, 6, 23, 0.55)",
          }}
        >
          {label.text}
        </div>
      ))}

      <DashStartButton />

      {/* The four buttons that move the engine on the stage, in the top left corner, as a compass (no frame round them): up
          (north), down (south), right (east), left (west) */}
      <div
        role="group"
        aria-label="Move the engine on the stage"
        style={{
          position: "absolute",
          left: 12,
          top: 10 + DASH_D + 14, // under the start button
          display: "grid",
          gridTemplateColumns: "repeat(3, 37px)",
          gridTemplateRows: "repeat(3, 35px)",
          gap: 4,
          pointerEvents: "none",
        }}
      >
        <SideButton direction="up" onPress={(k) => camera.nudgeY(k)} place={{ position: "relative", gridColumn: 2, gridRow: 1 }} />
        <SideButton direction="left" onPress={(k) => camera.nudge(-k)} place={{ position: "relative", gridColumn: 1, gridRow: 2 }} />
        <SideButton direction="right" onPress={(k) => camera.nudge(k)} place={{ position: "relative", gridColumn: 3, gridRow: 2 }} />
        <SideButton direction="down" onPress={(k) => camera.nudgeY(-k)} place={{ position: "relative", gridColumn: 2, gridRow: 3 }} />
      </div>

      <div
        ref={flywheelLabelRef}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          textAlign: "center",
          pointerEvents: "none",
          transform: "translate(-9999px, 0)",
          willChange: "transform, opacity",
            transition: "opacity 0.2s ease",
          fontSize: "clamp(8px, 1vw, 10px)",
          letterSpacing: "0.1em",
          color: "#94a3b8",
        }}
      >
        MACHINED FLYWHEEL
      </div>


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
