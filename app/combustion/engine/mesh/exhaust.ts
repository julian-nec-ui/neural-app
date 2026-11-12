// The two turbocharger modules at the front, leaning with their banks; the exhaust runners over the top (a hot V), stubs, flanges and the exhaust pipes.

import { BANKS, CHAIN_X_WORLD, CT_X, FLYWHEEL_WORLD_X, HEAD_PORT_DZ, ORIENT, TAU, bankPoint, composeTurn } from "../core/constants";
import type { Bank } from "../core/constants";
import { vadd, vcross, vnorm, vscale, vsub } from "../math/vec3";
import type { FwVec3 } from "./builder";
import { MAT_ALU_TURNED, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_EXH_GUNMETAL, MAT_HDR_BLUE, MAT_HDR_BRONZE, MAT_HDR_FLANGE, MAT_HEAT_SHIELD, MAT_INJ_BRASS, MAT_PIPE_BLACK, MAT_STEEL_BRIGHT, MAT_WELD } from "./materials";
import { lobedPlate } from "./shapes";
import type { P2 } from "./shapes";
import { tintedStretches, weld } from "./plumbing";
import { collar, curveAt, curveFromPoints, ovalFlare, roundedCurve, subCurve, sweepTube } from "./tubes";
import type { Curve, MeshBuilder } from "./tubes";
import { HDR_CX, HDR_CZ, HDR_MOUTH_Y, PORT_Y, TURBO, turboWorld } from "./turbo";
import { INLET_FACING, INLET_MOUTH } from "./plumbing";
import { IN_SIDE } from "./valvetrain";

// ---- THE EXHAUST, ON THE OUTSIDE, FORWARD TO TWO TURBOCHARGERS AT THE FRONT (the cold V: the intake is in the V, on
// top of it, plumbing.ts). Each bank's exhaust leaves the head on its outer side, as a naturally aspirated racing V8's
// does. Its six ports lead into six runners that drop out and down beside the head into a collector low on the bank's
// outer side; from there one pipe runs forward along the bank and, at the front, rises in an arch over its compressor
// and comes down into the turbine's cone from above. Each turbocharger is set in its bank's own frame, so that it leans
// with the bank: its shaft across the bank, the turbine on the valley side under the cone, the compressor on the outer
// side. The runners of the front cylinders, nearest the turbocharger, run back to the collector first, so that the six
// are nearer one length and their pulses reach the turbine more evenly. ----
const TURBINE_B: FwVec3 = [CHAIN_X_WORLD - 150, -365, -40]; // the turbine's middle, in its bank's frame
const DOWNPIPE_Y = 262; // the level of the exhaust's run back under the engine, and of the silencers and tails: one line
export const TAIL_X = FLYWHEEL_WORLD_X + 140; // where they end, behind the flywheel
export const MODULE_ORIGIN: FwVec3 = [HDR_CX, HDR_MOUTH_Y - 40, HDR_CZ]; // a point over the cone, in the module's own frame

export type TModule = { bank: Bank; r: Float32Array; orientModule: number; orientTurbo: number; q: FwVec3 };

const mulR = (r: ArrayLike<number>, v: FwVec3): FwVec3 => [
  r[0] * v[0] + r[3] * v[1] + r[6] * v[2],
  r[1] * v[0] + r[4] * v[1] + r[7] * v[2],
  r[2] * v[0] + r[5] * v[1] + r[8] * v[2],
];

const sideOf = (bank: Bank) => (bank.phi > 0 ? -1 : 1); // B at +Z, A at -Z

// The module in its bank's frame: its shaft (its x) across the bank, the compressor toward the intake side; its y the
// bank's (the cone above the turbine); its z along the engine (the turbine ahead of the cone)
const MODULE_IN_BANK = [0, 0, -1, 0, 1, 0, 1, 0, 0];

