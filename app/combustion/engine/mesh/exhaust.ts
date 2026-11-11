// The two turbocharger modules at the front, leaning with their banks; the exhaust runners over the top (a hot V), stubs, flanges and the exhaust pipes.

import { BANKS, CHAIN_X_WORLD, CT_X, FLYWHEEL_WORLD_X, HEAD_PORT_DZ, ORIENT, TAU, bankPoint, composeTurn } from "../core/constants";
import type { Bank } from "../core/constants";
import { vadd, vcross, vnorm, vscale, vsub } from "../math/vec3";
import type { FwVec3 } from "./builder";
import { MAT_ALU_CAST, MAT_ALU_TURNED, MAT_EXH_GUNMETAL, MAT_HDR_BLUE, MAT_HDR_BRONZE, MAT_IRON, MAT_PIPE_BLACK, MAT_STEEL_BRIGHT, MAT_WELD } from "./materials";
import { tintedStretches, weld } from "./plumbing";
import { collar, curveFromPoints, flangeBolt, ovalFlare, roundedCurve, subCurve, sweepTube } from "./tubes";
import type { Curve, MeshBuilder } from "./tubes";
import { HDR_CX, HDR_CZ, HDR_MOUTH_Y, PORT_Y, TURBO, turboWorld } from "./turbo";
import { INLET_FACING, INLET_MOUTH } from "./plumbing";

// ---- THE EXHAUST, IN THE V, OVER THE TOP TO TWO TURBOCHARGERS AT THE FRONT. Each bank's exhaust leaves the head on the
// valley side. Its six ports lead into a bundle of six thick runners that rise beside the head's valley edge and run
// forward over the top of the bank, stacked two by two, to its turbocharger at the front, ahead of the timing drive, at
// the height of the cams; there they gather and drop into the turbine's cone from above. Each turbocharger is set in its
// bank's own frame, so that it leans with the bank: its shaft across the bank, the turbine on the valley side under the
// cone, the compressor on the intake side. The runners of the front cylinders, nearest the turbocharger, first loop back
// and then forward, so that the six are nearer one length and their pulses reach the turbine more evenly. ----
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

// A stub, in a bank's own frame: straight out of the port's flange, into the valley, where the runner goes on from it
const STUB_END_Z = -122 - HEAD_PORT_DZ; // (the head's port face is HEAD_PORT_DZ out from where it was, the heads widened)
export const exhaustStub = (cx: number) => curveFromPoints([[cx, PORT_Y, -104 - HEAD_PORT_DZ], [cx, PORT_Y, STUB_END_Z]], 3);

// ---- the runners: for each bank, its six, in the engine's frame, and the short collector they gather into ----
const RUNNER_R = 19; // a runner's radius, along most of it
const RUNNER_NECK = 12.5; // and at the port, where it is narrowed, as the port's throat is
const NECK_LEN = 70; // how far along the runner it takes to open out to its full width
const COLLECTOR_R = 30; // the collector's
// A runner's radius at distance s along it: narrow at the port, opening out smoothly
export const runnerRadius = (s: number) => {
  const k = Math.min(1, Math.max(0, s / NECK_LEN));

  return RUNNER_NECK + (RUNNER_R - RUNNER_NECK) * k * k * (3 - 2 * k);
};

export type BankRunners = {
  runners: Curve[]; // by cylinder, front to rear, each from its stub's end into the collector
  collectors: Curve[]; // the collector and the one pipe on from it, forward, into the cone
};

const MID = (CT_X[1] + CT_X[2]) / 2; // the collector's place along the bank: one cylinder toward the front, nearer the turbine
const COLLECTOR_LEN = 120; // the collector's tapering body, from where the six come in to where the one pipe leaves
const COLLECTOR_SWELL = 14; // how much fatter it is at its back, where the six come in, than the pipe

