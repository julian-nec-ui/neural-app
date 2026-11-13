// How the engine looks when drawn: how see-through each part is and the colour of its contour, the floor's place, and
// the colours of the air and the gas in the airflow view.

import type { Bank } from "../core/constants";
import { bankPoint } from "../core/constants";
import type { FwVec3 } from "../mesh/builder";


export const FLOOR_Y = 380; // the floor, below the intercooler and the turbochargers
export const DECK_OPACITY = 0.38; // how solid the head's deck plate looks
const HEAD_OPACITY = 0.26; // and the head's shell: the walls and the cover, see-through (its colour kept, more of the workings showing)
const HEAD_OPACITY_TOP = HEAD_OPACITY; // and from above as well: seen over its top, it stays see-through, the workings under it show
// A bank's head's opacity, from where the eye is: from the side or from below HEAD_OPACITY, over its top HEAD_OPACITY_TOP,
// with a short fade between (both alike now: the head is see-through from every side)
export const headOpacityAt = (eye: FwVec3, bank: Bank) => {
  const up: FwVec3 = [-bank.m[3], -bank.m[4], -bank.m[5]]; // the bank's axis, out through its head
  const c = bankPoint(bank, (CT_X_MID), -430, 0); // the head's top, at its middle
  const v: FwVec3 = [eye[0] - c[0], eye[1] - c[1], eye[2] - c[2]];
  const a = (v[0] * up[0] + v[1] * up[1] + v[2] * up[2]) / (Math.hypot(v[0], v[1], v[2]) || 1);
  const k = Math.min(1, Math.max(0, (a + 0.02) / 0.08));

  return HEAD_OPACITY + (HEAD_OPACITY_TOP - HEAD_OPACITY) * k * k * (3 - 2 * k);
};
const CT_X_MID = 235;
export const CAM_NEAR_DEPTH = 150; // the camera's near plane, for depth offsets
export const EXHAUST_PIPE_OPACITY = 0.3; // the exhaust header, drawn with its steel contour
export const PIPE_OPACITY = 0.3; // the pipes: thin glass, so that the air in them shows
export const PIPE_RIM = 0.9; // and their contour, so that their edges show as the engine turns and the gas moves in them
export const RIM_STEEL: FwVec3 = [0.84, 0.88, 0.96]; // the contour's bright line: polished steel
// on the exhaust, a cold, icy blue: the hot pipes pass in front of the red heads, and a warm or grey line is lost there
export const RIM_EXHAUST: FwVec3 = [0.42, 0.88, 1.0];
// on the charge, from the compressors through the intercooler to the distributor and the runners: a grey metal, lit
// along its curve and shaded into the dark line at the edge, so that the pipes stand out from the side, over the
// pistons and the heads, as metal, still see-through
export const RIM_CHARGE: FwVec3 = [0.5, 0.54, 0.6];
export const INTAKE_DUCT_OPACITY = 0.3; // the ducts from the air filters to the compressors: more metal than glass
export const COOL_PIPE_OPACITY = 0.72;
export const HOT_CHARGE_OPACITY = 0.3; // the hot charge's pipe, turbo to intercooler: thin glass, so that its air shows blue, as in the plenum's runners // the pipes from the intercoolers to the distributors: polished metal, the air faintly through it
export const HOT_PIPE_OPACITY = 0.6; // the exhaust's pipes to the turbines: more metal, the head behind them veiled; the gas still shows
export const OIL_BAND = 46; // how far below the skirt the oil on the bore's wall reaches
export const BLOCK_RIM = 0.75; // the block's contour: a bright line along its walls' edges // the block's walls: what works inside shows through them
export const SUMP_OPACITY = 0.55; // the dry sump's shell: dark metal, the oil faintly through it
export const CASING_OPACITY = 0.3; // the turbo's housings, light, so that the wheels inside show clearly
export const STARTER_YOKE_OPACITY = 0.3; // the starter motor's yoke, on the cut starter, to see the windings under it

// The air's bodies: one density for both, so they are equally see-through
export const FOG_DENSITY = 0.2; // the air shows plainly
const FOG_COLD: FwVec3 = [0.12, 0.72, 1.0]; // the air going in: bright metallic sky blue
const FOG_COLD_ACCENT: FwVec3 = [0.02, 0.38, 1.0]; // through cobalt...
const FOG_COLD_PALE: FwVec3 = [0.1, 0.5, 1.0]; // ...to a deeper blue, as it is compressed and warmed (blue all the way: as in the plenum)
const FOG_HOT: FwVec3 = [1.0, 0.22, 0.0]; // the gas going out: metallic orange, saturated and lively
const FOG_HOT_COOLER: FwVec3 = [0.86, 0.04, 0.02]; // a deeper red-orange, as it cools
const FOG_HOT_ACCENT: FwVec3 = [1.0, 0.48, 0.02]; // by way of gold
const FOG_CORE: FwVec3 = [1.0, 0.38, 0.02]; // the brighter core through the turbine
const FOG_CORE_B: FwVec3 = [1.0, 0.16, 0.0];
const FOG_CORE_ACCENT: FwVec3 = [1.0, 0.72, 0.22];

// Each kind of body: its base, the accent it passes through, its tone, its glow, how rich it is, and how dense (1 if not given)
// The exhaust gas past the collectors, at low speed: a pale, warm smoke grey; it turns to orange from 2000 rpm up
export const EXHAUST_PALE: FwVec3 = [0.8, 0.76, 0.7];
export const smooth01 = (x: number) => {
  const k = Math.min(1, Math.max(0, x));

  return k * k * (3 - 2 * k);
};
export const mix3 = (a: FwVec3, b: FwVec3, t: number): FwVec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export const FOG_PALETTE: Array<{ base: FwVec3; accent: FwVec3; tone: FwVec3; glow: number; rich: number; alpha?: number }> = [
  { base: FOG_COLD, accent: FOG_COLD_ACCENT, tone: FOG_COLD_PALE, glow: 0.1, rich: 1.0 },
  { base: FOG_HOT, accent: FOG_HOT_ACCENT, tone: FOG_HOT_COOLER, glow: 0.2, rich: 1.0 },
  { base: FOG_CORE, accent: FOG_CORE_ACCENT, tone: FOG_CORE_B, glow: 0.75, rich: 0.6 },
  { base: FOG_COLD, accent: FOG_COLD_ACCENT, tone: FOG_COLD, glow: 0.1, rich: 1.0, alpha: 0.4 }, // soft: spread through the housing
  // the gas in the runners, the collectors and on to the turbines: a light orange, not the ports' fiery red
  // (and much fainter: a light veil, so that the engine's cycle shows clearly through the headers from every side)
  { base: [1.0, 0.56, 0.22], accent: [1.0, 0.68, 0.34], tone: [0.96, 0.5, 0.18], glow: 0.06, rich: 0.5, alpha: 0.28 },
];
export const BACKGROUND: FwVec3 = [0, 0, 0];
