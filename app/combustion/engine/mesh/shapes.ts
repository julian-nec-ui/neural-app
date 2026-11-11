// Shapes shared by the castings: 2D outlines (vectors, fillets, ear clipping), outlines in plan with rounded corners
// (their walls, caps and bands), and rounded ribs cast in relief.

import type { FwMaterial, FwVec3 } from "./builder";
import type { MeshBuilder } from "./tubes";

export type P2 = [number, number]; // a point of a 2D outline

export const sub = (a: P2, b: P2): P2 => [a[0] - b[0], a[1] - b[1]];
export const add = (a: P2, b: P2): P2 => [a[0] + b[0], a[1] + b[1]];
export const mul = (a: P2, s: number): P2 => [a[0] * s, a[1] * s];
export const len = (a: P2) => Math.hypot(a[0], a[1]);
export const unit = (a: P2): P2 => mul(a, 1 / (len(a) || 1));
export const cross = (a: P2, b: P2) => a[0] * b[1] - a[1] * b[0];

// A fillet of radius r at the corner p of an outline (prev → p → next): its arc, from where it leaves the edge from prev
// to where it meets the edge to next, in steps + 1 points
export function filletArc(prev: P2, p: P2, next: P2, r: number, steps: number): P2[] {
  const u1 = unit(sub(prev, p));
  const u2 = unit(sub(next, p));
  const halfA = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]))) / 2;
  const t = r / Math.tan(halfA);
  const c = add(p, mul(unit(add(u1, u2)), r / Math.sin(halfA)));
  const t1 = add(p, mul(u1, t));
  const t2 = add(p, mul(u2, t));
  const a1 = Math.atan2(t1[1] - c[1], t1[0] - c[0]);
  let a2 = Math.atan2(t2[1] - c[1], t2[0] - c[0]);

  while (a2 - a1 > Math.PI) a2 -= 2 * Math.PI;
  while (a2 - a1 < -Math.PI) a2 += 2 * Math.PI;

  const out: P2[] = [];

  for (let k = 0; k <= steps; k++) {
    const ang = a1 + ((a2 - a1) * k) / steps;

    out.push([c[0] + r * Math.cos(ang), c[1] + r * Math.sin(ang)]);
  }

  return out;
}

// Ear clipping of a simple polygon: the triangles, as index triples
export function triangulate(poly: P2[]): Array<[number, number, number]> {
  const idx = poly.map((_, i) => i);
  const ccw = poly.reduce((s, p, i) => s + cross(p, poly[(i + 1) % poly.length]), 0) > 0;
  const tris: Array<[number, number, number]> = [];
  const side = (o: P2, a: P2, p: P2) => (ccw ? 1 : -1) * cross(sub(a, o), sub(p, o));
  const inside = (p: P2, a: P2, b: P2, c: P2) => side(a, b, p) > 1e-9 && side(b, c, p) > 1e-9 && side(c, a, p) > 1e-9;
  let guard = 0;

  while (idx.length > 3 && guard++ < 20000) {
    let cut = false;

    for (let k = 0; k < idx.length; k++) {
      const i0 = idx[(k + idx.length - 1) % idx.length];
      const i1 = idx[k];
      const i2 = idx[(k + 1) % idx.length];

      if (side(poly[i0], poly[i1], poly[i2]) <= 1e-9) continue; // a reflex corner, or none at all
      if (idx.some((j) => j !== i0 && j !== i1 && j !== i2 && inside(poly[j], poly[i0], poly[i1], poly[i2]))) continue;

      tris.push([i0, i1, i2]);
      idx.splice(k, 1);
      cut = true;
      break;
    }

    if (!cut) break;
  }

  if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);

  return tris;
}

// A point of an outline in plan (x along the bank, z across it), with its outward normal
export type PlanPt = { x: number; z: number; nx: number; nz: number };

// An outline in plan (a head's, say), all the way round: a rectangle from x0 to x1, ±zh across, its corners rounded by r.
// `endZ`: more points on its two end sides, at these z (where something along them starts or stops)
export function roundedPlan(x0: number, x1: number, zh: number, r: number, endZ: number[] = [], steps = 6): PlanPt[] {
  const out: PlanPt[] = [];
  const put = (q: PlanPt) => {
    const last = out[out.length - 1];

    if (!last || Math.hypot(last.x - q.x, last.z - q.z) > 1e-6) out.push(q);
  };
  const arc = (cx: number, cz: number, a0: number) => {
    for (let k = 0; k <= steps; k++) {
      const a = a0 + (k / steps) * (Math.PI / 2);

      put({ x: cx + r * Math.cos(a), z: cz + r * Math.sin(a), nx: Math.cos(a), nz: Math.sin(a) });
    }
  };
  const zs = endZ.filter((z) => Math.abs(z) < zh - r).sort((a, b) => a - b);
  const zc = zh - r;

  // the front end, down from +z to -z
  for (const z of [zc, ...zs.slice().reverse(), -zc]) put({ x: x0, z, nx: -1, nz: 0 });
  arc(x0 + r, -zc, Math.PI);
  put({ x: x1 - r, z: -zh, nx: 0, nz: -1 });
  arc(x1 - r, -zc, 1.5 * Math.PI);
  // the rear end, up from -z to +z
  for (const z of [-zc, ...zs, zc]) put({ x: x1, z, nx: 1, nz: 0 });
  arc(x1 - r, zc, 0);
  put({ x: x0 + r, z: zh, nx: 0, nz: 1 });
  arc(x0 + r, zc, 0.5 * Math.PI);

  const first = out[0];
  const last = out[out.length - 1];

  if (Math.hypot(first.x - last.x, first.z - last.z) < 1e-6) out.pop();

  return out;
}

