"use client";

// The stage: the canvas, the start button and the boost gauge.

import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader } from "./Loader";
import { CAM_BASE_DISTANCE, createCameraController, useCamera, type CameraController } from "../render/camera";
import { createEngineRenderer } from "../render/renderer";
import type { EngineRenderer } from "../render/renderer";
import { StartContext, useEngineClock } from "../sim/clock";
import type { EngineFrame } from "../sim/clock";
import Joystick from "./Joystick";
import { CenterButton } from "./CenterButton";
import { SCENE_OPTIONS } from "../core/options";
import { GHOST, INSPECT } from "../core/inspect";
import { SELECT, componentById } from "../core/select";

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
// a phone: narrow, or held sideways and short; there the two are drawn at half size (a scale, so all of them keeps its
// proportions and stays sharp)
const DASH_CSS = `
@media (max-width: 600px), (max-height: 500px) and (orientation: landscape) {
  .ak-dash { transform: scale(0.5); transform-origin: 0 0; }
}`;

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

// The View panel, at the left under the joystick: closed, only its tab shows, an arrow pointing right; pressed, a panel
// slides out to its right, down to the stage's foot, with switches to take parts away so the engine shows better, and the
// arrow turns to point left, to close it
const VIEW_TOP = 10 + DASH_D + 14 + JOY_D0 + 20; // 20 under the joystick
const VIEW_CSS = `
.ak-vp { position: absolute; left: 12px; top: ${VIEW_TOP}px; bottom: 8px; display: flex; align-items: flex-start; gap: 6px; pointer-events: none; z-index: 2; }
.ak-vp > * { pointer-events: auto; }
.ak-vp-tab { width: 26px; height: 46px; border-radius: 7px; border: 1px solid #3a3e46; background: linear-gradient(180deg, #23262b, #121316);
  color: #d8dce3; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; margin: 0; box-sizing: border-box;
  -webkit-appearance: none; appearance: none; -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  box-shadow: 0 3px 8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07); }
.ak-vp-tab:hover { color: #fff; border-color: #50555f; }
.ak-vp-tab svg { transition: transform .25s ease; }
.ak-vp-panel { align-self: stretch; width: 250px; max-width: calc(100vw - 80px); overflow: visible; border-radius: 8px; border: 1px solid #2e3238;
  background: rgba(14, 15, 18, 0.9); box-shadow: 0 6px 18px rgba(0,0,0,0.6); padding: 12px 12px; color: #d8dce3;
  font: 12px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif; transform-origin: left center; transition: opacity .2s ease, transform .2s ease; }
.ak-vp-panel[data-open="false"] { opacity: 0; transform: translateX(-8px); pointer-events: none; }
.ak-vp-title { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #8b919b; margin: 0 0 10px; }
.ak-vp-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 0; border-top: 1px solid #23262c; }
.ak-vp-label { position: relative; cursor: help; }
.ak-vp-tip { position: absolute; left: 0; top: calc(100% + 6px); width: 190px; z-index: 3; padding: 6px 8px; border-radius: 6px;
  background: #1c1f24; border: 1px solid #3a3e46; box-shadow: 0 4px 12px rgba(0,0,0,0.6); color: #c3c8d0; font-size: 11px; line-height: 1.4;
  opacity: 0; visibility: hidden; transition: opacity .15s; pointer-events: none; }
.ak-vp-label { outline: none; -webkit-tap-highlight-color: transparent; }
.ak-vp-label:focus .ak-vp-tip { opacity: 1; visibility: visible; }
.ak-vp-switch { flex: 0 0 34px; position: relative; display: block; box-sizing: border-box; width: 34px; height: 19px; min-width: 34px; max-width: 34px; min-height: 19px; max-height: 19px;
  margin: 0; border-radius: 10px; background: #3a3e46; transition: background .2s; border: 0; padding: 0; cursor: pointer;
  -webkit-appearance: none; appearance: none; font-size: 0; line-height: 0; vertical-align: middle; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
.ak-vp-switch::after { content: ""; position: absolute; top: 50%; left: 2px; box-sizing: border-box; width: 15px; height: 15px; margin-top: -7.5px; border-radius: 50%; background: #f2f4f7; transition: transform .2s; }
.ak-vp-switch { box-shadow: inset 0 1px 2px rgba(0,0,0,0.45); transition: background .25s, box-shadow .25s; }
.ak-vp-switch::after { box-shadow: 0 1px 3px rgba(0,0,0,0.5); }
.ak-vp-switch[data-on="true"] { background: #2d8543; }
.ak-vp-switch:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(53, 170, 85, 0.75); }
.ak-vp-switch[data-on="true"]::after { transform: translateX(15px); }
/* (held against the page's own rules for its buttons on a phone or a tablet: a minimum height, side padding, a font size; the
   switches and the tab keep their own shape everywhere) */
.ak-vp .ak-vp-switch, .ak-insp .ak-vp-switch, .ak-dw .ak-vp-switch { width: 34px !important; height: 19px !important; min-width: 34px !important; max-width: 34px !important; min-height: 19px !important; max-height: 19px !important;
  padding: 0 !important; margin: 0 !important; font-size: 0 !important; line-height: 0 !important; border: 0 !important; border-radius: 10px !important; flex: 0 0 34px !important; }
.ak-vp .ak-vp-tab { padding: 0 !important; min-height: 0 !important; font-size: 0 !important; line-height: 0 !important; margin: 0 !important; flex: none !important; }
.ak-vp .ak-vp-tab svg { display: block !important; width: 12px !important; height: 16px !important; flex: none !important; }
@media (max-width: 600px), (max-height: 500px) and (orientation: landscape) {
  .ak-vp .ak-vp-tab { width: 20px !important; height: 36px !important; }
}
@media (hover: hover) {
  .ak-vp-switch:hover { box-shadow: inset 0 1px 2px rgba(0,0,0,0.45), 0 0 0 3px rgba(190, 198, 210, 0.12), 0 0 14px 2px rgba(190, 198, 210, 0.22); }
  .ak-vp-switch[data-on="true"]:hover { background: #359c4f; box-shadow: inset 0 1px 2px rgba(0,0,0,0.3), 0 0 0 3px rgba(45, 133, 67, 0.32), 0 0 18px 4px rgba(53, 170, 85, 0.6); }
  .ak-vp-switch:hover::after { box-shadow: 0 0 8px 1px rgba(255,255,255,0.55), 0 1px 3px rgba(0,0,0,0.5); }
  .ak-vp-label:hover .ak-vp-tip { opacity: 1; visibility: visible; }
}
@media (max-width: 600px), (max-height: 500px) and (orientation: landscape) {
  .ak-vp { top: ${Math.round(VIEW_TOP / 2)}px; left: 6px; }
  .ak-vp-tab { width: 20px; height: 36px; }
  .ak-vp-panel { width: 215px; padding: 10px; }
  .ak-vp-tip { width: 160px; }
}`;

