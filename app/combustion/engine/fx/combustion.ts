// The charge, flame, spark and fuel spray in each cylinder.

import { BORE_R as BORE_R_OIL, BURN_END, CYLS, LINER_H as LINER_H_OIL, ELECTRODE_TIP_Y, INJ, PLUG, SPARK_END, SPARK_START, TAU, pseudoRandom, BANKS, DRIVE_DX } from "../core/constants";
import type { Bank } from "../core/constants";
import { normalizeCycle } from "../core/numbers";
import { SCENE_OPTIONS } from "../core/options";
import { getSmoothGasRgb } from "../core/strokes";
import { FOG_STATE, pushAirflow } from "./airflow/update";
import { GLOW, addPoint, createPointBuf } from "./points";
import { STREAKS } from "./airflow/streaks";
import type { FwVec3 } from "../mesh/builder";
import { OIL_PATHS } from "../mesh/drySump";
import { curveAt } from "../mesh/tubes";
import { VT } from "../mesh/valvetrain";
import { CAM_RC, IDLER_Y, PRIMARY, SECONDARY, VT_RC, primaryDx } from "../mesh/timingChain/chainPath";
import { cross3, normalize3 } from "../math/vec3";
import { crankPin } from "../scene/commands";
import { ENGINE_GAS } from "../sim/clock";
import type { EngineFrame } from "../sim/clock";
import { STARTER } from "../sim/starter";

/* =========================================================
   EFFECTS: gas, flame, spark and fuel spray

   Per cylinder and per frame: the colour and extent of the charge, the flame
   (a sphere about the spark, growing until the walls stop it), the spark, and
   the fuel spray as sprites. All of it is in the scene, in world coordinates,
   so it turns with the engine.
   ========================================================= */

const OIL_SPLASH = 10; // drops thrown off each big end at a time
const OIL_DRIPS = 3; // and dripping from each bore's foot
const OIL_FLOW_MAX = 2400; // the oil moving through the dry sump's lines, pumps and tanks
const OIL_CHAIN_MAX = 2200; // the oil on the timing drives: the film on the chains, the jets, the drops
const OIL_GAP = 4; // the gap between two blobs of it along a line: close, so that they run together
const OIL_SPEED = 160; // how fast it moves, units a second, with the engine running

export const MIST = createPointBuf(4 * 140); // fuel droplets and vapour: they dim what is behind them
export const OIL = createPointBuf(CYLS.length * (OIL_SPLASH + OIL_DRIPS) + OIL_FLOW_MAX + OIL_CHAIN_MAX); // drops of oil: off the crank, and from the bores' feet

// The oil's own clock, seconds: the drips run down the walls and the drops fall in real time. It stands still where
// there is no page clock (stills, the reference check)
export const OIL_CLOCK = { t: 0, last: -1, flow: 0, dt: 0 };

function tickOilClock() {
  const now = typeof performance !== "undefined" ? performance.now() / 1000 : 0;

  OIL_CLOCK.dt = OIL_CLOCK.last >= 0 ? Math.min(0.1, Math.max(0, now - OIL_CLOCK.last)) : 0;
  OIL_CLOCK.t += OIL_CLOCK.dt;

  OIL_CLOCK.last = now;
}

type CylinderFx = {
  gas: [number, number, number];
  top: number;
  bottom: number;
  flameC: FwVec3;
  flameR: number;
  flameK: number;
  glow: number;
  density: number; // how full of gas the bore is, 0..1: empty when the engine has stopped and been purged
};

export const CYLINDER_FX: CylinderFx[] = CYLS.map(() => ({
  gas: [0, 0, 0],
  top: 0,
  bottom: 0,
  flameC: [0, 0, 0],
  flameR: 0,
  flameK: 0,
  glow: 0,
  density: 1,
}));

/* ---- fuel spray ---- */

const SPRAY = {
  start: 0.045, // cycle fraction at which the injector opens
  duration: 0.075, // how long it stays open
  linger: 0.27, // how long the vapour stays after it opens
  reach: 58, // full tip penetration
  half: (19 * Math.PI) / 180, // half angle of each plume
  jets: 6, // one plume per nozzle hole
  drops: 42,
  puffs: 12,
};

const sprayHash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// The plumes leave the six holes of the nozzle, spread evenly round the axis
// (down is +Y): each is the axis tipped outward by `half`
const SPRAY_DIRS: FwVec3[] = Array.from({ length: SPRAY.jets }, (_, k) => {
  const a = (k / SPRAY.jets) * TAU + 0.3;

  return [Math.sin(SPRAY.half) * Math.cos(a), Math.cos(SPRAY.half), Math.sin(SPRAY.half) * Math.sin(a)];
});

