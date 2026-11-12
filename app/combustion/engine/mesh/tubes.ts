// Curves and the tubes swept along them: pipes, collars, couplers, flanges.

import { TAU } from "../core/constants";
import { vadd, vcross, vlen, vlerp, vnorm, vscale, vsub } from "../math/vec3";
import { createMeshBuilder } from "./builder";
import type { FwMaterial, FwVec3 } from "./builder";
import { MAT_COUPLER, MAT_CT_EDGE, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_STEEL_BRIGHT } from "./materials";

/* ---- curves: pipes and the paths the air follows ---- */

export type Curve = { pts: FwVec3[]; cum: number[]; total: number };

// A polyline, cut into pieces of about `spacing` units
export function curveFromPoints(points: FwVec3[], spacing = 6): Curve {
  const pts: FwVec3[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const c = points[i];
    const n = Math.max(1, Math.ceil(vlen(vsub(c, a)) / spacing));

    for (let k = 1; k <= n; k++) pts.push(vlerp(a, c, k / n));
  }

  const cum = [0];

  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + vlen(vsub(pts[i], pts[i - 1])));

  return { pts, cum, total: cum[cum.length - 1] };
}

// The same, with the corners rounded to a bend of radius `bend`
export function roundedCurve(points: FwVec3[], bend: number, spacing = 6): Curve {
  const dense: FwVec3[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1];
    const c = points[i];
    const d = points[i + 1];
    const l1 = vlen(vsub(a, c));
    const l2 = vlen(vsub(d, c));
    const r = Math.min(bend, l1 / 2, l2 / 2);
    const p0 = vlerp(c, a, r / l1);
    const p1 = vlerp(c, d, r / l2);

    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      const w0 = (1 - t) * (1 - t);
      const w1 = 2 * (1 - t) * t;
      const w2 = t * t;

      dense.push([
        p0[0] * w0 + c[0] * w1 + p1[0] * w2,
        p0[1] * w0 + c[1] * w1 + p1[1] * w2,
        p0[2] * w0 + c[2] * w1 + p1[2] * w2,
      ]);
    }
  }

  dense.push(points[points.length - 1]);

  return curveFromPoints(dense, spacing);
}

// The point `s` units along the curve, and the direction it runs there
export function curveAt(c: Curve, s: number, out: FwVec3, dir?: FwVec3): FwVec3 {
  const t = Math.min(Math.max(s, 0), c.total);
  let lo = 0;
  let hi = c.cum.length - 1;

  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;

    if (c.cum[mid] <= t) lo = mid;
    else hi = mid;
  }

  const span = c.cum[hi] - c.cum[lo] || 1;
  const f = (t - c.cum[lo]) / span;
  const a = c.pts[lo];
  const b = c.pts[hi];

  out[0] = a[0] + (b[0] - a[0]) * f;
  out[1] = a[1] + (b[1] - a[1]) * f;
  out[2] = a[2] + (b[2] - a[2]) * f;

  if (dir) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1;

    dir[0] = (b[0] - a[0]) / len;
    dir[1] = (b[1] - a[1]) / len;
    dir[2] = (b[2] - a[2]) / len;
  }

  return out;
}

// A part of a curve
export function subCurve(c: Curve, s0: number, s1: number, spacing = 4): Curve {
  const n = Math.max(1, Math.ceil((s1 - s0) / spacing));
  const pts: FwVec3[] = [];

  for (let k = 0; k <= n; k++) pts.push(curveAt(c, s0 + ((s1 - s0) * k) / n, [0, 0, 0]));

  return curveFromPoints(pts, spacing);
}

export type MeshBuilder = ReturnType<typeof createMeshBuilder>;

