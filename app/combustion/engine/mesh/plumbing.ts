// The intake plenum and runners, the exhaust collector, the air intake and filter.

import { CT_X, HEAD_PORT_DZ, TAU } from "../core/constants";
import { vadd, vcross, vnorm, vscale, vsub } from "../math/vec3";
import type { FwMaterial, FwVec3 } from "./builder";
import { MAT_ALU_CAST, MAT_ALU_TURNED, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_EXH_GUNMETAL, MAT_HDR_BLUE, MAT_HDR_GOLD, MAT_HDR_PURPLE, MAT_IRON, MAT_PIPE_BLACK, MAT_TURBO_GRAIN, MAT_WELD } from "./materials";
import { collar, curveAt, curveFromPoints, flangeBolt, flangeJoint, ovalFlare, pipeFlange, roundedCurve, subCurve, sweepTube } from "./tubes";
import type { Curve, MeshBuilder } from "./tubes";
import { COLLECTOR_CONE, COLLECTOR_LEN, COMPRESSOR_OUTLET_LEN, HDR_CX, HDR_CZ, HDR_MOUTH_Y, PLENUM_Y, PLENUM_Z, PORT_Y, TB, collectorRadius, compressorCentre, turboWorld } from "./turbo";
import { VT, valveX } from "./valvetrain";
import { FILTER_TURN, buildAirFilter } from "./airFilter";

/* ---- the plumbing, in world coordinates ---- */

// The paths of the pipes. The air follows the same paths as sprites, so they
// are defined once, here.
export const PORT_SEAT_Y = VT.ySeat + 0.5;

export function seatX(cyl: number, sigma: number, sx: number) {
  return valveX(cyl, sigma, sx);
}

// The pipes that are the same on both banks, each in its bank's own frame (or, for the turbocharger's, in the
// module's): the intake plenum and its runners, the exhaust collector under the turbine, the compressor's outlet
// and the air intake that goes up to the filter.
// The compressor's outlet points down: the hot charge pipe runs straight down from it this far, to the level where it
// turns toward the intercooler, round an elbow of HOT_BEND
export const OUTLET_DROP = 56;
export const HOT_BEND = 22;

// The distributor, in a bank's frame: at the middle of the bank, on the outside, a little above the ports
// The mouth of the turbine's inlet elbow, in the module's frame: facing back along the bank, where the pipe from the
// collector is bolted to it
export const INLET_MOUTH: FwVec3 = [HDR_CX, HDR_MOUTH_Y - 6 + COLLECTOR_LEN - 20, HDR_CZ]; // right on top of the turbine's inlet, low
// the way the mouth faces, in the module's frame: up, so that the pipe from the collector, arching over, comes down onto it
export const INLET_FACING: FwVec3 = [0, -1, 0];


// The intake manifold, in a bank's frame: a round cast collector outside the bank's middle, its axis across the bank,
// its outer face a round flange parallel to the block, bolted to the cooled charge's pipe's own; out of its inner face,
// in a ring, the six runners, interleaved, each its own way to its port, the shorter ways bowed up or down so that the
// six are near one length
// (brought 40 in toward the block, so that the cooled charge's pipe, running along the bank, turns in to it through one
// plain right-angle elbow)
export const COLLECTOR_HUB = { r: 54, zIn: 212, zOut: 244, ring: 32 }; // its radius; its inner and outer faces; the runners' ring
export const HUB = { x: (CT_X[2] + CT_X[3]) / 2, y: -302, z: (COLLECTOR_HUB.zIn + COLLECTOR_HUB.zOut) / 2, r: 54, h: 32, throttle: 0 };
const HUB_FLANGE = { r: 50, t: 7 }; // the joint's two plates
export const PLENUM_INLET: FwVec3 = [HUB.x, HUB.y, COLLECTOR_HUB.zOut + 2 * HUB_FLANGE.t + 1]; // where the pipe ends, on its flange

