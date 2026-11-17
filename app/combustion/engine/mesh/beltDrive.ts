// The accessory drive, on the front of the timing cover: one serpentine belt, poly-V, ribbed on the inside, from the
// crankshaft's pulley (with its torsional damper) round the alternator's, the water pump's and the tensioner's, all of
// them inside the loop and turning the crank's way. Its layout, the belt's path, and the parts' meshes. All in the world's
// frame: the pulleys turn about lines along x, the belt runs in a plane across the engine.

import { CHAIN_SEP, CHAIN_X_WORLD, DRIVE_DX, TAU } from "../core/constants";
import type { FwMaterial, FwVec3, createMeshBuilder } from "./builder";
import {
  MAT_ALT_CAST,
  MAT_ALT_COPPER,
  MAT_ALT_COPPER_DEEP,
  MAT_ALT_COPPER_GAP,
  MAT_ALT_ENAMEL,
  MAT_ALT_FAN,
  MAT_ALT_FAN_BACK,
  MAT_ALT_FAN_EDGE,
  MAT_ALT_NUT_HEAD,
  MAT_ALT_NUT_SIDE,
  MAT_ALT_PULLEY,
  MAT_ALT_PULLEY_DEEP,
  MAT_ALT_ROTOR,
  MAT_ALT_SPOKE,
  MAT_ALT_STATOR,
  MAT_BELT_BACK,
  MAT_BELT_EDGE,
  MAT_BELT_RIB,
  MAT_BELT_TOOTH,
  MAT_CT_NUT_HEAD,
  MAT_CT_NUT_SIDE,
  MAT_DAMPER_RING,
  MAT_DAMPER_RUBBER,
  MAT_HOSE_BLACK,
  MAT_HOSE_CLAMP,
  MAT_PULLEY,
  MAT_PULLEY_FACE,
  MAT_PULLEY_GROOVE,
  MAT_PULLEY_WEAVE,
  MAT_PUMP_CAST,
  MAT_PUMP_FACE,
  MAT_PUMP_MACH,
  MAT_PS_BODY,
  MAT_PS_CAP,
  MAT_PS_MACH,
  MAT_PS_MARK,
  MAT_PS_RIB,
  MAT_PS_RIB_SIDE,
  MAT_PS_RES,
  MAT_PUMP_RIB,
  MAT_PUMP_RIB_SIDE,
  MAT_TENSIONER,
  MAT_TERMINAL_RED,
  MAT_TIMING_MARK,
  MAT_VT_HOLE,
} from "./materials";
import { buildChainPath } from "./timingChain/chainPath";
import { CHAIN_FWD } from "./timingGears/gearTrain";
import { curveFromPoints, sweepTube } from "./tubes";

type B = ReturnType<typeof createMeshBuilder>;

// the timing cover's front face, in the world (timingCover.ts: X_FACE, set where both banks' drives stand), and the belt's
// middle plane, this far in front of it: room behind the pulleys for the damper, the pump's housing and the alternator
export const COVER_FACE_X = CHAIN_X_WORLD + DRIVE_DX - CHAIN_SEP - CHAIN_FWD - 26;
export const BELT_X = COVER_FACE_X - 92;
const BW = 22; // the belt's width (and the pulleys' grooved band)
const RIBS = 6; // its poly-V ribs
const RIB_H = 4.2; // their depth
const BACK_T = 4.6; // the belt's back, over the ribs: a thick belt

// The pulleys, where they stand across the engine (y down, z across), and their radii where the belt's ribs meet them.
// Counter-clockwise in (y, z): the crank's low in the middle, the alternator's up to one side, the water pump's high in
// the middle between the banks, the power steering pump's on the other side level with the alternator (the two mirror
// each other about the line through the crank and the water pump). Between the water pump and the steering pump, inside
// the loop, the tensioner: its smooth pulley on the belt's back (`back`: wrapped the other way, it turns the other way),
// its middle level with the top of the alternator's body, so that the belt runs down in an S, under the tensioner and
// over the steering pump's pulley. All between the two intercoolers
export type Pulley = { y: number; z: number; r: number; back?: boolean };
export const PULLEYS: { crank: Pulley; alternator: Pulley; pump: Pulley; idler: Pulley; steering: Pulley } = {
  crank: { y: 0, z: 0, r: 60 },
  alternator: { y: -128, z: 114, r: 28 },
  pump: { y: -298, z: 0, r: 46 }, // (raised a quarter higher than it was, -238)
  idler: { y: -128 - 69, z: -30, r: 30, back: true }, // (level with the top of the alternator's body, ALT_R over its middle)
  steering: { y: -128, z: -114, r: 32 },
};
const ORDER = [PULLEYS.crank, PULLEYS.alternator, PULLEYS.pump, PULLEYS.idler, PULLEYS.steering];

export const BELT_PATH = buildChainPath(ORDER, [false, false, false, false, false], 0);
// the belt drawn as short straight pieces, a whole number of them round the loop
export const BELT_PIECES = Math.round(BELT_PATH.total / 5);
export const BELT_PIECE = BELT_PATH.total / BELT_PIECES;
// each pulley's turn for one turn of the crank: the belt's speed over its radius (a pulley on the belt's back the other way)
export const pulleySpeed = (p: Pulley) => ((p.back ? -1 : 1) * PULLEYS.crank.r) / p.r;

// the alternator's body: its radius (its housings' barrels), and where its fan stands behind the pulley
export const ALT_R = 69;

/* ---------------- the pulleys ---------------- */

// A poly-V pulley's grooved band, about x, from x0 to x1 (x0 < x1), its ribs' crests at `r`: RIBS grooves, each a V with a
// rounded root, and a lip at each side
type PulleyMats = { band: FwMaterial; groove: FwMaterial; face: FwMaterial };
const BRIGHT: PulleyMats = { band: MAT_PULLEY, groove: MAT_PULLEY_GROOVE, face: MAT_PULLEY_FACE };
// (the pump's: its faces with the timing cover's weave, a well-marked diamond pattern)
const WOVEN: PulleyMats = { band: MAT_PULLEY, groove: MAT_PULLEY_GROOVE, face: MAT_PULLEY_WEAVE };
const DARK: PulleyMats = { band: MAT_ALT_PULLEY, groove: MAT_ALT_PULLEY_DEEP, face: MAT_ALT_PULLEY };

function polyVBand(b: B, x0: number, x1: number, r: number, steps: number, mats: PulleyMats = BRIGHT) {
  const pitch = (x1 - x0 - 2) / RIBS;
  const prof: Array<[number, number]> = [[x0, r + 1.2], [x0 + 1, r + 1.2]];

  for (let i = 0; i < RIBS; i++) {
    const a = x0 + 1 + i * pitch;

    prof.push([a + pitch * 0.12, r], [a + pitch * 0.42, r - RIB_H - 0.2], [a + pitch * 0.58, r - RIB_H - 0.2], [a + pitch * 0.88, r]);
  }

  prof.push([x1 - 1, r + 1.2], [x1, r + 1.2]);

  for (let k = 0; k < prof.length - 1; k++) {
    const [xa, ra] = prof[k];
    const [xc, rc] = prof[k + 1];
    const deep = Math.min(ra, rc) < r - 1;

    b.revolve({ x0: xa, r0: ra, x1: xc, r1: rc, n: [0, 1], m: deep ? mats.groove : mats.band, steps, occ0: ra < r - 1 ? 0.7 : 1, occ1: rc < r - 1 ? 0.7 : 1 });
  }

  // the lips' outer faces
  b.revolve({ x0: x0, r0: r - 6, x1: x0, r1: r + 1.2, n: [-1, 0], m: mats.face, steps });
  b.revolve({ x0: x1, r0: r - 6, x1: x1, r1: r + 1.2, n: [1, 0], m: mats.face, steps });
}

