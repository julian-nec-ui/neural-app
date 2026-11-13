// The shared engine clock: one frame for every subscriber, no React state during animation.

import { createContext, useContext } from "react";
import { TAU } from "../core/constants";
import { normalizeCycle } from "../core/numbers";
import { TURBO_MAX_OMEGA } from "../mesh/turbo";
import { STARTER } from "./starter";

/* =========================================================
   SHARED SIMULATION CLOCK

   IMPORTANT:
   No React state updates occur during animation.
   All subscribers receive the same pose in the same RAF.
   ========================================================= */

// The fastest the engine turns, rpm: the speed slider's and the tachometer's top
export const RPM_MAX = 6500;

// How fast the engine is shown turning, against the speed it reads: as it really is, one to one (the pistons' cadence,
// the cylinders' firing and the flywheel's turns all at the speed the tachometer reads)
const VISUAL_SPEED = 1;

// The air's temperature, °F: the engine's, cold
export const AMBIENT_F = 68;
// The hottest it runs, °F: its cooling holds it there
export const TEMP_MAX_F = 220;
// How fast it warms, °F a second: 0.4 cold, rising with the heat (about 2.4 at 200 °F); from 68 to 200 in some 118 s
const WARM_RATE = (tempF: number) => 0.4 + (2 * Math.max(0, tempF - AMBIENT_F)) / 132;

export type EngineFrame = {
  t: number;
  crankAngle: number;
  camAngle: number;
  step: number; // how far the cycle moved since the previous frame (for motion blur)
  rpm: number; // how fast the crank really turns, rpm
  dialRpm: number; // what the tachometer shows: the speed asked for as soon as it is asked, while the engine fires
  turboSpeed: number; // 0..1, how fast the turbocharger spins (it lags the engine)
  turboDial: number; // 0..1, the turbocharger's speed as the engine's calls for it, at once (the boost dial follows it)
  engineOn: boolean; // the engine is running (from the starter on): the thermometer works
  tempF: number; // the engine's temperature, °F: warming slowly as it runs, harder the faster, cooling slowly when it stops
  turboAngle: number; // its shaft's angle, radians
  turboStep: number; // how far it turned since the previous frame (for motion blur)
  fanAngle: number; // the intercooler's fans' angle, radians: they run while the engine does
  fanStep: number; // how far they turned since the previous frame (for motion blur)
  gasT: number; // where the gas is along its way through the engine, 0..1 a cycle: it goes with the crank, and on its own
  gasStep?: number; // how far gasT went this frame (for the motion blur's sub-frames)
  // as the engine is emptied after it has stopped, so that the last of the gas is seen to leave
};

type FrameSubscriber = (frame: EngineFrame) => void;

// How full of gas the engine is, 0..1: the intake side (air), and the exhaust side (burnt gas, and the turbines' heat).
// Running, both are full; while the starter cranks, the intake fills and only a little air is pushed out; once the fuel
// and the spark are cut, the engine coasts down and empties itself, the exhaust last. The effects are drawn this full.
// Outside the page's clock (stills, the reference check) it stays full.
export const ENGINE_GAS = { intake: 1, exhaust: 1 };

// How long each side takes to fill and to empty, seconds
const GAS_TAU = { fill: 0.6, purgeIntake: 0.8, purgeExhaust: 1.2 };

// How the engine's speed follows what it is asked for, seconds: cranked by the starter, under its own power
const SPEED_TAU = { cranking: 0.45, rising: 0.15, falling: 0.12 }; // seconds: with the slider almost at once, up or down

// Revving up, the engine gains speed no faster than this, rpm a second: quick, as a light engine on the throttle (from
// idle to 6500 rpm in about half a second), yet not in a single jump
const REV_RATE = (rpm: number) => 8000 + 1.5 * rpm;

// Stopped, the engine runs down to rest in this long, seconds, by the speed it had: 2.5 s from idle, 3 s from the top
// speed. It loses its speed by the same share every moment (as friction and compression brake a real one), so that the
// slow turns at the end, where the pistons can be seen, take their time too: it creeps to rest, never stops short
const COAST_TIME = (rpm: number) => 2.5 + 0.5 * Math.min(1, rpm / RPM_MAX);
const COAST_DECAY = 5; // how many e-folds over that time