function ViewPanel({ onChange }: { onChange: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [accessories, setAccessories] = useState(() => SCENE_OPTIONS.accessories);
  const [intercoolers, setIntercoolers] = useState(() => SCENE_OPTIONS.intercoolers);
  const [airIntake, setAirIntake] = useState(() => SCENE_OPTIONS.airIntake);
  const [plenum, setPlenum] = useState(() => SCENE_OPTIONS.plenum);

  useEffect(() => {
    const el = ref.current;

    if (!el) return;

    const stop = (e: Event) => e.stopPropagation(); // (a press here must not turn the view)

    el.addEventListener("pointerdown", stop);
    el.addEventListener("dblclick", stop);
    el.addEventListener("wheel", stop);

    return () => {
      el.removeEventListener("pointerdown", stop);
      el.removeEventListener("dblclick", stop);
      el.removeEventListener("wheel", stop);
    };
  }, []);

  // open, a press anywhere outside it closes it (caught on the way down, before anything else can stop it)
  useEffect(() => {
    if (!open) return;

    const outside = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener("pointerdown", outside, true);

    return () => document.removeEventListener("pointerdown", outside, true);
  }, [open]);

  const toggleAccessories = () => {
    const next = !accessories;

    SCENE_OPTIONS.accessories = next;
    setAccessories(next);
    onChange();
  };

  const toggleIntercoolers = () => {
    const next = !intercoolers;

    SCENE_OPTIONS.intercoolers = next;
    setIntercoolers(next);
    onChange();
  };

  const toggleAirIntake = () => {
    const next = !airIntake;

    SCENE_OPTIONS.airIntake = next;
    setAirIntake(next);
    onChange();
  };

  const togglePlenum = () => {
    const next = !plenum;

    SCENE_OPTIONS.plenum = next;
    setPlenum(next);
    onChange();
  };

  return (
    <div ref={ref} className="ak-vp">
      <style>{VIEW_CSS}</style>
      <button type="button" className="ak-vp-tab" aria-label={open ? "Close the view panel" : "Open the view panel"} aria-expanded={open} onClick={() => setOpen(!open)}>
        <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true" style={{ transform: open ? "rotate(180deg)" : "none" }}>
          <path d="M3 2 L9 8 L3 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="ak-vp-panel" data-open={open} aria-hidden={!open}>
        <p className="ak-vp-title">View</p>
        <div className="ak-vp-row">
          <span className="ak-vp-label" tabIndex={open ? 0 : -1}>
            Belt, pulleys…
            <span className="ak-vp-tip" role="tooltip">Hides the belt, the pulleys, the alternator, the water pump, the power steering pump and the tensioner</span>
          </span>
          <button type="button" className="ak-vp-switch" role="switch" aria-checked={accessories} aria-label="Belt, pulleys and accessories" tabIndex={open ? 0 : -1} data-on={accessories} onClick={toggleAccessories} />
        </div>
        <div className="ak-vp-row">
          <span className="ak-vp-label" tabIndex={open ? 0 : -1}>
            Intercoolers
            <span className="ak-vp-tip" role="tooltip">Hides the two intercoolers: their cores, their fans, their tanks and the pipes' flanges on them</span>
          </span>
          <button type="button" className="ak-vp-switch" role="switch" aria-checked={intercoolers} aria-label="Intercoolers" tabIndex={open ? 0 : -1} data-on={intercoolers} onClick={toggleIntercoolers} />
        </div>
        <div className="ak-vp-row">
          <span className="ak-vp-label" tabIndex={open ? 0 : -1}>
            Air filters
            <span className="ak-vp-tip" role="tooltip">Hides the two air filters and their pipes into the turbocharger</span>
          </span>
          <button type="button" className="ak-vp-switch" role="switch" aria-checked={airIntake} aria-label="Air filters" tabIndex={open ? 0 : -1} data-on={airIntake} onClick={toggleAirIntake} />
        </div>
        <div className="ak-vp-row">
          <span className="ak-vp-label" tabIndex={open ? 0 : -1}>
            Intake plenum
            <span className="ak-vp-tip" role="tooltip">Hides the red intake plenum on top of the V, its throttle and the two cooled-air pipes that feed it (on the opaque engine; the transparent one leaves it out already)</span>
          </span>
          <button type="button" className="ak-vp-switch" role="switch" aria-checked={plenum} aria-label="Intake plenum" tabIndex={open ? 0 : -1} data-on={plenum} onClick={togglePlenum} />
        </div>
      </div>
    </div>
  );
}

// The selection and the detail window (core/select.ts). A right click (on a phone or a tablet, a finger held still for half
// a second) opens the context menu; its "Select component" turns the pointer to a cross, and the next press picks the
// component under it, outlined in metallic blue on the stage. A drag begun on it carries it, in a small card, toward the
// detail window, which shows only then: its edge metallic blue, turning metallic green once the pointer is inside it. Let
// go there, the component leaves the engine for the window (silver, with minimize, maximize and close: closing puts it
// back); let go anywhere else (or Escape), it glides back and nothing changes
const SELECT_CSS = `
.ak-menu { position: absolute; z-index: 6; min-width: 178px; padding: 4px; box-sizing: border-box; border-radius: 8px;
  background: linear-gradient(180deg, rgba(64,69,78,0.97), rgba(34,37,42,0.97) 55%, rgba(26,28,32,0.97));
  border: 1px solid rgba(206,212,220,0.26); box-shadow: 0 10px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.4);
  font: 12px/1.3 system-ui, -apple-system, "Segoe UI", sans-serif; color: #e4e7ec; animation: ak-menu-in .12s ease-out; transform-origin: top left; }
@keyframes ak-menu-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: none; } }
.ak-menu-title { padding: 4px 9px 5px; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: #8e959f; border-bottom: 1px solid rgba(255,255,255,0.07); margin-bottom: 3px; }
.ak-menu button { display: flex !important; align-items: center; gap: 9px; width: 100% !important; min-height: 0 !important; margin: 0 !important; padding: 7px 9px !important;
  border: 0 !important; border-radius: 5px !important; background: transparent; color: inherit; font: inherit !important; text-align: left; cursor: pointer;
  -webkit-appearance: none; appearance: none; -webkit-tap-highlight-color: transparent; }
.ak-menu button svg { flex: none; color: #8fc9f2; }
.ak-menu button:focus-visible { outline: none; background: rgba(0,122,204,0.35); }
@media (hover: hover) { .ak-menu button:hover { background: linear-gradient(180deg, rgba(0,122,204,0.62), rgba(0,92,156,0.62)); } .ak-menu button:hover svg { color: #fff; } }
.ak-dw { position: absolute; right: 10px; top: 10px; width: min(52%, 760px); height: min(88%, 700px); z-index: 3; box-sizing: border-box; border-radius: 8px;
  transition: box-shadow .15s ease, background-color .15s ease; }
.ak-dw::before { content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 2px; pointer-events: none; z-index: 2;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0); }
.ak-dw[data-state="target"], .ak-dw[data-state="hot"] { pointer-events: none; }
.ak-dw[data-state="target"] { background-color: rgba(0,122,204,0.05); box-shadow: 0 0 9px 1px rgba(0,122,204,0.35), 0 4px 14px rgba(0,0,0,0.35); }
.ak-dw[data-state="target"]::before { background: linear-gradient(160deg, #7cc8f7, #007acc 45%, #00487d); }
.ak-dw[data-state="hot"] { background-color: rgba(75,181,121,0.06); box-shadow: 0 0 11px 2px rgba(75,181,121,0.45), 0 4px 14px rgba(0,0,0,0.35); }
.ak-dw[data-state="hot"]::before { background: linear-gradient(160deg, #a6ebc3, #4bb579 45%, #226c47); }
.ak-dw[data-state="open"] { background-color: #15171b; box-shadow: 0 8px 22px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.5); }
.ak-dw[data-state="open"]::before { background: linear-gradient(160deg, #f1f3f6, #b9c0ca 38%, #7b828c 75%, #a9b0ba); }
.ak-dw[data-max="true"] { left: 6px; right: 6px; top: 6px; bottom: 6px; width: auto; height: auto; }
.ak-dw[data-min="true"] { height: 34px; width: min(52%, 300px); }
.ak-dw-drop { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  font: 600 13px/1.3 system-ui, -apple-system, "Segoe UI", sans-serif; letter-spacing: .06em; text-transform: uppercase; }
.ak-dw[data-state="target"] .ak-dw-drop { color: #8fcaf3; }
.ak-dw[data-state="hot"] .ak-dw-drop { color: #a6ebc3; }
.ak-dw-size { font: 11px/1 system-ui, -apple-system, "Segoe UI", sans-serif; letter-spacing: 0; text-transform: none; opacity: .7; }
.ak-dw-bar { position: absolute; left: 2px; right: 2px; top: 2px; height: 30px; display: flex; align-items: center; gap: 6px; padding-left: 10px; box-sizing: border-box;
  border-radius: 6px 6px 0 0; background: linear-gradient(180deg, #3a3f47, #24272d); border-bottom: 1px solid #0d0e10;
  font: 12px/1 system-ui, -apple-system, "Segoe UI", sans-serif; color: #dfe3e8; cursor: default; user-select: none; }
.ak-dw[data-min="true"] .ak-dw-bar { border-radius: 6px; border-bottom: 0; }
.ak-dw-name { flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; letter-spacing: .02em; }
.ak-dw-bar button { flex: none; display: flex !important; align-items: center; justify-content: center; width: 34px !important; height: 28px !important; min-height: 0 !important;
  margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 4px !important; background: transparent; color: #c9ced6; cursor: pointer;
  -webkit-appearance: none; appearance: none; -webkit-tap-highlight-color: transparent; font-size: 0 !important; }
.ak-dw-bar button:last-child { margin-right: 1px !important; border-radius: 4px 5px 4px 4px !important; }
.ak-dw-bar button:focus-visible { outline: none; background: rgba(255,255,255,0.12); }
@media (hover: hover) { .ak-dw-bar button:hover { background: rgba(255,255,255,0.12); color: #fff; } .ak-dw-bar button.ak-dw-x:hover { background: #c42b1c; color: #fff; } }
.ak-dw-body { position: absolute; left: 2px; right: 2px; top: 33px; bottom: 2px; border-radius: 0 0 6px 6px; overflow: hidden; }
.ak-ghost { position: absolute; left: 0; top: 0; width: 170px; height: 116px; border-radius: 8px; z-index: 5; pointer-events: none; display: none;
  box-shadow: 0 12px 26px rgba(0,0,0,0.6), 0 0 0 1.5px rgba(124,200,247,0.75), 0 0 10px rgba(0,122,204,0.35); will-change: transform; }
.ak-insp { position: absolute; inset: 0; box-sizing: border-box; cursor: grab; touch-action: none; }
.ak-insp:active { cursor: grabbing; }
.ak-insp-ctl { position: absolute; left: 8px; top: 6px; display: flex; flex-direction: column; gap: 6px; cursor: default;
  font: 11px/1.3 system-ui, -apple-system, "Segoe UI", sans-serif; color: #c3c8d0; }
.ak-insp-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 132px; }
.ak-insp-center { padding-left: 25px; margin-top: 2px; }
.ak-insp-hint { position: absolute; left: 8px; bottom: 6px; font: 10px/1.3 system-ui, -apple-system, "Segoe UI", sans-serif; color: #6c727c; pointer-events: none; }
@media (max-width: 600px), (max-height: 500px) and (orientation: landscape) {
  .ak-dw { right: 6px; top: 6px; width: 58%; height: 62%; }
  .ak-dw[data-min="true"] { width: 58%; height: 30px; }
  .ak-dw-bar { height: 26px; font-size: 11px; }
  .ak-dw-bar button { width: 30px !important; height: 24px !important; }
  .ak-dw-body { top: 29px; }
  .ak-ghost { width: 120px; height: 82px; }
  .ak-insp-ctl { font-size: 9px; gap: 4px; }
  .ak-insp-row { width: 104px; }
  .ak-insp-center { transform: scale(0.6); transform-origin: 0 0; height: 32px; }
  .ak-insp-hint { display: none; }
}`;

// its camera, made once, and kept while the page is open (the plenum stays as it was left)
let inspectCam: CameraController | null = null;

const getInspectCam = () => {
  if (!inspectCam) {
    inspectCam = createCameraController({ auto: false, autoSpeed: 0 });
    inspectCam.lookAt([0, 0, 0], 215, 28, 1);
    for (let k = 0; k < 400; k++) inspectCam.update(0.05);
  }

  return inspectCam;
};

function PlenumInspector({ onChange }: { onChange: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [section, setSection] = useState<-1 | 0 | 1>(() => INSPECT.section);

  const cut = (side: -1 | 1) => {
    const next = INSPECT.section === side ? 0 : side;

    INSPECT.section = next;
    setSection(next);
    onChange();
  };

  useEffect(() => {
    const el = ref.current;

    if (!el) return;

    const cam = getInspectCam();

    INSPECT.view = () => cam.view;
    INSPECT.el = el;
    INSPECT.on = true;
    onChange();

    // its own easing, every frame, while it is open
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last > 0 ? Math.min(0.1, (now - last) / 1000) : 0;

      last = now;
      if (cam.update(dt)) onChange();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    let twist = 0;
    const list = () => [...pointers.values()];
    const spread = () => {
      const p = list();

      return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    };
    const angleOf = () => {
      const p = list();

      return p.length < 2 ? 0 : Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x);
    };
    const onDown = (e: PointerEvent) => {
      e.stopPropagation();
      if ((e.target as HTMLElement).closest(".ak-insp-ctl")) return; // (its controls take their own presses)
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      cam.setDragging(true);
      if (pointers.size === 2) {
        pinch = spread();
        twist = angleOf();
      }
    };
    const onMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);

      if (!p) return;

      e.stopPropagation();

      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;

      p.x = e.clientX;
      p.y = e.clientY;

      if (pointers.size === 1) {
        if (e.shiftKey) cam.roll(dx * 0.35);
        else cam.orbit(dx, dy);
      } else if (pointers.size === 2) {
        const now = spread();

        if (pinch > 0 && now > 0) cam.zoomBy(now / pinch);
        pinch = now;

        const angle = angleOf();
        const turn = Math.atan2(Math.sin(angle - twist), Math.cos(angle - twist));

        twist = angle;
        cam.roll((turn * 180) / Math.PI);
      }
    };
    const onUp = (e: PointerEvent) => {
      e.stopPropagation();
      pointers.delete(e.pointerId);
      if (pointers.size === 0) cam.setDragging(false);
    };
    const onWheel = (e: WheelEvent) => {
      e.stopPropagation();
      e.preventDefault();
      cam.zoomBy(Math.exp(-e.deltaY * 0.0012));
    };
    const stop = (e: Event) => e.stopPropagation();

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("dblclick", stop);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("dblclick", stop);
      INSPECT.on = false;
      INSPECT.el = null;
      INSPECT.view = null;
      onChange();
    };
  }, [onChange]);

  // the Center button: squared up to the nearest of its faces, from where it is seen now, as the engine's is
  const center = () => {
    const el = ref.current;
    const aspect = el && el.clientHeight > 0 ? el.clientWidth / el.clientHeight : 1.4;

    getInspectCam().center(aspect, false);
  };

  return (
    <div ref={ref} className="ak-insp" role="img" aria-label="The intake plenum, its two log plenums and its runners: drag to turn it, pinch or scroll to zoom">
      <div className="ak-insp-ctl">
        <div className="ak-insp-row">
          <span>Left section</span>
          <button type="button" className="ak-vp-switch" role="switch" aria-checked={section === -1} aria-label="Left section" data-on={section === -1} onClick={() => cut(-1)} />
        </div>
        <div className="ak-insp-row">
          <span>Right section</span>
          <button type="button" className="ak-vp-switch" role="switch" aria-checked={section === 1} aria-label="Right section" data-on={section === 1} onClick={() => cut(1)} />
        </div>
        <div className="ak-insp-center">
          <CenterButton onCenter={center} />
        </div>
      </div>
      <span className="ak-insp-hint">Drag to turn · Shift-drag or twist to roll · scroll or pinch to zoom</span>
    </div>
  );
}