// A flat-backed pulley's band, for the belt's back: a slightly crowned, ground face the belt's width, a low lip each side
function smoothBand(b: B, x0: number, x1: number, r: number, steps: number) {
  const xm = (x0 + x1) / 2;

  b.revolve({ x0: x0 - 1.5, r0: r + 1.6, x1: x0, r1: r + 1.6, n: [0, 1], m: MAT_PULLEY, steps });
  b.revolve({ x0: x0, r0: r + 1.6, x1: x0, r1: r, n: [1, 0], m: MAT_PULLEY_GROOVE, steps, occ0: 1, occ1: 0.7 });
  b.revolve({ x0: x0, r0: r, x1: xm, r1: r + 0.4, n: [0.02, 1], m: MAT_PULLEY, steps, occ0: 0.75, occ1: 1 });
  b.revolve({ x0: xm, r0: r + 0.4, x1: x1, r1: r, n: [-0.02, 1], m: MAT_PULLEY, steps, occ0: 1, occ1: 0.75 });
  b.revolve({ x0: x1, r0: r, x1: x1, r1: r + 1.6, n: [-1, 0], m: MAT_PULLEY_GROOVE, steps, occ0: 0.7, occ1: 1 });
  b.revolve({ x0: x1, r0: r + 1.6, x1: x1 + 1.5, r1: r + 1.6, n: [0, 1], m: MAT_PULLEY, steps });
  b.revolve({ x0: x0 - 1.5, r0: r - 6, x1: x0 - 1.5, r1: r + 1.6, n: [-1, 0], m: MAT_PULLEY_FACE, steps });
  b.revolve({ x0: x1 + 1.5, r0: r - 6, x1: x1 + 1.5, r1: r + 1.6, n: [1, 0], m: MAT_PULLEY_FACE, steps });
}

// A flat face about x, facing -x (or +x with side 1), from r0 out to r1, turned with concentric rings standing in relief:
// each a rounded ridge `h` proud of the face, a dark groove between two
function ringedFace(b: B, x: number, r0: number, r1: number, steps: number, side: -1 | 1, mats: PulleyMats, pitch = 2.4, h = 0.6) {
  const n = Math.max(1, Math.round((r1 - r0) / pitch));
  const w = (r1 - r0) / n;
  const up = x + side * h; // the ridges' crests

  for (let i = 0; i < n; i++) {
    const a = r0 + i * w;
    const p = [a, a + w * 0.2, a + w * 0.4, a + w * 0.75, a + w];
    const xs = [x, up, up, x, x];
    const ns: Array<[number, number]> = [[side * 0.6, -0.8], [side, 0], [side * 0.6, 0.8], [side, 0]];

    for (let k = 0; k < 4; k++) {
      b.revolve({ x0: xs[k], r0: p[k], x1: xs[k + 1], r1: p[k + 1], n: ns[k], m: k === 3 ? mats.groove : mats.face, steps, occ0: k === 3 ? 0.75 : 1, occ1: k === 3 ? 0.75 : 1 });
    }
  }
}

// A hex bolt head with its washer, facing -x (out of the front), its face at x
function frontBolt(b: B, x: number, y: number, z: number, hex: number, head: FwMaterial = MAT_CT_NUT_HEAD, side: FwMaterial = MAT_CT_NUT_SIDE) {
  b.revolve({ x0: x, r0: 0, x1: x, r1: hex * 1.5, n: [-1, 0], m: head, steps: 32, cy: y, cz: z });
  b.revolve({ x0: x, r0: hex * 1.5, x1: x + 1.4, r1: hex * 1.5, n: [0, 1], m: side, steps: 32, cy: y, cz: z });
  b.prismDir([x - 0.01, y, z], [-1, 0, 0], [0, 1, 0], [0, 0, 1], hex, hex * 0.75, 6, Math.PI / 6, head, side);
  // the chamfer on top of the hex, and the maker's mark: a small round recess
  b.revolve({ x0: x - hex * 0.75 - 0.02, r0: hex * 0.35, x1: x - hex * 0.75 - 0.02, r1: hex * 0.8, n: [-1, 0], m: head, steps: 24, cy: y, cz: z });
  b.revolve({ x0: x - hex * 0.75 - 0.03, r0: 0, x1: x - hex * 0.75 - 0.03, r1: hex * 0.35, n: [-1, 0], m: side, steps: 24, cy: y, cz: z });
}

// The crankshaft's pulley, its damper behind it and its nose through the cover: turns with the crank (about the world's x
// axis, at y = z = 0)
export function buildCrankPulley(b: B) {
  const r = PULLEYS.crank.r;
  const f = BELT_X - BW / 2;
  const k = BELT_X + BW / 2;
  const steps = 160;

  polyVBand(b, f, k, r, steps);

  // the pulley's front: a pressed dish down to the hub, with six lightening holes in a ring
  // (its face with the timing cover's weave: a well-marked diamond pattern)
  b.revolve({ x0: f, r0: r - 6, x1: f - 3, r1: r - 12, n: [-1, 0.3], m: MAT_PULLEY_WEAVE, steps });
  b.revolve({ x0: f - 3, r0: r - 12, x1: f - 3, r1: 26, n: [-1, 0], m: MAT_PULLEY_WEAVE, steps, mask: (i) => !hole(i, steps, 6, 0.06) });

  for (let h = 0; h < 6; h++) {
    const a = ((h + 0.5) / 6) * TAU;
    const cy = 40 * Math.cos(a);
    const cz = 40 * Math.sin(a);

    b.revolve({ x0: f - 3, r0: 6.5, x1: f + 1, r1: 6.5, n: [0, -1], m: MAT_VT_HOLE, steps: 24, cy, cz });
    b.revolve({ x0: f - 3.01, r0: 6.5, x1: f - 3.01, r1: 8, n: [-1, 0], m: MAT_PULLEY, steps: 24, cy, cz });
  }

  // its hub, and the crank's big bolt with a thick washer
  b.revolve({ x0: f - 3, r0: 26, x1: f - 9, r1: 24, n: [0, 1], m: MAT_PULLEY, steps: 72 });
  b.revolve({ x0: f - 9, r0: 0, x1: f - 9, r1: 24, n: [-1, 0], m: MAT_PULLEY_WEAVE, steps: 72 });
  b.revolve({ x0: f - 9, r0: 17, x1: f - 12, r1: 17, n: [0, 1], m: MAT_CT_NUT_SIDE, steps: 48 });
  b.revolve({ x0: f - 12, r0: 0, x1: f - 12, r1: 17, n: [-1, 0], m: MAT_CT_NUT_HEAD, steps: 48 });
  frontBolt(b, f - 12, 0, 0, 10.5);

  // the torsional damper behind it: a cast inertia ring on a bonded rubber band, round a pressed hub; a white timing
  // mark on its rim, and the degree scale's notches
  const d0 = k + 1;
  const d1 = k + 19;
  const R = r + 6;

  b.revolve({ x0: d0, r0: R, x1: d1, r1: R, n: [0, 1], m: MAT_DAMPER_RING, steps });
  b.revolve({ x0: d0, r0: R - 1.5, x1: d0 + 1.5, r1: R, n: [-0.7, 0.7], m: MAT_PULLEY, steps });
  b.revolve({ x0: d1 - 1.5, r0: R, x1: d1, r1: R - 1.5, n: [0.7, 0.7], m: MAT_PULLEY, steps });
  b.revolve({ x0: d0, r0: 46, x1: d0, r1: R - 1.5, n: [-1, 0], m: MAT_DAMPER_RING, steps });
  b.revolve({ x0: d1, r0: 46, x1: d1, r1: R - 1.5, n: [1, 0], m: MAT_DAMPER_RING, steps });
  b.revolve({ x0: d0 + 0.5, r0: 42, x1: d0 + 0.5, r1: 46, n: [-1, 0], m: MAT_DAMPER_RUBBER, steps });
  b.revolve({ x0: d1 - 0.5, r0: 42, x1: d1 - 0.5, r1: 46, n: [1, 0], m: MAT_DAMPER_RUBBER, steps });
  b.revolve({ x0: d0 + 1.5, r0: 30, x1: d0 + 1.5, r1: 42, n: [-1, 0], m: MAT_PULLEY_FACE, steps: 96 });
  b.revolve({ x0: k, r0: 26, x1: d0 + 1.5, r1: 30, n: [-0.5, 1], m: MAT_PULLEY, steps: 72 });

  // the timing mark: a white bar across the ring's rim at the top (the crank's own angle 0), and short notches either side
  for (let n = -6; n <= 6; n++) {
    const a = n * (TAU / 144);
    const big = n === 0;
    const w = big ? 0.022 : 0.006;

    b.revolve({ x0: d0 + (big ? 0 : 9), r0: R + 0.05, x1: d1, r1: R + 0.05, n: [0, 1], m: big ? MAT_TIMING_MARK : MAT_VT_HOLE, steps: 1, from: a - w, to: a + w });
  }

  // the nose: the crank's sleeve back through the cover's seal
  b.revolve({ x0: d1, r0: 21, x1: COVER_FACE_X + 6, r1: 21, n: [0, 1], m: MAT_PUMP_MACH, steps: 64 });
}

