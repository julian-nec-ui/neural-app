// The effects' soft sprites: buffers of points, each packed as x y z size r g b a, filled every frame and drawn as
// sprites; and the glow buffer, which both the combustion and the airflow add to.

import type { Bank } from "../core/constants";

export type PointBuf = { data: Float32Array; n: number; max: number };

export function createPointBuf(max: number): PointBuf {
  return { data: new Float32Array(max * 8), n: 0, max };
}

// A sprite at (x, y, z): in the bank's own frame when a bank is given (it is turned into the engine's), else in the engine's
export function addPoint(
  buf: PointBuf,
  bank: Bank | null,
  x: number, y: number, z: number, size: number,
  r: number, g: number, b: number, a: number
) {
  if (buf.n >= buf.max) return;

  const o = buf.n * 8;

  buf.data[o] = x;
  buf.data[o + 1] = bank ? bank.m[4] * y + bank.m[7] * z : y;
  buf.data[o + 2] = bank ? bank.m[5] * y + bank.m[8] * z : z;
  buf.data[o + 3] = size;
  buf.data[o + 4] = r;
  buf.data[o + 5] = g;
  buf.data[o + 6] = b;
  buf.data[o + 7] = a;
  buf.n++;
}

export const GLOW = createPointBuf(4 * 40 + 8); // the spark and the first glow of the flame: they add light