// Two directions across each plume, for the swirl of the droplets
const SPRAY_ACROSS: Array<[FwVec3, FwVec3]> = SPRAY_DIRS.map((d) => {
  const e1 = normalize3(cross3(d, [0, 0, 1]));
  const e2 = normalize3(cross3(d, e1));

  return [e1, e2];
});

const SPRAY_DROPS = Array.from({ length: SPRAY.drops }, (_, i) => ({
  jet: i % SPRAY.jets,
  birth: sprayHash(i * 3.1 + 7) * SPRAY.duration * 0.9,
  speed: 0.4 + 0.6 * sprayHash(i * 5.7 + 1),
  spread: (sprayHash(i * 7.3 + 2) - 0.5) * 0.5,
  size: 0.9 + sprayHash(i * 11.1 + 3) * 1.1,
  swirl: 0.5 + sprayHash(i * 2.3 + 5),
  phase: sprayHash(i * 1.7 + 9) * TAU,
}));

const sprayClamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

const spraySmooth = (v: number) => {
  const t = sprayClamp(v);

  return t * t * (3 - 2 * t);
};

function pushSpray(bank: Bank, p: number, ox: number, oy: number, oz: number) {
  const tau = p - SPRAY.start;
  const D = SPRAY.duration;

  if (tau < 0 || tau > SPRAY.linger) return;

  // Injector flow: quick opening, and a quick closing after `duration`
  const env = spraySmooth(tau / 0.012) * (1 - spraySmooth((tau - D) / 0.05));

  // Vapour outlives the liquid by a long way
  const gas =
    spraySmooth(tau / 0.02) *
    (1 - spraySmooth((tau - D - 0.03) / (SPRAY.linger - D - 0.03)));

  // Tip penetration grows with the square root of time, then stops
  const frontTime = Math.min(tau, D + 0.03);
  const front = SPRAY.reach * Math.sqrt(frontTime / (D + 0.03));
  const tailFrac = sprayClamp((tau - D) / 0.06);
  const tail = front * 0.85 * Math.pow(tailFrac, 1.2);

  // The plumes: a thin mist along each, denser toward the core
  if (env > 0.01) {
    for (let k = 0; k < SPRAY.jets; k++) {
      const dir = SPRAY_DIRS[k];

      for (let s = 0; s < 6; s++) {
        const dist = tail + (front - tail) * ((s + 0.5) / 6);

        addPoint(MIST, bank, ox + dir[0] * dist, oy + dir[1] * dist, oz + dir[2] * dist, 4 + 9 * (dist / SPRAY.reach), 1.0, 0.93, 0.78, 0.3 * env);
      }
    }
  }

  // Droplets: each follows its plume with a slow swirl, shrinks and fades
  for (const d of SPRAY_DROPS) {
    const age = tau - d.birth;

    if (age <= 0) continue;

    const q = Math.min(1.2, age / (D + 0.03));
    const dist = SPRAY.reach * d.speed * Math.sqrt(q);
    const dir = SPRAY_DIRS[d.jet];
    const [e1, e2] = SPRAY_ACROSS[d.jet];
    const swirl = Math.sin(age * 55 * d.swirl + d.phase) * 0.18 * dist + d.spread * dist;
    const swirl2 = Math.cos(age * 47 * d.swirl + d.phase) * 0.12 * dist;

    const life = spraySmooth(age / 0.006) * (1 - spraySmooth((age - 0.07) / 0.1));
    const evaporate = 1 - 0.55 * sprayClamp((age - 0.05) / 0.12);
    const fade = Math.pow(Math.max(0, 1 - dist / (SPRAY.reach * 1.1)), 0.8);

    addPoint(
      MIST, bank,
      ox + dir[0] * dist + e1[0] * swirl + e2[0] * swirl2,
      oy + dir[1] * dist + e1[1] * swirl + e2[1] * swirl2,
      oz + dir[2] * dist + e1[2] * swirl + e2[2] * swirl2,
      d.size * (2.0 + 3.4 * (dist / SPRAY.reach)) * evaporate,
      1.0, 0.95, 0.82, life * fade * 1.0
    );
  }

  // Vapour puffs: soft clouds that grow, spread out and keep drifting after
  // the injector has closed
  for (let k = 0; k < SPRAY.puffs; k++) {
    const u = (k + 0.7) / (SPRAY.puffs + 0.5);
    const along = (SPRAY.reach * 0.2 + front * 0.8) * u * 1.05 + Math.max(0, tau - D) * 40 * u;
    const around = k * 2.4 + tau * 6;
    const lateral = (0.25 + 0.55 * u) * along * 0.5;

    addPoint(
      MIST, bank,
      ox + Math.cos(around) * lateral,
      oy + along,
      oz + Math.sin(around) * lateral,
      (14 + 46 * u) * (0.55 + 0.65 * spraySmooth(tau / (D + 0.1))),
      1.0, 0.93, 0.80, gas * (0.42 - 0.16 * u) * (0.5 + 0.5 * spraySmooth(tau / 0.03))
    );
  }
}