const hole = (i: number, steps: number, n: number, w: number) => {
  const u = ((i + 0.5) / steps) * n;

  return Math.abs(u - Math.floor(u) - 0.5) < w * n * 0.5;
};

// A plain poly-V pulley for the alternator, the pump or the tensioner, centred on the x axis (placed when drawn)
function accessoryPulley(b: B, rPath: number, opts: { dish: number; hubR: number; bolts: number; nut?: boolean; spokes?: number; dark?: boolean; smooth?: boolean; woven?: boolean }) {
  const f = BELT_X - BW / 2;
  const k = BELT_X + BW / 2;
  const steps = Math.max(72, Math.round(rPath * 2.2));

  const mats = opts.dark ? DARK : opts.woven ? WOVEN : BRIGHT;
  // (a smooth pulley under the belt's back: its face that far in from the belt's line)
  const r = opts.smooth ? rPath - BACK_T : rPath;

  if (opts.smooth) smoothBand(b, f, k, r, steps);
  else polyVBand(b, f, k, r, steps, mats);

  // the face, dished in to the hub; on the bigger ones, spokes between round windows; the dark one turned with rings in relief
  const xf = f - opts.dish;
  const spokes = opts.spokes ?? 0;

  b.revolve({ x0: f, r0: r - 6, x1: xf, r1: r - 9, n: [-1, 0.2], m: mats.face, steps });
  if (opts.dark) {
    ringedFace(b, xf, opts.hubR, r - 9, steps, -1, mats);
    ringedFace(b, k, opts.hubR, r - 6, steps, 1, mats);
  } else {
    b.revolve({ x0: xf, r0: r - 9, x1: xf, r1: opts.hubR, n: [-1, 0], m: mats.face, steps, mask: spokes ? (i) => !hole(i, steps, spokes, 0.07) : undefined });
    b.revolve({ x0: k, r0: r - 6, x1: k, r1: opts.hubR, n: [1, 0], m: mats.face, steps, mask: spokes ? (i) => !hole(i, steps, spokes, 0.07) : undefined });
  }

  if (spokes) {
    // (the windows: the dark through which the pump or the alternator shows)
    for (let s = 0; s < spokes; s++) {
      const a0 = ((s + 0.5) / spokes) * TAU - 0.07 * TAU * 0.5;
      const a1 = a0 + 0.07 * TAU;

      b.revolve({ x0: xf, r0: opts.hubR, x1: k, r1: opts.hubR, n: [0, 1], m: MAT_VT_HOLE, steps: 6, from: a0, to: a1 });
      b.revolve({ x0: xf, r0: r - 9, x1: k, r1: r - 9, n: [0, -1], m: MAT_VT_HOLE, steps: 6, from: a0, to: a1 });
    }
  }

  // the hub, its flange's bolts, a nut on the shaft
  b.revolve({ x0: xf, r0: opts.hubR, x1: xf - 3, r1: opts.hubR - 1, n: [0, 1], m: mats.band, steps: 48 });
  if (opts.dark) ringedFace(b, xf - 3, 0, opts.hubR - 1, 48, -1, mats, 1.6, 0.4);
  else b.revolve({ x0: xf - 3, r0: 0, x1: xf - 3, r1: opts.hubR - 1, n: [-1, 0], m: mats.face, steps: 48 });

  for (let i = 0; i < opts.bolts; i++) {
    const a = (i / opts.bolts) * TAU + 0.4;

    frontBolt(b, xf - 3, opts.hubR * 0.6 * Math.cos(a), opts.hubR * 0.6 * Math.sin(a), 2.6);
  }

  // (on the dark ones a bigger nut, a little lighter than the pulley, its hex sharp against the rings)
  if (opts.nut) frontBolt(b, xf - 3 - (opts.dark ? 0.4 : 0), 0, 0, opts.dark ? 6.6 : 5.2, opts.dark ? MAT_ALT_NUT_HEAD : MAT_CT_NUT_HEAD, opts.dark ? MAT_ALT_NUT_SIDE : MAT_CT_NUT_SIDE);
}

export function buildAlternatorPulley(b: B) {
  accessoryPulley(b, PULLEYS.alternator.r, { dish: 2, hubR: 13, bolts: 0, nut: true, dark: true });

  // its fan, behind the pulley: an impeller like a compressor's wheel, a backplate (toward the alternator) with sixteen
  // curved blades standing on it, tall at the hub and lower toward the rim, swept back against the turn; a hub cone
  // to the pulley. It draws the air in at the middle and throws it out round the rim, over the housing's fins
  const x0 = BELT_X + BW / 2 + 1.5; // the blades' front edges
  const xb = x0 + 17; // the backplate
  const R = ALT_R - 20; // (smaller than the housing: round it, through the windows, the windings show)
  const steps = 144;

  b.revolve({ x0: xb, r0: 11, x1: xb, r1: R, n: [-1, 0], m: MAT_ALT_FAN_BACK, steps, occ0: 0.6, occ1: 0.85 });
  b.revolve({ x0: xb, r0: R, x1: xb + 2, r1: R, n: [0, 1], m: MAT_ALT_FAN, steps });
  b.revolve({ x0: xb + 2, r0: 11, x1: xb + 2, r1: R, n: [1, 0], m: MAT_ALT_FAN, steps });
  // the hub's cone
  b.revolve({ x0: x0 - 2, r0: 9, x1: xb, r1: 16, n: [-0.4, 1], m: MAT_PUMP_MACH, steps: 48 });

  const BL = 16;

  for (let i = 0; i < BL; i++) {
    const a0 = (i / BL) * TAU;
    const N = 10;
    const root: FwVec3[] = [];
    const tip: FwVec3[] = [];

    for (let s2 = 0; s2 <= N; s2++) {
      const u = s2 / N;
      const rr = 14 + u * (R - 15);
      const aa = a0 - 0.75 * u * u; // swept back
      const h = 16.5 - 3.5 * u; // tall at the hub, still tall at the rim: standing well out of the backplate

      root.push([xb, rr * Math.cos(aa), rr * Math.sin(aa)]);
      tip.push([xb - h, rr * Math.cos(aa), rr * Math.sin(aa)]);
    }

    for (let s2 = 0; s2 < N; s2++) {
      const p0 = root[s2];
      const p1 = root[s2 + 1];
      const t0 = tip[s2];
      const t1 = tip[s2 + 1];
      const ty = p1[1] - p0[1];
      const tz = p1[2] - p0[2];
      // both faces of the blade, and its edge
      const nA: FwVec3 = [0, -tz, ty];
      const off = 1.1;
      const ny = -tz / (Math.hypot(ty, tz) || 1);
      const nz = ty / (Math.hypot(ty, tz) || 1);
      const shift = (p: FwVec3, k: number): FwVec3 => [p[0], p[1] + ny * off * k, p[2] + nz * off * k];

      // (the leading face lit, the trailing one dark, the tip bright: the blades stand out of the backplate)
      b.flatQuad(shift(p0, 1), shift(p1, 1), shift(t1, 1), shift(t0, 1), nA, MAT_ALT_FAN);
      b.flatQuad(shift(p0, -1), shift(p1, -1), shift(t1, -1), shift(t0, -1), [0, tz, -ty], MAT_ALT_FAN_BACK);
      b.flatQuad(shift(t0, 1), shift(t1, 1), shift(t1, -1), shift(t0, -1), [-1, 0, 0], MAT_ALT_FAN_EDGE);
    }

    // the blade's outer end
    b.flatQuad(
      [root[N][0], root[N][1] + 1.1 * Math.cos(a0 - 0.75 + Math.PI / 2), root[N][2] + 1.1 * Math.sin(a0 - 0.75 + Math.PI / 2)],
      [tip[N][0], tip[N][1] + 1.1 * Math.cos(a0 - 0.75 + Math.PI / 2), tip[N][2] + 1.1 * Math.sin(a0 - 0.75 + Math.PI / 2)],
      [tip[N][0], tip[N][1] - 1.1 * Math.cos(a0 - 0.75 + Math.PI / 2), tip[N][2] - 1.1 * Math.sin(a0 - 0.75 + Math.PI / 2)],
      [root[N][0], root[N][1] - 1.1 * Math.cos(a0 - 0.75 + Math.PI / 2), root[N][2] - 1.1 * Math.sin(a0 - 0.75 + Math.PI / 2)],
      [0, Math.cos(a0 - 0.75), Math.sin(a0 - 0.75)],
      MAT_ALT_FAN
    );
  }

  // the shaft's collar through the backplate to the rotor
  b.revolve({ x0: xb, r0: 11, x1: xb + 8, r1: 11, n: [0, 1], m: MAT_PUMP_MACH, steps: 32 });
}