export const EXHAUST_RUNNERS: BankRunners[] = BANKS.map((bank: Bank, bi: number) => {
  const B = (x: number, y: number, z: number): FwVec3 => bankPoint(bank, x, y, z);
  const mouth = CONE_MOUTHS[bi];
  // the collector in the V, beside the bank's head and no higher than its top, pointing forward, as the pipes run: its
  // back, where the six come in
  const cy = -392;
  const cz = -142;
  const back: FwVec3 = [MID + bank.dx + COLLECTOR_LEN / 2, cy, cz];
  const front: FwVec3 = [back[0] - COLLECTOR_LEN, cy, cz];

  // the one pipe: from the collector straight forward along the bank; near the turbine it rises in an arch, over, and
  // comes down in an arch, square onto the turbine's level flange
  const inDir = MOUTH_IN[bi]; // down, into the flange
  const inv = bank.mInv;
  const mb: FwVec3 = [mouth[0], inv[4] * mouth[1] + inv[7] * mouth[2], inv[5] * mouth[1] + inv[8] * mouth[2]];
  const A = B(mb[0] + 190, cy, cz);
  const P1 = B(mb[0] + 70, cy - 70, cz);
  const P2 = vadd(mouth, vscale(inDir, -170));
  const arch: FwVec3[] = [];

  for (let k = 1; k <= 40; k++) {
    const t = k / 40;
    const w = [(1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3];

    arch.push([0, 1, 2].map((j) => A[j] * w[0] + P1[j] * w[1] + P2[j] * w[2] + mouth[j] * w[3]) as FwVec3);
  }

  const run = roundedCurve([B(back[0], cy, cz), B(front[0], cy, cz), A], 60, 3);
  const pipe = curveFromPoints([...run.pts, ...arch], 3);

  // where each of the six comes into the collector's back: a ring of six round its middle
  const entry = (i: number): FwVec3 => {
    const a = (i / 6) * TAU + 0.5;

    return [back[0] + 4, cy + 34 * Math.cos(a), cz + 34 * Math.sin(a)];
  };

  // Each runner rises from its port and runs along a lane of its own in the V, beside the head and never above its top,
  // toward the collector, and comes into it from behind. The two in front of it run back past it on lanes close to the
  // head; the rear four come forward on lanes further out in the V, two by two.
  const runners = CT_X.map((x0, i) => {
    const cx = x0 + bank.dx;
    const front = i < 2;
    const laneZ = front ? -116 : -140 - 34 * (i % 2);
    const laneY = front ? -386 - 42 * i : -380 - 40 * Math.floor((i - 2) / 2);
    const e = entry(i);
    const behind = back[0] + 45 + 10 * i; // where each turns into the collector, behind it
    const s0 = B(cx, PORT_Y, STUB_END_Z);
    const p1: FwVec3 = [cx, PORT_Y - 6, STUB_END_Z - 44];
    const toward = Math.sign(behind - cx) || -1; // the way to the collector
    const pts: FwVec3[] = [s0, B(p1[0], p1[1], p1[2])];

    // up out of the port and, in one easy S, on toward the collector at once: no way out and back first
    if (Math.abs(behind - cx) > 150) pts.push(B(cx + toward * 70, laneY, laneZ));

    pts.push(B(behind, laneY, laneZ), B(behind - 30, e[1] + (laneY - e[1]) * 0.25, e[2]), B(e[0] + 30, e[1], e[2]), B(e[0], e[1], e[2]));

    return roundedCurve(pts, 38, 3);
  });

  return { runners, collectors: [pipe] };
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

export function buildExhaustLogs(b: MeshBuilder) {
  for (const bank of EXHAUST_RUNNERS) {
    for (const runner of bank.runners) {
      const t = runner.total;
      const base = () => MAT_ALU_CAST; // grey metal, as the intake's runners are

      for (const [s0, s1, mat] of tintedStretches(0, t, [], base)) {
        sweepTube(b, subCurve(runner, s0, s1, 3), (q) => runnerRadius(s0 + q * (s1 - s0)), mat, { segments: 28 });
      }

      collar(b, runner, 3, RUNNER_NECK, RUNNER_NECK + 6, 6, MAT_IRON, MAT_IRON);

      // a weld where the runner meets the collector, standing proud, with the colours of heat beside it
      weld(b, runner, t - 3, RUNNER_R, SEEN);
    }

  }
}

// The collector and the one pipe from it into the turbine's cone: drawn see-through, one grey metal, as the intake's
// pipes are, with no colours of heat
export function buildTurboFeed(b: MeshBuilder) {
  for (const bank of EXHAUST_RUNNERS) {
    // the collector: a fat, tapering body where the six come in, then the one pipe on into the cone
    for (const c of bank.collectors) {
      const body = (q: number) => {
        const k = Math.min(1, q / COLLECTOR_LEN);

        return COLLECTOR_R + COLLECTOR_SWELL * (1 - k * k * (3 - 2 * k));
      };

      sweepTube(b, c, (u) => body(u * c.total), MAT_ALU_CAST, { segments: 36, capStart: true });
      // the collector's back: a plate the six are welded into, a weld round its edge, and one where it narrows to the pipe
      collar(b, c, 4, COLLECTOR_R + COLLECTOR_SWELL - 1, COLLECTOR_R + COLLECTOR_SWELL + 5, 9, MAT_IRON, MAT_IRON);
      weld(b, c, 10, COLLECTOR_R + COLLECTOR_SWELL - 0.5, SEEN);
      weld(b, c, COLLECTOR_LEN - 2, COLLECTOR_R + 0.5, SEEN);
      collar(b, c, COLLECTOR_LEN + 6, COLLECTOR_R, COLLECTOR_R + 5, 7, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
      collar(b, c, c.total - 18, COLLECTOR_R, COLLECTOR_R + 5, 7, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
    }
  }
}

// Where the runners meet the collector, solid, so that it shows from every side: each runner opens out in a short cone
// as it comes into the collector's back, a weld bead where the cone starts and one where it meets the plate
const ENTRY_CONE = 36;

export function buildManifoldWelds(b: MeshBuilder) {
  for (const bank of EXHAUST_RUNNERS) {
    for (const runner of bank.runners) {
      const t = runner.total;

      sweepTube(b, subCurve(runner, t - ENTRY_CONE, t, 2), (u) => RUNNER_R + 9 * u * u, MAT_ALU_TURNED, { segments: 28 });
      weld(b, runner, t - ENTRY_CONE, RUNNER_R, SEEN);
      weld(b, runner, t - 2.5, RUNNER_R + 9, SEEN);
    }

    // the collector's back plate, and the weld round its edge, solid too
    const c = bank.collectors[0];

    collar(b, c, 2, COLLECTOR_R + COLLECTOR_SWELL - 2, COLLECTOR_R + COLLECTOR_SWELL + 6, 5, MAT_IRON, MAT_IRON);
    weld(b, c, 7, COLLECTOR_R + COLLECTOR_SWELL, SEEN);
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

// The stubs: from each port's flange to the log
export function buildExhaustStubs(b: MeshBuilder) {
  for (const cx of CT_X) {
    sweepTube(b, exhaustStub(cx), () => RUNNER_NECK + 1, MAT_ALU_CAST, { segments: 24 });
  }
}

// The welds on the exhaust's pipes show only their upper half, the half that is seen: the other half, behind the pipe, is
// left out, so that it does not show through the see-through pipes as a cut section
const SEEN: FwVec3 = [0, -1, 0];

const FLARE_LEN = 26; // the cone out of each flange
const FLARE_OVAL = { x: 24, y: 16 }; // the oval it starts from, at the flange's face: the port's shape

function portFlare(b: MeshBuilder, cx: number) {
  const z0 = -105.6 - HEAD_PORT_DZ;
  const rEnd = RUNNER_NECK + 1;

  ovalFlare(b, cx, PORT_Y, z0, -FLARE_LEN, FLARE_OVAL.x, FLARE_OVAL.y, rEnd, MAT_ALU_TURNED);

  // the bead along the oval at the face: TIG ripples
  const ring: FwVec3[] = [];

  for (let i = 0; i <= 60; i++) {
    const th = Math.PI + (i / 60) * Math.PI; // the upper half only: the half that shows

    ring.push([cx + (FLARE_OVAL.x + 0.6) * Math.cos(th), PORT_Y + (FLARE_OVAL.y + 0.6) * Math.sin(th), z0 - 1.4]);
  }

  const bead = curveFromPoints(ring, 1.2);

  sweepTube(b, bead, (u) => 1.7 + 0.42 * Math.sin((u * bead.total) / 3.1 * TAU), MAT_WELD, { segments: 8 });
  weld(b, curveFromPoints([[cx, PORT_Y, z0 - FLARE_LEN + 4], [cx, PORT_Y, z0 - FLARE_LEN - 4]], 1), 4, rEnd, SEEN);
}

// The flanges at the ports: a stadium of cast iron, with two studs and nuts, and a gasket behind it
export function buildExhaustFlanges(b: MeshBuilder) {
  for (const cx of CT_X) {
    b.box(cx - 21, cx + 21, PORT_Y - 19.5, PORT_Y + 19.5, -105.6 - HEAD_PORT_DZ, -97.4 - HEAD_PORT_DZ, MAT_EXH_GUNMETAL);

    for (const sx of [-21, 21]) {
      b.prismDir([cx + sx, PORT_Y, -97.4 - HEAD_PORT_DZ], [0, 0, -1], [1, 0, 0], [0, 1, 0], 19.5, 8.2, 28, 0, MAT_EXH_GUNMETAL, MAT_EXH_GUNMETAL);
    }

    b.prismDir([cx, PORT_Y, -97.2 - HEAD_PORT_DZ], [0, 0, 1], [1, 0, 0], [0, 1, 0], 2, 0.2, 4, 0, MAT_PIPE_BLACK, MAT_PIPE_BLACK);

    // where the pipe comes out of the flange, solid: a cone that starts as an oval, the port's own shape, at the
    // flange's face, and narrows to the round pipe, with a weld bead along the oval against the face and another where
    // the cone ends
    portFlare(b, cx);

    // two bolts, through the flange's two holes, into the head
    for (const sx of [-33, 33]) flangeBolt(b, [cx + sx, PORT_Y, -105.6 - HEAD_PORT_DZ], [0, 0, -1], 5.6, 0.25 * Math.sign(sx));
  }
}
