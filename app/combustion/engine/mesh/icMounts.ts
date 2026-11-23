// The intercoolers' mounts: each intercooler held to its bank's timing cover by two machined arms, black anodised
// aluminium, one at its high tank (from the cover's outer shoulder, by the head) and one at its low tank (from the cover's
// foot, by the crank: the two low arms make a V under the covers). Each arm lies flat in the gap between the cover's face
// and the intercooler's back; at the cover a turned spacer and a hex bolt into a boss on the cover's face, at the tank a
// rubber bush and a washer, so that the engine's shake does not reach the core. Built in the engine's frame.

import { BANKS, DRIVE_DX, bankPoint } from "../core/constants";
import { vadd, vcross, vnorm, vscale, vsub } from "../math/vec3";
import type { FwVec3 } from "./builder";
import { IC_INNER_Z, IC_OUTER_Z, IC_SCALE, IC_STAND_Y, icPlace } from "./intercooler";
import { MAT_ALU_TURNED, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_FLANGE_BLACK, MAT_IC_RUBBER } from "./materials";
import { timingCoverOutline } from "./timingCover";
import type { MeshBuilder } from "./tubes";
import { IC } from "./turbo";

const ARM_W = 16; // an arm's width
const ARM_T = 6; // and its thickness
const EYE_R = ARM_W / 2 + 1.5; // the round ends
const BOSS_IN = 20; // how far in from the cover's edge its bosses stand
const TANK_BACK = 25; // a tank's back face, out from its middle toward the engine (its half thickness, a hair under; as built)
// where along each tank (its own y, across the core's face, as built) the bush sits: clear of the hot port and the sensors
const ALONG_LOW = 52;
const ALONG_HIGH_MAX = 50;
const SENSOR_HIGH = -21;

// the bosses on a bank's cover, in the engine's frame: its outline, brought in from its edge, on its face
function coverBosses(bi: number): FwVec3[] {
  const t = timingCoverOutline();
  const n = t.outline.length;
  const cy = t.outline.reduce((s, q) => s + q[0], 0) / n;
  const cz = t.outline.reduce((s, q) => s + q[1], 0) / n;

  return t.outline.map(([y, z]) => {
    const dy = y - cy;
    const dz = z - cz;
    const l = Math.hypot(dy, dz) || 1;
    const q = bankPoint(BANKS[bi], t.xFace, y - (dy / l) * BOSS_IN, z - (dz / l) * BOSS_IN);

    return [q[0] + DRIVE_DX, q[1], q[2]] as FwVec3;
  });
}

