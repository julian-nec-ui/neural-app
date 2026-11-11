// Streaks: thin ribbons that face the screen, laid along a path with a frame that does not twist.

import { TAU } from "../../core/constants";
import { vcross, vlen, vnorm, vsub } from "../../math/vec3";
import type { FwVec3 } from "../../mesh/builder";
import type { Curve } from "../../mesh/tubes";
import type { Flow } from "./common";

/* ---- streaks: thin ribbons that always face the screen ---- */

// Six vertices per segment: this end and the other end of it (to find the
// ribbon's direction on the screen), which corner it is, a colour, a width
export const STREAK_FLOATS = 13;

export const STREAKS = { data: new Float32Array(8000 * 6 * STREAK_FLOATS), n: 0, max: 8000 };

const CORNERS = [0, -1, 0, 1, 1, 1, 0, -1, 1, 1, 1, -1];

export function addSegment(
  a: FwVec3, b: FwVec3,
  r: number, g: number, bl: number,
  a0: number, a1: number,
  w0: number, w1: number
) {
  if (STREAKS.n >= STREAKS.max) return;

  let o = STREAKS.n * 6 * STREAK_FLOATS;
  const d = STREAKS.data;

  for (let v = 0; v < 6; v++) {
    const end = CORNERS[v * 2];

    d[o++] = a[0]; d[o++] = a[1]; d[o++] = a[2];
    d[o++] = b[0]; d[o++] = b[1]; d[o++] = b[2];
    d[o++] = end;
    d[o++] = CORNERS[v * 2 + 1];
    d[o++] = r; d[o++] = g; d[o++] = bl;
    d[o++] = end ? a1 : a0;
    d[o++] = end ? w1 : w0;
  }

  STREAKS.n++;
}

/* ---- a frame that does not twist, carried along each path ---- */

const FRAME_CACHE = new WeakMap<Curve, { n: FwVec3[]; b: FwVec3[] }>();

export function framesOf(c: Curve) {
  let f = FRAME_CACHE.get(c);

  if (f) return f;

  const count = c.pts.length;
  const n: FwVec3[] = [];
  const b: FwVec3[] = [];
  let tangent: FwVec3 = [1, 0, 0];
  let normal: FwVec3 = [0, 1, 0];

  for (let k = 0; k < count; k++) {
    const d = vsub(c.pts[Math.min(count - 1, k + 1)], c.pts[Math.max(0, k - 1)]);

    if (vlen(d) > 1e-6) tangent = vnorm(d);

    if (k === 0) {
      normal = vnorm(vcross(tangent, Math.abs(tangent[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
    } else {
      const along = normal[0] * tangent[0] + normal[1] * tangent[1] + normal[2] * tangent[2];

      normal = vnorm([normal[0] - tangent[0] * along, normal[1] - tangent[1] * along, normal[2] - tangent[2] * along]);
    }

    n.push(normal);
    b.push(vcross(tangent, normal));
  }

  f = { n, b };
  FRAME_CACHE.set(c, f);

  return f;
}

const F_P: FwVec3 = [0, 0, 0];

// The point `s` units along the path, pushed out to the spiral
export function flowPoint(f: Flow, i: number, s: number, out: FwVec3) {
  const c = f.curve;
  const frames = framesOf(c);
  const t = Math.min(Math.max(s, 0), c.total);
  let lo = 0;
  let hi = c.cum.length - 1;

  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;

    if (c.cum[mid] <= t) lo = mid;
    else hi = mid;
  }

  const k = (t - c.cum[lo]) / (c.cum[hi] - c.cum[lo] || 1);
  const a = c.pts[lo];
  const b = c.pts[hi];

  F_P[0] = a[0] + (b[0] - a[0]) * k;
  F_P[1] = a[1] + (b[1] - a[1]) * k;
  F_P[2] = a[2] + (b[2] - a[2]) * k;

  const angle = f.theta[i] + (f.straight ? 0 : ((f.swirl * s) / 100) * TAU);
  // A little breathing in and out, so that the streaks do not wind in lockstep
  const radius = f.spread * f.radial[i] * (f.straight ? 1 : 0.88 + 0.12 * Math.sin(s * 0.05 + f.theta[i] * 3));
  const cs = Math.cos(angle) * radius;
  const sn = Math.sin(angle) * radius;
  const n0 = frames.n[lo];
  const n1 = frames.n[hi];
  const b0 = frames.b[lo];
  const b1 = frames.b[hi];

  for (let d = 0; d < 3; d++) {
    out[d] = F_P[d] + (n0[d] + (n1[d] - n0[d]) * k) * cs + (b0[d] + (b1[d] - b0[d]) * k) * sn;
  }
}