export const PIPES = (() => {
  const first = CT_X[0] - 26; // the intake plenum stops at the first and the last cylinder
  const last = CT_X[CT_X.length - 1] + 26;

  const bezier = (p0: FwVec3, p1: FwVec3, p2: FwVec3, p3: FwVec3, n = 40) => {
    const pts: FwVec3[] = [];

    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const w0 = (1 - t) * (1 - t) * (1 - t);
      const w1 = 3 * (1 - t) * (1 - t) * t;
      const w2 = 3 * (1 - t) * t * t;
      const w3 = t * t * t;

      pts.push([
        p0[0] * w0 + p1[0] * w1 + p2[0] * w2 + p3[0] * w3,
        p0[1] * w0 + p1[1] * w1 + p2[1] * w2 + p3[1] * w3,
        p0[2] * w0 + p1[2] * w1 + p2[2] * w2 + p3[2] * w3,
      ]);
    }

    return pts;
  };

  // the turbine's inlet: an elbow whose mouth faces back along the bank (the module's +z), toward the collector, so that
  // the pipe from it comes straight in; it bends down through a right angle, broadly, into the turbine
  const collectorEnd: FwVec3 = [HDR_CX, HDR_MOUTH_Y - 6 + COLLECTOR_LEN, HDR_CZ];
  // under the flange, the turbine's inlet: a short straight neck down into its scroll
  const log = curveFromPoints([INLET_MOUTH, [collectorEnd[0], collectorEnd[1] + 10, collectorEnd[2]]], 3);

  const plenum = curveFromPoints([[first, PLENUM_Y, PLENUM_Z], [last, PLENUM_Y, PLENUM_Z]], 6);

  // ---- intake: six runners out of the collector's inner face, near one length ----
  const order = CT_X.map((x, i) => [x, i] as [number, number]).sort((p, q) => p[0] - q[0]);
  const ringAt = (i: number) => {
    const rank = order.findIndex((o) => o[1] === i);
    const a = Math.PI + (rank / CT_X.length) * TAU + 0.26; // round the ring, the front ones toward the front

    return [HUB.x + COLLECTOR_HUB.ring * Math.cos(a), HUB.y + COLLECTOR_HUB.ring * Math.sin(a)];
  };
  const way = (i: number, bow: number) => {
    const x = CT_X[i];
    const [sx, sy] = ringAt(i);
    const z0 = COLLECTOR_HUB.zIn;
    const zp = 128; // where the sweep straightens, square to the port
    const at = (f: number) => z0 - f * (z0 - zp); // a share of the way in from the collector to there

    // one long, smooth sweep: out of the collector, bowed a little, and square into the port
    return curveFromPoints([[sx, sy, z0], ...bezier([sx, sy, at(0.12)], [sx + (x - sx) * 0.25, sy + bow, at(0.56)], [x, PORT_Y + bow * 0.35, at(0.42)], [x, PORT_Y, zp], 56), [x, PORT_Y, 98 + HEAD_PORT_DZ]], 3);
  };
  // near one length, not exactly: the shorter ones are bowed only gently, so that all six stay smooth
  const longest = 0.9 * Math.max(...CT_X.map((_, i) => way(i, 0).total));
  const intakeRunners = CT_X.map((_, i) => {
    const sign = i % 2 === 0 ? -1 : 1; // bowed up and down in turn: interleaved
    let lo = 0;
    let hi = 130;

    for (let k = 0; k < 22; k++) {
      const m = (lo + hi) / 2;

      if (way(i, sign * m).total < longest) lo = m;
      else hi = m;
    }

    return way(i, sign * lo);
  });

  const runner = (cyl: number) => intakeRunners[cyl];

  // ---- the compressor's outlet: the charge leaves it downward, through a metal coupler. The pipe that
  // goes on from there to the intercooler is CHARGE_PIPES' ----
  const outlet = turboWorld([TB.half, compressorCentre(1), -COMPRESSOR_OUTLET_LEN]);
  const outletRun = curveFromPoints([outlet, [outlet[0], outlet[1] + OUTLET_DROP - HOT_BEND, outlet[2]]], 5);
  const throttleEnd: FwVec3 = PLENUM_INLET; // where the cooled charge's pipe ends

  // The air intake leaves the compressor's inlet along the shaft, turns once, through 45 degrees, and
  // ends, pointing down and away at 45 degrees, in the air filter
  const intakeStart = turboWorld([135, 0, 0]);
  const intake = roundedCurve(
    [
      intakeStart,
      [intakeStart[0] - 130, intakeStart[1], intakeStart[2]],
      // a smooth bend, down through FILTER_TURN, and on in that line to the filter
      [intakeStart[0] - 130 - 95 * Math.cos(FILTER_TURN), intakeStart[1] + 95 * Math.sin(FILTER_TURN), intakeStart[2]],
    ],
    70, 10
  );

  return { log, plenum, runner, collectorEnd, outlet, outletRun, intake, throttleEnd };
})();