// One arm: from the boss on the cover (`c`, on its face) to the bush on the tank (`k`, on its back face)
function arm(b: MeshBuilder, c: FwVec3, k: FwVec3) {
  const x = (c[0] + k[0]) / 2; // the arm's middle plane, in the gap between them
  const A: FwVec3 = [x, c[1], c[2]];
  const B: FwVec3 = [x, k[1], k[2]];
  const d = vnorm(vsub(B, A));
  const fwd: FwVec3 = [-1, 0, 0]; // the arm's broad face, toward the front (the intercooler's side)
  const w = vnorm(vcross(fwd, d)); // across it
  const hw = ARM_W / 2;
  const ht = ARM_T / 2;
  const P = (p: FwVec3, sw: number, st: number): FwVec3 => vadd(vadd(p, vscale(w, sw * hw)), vscale(fwd, st * ht));

  // the flat bar between its two eyes: its four long faces
  b.flatQuad(P(A, -1, 1), P(B, -1, 1), P(B, 1, 1), P(A, 1, 1), fwd, MAT_FLANGE_BLACK);
  b.flatQuad(P(A, 1, -1), P(B, 1, -1), P(B, -1, -1), P(A, -1, -1), vscale(fwd, -1), MAT_FLANGE_BLACK);
  b.flatQuad(P(A, 1, 1), P(B, 1, 1), P(B, 1, -1), P(A, 1, -1), w, MAT_FLANGE_BLACK);
  b.flatQuad(P(A, -1, -1), P(B, -1, -1), P(B, -1, 1), P(A, -1, 1), vscale(w, -1), MAT_FLANGE_BLACK);

  // its round eyes, at both ends (along the bolts' axis, the engine's length)
  const ax: FwVec3 = [-1, 0, 0];
  const e1: FwVec3 = [0, 1, 0];
  const e2: FwVec3 = [0, 0, 1];

  for (const p of [A, B]) b.prismDir(vadd(p, [ht, 0, 0]), ax, e1, e2, EYE_R, ARM_T, 32, 0, MAT_FLANGE_BLACK, MAT_FLANGE_BLACK);

  // at the cover: a boss cast on its face, a turned spacer to the arm, and the bolt's hex head on the arm's front
  b.prismDir([c[0] + 1, c[1], c[2]], ax, e1, e2, EYE_R + 2, 3, 32, 0, MAT_ALU_TURNED, MAT_ALU_TURNED);
  b.prismDir([c[0] - 2, c[1], c[2]], ax, e1, e2, 6.5, c[0] - 2 - (x + ht), 28, 0, MAT_ALU_TURNED, MAT_ALU_TURNED);
  b.prismDir([x - ht, c[1], c[2]], ax, e1, e2, 6.6, 4.2, 6, Math.PI / 6, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);

  // at the tank (in front of the arm): the rubber bush between the arm's front and the tank's back; behind the arm a
  // washer and the bolt's head
  b.prismDir([x - ht, k[1], k[2]], ax, e1, e2, 8.5, Math.max(1, x - ht - k[0]), 28, 0, MAT_IC_RUBBER, MAT_IC_RUBBER);
  b.prismDir([x + ht, k[1], k[2]], [1, 0, 0], e1, e2, 8.2, 1.2, 28, 0, MAT_ALU_TURNED, MAT_ALU_TURNED);
  b.prismDir([x + ht + 1.2, k[1], k[2]], [1, 0, 0], e1, e2, 5.8, 3.8, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
}

// Where the bush goes on a tank: on its back face, at `along` across the core's face from the tank's middle (as built:
// icPlace draws it to the intercooler's scale)
function tankPoint(zs: number, tz: number, along: number): FwVec3 {
  return icPlace(zs, [IC.x + TANK_BACK, IC_STAND_Y + along, zs * tz]);
}

export function buildIcMounts(b: MeshBuilder) {
  for (const [bi] of BANKS.entries()) {
    const zs = bi === 0 ? -1 : 1;
    const bosses = coverBosses(bi);
    const nearest = (p: FwVec3) => bosses.reduce((best, q) => (Math.hypot(q[1] - p[1], q[2] - p[2]) < Math.hypot(best[1] - p[1], best[2] - p[2]) ? q : best));

    // the high tank: its bush toward the cover's shoulder, along the tank, clear of its sensor
    {
      const mid = icPlace(zs, [IC.x, IC_STAND_Y, zs * IC_OUTER_Z]);
      const ay = vnorm(vsub(icPlace(zs, [IC.x, IC_STAND_Y + 1, zs * IC_OUTER_Z]), mid));
      const c = nearest(mid);
      let along = Math.max(-ALONG_HIGH_MAX, Math.min(ALONG_HIGH_MAX, ((c[1] - mid[1]) * ay[1] + (c[2] - mid[2]) * ay[2]) / IC_SCALE));

      if (Math.abs(along - SENSOR_HIGH) < 18) along = SENSOR_HIGH + 18 * Math.sign(along - SENSOR_HIGH || 1);

      arm(b, c, tankPoint(zs, IC_OUTER_Z, along));
    }

    // the low tank: its bush on the far side of the hot port and the sensor, to the cover's foot
    {
      const k = tankPoint(zs, IC_INNER_Z, ALONG_LOW);

      arm(b, nearest(k), k);
    }
  }
}
