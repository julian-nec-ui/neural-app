// The starter's gearing: the flywheel's ring gear and the starter's pinion, a pair of involute gears.

import { TAU } from "../core/constants";

// ======== THE RING GEAR AND THE PINION ========
// Both are involute gears of the same module, at a 20 degree pressure angle, their axes ST_D apart (in the engine's units).
// The pinion has only nine teeth, so its teeth are made longer and the ring gear's shorter (the profile shift), which keeps
// the pinion's teeth from being undercut at the root. The ring gear's teeth are drawn from their involute; the pinion's
// are then found from them: each of its teeth is what is left of the pinion when the ring gear's teeth have turned through
// it, so the two mesh exactly, tooth against tooth, with a little backlash.

export const ST_D = 170; // between the starter's axis and the crank's
export const ST_TEETH = 9; // the pinion's
export const RING_TEETH = 56; // the ring gear's
export const ST_RATIO = RING_TEETH / ST_TEETH;
export const ST_PHI_S = -Math.PI / 4; // the direction of the starter's axis from the crank's

const PRESSURE = (20 * Math.PI) / 180;
const MODULE = (2 * ST_D) / (ST_TEETH + RING_TEETH); // the pitch circles touch: their radii add up to ST_D
const SHIFT = 0.29; // the profile shift, in modules: + on the pinion, - on the ring gear
const BACKLASH = 0.35; // the pinion's teeth are this much thinner on each side than the space they turn in

const inv = (a: number) => Math.tan(a) - a;

// The pinion's angle that keeps its teeth in the ring gear's spaces, for the flywheel at angle F
export const stMesh = (F: number) => -Math.PI - ST_RATIO * (F + ST_PHI_S);

/* ---- the ring gear, in the engine's units ---- */

const R2 = (MODULE * RING_TEETH) / 2; // its pitch radius
const R2_BASE = R2 * Math.cos(PRESSURE);

export const RING = {
  pitch: R2,
  tip: R2 + MODULE * (1 - SHIFT),
  root: R2 - MODULE * (1.25 + SHIFT),
  thickness: MODULE * (Math.PI / 2 - 2 * SHIFT * Math.tan(PRESSURE)), // a tooth's, along its pitch circle
  tipRound: 0.9, // the tip's corners are eased this far
  rootFillet: 1.1, // and its root runs into the ring in a fillet this high
};

// Half the angle a ring gear's tooth takes up at radius R, about its middle; below the base circle the flanks run straight
// in to the root, and the fillet widens them there
export function ringHalfAngle(R: number): number {
  const { pitch, tip, root, thickness, tipRound, rootFillet } = RING;

  if (R < root - 1e-6 || R > tip + 1e-6) return -1;

  const r = Math.max(R, R2_BASE);
  let psi = thickness / (2 * pitch) + inv(PRESSURE) - inv(Math.acos(R2_BASE / r));

  // the round at the tip: the corner falls away on a quarter circle
  if (R > tip - tipRound) {
    const u = (R - (tip - tipRound)) / tipRound;

    psi -= (tipRound * (1 - Math.sqrt(Math.max(0, 1 - u * u)))) / R;
  }

  // the fillet at the root: the flank swings out into the space between the teeth
  if (R < root + rootFillet) {
    const u = 1 - (R - root) / rootFillet;

    psi += (rootFillet * (1 - Math.sqrt(Math.max(0, 1 - u * u)))) / R;
  }

  return psi;
}

/* ---- the pinion, found from the ring gear ---- */

const R1 = (MODULE * ST_TEETH) / 2;

export const PINION = {
  pitch: R1,
  // its tips clear the ring gear's roots, and its roots its tips, by a quarter of the module
  tip: ST_D - RING.root - 0.25 * MODULE,
  root: ST_D - RING.tip - 0.25 * MODULE,
};

// Is the point at radius r and angle phi, in the pinion's own frame, ever inside one of the ring gear's teeth while the
// two turn together? The pinion's frame turns into the engine's as the starter's does (see scene/commands.ts)
function swept(r: number, phi: number, flywheelAngles: number[]): boolean {
  const by = ST_D * Math.SQRT1_2;
  const bz = -ST_D * Math.SQRT1_2;
  const ringPitch = TAU / RING_TEETH;
  const p = r * Math.cos(phi);
  const q = r * Math.sin(phi);

  for (const F of flywheelAngles) {
    const P = stMesh(F);
    const cP = Math.cos(P);
    const sP = Math.sin(P);
    const p2 = p * cP + q * sP;
    const q2 = -p * sP + q * cP;
    const Y = by + Math.SQRT1_2 * (p2 + q2);
    const Z = bz + Math.SQRT1_2 * (q2 - p2);
    const c = Math.cos(F);
    const s = Math.sin(F);
    const y = Y * c - Z * s;
    const z = Y * s + Z * c;
    const R = Math.hypot(y, z);
    const half = ringHalfAngle(R);

    if (half < 0) continue;

    // the ring gear's teeth are at the middles of its pitches
    let a = Math.atan2(z, y) / ringPitch - 0.5;

    a = (a - Math.round(a)) * ringPitch;

    if (Math.abs(a) < half + BACKLASH / R) return true;
  }

  return false;
}

// The pinion's tooth, root to tip: [radius, half angle about the tooth's middle]
export const PINION_TOOTH: Array<[number, number]> = (() => {
  // one whole turn of the pinion, so that every tooth of it meets the ring gear once: tooth 0 is the one measured
  const flywheelAngles: number[] = [];
  const steps = 90; // per pitch of the ring gear

  for (let i = 0; i < ST_TEETH * steps; i++) flywheelAngles.push((i / steps) * (TAU / RING_TEETH));

  const out: Array<[number, number]> = [];
  const n = 22;

  for (let i = 0; i <= n; i++) {
    // closer together toward the tip, where the flank turns fastest
    const u = 1 - (1 - i / n) * (1 - i / n) * 0.35 - (1 - i / n) * 0.65;
    const r = PINION.root + 0.6 + (PINION.tip - PINION.root - 0.6) * u;
    let lo = 0;
    let hi = Math.PI / ST_TEETH;

    if (swept(r, 0, flywheelAngles)) break;

    for (let k = 0; k < 18; k++) {
      const m = (lo + hi) / 2;

      if (swept(r, m, flywheelAngles)) hi = m;
      else lo = m;
    }

    out.push([r, lo]);
  }

  // At the root, a space at least SPACE wide, down to the root circle; at the tip, the point is cut back to a flat land
  // no narrower than TOP_LAND
  const SPACE = 2.6;
  const TOP_LAND = 1.7;
  const maxHalf = (r: number) => Math.PI / ST_TEETH - SPACE / 2 / r;
  const rows: Array<[number, number]> = [[PINION.root, maxHalf(PINION.root)]];

  for (const [r, half] of out) {
    if (2 * half * r < TOP_LAND) break;

    rows.push([r, Math.min(half, maxHalf(r))]);
  }

  return rows;
})();

// The pinion's tip, where its top land is
export const PINION_TIP = PINION_TOOTH[PINION_TOOTH.length - 1][0];