// The upright walls round a plan outline, drawn out by d, from height ya to yb, its normals smooth round the corners
export function planWalls(b: MeshBuilder, plan: PlanPt[], d: number, ya: number, yb: number, m: FwMaterial, skip?: (q: PlanPt) => boolean) {
  const n = plan.length;
  const at = (q: PlanPt, y: number): FwVec3 => [q.x + q.nx * d, y, q.z + q.nz * d];
  const nrm = (q: PlanPt): FwVec3 => [q.nx, 0, q.nz];

  for (let i = 0; i < n; i++) {
    const p = plan[i];
    const q = plan[(i + 1) % n];

    if (skip && skip({ x: (p.x + q.x) / 2, z: (p.z + q.z) / 2, nx: p.nx, nz: p.nz })) continue;

    b.push(at(p, ya), nrm(p), m, 1);
    b.push(at(q, ya), nrm(q), m, 1);
    b.push(at(q, yb), nrm(q), m, 1);
    b.push(at(p, ya), nrm(p), m, 1);
    b.push(at(q, yb), nrm(q), m, 1);
    b.push(at(p, yb), nrm(p), m, 1);
  }
}

// A flat face over a plan outline (convex), drawn out by d, at height y, facing up (ny -1) or down (ny 1)
export function planCap(b: MeshBuilder, plan: PlanPt[], d: number, y: number, ny: number, m: FwMaterial) {
  const cx = plan.reduce((t, q) => t + q.x, 0) / plan.length;
  const cz = plan.reduce((t, q) => t + q.z, 0) / plan.length;

  b.flatFan([cx, y, cz], plan.map((q) => [q.x + q.nx * d, y, q.z + q.nz * d] as FwVec3), [0, ny, 0], m);
}

// A band round a plan outline: from drawn in by dIn to drawn out by dOut, from height ya to yb, a solid ring (a flange, a
// machined edge); `skip`: where along the outline it is left open, its open ends closed
export function planBand(b: MeshBuilder, plan: PlanPt[], dIn: number, dOut: number, ya: number, yb: number, m: FwMaterial, skip?: (q: PlanPt) => boolean) {
  const n = plan.length;
  const P = (q: PlanPt, d: number, y: number): FwVec3 => [q.x + q.nx * d, y, q.z + q.nz * d];
  const open = (i: number) => {
    const p = plan[i];
    const q = plan[(i + 1) % n];

    return !!skip && skip({ x: (p.x + q.x) / 2, z: (p.z + q.z) / 2, nx: p.nx, nz: p.nz });
  };

  for (let i = 0; i < n; i++) {
    if (open(i)) continue;

    const p = plan[i];
    const q = plan[(i + 1) % n];

    b.flatQuad(P(p, dIn, ya), P(q, dIn, ya), P(q, dOut, ya), P(p, dOut, ya), [0, ya < yb ? -1 : 1, 0], m);
    b.flatQuad(P(p, dIn, yb), P(q, dIn, yb), P(q, dOut, yb), P(p, dOut, yb), [0, ya < yb ? 1 : -1, 0], m);
    b.flatQuad(P(p, dOut, ya), P(q, dOut, ya), P(q, dOut, yb), P(p, dOut, yb), [p.nx + q.nx, 0, p.nz + q.nz], m);
    b.flatQuad(P(p, dIn, ya), P(q, dIn, ya), P(q, dIn, yb), P(p, dIn, yb), [-(p.nx + q.nx), 0, -(p.nz + q.nz)], m);

    // where the band stops, its end
    for (const [k, other] of [[i, (i + n - 1) % n], [(i + 1) % n, (i + 1) % n]] as Array<[number, number]>) {
      if (!open(other)) continue;

      const e = plan[k];

      b.flatQuad(P(e, dIn, ya), P(e, dOut, ya), P(e, dOut, yb), P(e, dIn, yb), [e.nz, 0, -e.nx], m);
    }
  }
}