export function buildPumpPulley(b: B) {
  accessoryPulley(b, PULLEYS.pump.r, { dish: 6, hubR: 17, bolts: 4, spokes: 5, woven: true });
}

// The power steering pump's pulley: pressed steel, bright, a dished face with four windows, the hub's flats and its nut
export function buildSteeringPulley(b: B) {
  accessoryPulley(b, PULLEYS.steering.r, { dish: 4, hubR: 12, bolts: 0, nut: true, spokes: 4, woven: true }); // (its face woven as the water pump's and the crank's)
}

export function buildIdlerPulley(b: B) {
  // made as the water pump's: a dished face with five round-ended windows between spokes, a hub with four bolts; but
  // smooth, for the belt's back
  // smooth, for the belt's back; its face dark and turned with rings in relief, as the alternator's, and the same nut
  accessoryPulley(b, PULLEYS.idler.r, { dish: 4, hubR: 11, bolts: 0, nut: true, smooth: true, dark: true });
}

/* ---------------- the water pump, the alternator, the tensioner: fixed ---------------- */

export function buildAccessories(b: B) {
  const back = COVER_FACE_X; // everything bolts back onto the cover's face
  const behind = BELT_X + BW / 2; // the belt's back edge

  // ---- the crank's oil seal in the cover, round the nose ----
  b.revolve({ x0: back - 0.5, r0: 21.2, x1: back - 0.5, r1: 34, n: [-1, 0], m: MAT_PUMP_MACH, steps: 64 });
  b.revolve({ x0: back - 0.6, r0: 21.2, x1: back - 0.6, r1: 26, n: [-1, 0], m: MAT_DAMPER_RUBBER, steps: 64 });
  // and the pointer for the timing marks, a tab on the cover over the damper's top
  {
    const R = PULLEYS.crank.r + 6;
    const y0 = -R - 3;

    b.box(back - 30, back, y0 - 16, y0 - 12, -4, 4, MAT_PUMP_CAST);
    b.box(back - 31, back - 26, y0 - 12, y0 + 1, -1.2, 1.2, MAT_TIMING_MARK);
  }

  // ---- the water pump: a cast volute housing bolted to the cover, its bearing nose out to the pulley, an outlet
  // turning off it into a short hose and back into the cover; a weep hole under the nose ----
  {
    const { y, z } = PULLEYS.pump;
    const h0 = back;
    const h1 = behind + 18; // the housing's front
    const R = 56;

    // the volute: round, flattening into the outlet at one side; ribs on its face
    b.revolve({ x0: h0, r0: R + 6, x1: h1 + 4, r1: R + 2, n: [0, 1], m: MAT_PUMP_CAST, steps: 120, cy: y, cz: z });
    b.revolve({ x0: h1 + 4, r0: R + 2, x1: h1, r1: R - 4, n: [-0.7, 0.7], m: MAT_PUMP_CAST, steps: 120, cy: y, cz: z });
    // (its face, seen through the pulley's windows: the same grey, matte, no shine)
    b.revolve({ x0: h1, r0: 22, x1: h1, r1: R - 4, n: [-1, 0], m: MAT_PUMP_FACE, steps: 120, cy: y, cz: z });

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);

      // a rib: a low box radial on the face
      const p0: FwVec3 = [h1, y + 24 * ca, z + 24 * sa];
      const p1: FwVec3 = [h1, y + (R - 6) * ca, z + (R - 6) * sa];
      const w = 2.2;
      const tY = -sa * w;
      const tZ = ca * w;

      b.flatQuad([p0[0] - 4, p0[1] + tY, p0[2] + tZ], [p1[0] - 4, p1[1] + tY, p1[2] + tZ], [p1[0] - 4, p1[1] - tY, p1[2] - tZ], [p0[0] - 4, p0[1] - tY, p0[2] - tZ], [-1, 0, 0], MAT_PUMP_FACE);
      b.flatQuad([p0[0], p0[1] + tY, p0[2] + tZ], [p1[0], p1[1] + tY, p1[2] + tZ], [p1[0] - 4, p1[1] + tY, p1[2] + tZ], [p0[0] - 4, p0[1] + tY, p0[2] + tZ], [0, -sa, ca], MAT_PUMP_FACE);
      b.flatQuad([p0[0], p0[1] - tY, p0[2] - tZ], [p1[0], p1[1] - tY, p1[2] - tZ], [p1[0] - 4, p1[1] - tY, p1[2] - tZ], [p0[0] - 4, p0[1] - tY, p0[2] - tZ], [0, sa, -ca], MAT_PUMP_FACE);
    }

    // ribs along the barrel, in relief, a shade darker than the casting: thin bars from the flange to the face's rounded edge,
    // following the barrel's taper
    {
      const RIBS_N = 40;
      const xa = h0 - 5.5;
      const xe = h1 + 5;
      const rAt = (x: number) => R + 6 + ((R + 2) - (R + 6)) * ((h0 - x) / (h0 - (h1 + 4)));
      const hgt = 2.2;
      const half = 1.1;

      for (let i = 0; i < RIBS_N; i++) {
        const a = ((i + 0.5) / RIBS_N) * TAU;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const P = (x: number, up: number, k: number): FwVec3 => {
          const r = rAt(x) - 0.3 + up;

          return [x, y + r * ca - sa * half * k, z + r * sa + ca * half * k];
        };

        b.flatQuad(P(xa, hgt, 1), P(xe, hgt, 1), P(xe, hgt, -1), P(xa, hgt, -1), [0, ca, sa], MAT_PUMP_RIB);
        b.flatQuad(P(xa, 0, 1), P(xe, 0, 1), P(xe, hgt, 1), P(xa, hgt, 1), [0, -sa, ca], MAT_PUMP_RIB_SIDE);
        b.flatQuad(P(xa, 0, -1), P(xe, 0, -1), P(xe, hgt, -1), P(xa, hgt, -1), [0, sa, -ca], MAT_PUMP_RIB_SIDE);
        b.flatQuad(P(xe, 0, 1), P(xe, hgt, 1), P(xe, hgt, -1), P(xe, 0, -1), [-1, 0, 0], MAT_PUMP_RIB_SIDE);
      }
    }

    // its flange to the cover, and six bolts round it
    b.revolve({ x0: h0 - 0.2, r0: R + 6, x1: h0 - 0.2, r1: R + 13, n: [-1, 0], m: MAT_PUMP_MACH, steps: 120, cy: y, cz: z });
    b.revolve({ x0: h0 - 5, r0: R + 13, x1: h0, r1: R + 13, n: [0, 1], m: MAT_PUMP_CAST, steps: 120, cy: y, cz: z });
    b.revolve({ x0: h0 - 5, r0: R + 6, x1: h0 - 5, r1: R + 13, n: [-1, 0], m: MAT_PUMP_CAST, steps: 120, cy: y, cz: z });

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.25;

      frontBolt(b, h0 - 5, y + (R + 9.5) * Math.cos(a), z + (R + 9.5) * Math.sin(a), 3.2);
    }

    // the bearing nose out to the pulley, machined, with the seal's lip and the weep hole under it
    b.revolve({ x0: h1, r0: 22, x1: behind + 2, r1: 15, n: [-0.3, 1], m: MAT_PUMP_CAST, steps: 64, cy: y, cz: z });
    b.revolve({ x0: behind + 2, r0: 15, x1: behind + 0.5, r1: 15, n: [0, 1], m: MAT_PUMP_MACH, steps: 64, cy: y, cz: z });
    b.revolve({ x0: behind + 0.5, r0: 8, x1: behind + 0.5, r1: 15, n: [-1, 0], m: MAT_PUMP_MACH, steps: 64, cy: y, cz: z });
    b.revolve({ x0: (h1 + behind) / 2 - 1.5, r0: 0, x1: (h1 + behind) / 2 - 1.5, r1: 1.6, n: [0, 1], m: MAT_VT_HOLE, steps: 12, cy: y + 19, cz: z });

    // the outlet: a neck off the volute's side, then a black hose bending back into the cover, a clamp at each end
    const out0: FwVec3 = [h0 - 16, y - 18, z - R - 2];
    const neckEnd: FwVec3 = [h0 - 16, y - 18, z - R - 20];
    const neck = curveFromPoints([[h0 - 16, y - 18, z - R + 14], out0, neckEnd], 3);

    sweepTube(b, neck, () => 13, MAT_PUMP_CAST, { segments: 28, capEnd: true });

    const hose = curveFromPoints([
      [neckEnd[0], neckEnd[1], neckEnd[2] + 6],
      [neckEnd[0], neckEnd[1], neckEnd[2] - 14],
      [neckEnd[0] + 6, neckEnd[1] + 4, neckEnd[2] - 30],
      [back - 18, neckEnd[1] + 8, neckEnd[2] - 36],
      [back + 2, neckEnd[1] + 8, neckEnd[2] - 36],
    ], 3);

    sweepTube(b, hose, () => 15, MAT_HOSE_BLACK, { segments: 32 });

    for (const s of [0.14, 0.9]) {
      const i = Math.round(s * (hose.pts.length - 1));
      const p = hose.pts[i];
      const q = hose.pts[Math.min(hose.pts.length - 1, i + 1)];
      const d: FwVec3 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
      const l = Math.hypot(d[0], d[1], d[2]) || 1;
      const dir: FwVec3 = [d[0] / l, d[1] / l, d[2] / l];
      const e1: FwVec3 = Math.abs(dir[1]) < 0.9 ? normalize(cross(dir, [0, 1, 0])) : normalize(cross(dir, [1, 0, 0]));
      const e2 = cross(dir, e1);

      b.prismDir([p[0] - dir[0] * 3, p[1] - dir[1] * 3, p[2] - dir[2] * 3], dir, e1, e2, 16.2, 6, 40, 0, MAT_HOSE_CLAMP, MAT_HOSE_CLAMP);
      // the worm housing on the clamp
      b.prismDir([p[0] + e1[0] * 16, p[1] + e1[1] * 16, p[2] + e1[2] * 16], e1, dir, e2, 3.4, 5, 4, Math.PI / 4, MAT_HOSE_CLAMP, MAT_HOSE_CLAMP);
    }
  }

  // ---- the alternator, bigger and darker: two die-cast housings, dark metallic grey with a fine hexagonal relief, deep
  // cooling fins all round their barrels; the laminated stator between them; seen from the front, through the front
  // housing's six curved windows, the copper windings and the claw-pole rotor turning; four through-bolts; at the back
  // the B+ terminal in a red boot and the regulator's plug; two lugs bolted to a bracket on the cover ----
  {
    const { y, z } = PULLEYS.alternator;
    const a0 = behind + 22; // its front housing's face, behind the fan
    const a1 = back - 3; // its back, near the cover
    const R = ALT_R;
    const m1 = a0 + (a1 - a0) * 0.36;
    const m2 = a0 + (a1 - a0) * 0.6;
    const steps = 160;
    const WIN = 6;
    // the face's spokes: each split in two narrow ones, a gap between them, so that the windings show between and round them
    const FS = 360;

    // the front housing's face: a hub boss for the bearing, the spokes and the rim, the windows open
    b.revolve({ x0: a0 - 3, r0: 0, x1: a0 - 3, r1: 17, n: [-1, 0], m: MAT_ALT_CAST, steps: 64, cy: y, cz: z });
    b.revolve({ x0: a0 - 3, r0: 17, x1: a0, r1: 19, n: [-0.5, 1], m: MAT_ALT_CAST, steps: 64, cy: y, cz: z });

    // the spokes: straight and radial, each pair of narrow bars side by side with the gap between them, their edges true
    // one under the other from the boss to the rim; a lighter grey, standing 3 proud of the windings' side with their walls
    for (let k = 0; k < WIN; k++) {
      const c = (k / WIN) * TAU;
      const per = TAU / WIN;

      // (and midway between two pairs, one bar twice as wide: less of the copper bare)
      for (const [u0, u1] of [[0.025, 0.105], [-0.105, -0.025], [0.42, 0.58]]) {
        const from = c + u0 * per;
        const to = c + u1 * per;

        b.revolve({ x0: a0, r0: 19, x1: a0, r1: R - 6, n: [-1, 0], m: MAT_ALT_SPOKE, steps: 2, from, to, cy: y, cz: z });

        // its two side walls, back to behind the face
        for (const [t, sgn] of [[from, -1], [to, 1]] as Array<[number, number]>) {
          const ct = Math.cos(t);
          const st = Math.sin(t);
          const nrm: FwVec3 = [0, -st * sgn, ct * sgn];
          const P = (x: number, r: number): FwVec3 => [x, y + r * ct, z + r * st];

          b.flatQuad(P(a0, 19), P(a0, R - 6), P(a0 + 3, R - 6), P(a0 + 3, 19), nrm, MAT_ALT_CAST, 0.8);
        }
      }
    }

    for (let i = 0; i < FS; i++) {
      const ta = (i / FS) * TAU;
      const tb = ((i + 1) / FS) * TAU;

      {
        // through the window: the windings' end turns, as on the starter: enamelled copper wire, turn beside turn, each a
        // rounded bead in its own shade of copper with a fine dark gap; bundles bulging a little; the dark rotor inside
        const bump = 1.2 * Math.sin(i * 0.75) * Math.sin(i * 0.4);
        const r0w = 34;
        const TURNS = Math.round((R - 6 - r0w) / 2.6);
        const tw = (R - 6 - r0w) / TURNS;
        const xw = a0 + 7 - bump;

        for (let t = 0; t < TURNS; t++) {
          const ra = r0w + t * tw;
          const tone = [MAT_ALT_COPPER, MAT_ALT_ENAMEL, MAT_ALT_COPPER_DEEP][(t + Math.floor(i / 7)) % 3];
          const crest = xw - 1.1;

          b.revolve({ x0: xw, r0: ra + 0.25, x1: crest, r1: ra + tw * 0.5, n: [-0.7, -0.7], m: tone, steps: 1, from: ta, to: tb, cy: y, cz: z, occ0: 0.7, occ1: 1 });
          b.revolve({ x0: crest, r0: ra + tw * 0.5, x1: xw, r1: ra + tw - 0.25, n: [-0.7, 0.7], m: tone, steps: 1, from: ta, to: tb, cy: y, cz: z, occ0: 1, occ1: 0.7 });
          b.revolve({ x0: xw, r0: ra + tw - 0.25, x1: xw, r1: ra + tw + 0.25, n: [-1, 0], m: MAT_ALT_COPPER_GAP, steps: 1, from: ta, to: tb, cy: y, cz: z });
        }
        b.revolve({ x0: xw, r0: r0w - 0.5, x1: xw, r1: r0w + 0.25, n: [-1, 0], m: MAT_ALT_COPPER_GAP, steps: 1, from: ta, to: tb, cy: y, cz: z });
        b.revolve({ x0: a0 + 9, r0: 19, x1: a0 + 9, r1: r0w - 0.5, n: [-1, 0], m: MAT_ALT_ROTOR, steps: 1, from: ta, to: tb, cy: y, cz: z, occ0: 0.5, occ1: 0.6 });
      }
    }

    // the rim of the face, rounded over onto the barrel
    b.revolve({ x0: a0, r0: R - 6, x1: a0, r1: R - 5, n: [-1, 0], m: MAT_ALT_CAST, steps, cy: y, cz: z });
    b.revolve({ x0: a0, r0: R - 5, x1: a0 + 5, r1: R, n: [-0.7, 0.7], m: MAT_ALT_CAST, steps, cy: y, cz: z });

    // the barrels, front and back, each with its fins: deep radial blades along it, the air from the fan running
    // between them
    const FINS = 30;

    for (const [x0f, x1f] of [[a0 + 5, m1], [m2, a1 - 4]] as Array<[number, number]>) {
      b.revolve({ x0: x0f, r0: R - 4, x1: x1f, r1: R - 4, n: [0, 1], m: MAT_ALT_CAST, steps, cy: y, cz: z });

      for (let f = 0; f < FINS; f++) {
        const a = (f / FINS) * TAU;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const e2: FwVec3 = [0, -sa, ca];
        const t = 0.9;
        const P = (x: number, r: number, k: number): FwVec3 => [x, y + r * ca + e2[1] * t * k, z + r * sa + e2[2] * t * k];
        const rIn = R - 4;
        const rOut = R + 3;

        // the fin's two faces, its top edge and its ends
        b.flatQuad(P(x0f + 1, rIn, 1), P(x1f - 1, rIn, 1), P(x1f - 1, rOut, 1), P(x0f + 1, rOut, 1), e2, MAT_ALT_CAST);
        b.flatQuad(P(x0f + 1, rIn, -1), P(x1f - 1, rIn, -1), P(x1f - 1, rOut, -1), P(x0f + 1, rOut, -1), [0, sa, -ca], MAT_ALT_CAST);
        b.flatQuad(P(x0f + 1, rOut, 1), P(x1f - 1, rOut, 1), P(x1f - 1, rOut, -1), P(x0f + 1, rOut, -1), [0, ca, sa], MAT_ALT_CAST);
        b.flatQuad(P(x0f + 1, rIn, 1), P(x0f + 1, rOut, 1), P(x0f + 1, rOut, -1), P(x0f + 1, rIn, -1), [-1, 0, 0], MAT_ALT_CAST);
        b.flatQuad(P(x1f - 1, rIn, 1), P(x1f - 1, rOut, 1), P(x1f - 1, rOut, -1), P(x1f - 1, rIn, -1), [1, 0, 0], MAT_ALT_CAST);
      }
    }

    // the stator: laminations, a band of fine steps, standing proud of the housings; the windings' copper showing in the
    // gaps either side of it
    for (let s2 = 0; s2 < 12; s2++) {
      const xa = m1 + ((m2 - m1) * s2) / 12;
      const xb = m1 + ((m2 - m1) * (s2 + 1)) / 12;

      b.revolve({ x0: xa, r0: R + 4, x1: xb - 0.35, r1: R + 4, n: [0, 1], m: MAT_ALT_STATOR, steps, cy: y, cz: z });
      b.revolve({ x0: xb - 0.35, r0: R + 4, x1: xb - 0.35, r1: R + 3, n: [1, 0], m: MAT_ALT_STATOR, steps, cy: y, cz: z });
      b.revolve({ x0: xb - 0.35, r0: R + 3, x1: xb, r1: R + 4, n: [-1, 0], m: MAT_ALT_STATOR, steps, cy: y, cz: z });
    }

    b.revolve({ x0: m1, r0: R - 4, x1: m1, r1: R + 4, n: [-1, 0], m: MAT_ALT_STATOR, steps, cy: y, cz: z });
    b.revolve({ x0: m2, r0: R - 4, x1: m2, r1: R + 4, n: [1, 0], m: MAT_ALT_STATOR, steps, cy: y, cz: z });
    b.revolve({ x0: m1 - 1.5, r0: R - 4.5, x1: m1, r1: R - 4.5, n: [0, 1], m: MAT_ALT_COPPER, steps, cy: y, cz: z });
    b.revolve({ x0: m2, r0: R - 4.5, x1: m2 + 1.5, r1: R - 4.5, n: [0, 1], m: MAT_ALT_COPPER, steps, cy: y, cz: z });

    // the back: rounded in to the end cover
    b.revolve({ x0: a1 - 4, r0: R - 4, x1: a1, r1: R - 12, n: [0.7, 0.7], m: MAT_ALT_CAST, steps, cy: y, cz: z });

    // four through-bolts along the outside, between the fins, from the front housing to the back
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4 + Math.PI / FINS;
      const cy = y + (R - 1) * Math.cos(a);
      const cz = z + (R - 1) * Math.sin(a);

      b.revolve({ x0: a0 + 6, r0: 2, x1: a1 - 3, r1: 2, n: [0, 1], m: MAT_CT_NUT_SIDE, steps: 12, cy, cz });
      frontBolt(b, a0 + 6, cy, cz, 2.8);
    }

    // B+ terminal: a stud out of the back housing's side, under a red boot, the cable going back; the regulator's plug
    const ta = 0.55;
    const tp: FwVec3 = [a1 - 12, y + (R + 2) * Math.cos(ta), z + (R + 2) * Math.sin(ta)];
    const tdir: FwVec3 = [0, Math.cos(ta), Math.sin(ta)];

    b.prismDir(tp, tdir, [1, 0, 0], [0, -Math.sin(ta), Math.cos(ta)], 6.5, 9, 28, 0, MAT_TERMINAL_RED, MAT_TERMINAL_RED);
    b.prismDir([tp[0], tp[1] + tdir[1] * 9, tp[2] + tdir[2] * 9], tdir, [1, 0, 0], [0, -Math.sin(ta), Math.cos(ta)], 4.4, 5, 24, 0, MAT_TERMINAL_RED, MAT_TERMINAL_RED);

    const cable = curveFromPoints([
      [tp[0], tp[1] + tdir[1] * 13, tp[2] + tdir[2] * 13],
      [tp[0] + 4, tp[1] + tdir[1] * 22, tp[2] + tdir[2] * 22],
      [back + 2, tp[1] + tdir[1] * 26, tp[2] + tdir[2] * 26],
    ], 3);

    sweepTube(b, cable, () => 3.6, MAT_HOSE_BLACK, { segments: 14 });

    const pa = 2.3;
    const pr = R + 4;

    b.box(a1 - 18, a1 - 5, y + pr * Math.cos(pa) - 6, y + pr * Math.cos(pa) + 6, z + pr * Math.sin(pa) - 6, z + pr * Math.sin(pa) + 6, MAT_HOSE_BLACK);

    // its two lugs, top and bottom, through-bolted to a bracket on the cover
    for (const side of [-1, 1]) {
      const ly = y + side * (R + 9);

      b.box(a0 + 6, a0 + 20, ly - 6, ly + 6, z - 7, z + 7, MAT_ALT_CAST);
      b.box(a0 + 20, back, ly - 5, ly + 5, z - 10, z + 10, MAT_PUMP_CAST);
      b.revolve({ x0: a0 + 5, r0: 2.6, x1: back, r1: 2.6, n: [0, 1], m: MAT_CT_NUT_SIDE, steps: 16, cy: ly, cz: z });
      frontBolt(b, a0 + 5, ly, z, 3.6);
    }
  }

  // ---- the power steering pump (it feeds the steering and the brakes' booster): a vane pump in a cast aluminium body,
  // ribbed round, its front cover bolted on with four bolts round the shaft's nose; on top its reservoir, black, its
  // filler cap with grips; out of its side the high-pressure outlet, a hex union and a banjo, and from it the steel line
  // back toward the bulkhead, clipped; from the reservoir's side the low-pressure return, a black hose on a barbed
  // spigot with its clamp; a pressure switch with its plug on the outlet; a cast bracket bolting it to the cover ----
  {
    const { y, z } = PULLEYS.steering;
    const a0 = behind + 4; // the shaft's nose, behind the pulley
    const fc = behind + 12; // the front cover's face
    const a1 = back - 8; // the body's back
    const R = 50; // (30% smaller across than it was at 72, its middle where it was)
    const steps = 160;

    // the nose and its seal
    b.revolve({ x0: a0, r0: 10, x1: fc, r1: 10, n: [0, 1], m: MAT_PUMP_MACH, steps: 32, cy: y, cz: z });
    b.revolve({ x0: fc - 2, r0: 10, x1: fc - 2, r1: 15, n: [-1, 0], m: MAT_DAMPER_RUBBER, steps: 32, cy: y, cz: z });
    // the front cover: a machined disc, its rim chamfered, four bolts
    b.revolve({ x0: fc, r0: 10, x1: fc, r1: R - 3, n: [-1, 0], m: MAT_PS_MACH, steps, cy: y, cz: z });
    b.revolve({ x0: fc, r0: R - 3, x1: fc + 3, r1: R, n: [-0.7, 0.7], m: MAT_PS_MACH, steps, cy: y, cz: z });
    b.revolve({ x0: fc + 3, r0: R, x1: fc + 9, r1: R, n: [0, 1], m: MAT_PS_MACH, steps, cy: y, cz: z });

    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + Math.PI / 6;

      frontBolt(b, fc, y + (R - 10) * Math.cos(a), z + (R - 10) * Math.sin(a), 4);
    }

    // the body: cast, a little bigger than the cover, its ribs along it, its back rounded in
    b.revolve({ x0: fc + 9, r0: R, x1: fc + 9, r1: R + 2, n: [-1, 0], m: MAT_PS_BODY, steps, cy: y, cz: z });
    b.revolve({ x0: fc + 9, r0: R + 2, x1: a1 - 6, r1: R + 2, n: [0, 1], m: MAT_PS_BODY, steps, cy: y, cz: z });
    b.revolve({ x0: a1 - 6, r0: R + 2, x1: a1, r1: R - 10, n: [0.7, 0.7], m: MAT_PS_BODY, steps, cy: y, cz: z });
    b.revolve({ x0: a1, r0: 0, x1: a1, r1: R - 10, n: [1, 0], m: MAT_PS_BODY, steps, cy: y, cz: z });

    // ribs along the body, in relief, a shade darker than the casting: as on the water pump's barrel
    for (let k = 0; k < 48; k++) {
      const a = ((k + 0.5) / 48) * TAU;

      if (Math.cos(a) < -0.9) continue; // (none under the reservoir's neck)

      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const P = (x: number, up: number, w: number): FwVec3 => [x, y + (R + 1.7 + up) * ca - sa * w, z + (R + 1.7 + up) * sa + ca * w];
      const xa = fc + 11;
      const xe = a1 - 8;

      // (taller than the water pump's: 3.6 proud, darker, sharply lit)
      b.flatQuad(P(xa, 3.6, 1.2), P(xe, 3.6, 1.2), P(xe, 3.6, -1.2), P(xa, 3.6, -1.2), [0, ca, sa], MAT_PS_RIB);
      b.flatQuad(P(xa, 0, 1.2), P(xe, 0, 1.2), P(xe, 3.6, 1.2), P(xa, 3.6, 1.2), [0, -sa, ca], MAT_PS_RIB_SIDE);
      b.flatQuad(P(xa, 0, -1.2), P(xe, 0, -1.2), P(xe, 3.6, -1.2), P(xa, 3.6, -1.2), [0, sa, -ca], MAT_PS_RIB_SIDE);
      b.flatQuad(P(xa, 0, 1.2), P(xa, 3.6, 1.2), P(xa, 3.6, -1.2), P(xa, 0, -1.2), [-1, 0, 0], MAT_PS_RIB_SIDE);
    }

    // the reservoir on top: a round black tank on a neck, its cap with grips; the level marks moulded on
    const rx = (fc + a1) / 2 + 4;
    const ry0 = y - R - 1; // its foot
    const ryT = ry0 - 34; // its top
    const rr = 20;

    b.setTurn((p, nn) => [[p[0] + rx, p[1], p[2] + z], nn]);
    b.revolveY({ y0: ry0 + 4, r0: 9, y1: ry0 - 4, r1: 9, n: [1, 0], m: MAT_PS_BODY, steps: 32 }); // its neck
    b.revolveY({ y0: ry0 - 4, r0: rr - 3, y1: ry0 - 6, r1: rr, n: [0.4, 0.9], m: MAT_PS_RES, steps: 48 });
    b.revolveY({ y0: ry0 - 6, r0: rr, y1: ryT + 4, r1: rr, n: [1, 0], m: MAT_PS_RES, steps: 48 });
    b.revolveY({ y0: ryT + 4, r0: rr, y1: ryT, r1: rr - 4, n: [0.5, -0.9], m: MAT_PS_RES, steps: 48 });
    for (const yy of [ry0 - 13, ry0 - 22]) b.revolveY({ y0: yy + 0.6, r0: rr + 0.5, y1: yy - 0.6, r1: rr + 0.5, n: [1, 0], m: MAT_PS_MARK, steps: 48 });
    // the cap
    b.revolveY({ y0: ryT, r0: 12, y1: ryT - 9, r1: 12, n: [1, 0], m: MAT_PS_CAP, steps: 40 });
    b.revolveY({ y0: ryT - 9, r0: 12, y1: ryT - 9, r1: 0, n: [0, -1], m: MAT_PS_CAP, steps: 40 });
    b.setTurn(null);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU;

      b.box(rx + 12 * Math.cos(a) - 1, rx + 12 * Math.cos(a) + 1, ryT - 8, ryT - 1, z + 12 * Math.sin(a) - 1, z + 12 * Math.sin(a) + 1, MAT_PS_CAP);
    }

    // the return: a barbed spigot out of the reservoir's outer side, the black hose on it, its clamp, and the hose back
    // toward the bulkhead
    const sp: FwVec3 = [rx, ry0 - 12, z - rr];

    b.prismDir(sp, [0, 0, -1], [1, 0, 0], [0, 1, 0], 5, 10, 20, 0, MAT_PS_RES, MAT_PS_RES);
    const ret = curveFromPoints([[rx, ry0 - 12, z - rr - 4], [rx, ry0 - 12, z - rr - 22], [rx + 20, ry0 - 4, z - rr - 34], [back + 4, ry0 + 6, z - rr - 38]], 3);

    sweepTube(b, ret, () => 6.4, MAT_HOSE_BLACK, { segments: 20 });
    b.prismDir([rx, ry0 - 12, z - rr - 8], [0, 0, -1], [1, 0, 0], [0, 1, 0], 7.6, 4, 28, 0, MAT_HOSE_CLAMP, MAT_HOSE_CLAMP);
    b.prismDir([rx, ry0 - 12 - 7.6, z - rr - 10], [0, -1, 0], [1, 0, 0], [0, 0, 1], 2.4, 4, 6, 0, MAT_HOSE_CLAMP, MAT_HOSE_CLAMP);

    // the high-pressure outlet, out of the body's outer side, low: a hex union, the banjo on it with its bolt, the pressure
    // switch beside it, and the steel line from the banjo back to the bulkhead, held by a clip on the body's bracket
    const oa = 2.6; // its angle round the body (toward the outside, below the middle)
    const od: FwVec3 = [0, Math.cos(oa), Math.sin(oa)];
    const op: FwVec3 = [fc + 22, y + (R + 2) * Math.cos(oa), z + (R + 2) * Math.sin(oa)];
    const ou: FwVec3 = [1, 0, 0];
    const ov: FwVec3 = cross(od, ou);

    b.prismDir(op, od, ou, ov, 8, 6, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE); // the union
    const bj: FwVec3 = [op[0], op[1] + od[1] * 10, op[2] + od[2] * 10]; // the banjo's eye

    b.prismDir([bj[0] - 6, bj[1], bj[2]], [1, 0, 0], ov, od, 7.5, 12, 24, 0, MAT_PUMP_MACH, MAT_PUMP_MACH);
    b.prismDir([bj[0] - 8, bj[1], bj[2]], [1, 0, 0], ov, od, 5.6, 2, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE); // its bolt's head
    const line = curveFromPoints([
      [bj[0] + 6, bj[1], bj[2]],
      [bj[0] + 18, bj[1] + 2, bj[2] - 2],
      [bj[0] + 26, bj[1] + 14, bj[2] - 10],
      [back - 6, bj[1] + 26, bj[2] - 18],
      [back + 6, bj[1] + 30, bj[2] - 20],
    ], 2);

    sweepTube(b, line, () => 3.1, MAT_PUMP_MACH, { segments: 14 });
    // the pressure switch, on the union, its plug and wire
    const ps: FwVec3 = [op[0] + 10, op[1] + od[1] * 2, op[2] + od[2] * 2];

    b.prismDir(ps, od, ou, ov, 5, 8, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
    b.prismDir([ps[0], ps[1] + od[1] * 8, ps[2] + od[2] * 8], od, ou, ov, 5.4, 9, 20, 0, MAT_PS_RES, MAT_PS_RES);
    const wire = curveFromPoints([[ps[0], ps[1] + od[1] * 17, ps[2] + od[2] * 17], [ps[0] + 6, ps[1] + od[1] * 26, ps[2] + od[2] * 26], [back + 2, ps[1] + od[1] * 30, ps[2] + od[2] * 30]], 3);

    sweepTube(b, wire, () => 1.6, MAT_HOSE_BLACK, { segments: 8 });

    // the bracket: two cast arms from the body's flanks back to the cover, bolted through, and the line's clip on one
    for (const side of [-1, 1]) {
      const ly = y + side * (R + 8);

      b.box(a1 - 22, back, ly - 6, ly + 6, z - 9, z + 9, MAT_PS_BODY);
      b.revolve({ x0: a1 - 23, r0: 2.6, x1: back, r1: 2.6, n: [0, 1], m: MAT_CT_NUT_SIDE, steps: 16, cy: ly, cz: z });
      frontBolt(b, a1 - 23, ly, z, 3.6);
    }

    b.box(back - 14, back - 8, bj[1] + 22, bj[1] + 32, bj[2] - 22, bj[2] - 12, MAT_HOSE_CLAMP); // (the clip)
  }

  // ---- the tensioner: a cast base bolted to the cover, a spring can on its pivot, the arm out to its pulley's spindle ----
  {
    const { y, z } = PULLEYS.idler;
    const py = y + 30; // the pivot, toward the crank
    const pz = z + 22;
    const x0 = behind + 3; // the arm's front
    const x1 = back; // its base on the cover

    // the spring can and the base, round the pivot
    b.revolve({ x0: x0 + 6, r0: 19, x1: x1, r1: 19, n: [0, 1], m: MAT_TENSIONER, steps: 64, cy: py, cz: pz });
    b.revolve({ x0: x0 + 6, r0: 0, x1: x0 + 6, r1: 19, n: [-1, 0], m: MAT_TENSIONER, steps: 64, cy: py, cz: pz });
    b.revolve({ x0: x0 + 5.9, r0: 0, x1: x0 + 5.9, r1: 9, n: [-1, 0], m: MAT_PUMP_MACH, steps: 32, cy: py, cz: pz });
    frontBolt(b, x0 + 5.8, py, pz, 5.6);

    // its stop and wear-indicator arrow, cast on the can's face
    b.box(x0 + 5, x0 + 6, py - 16, py - 12, pz - 1.5, pz + 1.5, MAT_TIMING_MARK);

    // the arm: a cast beam from the can to the pulley's spindle, in front of the belt's plane edge
    const dy = y - py;
    const dz = z - pz;
    const len = Math.hypot(dy, dz);
    const uy = dy / len;
    const uz = dz / len;
    const ny = -uz;
    const nz = uy;
    const w = 9;
    const xa = x0 + 6;
    const xb = behind + 12;
    const P = (t: number, s: number, x: number): FwVec3 => [x, py + uy * t + ny * s, pz + uz * t + nz * s];

    b.flatQuad(P(0, -w, xa), P(len, -w * 0.7, xa), P(len, w * 0.7, xa), P(0, w, xa), [-1, 0, 0], MAT_TENSIONER);
    b.flatQuad(P(0, w, xa), P(len, w * 0.7, xa), P(len, w * 0.7, xb), P(0, w, xb), [0, ny, nz], MAT_TENSIONER);
    b.flatQuad(P(0, -w, xa), P(len, -w * 0.7, xa), P(len, -w * 0.7, xb), P(0, -w, xb), [0, -ny, -nz], MAT_TENSIONER);

    // the spindle behind the pulley, back to the arm
    b.revolve({ x0: behind, r0: 8, x1: xb, r1: 8, n: [0, 1], m: MAT_PUMP_MACH, steps: 32, cy: y, cz: z });
  }
}