export const MODULES: TModule[] = BANKS.map((bank: Bank, bi: number): TModule => {
  const t = mulR(MODULE_IN_BANK, [0, TURBO.y - MODULE_ORIGIN[1], TURBO.z - MODULE_ORIGIN[2]]); // the turbine, from the origin
  const qb: FwVec3 = [TURBINE_B[0] - t[0], TURBINE_B[1] - t[1], TURBINE_B[2] - t[2]];

  return {
    bank,
    r: composeTurn(bank.m, MODULE_IN_BANK),
    orientModule: ORIENT.MODULE_A + bi,
    orientTurbo: ORIENT.TURBO_A + bi,
    q: bankPoint(bank, qb[0], qb[1], qb[2]),
  };
});

// A point of the module's own frame, in the engine's
export function modulePoint(m: TModule, p: FwVec3): FwVec3 {
  const d = mulR(m.r, [p[0] - MODULE_ORIGIN[0], p[1] - MODULE_ORIGIN[1], p[2] - MODULE_ORIGIN[2]]);

  return [d[0] + m.q[0], d[1] + m.q[1], d[2] + m.q[2]];
}

// Each cone's mouth, at its top, where the runners come down into it, in the engine's frame
export const CONE_MOUTHS: FwVec3[] = MODULES.map((m) => modulePoint(m, INLET_MOUTH));
// and the way into each, in the engine's frame: forward, along the bank
const MOUTH_IN: FwVec3[] = MODULES.map((m) => vnorm(vsub(modulePoint(m, vsub(INLET_MOUTH, vscale(INLET_FACING, 10))), modulePoint(m, INLET_MOUTH))));

// The exhaust's side of each head: the outer one, the intake's being the valley's (valvetrain.ts, IN_SIDE)
const EX = -IN_SIDE;

// The flange plates at the ports: their inner face on the head's port face, their outer face PLATE_T out from it; out of
// each port a cone, the port's oval opening out to the round primary, FLARE_LEN long; the primary goes on from its end
const PLATE_T = 14;
const FACE = 97.4 + HEAD_PORT_DZ + PLATE_T; // the plates' outer face (drawn on the valley side, turned over)
const FLARE_LEN = 24;
const SZ = FACE + FLARE_LEN; // where the primary starts, straight out of its cone

// A stub, in a bank's own frame: straight out of the port, outward, to where the primary goes on from it
const STUB_END_Z = EX * SZ;
export const exhaustStub = (cx: number) => curveFromPoints([[cx, PORT_Y, EX * (104 + HEAD_PORT_DZ)], [cx, PORT_Y, STUB_END_Z]], 3);

// ---- THE HEADERS, after a Formula 1 V12's (Honda's RA121E): on each bank six primaries, each from its own small flange
// on its port, out, and in one long, smooth sweep down and forward, nested one inside the next: the front cylinder's,
// nearest the collector, the shortest and highest, each one behind it dropping a little lower and running a little
// further out, so that none crosses another. They come together, parallel, packed in two rows of three, into one
// 6-into-1 collector at the front of the bank, and the collector's cone runs on into the one pipe that rises in a broad
// arch onto the turbine's flange. Every pipe runs on from the one before it with no step: each goes in, a little way,
// past the mouth of the collector it is welded into. Wrapped in embossed heat shield ----
const PR = 25.5; // a primary's radius
const MAIN_R = 43.5; // the one pipe's, on to the turbine
export const runnerRadius = (_s: number) => PR;
const GAP = 2 * PR + 1.6; // the primaries' axes, side by side in the bundle
const ROW_Y = [PORT_Y + 126, PORT_Y + 126 + GAP]; // the bundle's two rows: the upper, the lower (in the bank's frame)
const COL_Z = [200, 200 + GAP, 200 + 2 * GAP]; // and its three columns, from the head outward
// each cylinder's place in the bundle: by pairs, front to rear, a column each, the rear one of each pair under the front
const SLOT = CT_X.map((_, c) => ({ y: ROW_Y[c % 2], z: COL_Z[Math.floor(c / 2)] }));
const YC = (ROW_Y[0] + ROW_Y[1]) / 2; // the collector's axis
const ZC = COL_Z[1];
const COLL_X = CT_X[0] - 50; // the collector's mouth, ahead of the front cylinder
const COLL_R0 = Math.hypot(GAP, GAP / 2) + PR + 3; // round the six
const COLL_LEN = 110; // its cone, from its mouth to the one pipe
const INSET = 12; // how far each pipe goes on, past the mouth of the collector it is welded into