// A rib cast in relief: a bead from s0 to s1 along `along`, its middle line through `c`, standing out along `out`, `w`
// the way across it; its section a half ellipse, its normals smooth across it, its two ends rounded down to the wall
export function roundedRib(
b: MeshBuilder,
mat: FwMaterial,
size: { w: number; h: number; steps: number },
c: FwVec3,
along: FwVec3,
out: FwVec3,
w: FwVec3,
s0: number,
s1: number
) {
  if (s1 - s0 < size.w * 1.5) return;

  const hw = size.w / 2;
  const at = (s: number, ww: number, hh: number): FwVec3 => [
    c[0] + along[0] * s + w[0] * ww + out[0] * hh,
    c[1] + along[1] * s + w[1] * ww + out[1] * hh,
    c[2] + along[2] * s + w[2] * ww + out[2] * hh,
  ];
  const dir = (a: number, bw: number, ch: number): FwVec3 => {
    const v: FwVec3 = [along[0] * a + w[0] * bw + out[0] * ch, along[1] * a + w[1] * bw + out[1] * ch, along[2] * a + w[2] * bw + out[2] * ch];
    const l = Math.hypot(v[0], v[1], v[2]) || 1;

    return [v[0] / l, v[1] / l, v[2] / l];
  };
  // the section: across from -hw to hw, a half ellipse; and each point's normal
  const sec: Array<{ ww: number; hh: number; nw: number; nh: number }> = [];

  for (let k = 0; k <= size.steps; k++) {
    const t = Math.PI - (k / size.steps) * Math.PI;
    const cw = Math.cos(t);
    const sh = Math.sin(t);

    sec.push({ ww: hw * cw, hh: size.h * sh, nw: cw / hw, nh: sh / size.h });
  }

  const tri = (p0: FwVec3, n0: FwVec3, p1: FwVec3, n1: FwVec3, p2: FwVec3, n2: FwVec3) => {
    b.push(p0, n0, mat, 1);
    b.push(p1, n1, mat, 1);
    b.push(p2, n2, mat, 1);
  };
  const e0 = s0 + hw;
  const e1 = s1 - hw;

  // the long body
  for (let k = 0; k < size.steps; k++) {
    const A = sec[k];
    const B = sec[k + 1];
    const nA = dir(0, A.nw, A.nh);
    const nB = dir(0, B.nw, B.nh);

    tri(at(e0, A.ww, A.hh), nA, at(e1, A.ww, A.hh), nA, at(e1, B.ww, B.hh), nB);
    tri(at(e0, A.ww, A.hh), nA, at(e1, B.ww, B.hh), nB, at(e0, B.ww, B.hh), nB);
  }

  // the two ends: a quarter of a dome each, the section swept down round to the wall
  for (const [e, sg] of [[e0, -1], [e1, 1]] as Array<[number, number]>) {
    const rings = 4;

    for (let r = 0; r < rings; r++) {
      const a0 = (r / rings) * (Math.PI / 2);
      const a1 = ((r + 1) / rings) * (Math.PI / 2);

      for (let k = 0; k < size.steps; k++) {
        const A = sec[k];
        const B = sec[k + 1];
        const P = (q: typeof A, a: number) => at(e + sg * hw * Math.sin(a) * (q.hh / size.h), q.ww, q.hh * Math.cos(a));
        const N = (q: typeof A, a: number) => dir(sg * Math.sin(a) / hw, q.nw * Math.cos(a), q.nh * Math.cos(a));

        tri(P(A, a0), N(A, a0), P(B, a0), N(B, a0), P(B, a1), N(B, a1));
        tri(P(A, a0), N(A, a0), P(B, a1), N(B, a1), P(A, a1), N(A, a1));
      }
    }
  }
}