// The context menu, where it was opened (in the stage's CSS pixels, kept inside it)
function ContextMenu({ at, onSelect, onClose }: { at: { x: number; y: number }; onSelect: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState(at);

  useLayoutEffect(() => {
    const el = ref.current;
    const stage = el?.parentElement;

    if (!el || !stage) return;

    const x = Math.max(6, Math.min(at.x, stage.clientWidth - el.offsetWidth - 6));
    const y = Math.max(6, Math.min(at.y, stage.clientHeight - el.offsetHeight - 6));

    if (x !== pos.x || y !== pos.y) setPos({ x, y });
  }, [at, pos.x, pos.y]);

  useEffect(() => {
    const el = ref.current;

    if (!el) return;

    const stop = (e: Event) => e.stopPropagation();
    const noMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    // a press anywhere outside it closes it (caught on the way down)
    const outside = (e: Event) => {
      if (!el.contains(e.target as Node)) onClose();
    };

    el.addEventListener("pointerdown", stop);
    el.addEventListener("dblclick", stop);
    el.addEventListener("contextmenu", noMenu);
    document.addEventListener("pointerdown", outside, true);
    el.querySelector("button")?.focus({ preventScroll: true });

    return () => {
      el.removeEventListener("pointerdown", stop);
      el.removeEventListener("dblclick", stop);
      el.removeEventListener("contextmenu", noMenu);
      document.removeEventListener("pointerdown", outside, true);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="ak-menu" role="menu" style={{ left: pos.x, top: pos.y }}>
      <div className="ak-menu-title">Component</div>
      <button type="button" role="menuitem" onClick={onSelect}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <circle cx="7" cy="7" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M7 0.5 V3.5 M7 10.5 V13.5 M0.5 7 H3.5 M10.5 7 H13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        Select component
      </button>
    </div>
  );
}

export type DockState = "none" | "target" | "hot" | "open";

// The detail window, on the stage's right: while a component is dragged, only its edge and "Drop here" (blue, green once the
// pointer is in it); once one is dropped there, a silver window with a title bar (minimize, maximize, close) and the component
// in it, turned and cut as the inspector lets it be
function DetailWindow({ state, boxRef, onChange, onClose }: { state: DockState; boxRef: { current: HTMLDivElement | null }; onChange: () => void; onClose: () => void }) {
  const [min, setMin] = useState(false);
  const [max, setMax] = useState(false);
  const [size, setSize] = useState("");
  const comp = componentById(SELECT.detached);

  useEffect(() => {
    if (state !== "open") {
      setMin(false);
      setMax(false);
    }
  }, [state]);

  // the box's size, shown while a component is carried over it
  useLayoutEffect(() => {
    const el = boxRef.current;

    if (el && (state === "target" || state === "hot")) setSize(`${Math.round(el.clientWidth)} × ${Math.round(el.clientHeight)}`);
  }, [state, boxRef]);

  useEffect(() => {
    const el = boxRef.current;

    if (!el) return;

    const stop = (e: Event) => e.stopPropagation();
    const noMenu = (e: Event) => e.preventDefault();

    el.addEventListener("pointerdown", stop);
    el.addEventListener("dblclick", stop);
    el.addEventListener("wheel", stop);
    el.addEventListener("contextmenu", noMenu);

    return () => {
      el.removeEventListener("pointerdown", stop);
      el.removeEventListener("dblclick", stop);
      el.removeEventListener("wheel", stop);
      el.removeEventListener("contextmenu", noMenu);
    };
  }, [boxRef, state]);

  // the renderer reads the box's place each frame: a redraw once it has moved or changed size
  useEffect(() => {
    const t = window.setTimeout(onChange, 0);

    return () => window.clearTimeout(t);
  }, [min, max, state, onChange]);

  if (state === "none") return null;

  return (
    <div ref={(el) => { boxRef.current = el; }} className="ak-dw" data-state={state} data-min={state === "open" && min} data-max={state === "open" && max && !min}>
      {state !== "open" ? (
        <div className="ak-dw-drop">
          <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
            <rect x="2" y="2" width="26" height="26" rx="5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="4 3" />
            <path d="M15 8 V20 M10 15.5 L15 20.5 L20 15.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Drop here
          <span className="ak-dw-size">{size}</span>
        </div>
      ) : (
        <>
          <div className="ak-dw-bar">
            <span className="ak-dw-name">{comp?.name ?? "Component"}</span>
            <button type="button" aria-label={min ? "Restore" : "Minimize"} title={min ? "Restore" : "Minimize"} onClick={() => setMin(!min)}>
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 9.5 H10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            </button>
            <button type="button" aria-label={max ? "Restore" : "Maximize"} title={max ? "Restore" : "Maximize"} onClick={() => { setMax(!max); setMin(false); }}>
              {max ? (
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="1.5" y="3.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.2" /><path d="M3.5 3.5 V1.5 H10.5 V8.5 H8.5" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="1.5" y="1.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
              )}
            </button>
            <button type="button" className="ak-dw-x" aria-label="Close: the component goes back into the engine" title="Close" onClick={onClose}>
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            </button>
          </div>
          {!min && (
            <div className="ak-dw-body">
              <PlenumInspector onChange={onChange} />
            </div>
          )}
        </>
      )}
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
  const notifyCamera = useRef(() => camera.notify()).current; // (one function for good: the inspector's effect runs once)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null); // the context menu, where it was opened
  const [arm, setArm] = useState(false); // "Select component" chosen: the next press picks
  const [dock, setDock] = useState<DockState>("none"); // the detail window
  const dockRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  // shared with the pointer's handlers (set up once): the menu's choice, and when the menu last opened
  const ix = useRef({ arm: false, menuAt: -1e9 }).current;
  const closeMenu = useRef(() => setMenu(null)).current;
  const chooseSelect = () => {
    setMenu(null);
    ix.arm = true;
    setArm(true);
  };
  const closeDock = () => {
    SELECT.detached = 0;
    setDock("none");
    camera.notify();
  };

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
    let twist = 0; // the line between two fingers, its angle on the screen (radians, clockwise)

    const angleOf = () => {
      const [a, b] = Array.from(pointers.values());

      return Math.atan2(b.y - a.y, b.x - a.x);
    };

    const spread = () => {
      const [a, b] = Array.from(pointers.values());

      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    // a double tap on a touch screen does what a double click does (touch screens do not always send one)
    let lastTap = { t: 0, x: 0, y: 0 };
    let lastTapDone = -1e9;

    // ---- the selection, and the drag into the detail window ----
    const local = (event: { clientX: number; clientY: number }) => {
      const b = canvas.getBoundingClientRect();

      return { x: event.clientX - b.left, y: event.clientY - b.top };
    };
    const LONG_PRESS = 500; // ms a finger is held still for the context menu
    let longPress = 0;
    let drag: { id: number; pointerId: number; x0: number; y0: number; active: boolean; hot: boolean } | null = null;
    let glide = 0;

    const openMenu = (x: number, y: number) => {
      ix.menuAt = performance.now();
      ix.arm = false;
      setArm(false);
      setMenu({ x, y });
    };

    const placeGhost = (x: number, y: number) => {
      const g = ghostRef.current;

      if (!g) return;

      g.style.transform = `translate(${Math.round(x - g.offsetWidth / 2)}px, ${Math.round(y - g.offsetHeight * 0.62)}px)`;
    };

    const endDrag = (dropped: boolean) => {
      const d = drag;

      drag = null;
      camera.setDragging(false);

      if (!d) return;

      if (!d.active) return;

      const g = ghostRef.current;

      if (dropped) {
        SELECT.detached = d.id;
        SELECT.selected = 0;
        GHOST.el = null;
        GHOST.view = null;
        if (g) g.style.display = "none";
        setDock("open");
        camera.notify();

        return;
      }

      // missed: the card glides back to where the component was picked up, and all is as it was
      setDock("none");
      if (!g) return;
      g.style.transition = "transform .26s cubic-bezier(.3,.7,.4,1), opacity .26s";
      placeGhost(d.x0, d.y0);
      g.style.opacity = "0.2";

      const t0 = performance.now();
      const step = () => {
        camera.notify();
        if (performance.now() - t0 < 300) glide = requestAnimationFrame(step);
        else {
          g.style.transition = "";
          g.style.display = "none";
          g.style.opacity = "";
          GHOST.el = null;
          GHOST.view = null;
          camera.notify();
        }
      };

      glide = requestAnimationFrame(step);
    };

    const overDock = (event: PointerEvent) => {
      const el = dockRef.current;

      if (!el) return false;

      const b = el.getBoundingClientRect();

      return event.clientX >= b.left && event.clientX <= b.right && event.clientY >= b.top && event.clientY <= b.bottom;
    };

    const onDown = (event: PointerEvent) => {
      if (event.button === 2) return; // (the right button opens the menu: contextmenu)

      const at = local(event);

      // "Select component" chosen: this press picks what is under it, and does nothing else
      if (ix.arm) {
        ix.arm = false;
        setArm(false);
        SELECT.selected = renderer?.pick(at.x, at.y) ?? 0;
        camera.notify();

        return;
      }

      // a component selected: a press on it begins carrying it (the engine stays still); anywhere else lets it go, and
      // the engine turns as ever
      if (SELECT.selected) {
        if (pointers.size === 0 && renderer?.pick(at.x, at.y) === SELECT.selected) {
          frameEl.setPointerCapture(event.pointerId);
          camera.setDragging(true);
          drag = { id: SELECT.selected, pointerId: event.pointerId, x0: at.x, y0: at.y, active: false, hot: false };

          return;
        }

        SELECT.selected = 0;
        camera.notify();
      }

      if (drag) return;

      frameEl.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, x0: event.clientX, y0: event.clientY, live: event.pointerType !== "touch" });
      camera.setDragging(true);

      if (pointers.size === 2) {
        pinch = spread();
        twist = angleOf();
      }

      // a finger held still opens the context menu (the system's own is kept away: contextmenu, -webkit-touch-callout)
      window.clearTimeout(longPress);
      if (event.pointerType === "touch" && pointers.size === 1) {
        const id = event.pointerId;

        longPress = window.setTimeout(() => {
          const p = pointers.get(id);

          if (!p || p.live || pointers.size !== 1) return;

          pointers.delete(id);
          camera.setDragging(false);
          lastTap = { t: 0, x: 0, y: 0 };
          navigator.vibrate?.(12);
          openMenu(at.x, at.y);
        }, LONG_PRESS);
      }

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
      if (drag && event.pointerId === drag.pointerId) {
        const at = local(event);

        if (!drag.active) {
          if (Math.hypot(at.x - drag.x0, at.y - drag.y0) < 6) return;

          drag.active = true;

          const g = ghostRef.current;

          if (g) {
            g.style.transition = "";
            g.style.opacity = "";
            g.style.display = "block";
          }

          GHOST.el = g;
          GHOST.view = () => {
            const v = camera.view;

            return { right: v.right, down: v.down, back: v.back, distance: CAM_BASE_DISTANCE / 1.7 }; // (the plenum filling the card)
          };
          setDock("target");
        }

        placeGhost(at.x, at.y);

        const hot = overDock(event);

        if (hot !== drag.hot) {
          drag.hot = hot;
          setDock(hot ? "hot" : "target");
        }

        camera.notify();

        return;
      }

      const known = pointers.get(event.pointerId);

      if (!known) return;

      // a finger never stays quite still: a tap's little shift is no drag. Until it has gone some way the engine is not
      // turned, so the view shown stays the view shown and a double tap steps on from it (not back to the first)
      if (!known.live && pointers.size === 1) {
        if (Math.hypot(event.clientX - known.x0, event.clientY - known.y0) < TAP_SLOP) return;

        known.live = true;
        window.clearTimeout(longPress);
      }

      const dx = event.clientX - known.x;
      const dy = event.clientY - known.y;

      known.x = event.clientX;
      known.y = event.clientY;

      if (pointers.size === 1) {
        // Shift and a drag across rolls the engine round the line of sight, like a barrel; a plain drag turns it
        if (event.shiftKey) camera.roll(dx * 0.35);
        else camera.orbit(dx, dy);
      } else if (pointers.size === 2) {
        const now = spread();

        if (pinch > 0 && now > 0) camera.zoomBy(now / pinch);

        pinch = now;

        // two fingers twisted roll it the same way, as far as they turn
        const angle = angleOf();
        const turn = Math.atan2(Math.sin(angle - twist), Math.cos(angle - twist));

        twist = angle;
        camera.roll((turn * 180) / Math.PI);
      }
    };

    const onUp = (event: PointerEvent) => {
      if (drag && event.pointerId === drag.pointerId) {
        endDrag(event.type === "pointerup" && drag.active && overDock(event));

        return;
      }

      window.clearTimeout(longPress);
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
      if (SELECT.selected || drag) return; // (two presses on a selected component are no change of view)

      camera.nextView();
    };

    // A right click (a two-finger click on a trackpad) opens the context menu, in place of the browser's; on a touch screen
    // the held finger has done it (a browser that also sends contextmenu then is not heeded)
    const onContext = (event: MouseEvent) => {
      event.preventDefault();

      if (performance.now() - ix.menuAt < 900 || drag) return;
      if ((event as PointerEvent).pointerType === "touch") return;

      const at = local(event);

      openMenu(at.x, at.y);
    };

    // Escape: a drag goes back, the menu closes, the cross gives up, the selection is let go
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (drag) endDrag(false);
      else if (ix.arm) {
        ix.arm = false;
        setArm(false);
      } else if (SELECT.selected) {
        SELECT.selected = 0;
        camera.notify();
      }

      setMenu(null);
    };

    frameEl.addEventListener("contextmenu", onContext);
    window.addEventListener("keydown", onKey);
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

      window.clearTimeout(longPress);
      cancelAnimationFrame(glide);
      frameEl.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", onKey);
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
        cursor: arm ? "crosshair" : "grab",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label="Animated twin-turbo V12 engine with DOHC 48-valve heads, timing chains, intercoolers and a starter motor, turning in 3D"
        role="img"
        style={{ position: "absolute", inset: 0, display: "block", width: "100%", height: "100%" }}
      />

      {/* The start button and, under it, the joystick: on a phone (not a tablet) both drawn at half their size, every part of
          them in proportion, the lettering too, from the stage's top left corner (ak-dash, a box of no size of its own, so
          that only they themselves take the pointer) */}
      <style>{DASH_CSS}</style>
      <div className="ak-dash" style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, overflow: "visible" }}>
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
      </div>


      <ViewPanel onChange={notifyCamera} />

      <style>{SELECT_CSS}</style>
      <DetailWindow state={dock} boxRef={dockRef} onChange={notifyCamera} onClose={closeDock} />
      <div ref={ghostRef} className="ak-ghost" aria-hidden="true" />
      {menu && <ContextMenu at={menu} onSelect={chooseSelect} onClose={closeMenu} />}

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
