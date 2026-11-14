// The engine's frame and dimensions, the two banks, the firing order, and the turns parts are drawn with.

import type { FwVec3 } from "../mesh/builder";

/* =========================================================
   CONSTANTS

   The engine lives in its own frame, and the camera moves round it:
     X runs along the crankshaft (the timing chain at -X, the flywheel at +X),
     Y is down (the crankshaft's axis is 0, the head is about 270 above it),
     Z is across the engine.
   One unit is about one pixel of the drawing the engine began as.
   ========================================================= */

// The connecting rods were lengthened from 159 to 204, so that the pistons of the two banks, side by side on one crank pin,
// never touch at the bottom of the V, and so that a piston stays wholly in its bore even at the bottom of its stroke:
// everything above the pistons (the bores' tops, the heads, the cams, the ports, the plenums, the exhaust logs and the
// turbocharger modules) stands this much higher along each bank's bore than it did
export const ROD_LIFT = 45;
export const CRANK_Y = 439 + ROD_LIFT; // the crankshaft's axis on the drawing's scale; heights below are measured from it
export const CAM_Y = 79; // raised to make room for tappets + springs
export const FW_SCALE = 1.95; // the flywheel is modelled in base units, then scaled up
export const FW_TIP_R = 77; // ring-gear tip radius (base units)
export const FW_GEAR_HALF = 9; // half face width of the ring gear (base units)

export const R = 54;
export const L = 159 + ROD_LIFT;

export const BORE_W = 133;
export const BORE_TOP = 170;
// The foot of the bore, 124 from the crank's axis along it: the thin ring round the bore's foot (BORE_R + 3.5) stays on
// its own side of the V's middle plane, clear of the other bank's by about 1, and the piston's skirt, at the bottom of
// its stroke (125), is still in the bore
const BORE_BOTTOM = CRANK_Y - 124;
export const PISTON_H = 65; // the crown 40 above the wrist pin, the skirt 25 below it (it was 30)

// The six places along the crankshaft, one for each throw: the first next to the timing chain (at -X), the
// last next to the flywheel. Each bank has a cylinder at every place
// from one to the next: as close as the cylinders' liners (145 across) allow, a hair between them, as a real V12's
// siamesed bores are (it was 208, then 162 with liners twice as thick)
const CYL_PITCH = 147;
export const CT_X = [0, 1, 2, 3, 4, 5].map((i) => -284.06 + i * CYL_PITCH);

// Where the flywheel's centre plane is, along the crankshaft
export const FLYWHEEL_WORLD_X = CT_X[CT_X.length - 1] + 180.12;

// Which way the crankshaft turns: +1 or -1. The strokes follow each other in
// the same order either way, and the pistons move the same; this sets the sense
// of turn of the crank, the camshafts, the chain, the flywheel and the swing of
// the rods.
export const CRANK_DIRECTION = -1;

// ---- THE V12: two banks of six cylinders, 60 degrees apart ----
//
// Each bank is a straight six, turned about the crankshaft by 30 degrees one way or the other. The first (A)
// is turned as it is; the second (B) is its mirror image, so that its exhaust faces outward and its intake
// faces the valley, as the first's does. Everything of a bank is made in the bank's own frame, upright, and
// turned into the engine's by the bank's matrix.
// The two cylinders on a crank pin stand side by side along the shaft.
// Numbered as Ferrari numbers its V12s: seen from the front (the timing chains, the radiators), the left bank (the frame B,
// shown as bank A) has the cylinders 1 to 6, from the front back; the right bank (the frame A, shown as bank B) 7 to 12
// from the back forward, so that 7 stands opposite 6 and 12 opposite 1; one cylinder fires every 60 degrees.
const BANK_HALF_ANGLE = Math.PI / 6;
const BANK_ROD_DX = 12.5; // each of the two rods on a pin is this far from the middle of the throw

// The fixed turns a part can be drawn with, by name: each is a place in ORIENTATIONS (filled in where the
// turns themselves are known, after the banks, the turbocharger modules and the starter)
export const ORIENT = {
  NONE: 0, // the engine's own frame
  BANK_A: 1, // a bank's own frame
  BANK_B: 2,
  MODULE_A: 3, // a turbocharger module's frame: its collector and pipes
  MODULE_B: 4,
  TURBO_A: 5, // the turbocharger's own frame, inside its module: housings and wheels
  TURBO_B: 6,
  STARTER: 7, // the starter motor's frame
  STARTER_AXIAL: 8, // a starter part built along its own y, laid along the starter's axis: the return spring
  STARTER_FORK: 9, // the shift fork: its x along the pivot
  IC_NEG: 10, // an intercooler on the side of the V at -Z (bank A's), turned from where it was built
  IC_POS: 11, // and the one at +Z (bank B's)
} as const;