// The pipes' skins, drawn see-through: the air moving inside them can be seen.
// A bank's intake runners, thick along their length and narrowed at the port like a throat (the distributor they
// leave is solid: buildIntakeWelds)
export function buildIntakePipes(b: MeshBuilder) {
  for (let i = 0; i < CT_X.length; i++) {
    // thick along its length, narrowed at the port like a throat
    sweepTube(b, PIPES.runner(i), (u) => 21 - 8 * Math.pow(Math.max(0, (u - 0.72) / 0.28), 1.6), MAT_ALU_CAST, { segments: 28 });
  }
}

// The collector and the runners' roots, solid: the collector's drum, its ribs, and the round flange joint on its outer
// face, parallel to the block; each runner welded into its inner face; and at the head, each runner's counter-flange: an
// oval cone, the port's own shape, on a stadium flange held to the head by two bolts, with no weld to be seen
// A square plate with its corners rounded, in the x-y plane about (x, y), from z0 to z1: half its side, the corners' radius
function roundedSquare(b: MeshBuilder, x: number, y: number, z0: number, z1: number, half: number, rc: number, mat: FwMaterial) {
  const ring: Array<[number, number, number, number]> = [];

  for (const [cx, cy, a0] of [[1, -1, -Math.PI / 2], [1, 1, 0], [-1, 1, Math.PI / 2], [-1, -1, Math.PI]] as Array<[number, number, number]>) {
    for (let k = 0; k <= 6; k++) {
      const a = a0 + (k / 6) * (Math.PI / 2);

      ring.push([cx * (half - rc) + rc * Math.cos(a), cy * (half - rc) + rc * Math.sin(a), Math.cos(a), Math.sin(a)]);
    }
  }

  const n = ring.length;
  const P = (k: number, z: number): FwVec3 => [x + ring[k % n][0], y + ring[k % n][1], z];
  const N = (k: number): FwVec3 => [ring[k % n][2], ring[k % n][3], 0];

  for (let k = 0; k < n; k++) {
    for (const [p, q] of [[P(k, z0), N(k)], [P(k + 1, z0), N(k + 1)], [P(k + 1, z1), N(k + 1)], [P(k, z0), N(k)], [P(k + 1, z1), N(k + 1)], [P(k, z1), N(k)]] as Array<[FwVec3, FwVec3]>) {
      b.push(p, q, mat, 1);
    }
  }

  b.flatFan([x, y, z0], ring.map((_, k) => P(k, z0)), [0, 0, -1], mat);
  b.flatFan([x, y, z1], ring.map((_, k) => P(k, z1)), [0, 0, 1], mat);
}