// A panel of embossed metal over a wall, the linen pattern of stainless sheet: upright columns `pitch` apart across (along
// w, from xa to xb), running along `along` (from s0 to s1). The creases between the columns wave, `amp` to either side, with a
// period `len` along; each crease half a wave behind its neighbours, so that a column swells where the next one pinches, and
// each column is a chain of tall bulges joined by narrow necks, nested between its neighbours' bulges. Each column is domed
// across, highest where it is widest, `h` high, falling to a sharp crease at its edges. One smooth surface, a height field
// over the wall: it eases down to the wall at the panel's edges and wherever `flat` says (1 flat, 0 full relief)
export function quiltPanel(
  b: MeshBuilder,
  mat: FwMaterial,
  q: { pitch: number; len: number; amp: number; h: number; ds: number; dx: number; edge: number },
  c: FwVec3,
  along: FwVec3,
  out: FwVec3,
  w: FwVec3,
  s0: number,
  s1: number,
  xa: number,
  xb: number,
  flat: (s: number, x: number) => number = () => 0
) {
  const ns = Math.max(2, Math.round((s1 - s0) / q.ds));
  const nx = Math.max(2, Math.round((xb - xa) / q.dx));
  const S = (i: number) => s0 + ((s1 - s0) * i) / ns;
  const X = (k: number) => xa + ((xb - xa) * k) / nx;
  const crease = (j: number, s: number) => xa + j * q.pitch + q.amp * Math.sin((2 * Math.PI * (s - s0)) / q.len + j * Math.PI);
  const wMax = q.pitch + 2 * q.amp;
  const lens = (s: number, x: number) => {
    let j = Math.floor((x - xa) / q.pitch);

    while (j > -2 && crease(j, s) > x) j--;
    while (crease(j + 1, s) <= x) j++;

    const b0 = crease(j, s);
    const b1 = crease(j + 1, s);
    const wd = b1 - b0;
    const v = (2 * x - b0 - b1) / wd;

    // its crown a little off its middle, toward its far edge: it rises steeply out of the crease on its near side, as the
    // pressed sheet does, and the light catches that edge while the crease beside it falls dark
    const vv = Math.max(-1, Math.min(1, (v - 0.22) / (v < 0.22 ? 1.22 : 0.78)));

    lastVV = vv;
    lastWR = wd / wMax;
    lastPh = (2 * Math.PI * (s - s0)) / q.len + j * Math.PI;

    return q.h * Math.pow(wd / wMax, 0.9) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(vv), 2.6)), 0.38);
  };
  let lastVV = 0;
  let lastWR = 0;
  let lastPh = 0;
  // The light of the photographed sheet, painted on: polished stainless lit from the front, its crown nearly white with the
  // brightest streak just left of the ridge, the steep near flank falling dark, the far flank a mid grey, the creases black;
  // the bulge brightest where it is widest and in its upper part, dimmer in its necks. From the place across the column
  // (vv, -1 at its near crease, 1 at its far one), its width's share (wr) and its phase along (ph)
  const PAINT_GAIN = 2.15;
  const paint = (vv: number, wr: number, ph: number) => {
    let g: number;

    if (vv < -0.74) g = 34 + (120 - 34) * ((vv + 1) / 0.26);
    else if (vv < -0.32) g = 120 + (252 - 120) * Math.pow((vv + 0.74) / 0.42, 0.55);
    else if (vv < 0.4) g = 252 - (252 - 225) * ((vv + 0.32) / 0.72);
    else g = 225 - (225 - 160) * ((vv - 0.4) / 0.6);

    if (Math.abs(vv) > 0.95) g = Math.min(g, 26);

    // brighter in the widest part and above the middle, dimmer toward the necks
    g *= (0.62 + 0.38 * Math.pow(wr, 0.8)) * (0.86 + 0.14 * Math.sin(-ph + Math.PI / 2 + 0.6));

    return Math.max(14, Math.min(252, g));
  };
  const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const H: number[] = [];
  const G: number[] = []; // the painted brightness at each point

  for (let i = 0; i <= ns; i++) {
    for (let k = 0; k <= nx; k++) {
      const s = S(i);
      const x = X(k);
      const fade = ease(Math.min(s - s0, s1 - s, x - xa, xb - x) / q.edge) * (1 - flat(s, x));

      H.push(lens(s, x) * fade);
      // where the relief eases away (at the panel's edges, round the plugs), the paint eases to the crown's grey
      G.push(paint(lastVV, lastWR, lastPh) * fade + 150 * (1 - fade));
    }
  }

  const at = (i: number, k: number) => H[Math.max(0, Math.min(ns, i)) * (nx + 1) + Math.max(0, Math.min(nx, k))];
  const P = (i: number, k: number): FwVec3 => {
    const s = S(i);
    const x = X(k);
    const hh = at(i, k);

    return [c[0] + along[0] * s + w[0] * x + out[0] * hh, c[1] + along[1] * s + w[1] * x + out[1] * hh, c[2] + along[2] * s + w[2] * x + out[2] * hh];
  };

  for (let i = 0; i < ns; i++) {
    for (let k = 0; k < nx; k++) {
      for (const [a, e] of [[i, k], [i + 1, k], [i + 1, k + 1], [i, k], [i + 1, k + 1], [i, k + 1]]) {
        // the paint carries the light: the colour may go past white (PAINT_GAIN), to make up for the scene's dimmer light on
        // the walls, and the surface is lit as the flat wall is (its normal the wall's), so that the painted light and shade
        // read the same from any side, as in the photograph; the relief itself still shows in its outline
        const g = G[a * (nx + 1) + e] * (mat.color[0] / 255) * PAINT_GAIN;

        b.push(P(a, e), out, { color: [g, g * 0.985, g * 0.95], shine: mat.shine, pattern: mat.pattern, wet: mat.wet }, 1);
      }
    }
  }
}
