// The starter motor, cut away: body, an induction motor's wound stator and squirrel-cage rotor, drive, solenoid and fork;
// and the housings' upper half, to close it on the solid engine.

import { FLYWHEEL_WORLD_X, TAU } from "../core/constants";
import { vcross, vnorm, vsub } from "../math/vec3";
import type { FwMaterial, FwVec3 } from "./builder";
import {
  MAT_ALU_CAST, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_INJ_BRASS, MAT_STEEL_BRIGHT, MAT_ST_BLACKPL, MAT_ST_BRONZE,
  MAT_ST_CABLE, MAT_ST_COMM, MAT_ST_COPPER, MAT_ST_COPPER_DEEP, MAT_ST_CUT, MAT_ST_ENAMEL, MAT_ST_LAM, MAT_ST_MICA, MAT_ST_PINION,
  MAT_ST_PLASTIC, MAT_ST_RUBBER, MAT_ST_SOL, MAT_ST_TOOTH, MAT_ST_YOKE, MAT_ST_YOKE_IN, MAT_VT_SPRING, MAT_WASHER,
  MAT_ALU_TURNED, MAT_ST_SENSOR_MAG, MAT_ST_SENSOR_MAG2, MAT_ST_PCB,
  MAT_ST_TRACE, MAT_ST_IC, MAT_ST_SMD, MAT_ST_LEAD_U, MAT_ST_LEAD_V, MAT_ST_LEAD_W,
  MAT_BENDIX,
  MAT_BENDIX_DEEP,
  MAT_FIN_GREY_CREST,
  MAT_FIN_LIGHT,
  MAT_FIN_LIGHT_CREST,
  MAT_FIN_LIGHT_ROOT,
  MAT_FIN_GREY,
} from "./materials";
import { finSection } from "./plenum";
import { PINION_TOOTH, ST_D, ST_TEETH } from "./gearing";
import { annulus, curveFromPoints, roundedCurve, sweepTube } from "./tubes";
import type { MeshBuilder } from "./tubes";

// ======== THE STARTER MOTOR ========
// Built in its own frame: `a` along its axis (toward the back of the engine), `p` out from the crank's axis, `q` downward. The
// housings are cut away along the axis, the upper half removed, so that one looks into them from above: the motor, brushless,
// its wound stator round the outside, its windings' sides along it and their end windings at each end, the squirrel-cage rotor turning inside it, and the sensor that reads its speed, the solenoid with its winding, its plunger and
// its return spring, and the nose with the Bendix
// drive, its pinion, its overrunning clutch, its spring and the fork that moves it.

// A band of a cylinder or a cone, from angle t0 to t1 about the axis through (cp, cq), cut open if it is not all the way round
function arcBand(
  b: MeshBuilder, a0: number, a1: number, rIn: [number, number], rOut: [number, number], t0: number, t1: number,
  cp: number, cq: number, outer: FwMaterial, inner: FwMaterial, cut: FwMaterial, steps = 32
) {
  const pt = (a: number, r: number, t: number): FwVec3 => [a, cp + r * Math.cos(t), cq + r * Math.sin(t)];

  for (let i = 0; i < steps; i++) {
    const ta = t0 + ((t1 - t0) * i) / steps;
    const tb = t0 + ((t1 - t0) * (i + 1)) / steps;
    const tm = (ta + tb) / 2;
    const cm = Math.cos(tm);
    const sm = Math.sin(tm);

    b.flatQuad(pt(a0, rOut[0], ta), pt(a1, rOut[1], ta), pt(a1, rOut[1], tb), pt(a0, rOut[0], tb), [0, cm, sm], outer);
    b.flatQuad(pt(a0, rIn[0], ta), pt(a1, rIn[1], ta), pt(a1, rIn[1], tb), pt(a0, rIn[0], tb), [0, -cm, -sm], inner);
    b.flatQuad(pt(a0, rIn[0], ta), pt(a0, rOut[0], ta), pt(a0, rOut[0], tb), pt(a0, rIn[0], tb), [-1, 0, 0], outer);
    b.flatQuad(pt(a1, rIn[1], ta), pt(a1, rOut[1], ta), pt(a1, rOut[1], tb), pt(a1, rIn[1], tb), [1, 0, 0], outer);
  }

  if (t1 - t0 < TAU - 0.01) {
    b.flatQuad(pt(a0, rIn[0], t0), pt(a1, rIn[1], t0), pt(a1, rOut[1], t0), pt(a0, rOut[0], t0), [0, Math.sin(t0), -Math.cos(t0)], cut);
    b.flatQuad(pt(a0, rIn[0], t1), pt(a1, rIn[1], t1), pt(a1, rOut[1], t1), pt(a0, rOut[0], t1), [0, -Math.sin(t1), Math.cos(t1)], cut);
  }
}

// A toothed disc about the axis through (cp, cq): a pinion, an armature core, a commutator. `wRoot` and `wTip` are the width
// of a tooth at its root and at its tip, as a share of the pitch
function toothedDisc(
  b: MeshBuilder, a0: number, a1: number, cp: number, cq: number, rTip: number, rRoot: number, teeth: number,
  wRoot: number, wTip: number, matSide: FwMaterial, matCap: FwMaterial, matRoot: FwMaterial | null = null
) {
  const d = TAU / teeth;
  const pts: Array<[number, number]> = [];

  for (let k = 0; k < teeth; k++) {
    const t = k * d;

    pts.push([rRoot, t - (wRoot * d) / 2], [rTip, t - (wTip * d) / 2], [rTip, t + (wTip * d) / 2], [rRoot, t + (wRoot * d) / 2]);
  }

  const P = (a: number, r: number, t: number): FwVec3 => [a, cp + r * Math.cos(t), cq + r * Math.sin(t)];

  for (let i = 0; i < pts.length; i++) {
    const [r0, t0] = pts[i];
    const [r1, t1raw] = pts[(i + 1) % pts.length];
    const t1 = t1raw < t0 ? t1raw + TAU : t1raw;
    const tm = (t0 + t1) / 2;
    const m = matRoot && r0 === rRoot && r1 === rRoot ? matRoot : matSide;

    b.flatQuad(P(a0, r0, t0), P(a1, r0, t0), P(a1, r1, t1), P(a0, r1, t1), [0, Math.cos(tm), Math.sin(tm)], m);
    b.flatTri(P(a0, 0, 0), P(a0, r0, t0), P(a0, r1, t1), [-1, 0, 0], matCap);
    b.flatTri(P(a1, 0, 0), P(a1, r0, t0), P(a1, r1, t1), [1, 0, 0], matCap);
  }
}

// A straight rod between two points
function stRod(b: MeshBuilder, from: FwVec3, to: FwVec3, r: number, mat: FwMaterial) {
  sweepTube(b, curveFromPoints([from, to], 4), () => r, mat, { segments: 14, capStart: true, capEnd: true });
}

