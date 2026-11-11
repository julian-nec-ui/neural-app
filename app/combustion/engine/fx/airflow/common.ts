// What the air's parts share: the Flow type, colours, smoothing, scatter and path length.

import { vlen, vsub } from "../../math/vec3";
import type { FwVec3 } from "../../mesh/builder";
import type { Curve } from "../../mesh/tubes";

/* ---------------- the air ---------------- */

// The air is shown as solid, see-through bodies that fill the pipes: sky blue
// metal for the air going in, light orange metal for the gas going out, both
// equally transparent. Bands of density and bright fronts run along each body,
// in the direction of the flow; there is nothing that winds round it. Where a stream passes
// through a cylinder it is a straight jet that widens as it goes down the bore.
//
// The bodies' places never change (they are built once); what moves is the
// pattern in them, and it comes from the engine's phase alone (no state): so the
// air moves with the engine, at any speed, and stands still when the engine does.
//
//  Intake: filter -> compressor -> hot charge pipe -> intercooler tank -> its core
//  -> second tank -> cool charge pipe -> throttle -> plenum -> runner -> port -> a
//  jet into the cylinder.
//  Exhaust: a jet from the cylinder -> port -> runner -> log manifold -> turbine
//  -> exhaust tail -> a plume in the air. Ambient air crosses the intercooler's fins as thin streaks.
//
// The stream in a cylinder's runner and ports moves only while its valve is open:
// the pattern advances with the integral of the valve's lift.

type FlowColor = (u: number) => [number, number, number];

export type Flow = {
  curve: Curve;
  count: number;
  passes: number; // whole trips along the path in one engine cycle
  alpha: number;
  spread: number; // how far from the middle of the path a streak can wind
  swirl: number; // turns of the spiral per 100 units of path
  trail: number; // length of a streak, in units of path
  width: number; // thickness of a streak, in units
  tint: FlowColor;
  ends: number; // fraction of the path over which it fades in and out
  theta: Float32Array; // each streak's angle round the path
  radial: Float32Array; // and its distance from the middle, 0..1
  rnd: Float32Array; // brightness variation
  gate?: { cyl: number; valve: number }; // if it is given, the streaks show while this cylinder's valve is open
  straight?: boolean; // the streaks run as straight lines, side by side along the path, and do not wind round it
  hot?: boolean; // it is burnt gas, on the exhaust side: it shows as full as the exhaust is (else as full as the intake is)
};

export const AIR_COOL: [number, number, number] = [0.55, 0.84, 1.0];
export const AIR_WARM: [number, number, number] = [1.0, 0.74, 0.5];

export const mixColor = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => {
  const k = Math.min(1, Math.max(0, t));

  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
};

export const smooth01 = (x: number) => {
  const k = Math.min(1, Math.max(0, x));

  return k * k * (3 - 2 * k);
};

// A cheap, steady scatter for each streak
export const scatter = (n: number, seed: number) => {
  let s = seed * 9301 + 49297;
  const out = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    out[i] = s / 233280;
  }

  return out;
};

export const polyLength = (pts: FwVec3[]) => {
  let total = 0;

  for (let i = 1; i < pts.length; i++) total += vlen(vsub(pts[i], pts[i - 1]));

  return total;
};
