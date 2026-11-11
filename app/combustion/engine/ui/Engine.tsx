"use client";

// The engine component with its controls.

import { useEffect, useRef, useState } from "react";
import { FIRING_ORDER, TAU } from "../core/constants";
import { normalizeCycle } from "../core/numbers";
import { SCENE_OPTIONS } from "../core/options";
import { ST_TEETH } from "../mesh/starter";
import { CameraContext, createCameraController, VIEW_ORDER } from "../render/camera";
import type { CameraController, ViewName } from "../render/camera";
import { ClockContext, StartContext, createEngineClock, RPM_MAX } from "../sim/clock";
import type { EngineClock } from "../sim/clock";
import { STARTER, stMesh, starterPin } from "../sim/starter";
import { EngineStage } from "./EngineStage";
import { Dials } from "./Gauges";

/* =========================================================
   MAIN COMPONENT / CONTROLS
   ========================================================= */

const VIEW_LABELS: Record<ViewName, string> = {
  default: "3/4",
  side: "Side",
  front: "Chain end",
  rear: "Flywheel end",
  top: "Top",
  below: "Below",
  bottom: "Bottom",
  turbo: "Turbo",
  intercooler: "Intercooler",
  starter: "Starter",
};
const VIEW_BUTTONS: Array<[ViewName, string]> = VIEW_ORDER.map((name) => [name, VIEW_LABELS[name]]);

// ---- THE SLIDERS: metallic tracks, filled up to the knob, and for a knob an upright pedal, lit in the colour it is at. Speed fills in metallic green,
// metallic yellow from 66% of the top speed, and from 85% the air filters' brick red; Turn in metallic blue

const RANGE_CSS = `
.ak-range { -webkit-appearance: none; appearance: none; height: 8px; border-radius: 999px; outline: none; cursor: pointer;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.7), 0 1px 0 rgba(255, 255, 255, 0.06); }
/* the knob: a pedal, upright, as an accelerator's: brushed steel, ribbed across for the foot, its foot in the colour it is at */
.ak-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 13px; height: 24px; background:
    repeating-linear-gradient(180deg, rgba(0, 0, 0, 0.55) 0 1.5px, transparent 1.5px 4px) 3px 4px / calc(100% - 6px) calc(100% - 8px) no-repeat,
    linear-gradient(90deg, #4b5560 0%, #e9eef2 30%, #a8b5be 55%, #3a434b 100%);
  border: 1px solid #a8b5be; border-bottom: 3px solid var(--knob); border-radius: 3px 3px 4px 4px;
  box-shadow: 0 3px 5px rgba(0, 0, 0, 0.75), 0 0 7px var(--knob), inset 0 1px 0 rgba(255, 255, 255, 0.6); }
.ak-range::-moz-range-thumb { width: 13px; height: 24px; box-sizing: border-box; background:
    repeating-linear-gradient(180deg, rgba(0, 0, 0, 0.55) 0 1.5px, transparent 1.5px 4px) 3px 4px / calc(100% - 6px) calc(100% - 8px) no-repeat,
    linear-gradient(90deg, #4b5560 0%, #e9eef2 30%, #a8b5be 55%, #3a434b 100%);
  border: 1px solid #a8b5be; border-bottom: 3px solid var(--knob); border-radius: 3px 3px 4px 4px;
  box-shadow: 0 3px 5px rgba(0, 0, 0, 0.75), 0 0 7px var(--knob), inset 0 1px 0 rgba(255, 255, 255, 0.6); }
/* Turn's knob: a square, in its blue metal */
.ak-range.ak-turn::-webkit-slider-thumb { width: 16px; height: 16px; border-radius: 3px; border: 1px solid #a8b5be;
  background: linear-gradient(135deg, #e6f2ff 0%, var(--knob) 40%, #1d4f86 100%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.7), 0 0 7px var(--knob), inset 0 1px 0 rgba(255, 255, 255, 0.6); }
.ak-range.ak-turn::-moz-range-thumb { box-sizing: border-box; width: 16px; height: 16px; border-radius: 3px; border: 1px solid #a8b5be;
  background: linear-gradient(135deg, #e6f2ff 0%, var(--knob) 40%, #1d4f86 100%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.7), 0 0 7px var(--knob), inset 0 1px 0 rgba(255, 255, 255, 0.6); }
.ak-range:focus-visible { box-shadow: 0 0 0 2px rgba(102, 204, 255, 0.6); }
`;

