// The timing drive's gears: from the crankshaft up to the idler, which carries the chain's sprocket; one train per
// bank, in the plane the chains ran in. Their layout, how fast each turns, and the phases that keep their teeth in one
// another's spaces.

import { BANKS, TAU } from "../../core/constants";
import type { Bank } from "../../core/constants";

// The drive is in two stages, as on many real twin-cam engines. Low down, gears: the crank's (20 teeth) drives one idler
// (40 teeth) straight above it, which turns at half the crank's speed, as the cams do. On the idler's hub, in front of it, a
// chain sprocket as large as the cams': from it a short chain runs up round both cams' sprockets. The one mesh turns the
// idler against the crank, and the chain turns its sprockets all one way: the cams turn against the crank (CAM_SENSE), their
// lobes set round the other way, so that every valve opens when it did. The chain runs this far in front of the gears, on
// the idler's sprocket
export const CRANK_GEAR_TEETH = 20;
const IDLER_TEETH = [40];
export const CAM_SENSE = -1; // the cams' sense of turn against the crank's
export const CHAIN_FWD = 13.5;

export const GEAR_MODULE = 49.0666 / 20; // the idler as large as the cams' sprockets
export const GEAR_HALF = 6; // half a gear's face width
export const pitchR = (teeth: number) => (GEAR_MODULE * teeth) / 2;

// The crank's timing mark, as one angle on the crankshaft: the stripe along the front journal, the painted tooth of the
// crank's gear and the painted tooth of the flywheel all lie on it (where the chain drive's crank sprocket had it)
export const MARK_ANGLE = 0.008201891325647193;

export type Gear = {
  name: "crank" | "idler";
  teeth: number;
  y: number;
  z: number;
  speed: number; // its turn for one turn of the crank (+ the crank's way)
  phase: number; // its angle at crank angle 0
};

// center distance of two gears in mesh
const meshD = (a: number, b: number) => (GEAR_MODULE * (a + b)) / 2;

function layout(crankPhase: number): Gear[] {
  // straight up the bank's middle, each meshing the one below
  const teeth = [CRANK_GEAR_TEETH, ...IDLER_TEETH];
  const gears: Gear[] = [];
  let y = 0;

  teeth.forEach((t, i) => {
    if (i > 0) y -= meshD(teeth[i - 1], t);
    gears.push({ name: i === 0 ? "crank" : "idler", teeth: t, y, z: 0, speed: 0, phase: 0 });
  });

  // speeds and phases, gear after gear. A gear's tooth 0 stands half a pitch from its local angle 0; turned by a, a point
  // at local angle t is seen at t - a
  const crank = gears[0];

  crank.speed = 1;
  crank.phase = crankPhase;

  const link = (from: Gear, to: Gear) => {
    const d1 = TAU / from.teeth;
    const d2 = TAU / to.teeth;
    const th = Math.atan2(to.z - from.z, to.y - from.y); // from the first's center toward the second's
    // a tooth of the first on the line between them, a space of the second facing it: as the two roll, both stay so
    const f = (th + from.phase - d1 / 2) / d1;

    to.speed = (-from.speed * from.teeth) / to.teeth;
    to.phase = (((-(th + Math.PI) - d2 * f) % d2) + d2) % d2;
  };

  for (let i = 1; i < gears.length; i++) link(gears[i - 1], gears[i]);

  return gears;
}

// The crank's gear is one wide gear, both banks' idlers meshing with it, each in its own plane; drawn in bank A's frame, its
// painted tooth on the timing mark. Bank B's idler is set from where that gear's teeth are seen in bank B's own frame
// (turned the other way round the crank, and mirrored)
const crankPhaseA = 0.5 * (TAU / CRANK_GEAR_TEETH) - MARK_ANGLE;

function crankPhaseIn(bank: Bank): number {
  const [A] = BANKS;
  const d = TAU / CRANK_GEAR_TEETH;
  const psi = 0.5 * d - crankPhaseA; // tooth 0, at crank angle 0, in bank A's frame
  const wy = A.m[4] * Math.cos(psi) + A.m[7] * Math.sin(psi);
  const wz = A.m[5] * Math.cos(psi) + A.m[8] * Math.sin(psi);
  // and in this bank's (its turn's inverse)
  const det = bank.m[4] * bank.m[8] - bank.m[7] * bank.m[5];
  const vy = (bank.m[8] * wy - bank.m[7] * wz) / det;
  const vz = (-bank.m[5] * wy + bank.m[4] * wz) / det;

  return 0.5 * d - Math.atan2(vz, vy);
}

export const GEARS = layout(crankPhaseA);
const GEARS_B = layout(crankPhaseIn(BANKS[1]));
export const gearsFor = (bank: Bank) => (bank === BANKS[0] ? GEARS : GEARS_B);
export const IDLER2 = GEARS[GEARS.length - 1]; // the one carrying the chain's sprocket (where it stands, how fast it turns: the same on both banks)
