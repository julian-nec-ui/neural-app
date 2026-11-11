// Three-component vectors.

import type { FwVec3 } from "../mesh/builder";

/* ---- vectors ---- */

export function vadd(a: FwVec3, b: FwVec3): FwVec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vsub(a: FwVec3, b: FwVec3): FwVec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vscale(a: FwVec3, s: number): FwVec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export function vlen(a: FwVec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

export function vnorm(a: FwVec3): FwVec3 {
  const l = vlen(a) || 1;

  return [a[0] / l, a[1] / l, a[2] / l];
}

export function vcross(a: FwVec3, b: FwVec3): FwVec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function vlerp(a: FwVec3, b: FwVec3, t: number): FwVec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export const dot3 = (a: FwVec3, b: FwVec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const cross3 = (a: FwVec3, b: FwVec3): FwVec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export function normalize3(a: FwVec3): FwVec3 {
  const len = Math.hypot(a[0], a[1], a[2]) || 1;

  return [a[0] / len, a[1] / len, a[2] / len];
}
