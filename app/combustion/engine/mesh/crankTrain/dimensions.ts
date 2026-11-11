// The crank train's dimensions: the crankshaft, the rods and the pistons.

import { BORE_W, CHAIN_X_WORLD, CT_X, DRIVE_DX, FLYWHEEL_WORLD_X, PRIMARY_DX } from "../../core/constants";

/* =========================================================
   CRANK TRAIN: crankshaft, connecting rods, pistons

   Everything that moves in the plane perpendicular to the
   crankshaft. The crankshaft spins about the X axis; each rod
   swings in the YZ plane; each piston slides along Y.

   World units: X is along the shaft, Y is down, measured from
   the shaft axis, Z is across the engine.
   ========================================================= */

export const CT_STEPS = 72;
export const CT_PISTON_STEPS = 128;
export const CT_PISTON_FRONT_WALL = true; // the thrust face on the +Z side (with its etched plate)
export const CT_PISTON_BACK_WALL = true; // the thrust face on the -Z side; both off = the side walls only

export const CT = {
  journalR: 30, // the main journals: 60 across (was 48), sturdier than the pins, for a turbocharged racing crank
  neckR: 24, // (was 19)
  snoutR: 17,
  pinR: 26, // the crank pins: 52 across (was 42), 0.39 of the bore, as a racing engine's are
  pinHalf: 25, // half the crank pin's length: it carries two rods side by side
  webT: 17.5,
  webOut: 42.5, // where a throw's webs end, either side of its middle
  webBaseR: 38, // (was 31): the webs round the bigger journals
  webLobeR: 26.8, // the lobe of a web round the crank pin, round the bigger pin (was 21.6)
  cwR: 70.4, // the counterweights' radius: 10% more (was 64)
  cwHalf: 1.71875, // half the counterweight's arc, radians: 10% wider, a broader fan (was 1.5625)
  bigEndR: 45, // the rods' big ends: 1.7 times the pin, as before (was 36.5)
  bigEndHalf: 12, // the rod's big end is as much narrower as the crank pin (was 15)
  pistonR: BORE_W / 2 - 0.3, // the bore's own size, less a hair: the piston fills the glass tube
};

// Each throw's angle on the shaft (its axial position is CT_X)
// (the V12's crank: six throws)
export const CT_BETA = [0, 240, 120, 120, 240, 0].map((d) => (d * Math.PI) / 180);

// The crankshaft ends right at the crank sprocket (inside its hub), instead
// of sticking out through the plane of the chain
// far enough for the two crank sprockets: the front one, of the bank whose primary chain runs in front of its secondary, at
// the drives' place (DRIVE_DX) less PRIMARY_DX; and no further, so that the crank's bolt stays under the timing covers
export const CT_SNOUT_X = CHAIN_X_WORLD + DRIVE_DX - PRIMARY_DX - 8;

// The crank flange sits against the back of the flywheel's hub (the flywheel is
// bolted to it), so the last neck is stretched to reach that far
export const CT_FLY_X = FLYWHEEL_WORLD_X; // the flywheel's centre plane, along the shaft
export const CT_FLANGE_FACE = CT_FLY_X - 15.75; // (the hub's back face, at the flywheel's larger scale)
export const CT_NOSE_END = CT_FLANGE_FACE + 5; // a short pilot, into the hub
export const CT_REAR_NECK = CT_FLANGE_FACE - (CT_X[CT_X.length - 1] + CT.webOut) - 88;

// Half-width of the bearing shell on a journal of the given half-length
export const shellHalf = (halfLen: number) => Math.min(25, halfLen - 10);