// Everything that changes in a cylinder this frame
// The oil: drops flung off each crank pin as it turns, out and falling, while the engine turns; and drops that the oil
// rings have scraped down, falling slowly from the foot of each bore
const OIL_AT: FwVec3 = [0, 0, 0];

function computeOil(frame: EngineFrame) {
  OIL.n = 0;
  tickOilClock();

  const T = OIL_CLOCK.t;
  const turning = Math.min(1, Math.abs(frame.step) * 400); // 0 still, 1 turning

  // the oil through the dry sump: blobs along each of its ways, moving as fast as the pumps turn (a slow creep when the
  // engine stands), each a little off the way's middle, the wider the way the more
  OIL_CLOCK.flow += OIL_CLOCK.dt * OIL_SPEED * (0.06 + 0.94 * turning);

  for (let pi = 0; pi < OIL_PATHS.length; pi++) {
    const { curve, r } = OIL_PATHS[pi];
    const n = Math.floor(curve.total / OIL_GAP);
    const shift = OIL_CLOCK.flow % OIL_GAP;

    for (let k = 0; k < n; k++) {
      const sAt = k * OIL_GAP + shift;

      curveAt(curve, sAt, OIL_AT);

      // a continuous stream: soft blobs close enough to run together, its density rising and falling in slow waves that
      // travel with the oil, so that the flow is seen to move
      const wave = 0.62 + 0.38 * Math.sin(((sAt - OIL_CLOCK.flow) / 46) * TAU);
      const ends = Math.min(1, sAt / 14, (curve.total - sAt) / 14);

      addPoint(OIL, null, OIL_AT[0], OIL_AT[1], OIL_AT[2], r * 2.3, 0.98, 0.6, 0.12, 0.3 * wave * Math.max(0, ends));
    }
  }

  // the drops off the crank and the drips from the bores are inside the block: with the engine drawn solid they are hidden
  if (!SCENE_OPTIONS.seeThrough) return;

  for (let i = 0; i < CYLS.length; i++) {
    const cy = CYLS[i];
    const m = cy.bank.m;
    const pin = crankPin(frame, i);
    // the pin, in the engine's frame, about the crank's axis
    const py = m[4] * pin.pinY + m[7] * pin.zp;
    const pz = m[5] * pin.pinY + m[8] * pin.zp;
    const pr = Math.hypot(py, pz) || 1;

    if (turning > 0.02) {
      for (let k = 0; k < OIL_SPLASH; k++) {
        const seed = pseudoRandom(i * 31 + 3, k) + 0.5;
        const age = (T * (1.6 + seed) + k / OIL_SPLASH + i * 0.17) % 1; // 0..1 of a drop's short flight
        const a = Math.atan2(pz, py) + (seed - 0.5) * 1.6 - age * 1.2; // thrown off, behind the pin as it turns
        const v = 170 + 120 * seed;
        const t = age * 0.5;
        const y = (pr + 34) * Math.cos(a) + Math.cos(a) * v * t + 0.5 * 900 * t * t;
        const z = (pr + 34) * Math.sin(a) + Math.sin(a) * v * t;
        const fade = (1 - age) * turning;

        addPoint(OIL, null, cy.x + (seed - 0.5) * 24, y, z, 5 + 3 * seed, 0.95, 0.6, 0.16, 0.85 * fade);
      }
    }

    // drips from the bore's foot, falling a little way and fading
    for (let k = 0; k < OIL_DRIPS; k++) {
      const seed = pseudoRandom(i * 17 + 911, k) + 0.5;
      const age = (T * (0.55 + 0.4 * seed) + k / OIL_DRIPS + i * 0.29) % 1;
      const a = seed * TAU;
      const r = BORE_R_OIL - 1;
      const yb = VT.ySeat + LINER_H_OIL + 2;
      const fall = 0.5 * 600 * (age * 0.35) * (age * 0.35);
      const lx = cy.x + r * Math.cos(a);
      const lz = r * Math.sin(a);
      const wy = m[4] * yb + m[7] * lz + fall;
      const wz = m[5] * yb + m[8] * lz;
      const fade = Math.sin(Math.PI * Math.min(1, age * 1.2));

      addPoint(OIL, null, lx, wy, wz, 4.5, 0.9, 0.55, 0.14, 0.7 * fade);
    }
  }

  computeChainOil(frame, T, turning);
}