// A square plate with its corners chamfered, in the x-y plane about (x, y), from z0 to z1: half its side, and the chamfer
function chamferedSquare(b: MeshBuilder, x: number, y: number, z0: number, z1: number, half: number, c: number, mat: FwMaterial) {
  const h = half;
  const ring: Array<[number, number]> = [[h - c, -h], [h, -h + c], [h, h - c], [h - c, h], [-h + c, h], [-h, h - c], [-h, -h + c], [-h + c, -h]];
  const P = (q: [number, number], z: number): FwVec3 => [x + q[0], y + q[1], z];
  const n = ring.length;

  for (let k = 0; k < n; k++) {
    const a = ring[k];
    const d = ring[(k + 1) % n];

    b.flatQuad(P(a, z0), P(d, z0), P(d, z1), P(a, z1), [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2, 0], mat);
  }

  b.flatFan([x, y, z0], ring.map((q) => P(q, z0)), [0, 0, -1], mat);
  b.flatFan([x, y, z1], ring.map((q) => P(q, z1)), [0, 0, 1], mat);
}

export function buildIntakeWelds(b: MeshBuilder) {
  const { x, y } = HUB;
  const { r: R, zIn, zOut } = COLLECTOR_HUB;
  const body = curveFromPoints([[x, y, zIn], [x, y, zOut]], 2);

  sweepTube(b, body, () => R, MAT_ALU_CAST, { segments: 56, capStart: true });
  collar(b, body, 3, R, R + 3, 6, MAT_ALU_TURNED, MAT_ALU_TURNED);

  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU;

    b.box(x + (R + 1) * Math.cos(a) - 3, x + (R + 1) * Math.cos(a) + 3, y + (R + 1) * Math.sin(a) - 3, y + (R + 1) * Math.sin(a) + 3, zIn + 6, zOut, MAT_ALU_TURNED);
  }

  // the joint: the collector's flange, a gasket, the pipe's flange, each a big square with its corners chamfered, held by
  // eight bolts, at the corners and the middles of the sides, heads on the pipe's side, nuts on the collector's
  const { t } = HUB_FLANGE;
  const half = HUB_FLANGE.r + 10;

  chamferedSquare(b, x, y, zOut, zOut + t, half, 16, MAT_EXH_GUNMETAL);
  chamferedSquare(b, x, y, zOut + t, zOut + t + 1, half - 2, 15, MAT_PIPE_BLACK);
  chamferedSquare(b, x, y, zOut + t + 1, zOut + 2 * t + 1, half, 16, MAT_EXH_GUNMETAL);

  const pitch = half - 11;

  for (const [bx, by] of [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]]) {
    const k = bx !== 0 && by !== 0 ? 0.86 : 1; // the corner bolts a little in, off the chamfers

    flangeBolt(b, [x + bx * pitch * k, y + by * pitch * k, zOut + 2 * t + 1], [0, 0, 1], 4.4, 0.3);
    b.prismDir([x + bx * pitch * k, y + by * pitch * k, zOut], [0, 0, -1], [1, 0, 0], [0, 1, 0], 4.4, 4, 6, 0.2, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
  }

  for (let i = 0; i < CT_X.length; i++) {
    const r = PIPES.runner(i);

    // each runner out of the collector's inner face, with a weld round it
    sweepTube(b, subCurve(r, 0, 10, 2), () => 21, MAT_ALU_TURNED, { segments: 28 });
    weld(b, r, 1.6, 21);

    // and its counter-flange at the head
    const cx = CT_X[i];
    const zf = 97.4 + HEAD_PORT_DZ; // the head's port face (the heads widened)

    b.box(cx - 21, cx + 21, PORT_Y - 19.5, PORT_Y + 19.5, zf, zf + 8.2, MAT_EXH_GUNMETAL);

    for (const sx of [-21, 21]) {
      b.prismDir([cx + sx, PORT_Y, zf], [0, 0, 1], [1, 0, 0], [0, 1, 0], 19.5, 8.2, 28, 0, MAT_EXH_GUNMETAL, MAT_EXH_GUNMETAL);
    }

    ovalFlare(b, cx, PORT_Y, zf + 8.2, 26, 24, 16, 13.2, MAT_ALU_TURNED);

    for (const sx of [-33, 33]) flangeBolt(b, [cx + sx, PORT_Y, zf + 8.2], [0, 0, 1], 6, 0.25 * Math.sign(sx));
  }
}