// A coil spring about the axis from A to B
function coilAlong(b: MeshBuilder, A: FwVec3, B: FwVec3, r: number, wire: number, turns: number, mat: FwMaterial) {
  const d = vnorm(vsub(B, A));
  const helper: FwVec3 = Math.abs(d[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = vnorm(vcross(d, helper));
  const v = vcross(d, u);
  const n = Math.max(12, Math.round(turns * 14));
  const pts: FwVec3[] = [];

  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const t = TAU * turns * f;
    const c = Math.cos(t) * r;
    const s = Math.sin(t) * r;

    pts.push([
      A[0] + (B[0] - A[0]) * f + c * u[0] + s * v[0],
      A[1] + (B[1] - A[1]) * f + c * u[1] + s * v[1],
      A[2] + (B[2] - A[2]) * f + c * u[2] + s * v[2],
    ]);
  }

  sweepTube(b, curveFromPoints(pts, 2), () => wire, mat, { segments: 8, capStart: true, capEnd: true });
}

// A hex nut or bolt head along the axis, at (a, p, q), facing along dir
function stHex(b: MeshBuilder, a: number, p: number, q: number, r: number, h: number, dir: number) {
  b.prismDir([a, p, q], [dir, 0, 0], [0, 1, 0], [0, 0, 1], r, h, 6, 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
}

// A point on a circle of radius r about the starter's axis, at angle t, a along it; and the two directions there
const onAxis = (a: number, r: number, t: number): FwVec3 => [a, r * Math.cos(t), r * Math.sin(t)];
const radialAt = (t: number): FwVec3 => [0, Math.cos(t), Math.sin(t)];
const tangentAt = (t: number): FwVec3 => [0, -Math.sin(t), Math.cos(t)];

// A box whose edges run along the unit directions u, v and w, centred at c, with these half sizes
function obox(b: MeshBuilder, c: FwVec3, u: FwVec3, v: FwVec3, w: FwVec3, hu: number, hv: number, hw: number, m: FwMaterial) {
  const P = (su: number, sv: number, sw: number): FwVec3 => [
    c[0] + su * hu * u[0] + sv * hv * v[0] + sw * hw * w[0],
    c[1] + su * hu * u[1] + sv * hv * v[1] + sw * hw * w[1],
    c[2] + su * hu * u[2] + sv * hv * v[2] + sw * hw * w[2],
  ];
  const neg = (d: FwVec3): FwVec3 => [-d[0], -d[1], -d[2]];

  b.flatQuad(P(1, -1, -1), P(1, 1, -1), P(1, 1, 1), P(1, -1, 1), u, m);
  b.flatQuad(P(-1, -1, -1), P(-1, 1, -1), P(-1, 1, 1), P(-1, -1, 1), neg(u), m);
  b.flatQuad(P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1), v, m);
  b.flatQuad(P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1), neg(v), m);
  b.flatQuad(P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1), w, m);
  b.flatQuad(P(-1, -1, -1), P(1, -1, -1), P(1, 1, -1), P(-1, 1, -1), neg(w), m);
}

// A smooth path through the given points (a Catmull-Rom spline), `per` points between each two
function smoothPath(points: FwVec3[], per = 6): FwVec3[] {
  const out: FwVec3[] = [];
  const at = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);

    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (j: number) =>
        0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);

      out.push([f(0), f(1), f(2)]);
    }
  }

  out.push(points[points.length - 1]);

  return out;
}

// A wire along a smooth path
function wire(b: MeshBuilder, points: FwVec3[], r: number, m: FwMaterial, segments = 6) {
  sweepTube(b, curveFromPoints(smoothPath(points, 4), 1000), () => r, m, { segments, capStart: true, capEnd: true });
}

// A coil wound round an axis (cp, cq) and cut open with its housing: of each turn only the half that is left, so that
// the wire's cut ends show along the cut. Layer upon layer, from rIn outward, the turns `w` apart
function cutCoil(b: MeshBuilder, a0: number, a1: number, rIn: number, layers: number, w: number, cp: number, cq: number, m: FwMaterial) {
  for (let layer = 0; layer < layers; layer++) {
    const r = rIn + w + layer * 2 * w * 0.94;
    const shift = layer % 2 === 0 ? 0 : w; // each layer lies in the grooves of the one below

    for (let a = a0 + w + shift; a + w <= a1; a += 2 * w) {
      const pts: FwVec3[] = [];

      for (let k = 0; k <= 10; k++) {
        const t = (k / 10) * ST_HALF;

        pts.push([a + (w * k) / 10, cp + r * Math.cos(t), cq + r * Math.sin(t)]);
      }

      sweepTube(b, curveFromPoints(pts, 1000), () => w * 0.96, m, { segments: 5, capStart: true, capEnd: true });
    }
  }
}

/* ---- the starter, in parts that move: the body stands; the shaft with its armature turns; the drive (clutch shell, spring, collar) turns and slides;
   the pinion with its clutch's hub turns at the ring gear's pace and slides; the plunger slides; the contact disc slides; the return spring is
   squeezed; the fork turns about its pivot. All are built in the starter's own frame: `a` along its axis, `p` out from the crank's, `q` across.
   The pinion's teeth are found from the ring gear's (see gearing.ts): each is what the ring's involute teeth never sweep through while the
   two turn together ---- */

const ST_HALF = Math.PI; // the lower half, q > 0: what is left of a housing cut away along its axis
export { ST_D, ST_TEETH };
export const ST_SQ = -96; // the solenoid's axis, in q
export const ST_PIV_A = 100;
export const ST_PIV_Q = -71.6;
export const ST_PHI_MAX = 0.4537; // how far the fork turns, 26 degrees
const ST_POLES = 8; // the speed sensor magnet's poles
// The motor is made longer than it was drawn: everything between ST_STRETCH.a0 and a1 along the axis (the yoke, the stator
// and rotor, the solenoid) is drawn ST_STRETCH.k times as long, and everything behind it moved back with it
export const ST_STRETCH = { a0: 130, a1: 270, k: 1.4 };
export const stA = (a: number) => {
  const { a0, a1, k } = ST_STRETCH;

  return a <= a0 ? a : a <= a1 ? a0 + (a - a0) * k : a + (a1 - a0) * (k - 1);
};
// the stretch, as a turn for the builder: positions along the axis remapped, normals tilted to suit
export const stretchTurn = (p: FwVec3, n: FwVec3): [FwVec3, FwVec3] => {
  const { a0, a1, k } = ST_STRETCH;
  const inside = p[0] > a0 && p[0] < a1;
  const nx = inside ? n[0] / k : n[0];
  const l = Math.hypot(nx, n[1], n[2]) || 1;

  return [[stA(p[0]), p[1], p[2]], [nx / l, n[1] / l, n[2] / l]];
};

const ST_SLOTS = 24; // the stator's slots, all round
const ST_BARS = 22; // the rotor cage's bars
// the induction motor: its rotor's stack, its bars' and its rings' radius; the stator's stack, its bore, the bottom of its
// slots, its back iron's outside (the coils wound round it, under the yoke), its teeth's width
const MOTOR = {
  rotor: { a0: 178, a1: 250, rCore: 29.4, rBar: 28.5, rRing: 29.6 },
  stator: { a0: 180, a1: 248, rBore: 30.6, rSlot: 39.6, rOut: 44.4, tooth: 3.4 },
};
// A quad whose normal is turned to point away from `from`
function stQuad(b: MeshBuilder, p0: FwVec3, p1: FwVec3, p2: FwVec3, p3: FwVec3, from: FwVec3, m: FwMaterial) {
  let n = vnorm(vcross(vsub(p1, p0), vsub(p3, p0)));
  const c: FwVec3 = [(p0[0] + p2[0]) / 2 - from[0], (p0[1] + p2[1]) / 2 - from[1], (p0[2] + p2[2]) / 2 - from[2]];

  if (n[0] * c[0] + n[1] * c[1] + n[2] * c[2] < 0) n = [-n[0], -n[1], -n[2]];

  b.flatQuad(p0, p1, p2, p3, n, m);
}