/* ---------------- the belt ---------------- */

// One piece of the belt, BELT_PIECE long along +y (a little more, so that the pieces close up round the pulleys): its back
// toward -z (the outside of the loop), and toward +z (the inside, the pulleys' side) a tooth: the poly-V ribs cut across
// by a notch at each end (a cogged belt), so that the ribs stand as a row of teeth, seen square in profile, their ends
// sloped. The teeth's end faces a metallic grey, to stand out from the black rubber round them. Across it, along x, BW
// wide about BELT_X
export function buildBeltPiece(b: B) {
  const L = BELT_PIECE * 1.03;
  const x0 = BELT_X - BW / 2;
  const x1 = BELT_X + BW / 2;
  const pitch = BW / RIBS;
  // the tooth along the piece: its base from t0 to t1, its crest drawn in by `ch` at each end
  const t0 = BELT_PIECE * 0.14;
  const t1 = BELT_PIECE * 0.86;
  const ch = BELT_PIECE * 0.16;

  // the back: a slab the whole length, its outer face woven, its edges cut, its inner face plain between the teeth
  b.flatQuad([x0, 0, -BACK_T], [x1, 0, -BACK_T], [x1, L, -BACK_T], [x0, L, -BACK_T], [0, 0, -1], MAT_BELT_BACK);
  b.flatQuad([x0, 0, -BACK_T], [x0, L, -BACK_T], [x0, L, 0], [x0, 0, 0], [-1, 0, 0], MAT_BELT_EDGE);
  b.flatQuad([x1, 0, -BACK_T], [x1, L, -BACK_T], [x1, L, 0], [x1, 0, 0], [1, 0, 0], MAT_BELT_EDGE);
  b.flatQuad([x0, 0, 0], [x1, 0, 0], [x1, t0, 0], [x0, t0, 0], [0, 0, 1], MAT_BELT_RIB, 0.55);
  b.flatQuad([x0, t1, 0], [x1, t1, 0], [x1, L, 0], [x0, L, 0], [0, 0, 1], MAT_BELT_RIB, 0.55);
  // (and between the ribs, under the tooth)
  for (let i = 0; i <= RIBS; i++) {
    const g0 = Math.max(x0, x0 + (i - 0.15) * pitch);
    const g1 = Math.min(x1, x0 + (i + 0.15) * pitch);

    if (g1 > g0) b.flatQuad([g0, t0, 0], [g1, t0, 0], [g1, t1, 0], [g0, t1, 0], [0, 0, 1], MAT_BELT_RIB, 0.45);
  }

  // the tooth: each rib a V-shaped prism, its flanks and crest black, its two ends sloped and metallic grey
  const yf = (z: number) => t0 + ch * (z / RIB_H);
  const yb = (z: number) => t1 - ch * (z / RIB_H);

  for (let i = 0; i < RIBS; i++) {
    const a = x0 + i * pitch;
    const sec: Array<[number, number]> = [
      [a + pitch * 0.15, 0],
      [a + pitch * 0.4, RIB_H],
      [a + pitch * 0.6, RIB_H],
      [a + pitch * 0.85, 0],
    ];

    for (let k = 0; k < 3; k++) {
      const [px, pz] = sec[k];
      const [qx, qz] = sec[k + 1];
      const nx = -(qz - pz);
      const nz = qx - px;
      const crest = k === 1;

      b.flatQuad([px, yf(pz), pz], [qx, yf(qz), qz], [qx, yb(qz), qz], [px, yb(pz), pz], [crest ? 0 : nx, 0, crest ? 1 : Math.abs(nz) + 0.2], MAT_BELT_RIB, crest ? 1 : 0.8);
    }

    // the two ends: trapezoids, sloped (their normals tipped toward the crest)
    const tilt = ch / RIB_H;

    for (const [yy, sign] of [[yf, -1], [yb, 1]] as Array<[(z: number) => number, number]>) {
      b.flatQuad(
        [sec[0][0], yy(sec[0][1]), sec[0][1]],
        [sec[1][0], yy(sec[1][1]), sec[1][1]],
        [sec[2][0], yy(sec[2][1]), sec[2][1]],
        [sec[3][0], yy(sec[3][1]), sec[3][1]],
        [0, sign, tilt],
        MAT_BELT_TOOTH
      );
    }
  }
}

/* ---------------- small vector helpers ---------------- */

function cross(a: FwVec3, c: FwVec3): FwVec3 {
  return [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
}

function normalize(a: FwVec3): FwVec3 {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;

  return [a[0] / l, a[1] / l, a[2] / l];
}