const GREEN = "#5ee38c";
const YELLOW = "#ffdc3c";
const BRICK = "#ff4a32";
const BLUE = "#3d8fe0";
// a metal's sheen over a colour: light along the top, darker underneath
const SHEEN = "linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(0, 0, 0, 0.3) 100%)";
const EMPTY = "#1e262e";

type TrackStyle = { background: string; ["--knob"]: string };

function speedTrack(rpm: number): TrackStyle {
  const p = Math.max(0, Math.min(1, (rpm - 5) / (RPM_MAX - 5))) * 100;
  const knob = p >= 85 ? BRICK : p >= 66 ? YELLOW : GREEN;
  // the zones along the whole track, shown only up to the knob
  const zones = `linear-gradient(90deg, ${GREEN} 0%, ${GREEN} 64%, ${YELLOW} 68%, ${YELLOW} 83%, ${BRICK} 87%, ${BRICK} 100%)`;
  const rest = `linear-gradient(90deg, transparent 0%, transparent ${p}%, ${EMPTY} ${p}%, ${EMPTY} 100%)`;

  return { background: `${rest}, ${SHEEN}, ${zones}`, "--knob": knob };
}

function turnTrack(spin: number): TrackStyle {
  const p = ((spin + 40) / 80) * 100;
  const rest = `linear-gradient(90deg, transparent 0%, transparent ${p}%, ${EMPTY} ${p}%, ${EMPTY} 100%)`;

  return { background: `${rest}, ${SHEEN}, ${BLUE}`, "--knob": BLUE };
}

