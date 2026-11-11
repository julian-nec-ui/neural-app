// The starter's state, and how its pinion and fork move with the flywheel.

import { stMesh } from "../mesh/gearing";

export { stMesh };

/* ---- the starter's state, and how its parts move ---- */

export const STARTER = {
  pull: 0, // 0..1: how far the solenoid has pulled the fork round
  locked: false, // the pinion is in the ring gear's teeth: it turns as they turn
  driven: false, // the motor is driving: the armature turns with the pinion
  C: 0, // the pinion's turn beyond the mesh, a whole number of teeth
  pinFree: 0, // the pinion's angle when it is free
  armFree: 0, // the armature's angle when it is free
  Fcont: 0, // the flywheel's angle, counted on without a wrap
  Fprev: Number.NaN,
  fuel: true, // the injectors work
  spark: true, // the plugs fire
};

// Where the pinion is: on the flywheel's angle F, counted on without a wrap
export function starterTrack(F: number) {
  if (Number.isNaN(STARTER.Fprev)) {
    STARTER.Fprev = F;
    STARTER.Fcont = F;

    return;
  }

  let d = F - STARTER.Fprev;

  d -= 4 * Math.PI * Math.round(d / (4 * Math.PI)); // the cycle is two turns: the angle wraps every four pi
  STARTER.Fcont += d;
  STARTER.Fprev = F;
}

export const starterPin = () => (STARTER.locked ? stMesh(STARTER.Fcont) + STARTER.C : STARTER.pinFree);
export const starterArm = () => (STARTER.locked && STARTER.driven ? starterPin() : STARTER.armFree);

// The fork turns by phi about its pivot: the collar's groove is 62 below the pivot, the plunger's hook 24.4 above it
export const stSlide = (phi: number) => 62 * Math.sin(phi) + 4 * (1 - Math.cos(phi));
export const stPlunger = (phi: number) => 24.4 * Math.sin(phi) - 6 * (1 - Math.cos(phi));