// While the engine is emptied, the gas goes on along its way at least this fast, in cycles a second, even when the crank
// has stopped: it is pushed out, through the turbos and the tails
const PURGE_RATE = 0.45;

// The intercooler's fans turn with the engine: a gentle `idle` speed (turns a second) as soon as it runs, and on top of it
// a speed in proportion to the engine's, `gain` more turns a second for every 3000 rpm; `rise`, `follow` and `fall` are how
// long they take to follow it up, down, and to run down freely once the engine has stopped (seconds)
const FAN = { idle: 0.45, gain: 3.0, rise: 0.6, follow: 0.6, fall: 2.4 };
const fanSpeedFor = (rpm: number) => FAN.idle + (FAN.gain * Math.min(rpm, 3000)) / 3000;

export function createFrame(t: number): EngineFrame {
  const crankAngle = t * 720;
  const camAngle = t * 360;

  return { t, crankAngle, camAngle, step: 0, rpm: 0, dialRpm: 0, turboSpeed: 0, turboDial: 0, engineOn: false, tempF: AMBIENT_F, turboAngle: 0, turboStep: 0, fanAngle: 0, fanStep: 0, gasT: t };
}

const INITIAL_FRAME = createFrame(0);

export function createEngineClock() {
  const subscribers = new Set<FrameSubscriber>();

  let frame = INITIAL_FRAME;
  let phase = 0;
  let rpm = 5; // the speed asked for
  let dialRpm = 0; // the tachometer's reading
  let currentRpm = 5; // the speed the engine really has: it eases toward `rpm`
  let smoothDt = 0;
  let running = true; // the crank is driven: by the starter, or by the engine's own power
  let paused = false; // the animation is frozen where it is
  let previousTime: number | null = null;
  let turboSpeed = 0;
  let tempF = AMBIENT_F; // the engine's temperature
  let coastFrom = 0; // the speed it had when it was stopped
  let coastAge = 0; // and how long ago that was, seconds
  let wantedTurbo = 0; // where the turbocharger's speed is going: the dials show it, in step with the engine
  let turboAngle = 0;
  let gasPhase = 0;
  const GAS_VIS_MAX = 1.3; // the gas's drawn pace, at most, in cycles a second
  let fanSpeed = 0;
  let fanAngle = 0;

  const publish = () => {
    for (const subscriber of subscribers) {
      subscriber(frame);
    }
  };

  return {
    get frame() {
      return frame;
    },

    get running() {
      return running;
    },

    get currentRPM() {
      return currentRpm;
    },

    get paused() {
      return paused;
    },

    halt() {
      currentRpm = 0;
      running = false;
      previousTime = null;
    },

    // The engine at rest, cold and empty, the turbines still: how the page begins
    shutDown() {
      currentRpm = 0;
      running = false;
      turboSpeed = 0;
      wantedTurbo = 0;
      dialRpm = 0;
      tempF = AMBIENT_F; // cold
      fanSpeed = 0;
      ENGINE_GAS.intake = 0;
      ENGINE_GAS.exhaust = 0;
      frame = { ...frame, step: 0, rpm: 0, dialRpm: 0, turboSpeed: 0, turboDial: 0, engineOn: false, tempF, turboStep: 0 };
      previousTime = null;
      publish();
    },

    setPaused(value: boolean) {
      paused = value;
      previousTime = null;
    },

    subscribe(subscriber: FrameSubscriber) {
      subscribers.add(subscriber);
      subscriber(frame);

      return () => {
        subscribers.delete(subscriber);
      };
    },

    setRPM(value: number) {
      if (Number.isFinite(value)) {
        rpm = Math.max(0, value);
      }
    },

    setRunning(value: boolean) {
      // stopped, it is taken as cold again: started anew, it warms up from the air's temperature, slowly
      if (!value && running) {
        tempF = AMBIENT_F;
        coastFrom = currentRpm; // and it runs down from this speed, in COAST_TIME
        coastAge = 0;
      }
      running = value;
      previousTime = null;
    },

    resetTimestamp() {
      previousTime = null;
    },

    reset() {
      phase = 0;
      gasPhase = 0;
      previousTime = null;
      turboSpeed = 0;
      wantedTurbo = 0;
      dialRpm = 0;
      turboAngle = 0;
      frame = INITIAL_FRAME;
      publish();
    },

    tick(now: number) {
      const previous = previousTime;
      previousTime = now;

      if (previous === null) return false;

      const raw = Math.max(0, (now - previous) / 1000);

      // Treat a major stall as a pause, not a large jump.
      if (raw <= 0 || raw > 0.25) return false;

      // A light low-pass on the frame time: uneven timestamps would
      // otherwise show up as judder in the motion
      smoothDt = smoothDt === 0 ? raw : smoothDt + (raw - smoothDt) * 0.2;

      if (paused) return false;

      // What drives the crank: the engine fires when it is driven and has its fuel and its spark; driven without them,
      // the starter is cranking it; not driven, it coasts
      const firing = running && STARTER.fuel && STARTER.spark;
      const cranking = running && !firing;

      // Engine inertia: the speed eases toward the target, so starting, stopping and moving the slider feel natural
      if (running) {
        const tau = cranking ? SPEED_TAU.cranking : rpm > currentRpm ? SPEED_TAU.rising : SPEED_TAU.falling;

        let d = (rpm - currentRpm) * (1 - Math.exp(-smoothDt / tau));

        if (!cranking && d > 0) d = Math.min(d, REV_RATE(currentRpm) * smoothDt);

        currentRpm += d;

        if (Math.abs(rpm - currentRpm) < 0.01) currentRpm = rpm;
      } else {
        coastAge += smoothDt;

        const k = Math.min(1, coastAge / COAST_TIME(coastFrom));

        // falling by its share (exponentially), less a little that grows to bring it to nought exactly at the end
        const tail = Math.exp(-COAST_DECAY);

        currentRpm = Math.min(currentRpm, Math.max(0, coastFrom * (Math.exp(-COAST_DECAY * k) - tail * k)));
      }

      // The gas: filled by the running engine, pushed out as it coasts
      const ease = (value: number, target: number, tau: number) => value + (target - value) * (1 - Math.exp(-smoothDt / tau));
      // (coasting, the engine still pumps air while it turns: the intake empties only as it comes to rest)
      const intakeTarget = running ? 1 : Math.min(1, currentRpm / 25);
      const exhaustTarget = firing ? 1 : cranking ? 0.35 : 0;

      ENGINE_GAS.intake = ease(ENGINE_GAS.intake, intakeTarget, intakeTarget > ENGINE_GAS.intake ? GAS_TAU.fill : GAS_TAU.purgeIntake);
      ENGINE_GAS.exhaust = ease(ENGINE_GAS.exhaust, exhaustTarget, exhaustTarget > ENGINE_GAS.exhaust ? GAS_TAU.fill : GAS_TAU.purgeExhaust);

      // The turbocharger: driven by the exhaust, so its speed follows the engine's, but late: it spools up slowly and
      // winds down more slowly; with no exhaust it only runs down
      const wanted = firing ? Math.pow(Math.min(1, currentRpm / RPM_MAX), 0.45) : 0;

      // The dials answer at once: firing, the tachometer goes to the speed asked for (with only a few hundredths of a
      // second's easing, so that it swings rather than jumps), and the turbocharger's and the boost with it; otherwise it
      // reads the crank's own speed, as it cranks or coasts
      const dialTarget = firing ? rpm : currentRpm;

      dialRpm += (dialTarget - dialRpm) * (1 - Math.exp(-smoothDt / 0.05));
      wantedTurbo = firing ? Math.pow(Math.min(1, dialRpm / RPM_MAX), 0.45) : 0;
      // The engine's heat: firing, it warms toward its working temperature, slowly while cold and faster as the heat
      // builds (WARM_RATE): from the air's to 200 °F in about two minutes at idle; revved, the harder the faster, up to
      // four times as fast at the top speed (half a minute) as its cooling holds it: 200 °F at idle, 220 at most at the top speed, and there it stays. Stopped, it
      // cools back toward the air's (and is taken as cold once stopped: see setRunning)
      const hot = firing ? 200 + (TEMP_MAX_F - 200) * Math.pow(Math.min(1, currentRpm / RPM_MAX), 1.3) : cranking ? tempF : AMBIENT_F;

      if (hot > tempF) tempF = Math.min(hot, tempF + WARM_RATE(tempF) * (1 + 3 * Math.min(1, currentRpm / RPM_MAX)) * smoothDt);
      else tempF += (hot - tempF) * (1 - Math.exp(-smoothDt / 20));
      const lag = wanted > turboSpeed ? 0.9 : 1.6;

      turboSpeed += (wanted - turboSpeed) * (1 - Math.exp(-smoothDt / lag));

      if (turboSpeed < 1e-3 && wanted === 0) turboSpeed = 0;

      // the fans: on with the engine, then running down
      const fanWanted = running ? fanSpeedFor(currentRpm) : 0;

      const fanTau = fanWanted > fanSpeed ? FAN.rise : running ? FAN.follow : FAN.fall;

      fanSpeed += (fanWanted - fanSpeed) * (1 - Math.exp(-smoothDt / fanTau));

      if (fanWanted === 0 && fanSpeed < 0.005) fanSpeed = 0;

      const fanTurn = fanSpeed * TAU * smoothDt;

      fanAngle = (fanAngle + fanTurn) % TAU;

      const settled =
        turboSpeed === 0 &&
        Math.abs(tempF - AMBIENT_F) < 0.5 &&
        fanSpeed === 0 && Math.abs(ENGINE_GAS.intake - intakeTarget) < 1e-3 && Math.abs(ENGINE_GAS.exhaust - exhaustTarget) < 1e-3;

      // Standing still, empty, the turbines stopped: nothing moves, nothing to publish
      if (currentRpm <= 0 && settled) {
        ENGINE_GAS.intake = intakeTarget;
        ENGINE_GAS.exhaust = exhaustTarget;

        return false;
      }

      // One four-stroke cycle = two crank revolutions, at the real speed (VISUAL_SPEED is 1)
      const step = smoothDt * (currentRpm / 120) * VISUAL_SPEED;

      phase = normalizeCycle(phase + step);

      // the gas goes with the crank; emptying, it goes on at least at the purge's pace
      const purging = !running && (ENGINE_GAS.intake > 0.005 || ENGINE_GAS.exhaust > 0.005);

      // (the gas's pattern is drawn moving at a pace the eye can follow: it rises with the speed but levels off, never
      // faster than GAS_VIS_MAX cycles a second; at the engine's own pace it would step, frame to frame, past whole
      // stretches of its pattern and strobe, and flicker as the engine picks up through those speeds)
      const rate = (currentRpm / 120) * VISUAL_SPEED;
      const visStep = smoothDt * GAS_VIS_MAX * (1 - Math.exp(-rate / GAS_VIS_MAX));

      const gasStep = purging ? Math.max(visStep, smoothDt * PURGE_RATE) : visStep;

      gasPhase = normalizeCycle(gasPhase + gasStep);

      frame = createFrame(phase);
      frame.step = step;
      frame.rpm = step > 0 ? currentRpm : 0;
      frame.dialRpm = dialRpm;
      frame.gasT = gasPhase;
      frame.gasStep = gasStep;
      frame.fanAngle = fanAngle;
      frame.fanStep = fanTurn;

      const turn = turboSpeed * TURBO_MAX_OMEGA * smoothDt;

      turboAngle = (turboAngle + turn) % TAU;
      frame.turboSpeed = turboSpeed;
      frame.turboDial = wantedTurbo;
      frame.tempF = tempF;
      frame.engineOn = running;
      frame.turboAngle = turboAngle;
      frame.turboStep = turn;
      publish();

      return true; // a new frame was published
    },
  };
}

export type EngineClock = ReturnType<typeof createEngineClock>;

export const ClockContext = createContext<EngineClock | null>(null);
// The start button: the engine is on (it is starting or running) or off; pressing it starts or stops it
// `caught`: the engine has fired its first few cylinders and runs on its own (the start button turns green), though the
// starter may still be letting go
export const StartContext = createContext<{ toggle: () => void; on: boolean; starting: boolean; caught?: boolean }>({ toggle: () => {}, on: false, starting: false, caught: false });

export function useEngineClock(): EngineClock {
  const clock = useContext(ClockContext);

  if (!clock) {
    throw new Error("Engine animation requires ClockContext.");
  }

  return clock;
}