// A circle swept along a curve, its radius changing along the way. The frame
// is carried along the curve without twisting.
export function sweepTube(
  b: MeshBuilder,
  curve: Curve,
  radius: (u: number) => number,
  mat: FwMaterial,
  opts: { segments?: number; capStart?: boolean; capEnd?: boolean } = {}
) {
  const seg = opts.segments ?? 20;
  const n = curve.pts.length;

  if (n < 2) return;

  const tangents: FwVec3[] = [];

  for (let k = 0; k < n; k++) {
    const a = curve.pts[Math.max(0, k - 1)];
    const c = curve.pts[Math.min(n - 1, k + 1)];

    tangents.push(vnorm(vsub(c, a)));
  }

  // A first normal across the first tangent
  const t0 = tangents[0];
  let normal = vnorm(vcross(t0, Math.abs(t0[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));

  const ringPos: FwVec3[][] = [];
  const ringNor: FwVec3[][] = [];

  for (let k = 0; k < n; k++) {
    const t = tangents[k];
    const along = normal[0] * t[0] + normal[1] * t[1] + normal[2] * t[2];

    normal = vnorm([normal[0] - t[0] * along, normal[1] - t[1] * along, normal[2] - t[2] * along]);

    const binormal = vcross(t, normal);
    const rad = radius(curve.total > 0 ? curve.cum[k] / curve.total : 0);
    const pos: FwVec3[] = [];
    const nor: FwVec3[] = [];

    for (let j = 0; j < seg; j++) {
      const ang = (j / seg) * TAU;
      const dir: FwVec3 = [
        Math.cos(ang) * normal[0] + Math.sin(ang) * binormal[0],
        Math.cos(ang) * normal[1] + Math.sin(ang) * binormal[1],
        Math.cos(ang) * normal[2] + Math.sin(ang) * binormal[2],
      ];

      nor.push(dir);
      pos.push([curve.pts[k][0] + dir[0] * rad, curve.pts[k][1] + dir[1] * rad, curve.pts[k][2] + dir[2] * rad]);
    }

    ringPos.push(pos);
    ringNor.push(nor);
  }

  for (let k = 0; k < n - 1; k++) {
    for (let j = 0; j < seg; j++) {
      const j2 = (j + 1) % seg;

      b.push(ringPos[k][j], ringNor[k][j], mat, 1);
      b.push(ringPos[k][j2], ringNor[k][j2], mat, 1);
      b.push(ringPos[k + 1][j2], ringNor[k + 1][j2], mat, 1);

      b.push(ringPos[k][j], ringNor[k][j], mat, 1);
      b.push(ringPos[k + 1][j2], ringNor[k + 1][j2], mat, 1);
      b.push(ringPos[k + 1][j], ringNor[k + 1][j], mat, 1);
    }
  }

  const cap = (k: number, sign: number) => {
    const centre = curve.pts[k];
    const hint = vscale(tangents[k], sign);

    for (let j = 0; j < seg; j++) {
      const j2 = (j + 1) % seg;

      b.flatTri(centre, ringPos[k][j], ringPos[k][j2], hint, mat, 1);
    }
  };

  if (opts.capStart) cap(0, -1);
  if (opts.capEnd) cap(n - 1, 1);
}

// A flat ring round a pipe, at `s` along the curve: a flange, a clamp
function pipeRing(
  b: MeshBuilder,
  curve: Curve,
  s: number,
  radius: number,
  width: number,
  matTop: FwMaterial,
  matSide: FwMaterial,
  sides = 28
) {
  const centre: FwVec3 = [0, 0, 0];
  const dir: FwVec3 = [0, 0, 0];

  curveAt(curve, s - width / 2, centre, dir);

  const e1 = vnorm(vcross(dir, Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  const e2 = vcross(dir, e1);

  b.prismDir(centre, dir, e1, e2, radius, width, sides, 0, matTop, matSide);
}

// A flange with four bolts, at the end of a pipe (sign +1 the far end, -1 the near one)
export function pipeFlange(b: MeshBuilder, curve: Curve, atEnd: boolean, radius: number, matPlate: FwMaterial) {
  const s = atEnd ? curve.total - 0.2 : 5.2;

  collar(b, curve, s, radius * 0.66, radius, 5, matPlate);

  const centre: FwVec3 = [0, 0, 0];
  const dir: FwVec3 = [0, 0, 0];

  curveAt(curve, s, centre, dir);

  const e1 = vnorm(vcross(dir, Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  const e2 = vcross(dir, e1);

  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + Math.PI / 4;
    const at: FwVec3 = [
      centre[0] + (e1[0] * Math.cos(a) + e2[0] * Math.sin(a)) * (radius - 4.5),
      centre[1] + (e1[1] * Math.cos(a) + e2[1] * Math.sin(a)) * (radius - 4.5),
      centre[2] + (e1[2] * Math.cos(a) + e2[2] * Math.sin(a)) * (radius - 4.5),
    ];

    b.prismDir(vadd(at, vscale(dir, 2.5)), dir, e1, e2, 2.4, 2.2, 6, a, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
  }
}

// A metal coupler sleeve over a stretch of a pipe, with a clamp at each end
export function coupler(b: MeshBuilder, curve: Curve, s0: number, s1: number, radius: number) {
  sweepTube(b, subCurve(curve, s0, s1), () => radius + 2.2, MAT_COUPLER, { segments: 24, capStart: true, capEnd: true });
  pipeRing(b, curve, s0 + 2.2, radius + 3.6, 3, MAT_CT_NUT_HEAD, MAT_STEEL_BRIGHT, 28);
  pipeRing(b, curve, s1 - 0.4, radius + 3.6, 3, MAT_CT_NUT_HEAD, MAT_STEEL_BRIGHT, 28);
}

// A flat ring: the face of a collar or of a flange, between two radii
export function annulus(b: MeshBuilder, centre: FwVec3, dir: FwVec3, rIn: number, rOut: number, mat: FwMaterial, sides = 32) {
  const e1 = vnorm(vcross(dir, Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  const e2 = vcross(dir, e1);
  const at = (r: number, a: number): FwVec3 => [
    centre[0] + (e1[0] * Math.cos(a) + e2[0] * Math.sin(a)) * r,
    centre[1] + (e1[1] * Math.cos(a) + e2[1] * Math.sin(a)) * r,
    centre[2] + (e1[2] * Math.cos(a) + e2[2] * Math.sin(a)) * r,
  ];

  for (let j = 0; j < sides; j++) {
    const a0 = (j / sides) * TAU;
    const a1 = ((j + 1) / sides) * TAU;

    b.flatQuad(at(rIn, a0), at(rOut, a0), at(rOut, a1), at(rIn, a1), dir, mat);
  }
}

// A cast collar over a joint: a short sleeve with a face at each end, hollow, so that the
// pipe's inside is not closed by it
export function collar(b: MeshBuilder, curve: Curve, s: number, rIn: number, rOut: number, width: number, mat: FwMaterial, face: FwMaterial = MAT_CT_EDGE) {
  const s0 = Math.max(0.5, s - width / 2);
  const s1 = Math.min(curve.total - 0.5, s + width / 2);

  sweepTube(b, subCurve(curve, s0, s1, 2), () => rOut, mat, { segments: 30 });

  for (const [sp, sign] of [[s0, -1], [s1, 1]] as Array<[number, number]>) {
    const at: FwVec3 = [0, 0, 0];
    const d: FwVec3 = [0, 0, 0];

    curveAt(curve, sp, at, d);
    annulus(b, at, vscale(d, sign), rIn, rOut, face, 30);
  }
}

// A bolted flange joint across a pipe, at `centre`, the pipe running on along `dir`: a flange on the near side (cast as one
// with what the pipe comes out of), a thin gasket, and a machined flange on the far side, held by bolts through both:
// each a hex head with a washer under it and a chamfered top on the far side, and on the near side a washer, a hex nut and
// the bolt's threaded end standing out of it
export type FlangeJoint = {
  pipeR: number; // the pipe's radius, through the middle
  r: number; // the flanges' radius
  castT: number; // the near flange's thickness
  mateT: number; // the far one's
  bolts: number;
  pitch: number; // the radius the bolts stand on
  cast: FwMaterial;
  mate: FwMaterial;
  gasket: FwMaterial;
  bolt?: number; // the bolt's size: the hex's radius across its corners (4.2 by default)
  rot?: number; // where round the first bolt stands
};

export function flangeJoint(b: MeshBuilder, centre: FwVec3, dir: FwVec3, o: FlangeJoint) {
  const d = vnorm(dir);
  const e1 = vnorm(vcross(d, Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  const e2 = vcross(d, e1);
  const at = (s: number): FwVec3 => vadd(centre, vscale(d, s));
  const line = curveFromPoints([at(-o.castT - 20), at(o.mateT + 20)], 1);
  const S = (s: number) => s + o.castT + 20; // a distance from the joint's plane, as a distance along `line`
  const hx = o.bolt ?? 4.2;
  const nd: FwVec3 = vscale(d, -1);

  collar(b, line, S(-o.castT / 2), o.pipeR, o.r, o.castT, o.cast, o.cast);
  collar(b, line, S(0.5), o.pipeR, o.r - 1.2, 1, o.gasket, o.gasket);
  collar(b, line, S(1 + o.mateT / 2), o.pipeR, o.r, o.mateT, o.mate, o.mate);

  for (let k = 0; k < o.bolts; k++) {
    const a = (o.rot ?? Math.PI / o.bolts) + (k / o.bolts) * TAU;
    const p = vadd(centre, vadd(vscale(e1, Math.cos(a) * o.pitch), vscale(e2, Math.sin(a) * o.pitch)));

    flangeBolt(b, vadd(p, vscale(d, 1 + o.mateT)), d, hx, a);

    // near side: a washer, the hex nut, and the bolt's end with its thread showing
    const under = vadd(p, vscale(d, -o.castT));

    b.prismDir(under, nd, e1, e2, hx * 1.22, 0.8, 20, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
    b.prismDir(vadd(under, vscale(nd, 0.8)), nd, e1, e2, hx, hx * 0.86, 6, a + 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);

    const tip = vadd(under, vscale(nd, 0.8 + hx * 0.86));

    b.prismDir(tip, nd, e1, e2, hx * 0.5, hx * 0.62, 14, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);

    for (let t = 0; t < 3; t++) {
      b.prismDir(vadd(tip, vscale(nd, hx * (0.1 + 0.17 * t))), nd, e1, e2, hx * 0.56, hx * 0.06, 14, 0, MAT_CT_NUT_SIDE, MAT_CT_NUT_SIDE);
    }
  }
}

// A bolt's head on a flange's face at `p`, facing `d`: a washer, the hex head (`hx` across its corners), a turned and
// chamfered top, and the maker's dot in the middle of it
export function flangeBolt(b: MeshBuilder, p: FwVec3, dir: FwVec3, hx: number, rot = 0) {
  const d = vnorm(dir);
  const e1 = vnorm(vcross(d, Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  const e2 = vcross(d, e1);
  // (the washer sits a hair off the face, so that its underside and the face never share a plane and flicker)
  const up = (h: number) => vadd(p, vscale(d, h + 0.15));

  b.prismDir(up(0), d, e1, e2, hx * 1.22, 0.8, 20, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
  b.prismDir(up(0.8), d, e1, e2, hx * 1.06, hx * 0.12, 18, 0, MAT_CT_NUT_SIDE, MAT_CT_NUT_SIDE); // the head's collar
  b.prismDir(up(0.8 + hx * 0.12), d, e1, e2, hx, hx * 0.66, 6, rot, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
  b.prismDir(up(0.8 + hx * 0.78), d, e1, e2, hx * 0.84, hx * 0.16, 18, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
  b.prismDir(up(0.8 + hx * 0.94), d, e1, e2, hx * 0.22, hx * 0.05, 10, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
}

// A cone that starts as an oval (half-widths ox along x, oy along y) at z0 and narrows, along z by `dz` (either way), to
// a round pipe of radius rEnd: where a pipe comes out of a port's flange, the port's own shape
export function ovalFlare(b: MeshBuilder, cx: number, cy: number, z0: number, dz: number, ox: number, oy: number, rEnd: number, mat: FwMaterial) {
  const K = 10;
  const N = 40;
  const sz = Math.sign(dz);
  const len = Math.abs(dz);
  const axes = (u: number) => [ox + (rEnd - ox) * u, oy + (rEnd - oy) * u];
  const P = (k: number, i: number): FwVec3 => {
    const u = k / K;
    const th = (i / N) * TAU;
    const [ax, ay] = axes(u);

    return [cx + ax * Math.cos(th), cy + ay * Math.sin(th), z0 + dz * u];
  };
  const Nrm = (k: number, i: number): FwVec3 => {
    const th = (i / N) * TAU;
    const [ax, ay] = axes(k / K);
    const r = Math.hypot(Math.cos(th) * ax, Math.sin(th) * ay);
    const slope = ((ox + oy) / 2 - rEnd) / len; // how fast it narrows

    return vnorm([(Math.cos(th) / ax) * r, (Math.sin(th) / ay) * r, sz * slope]);
  };

  for (let k = 0; k < K; k++) {
    for (let i = 0; i < N; i++) {
      for (const [kk, ii] of [[k, i], [k, i + 1], [k + 1, i + 1], [k, i], [k + 1, i + 1], [k + 1, i]]) b.push(P(kk, ii), Nrm(kk, ii), mat, 1);
    }
  }
}