// A turbocharger module's air intake, from the compressor up to the filter
export function buildTurboIntakePipe(b: MeshBuilder) {
  sweepTube(b, PIPES.intake, () => 20, MAT_ALU_TURNED, { segments: 26 });
}

// The exhaust collector's skin, drawn see-through with a steel contour: the cone and its stub
export function buildCollector(b: MeshBuilder) {
  // the cone into the turbine, grey metal
  const lt = PIPES.log.total;
  const stretch = (s0: number, s1: number, mat: FwMaterial) =>
    sweepTube(b, subCurve(PIPES.log, s0, s1, 4), (u) => collectorRadius(s0 + u * (s1 - s0)), mat, { segments: 32 });

  const collectorBase = () => MAT_ALU_CAST; // one grey metal, as the intake's pipes are

  for (const [s0, s1, mat] of tintedStretches(0, lt, collectorWelds(lt), collectorBase)) stretch(s0, s1, mat);
}

// A weld round a pipe, as it is on stainless tube: a raised bead made of overlapping
// ripples, each a crescent, the bead's edge wavering a little, with the colours of heat beside
// it: straw-gold, then purple, then blue, on both sides. The bead is hollow: only the outside
// of it is there, so that the pipe's inside can be seen through it.
// `half`, when given, keeps only the half of the bead on that side of the pipe: the half that shows
export function weld(b: MeshBuilder, curve: Curve, s: number, pipeR: number, half?: FwVec3) {
  const centre: FwVec3 = [0, 0, 0];
  const dir: FwVec3 = [0, 0, 0];

  curveAt(curve, s, centre, dir);

  const e1 = vnorm(vcross(dir, Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  const e2 = vcross(dir, e1);
  const R0 = pipeR + 0.2;
  const ripples = Math.max(14, Math.round((TAU * R0) / 3.1)); // about 3 units from crest to crest
  const N = ripples * 4; // samples round the pipe
  const M = 7; // samples across the bead
  const hw = WELD_HALF; // half the bead's width

  const P = (th: number, ph: number): FwVec3 => {
    // ripple crests: the bead is higher, and a little wider, on each crest, and the crest leans
    const crest = Math.sin(ripples * th);
    const lean = Math.sin(ripples * th + 1.2);
    const height = (1.1 + 0.26 * crest) * Math.sin(ph);
    const along = hw * Math.cos(ph) * (1 + 0.09 * crest + 0.07 * Math.sin(ripples * th * 0.5 + 0.7)) + 0.34 * lean * Math.sin(ph);
    const rr = R0 + height;
    const cs = Math.cos(th) * rr;
    const sn = Math.sin(th) * rr;

    return [
      centre[0] + dir[0] * along + e1[0] * cs + e2[0] * sn,
      centre[1] + dir[1] * along + e1[1] * cs + e2[1] * sn,
      centre[2] + dir[2] * along + e1[2] * cs + e2[2] * sn,
    ];
  };

  const normal = (th: number, ph: number): FwVec3 => {
    const d = 1e-3;
    const a0 = P(th + d, ph);
    const a1 = P(th - d, ph);
    const b0 = P(th, ph + d);
    const b1 = P(th, ph - d);
    const n = vnorm(vcross(vsub(a0, a1), vsub(b0, b1)));
    const out = vsub(P(th, Math.PI / 2), centre);

    // pointing out of the pipe
    return n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0 ? vscale(n, -1) : n;
  };

  for (let i = 0; i < N; i++) {
    if (half) {
      const tm = ((i + 0.5) / N) * TAU;
      const rx = e1[0] * Math.cos(tm) + e2[0] * Math.sin(tm);
      const ry = e1[1] * Math.cos(tm) + e2[1] * Math.sin(tm);
      const rz = e1[2] * Math.cos(tm) + e2[2] * Math.sin(tm);

      if (rx * half[0] + ry * half[1] + rz * half[2] < 0) continue;
    }

    const t0 = (i / N) * TAU;
    const t1 = ((i + 1) / N) * TAU;

    for (let j = 0; j < M; j++) {
      const p0 = (j / M) * Math.PI;
      const p1 = ((j + 1) / M) * Math.PI;
      const v: Array<[FwVec3, FwVec3]> = [
        [P(t0, p0), normal(t0, p0 + 1e-3)],
        [P(t1, p0), normal(t1, p0 + 1e-3)],
        [P(t1, p1), normal(t1, p1 - 1e-3)],
        [P(t0, p1), normal(t0, p1 - 1e-3)],
      ];

      for (const k of [0, 1, 2, 0, 2, 3]) b.push(v[k][0], v[k][1], MAT_WELD, 1);
    }
  }
}

// The colours of heat beside a weld, and the stretches of a pipe's skin they make. The pipe's own
// colour runs gold, then bronze, then blue along its length; beside each weld it is straw-gold,
// then purple, then blue, on both sides. The skin is see-through like the rest of the pipe, so
// nothing closes the pipe from inside.
const WELD_HALF = 1.95; // half the width of a weld's bead
const HAZ: Array<[number, number, FwMaterial]> = [
  [0.4, 2.8, MAT_HDR_GOLD],
  [2.8, 4.7, MAT_HDR_PURPLE],
  [4.7, 7.0, MAT_HDR_BLUE],
];

export function tintedStretches(
  from: number, to: number, welds: number[], base: (s: number) => FwMaterial
): Array<[number, number, FwMaterial]> {
  const matAt = (s: number): FwMaterial => {
    for (const w of welds) {
      const d = Math.abs(s - w) - WELD_HALF;

      for (const [a, c, m] of HAZ) {
        if (d >= a && d < c) return m;
      }
    }

    return base(s);
  };

  const out: Array<[number, number, FwMaterial]> = [];
  const step = 0.4;
  let start = from;
  let current = matAt(from + step / 2);

  for (let s = from + step; s < to; s += step) {
    const m = matAt(s + step / 2);

    if (m !== current) {
      out.push([start, s, current]);
      start = s;
      current = m;
    }
  }

  out.push([start, to, current]);

  return out;
}

// Where the welds are along the collector
const collectorWelds = (t: number) => [COLLECTOR_CONE + 16, t * 0.8];

// A part standing out of a pipe at an angle: a sensor, a boss. Returns where its top is
function standOut(b: MeshBuilder, at: FwVec3, dir: FwVec3, r: number, len: number, top: FwMaterial, side: FwMaterial, sides = 14) {
  const d = vnorm(dir);
  const e1 = vnorm(vcross(d, Math.abs(d[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
  const e2 = vcross(d, e1);

  b.prismDir(at, d, e1, e2, r, len, sides, 0, top, side);

  return vadd(at, vscale(d, len));
}

// The solid fittings of the turbine's inlet elbow, in a turbocharger module's frame: the bolted flange at its mouth, the
// plate at the turbine, its welds, and the oxygen sensor
export function buildCollectorFittings(b: MeshBuilder) {
  // the turbine's inlet flange, level, facing up, right on its housing; the pipe comes down onto it with its own
  // flange, and the two are bolted together, a gasket between: rounded squares of dark metal, eight bolts
  {
    const [mx, my, mz] = INLET_MOUTH;
    const half = 44;

    // built level about the origin, its up local z, and set on the mouth
    b.setTurn((p, n) => [[mx + p[0], my - p[2], mz + p[1]], [n[0], -n[2], n[1]]]);
    roundedSquare(b, 0, 0, -9, 0, half, 12, MAT_TURBO_GRAIN); // the turbine's own flange, cast with its housing
    roundedSquare(b, 0, 0, 0, 1, half - 2, 11, MAT_PIPE_BLACK);
    roundedSquare(b, 0, 0, 1, 9, half, 12, MAT_EXH_GUNMETAL);

    for (const [bx, by] of [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]]) {
      const k = bx !== 0 && by !== 0 ? 0.84 : 1;
      const px = bx * 33 * k;
      const py = by * 33 * k;

      flangeBolt(b, [px, py, 9], [0, 0, 1], 4.2, 0.3);
      b.prismDir([px, py, -9], [0, 0, -1], [1, 0, 0], [0, 1, 0], 4.2, 4, 6, 0.2, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
    }

    b.setTurn(null);
  }

  for (const w of collectorWelds(PIPES.log.total)) weld(b, PIPES.log, w, collectorRadius(w));

  // the oxygen sensor on the stub, with its wire, standing out toward the viewer
  const sensorAt: FwVec3 = [HDR_CX + 6, PIPES.collectorEnd[1] - 40, HDR_CZ - 24];
  const sensorDir: FwVec3 = vnorm([0.35, -0.3, -0.88]);
  const boss = standOut(b, sensorAt, sensorDir, 8, 7, MAT_IRON, MAT_IRON);
  const hexTop = standOut(b, boss, sensorDir, 6, 6, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, 6);
  const bodyTop = standOut(b, hexTop, sensorDir, 4.6, 26, MAT_PIPE_BLACK, MAT_PIPE_BLACK);

  sweepTube(b, roundedCurve([bodyTop, vadd(bodyTop, [14, -14, -14]), vadd(bodyTop, [50, -30, -6])], 10, 3), () => 1.5, MAT_PIPE_BLACK, { segments: 8, capEnd: true });
}


// The round bolted flange joint the hot charge pipes are held by, at the compressor's outlet and at the tank's port: as
// the cooled charge's outlet's, smaller, for the narrower pipe end
export const PORT_JOINT = {
  pipeR: 15,
  r: 32,
  castT: 8,
  mateT: 7,
  bolts: 6,
  pitch: 25,
  cast: MAT_EXH_GUNMETAL,
  mate: MAT_EXH_GUNMETAL,
  gasket: MAT_PIPE_BLACK,
  bolt: 3.8,
};

// The solid fittings of a turbocharger module's own pipes: the metal coupler on the compressor's outlet, the air
// intake's flange, ring and lip, and the air filter on its end
export function buildTurboFittings(b: MeshBuilder) {
  // the compressor's outlet: a round neck cast with the housing, and on it the round bolted flange joint the hot pipe is
  // held by (as at the intercooler's port)
  {
    const run = PIPES.outletRun;
    const p0: FwVec3 = [0, 0, 0];
    const p1: FwVec3 = [0, 0, 0];

    curveAt(run, 0, p0);
    curveAt(run, 10, p1);

    const dir = vnorm(vsub(p1, p0));

    sweepTube(b, curveFromPoints([vadd(p0, vscale(dir, -6)), p1], 2), () => 19, MAT_TURBO_GRAIN, { segments: 40 });
    flangeJoint(b, vadd(p1, vscale(dir, PORT_JOINT.castT)), dir, PORT_JOINT);
  }

  const intake = PIPES.intake;

  pipeFlange(b, intake, false, 30, MAT_ALU_TURNED);
  collar(b, intake, intake.total * 0.55, 20, 22.5, 4, MAT_ALU_TURNED);
  collar(b, intake, intake.total - 3, 20, 24.5, 6, MAT_ALU_TURNED);

  // The air filter, hanging from the intake's open end: a K&N-style cone
  buildAirFilter(b, intake.pts[intake.pts.length - 1]);
}