export default function Engine() {
  // One clock and one camera for the whole life of the component. Lazy state
  // initializers make them once, without reading a ref while rendering.
  const [clock] = useState<EngineClock>(() => createEngineClock());
  const [camera] = useState<CameraController>(() =>
    createCameraController({ auto: false, autoSpeed: 8 }) // the turntable is off until it is switched on
  );

  const [rpm, setRPM] = useState(5);
  const [paused, setPaused] = useState(false);
  const [engineOn, setEngineOn] = useState(false); // started, or running: the start button reads ENGINE STOP
  const [auto, setAuto] = useState(false);
  const [shown, setShown] = useState<ViewName | null>("default"); // the view the engine is seen from: its button is lit
  const [spin, setSpin] = useState(8);
  // Starts from the scene's own setting: it lives outside the component, so a
  // remount must not reset the button and leave the scene disagreeing with it
  const [air, setAir] = useState(() => SCENE_OPTIONS.airflow);
  const [names, setNames] = useState(() => SCENE_OPTIONS.labels);
  const [see, setSee] = useState(() => SCENE_OPTIONS.seeThrough);

  // The firing order, as a row of cylinder numbers under the stage: the one that fired last is lit, and fades
  const chipRefs = useRef<Array<HTMLSpanElement | null>>([]);
  // the firing order's width: the hints above it take the same, so that both start at the same place
  const firingRef = useRef<HTMLDivElement | null>(null);
  const [firingWidth, setFiringWidth] = useState(0);

  useEffect(() => {
    const el = firingRef.current;

    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => setFiringWidth(Math.round(el.getBoundingClientRect().width)));

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  // The view buttons follow the camera: the one of the view shown is lit, from a button, a double click or not at all
  // (a drag, the turntable); a view chosen by a double click stops the turntable, as a button does
  useEffect(
    () =>
      camera.onShownView((name) => {
        setShown(name);
        if (name) setAuto(false);
      }),
    [camera]
  );

  useEffect(() => {
    return clock.subscribe((frame) => {
      for (let k = 0; k < FIRING_ORDER.length; k++) {
        const chip = chipRefs.current[k];

        if (!chip) continue;

        const f = FIRING_ORDER[k];
        const p = normalizeCycle(frame.t + f.cyl.bank.phase[f.cyl.k]);
        const since = (p - 0.5 + 1) % 1; // the share of the cycle since this cylinder fired
        const lit = Math.exp(-since * 16);
        const [r, g, b] = f.bank === 0 ? [82, 182, 255] : [255, 122, 60];

        chip.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${(0.1 + 0.8 * lit).toFixed(3)})`;
        chip.style.boxShadow = lit > 0.08 ? `0 0 ${(12 * lit).toFixed(1)}px rgba(${r}, ${g}, ${b}, ${(0.9 * lit).toFixed(3)})` : "none";
      }
    });
  }, []);

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let last = 0;

    const resetTimestamp = () => {
      clock.resetTimestamp();
      last = 0;
    };

    const loop = (now: number) => {
      if (disposed) return;

      if (document.hidden) {
        clock.resetTimestamp();
        last = 0;
      } else {
        const dt = last > 0 ? Math.min(0.1, (now - last) / 1000) : 0;

        last = now;

        // The camera first, so that the frame the clock publishes is drawn
        // from where the camera is now
        const moved = camera.update(dt);
        const published = clock.tick(now);

        // The engine stands still (paused), but the view still turns
        if (moved && !published) camera.notify();
      }

      raf = requestAnimationFrame(loop);
    };

    document.addEventListener("visibilitychange", resetTimestamp);
    window.addEventListener("pageshow", resetTimestamp);

    clock.resetTimestamp();
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);

      document.removeEventListener("visibilitychange", resetTimestamp);
      window.removeEventListener("pageshow", resetTimestamp);
      clock.resetTimestamp();
    };
  }, [clock, camera]);

  // The page begins with the engine at rest: cold, empty of gas, its fuel and spark off, until it is started
  useEffect(() => {
    STARTER.fuel = false;
    STARTER.spark = false;
    clock.shutDown();
    camera.notify();
  }, [clock, camera]);

  // Pause freezes everything where it is; Play lets it go on
  const togglePause = () => {
    const next = !paused;

    clock.setPaused(next);
    setPaused(next);
  };

  const changeSpeed = (value: number) => {
    if (!Number.isFinite(value)) return;

    clock.setRPM(value);
    setRPM(value);
  };

  // The start: the engine is stopped; the starter's solenoid pulls the fork, which pushes the pinion into the ring gear; the motor cranks the
  // engine; the fuel comes, then the spark, and the engine runs on its own; the clutch lets the pinion run free, and the fork draws it back
  const startRef = useRef(0);
  const [starting, setStarting] = useState(false);

  const endStart = () => {
    cancelAnimationFrame(startRef.current);
    startRef.current = 0;
    STARTER.pull = 0;
    STARTER.locked = false;
    STARTER.driven = false;
    setStarting(false);
    camera.notify();
  };

  // The stop: the fuel and the spark are cut; the engine coasts down and pushes the last of its gas out, and the
  // turbochargers run down
  const stopEngine = () => {
    if (startRef.current) endStart();

    STARTER.fuel = false;
    STARTER.spark = false;
    clock.setRunning(false);
    setEngineOn(false);
    changeSpeed(5); // the speed slider back to its least (the engine itself runs down as it does)
  };

  useEffect(() => () => cancelAnimationFrame(startRef.current), []);

  const startEngine = () => {
    if (startRef.current) return;

    const runRpm = Math.max(rpm, 40);
    const crankRpm = 30;
    const pitch = TAU / ST_TEETH;
    const ease = (u: number) => u * u * (3 - 2 * u);

    // How long each step takes, seconds
    const ALIGN = 0.45; // the pinion turns its teeth to the ring gear's spaces
    const PULL = 0.4; // the solenoid pulls, the fork throws the pinion into the ring gear
    const FUEL_AT = 0.5; // cranking: the fuel comes this long after the motor starts to turn the engine
    const CATCH_AT = 1.5; // and the spark; the engine fires and catches
    const OVERRUN = 0.12; // the engine drives the pinion faster than the motor, through the free-wheeling clutch
    const RETRACT = 0.22; // the solenoid lets go, the spring draws the pinion back out of the teeth

    STARTER.spark = false;
    STARTER.fuel = false;
    STARTER.driven = false;
    clock.setRunning(false);
    clock.setPaused(false);

    // The gas is shown moving through the engine from the first turn of the starter: the airflow comes on with the start
    // (the page itself opens with it off, and it can still be switched off)
    SCENE_OPTIONS.airflow = true;
    setAir(true);
    setPaused(false);
    setEngineOn(true);
    setStarting(true);

    let step = 0;
    let t0 = performance.now();
    let last = t0;
    let pin0 = 0;
    let delta = 0;
    let omegaPin = 0;
    let omegaArm = 0;
    let prev = starterPin();

    const go = (n: number, now: number) => {
      step = n;
      t0 = now;
    };

    const tick = (now: number) => {
      const dt = Math.max(0.001, Math.min(0.05, (now - last) / 1000));
      const t = (now - t0) / 1000;

      last = now;

      const here = starterPin();

      if (STARTER.locked) omegaPin += ((here - prev) / dt - omegaPin) * 0.4;

      prev = here;

      if (step === 0) {
        // the engine comes to rest
        if (clock.currentRPM < 0.3 || t > 4) {
          clock.halt();
          pin0 = STARTER.pinFree;

          const x = stMesh(STARTER.Fcont) - pin0;

          delta = x - pitch * Math.round(x / pitch);
          STARTER.armFree = pin0;
          go(1, now);
        }
      } else if (step === 1) {
        STARTER.pinFree = pin0 + delta * ease(Math.min(1, t / ALIGN));
        STARTER.armFree = STARTER.pinFree;

        if (t >= ALIGN) go(2, now);
      } else if (step === 2) {
        const u = Math.min(1, t / PULL);

        STARTER.pull = 1 - Math.pow(1 - u, 2.2);

        if (!STARTER.locked && STARTER.pull >= 0.25) {
          STARTER.locked = true;
          STARTER.C = Math.round((STARTER.pinFree - stMesh(STARTER.Fcont)) / pitch) * pitch;
        }

        if (u >= 1) {
          // the main contacts close: the motor turns, and takes the engine up to cranking speed gradually
          STARTER.pull = 1;
          STARTER.driven = true;
          clock.setRPM(crankRpm);
          clock.setRunning(true);
          go(3, now);
        }
      } else if (step === 3) {
        if (t > FUEL_AT) STARTER.fuel = true;

        if (t >= CATCH_AT) {
          // it fires: from here the engine pulls itself up to its speed, slowly
          STARTER.spark = true;
          clock.setRPM(runRpm);
          setRPM(runRpm);
          STARTER.driven = false;
          STARTER.armFree = starterPin();
          omegaArm = omegaPin;
          go(4, now);
        }
      } else if (step === 4) {
        STARTER.armFree += omegaArm * dt;
        omegaArm *= Math.exp(-dt / 0.45);

        if (t >= OVERRUN) go(5, now);
      } else {
        STARTER.armFree += omegaArm * dt;
        omegaArm *= Math.exp(-dt / 0.3);

        const u = Math.min(1, t / RETRACT);

        STARTER.pull = 1 - ease(u);

        if (STARTER.locked && STARTER.pull <= 0.25) {
          STARTER.pinFree = starterPin();
          STARTER.locked = false;
        }

        if (!STARTER.locked) {
          STARTER.pinFree += omegaPin * dt;
          omegaPin *= Math.exp(-dt / 0.25);
        }

        if (u >= 1 && !STARTER.locked && Math.abs(omegaPin) < 0.05 && Math.abs(omegaArm) < 0.05) {
          endStart();

          return;
        }
      }

      camera.notify();
      startRef.current = requestAnimationFrame(tick);
    };

    startRef.current = requestAnimationFrame(tick);
  };

  const toggleEngine = () => (engineOn ? stopEngine() : startEngine());

  const toggleAuto = () => {
    const next = !auto;

    camera.setAuto(next);
    setAuto(next);
  };

  const toggleAir = () => {
    const next = !air;

    SCENE_OPTIONS.airflow = next;
    setAir(next);
    camera.notify(); // draw again, also when the engine is paused
  };

  // The engine see-through, as it is drawn to show its workings, or solid, a plain engine
  const toggleSee = () => {
    const next = !see;

    SCENE_OPTIONS.seeThrough = next;
    setSee(next);
    camera.notify();
  };

  // The names of the components, all of them or none
  const toggleNames = () => {
    const next = !names;

    SCENE_OPTIONS.labels = next;
    setNames(next);
    camera.notify();
  };

  const changeSpin = (value: number) => {
    if (!Number.isFinite(value)) return;

    camera.setAutoSpeed(value);
    setSpin(value);
  };

  const showView = (name: ViewName) => {
    // Looking at one side stops the turntable
    camera.setAuto(false);
    setAuto(false);
    camera.setView(name);
  };

  return (
    <ClockContext.Provider value={clock}>
      <CameraContext.Provider value={camera}>
        {/* The whole engine fits the window: 99% of its width, 99% of its height; the stage takes what the controls leave */}
        <div
          className="mx-auto rounded-2xl bg-black p-4 shadow-2xl ring-1 ring-white/10"
          style={{ width: "99vw", height: "99vh", display: "flex", flexDirection: "column" }}
        >
          <StartContext.Provider value={{ toggle: toggleEngine, on: engineOn, starting }}>
            <EngineStage />
          </StartContext.Provider>

          <style>{RANGE_CSS}</style>

          {/* The controls, in groups. First line: the two sliders on the left, and the dials in the middle of the page: three
              columns, the outer two of equal share, so that the middle dial's centre is on the page's middle */}
          <div
            className="mt-4 grid items-center gap-x-4 gap-y-2"
            style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", alignItems: "center", columnGap: 16 }}
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 16 }}>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <span>Speed</span>

              <input
                type="range"
                min={5}
                max={RPM_MAX}
                step={5}
                value={rpm}
                onChange={(event) => changeSpeed(Number(event.target.value))}
                className="ak-range w-32"
                style={speedTrack(rpm)}
              />

              <span className="w-16 tabular-nums text-slate-200">{rpm} rpm</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <span>Turn</span>

              <input
                type="range"
                min={-40}
                max={40}
                step={1}
                value={spin}
                onChange={(event) => changeSpin(Number(event.target.value))}
                className="ak-range ak-turn w-24"
                style={turnTrack(spin)}
              />

              <span className="w-14 tabular-nums text-slate-200">{spin}°/s</span>
            </label>

            </div>

            <Dials size="clamp(83px, 6.9vw, 112px)" room="clamp(72px, 6vw, 97px)" />

            {/* the hints, on the right: as wide as the firing order below, so that they start where it does */}
            <div
              className="text-slate-500"
              style={{
                justifySelf: "end",
                width: firingWidth || undefined,
                maxWidth: "100%", // never over the dials: narrower then, and it wraps
                fontSize: "clamp(9px, 1vw, 11px)",
                color: "#64748b",
                lineHeight: 1.3,
              }}
            >
              Drag to turn the engine, over it or under it · wheel to zoom · double-click for the next view
              <div style={{ marginTop: 5 }}>Crank : cam = 2 : 1 · One shared animation clock</div>
            </div>

          </div>

          {/* Then: play and reset with the switches right after them on one line, the views under them; the switches stretch
              so that Transparent ends where Starter does. The firing order and the legend are on their right */}
          <div className="mt-3 flex flex-wrap items-stretch gap-x-6 gap-y-2">
          <div className="inline-flex flex-col items-stretch justify-between gap-2" style={{ justifyContent: "space-between" }}>
            <div className="flex items-center gap-2" style={{ display: "flex", gap: 8 }}>
              <div className="flex items-center gap-1 rounded-lg bg-slate-900 p-1 ring-1 ring-white/10">
                <button
                  type="button"
                  onClick={togglePause}
                  aria-pressed={paused}
                  className="rounded-md bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-500"
                >
                  {paused ? "▶ Play" : "⏸ Pause"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // a start that is under way is broken off: the engine is left stopped
                    if (startRef.current) stopEngine();

                    clock.reset();
                  }}
                  className="rounded-md bg-slate-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-500"
                >
                  ↺ Reset
                </button>
              </div>

              <div
                role="group"
                aria-label="Options"
                className="flex flex-1 items-center gap-1 rounded-lg bg-slate-900 p-1 ring-1 ring-white/10"
                style={{ flex: 1 }}
              >
                <span className="px-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Options</span>

                <button
                  type="button"
                  onClick={toggleAuto}
                  aria-pressed={auto}
                  className={`flex-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold text-white ${
                    auto ? "bg-emerald-600 hover:bg-emerald-500" : "bg-slate-700 hover:bg-slate-600"
                  }`}
                >
                  {auto ? "⟳ Turntable on" : "⟳ Turntable off"}
                </button>

                <button
                  type="button"
                  onClick={toggleAir}
                  aria-pressed={air}
                  className={`flex-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold text-white ${
                    air ? "bg-sky-600 hover:bg-sky-500" : "bg-slate-700 hover:bg-slate-600"
                  }`}
                >
                  {air ? "≋ Airflow on" : "≋ Airflow off"}
                </button>

                <button
                  type="button"
                  onClick={toggleNames}
                  aria-pressed={names}
                  className={`flex-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold text-white ${
                    names ? "bg-violet-600 hover:bg-violet-500" : "bg-slate-700 hover:bg-slate-600"
                  }`}
                >
                  {names ? "Aa Labels on" : "Aa Labels off"}
                </button>

                <button
                  type="button"
                  onClick={toggleSee}
                  aria-pressed={see}
                  className={`flex-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold text-white ${
                    see ? "bg-teal-600 hover:bg-teal-500" : "bg-slate-700 hover:bg-slate-600"
                  }`}
                >
                  {see ? "◐ Transparent" : "● Opaque"}
                </button>
              </div>
            </div>

            <div
              role="group"
              aria-label="View"
              className="flex flex-wrap items-center gap-1 self-start rounded-lg bg-slate-900 p-1 ring-1 ring-white/10"
            >
              <span className="px-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">View</span>

              {VIEW_BUTTONS.map(([name, label]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => showView(name)}
                  aria-pressed={shown === name}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold text-white ${
                    shown === name ? "bg-sky-600 ring-1 ring-sky-300/60 hover:bg-sky-500" : "bg-slate-700 hover:bg-slate-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

            {/* On the right, against the stage's edge: the firing order on the switches' line, the legend at the bottom, level with the views.
                The cylinders' numbers in the order they fire, each with the crank angle (of 720) it fires at; A's in blue,
                B's in orange; the last to fire is lit */}
            <div className="ml-auto flex flex-col items-end justify-between gap-2" style={{ marginLeft: "auto", justifyContent: "space-between" }}>
  <div
                ref={firingRef}
                role="group"
                aria-label="Firing order"
                className="flex flex-wrap items-center justify-end gap-1 rounded-lg bg-slate-900 p-1 ring-1 ring-white/10"
              >
                <span className="px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Firing order</span>

                {FIRING_ORDER.map((f, k) => (
                  <span
                    key={f.no}
                    ref={(el) => {
                      chipRefs.current[k] = el;
                    }}
                    className="flex flex-col items-center rounded-md px-1.5 py-0.5"
                    style={{ minWidth: 40, backgroundColor: "rgba(51, 65, 85, 0.45)" }}
                  >
                    <span className="text-sm font-bold leading-4 text-white">{f.no}</span>
                    <span className="text-[9px] leading-3 tabular-nums" style={{ color: f.bank === 0 ? "#52B6FF" : "#FF8A4C" }}>
                      {f.deg}°
                    </span>
                  </span>
                ))}
              </div>
                <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-xs" style={{ minHeight: 34 }}>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Legend:</span>
                  <Legend color="#12A5FF" label="Intake" />
                  <Legend color="#FFB800" label="Compression" />
                  <Legend color="#FF5A00" label="Power" />
                  <Legend color="#EAF2FF" label="Exhaust" />
                  <Legend color="#D3CDCD" label="Crank" />
                  {/* These two only while the airflow is on: the legend grows to the left, its right edge stays on the stage's */}
                  {air && <Legend color="#52B6FF" label="Cold intake air" />}
                  {air && <Legend color="#FF4A0A" label="Hot exhaust gas" />}
                </div>
            </div>
          </div>

        </div>
      </CameraContext.Provider>
    </ClockContext.Provider>
  );
}

// An entry of the legend. `hidden` makes it invisible, but it keeps its place, so that showing it or hiding it
// moves nothing else on the page.
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 text-slate-300">
      <span
        className="inline-block h-3 w-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
