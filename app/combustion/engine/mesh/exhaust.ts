// The two turbocharger modules at the front, leaning with their banks; the exhaust runners over the top (a hot V), stubs, flanges and the exhaust pipes.

import { BANKS, CT_X, FLYWHEEL_WORLD_X, HEAD_PORT_DZ, ORIENT, TAU, bankPoint, composeTurn } from "../core/constants";
import type { Bank } from "../core/constants";
import { vadd, vcross, vnorm, vscale, vsub } from "../math/vec3";
import type { FwVec3 } from "./builder";
import { MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_HDR_BLUE, MAT_HDR_BRONZE, MAT_HDR_FLANGE, MAT_HEAT_SHIELD, MAT_INJ_BRASS, MAT_PIPE_BLACK, MAT_MUFFLER_WIRE, MAT_SHIELD_STREAK, MAT_STEEL_BRIGHT, MAT_WELD } from "./materials";
import { lobedPlate } from "./shapes";
import type { P2 } from "./shapes";
import { tintedStretches, weld } from "./plumbing";
import { collar, curveAt, curveFromPoints, flangeJoint, ovalFlare, roundedCurve, subCurve, sweepTube } from "./tubes";
import type { Curve, MeshBuilder } from "./tubes";
import { HDR_CX, HDR_CZ, HDR_MOUTH_Y, PORT_Y, turboWorld } from "./turbo";
import { INLET_MOUTH } from "./plumbing";
import { IN_SIDE } from "./valvetrain";

// ---- THE EXHAUST, ON THE OUTSIDE, FORWARD TO TWO TURBOCHARGERS AT THE FRONT (the cold V: the intake is in the V, on
// top of it, plumbing.ts). Each bank's exhaust leaves the head on its outer side, as a naturally aspirated racing V8's
// does. Its six ports lead into six runners that drop out and down beside the head into a collector low on the bank's
// outer side; from there one pipe runs forward along the bank and, at the front, rises in an arch over its compressor
// and comes down into the turbine's cone from above. Each turbocharger is set in its bank's own frame, so that it leans
// with the bank: its shaft across the bank, the turbine on the valley side under the cone, the compressor on the outer
// side. The runners of the front cylinders, nearest the turbocharger, run back to the collector first, so that the six
// are nearer one length and their pulses reach the turbine more evenly. ----
// The turbochargers, one on each bank's outer side, half way along the engine, their shafts along it (parallel to the V):
// the compressor toward the front, the turbine toward the back. Where its turbine's inlet flange stands, in the bank's
// frame (x along the engine, y down the bank, z out): the headers' two groups meet over it, the front three coming back
// and the rear three forward
export const TURBO_MID_X = (CT_X[2] + CT_X[3]) / 2;
export const TURBO_SHIFT = 50; // the turbocharger and its flange moved forward, toward the intercooler, from the middle of the bank: the pipe down from the turbine bends back to the silencer more gently
// how far the turbochargers (and the flange each sits on) stand out from the block: clear of its sides, a small gap
// between, since they were grown. The collectors' joints stay where they were (JOINT_IN takes it back): only the Y's
// branches reach further out, to the flange
export const TURBO_OUT = 62;
export const FLANGE_B: FwVec3 = [TURBO_MID_X - TURBO_SHIFT, -130, 245 + TURBO_OUT];
const JOINT_X = TURBO_MID_X; // the two collectors' joints stay where they were, either side of the bank's middle: the Y's branches reach to the flange
const DOWNPIPE_Y = 262; // the level of the exhaust's run back under the engine, and of the silencers and tails: one line
export const TAIL_X = FLYWHEEL_WORLD_X + 140; // where they end, behind the flywheel
export const MODULE_ORIGIN: FwVec3 = [HDR_CX, HDR_MOUTH_Y - 40, HDR_CZ]; // a point over the cone, in the module's own frame

export type TModule = { bank: Bank; r: Float32Array; orientModule: number; orientTurbo: number; q: FwVec3 };