export type BankRunners = {
  runners: Curve[]; // by cylinder: the whole way of its gas, from the stub to the one pipe (for the flow)
  collectors: Curve[]; // the one pipe, from the collector into the turbine's flange
  primaries: Curve[];
  merges: Curve[]; // the 6-into-1 collector's cone
};

export const EXHAUST_RUNNERS: BankRunners[] = BANKS.map((bank: Bank, bi: number) => {
  // a point of the bank's own frame, x as the cylinders' (the bank's shift along the engine added), z outward
  const B = (x: number, y: number, z: number): FwVec3 => bankPoint(bank, x + bank.dx, y, EX * z);
  const mouth = CONE_MOUTHS[bi];
  const inDir = MOUTH_IN[bi];

  const primaries = CT_X.map((x, c) => {
    const { y, z } = SLOT[c];
    // out of its cone, then down, and over in one sweep, out to its column, forward along the bundle
    const pts: FwVec3[] = [B(x, PORT_Y, SZ), B(x, PORT_Y, SZ + 30), B(c === 0 ? COLL_X + 40 : x - 85, y, z), B(COLL_X - INSET, y, z)];

    return roundedCurve(pts, c === 0 ? 40 : 85, 4);
  });

  const merges = [curveFromPoints([B(COLL_X, YC, ZC), B(COLL_X - COLL_LEN, YC, ZC)], 3)];

  // the one pipe: straight on out of the collector a little way, then up in a broad arch over the compressor, and down
  // square onto the turbine's flange: every bend round, the pipe running on from the collector with no step
  const inv = bank.mInv;
  const mb: FwVec3 = [mouth[0] - bank.dx, inv[4] * mouth[1] + inv[7] * mouth[2], inv[5] * mouth[1] + inv[8] * mouth[2]];
  const x0 = COLL_X - COLL_LEN;
  const main = roundedCurve([
    B(x0 + INSET, YC, ZC),
    B(x0 - 30, YC, ZC),
    B(Math.min(x0 - 40, mb[0] + 60), -540, (EX * mb[2] + ZC) / 2 + 30),
    vadd(mouth, vscale(inDir, -130)),
    mouth,
  ], 70, 4);
  const runners = primaries.map((p) => curveFromPoints([...p.pts, ...merges[0].pts, main.pts[0]], 4));

  return { runners, collectors: [main], primaries, merges };
});

// The exhaust: each turbine has its own pipe, all the way to its own silencer (an oval box, as a car's has), and on, out
// of its tail behind the flywheel. The two never meet
const MUFFLER = { x0: CT_X[3] - 20, x1: CT_X[5] - 90, r: 40, wide: 1.45, z: 78 }; // along, its height's half, how much wider than tall, out
const DOWN_R = 24;
const RIBS = 18; // the ribs round each turbine's pipe // each turbine's pipe
const TAIL_R = 22; // the tail pipes
const MUFFLER_Y = DOWNPIPE_Y;
const DOWN_Z = MUFFLER.z; // how far out from the middle each pipe runs, down the front and back under the engine: in line with its silencer
const DOWN_FRONT = -660; // the front of the engine, where they start down
const DOWN_BACK = -540; // and where they reach the run under it: they come down on a slant, back, the shorter way

// Each turbine's pipe: a little way straight out of the outlet, along its axis, then one broad, round bend, of a
// circle's arc, that turns it forward, out and down; down the front of the engine on a slant, back, and straight back
// under it into its silencer, on the same line, every bend a broad, easy curve
const OUT_STRAIGHT = 8; // how far straight out of the outlet before it bends
const OUT_BEND = 35; // the radius of that first bend: as broad as the room between the two turbines allows