export type Bank = {
  name: string;
  phi: number; // how far the bank is turned about the crankshaft
  mirror: boolean; // the bank is the mirror image of the other
  dir: number; // the sense the crankshaft turns in, seen in this bank's own frame
  phase: number[]; // each cylinder's place in the 720 degree cycle
  dx: number; // how far along the shaft the bank's cylinders stand from the middles of the throws
  numbers: number[]; // the cylinders' numbers, by their place along the engine
  betaLocal: number[]; // each throw's angle, seen in this bank's frame
  m: Float32Array; // the bank's turn, column by column: from its frame to the engine's
  mInv: Float32Array;
  orient: number; // its place in ORIENTATIONS
};

function makeBank(name: string, phi: number, mirror: boolean, phase: number[], dx: number, numbers: number[], orient: number): Bank {
  const c = Math.cos(phi);
  const sn = Math.sin(phi);
  const sign = mirror ? -1 : 1;
  const m = new Float32Array([1, 0, 0, 0, c, sn, 0, -sign * sn, sign * c]);
  const mInv = new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]);

  return {
    name, phi, mirror,
    dir: mirror ? -CRANK_DIRECTION : CRANK_DIRECTION,
    phase, dx, numbers,
    // the piston is at the top when the crank is at the angle that the cylinder's place in the cycle gives it
    betaLocal: phase.map((p) => (-sign * (((p * 720) % 360) * Math.PI)) / 180),
    m, mInv, orient,
  };
}

// At 60 degrees the V12 fires evenly, in Ferrari's order 1-12-5-8-3-10-6-7-2-11-4-9. The crank has six throws, in the order
// 0, 120, 240, 240, 120, 0 degrees (crankTrain/dimensions.ts, CT_BETA); on each pin, the left bank's cylinder comes to the
// top 60 degrees before the right one's. Each bank fires every 120 degrees (the left 1-5-3-6-2-4), the two banks in turn,
// at these crank angles (of 720), cylinder by cylinder from the front:
const V12_FIRE_A = [390, 150, 630, 270, 510, 30]; // the right bank, front to back (cylinders 12 down to 7)
const V12_FIRE_B = [330, 90, 570, 210, 450, 690]; // the left bank, front to back (cylinders 1 to 6)
const phaseOfFire = (deg: number) => (((0.5 - deg / 720) % 1) + 1) % 1;

export const BANKS: Bank[] = [
  makeBank("A", BANK_HALF_ANGLE, true, V12_FIRE_A.map(phaseOfFire), BANK_ROD_DX, [12, 11, 10, 9, 8, 7], ORIENT.BANK_A), // (the right bank, seen from the front: 7 at the flywheel end, up to 12 opposite 1)
  makeBank("B", -BANK_HALF_ANGLE, false, V12_FIRE_B.map(phaseOfFire), -BANK_ROD_DX, [1, 2, 3, 4, 5, 6], ORIENT.BANK_B), // (the left bank, seen from the front: 1 by the radiators, back to 6)
];

// The heads and the timing drives of the two banks stand at the same place along the crank, the place of the bank nearer
// the flywheel, though the banks' cylinders are offset: so both heads are of one length, ending together at both ends.
// `driveShift`: how far a bank's head and timing drive are moved back from its cylinders' own offset (0 for that bank)
export const DRIVE_DX = Math.max(...BANKS.map((k) => k.dx));
export const driveShift = (bank: Bank) => DRIVE_DX - bank.dx;

// A timing drive's primary chain runs in a plane this far from its secondary's (behind it, or in front of it: primaryDx)
export const PRIMARY_DX = 14;

type EngineCylinder = { bank: Bank; k: number; x: number; number: number };

// The twelve cylinders: A's six, then B's six
export const CYLS: EngineCylinder[] = BANKS.flatMap((bank: Bank) => CT_X.map((cx: number, k: number): EngineCylinder => ({ bank, k, x: cx + bank.dx, number: bank.numbers[k] })));