// The nine teeth of the pinion, from `a0` to `a1`. The end that meets the ring gear first (a0) is chamfered deeply, its
// tips cut back to a point on each side, so that the teeth lead themselves into the ring's spaces; the other end is only
// eased
function pinionTeeth(b: MeshBuilder, a0: number, a1: number) {
  const d = TAU / ST_TEETH;
  const rRoot = PINION_TOOTH[0][0];
  const rTip = PINION_TOOTH[PINION_TOOTH.length - 1][0];
  const rFull = rRoot + 0.35 * (rTip - rRoot); // below this the chamfers do not reach
  const stations: Array<[number, number]> = [[a0, 3.4], [a0 + 1.6, 1.4], [a0 + 3.8, 0], [a1 - 2, 0], [a1, 1.2]];

  const outline = (tc: number, inset: number): Array<[number, number]> => {
    const left: Array<[number, number]> = [];
    const right: Array<[number, number]> = [];

    for (const [r, w] of PINION_TOOTH) {
      const k = Math.max(0, (r - rFull) / (rTip - rFull));
      const rr = r - inset * k * k;
      const ww = Math.max(0.008, w - (0.45 * inset * k) / r);

      left.push([rr, tc - ww]);
      right.unshift([rr, tc + ww]);
    }

    return [...left, ...right];
  };

  const P = (a: number, r: number, t: number): FwVec3 => [a, r * Math.cos(t), r * Math.sin(t)];

  for (let k = 0; k < ST_TEETH; k++) {
    const tc = k * d;
    const core: FwVec3 = [0, (rRoot + 3) * Math.cos(tc), (rRoot + 3) * Math.sin(tc)];
    const rings = stations.map(([a, inset]) => ({ a, pts: outline(tc, inset) }));

    for (let s = 0; s < rings.length - 1; s++) {
      for (let i = 0; i < rings[s].pts.length - 1; i++) {
        const [r0, t0] = rings[s].pts[i];
        const [r1, t1] = rings[s].pts[i + 1];
        const [r2, t2] = rings[s + 1].pts[i + 1];
        const [r3, t3] = rings[s + 1].pts[i];
        const tip = i === PINION_TOOTH.length - 1;

        stQuad(b, P(rings[s].a, r0, t0), P(rings[s].a, r1, t1), P(rings[s + 1].a, r2, t2), P(rings[s + 1].a, r3, t3), core, tip ? MAT_ST_TOOTH : MAT_ST_PINION);
      }
    }

    for (const [ring, dir] of [[rings[0], -1], [rings[rings.length - 1], 1]] as const) {
      const c: FwVec3 = [ring.a, 0, 0];

      for (const [r, t] of ring.pts) {
        c[1] += (r * Math.cos(t)) / ring.pts.length;
        c[2] += (r * Math.sin(t)) / ring.pts.length;
      }

      for (let i = 0; i < ring.pts.length - 1; i++) {
        const [r0, t0] = ring.pts[i];
        const [r1, t1] = ring.pts[i + 1];

        b.flatTri(c, P(ring.a, r0, t0), P(ring.a, r1, t1), [dir, 0, 0], MAT_ST_TOOTH);
      }
    }
  }

  b.revolve({ x0: a0, r0: rRoot, x1: a1, r1: rRoot, n: [0, 1], m: MAT_ST_PINION, steps: 72 });
  b.revolve({ x0: a0, r0: 12.5, x1: a0, r1: rRoot, n: [-1, 0], m: MAT_ST_TOOTH, steps: 36 });
  b.revolve({ x0: a1, r0: 12.5, x1: a1, r1: rRoot, n: [1, 0], m: MAT_ST_PINION, steps: 36 });
}

// ---- the pinion, with the clutch's hub and its six rollers: it turns at the ring gear's pace ----
export function buildStarterPinion(b: MeshBuilder) {
  pinionTeeth(b, -11, 8);
  annulus(b, [-11.8, 0, 0], [-1, 0, 0], 11, 12.8, MAT_ST_BRONZE, 28);

  // the hub, with six shallow pockets for the rollers
  b.revolve({ x0: 8, r0: 17.5, x1: 16, r1: 17.5, n: [0, 1], m: MAT_BENDIX, steps: 72 });
  toothedDisc(b, 16, 56, 0, 0, 17.5, 15.2, 6, 1.0, 0.82, MAT_BENDIX, MAT_BENDIX, MAT_BENDIX);

  for (let k = 0; k < 6; k++) {
    const th = ((k + 0.5) * Math.PI) / 3;
    const cy = 19.7 * Math.cos(th);
    const cz = 19.7 * Math.sin(th);

    stRod(b, [20, cy, cz], [52, cy, cz], 3.1, MAT_STEEL_BRIGHT);
    // the little plunger and spring that keep each roller to its wedge
    stRod(b, [24, 19.7 * Math.cos(th + 0.34), 19.7 * Math.sin(th + 0.34)], [48, 19.7 * Math.cos(th + 0.34), 19.7 * Math.sin(th + 0.34)], 1.1, MAT_ST_BRONZE);
  }
}

// ---- the drive: the clutch's shell, its spring, and the collar the fork pushes; it turns with the shaft and slides along it ----
// the clutch's shell, from t0 round to t1, with its knurl
function driveShell(b: MeshBuilder, t0: number, t1: number) {
  // cooling fins along it, as on the nose round it
  noseFins(b, t0, t1, () => 30, DRIVE_FINS);

  arcBand(b, 16, 60, [24.5, 24.5], [29, 29], t0, t1, 0, 0, MAT_BENDIX, MAT_ST_YOKE_IN, MAT_ST_CUT);
  arcBand(b, 14, 18, [17.6, 17.6], [29, 29], t0, t1, 0, 0, MAT_BENDIX, MAT_ST_YOKE_IN, MAT_ST_CUT, 24);
  arcBand(b, 56, 62, [11.2, 11.2], [29, 29], t0, t1, 0, 0, MAT_BENDIX, MAT_ST_YOKE_IN, MAT_ST_CUT, 24);

  // the knurl on the shell
  for (let k = 0; k < 14; k++) {
    const t = t0 + 0.12 + (k * (t1 - t0 - 0.24)) / 13;

    arcBand(b, 18, 56, [29, 29], [30, 30], t - 0.035, t + 0.035, 0, 0, MAT_BENDIX, MAT_BENDIX, MAT_BENDIX, 2);
  }
}

// ---- the other half of the clutch's shell, the half the cut takes away: drawn only on the plain, solid engine, so that the
// drive is whole and closed there, and nothing open on it seems to move as the view turns ----
export function buildStarterDriveShell(b: MeshBuilder) {
  driveShell(b, ST_HALF, TAU);

  // and a plain, smooth sleeve over the whole clutch, its knurl and its spring, up to the collar: their fine ribs and
  // the spring's coil, seen as the view turns, looked as if they were spinning (a barber's pole); a smooth drum does not
  b.revolve({ x0: 14.4, r0: 30.4, x1: 97.4, r1: 30.4, n: [0, 1], m: MAT_BENDIX, steps: 72 });
  annulus(b, [14.4, 0, 0], [-1, 0, 0], 17.4, 30.4, MAT_BENDIX, 72);
  annulus(b, [97.4, 0, 0], [1, 0, 0], 25.6, 30.4, MAT_BENDIX, 72);
  // and the fins along the whole sleeve, all round
  noseFins(b, 0, TAU, () => 30.4, { ...DRIVE_FINS, a1: 94 });
}

export function buildStarterDrive(b: MeshBuilder) {
  driveShell(b, 0, ST_HALF);

  // the spring between the shell and the collar, on its two seats
  annulus(b, [62.8, 0, 0], [1, 0, 0], 12, 25, MAT_WASHER, 32);
  coilAlong(b, [64, 0, 0], [94, 0, 0], 20, 2.2, 7, MAT_VT_SPRING);
  annulus(b, [96, 0, 0], [-1, 0, 0], 12, 25, MAT_WASHER, 32);

  // the collar, its groove, and a thrust ring behind it: grey metal with a fine sandpaper grit, matte, no polished bands
  // that seem to run round it as the view turns
  b.revolve({ x0: 98, r0: 26, x1: 98, r1: 30, n: [-1, 0], m: MAT_BENDIX, steps: 72 });
  b.revolve({ x0: 98, r0: 30, x1: 103, r1: 30, n: [0, 1], m: MAT_BENDIX, steps: 72 });
  b.revolve({ x0: 103, r0: 30, x1: 106, r1: 24, n: [0.89, 0.45], m: MAT_BENDIX, steps: 72 });
  b.revolve({ x0: 106, r0: 24, x1: 109, r1: 30, n: [-0.89, 0.45], m: MAT_BENDIX, steps: 72 });
  b.revolve({ x0: 109, r0: 30, x1: 114, r1: 30, n: [0, 1], m: MAT_BENDIX, steps: 72 });
  b.revolve({ x0: 114, r0: 26, x1: 114, r1: 30, n: [1, 0], m: MAT_BENDIX, steps: 72 });
  annulus(b, [114.9, 0, 0], [1, 0, 0], 11.5, 26, MAT_BENDIX_DEEP, 32); // (clear of the collar's face, so that the two do not flicker)
}