// The oil on the timing drives, seen when the engine is see-through: a jet from the dry sump's feed onto each primary
// chain as it comes onto the crank's sprocket; a wet film carried round on both chains, thicker in streaks that travel
// with them; and drops running off the bottom of every sprocket and falling away
const CHAIN_OIL_GAP = 4.5; // from one blob of the film to the next, along a chain
const CHAIN_OIL_AT = { y: 0, z: 0, circle: -1 };

function computeChainOil(frame: EngineFrame, T: number, turning: number) {
  const OIL_RGB: [number, number, number] = [0.95, 0.62, 0.16];

  for (const bank of BANKS) {
    const alpha = (bank.dir * frame.crankAngle * Math.PI) / 180;
    const chainX = VT.chainX + DRIVE_DX;
    const primaryX = chainX + primaryDx(bank);

    // the film on each chain, on both its faces, moving with it
    for (const [chain, x, s0, seed] of [
      [PRIMARY, primaryX, -VT_RC * alpha, 0],
      [SECONDARY, chainX, -CAM_RC * alpha * 0.5, 7],
    ] as Array<[typeof PRIMARY, number, number, number]>) {
      const n = Math.floor(chain.path.total / CHAIN_OIL_GAP);

      for (let k = 0; k < n; k++) {
        const s = s0 + k * CHAIN_OIL_GAP;

        chain.path.at(((s % chain.path.total) + chain.path.total) % chain.path.total, CHAIN_OIL_AT);

        // streaks of heavier oil, fixed to the chain, so that the film is seen to go round with it
        const streak = 0.5 + 0.5 * Math.sin(k * 0.37 + seed) * Math.sin(k * 0.11 + 1.3 * seed);
        const a = (0.34 + 0.44 * streak * streak) * (0.8 + 0.2 * turning);

        // on the outer plates' faces (they stand 5.7 out from the chain's middle), and a thinner wet line down its middle
        for (const side of [-1, 1]) {
          addPoint(OIL, bank, x + side * 6.3, CHAIN_OIL_AT.y, CHAIN_OIL_AT.z, 4.2 + 2.2 * streak, OIL_RGB[0], OIL_RGB[1], OIL_RGB[2], a);
        }
      }
    }

    // the jet from the feed, onto the primary chain where it comes onto the crank's sprocket
    {
      const from: [number, number] = [VT_RC + 34, VT_RC + 22];
      const to: [number, number] = [VT_RC * 0.55, VT_RC * 0.95];

      for (let k = 0; k < 12; k++) {
        const u = (k / 12 + T * 3.1) % 1;
        const y = from[0] + (to[0] - from[0]) * u;
        const z = from[1] + (to[1] - from[1]) * u;

        addPoint(OIL, bank, primaryX, y, z, 2.6, OIL_RGB[0], OIL_RGB[1], OIL_RGB[2], 0.55 * turning * (0.6 + 0.4 * u));
      }
    }

    // drops running off the bottom of each sprocket and falling, in the engine's frame, as they would
    const sprockets: Array<[number, number, number, number]> = [
      [primaryX, 0, 0, VT_RC],
      [primaryX, IDLER_Y, 0, VT_RC * 2],
      [chainX, IDLER_Y, 0, CAM_RC],
      [chainX, VT.yCam, VT.zCam, CAM_RC],
      [chainX, VT.yCam, -VT.zCam, CAM_RC],
    ];

    sprockets.forEach(([x, cy, cz, r], si) => {
      const wy = bank.m[4] * cy + bank.m[7] * cz;
      const wz = bank.m[5] * cy + bank.m[8] * cz;

      for (let k = 0; k < 3; k++) {
        const seedK = pseudoRandom(si * 13 + (bank.dir > 0 ? 3 : 101), k) + 0.5;
        const age = (T * (0.7 + 0.5 * seedK) + k / 3 + si * 0.21) % 1;
        const fall = 0.5 * 900 * (age * 0.32) * (age * 0.32);
        const fade = Math.sin(Math.PI * Math.min(1, age * 1.15));

        addPoint(OIL, null, x + (seedK - 0.5) * 6, wy + r + 2 + fall, wz + (seedK - 0.5) * r * 0.5, 3.4, OIL_RGB[0], OIL_RGB[1], OIL_RGB[2], 0.6 * fade);
      }
    });
  }
}