const mulR = (r: ArrayLike<number>, v: FwVec3): FwVec3 => [
  r[0] * v[0] + r[3] * v[1] + r[6] * v[2],
  r[1] * v[0] + r[4] * v[1] + r[7] * v[2],
  r[2] * v[0] + r[5] * v[1] + r[8] * v[2],
];

const EX_SIDE = -IN_SIDE; // the exhaust's side of a bank's frame
const sideOf = (bank: Bank) => (bank.phi > 0 ? -1 : 1); // B at +Z, A at -Z

// The module in its bank's frame: its shaft (its x) along the engine, the compressor toward the front; its y the bank's
// (the inlet flange on top of the turbine); its z the bank's, out
const MODULE_IN_BANK = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export const MODULES: TModule[] = BANKS.map((bank: Bank, bi: number): TModule => {
  const t = mulR(MODULE_IN_BANK, [INLET_MOUTH[0] - MODULE_ORIGIN[0], INLET_MOUTH[1] - MODULE_ORIGIN[1], INLET_MOUTH[2] - MODULE_ORIGIN[2]]);
  const qb: FwVec3 = [FLANGE_B[0] + bank.dx - t[0], FLANGE_B[1] - t[1], EX_SIDE * FLANGE_B[2] - t[2]];

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

// ---- THE HEADERS, after a Formula 1 V12's (Honda's RA121E), feeding a turbocharger on the bank's side, half way along:
// on each bank two groups of three, the front three and the rear three. Each primary leaves its port by its own small
// flange, drops close down the side of the block and sweeps toward the middle of the engine, the three of a group
// gathering, parallel, packed in a triangle, into the mouth of their 3-into-1 collector, which points down and in toward
// the middle. All six are one length, the longest's: each nearer one swings out from the block in a broad bulge as it
// drops, as far as it takes, so that every cylinder's pulse takes as long to reach the turbine (a balanced, equal-length
// manifold). Each collector ends in a bolted flange joint; past it the two branches of a cast Y bend down and run
// together into the one short neck on the turbine's flange. Every pipe goes on, a little way, past the mouth it is welded
// into: no step, no gap. Wrapped in embossed heat shield ----
const PR = 25.5; // a primary's radius
const SEC_R = 34; // a collector's end, the joint, and the Y's branches
const MAIN_R = 43.5; // the Y's neck onto the turbine
export const runnerRadius = (_s: number) => PR;
const PACK = (2 * PR) / Math.sqrt(3) + 1.2; // how far each of the three, packed in their triangle, is from its middle
const COLL_R0 = PACK + PR + 3; // a collector's mouth: round the three
const COLL_LEN = 84; // its cone
const INSET = 12; // how far each pipe goes on, past the mouth it is welded into
const NECK = 54; // the Y's neck, down onto the flange
const JOINT_DX = 74; // each flange joint, how far ahead of and behind the flange
// the primaries' shape: the straight run into each collector's mouth; where each leaves its port's cone (down, out); how
// far along and out the far one's middle swings; how far out the near one's; the straight lead out of the cone; the bends'
// radius (broad, so that the pipes run smooth and short)
const PRE_LEN = 40;
const OUT_DY = 6;
const OUT_DZ = 26;
const FAR_DX = 110;
const FAR_Z = 170;
const NEAR_Z = 15;
const JOINT_IN = 30 + TURBO_OUT; // the collectors and their joints, drawn in this much nearer the block than the turbine's flange: the pipes hug the block, the Y's branches easing out again to the flange
const MID_Z = 30; // how far out the middle pipe swings
const LEAD = 10;
const BEND_R = 70;
const FRONT_UP = 30; // the front collector's joint (the three from the radiator's end), raised this much more, clear of the turbine's flange below it
const JOINT_UP = 80; // and how far above it
const COLL_TILT = 0.44; // a collector's axis, from level: pointing down and in

export type BankRunners = {
  runners: Curve[]; // by cylinder: the whole way of its gas, from the stub to the turbine (for the flow)
  collectors: Curve[]; // the Y's neck, down into the turbine's flange
  primaries: Curve[];
  merges: Curve[]; // the two 3-into-1 collectors' cones, front and rear
  branches: Curve[]; // the Y's two branches, from the joints down into the neck
  joints: Array<{ at: FwVec3; dir: FwVec3 }>; // the bolted flange joints between the collectors and the Y
};

export const EXHAUST_RUNNERS: BankRunners[] = BANKS.map((bank: Bank, bi: number) => {
  // a point of the bank's own frame, x as the cylinders' (the bank's shift along the engine added), z outward
  const B = (x: number, y: number, z: number): FwVec3 => bankPoint(bank, x + bank.dx, y, EX * z);
  const [fx, fy, fz] = FLANGE_B;

  // the Y's neck: straight down into the flange
  const neckTop: [number, number, number] = [fx, fy - NECK, fz];
  const collectors = [curveFromPoints([B(neckTop[0], neckTop[1], neckTop[2]), CONE_MOUTHS[bi]], 3)];

  const merges: Curve[] = [];
  const branches: Curve[] = [];
  const joints: Array<{ at: FwVec3; dir: FwVec3 }> = [];
  const primaries: Curve[] = new Array(6);

  for (const g of [0, 1]) {
    const s = g === 0 ? -1 : 1; // the front group's on the front side
    // the joint, and the collector's axis up from it, away from the middle, steep
    const J: FwVec3 = [JOINT_X + s * JOINT_DX, fy - JOINT_UP - (s < 0 ? FRONT_UP : 0), fz - JOINT_IN];
    const ax: [number, number] = [s * Math.cos(COLL_TILT), -Math.sin(COLL_TILT)]; // from the joint up to the mouth, in x, y
    const M: FwVec3 = [J[0] + ax[0] * COLL_LEN, J[1] + ax[1] * COLL_LEN, fz - JOINT_IN];
    const merge = curveFromPoints([B(M[0], M[1], M[2]), B(J[0], J[1], J[2])], 3);

    merges.push(merge);
    joints.push({ at: B(J[0], J[1], J[2]), dir: vnorm(vsub(B(J[0], J[1], J[2]), B(M[0], M[1], M[2]))) });

    // the branch: on from the joint, along the collector's axis a little, and round, down into the neck's top
    branches.push(roundedCurve([
      B(J[0], J[1], J[2]),
      B(J[0] - ax[0] * 30, J[1] - ax[1] * 30, J[2]),
      B(fx + s * 14, neckTop[1] - 34, fz - JOINT_IN * 0.4), // (and out again, gently, to the turbine's flange)
      B(fx + s * 6, neckTop[1] + INSET, fz),
    ], 34, 3));

    for (let i = 0; i < 3; i++) primaries[3 * g + i] = rebuild(3 * g + i, g, 0);
  }

  // all six made one length, the longest's: each shorter one bulges out until it is
  const target = Math.max(...primaries.map((p) => p.total));

  for (let c = 0; c < 6; c++) {
    if (target - primaries[c].total < 2) continue;

    const g = c < 3 ? 0 : 1;
    let lo = 0;
    let hi = 500;
    const make = (bul: number) => rebuild(c, g, bul);

    for (let k = 0; k < 28; k++) {
      const m = (lo + hi) / 2;

      if (make(m).total < target) lo = m;
      else hi = m;
    }

    primaries[c] = make((lo + hi) / 2);
  }

  // a primary: out of its port, then down the block's side in a broad sweep, into its place in its collector's mouth, the
  // last stretch along the collector's axis; `bulge` swings it out from the block as it drops. Its place in the mouth, in
  // the triangle across the axis: the far cylinder's on the block's side, the middle one's out, the near one's toward the
  // middle
  function rebuild(c: number, g: number, bulge: number) {
    const s = g === 0 ? -1 : 1;
    const J: FwVec3 = [JOINT_X + s * JOINT_DX, fy - JOINT_UP - (s < 0 ? FRONT_UP : 0), fz - JOINT_IN];
    const ax: [number, number] = [s * Math.cos(COLL_TILT), -Math.sin(COLL_TILT)];
    const M: FwVec3 = [J[0] + ax[0] * COLL_LEN, J[1] + ax[1] * COLL_LEN, fz - JOINT_IN];
    const e1: [number, number] = [-ax[1], ax[0]];
    const k = g === 0 ? c % 3 : 2 - (c % 3); // 0 the far cylinder (inner place), 2 the near one (outer)
    const [a, b2] = [[-0.5, -0.866], [1, 0], [-0.5, 0.866]][k];
    const up = e1[1] < 0 ? 1 : -1; // (so that the middle one's place is the top of the triangle)
    const t: FwVec3 = [M[0] + e1[0] * a * PACK * up, M[1] + e1[1] * a * PACK * up, M[2] + b2 * PACK];
    const x = CT_X[c];
    const pre: FwVec3 = [t[0] + ax[0] * PRE_LEN, t[1] + ax[1] * PRE_LEN, t[2]];
    const end: FwVec3 = [t[0] - ax[0] * INSET, t[1] - ax[1] * INSET, t[2]];
    const out: FwVec3 = [x, PORT_Y + OUT_DY, SZ + OUT_DZ];
    // the far one drops first, close down the block, under the middle one's way, and runs in low; the nearer ones swing
    // out from the block as they drop, as far as it takes to make them as long
    // (the middle one swings away from the engine's middle, over the far one; the near one, out from the block)
    const mid: FwVec3 = k === 0
      ? [x - s * FAR_DX, pre[1] + 26, FAR_Z + bulge]
      : k === 1
        ? [(out[0] + pre[0]) / 2 + s * bulge, out[1] + 8 - (g === 0 ? 25 : 0), (out[2] + pre[2]) / 2 + MID_Z] // (the front group's, higher: its joint is)
        : [(out[0] + pre[0]) / 2, (out[1] + pre[1]) / 2 + 12, pre[2] + NEAR_Z + bulge];

    // (it starts a little inside its cone, and runs on straight out of it before it bends: one smooth skin, no crease)
    return roundedCurve([B(x, PORT_Y, SZ - 6), B(x, PORT_Y, SZ + LEAD), B(out[0], out[1], out[2]), B(mid[0], mid[1], mid[2]), B(pre[0], pre[1], pre[2]), B(end[0], end[1], end[2])], BEND_R, 4);
  }

  const runners = primaries.map((p, c) => {
    const g = c < 3 ? 0 : 1;

    return curveFromPoints([...p.pts, ...merges[g].pts, ...branches[g].pts, CONE_MOUTHS[bi]], 4);
  });

  return { runners, collectors, primaries, merges, branches, joints };
});

// The exhaust: each turbine has its own pipe, all the way to its own silencer (an oval box, as a car's has), and on, out
// of its tail behind the flywheel. The two never meet
const MUFFLER = { x0: CT_X[4] + 20, x1: CT_X[5] + 110, r: 40, wide: 1.45, z: 78 }; // along, its height's half, how much wider than tall, out
const DOWN_R = 24;
const TAIL_R = 22; // the tail pipes
const MUFFLER_Y = DOWNPIPE_Y;
const DOWN_Z = MUFFLER.z; // how far out from the middle each pipe runs under the engine: in line with its silencer

// Each turbine's pipe: straight back out of the outlet a little way, along the shaft, then in one broad bend down and in,
// under the engine, and straight back into its silencer, every bend a broad, easy curve
export const TURBINE_PIPES = MODULES.map((m: TModule) => {
  const zs = sideOf(m.bank);
  const o = modulePoint(m, turboWorld([-135, 0, 0]));
  const d = vnorm(vsub(modulePoint(m, turboWorld([-155, 0, 0])), o));
  // (out of the turbine's flange straight on, along the shaft, a good way; then a broad S: a long bend down, past the dry
  // sump's pump on its outer side, and a long bend back the other way, under the starter, in to the silencer. No bend is
  // sharp: each one is turned over a wide radius)
  const outZ = zs * 206;

  return roundedCurve([
    o, vadd(o, vscale(d, 72)), // straight on, longer, toward the starter's solenoid
    [o[0] + 124, 150, outZ],
    [o[0] + 154, 228, zs * 200],
    [MUFFLER.x0 - 40, MUFFLER_Y, zs * DOWN_Z],
    [MUFFLER.x0 + 30, MUFFLER_Y, zs * DOWN_Z],
  ], 104, 6);
});

export const TAILS = BANKS.map((bank: Bank) => {
  const zs = sideOf(bank);

  return curveFromPoints([[MUFFLER.x1 - 30, MUFFLER_Y, zs * MUFFLER.z], [TAIL_X, MUFFLER_Y, zs * MUFFLER.z]], 5);
});

// The whole way of each bank's gas, from its turbine to the tail: for the air bodies
export const DOWNPIPES = BANKS.map((_, bi) => curveFromPoints([...TURBINE_PIPES[bi].pts, ...TAILS[bi].pts], 5));

export function buildDownpipes(b: MeshBuilder, bi: number) {
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

  // (the tails are drawn with the silencers, solid: buildMufflerPart)
  void stainless;
  void bi;

}

// The silencers, both: drawn solid on the plain and the see-through engine alike, as polished steel boxes wrapped in a
// woven sleeve of grey metal wire
export function buildMufflerPart(b: MeshBuilder) {
  for (const side of [-1, 1]) buildMufflers(b, side);

  // and the tails out of them: plain grey metal, the silencers' own, solid, no sleeve; the tip a wider rolled end
  for (const tail of TAILS) {
    const t = tail.total;

    sweepTube(b, tail, () => TAIL_R, MAT_MUFFLER_WIRE, { segments: 40 });
    collar(b, tail, t - 52, TAIL_R, TAIL_R + 7, 3, MAT_MUFFLER_WIRE, MAT_MUFFLER_WIRE);
    sweepTube(b, subCurve(tail, t - 50, t, 3), () => TAIL_R + 7, MAT_MUFFLER_WIRE, { segments: 40 });
    collar(b, tail, t - 2, TAIL_R + 1, TAIL_R + 8, 3, MAT_MUFFLER_WIRE, MAT_MUFFLER_WIRE);
  }
}

// The silencers: each an oval box of brushed stainless, its two ends pressed in with a rolled seam, a seam along its
// bottom, two straps that hang it, a cone at each end into its pipes, and a maker's plate
function buildMufflers(b: MeshBuilder, side: number) {
  const { x0, x1, r, wide, z } = MUFFLER;
  const steps = 56;

  for (const zs of [side]) {
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

    // the woven sleeve over its body: two sets of wires wound round it in opposite helices, crossing, each wire a
    // little proud of the skin, over and under the other set, between the two rolled seams
    {
      const WIRES = 28; // round it, in each set
      const lead = 180; // how far along a wire goes for one turn round
      const xa = x0 + 12;
      const xb = x1 - 12;
      const rr = r + 0.9;

      for (const hand of [-1, 1]) {
        for (let w = 0; w < WIRES; w++) {
          const pts: FwVec3[] = [];
          const steps = Math.ceil((xb - xa) / 3);

          for (let k = 0; k <= steps; k++) {
            const x = xa + ((xb - xa) * k) / steps;
            const th = (w / WIRES) * TAU + (hand * (x - xa) / lead) * TAU;
            // over and under: the radius rises and falls as it crosses the other set's wires
            const weave = 0.35 * Math.sin(th * WIRES * 0.5 + hand * (x - xa) * 0.9);

            pts.push([x, (rr + weave) * Math.cos(th), (rr + weave) * Math.sin(th)]);
          }

          sweepTube(b, curveFromPoints(pts, 3), () => 0.55, MAT_MUFFLER_WIRE, { segments: 4 });
        }
      }
      // a band at each end of the sleeve, crimped over it
      for (const xs of [xa, xb]) b.revolve({ x0: xs - 2.5, r0: r + 1.8, x1: xs + 2.5, r1: r + 1.8, n: [0, 1], m: MAT_MUFFLER_WIRE, steps });
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

// Streaks along a shielded pipe: thin dashes of darker steel lying on its skin, running along it in lines spaced round
// it, each line broken every few centimetres, the lines staggered, as the gas's flow would draw them on the foil
const STREAK = { lines: 12, dash: 22, gap: 15, width: 2.6, lift: 0.1, height: 1.1, step: 7 };

function shieldStreaks(b: MeshBuilder, c: Curve, r: (u: number) => number, seed = 0) {
  const n = c.pts.length;
  // a frame along the pipe that does not twist (each step's normal carried on from the last)
  const T: FwVec3[] = [];
  const N: FwVec3[] = [];

  for (let k = 0; k < n; k++) T.push(vnorm(vsub(c.pts[Math.min(n - 1, k + 1)], c.pts[Math.max(0, k - 1)])));

  N.push(vnorm(vcross(T[0], Math.abs(T[0][1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])));

  for (let k = 1; k < n; k++) {
    const m = vsub(N[k - 1], vscale(T[k], N[k - 1][0] * T[k][0] + N[k - 1][1] * T[k][1] + N[k - 1][2] * T[k][2]));

    N.push(vnorm(m));
  }

  const at = (s: number) => {
    let k = 0;

    while (k + 1 < n - 1 && c.cum[k + 1] < s) k++;

    const f = Math.min(1, Math.max(0, (s - c.cum[k]) / Math.max(1e-6, c.cum[k + 1] - c.cum[k])));
    const lerp = (A: FwVec3[]): FwVec3 => vadd(A[k], vscale(vsub(A[k + 1], A[k]), f));
    const t = vnorm(lerp(T));
    const nn = vnorm(lerp(N));

    return { p: lerp(c.pts as FwVec3[]), t, n: nn, bn: vcross(t, nn) };
  };
  const edge = 8; // kept off the ends, where the pipe goes into its fittings

  for (let l = 0; l < STREAK.lines; l++) {
    const th = ((l + 0.5) / STREAK.lines) * TAU + seed;
    const phase = ((l * 7 + seed * 13) % 5) / 5 * (STREAK.dash + STREAK.gap);

    for (let s0 = edge - phase; s0 < c.total - edge; s0 += STREAK.dash + STREAK.gap) {
      const a = Math.max(edge, s0);
      const z = Math.min(c.total - edge, s0 + STREAK.dash);

      if (z - a < 4) continue;

      const steps = Math.max(1, Math.ceil((z - a) / STREAK.step));
      // each dash stands a little proud of the shield: a low strip with sloping sides and a flat top, rising out of the
      // foil at its ends; across it (offset round the pipe, height above the shield)
      const PROFILE: Array<[number, number]> = [
        [-STREAK.width / 2 - 0.5, 0], [-STREAK.width / 2, 1], [STREAK.width / 2, 1], [STREAK.width / 2 + 0.5, 0],
      ];
      const rise = (s: number) => {
        const v = Math.max(0, Math.min(1, (s - a) / 3, (z - s) / 3));

        return STREAK.height * v * v * (3 - 2 * v);
      };
      const pt = (s: number, q: [number, number]) => {
        const f = at(s);
        const rad = r(s / c.total) + STREAK.lift + q[1] * rise(s);
        const w = q[0] / rad;
        const dir = vadd(vscale(f.n, Math.cos(th + w)), vscale(f.bn, Math.sin(th + w)));

        return { p: vadd(f.p, vscale(dir, rad)), out: dir, side: vadd(vscale(f.bn, Math.cos(th + w)), vscale(f.n, -Math.sin(th + w))) };
      };
      // a band's normal: out from the pipe on the top, leaning to the side on the slopes
      const nrm = (o: { out: FwVec3; side: FwVec3 }, k: number): FwVec3 => {
        if (k === 1) return o.out;

        const sgn = k === 0 ? -1 : 1;

        return vnorm(vadd(vscale(o.out, 0.55), vscale(o.side, sgn * 0.84)));
      };

      for (let i = 0; i < steps; i++) {
        const sa = a + ((z - a) * i) / steps;
        const sb = a + ((z - a) * (i + 1)) / steps;

        for (let k = 0; k < PROFILE.length - 1; k++) {
          const A0 = pt(sa, PROFILE[k]);
          const A1 = pt(sa, PROFILE[k + 1]);
          const B0 = pt(sb, PROFILE[k]);
          const B1 = pt(sb, PROFILE[k + 1]);
          const occ = k === 1 ? 1 : 0.8;
          const na = nrm(A0, k);
          const nb = nrm(B0, k);

          b.push(A0.p, na, MAT_SHIELD_STREAK, occ);
          b.push(B0.p, nb, MAT_SHIELD_STREAK, occ);
          b.push(B1.p, nb, MAT_SHIELD_STREAK, occ);
          b.push(A0.p, na, MAT_SHIELD_STREAK, occ);
          b.push(B1.p, nb, MAT_SHIELD_STREAK, occ);
          b.push(A1.p, na, MAT_SHIELD_STREAK, occ);
        }
      }
    }
  }
}

// The primaries, wrapped in heat shield
// (one bank's, and of it one collector's three: front, g 0, or rear, g 1, each drawn as a part of its own, so that the
// see-through pipes are drawn far to near group by group)
export function buildExhaustLogs(b: MeshBuilder, bi: number, g: number) {
  const bank = EXHAUST_RUNNERS[bi];

  for (let c = 3 * g; c < 3 * g + 3; c++) {
    sweepTube(b, bank.primaries[c], () => PR, MAT_HEAT_SHIELD, { segments: 30 });
    shieldStreaks(b, bank.primaries[c], () => PR, c * 0.37);
  }
}

// The collector and the one pipe on into the turbine: wrapped in heat shield too
export function buildTurboFeed(b: MeshBuilder, bi: number) {
  for (const bank of [EXHAUST_RUNNERS[bi]]) {
    for (const m of bank.merges) {
      sweepTube(b, m, swell(COLL_R0, SEC_R), MAT_HEAT_SHIELD, { segments: 48, capStart: true });
      shieldStreaks(b, m, swell(COLL_R0, SEC_R), 0.2);
    }
    for (const br of bank.branches) {
      sweepTube(b, br, () => SEC_R, MAT_HEAT_SHIELD, { segments: 40 });
      shieldStreaks(b, br, () => SEC_R, 0.5);
    }
    sweepTube(b, bank.collectors[0], (u) => MAIN_R + 8 * (1 - u) * (1 - u), MAT_HEAT_SHIELD, { segments: 48, capStart: true });
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
    for (const br of bank.branches) weld(b, br, br.total - INSET, SEC_R);

    // the bolted flange joints between each collector and the Y: the collectors coupled in the middle, three by three
    for (const j of bank.joints) {
      flangeJoint(b, j.at, j.dir, {
        pipeR: SEC_R, r: SEC_R + 17, castT: 9, mateT: 9, bolts: 6, pitch: SEC_R + 10,
        cast: MAT_HDR_FLANGE, mate: MAT_HDR_FLANGE, gasket: MAT_PIPE_BLACK, bolt: 4.6,
      });
    }

    // a sensor on each branch, past its joint
    o2Bung(b, bank.branches[0], 40, SEC_R, out, true);
    o2Bung(b, bank.branches[1], 40, SEC_R, out, false);
  }
}

// Each turbine's own pipe, from its outlet to its silencer, solid, one dark grey metal, welded on at the turbine and at
// the silencer
export function buildTurbineArc(b: MeshBuilder) {
  for (const p of TURBINE_PIPES) {
    // closed at the turbine, so that no hole shows through its see-through housing; and its weld there, only the half
    // that faces out of the housing, where it can be seen
    sweepTube(b, p, () => DOWN_R, MAT_STEEL_BRIGHT, { segments: 40, capStart: true });
    weld(b, p, 1.6, DOWN_R, [-0.85, -0.5, 0]);
    weld(b, p, p.total - 1.6, DOWN_R);

    // the same woven sleeve of grey metal wire as on the silencers, over all of it from the turbine to the silencer: two
    // sets of wires in opposite helices, crossing over and under, following its every bend (a frame carried along the
    // pipe without twisting keeps each wire true)
    const pts = p.pts.slice(3, p.pts.length - 3);
    const frames: Array<[FwVec3, FwVec3, FwVec3]> = [];
    const cum: number[] = [0];
    let n0 = vnorm(vcross(vnorm(vsub(pts[1], pts[0])), [0, 1, 0]));

    for (let i = 0; i < pts.length; i++) {
      const t = vnorm(vsub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      const d = n0[0] * t[0] + n0[1] * t[1] + n0[2] * t[2];

      n0 = vnorm(vsub(n0, vscale(t, d)));
      frames.push([pts[i], n0, vcross(t, n0)]);
      if (i > 0) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
    }

    const WIRES = 14;
    const lead = 96; // along, for one turn round
    const rr = DOWN_R + 0.9;

    for (const hand of [-1, 1]) {
      for (let w = 0; w < WIRES; w++) {
        const wire = frames.map(([c, e1, e2], i) => {
          const th = (w / WIRES) * TAU + hand * (cum[i] / lead) * TAU;
          const weave = 0.35 * Math.sin(th * WIRES * 0.5 + hand * cum[i] * 0.9);
          const rad = rr + weave;

          return vadd(c, vadd(vscale(e1, Math.cos(th) * rad), vscale(e2, Math.sin(th) * rad)));
        });

        sweepTube(b, curveFromPoints(wire, 3), () => 0.55, MAT_MUFFLER_WIRE, { segments: 4 });
      }
    }

    // a band at each end, crimped over the sleeve
    for (const s of [10, p.total - 10]) collar(b, p, s, DOWN_R, DOWN_R + 2, 5, MAT_MUFFLER_WIRE, MAT_MUFFLER_WIRE);
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
  // four ears, one at each corner, each with its stud
  const ears: Array<[number, number]> = [[x - 33, PORT_Y - 22], [x + 33, PORT_Y - 22], [x - 33, PORT_Y + 22], [x + 33, PORT_Y + 22]];
  const pts: P2[] = [];

  for (const [cx, cy, a0] of [[hw - rc, hh - rc, 0], [-(hw - rc), hh - rc, Math.PI / 2], [-(hw - rc), -(hh - rc), Math.PI], [hw - rc, -(hh - rc), Math.PI * 1.5]] as Array<[number, number, number]>) {
    // at the four corners, the ears: rounder, standing out a little
    const ear = true;
    const r = ear ? rc + 4 : rc;

    for (let k = 0; k <= 10; k++) {
      const a = a0 + (k / 10) * (Math.PI / 2);

      pts.push([x + cx + r * Math.cos(a) + (ear ? Math.sign(cx) * 2 : 0), PORT_Y + cy + r * Math.sin(a) + (ear ? Math.sign(cy) * 2 : 0)]);
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

    // its four studs, one in each ear: on each a washer and a brass hex nut, its top chamfered, the stud's threaded end
    // standing out of it
    for (const [bx, by] of bolts) {
      const rot = 0.3 + 0.17 * bx; // each nut turned a little differently, as tightened
      b.prismDir([bx, by, -FACE], [0, 0, -1], [1, 0, 0], [0, 1, 0], 8.4, 1.2, 24, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
      b.prismDir([bx, by, -FACE - 1.2], [0, 0, -1], [1, 0, 0], [0, 1, 0], 6.6, 5.6, 6, rot, MAT_INJ_BRASS, MAT_INJ_BRASS);
      b.prismDir([bx, by, -FACE - 6.8], [0, 0, -1], [1, 0, 0], [0, 1, 0], 5.9, 0.9, 6, rot, MAT_INJ_BRASS, MAT_INJ_BRASS); // the chamfer
      b.prismDir([bx, by, -FACE - 7.7], [0, 0, -1], [1, 0, 0], [0, 1, 0], 3.2, 3, 14, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
      b.prismDir([bx, by, -FACE - 10.7], [0, 0, -1], [1, 0, 0], [0, 1, 0], 2.4, 0.6, 14, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT); // its end, chamfered
    }
  }

  for (const cx of CT_X) portFlare(b, cx);

  b.setTurn(null);
}