// ---- the shaft with the outer rotor and its sensor magnet: it turns ----
export function buildStarterShaft(b: MeshBuilder) {
  stRod(b, [-48, 0, 0], [366, 0, 0], 11, MAT_STEEL_BRIGHT);
  stHex(b, -48, 0, 0, 13.5, 6, 1);
  annulus(b, [-42, 0, 0], [1, 0, 0], 11, 17, MAT_WASHER, 32);

  // the helical splines the drive rides on
  for (let j = 0; j < 8; j++) {
    const pts: FwVec3[] = [];

    for (let i = 0; i <= 40; i++) {
      const a = -36 + (i * 136) / 40;
      const t = (j * TAU) / 8 + a * 0.05;

      pts.push([a, 11.4 * Math.cos(t), 11.4 * Math.sin(t)]);
    }

    sweepTube(b, curveFromPoints(pts, 2), () => 1.5, MAT_STEEL_BRIGHT, { segments: 6, capStart: true, capEnd: true });
  }

  // the stop ring and its circlip, behind the collar's rest
  b.revolve({ x0: 118, r0: 11, x1: 121, r1: 16, n: [0.9, 0.4], m: MAT_STEEL_BRIGHT, steps: 32 });
  b.revolve({ x0: 121, r0: 16, x1: 124, r1: 16, n: [0, 1], m: MAT_STEEL_BRIGHT, steps: 32 });
  b.revolve({ x0: 126, r0: 11, x1: 127.6, r1: 13.6, n: [0, 1], m: MAT_ST_YOKE_IN, steps: 32 });

  // ---- the rotor of an induction motor: a squirrel cage. On the shaft, a stack of thin steel laminations, and in it,
  // just under its skin, ST_BARS bars of cast aluminium running its length, skewed by one bar's pitch from end to end so
  // that it pulls smoothly; at each end an aluminium ring, cast with the bars, that shorts them all together, with the
  // little fan blades cast on its outer face that stir the air through the windings. No magnets, no brushes: the stator's
  // turning field makes the current in the bars ----
  const R = MOTOR.rotor;
  const barPitch = TAU / ST_BARS;

  arcBand(b, R.a0, R.a1, [11, 11], [R.rCore, R.rCore], 0, TAU, 0, 0, MAT_ST_LAM, MAT_ST_LAM, MAT_ST_LAM, 64);

  // the laminations' edges round its skin: a fine dark line every 2.4
  for (let a = R.a0 + 1.6; a < R.a1 - 1; a += 2.4) {
    arcBand(b, a, a + 0.3, [R.rCore, R.rCore], [R.rCore + 0.04, R.rCore + 0.04], 0, TAU, 0, 0, MAT_ST_MICA, MAT_ST_MICA, MAT_ST_MICA, 64);
  }

  for (let k = 0; k < ST_BARS; k++) {
    const pts: FwVec3[] = [];

    for (let i = 0; i <= 20; i++) {
      const f = i / 20;

      pts.push(onAxis(R.a0 - 1 + (R.a1 - R.a0 + 2) * f, R.rBar, k * barPitch + barPitch * f));
    }

    sweepTube(b, curveFromPoints(pts, 2), () => 1.35, MAT_ALU_TURNED, { segments: 8 });
  }

  // the end rings, and the fan blades on their outer faces
  for (const [a0, a1, out] of [[R.a0 - 7, R.a0, -1], [R.a1, R.a1 + 7, 1]] as Array<[number, number, number]>) {
    arcBand(b, a0, a1, [18, 18], [R.rRing, R.rRing], 0, TAU, 0, 0, MAT_ALU_TURNED, MAT_ALU_CAST, MAT_ALU_CAST, 64);
    b.revolve({ x0: out < 0 ? a0 : a1, r0: 18, x1: out < 0 ? a0 : a1, r1: 11, n: [out, 0], m: MAT_ALU_CAST, steps: 32 });

    for (let k = 0; k < 10; k++) {
      const t = (k / 10) * TAU;
      const face = out < 0 ? a0 : a1;

      obox(b, onAxis(face + out * 3, 24, t), [1, 0, 0], radialAt(t), tangentAt(t), 3, 5.4, 0.7, MAT_ALU_CAST);
    }

    // the balancing weights riveted on the ring
    for (const t of [0.7, 3.9]) b.prismDir(onAxis((a0 + a1) / 2, R.rRing, t + (out < 0 ? 0 : 1.3)), radialAt(t + (out < 0 ? 0 : 1.3)), [1, 0, 0], tangentAt(t + (out < 0 ? 0 : 1.3)), 2.2, 1.2, 10, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
  }

  // the speed sensor's magnet ring: a steel hub on the shaft and round it a ring of ST_POLES poles, dark and light in
  // turn, for the inverter to read the rotor's speed
  b.revolve({ x0: 294, r0: 11, x1: 304, r1: 11, n: [0, 1], m: MAT_STEEL_BRIGHT, steps: 32 });
  b.revolve({ x0: 294, r0: 11, x1: 294, r1: 15, n: [-1, 0], m: MAT_STEEL_BRIGHT, steps: 32 });

  const poleArc = TAU / ST_POLES;

  for (let k = 0; k < ST_POLES; k++) {
    const m = k % 2 === 0 ? MAT_ST_SENSOR_MAG : MAT_ST_SENSOR_MAG2;

    arcBand(b, 295, 303, [15, 15], [19.6, 19.6], k * poleArc, (k + 1) * poleArc, 0, 0, m, m, m, 6);
  }

  annulus(b, [340, 0, 0], [1, 0, 0], 11, 17, MAT_WASHER, 28);
}

// ---- the plunger, with its rod to the fork and its push rod to the contact disc: it slides along the solenoid ----
export function buildStarterPlunger(b: MeshBuilder) {
  const SQ = ST_SQ;

  stRod(b, [158, 0, SQ], [240, 0, SQ], 17, MAT_STEEL_BRIGHT);
  stRod(b, [106, 0, SQ], [158, 0, SQ], 7, MAT_STEEL_BRIGHT);
  stRod(b, [240, 0, SQ], [276, 0, SQ], 4, MAT_STEEL_BRIGHT);
  annulus(b, [106, 0, SQ], [-1, 0, 0], 4, 10, MAT_STEEL_BRIGHT, 24);

  for (const a of [176, 196, 216]) stRod(b, [a, 0, SQ], [a + 1.4, 0, SQ], 17.3, MAT_ST_MICA);

  // the hook where the fork takes hold: a cross pin through the rod's end
  stRod(b, [106, -9, SQ], [106, 9, SQ], 3.6, MAT_ST_BRONZE);
}

// ---- the contact disc, with its stem: it slides until it meets the studs ----
export function buildStarterDisc(b: MeshBuilder) {
  const SQ = ST_SQ;

  stRod(b, [272, 0, SQ], [284, 0, SQ], 17, MAT_STEEL_BRIGHT);
  stRod(b, [276, 0, SQ], [282, 0, SQ], 21, MAT_ST_COPPER);
  annulus(b, [282.2, 0, SQ], [1, 0, 0], 6, 21, MAT_ST_COMM, 32);
  annulus(b, [271.8, 0, SQ], [-1, 0, 0], 17, 22, MAT_ST_MICA, 32);
}

// ---- the return spring, along the part's own y: it is squeezed by scaling it ----
export function buildStarterSpring(b: MeshBuilder) {
  coilAlong(b, [0, 0, 0], [0, 20, 0], 13, 1.8, 5, MAT_VT_SPRING);
}

// ---- the fork: the two arms from the plunger's hook down to the collar's groove, with their shoes, on a bronze sleeve at the pivot. Its
// own frame: x along the pivot, y toward the front of the engine's back (-a), z across (q), the origin on the pivot's axis ----
export function buildStarterFork(b: MeshBuilder) {
  const F3 = (a: number, p: number, q: number): FwVec3 => [p, -(a - ST_PIV_A), q - ST_PIV_Q];
  const N3 = (na: number, np: number, nq: number): FwVec3 => [np, -na, nq];

  const boxF = (a0: number, a1: number, p0: number, p1: number, q0: number, q1: number, m: FwMaterial) =>
    b.box(Math.min(p0, p1), Math.max(p0, p1), -(Math.max(a0, a1) - ST_PIV_A), -(Math.min(a0, a1) - ST_PIV_A), Math.min(q0, q1) - ST_PIV_Q, Math.max(q0, q1) - ST_PIV_Q, m);

  // A plate of the lever, stamped from steel `p0` to `p1` thick: its outline the hull of two round ends, one about each of
  // two points in the (a, q) plane, with its edges eased
  const plate = (a1: number, q1: number, r1: number, a2: number, q2: number, r2: number, p0: number, p1: number) => {
    const d = Math.atan2(q2 - q1, a2 - a1);
    const outline: Array<[number, number]> = [];

    for (let k = 0; k <= 12; k++) {
      const t = d + Math.PI / 2 + (k / 12) * Math.PI;

      outline.push([a1 + r1 * Math.cos(t), q1 + r1 * Math.sin(t)]);
    }

    for (let k = 0; k <= 12; k++) {
      const t = d - Math.PI / 2 + (k / 12) * Math.PI;

      outline.push([a2 + r2 * Math.cos(t), q2 + r2 * Math.sin(t)]);
    }

    const ca = (a1 + a2) / 2;
    const cq = (q1 + q2) / 2;

    for (let k = 0; k < outline.length; k++) {
      const [aa, qa] = outline[k];
      const [ab, qb] = outline[(k + 1) % outline.length];
      const na = qb - qa;
      const nq = -(ab - aa);
      const flip = na * ((aa + ab) / 2 - ca) + nq * ((qa + qb) / 2 - cq) < 0 ? -1 : 1;

      b.flatQuad(F3(aa, p0, qa), F3(ab, p0, qb), F3(ab, p1, qb), F3(aa, p1, qa), N3(flip * na, 0, flip * nq), MAT_STEEL_BRIGHT);
      b.flatTri(F3(ca, p0, cq), F3(aa, p0, qa), F3(ab, p0, qb), N3(0, -1, 0), MAT_STEEL_BRIGHT);
      b.flatTri(F3(ca, p1, cq), F3(aa, p1, qa), F3(ab, p1, qb), N3(0, 1, 0), MAT_STEEL_BRIGHT);
    }
  };

  // the bronze bush the lever turns on, and its pin
  stRod(b, F3(100, -27, ST_PIV_Q), F3(100, 27, ST_PIV_Q), 5.4, MAT_ST_BRONZE);

  for (const sg of [-1, 1]) {
    // the arm down to the collar, a plate either side of it, and at its end a shoe in the collar's groove on a pin
    plate(ST_PIV_A, ST_PIV_Q, 8.5, 104.2, -12.5, 5.2, sg * 20.6, sg * 23.8);
    boxF(102.4, 107.6, sg * 20.2 - 2.4, sg * 20.2 + 2.4, -14.5, -6.5, MAT_ST_BRONZE);
    stRod(b, F3(105, sg * 18, -10.4), F3(105, sg * 25.4, -10.4), 1.7, MAT_STEEL_BRIGHT);

    // the lever's top: a plate either side of the plunger's rod, up to its cross pin
    plate(ST_PIV_A, ST_PIV_Q, 8, 106, ST_SQ, 6.4, sg * 5.6, sg * 8.4);
    stRod(b, F3(100, sg * 24.6 - 3.4, ST_PIV_Q), F3(100, sg * 24.6 + 3.4, ST_PIV_Q), 6.6, MAT_STEEL_BRIGHT);
  }

  // the bridge that joins the two arms, folded from the same plate, just below the pivot
  boxF(98.2, 101.8, -23.6, 23.6, -60, -52, MAT_STEEL_BRIGHT);
  stRod(b, F3(106, -12, ST_SQ), F3(106, 12, ST_SQ), 4.4, MAT_STEEL_BRIGHT);

  // the clip that keeps the plunger's cross pin in the lever
  for (const sg of [-1, 1]) annulus(b, F3(106, sg * 9.2, ST_SQ), N3(0, sg, 0), 4.4, 6.2, MAT_WASHER, 16);
}

type FinSet = { count: number; a0: number; a1: number; t: number; h: number };

const NOSE_FINS: FinSet = { count: 22, a0: 18, a1: 108, t: 4.2, h: 7.5 };
// the same fins on the bendix's drum, smaller, as it is: along its clutch's shell (and, on the solid engine, the sleeve)
// and on the solenoid, the coil that throws the bendix forward: the same fins along its case, all round its own axis
const SOLENOID_FINS: FinSet = { count: 20, a0: 136, a1: 302, t: 7.6, h: 3.6 };
const DRIVE_FINS: FinSet = { count: 18, a0: 18, a1: 56, t: 3.4, h: 5.5 };

function noseFins(b: MeshBuilder, t0: number, t1: number, noseR: (a: number) => number, F: FinSet = NOSE_FINS, cq = 0, light = false) {
  // the solenoid's in a lighter, brighter metal
  const tone = (m: FwMaterial) => (!light ? m : m === MAT_FIN_GREY ? MAT_FIN_LIGHT : m === MAT_FIN_GREY_CREST ? MAT_FIN_LIGHT_CREST : MAT_FIN_LIGHT_ROOT);
  const n = 30;
  const NOSE_FINS = F;

  for (let f = 0; f < NOSE_FINS.count; f++) {
    const t = ((f + 0.5) / NOSE_FINS.count) * TAU;

    if (t < t0 || t >= t1) continue;

    const rows: Array<Array<{ p: FwVec3; n: FwVec3; m: FwMaterial }>> = [];

    for (let k = 0; k <= n; k++) {
      const a = NOSE_FINS.a0 + ((NOSE_FINS.a1 - NOSE_FINS.a0) * k) / n;
      const ends = Math.min(1, (a - NOSE_FINS.a0) / 10, (NOSE_FINS.a1 - a) / 10);
      const e = Math.sqrt(Math.max(0, ends));
      const h = Math.max(0.4, NOSE_FINS.h * e);
      const w = NOSE_FINS.t * (0.6 + 0.4 * e);
      const p0 = onAxis(a, noseR(a) - 0.6, t);

      p0[2] += cq; // (about the solenoid's own axis, when it is the solenoid's)
      const nn = radialAt(t);
      const side = tangentAt(t);

      rows.push(finSection(w, h).map((q) => ({
        p: [p0[0], p0[1] + side[1] * q.p[0] + nn[1] * q.p[1], p0[2] + side[2] * q.p[0] + nn[2] * q.p[1]] as FwVec3,
        n: vnorm([0, side[1] * q.n[0] + nn[1] * q.n[1], side[2] * q.n[0] + nn[2] * q.n[1]]),
        m: tone(q.m),
      })));
    }

    for (let k = 0; k < n; k++) {
      const A = rows[k];
      const B = rows[k + 1];

      for (let j = 0; j + 1 < A.length; j++) {
        const m = A[j].m === A[j + 1].m ? A[j].m : tone(MAT_FIN_GREY);

        for (const q of [A[j], B[j], B[j + 1], A[j], B[j + 1], A[j + 1]]) b.push(q.p, q.n, m, 1);
      }
    }
  }
}

// The housings, as a band of angle from t0 to t1 round the axis: the nose with its ribs and its bearing boss, the flange,
// the motor's yoke with its flanges and seam, the end cap with its ribs and its bearing, and the solenoid's case, its rim,
// its end plate, its cap and the rubber boot. The body has their lower half (the cut); the shell, the upper half
function starterHousings(b: MeshBuilder, t0: number, t1: number, yoke = true) {
  const SQ = ST_SQ;
  const noseR = (a: number) => (a < 62 ? 37 + (6 * (a - 12)) / 50 : 43 + (9 * (a - 62)) / 50);
  const band = (a0: number, a1: number, rIn: [number, number], rOut: [number, number], cq: number, outer: FwMaterial, inner: FwMaterial, steps = 32) =>
    arcBand(b, a0, a1, rIn, rOut, t0, t1, 0, cq, outer, inner, MAT_ST_CUT, steps);
  const ribsIn = (ts: number[]) => ts.map((t) => t0 + t).filter((t) => t < t1);

  // the nose, open at the front, in two cones, with its ribs, and the bearing boss behind the collar
  // (the bendix's end, as it is seen: one solid colour, matte, with a fine sandy grit, as the drive inside it)
  band(12, 62, [32, 38], [37, 43], 0, MAT_BENDIX, MAT_ST_YOKE_IN, 72);
  band(62, 112.5, [38, 46.2], [43, 52.1], 0, MAT_BENDIX, MAT_ST_YOKE_IN, 72);

  // cooling fins along it, all round, as on the intake's lid: metallic grey with a fine sandpaper grit, each with its
  // fillet, its walls and its rounded crest, standing out of the drum, rising out of it at each end
  noseFins(b, t0, t1, noseR);

  band(112, 118, [11.4, 11.4], [49, 49], 0, MAT_ALU_CAST, MAT_ST_YOKE_IN);
  band(114, 124, [11.4, 11.4], [17, 17], 0, MAT_ST_BRONZE, MAT_ST_BRONZE, 24);
  band(114, 124, [17, 17], [22, 22], 0, MAT_ALU_CAST, MAT_ALU_CAST, 24);

  // the flange, and the gasket against the wall
  band(62, 74, [43.4, 45.2], [66, 66], 0, MAT_ALU_CAST, MAT_ALU_CAST);
  arcBand(b, 61.2, 61.85, [43.4, 43.4], [65.6, 65.6], t0, t1, 0, 0, MAT_ST_RUBBER, MAT_ST_RUBBER, MAT_ST_RUBBER, 24);

  // the motor: the yoke with its seam (see-through on the cut starter: starterYoke), and its flanges
  if (yoke) starterYokeBand(b, t0, t1);

  band(112, 118, [49, 49], [58, 58], 0, MAT_ALU_CAST, MAT_ALU_CAST);
  band(276, 282, [49, 49], [58, 58], 0, MAT_ALU_CAST, MAT_ALU_CAST);

  // the end cap, its wall, its ribs and its bearing boss
  band(281.5, 332, [48, 43], [54, 48], 0, MAT_ALU_CAST, MAT_ST_YOKE_IN);
  band(331.5, 342, [14, 14], [43.6, 43.6], 0, MAT_ALU_CAST, MAT_ST_YOKE_IN);
  band(341.5, 362, [10, 10], [20, 20], 0, MAT_ALU_CAST, MAT_ST_YOKE_IN);
  band(342, 360, [10.6, 10.6], [12.2, 12.2], 0, MAT_ST_BRONZE, MAT_ST_BRONZE, 24);

  for (const t of ribsIn([0.4, 1.0, 1.57, 2.14, 2.74])) {
    arcBand(b, 300, 340, [53, 46], [60, 50], t - 0.04, t + 0.04, 0, 0, MAT_ALU_CAST, MAT_ALU_CAST, MAT_ST_CUT, 2);
  }

  // the solenoid: its end plate, its case with the crimped rim, its cap and the cap's black end, and the rubber boot
  band(126, 134, [8, 8], [36, 36], SQ, MAT_ALU_CAST, MAT_ALU_CAST, 32);
  band(126.6, 268, [30, 30], [35.7, 35.7], SQ, MAT_ST_SOL, MAT_ST_YOKE_IN);
  band(266, 270, [34, 34], [37.6, 37.6], SQ, MAT_ST_SOL, MAT_ST_YOKE_IN, 28);
  band(268, 306.6, [32, 32], [36, 36], SQ, MAT_ST_SOL, MAT_ST_YOKE_IN);
  band(306, 312, [6, 6], [36, 36], SQ, MAT_ST_BLACKPL, MAT_ST_BLACKPL);
  noseFins(b, t0, t1, (a) => (a < 268 ? 35.7 : 36), SOLENOID_FINS, SQ, true);
  band(118, 134, [7.6, 11], [9.6, 13], SQ, MAT_ST_RUBBER, MAT_ST_RUBBER, 24);
}

// The motor's yoke, the steel tube round the stator, with its seam
function starterYokeBand(b: MeshBuilder, t0: number, t1: number) {
  arcBand(b, 112.6, 281.4, [49, 49], [54, 54], t0, t1, 0, 0, MAT_ST_YOKE, MAT_ST_YOKE_IN, MAT_ST_CUT, 40); // (its ends inside the flanges: no face shared with theirs)
  arcBand(b, 190, 192, [54, 54], [54.7, 54.7], t0, t1, 0, 0, MAT_ST_YOKE_IN, MAT_ST_YOKE_IN, MAT_ST_CUT, 32);
}

// ---- the yoke, all the way round: on the cut starter drawn see-through, so that the windings round the stator, which
// is not cut, show through it on every side (on the solid engine, solid) ----
export function buildStarterYoke(b: MeshBuilder) {
  starterYokeBand(b, 0, TAU);
}

// ---- the housings' upper half, the part the cut takes away: drawn only on the plain, solid engine, so that the starter
// is whole, closed, as it looks on the car ----
export function buildStarterShell(b: MeshBuilder) {
  starterHousings(b, ST_HALF, TAU, false); // (the yoke is all round: starterYoke)
}

// Where the starter stands, in the engine's frame: its axis at ST_D from the crank's, down and out at 45 degrees, its
// pinion's end just in front of the flywheel
export const ST_AT: FwVec3 = [FLYWHEEL_WORLD_X - 40, ST_D * Math.SQRT1_2, -ST_D * Math.SQRT1_2];

// ---- everything that stands ----
export function buildStarterBody(b: MeshBuilder) {
  const SQ = ST_SQ;

  starterHousings(b, 0, ST_HALF, false); // the housings' lower half: the rest is cut away (see buildStarterShell); the yoke apart

  // the flange and its two ears, a gasket against the wall, two dowels, and the four bolts
  b.box(62, 74, -36, 36, 62, 106, MAT_ALU_CAST);
  b.box(62, 74, -36, 36, -106, -62, MAT_ALU_CAST);

  for (const q of [-90, 90]) {
    for (const p of [-22, 22]) {
      stHex(b, 74, p, q, 8, 6, 1);
      annulus(b, [74, p, q], [1, 0, 0], 4.2, 10, MAT_WASHER, 24);
      annulus(b, [73.6, p, q], [1, 0, 0], 4.2, 9, MAT_ST_YOKE_IN, 24);
      stRod(b, [50, p, q], [76, p, q], 4, MAT_STEEL_BRIGHT);
    }
  }

  for (const q of [-70, 70]) stRod(b, [54, 0, q], [64, 0, q], 3, MAT_STEEL_BRIGHT);

  // the mounting: a frame round the nose, two wings and a bridge, sectors of rings about the crank's axis; it stands for the engine's wall
  const wall = (t0: number, t1: number, r0: number, r1: number) =>
    arcBand(b, 50, 62, [r0, r0], [r1, r1], t0, t1, -ST_D, 0, MAT_ALU_CAST, MAT_ALU_CAST, MAT_ST_CUT, 12);

  wall(0.38, 0.62, 150, 224);
  wall(-0.62, -0.38, 150, 224);
  wall(-0.62, 0.62, 222, 236);

  // the stator, round the rotor, standing still: a stack of laminations, its ST_SLOTS open slots round the bore, and its
  // three-phase winding of enamelled copper wound toroidally: each coil is wound round the stack's back iron at a slot,
  // so that its turns run along the slot inside, out over the stack's end, back along the stack's outside, under the
  // yoke, and in again over the other end. Its turns lie side by side, close in the slot and fanned out over the outside,
  // in two layers (the inner one bare copper); the three phases' coils come in turn, U, V, W, each with its coloured tape
  // round its turns at the stack's ends. Unlike the housing, it is not cut: it goes all the way round, the coils on every
  // side, seen through the yoke
  const S = MOTOR.stator;
  const slotArc = TAU / ST_SLOTS;
  const r2 = (r: number) => [r, r] as [number, number];

  // the back iron, and the teeth between the slots; each slot lined with insulating paper (its walls)
  arcBand(b, S.a0, S.a1, r2(S.rSlot), r2(S.rOut), 0, TAU, 0, 0, MAT_ST_LAM, MAT_ST_MICA, MAT_ST_CUT, 96);

  for (let k = 0; k < ST_SLOTS; k++) {
    const tc = k * slotArc; // the teeth stand between the slots
    const half = S.tooth / 2 / ((S.rBore + S.rSlot) / 2);
    const ta = tc - half;
    const tb = tc + half;

    arcBand(b, S.a0, S.a1, r2(S.rBore), r2(S.rSlot + 0.2), ta, tb, 0, 0, MAT_ST_LAM, MAT_ST_LAM, MAT_ST_MICA, 3);

    // the laminations' edges on the tooth's face, toward the rotor
    for (let a = S.a0 + 1.2; a < S.a1 - 1; a += 2.4) {
      arcBand(b, a, a + 0.3, r2(S.rBore - 0.04), r2(S.rBore), ta, tb, 0, 0, MAT_ST_MICA, MAT_ST_MICA, MAT_ST_MICA, 2);
    }
  }

  // the laminations' edges round the back iron's outside, between the coils
  for (let a = S.a0 + 1.2; a < S.a1 - 1; a += 2.4) {
    arcBand(b, a, a + 0.3, r2(S.rOut), r2(S.rOut + 0.04), 0, TAU, 0, 0, MAT_ST_MICA, MAT_ST_MICA, MAT_ST_MICA, 96);
  }

  // the insulating end plates under the coils' ends, and the stack's thick end laminations
  for (const [a0, a1] of [[S.a0 - 2.2, S.a0], [S.a1, S.a1 + 2.2]]) {
    arcBand(b, a0, a1, r2(S.rSlot - 1.4), r2(S.rOut + 0.6), 0, TAU, 0, 0, MAT_ST_BLACKPL, MAT_ST_BLACKPL, MAT_ST_CUT, 96);
  }

  // The coils, one at each slot: its turns, each a loop round the back iron, rounded at its four corners
  const TURNS = 6; // side by side, in each layer
  const strand = 0.66;
  const rIn = (layer: number) => S.rSlot - 1.1 - layer * 1.75; // the turns' radius in the slot, the inner layer deepest
  const rOutC = (layer: number) => S.rOut + 1.1 + layer * 1.75; // and over the outside
  const loop = (tIn: number, tOut: number, layer: number): FwVec3[] => {
    const e = 3.4 + layer * 1.75; // how far it stands out past the stack's ends
    const ri = rIn(layer);
    const ro = rOutC(layer);
    const rc = 2.2 + layer * 1.2; // its corners' rounding
    const pts: FwVec3[] = [];
    const corner = (ca: number, cr: number, from: number, t: number) => {
      for (let k = 0; k <= 5; k++) {
        const w = from + (k / 5) * (Math.PI / 2);

        pts.push(onAxis(ca + rc * Math.cos(w), cr + rc * Math.sin(w), t));
      }
    };
    const a0 = S.a0 - e;
    const a1 = S.a1 + e;

    // along the slot to the back, up the back end, along the outside to the front, down the front end
    pts.push(onAxis((S.a0 + S.a1) / 2, ri, tIn));
    corner(a1 - rc, ri + rc, -Math.PI / 2, tIn);
    corner(a1 - rc, ro - rc, 0, tOut);
    corner(a0 + rc, ro - rc, Math.PI / 2, tOut);
    corner(a0 + rc, ri + rc, Math.PI, tIn);
    pts.push(onAxis((S.a0 + S.a1) / 2, ri, tIn));

    return pts;
  };

  for (let k = 0; k < ST_SLOTS; k++) {
    const tc = (k + 0.5) * slotArc;
    const phase = k % 3;

    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < TURNS; i++) {
        const f = i - (TURNS - 1) / 2;
        const tIn = tc + (f * 2 * strand * 1.06 + (layer ? strand * 0.5 : 0)) / rIn(layer);
        const tOut = tc + (f * 1.85) / rOutC(layer);
        // each turn its own shade of copper, as enamelled wire catches the light, a fine dark gap between neighbours
        const tone = [MAT_ST_COPPER, MAT_ST_ENAMEL, MAT_ST_COPPER_DEEP][(i + layer * 2 + k) % 3];

        sweepTube(b, curveFromPoints(loop(tIn, tOut, layer), 2.4), () => strand, tone, { segments: 5 });
      }
    }

    // the coil's tape, in its phase's colour, round its turns on the outside, near each end
    const tape = [MAT_ST_LEAD_U, MAT_ST_LEAD_V, MAT_ST_LEAD_W][phase];
    const w = (TURNS * 1.85) / 2 + 1.2;

    for (const a of [S.a0 + 5, S.a1 - 9]) {
      arcBand(b, a, a + 4, r2(rOutC(1) + strand - 0.1), r2(rOutC(1) + strand + 0.5), tc - w / rOutC(1), tc + w / rOutC(1), 0, 0, tape, tape, tape, 6);
    }
  }

  // the three phase leads, each from the end of its phase's coils, in a sleeve of its colour, back along the stator, out
  // through a rubber grommet in the end cap and on to a stud of the terminal block outside it, its ring lug under the nut
  const LEAD_T = 0.42; // where round the end cap the terminal block stands
  const studs = [288, 298, 308];
  const leadMats = [MAT_ST_LEAD_U, MAT_ST_LEAD_V, MAT_ST_LEAD_W];

  studs.forEach((sa, k) => {
    const tc = (k + 0.5) * slotArc;

    wire(b, [onAxis(S.a1 + 5, rOutC(1), tc), onAxis(S.a1 + 12, 46, tc * 0.6 + LEAD_T * 0.4), onAxis(282, 38, LEAD_T + 0.05 * (k - 1)), onAxis(sa - 4, 45, LEAD_T + 0.05 * (k - 1)), onAxis(sa, 52, LEAD_T), onAxis(sa, 60.5, LEAD_T)], 1.5, leadMats[k], 8);
    b.prismDir(onAxis(sa, 60, LEAD_T), radialAt(LEAD_T), [1, 0, 0], tangentAt(LEAD_T), 1.9, 8.5, 12, 0, MAT_INJ_BRASS, MAT_INJ_BRASS);
    annulus(b, onAxis(sa, 66.2, LEAD_T), radialAt(LEAD_T), 1.9, 4.2, MAT_ST_COPPER, 20);
    b.prismDir(onAxis(sa, 66.8, LEAD_T), radialAt(LEAD_T), [1, 0, 0], tangentAt(LEAD_T), 3.4, 2.6, 6, 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
  });

  // the terminal block: black moulded plastic on the end cap, ribbed between its studs, with the grommet the leads pass
  obox(b, onAxis(298, 63, LEAD_T), [1, 0, 0], radialAt(LEAD_T), tangentAt(LEAD_T), 16, 3, 7, MAT_ST_BLACKPL);
  for (const ra of [293, 303]) obox(b, onAxis(ra, 67, LEAD_T), [1, 0, 0], radialAt(LEAD_T), tangentAt(LEAD_T), 0.8, 1.6, 6.6, MAT_ST_BLACKPL);
  annulus(b, onAxis(298, 55, LEAD_T), radialAt(LEAD_T), 3.5, 9, MAT_ST_RUBBER, 24);

  // the Hall sensor board: a half ring of green glass-fibre board across the end cap, just behind the sensor magnet, with
  // three Hall sensors standing over the magnet's ring at a pole pair's third apart, its copper traces, a few small parts,
  // and the plug its cable leaves by, the cable's five thin wires running out through the grommet with the phase leads
  arcBand(b, 307, 308.6, [21, 21], [41.5, 41.5], 0.04, ST_HALF - 0.04, 0, 0, MAT_ST_PCB, MAT_ST_PCB, MAT_ST_PCB, 40);

  for (const [r0, r1] of [[24.5, 25.1], [30.2, 30.7], [36.4, 36.9]]) {
    arcBand(b, 306.92, 307, [r0, r0], [r1, r1], 0.25, ST_HALF - 0.25, 0, 0, MAT_ST_TRACE, MAT_ST_TRACE, MAT_ST_TRACE, 30);
  }

  for (const th of [Math.PI / 2 - (2 * TAU) / (3 * ST_POLES), Math.PI / 2, Math.PI / 2 + (2 * TAU) / (3 * ST_POLES)]) {
    obox(b, onAxis(305.2, 21.9, th), [1, 0, 0], radialAt(th), tangentAt(th), 1.3, 0.8, 2.1, MAT_ST_IC);

    for (const sl of [-1.3, 0, 1.3]) {
      const c = onAxis(306.2, 22.4, th);
      const T = tangentAt(th);

      stRod(b, [c[0] - 0.6, c[1] + T[1] * sl, c[2] + T[2] * sl], [c[0] + 0.8, c[1] + T[1] * sl, c[2] + T[2] * sl], 0.22, MAT_STEEL_BRIGHT);
    }
  }

  // small parts on the board: resistors and capacitors, tan and grey, in a row along each trace
  for (let k = 0; k < 14; k++) {
    const th = 0.35 + (k * (ST_HALF - 0.7)) / 13;
    const r = k % 2 === 0 ? 27.6 : 33.6;

    obox(b, onAxis(306.6, r, th), [1, 0, 0], radialAt(th), tangentAt(th), 0.45, 0.8, 1.5, k % 3 === 0 ? MAT_ST_IC : MAT_ST_SMD);
  }

  // the plug, white, near the grommet, and the five thin wires from it, out through the grommet
  obox(b, onAxis(305.4, 38, LEAD_T + 0.08), [1, 0, 0], radialAt(LEAD_T + 0.08), tangentAt(LEAD_T + 0.08), 1.9, 2.6, 4.2, MAT_ST_PLASTIC);
  [MAT_ST_CABLE, MAT_ST_BLACKPL, MAT_ST_LEAD_U, MAT_ST_LEAD_V, MAT_ST_LEAD_W].forEach((m, k) => {
    const dt = (k - 2) * 0.03;

    wire(b, [onAxis(303.4, 38, LEAD_T + 0.08 + dt), onAxis(300, 42, LEAD_T + 0.05 + dt), onAxis(298.5, 50, LEAD_T + dt * 0.5), onAxis(298, 56, LEAD_T + dt * 0.3)], 0.5, m, 6);
  });

  // the end cap, cut open, with its wall, its ribs, its bearing boss and the band round its inspection window
  arcBand(b, 288, 318, [54.2, 54.2], [55.8, 55.8], 0.15, Math.PI - 0.15, 0, 0, MAT_STEEL_BRIGHT, MAT_ST_YOKE_IN, MAT_ST_CUT, 28);
  b.prismDir([303, 59 * Math.cos(0.15), 59 * Math.sin(0.15)], [0, 1, 0.15], [1, 0, 0], [0, -0.15, 1], 3.4, 4, 6, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);

  // the four through-bolts, along the outside of the yoke, with their lugs, nuts and washers
  for (const tb of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
    const p = 59 * Math.cos(tb);
    const q = 59 * Math.sin(tb);

    stRod(b, [106, p, q], [352, p, q], 3.6, MAT_STEEL_BRIGHT);
    stHex(b, 342, p, q, 7.5, 7, 1);
    annulus(b, [342, p, q], [-1, 0, 0], 3.6, 9, MAT_WASHER, 20);
    annulus(b, [349.2, p, q], [1, 0, 0], 3.6, 8.5, MAT_ST_YOKE_IN, 20);

    for (const a of [112, 276, 332]) b.prismDir([a + 0.4, p, q], [1, 0, 0], [0, 1, 0], [0, 0, 1], 8.5, 5.2, 14, 0, MAT_ALU_CAST, MAT_ALU_CAST); // (inside the flanges' faces)
  }

  // the solenoid, above the motor, cut open: its case with a crimped rim, its two windings, its fixed core
  b.box(98, 134, -16, 16, -66, -52, MAT_ALU_CAST);
  b.box(94, 106, 28, 36, -75.5, -66, MAT_ALU_CAST);
  b.box(94, 106, -36, -28, -75.5, -66, MAT_ALU_CAST);
  stRod(b, [ST_PIV_A, -46, ST_PIV_Q], [ST_PIV_A, 46, ST_PIV_Q], 3.4, MAT_STEEL_BRIGHT);

  for (const s of [-1, 1]) {
    annulus(b, [ST_PIV_A, s * 46, ST_PIV_Q], [0, s, 0], 3.4, 8, MAT_WASHER, 20);
    stRod(b, [ST_PIV_A, s * 46, ST_PIV_Q], [ST_PIV_A, s * 49, ST_PIV_Q], 1.2, MAT_ST_BRONZE);
  }


  // the two windings, on a sleeve of insulation round the plunger, between the bobbin's flanges, cut open with the case: the
  // pull-in winding of heavier wire underneath, the hold-in winding of finer wire over it
  arcBand(b, 138, 258, [20.6, 20.6], [22, 22], 0, ST_HALF, 0, SQ, MAT_ST_MICA, MAT_ST_MICA, MAT_ST_CUT, 32);
  cutCoil(b, 139, 257, 22, 2, 1.05, 0, SQ, MAT_ST_ENAMEL);
  cutCoil(b, 139, 257, 26.1, 2, 0.85, 0, SQ, MAT_ST_COPPER);
  arcBand(b, 135.5, 138.5, [21.5, 21.5], [30, 30], 0, ST_HALF, 0, SQ, MAT_ST_BLACKPL, MAT_ST_BLACKPL, MAT_ST_CUT, 32);
  arcBand(b, 257.5, 260.5, [21.5, 21.5], [30, 30], 0, ST_HALF, 0, SQ, MAT_ST_BLACKPL, MAT_ST_BLACKPL, MAT_ST_CUT, 32);
  stRod(b, [150, 0, SQ], [160, 0, SQ], 19.5, MAT_ST_BRONZE); // the plunger's guide
  stRod(b, [260, 0, SQ], [272, 0, SQ], 17, MAT_STEEL_BRIGHT); // the fixed core

  // the cap, with its two studs, their nuts and washers, and the two push-on terminals

  for (const p of [-21, 21]) {
    stRod(b, [272, p, SQ], [318, p, SQ], 7.5, MAT_INJ_BRASS);
    stRod(b, [284, p, SQ], [292, p, SQ], 9.6, MAT_ST_COMM); // the stud's contact face, inside the cap
    stHex(b, 306, p, SQ, 11, 7, 1);
    annulus(b, [306, p, SQ], [-1, 0, 0], 7.5, 13, MAT_WASHER, 24);
    stHex(b, 316, p, SQ, 11, 7, 1);
  }

  b.box(296, 316, -3, 3, -70, -62, MAT_INJ_BRASS);
  b.box(298, 314, -7, 7, -78, -66, MAT_ST_PLASTIC);
  stRod(b, [306, 0, -78], [306, 0, -92], 1.8, MAT_ST_BLACKPL);

  // the battery cable, red, from the big stud, with its lug and its boot, and the bare copper of its cut end
  stRod(b, [310, 21, SQ], [332, 21, SQ], 8, MAT_ST_RUBBER);
  annulus(b, [318, 21, SQ], [1, 0, 0], 5, 12, MAT_ST_COPPER, 24);
  sweepTube(
    b, roundedCurve([[330, 21, SQ], [352, 21, SQ], [352, 56, SQ - 38], [352, 96, SQ - 76]], 22, 4), () => 5.5, MAT_ST_CABLE,
    { segments: 14, capStart: true, capEnd: true }
  );
  stRod(b, [352, 96, SQ - 76], [352, 100.4, SQ - 80.1], 3.8, MAT_ST_COMM);
}