// The cylinders in the order they fire, from cylinder 1, with the crank angle (of 720) at which each does
const fireDeg = (cy: EngineCylinder) => Math.round(((((0.5 - cy.bank.phase[cy.k]) % 1) + 1) % 1) * 720);
const FIRST_FIRE = fireDeg(CYLS.find((cy) => cy.number === 1)!);

export const FIRING_ORDER = CYLS.map((cy) => ({
  no: cy.number,
  deg: fireDeg(cy),
  cyl: cy,
  // the bank as it is shown: the left one, seen from the front (the timing chains and the radiators), is bank A (0) and
  // the right one bank B (1), Ferrari's way (the frames' own names, A and B, are the other way round)
  bank: cy.bank.name === "B" ? 0 : 1,
})).sort((a, b) => ((a.deg - FIRST_FIRE + 720) % 720) - ((b.deg - FIRST_FIRE + 720) % 720));

// A bank's turn composed with another turn: first `t`, then the bank's
export function composeTurn(m: Float32Array, t: ArrayLike<number>): Float32Array {
  const out = new Float32Array(9);

  for (let j = 0; j < 3; j++) {
    for (let r = 0; r < 3; r++) {
      out[3 * j + r] = m[r] * t[3 * j] + m[3 + r] * t[3 * j + 1] + m[6 + r] * t[3 * j + 2];
    }
  }

  return out;
}

// A point of a bank's own frame, in the engine's
export function bankPoint(bank: Bank, x: number, y: number, z: number): FwVec3 {
  const m = bank.m;

  return [x, m[4] * y + m[7] * z, m[5] * y + m[8] * z];
}

// Fuel injector, one per cylinder, in the free corridor on the intake side of
// the head. It stands upright, parallel to the spark plug.
export const INJ = {
  x: 40, // axial offset from the cylinder axis
  z: 0, // depth: between the intake and exhaust valve rows
  tilt: 0, // lean angle: 0 = vertical
  scale: 0.75,
  length: 116 * 0.75,
};

// Spark plug, one per cylinder: on the cylinder's axis, so that the flame that
// starts from its spark spreads evenly through the bore
export const PLUG = {
  x: 0, // axial offset from the cylinder axis
  z: 0, // depth
};

export const TAU = Math.PI * 2;

// Ignition
export const ELECTRODE_TIP_Y = 7; // electrode tip, below the chamber roof
export const SPARK_START = 0.47; // ~22° before TDC (spark advance)
export const SPARK_END = 0.505; // just after TDC
export const BURN_END = 0.75; // flame fades out at end of power stroke

export function pseudoRandom(seed: number, i: number): number {
  const s = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return s - Math.floor(s) - 0.5; // -0.5 .. 0.5
}

// The cylinders: the bore, a glass tube exactly the piston's size, and round it, faint, the wall of the liner, which
// stops short of the bore's foot (a stepped liner), so that the two banks' walls stay clear of each other in the V
export const BORE_R = BORE_W / 2;
export const LINER_OUTER_R = BORE_R + 6; // the liner's wall: 6 thick (it was 12)
export const LINER_H = BORE_BOTTOM - BORE_TOP;
export const LINER_WALL_H = LINER_H - 16; // the wall's foot is 140 from the crank's axis

// The valves' head radii: both 15% larger than they were (14.5 and 12.5), so that
// the pair stays in proportion
export const VALVE_RH_IN = 16.7;
export const VALVE_RH_EX = 14.4;
// The timing chain's plane sits in front of the first main bearing, past the
// seal housing: the shaft comes out of the housing, runs on for about ten units
// of bare nose (with its key), and goes into the crank sprocket's collar and hub
export const CHAIN_X_WORLD = CT_X[0] - 28 - 72.2 - 36;

// The heads' half-width across, at their port faces, as they are drawn; and how much they are widened, about their middle
// plane (everything of them: deck plate, casting, cover, lettering; scene/meshes.ts builds them stretched). Their port faces
// so stand HEAD_PORT_DZ further out on each side, and the pipes at the ports (the intake runners and their flanges, the
// exhaust flanges, flares and stubs) start that much further out
export const HEAD_HALF_W = 96;
export const HEAD_WIDEN = 1.1;
export const HEAD_PORT_DZ = HEAD_HALF_W * (HEAD_WIDEN - 1);