export function computeEffects(frame: EngineFrame) {
  computeOil(frame);
  MIST.n = 0;
  GLOW.n = 0;
  STREAKS.n = 0;
  FOG_STATE.on = false;

  for (let i = 0; i < CYLS.length; i++) {
    const cy = CYLS[i];
    const fx = CYLINDER_FX[i];
    const p = normalizeCycle(frame.t + cy.bank.phase[cy.k]);
    const pin = crankPin(frame, i);

    const rgb = getSmoothGasRgb(p);

    // The charge fills the bore from the chamber roof to the piston crown
    fx.top = VT.ySeat;
    fx.bottom = pin.wristY - 40;
    fx.gas[0] = rgb[0] / 255;
    fx.gas[1] = rgb[1] / 255;
    fx.gas[2] = rgb[2] / 255;
    fx.density = ENGINE_GAS.intake;

    const x = cy.x + PLUG.x;
    const z = PLUG.z;
    const tipY = VT.ySeat + ELECTRODE_TIP_Y;
    const strapY = VT.ySeat + 5.7;

    // The spark jumps from the centre electrode to the ground strap: that gap's
    // middle is where the flame starts, in the middle of the bore
    fx.flameC[0] = x;
    fx.flameC[1] = (tipY + strapY) / 2;
    fx.flameC[2] = z - 0.75;

    const sparking = STARTER.spark && p >= SPARK_START && p < SPARK_END;
    const burning = STARTER.spark && p >= SPARK_START && p < BURN_END;
    const burn = burning ? (p - SPARK_START) / (BURN_END - SPARK_START) : 0;

    // Slow flame-kernel start, then fast propagation (smoothstep)
    const grow = Math.min(1, burn * 3);
    const expansion = grow * grow * (3 - 2 * grow);

    fx.flameR = burning ? 2.5 + 100 * expansion : 0;
    // Dense and bright while it is a small kernel, thinning as it spreads
    fx.flameK = burning ? Math.pow(1 - burn, 0.8) * (1 + 3.2 * (1 - Math.min(1, fx.flameR / 26))) : 0;
    // The sleeve is flushed orange: quick rise after ignition, fading with the burn
    fx.glow = burning ? Math.min(1, burn * 5) * (1 - burn) : 0;

    if (sparking) {
      const seed = Math.floor(p * 200);
      const flicker = 0.75 + 0.5 * Math.abs(pseudoRandom(seed, 99));

      // A jagged arc across the gap, pinned at both ends
      for (let k = 0; k <= 9; k++) {
        const t = k / 9;
        const wobble = Math.sin(Math.PI * t);

        addPoint(
          GLOW, cy.bank,
          x + pseudoRandom(seed, k) * 2.6 * wobble,
          tipY + (strapY - tipY) * t + pseudoRandom(seed, k + 20) * 1.2 * wobble,
          z - 1.5 * t + pseudoRandom(seed, k + 40) * 2.2 * wobble,
          2.4 + 2 * wobble,
          0.92, 0.96, 1.0, 0.95 * flicker
        );
      }

      addPoint(GLOW, cy.bank, fx.flameC[0], fx.flameC[1], fx.flameC[2], 15, 0.55, 0.7, 1.0, 0.5 * flicker);
    }

    // The first glow of the kernel, before the flame is big enough to see
    if (burning && burn < 0.2) {
      const k = burn / 0.2;

      addPoint(GLOW, cy.bank, fx.flameC[0], fx.flameC[1], fx.flameC[2], 10 + 36 * k, 1.0, 0.78, 0.4, 0.4 * (1 - k));
    }

    if (STARTER.fuel) pushSpray(cy.bank, p, cy.x + INJ.x, VT.ySeat + 1, INJ.z);
  }


  if (SCENE_OPTIONS.airflow) pushAirflow(frame);
}