export const TURBINE_PIPES = MODULES.map((m: TModule) => {
  const zs = sideOf(m.bank);
  const o = modulePoint(m, turboWorld([-135, 0, 0]));
  const d = vnorm(vsub(modulePoint(m, turboWorld([-155, 0, 0])), o));
  const e: FwVec3 = vadd(o, vscale(d, OUT_STRAIGHT));
  const target: FwVec3 = [DOWN_FRONT, e[1] + 110, zs * DOWN_Z];
  const t2 = vnorm(vsub(target, e)); // the way it goes after the bend
  const turn = Math.acos(Math.max(-1, Math.min(1, d[0] * t2[0] + d[1] * t2[1] + d[2] * t2[2])));
  const pts: FwVec3[] = [o, e];
  let p: FwVec3 = e;
  const steps = 24;
  const ds = (OUT_BEND * turn) / steps;

  // the bend: the direction swung evenly from the outlet's axis to the new way, the point following it
  for (let k = 1; k <= steps; k++) {
    const u = (k - 0.5) / steps;
    const sa = Math.sin((1 - u) * turn) / Math.sin(turn);
    const sb = Math.sin(u * turn) / Math.sin(turn);
    const dir = vnorm([d[0] * sa + t2[0] * sb, d[1] * sa + t2[1] * sb, d[2] * sa + t2[2] * sb]);

    p = vadd(p, vscale(dir, ds));
    pts.push(p);
  }

  const on: FwVec3 = vadd(p, vscale(t2, Math.max(60, Math.hypot(target[0] - p[0], target[1] - p[1], target[2] - p[2]) * 0.8)));
  const rest = roundedCurve([p, on, [DOWN_BACK, DOWNPIPE_Y, zs * DOWN_Z], [MUFFLER.x0 + 30, MUFFLER_Y, zs * MUFFLER.z]], 90, 4);

  return curveFromPoints([...pts, ...rest.pts.slice(1)], 4);
});

export const TAILS = BANKS.map((bank: Bank) => {
  const zs = sideOf(bank);

  return curveFromPoints([[MUFFLER.x1 - 30, MUFFLER_Y, zs * MUFFLER.z], [TAIL_X, MUFFLER_Y, zs * MUFFLER.z]], 5);
});

// The whole way of each bank's gas, from its turbine to the tail: for the air bodies
export const DOWNPIPES = BANKS.map((_, bi) => curveFromPoints([...TURBINE_PIPES[bi].pts, ...TAILS[bi].pts], 5));

export function buildDownpipes(b: MeshBuilder) {
  const stainless = (pipe: Curve, r: (q: number) => number, from: number, to: number) => {
    const t = pipe.total;
    const base = (q: number) => {
      const u = from + (to - from) * (q / t); // how far along the whole way, 0 at the turbine, 1 at the tail

      return u < 0.12 ? MAT_HDR_BLUE : u < 0.34 ? MAT_HDR_BRONZE : MAT_STEEL_BRIGHT;
    };

    for (const [s0, s1, mat] of tintedStretches(0, t, [], base)) {
      sweepTube(b, subCurve(pipe, s0, s1, 3), (q: number) => r(s0 + q * (s1 - s0)), mat, { segments: 32 });
    }
  };

  // each tail, out of its silencer (the pipes from the turbines to the silencers are solid: buildTurbineArc)
  for (const tail of TAILS) {
    stainless(tail, () => TAIL_R, 0.9, 1);

    // the tail's tip: a wider, rolled, double-walled end, cut square
    const t = tail.total;

    collar(b, tail, t - 52, TAIL_R, TAIL_R + 7, 3, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
    sweepTube(b, subCurve(tail, t - 50, t, 3), () => TAIL_R + 7, MAT_STEEL_BRIGHT, { segments: 36 });
    collar(b, tail, t - 2, TAIL_R + 1, TAIL_R + 8, 3, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
  }

  buildMufflers(b);
}

// The silencers: each an oval box of brushed stainless, its two ends pressed in with a rolled seam, a seam along its
// bottom, two straps that hang it, a cone at each end into its pipes, and a maker's plate
function buildMufflers(b: MeshBuilder) {
  const { x0, x1, r, wide, z } = MUFFLER;
  const steps = 56;

  for (const zs of [-1, 1]) {
    const zc = zs * z;
    // an oval: a revolve about x, squashed in y and stretched in z, and moved to its place
    b.setTurn((p, n) => {
      const ny = n[1];
      const nz = n[2] / wide;
      const len = Math.hypot(n[0], ny, nz) || 1;

      return [[p[0], MUFFLER_Y + p[1], zc + p[2] * wide], [n[0] / len, ny / len, nz / len]];
    });

    b.revolve({ x0: x0 + 10, r0: r, x1: x1 - 10, r1: r, n: [0, 1], m: MAT_STEEL_BRIGHT, steps });

    for (const [xe, dir] of [[x0, -1], [x1, 1]] as Array<[number, number]>) {
      // the rolled seam where the end is pressed on, and the end, dished in a little
      b.revolve({ x0: xe + -dir * 10, r0: r, x1: xe + -dir * 4, r1: r + 2.4, n: [0, 1], m: MAT_HDR_BRONZE, steps });
      b.revolve({ x0: xe + -dir * 4, r0: r + 2.4, x1: xe, r1: r - 2, n: [dir * 0.6, 0.8], m: MAT_STEEL_BRIGHT, steps });
      b.revolve({ x0: xe, r0: r - 2, x1: xe + dir * 4, r1: TAIL_R + 6, n: [dir * 0.85, 0.5], m: MAT_STEEL_BRIGHT, steps });
    }

    // the straps that hang it, wrapped round
    for (const xs of [x0 + 70, x1 - 70]) {
      b.revolve({ x0: xs - 6, r0: r + 1.6, x1: xs + 6, r1: r + 1.6, n: [0, 1], m: MAT_PIPE_BLACK, steps });
    }

    b.setTurn(null);

    // a seam along its bottom, and the maker's plate on its side
    b.box(x0 + 12, x1 - 12, MUFFLER_Y + r - 1, MUFFLER_Y + r + 1.6, zc - 2, zc + 2, MAT_HDR_BRONZE);
    b.box((x0 + x1) / 2 - 40, (x0 + x1) / 2 + 40, MUFFLER_Y - 14, MUFFLER_Y + 14, zc + zs * (r * wide), zc + zs * (r * wide + 1.6), MAT_PIPE_BLACK);
    b.box((x0 + x1) / 2 - 34, (x0 + x1) / 2 + 34, MUFFLER_Y - 3, MUFFLER_Y + 3, zc + zs * (r * wide + 1.5), zc + zs * (r * wide + 2.2), MAT_STEEL_BRIGHT);
  }
}

// A smooth swell from r0 down to r1 along a body of length L
const swell = (r0: number, r1: number) => (u: number) => {
  const k = Math.min(1, Math.max(0, u));

  return r1 + (r0 - r1) * (1 - k * k * (3 - 2 * k));
};

// The primaries, wrapped in heat shield
export function buildExhaustLogs(b: MeshBuilder) {
  for (const bank of EXHAUST_RUNNERS) {
    for (const p of bank.primaries) sweepTube(b, p, () => PR, MAT_HEAT_SHIELD, { segments: 30 });
  }
}

// The collector and the one pipe on into the turbine: wrapped in heat shield too
export function buildTurboFeed(b: MeshBuilder) {
  for (const bank of EXHAUST_RUNNERS) {
    for (const m of bank.merges) sweepTube(b, m, swell(COLL_R0, MAIN_R), MAT_HEAT_SHIELD, { segments: 64, capStart: true });
    sweepTube(b, bank.collectors[0], () => MAIN_R, MAT_HEAT_SHIELD, { segments: 40 });
  }
}

// An oxygen sensor's bung, welded on a pipe at s and standing out of it toward `out`: a round boss, and the sensor's hex
// and body screwed in (or its plug)
function o2Bung(b: MeshBuilder, pipe: Curve, s: number, r: number, out: FwVec3, sensor: boolean) {
  const at: FwVec3 = [0, 0, 0];
  const dir: FwVec3 = [0, 0, 0];

  curveAt(pipe, s, at, dir);

  const d = vnorm(vsub(out, vscale(dir, out[0] * dir[0] + out[1] * dir[1] + out[2] * dir[2])));
  const e1 = vnorm(vcross(d, Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  const e2 = vcross(d, e1);
  const base = vadd(at, vscale(d, r - 4));

  b.prismDir(base, d, e1, e2, 9, 10, 24, 0, MAT_HDR_FLANGE, MAT_HDR_FLANGE);
  b.prismDir(vadd(base, vscale(d, 10)), d, e1, e2, 7.4, 1.2, 20, 0, MAT_PIPE_BLACK, MAT_PIPE_BLACK);
  b.prismDir(vadd(base, vscale(d, 11.2)), d, e1, e2, 7.2, 6, 6, 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);

  if (sensor) {
    const top = vadd(base, vscale(d, 17.2));

    b.prismDir(top, d, e1, e2, 4.8, 22, 16, 0, MAT_PIPE_BLACK, MAT_PIPE_BLACK);
    sweepTube(b, roundedCurve([vadd(top, vscale(d, 22)), vadd(top, vscale(d, 34)), vadd(vadd(top, vscale(d, 40)), vscale(dir, 30))], 10, 3), () => 1.6, MAT_PIPE_BLACK, { segments: 8, capEnd: true });
  }
}

// Solid on every view: the welds where the pipes meet, the oxygen sensors' bungs
export function buildManifoldWelds(b: MeshBuilder) {
  for (const [bi, bank] of EXHAUST_RUNNERS.entries()) {
    const bk = BANKS[bi];
    const out = vnorm(vsub(bankPoint(bk, 0, -0.35, EX), bankPoint(bk, 0, 0, 0)));

    // where each pipe goes into the mouth of the cone it is welded into, and where each cone runs into its pipe
    for (const p of bank.primaries) weld(b, p, p.total - INSET, PR);
    for (const m of bank.merges) weld(b, m, COLL_LEN - 2, MAIN_R);

    // and on the one pipe: a sensor, and a second bung beside it, plugged
    const main = bank.collectors[0];

    o2Bung(b, main, 50, MAIN_R, out, true);
    o2Bung(b, main, 96, MAIN_R, out, false);
  }
}

// Each turbine's own pipe, from its outlet to its silencer, solid, one dark grey metal, welded on at the turbine and at
// the silencer
export function buildTurbineArc(b: MeshBuilder) {
  for (const p of TURBINE_PIPES) {
    // closed at the turbine, so that no hole shows through its see-through housing; and its weld there, only the half
    // that faces out of the housing, where it can be seen
    sweepTube(b, p, () => DOWN_R, MAT_EXH_GUNMETAL, { segments: 40, capStart: true });
    weld(b, p, 1.6, DOWN_R, [-0.85, -0.5, 0]);
    weld(b, p, p.total - 1.6, DOWN_R);

    // ribs along it, in relief, from the turbine to the silencer: bright aluminium beads lying along the dark pipe, evenly
    // round it, following its every bend (a frame carried along the pipe without twisting keeps each on its own line)
    const pts = p.pts.slice(6, p.pts.length - 5);
    const frames: Array<[FwVec3, FwVec3, FwVec3]> = [];
    let t0 = vnorm(vsub(pts[1], pts[0]));
    let n0 = vnorm(vcross(t0, Math.abs(t0[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));

    for (let i = 0; i < pts.length; i++) {
      const t = vnorm(vsub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      const d = n0[0] * t[0] + n0[1] * t[1] + n0[2] * t[2];

      n0 = vnorm(vsub(n0, vscale(t, d)));
      frames.push([pts[i], n0, vcross(t, n0)]);
      t0 = t;
    }

    for (let k = 0; k < RIBS; k++) {
      const a = (k / RIBS) * TAU;
      const rib = frames.map(([c, e1, e2]) => vadd(c, vadd(vscale(e1, Math.cos(a) * (DOWN_R + 0.4)), vscale(e2, Math.sin(a) * (DOWN_R + 0.4)))));

      sweepTube(b, curveFromPoints(rib, 4), () => 1.6, MAT_ALU_TURNED, { segments: 8, capStart: true, capEnd: true });
    }

    void t0;
  }
}

// The stubs: from each port to the primary, wrapped as it is
export function buildExhaustStubs(b: MeshBuilder) {
  for (const cx of CT_X) {
    sweepTube(b, exhaustStub(cx), () => PR - 1, MAT_HEAT_SHIELD, { segments: 28 });
  }
}

const FLARE_OVAL = { x: 30, y: 23 }; // the oval the cone starts from, at the flange's face: the port's shape

function portFlare(b: MeshBuilder, cx: number) {
  const z0 = -FACE;

  ovalFlare(b, cx, PORT_Y, z0, -FLARE_LEN - 1, FLARE_OVAL.x, FLARE_OVAL.y, PR, MAT_HEAT_SHIELD);

  // the bead along the oval at the face: TIG ripples
  const ring: FwVec3[] = [];

  for (let i = 0; i <= 96; i++) {
    const th = (i / 96) * TAU;

    ring.push([cx + (FLARE_OVAL.x + 0.8) * Math.cos(th), PORT_Y + (FLARE_OVAL.y + 0.8) * Math.sin(th), z0 - 1.6]);
  }

  const bead = curveFromPoints(ring, 1.2);

  sweepTube(b, bead, (u) => 2.1 + 0.5 * Math.sin((u * bead.total) / 3.4 * TAU), MAT_WELD, { segments: 8 });
}

// A port's own flange, as on the Formula 1 engine: a small, thick plate, a rounded oblong round the port, with an ear at
// each upper corner for its two studs
function portFlange(x: number): { outline: P2[]; bolts: P2[] } {
  const hw = 40; // its half width, along the head
  const hh = 31; // its half height
  const rc = 14; // its corners' rounding
  const ears: Array<[number, number]> = [[x - 33, PORT_Y - 22], [x + 33, PORT_Y - 22]];
  const pts: P2[] = [];

  for (const [cx, cy, a0] of [[hw - rc, hh - rc, 0], [-(hw - rc), hh - rc, Math.PI / 2], [-(hw - rc), -(hh - rc), Math.PI], [hw - rc, -(hh - rc), Math.PI * 1.5]] as Array<[number, number, number]>) {
    // at the two upper corners, the ears: rounder, standing out a little
    const ear = cy < 0;
    const r = ear ? rc + 4 : rc;

    for (let k = 0; k <= 10; k++) {
      const a = a0 + (k / 10) * (Math.PI / 2);

      pts.push([x + cx + r * Math.cos(a) + (ear ? Math.sign(cx) * 2 : 0), PORT_Y + cy + r * Math.sin(a) - (ear ? 2 : 0)]);
    }
  }

  return { outline: pts, bolts: ears };
}

export function buildExhaustFlanges(b: MeshBuilder) {
  // (drawn as on the valley side, and turned over, square across the bank, on to the exhaust's side)
  const flip = EX > 0;

  for (const x of CT_X) {
    const { outline, bolts } = portFlange(x);

    // the plate: built facing +z, from the head out, turned so that its face is toward -z
    b.setTurn((p, n) => {
      const z = -(FACE - PLATE_T) - p[2];

      return [[p[0], p[1], flip ? -z : z], [n[0], n[1], flip ? n[2] : -n[2]]];
    });
    lobedPlate(b, outline, 0, PLATE_T, 2.2, MAT_HDR_FLANGE);
    b.setTurn(flip ? (p, n) => [[p[0], p[1], -p[2]], [n[0], n[1], -n[2]]] : null);

    // its two studs: a brass nut on each, as on the photograph's
    for (const [bx, by] of bolts) {
      b.prismDir([bx, by, -FACE], [0, 0, -1], [1, 0, 0], [0, 1, 0], 8.2, 1.2, 20, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
      b.prismDir([bx, by, -FACE - 1.2], [0, 0, -1], [1, 0, 0], [0, 1, 0], 6.6, 6.5, 6, 0.3 * bx, MAT_INJ_BRASS, MAT_INJ_BRASS);
      b.prismDir([bx, by, -FACE - 7.7], [0, 0, -1], [1, 0, 0], [0, 1, 0], 3.2, 3, 14, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
    }
  }

  for (const cx of CT_X) portFlare(b, cx);

  b.setTurn(null);
}
  