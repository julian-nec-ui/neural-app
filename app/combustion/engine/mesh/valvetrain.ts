// Cam profiles, camshafts, valves, springs, seats and cam towers.

import { BORE_TOP, CAM_Y, CHAIN_X_WORLD, CRANK_Y, CT_X, TAU, driveShift } from "../core/constants";
import type { Bank } from "../core/constants";
import { normalizeCycle } from "../core/numbers";
import { createMeshBuilder } from "./builder";
import type { FwMaterial, FwVec3 } from "./builder";
import { MAT_CT_EDGE, MAT_CT_FACE, MAT_CT_FACE_PLAIN, MAT_CT_GROOVE, MAT_CT_HOLE, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_CT_SEAM, MAT_CT_SHELL, MAT_INJ_RUBBER, MAT_VT_BUCKET, MAT_VT_CAM, MAT_VT_CAM_FACE, MAT_VT_FACE, MAT_VT_GUIDE, MAT_VT_HOLE, MAT_VT_JOURNAL, MAT_VT_KEEPER, MAT_VT_LOBE, MAT_VT_RETAINER, MAT_VT_SEAT, MAT_VT_SPRING, MAT_VT_TOWER, MAT_VT_TOWER_FACE } from "./materials";

/* =========================================================
   DOHC VALVETRAIN AND TIMING CHAIN: four valves a cylinder,
   48 in all, and two chains for each bank

   Built in a bank's own frame: X along the crankshaft, Y down
   from the shaft axis, Z across the bank. Each bank's chains
   run in planes of their own, perpendicular to the shafts: the
   secondary (up to the cams) at X = VT.chainX + bank.dx, the
   primary (from the crank) just behind it (see chainPath.ts).
   ========================================================= */

// Cycle position at which each valve is at full lift (the nose points at the
// tappet). Intake opens ~19 deg before TDC and closes ~33 deg after BDC.
export const VT_LIFT_PEAK = { intake: 0.135, exhaust: 0.865 };

// Cam base circle. The tappet top sits at a fixed height, so a bigger base
// circle simply lifts the camshaft axis by the same amount.
const VT_CAM_BASE = 17;

export const VT = {
  yCam: CAM_Y - CRANK_Y - (VT_CAM_BASE - 12), // camshaft axes, above the crank axis
  zCam: 60, // each camshaft's distance from the cylinder axis
  zSeat: 32.5, // valve head distance from the cylinder axis
  xValve: 37, // half the distance between two valves of a pair
  ySeat: BORE_TOP - CRANK_Y, // chamber roof
  lift: 9, // peak valve lift
  camBase: VT_CAM_BASE,
  camNose: 6.8, // radius of the lobe's round nose
  lobeW: 10,
  stemRise: 80, // vertical distance from the seat to the tappet top
  springFree: 38,
  leftIntakeShift: 6, // the first intake valve of every cylinder sits this much further right
  chainX: CHAIN_X_WORLD, // plane of the secondary chain and the cams' sprockets, well clear of cylinder 1
};

export const VT_TILT = Math.atan2(VT.zCam - VT.zSeat, VT.stemRise);

// Which side of each head the intake valves, their camshaft and their ports are on: -1 the valley's (the cold V: the air
// comes in from the plenum on top of the V), the exhaust on the outer side, out to the turbochargers
export const IN_SIDE = -1;

/* ---------------- cam profile ---------------- */

// The lobe is a tangent cam: the base circle, a round nose of radius camNose,
// and straight flanks that run tangent to both. No corners anywhere, and the
// nose is as round as the valve timing allows. The profile as a radius at an
// angle `psi` from the nose:
const CAM_D = VT.camBase + VT.lift - VT.camNose; // axis to the nose circle's centre
const CAM_BETA = Math.acos((VT.camBase - VT.camNose) / CAM_D); // half-width of the lobe
const CAM_NOSE_END = Math.atan2(
  VT.camNose * Math.sin(CAM_BETA),
  CAM_D + VT.camNose * Math.cos(CAM_BETA)
); // polar angle where the nose arc meets the flank

const camRadius = (psi: number) => {
  const a = Math.abs(((psi + Math.PI) % TAU + TAU) % TAU - Math.PI);

  if (a >= CAM_BETA) return VT.camBase;

  if (a <= CAM_NOSE_END) {
    return CAM_D * Math.cos(a) + Math.sqrt(VT.camNose ** 2 - (CAM_D * Math.sin(a)) ** 2);
  }

  return VT.camBase / Math.cos(a - CAM_BETA);
};

const camRise = (psi: number) => camRadius(psi) - VT.camBase;

// The bucket tappet has a flat face, so it rides on the lowest point of the
// lobe, not along a ray from the cam's centre. This table holds the height a
// flat follower reaches for every angle between the follower's axis and the
// nose: the support function of the profile. The valve lift is read from it,
// which makes the tappet touch the lobe exactly, all the way round.
const CAM_TABLE_STEPS = 360;

const CAM_SUPPORT = (() => {
  const samples = 720;
  const table: number[] = [];

  for (let k = 0; k <= CAM_TABLE_STEPS; k++) {
    const dir = (k / CAM_TABLE_STEPS) * Math.PI;
    let best = 0;

    for (let j = 0; j < samples; j++) {
      const th = -Math.PI + (j / samples) * TAU;
      const r = VT.camBase + camRise(th);

      best = Math.max(best, r * Math.cos(th - dir));
    }

    table.push(best - VT.camBase);
  }

  return table;
})();

// Valve lift (vertical) at cycle position `p`, for a lobe whose nose points at
// the tappet when the cycle is at `peak`
export const camLift = (p: number, peak: number) => {
  const d = Math.abs(normalizeCycle(p - peak + 0.5) - 0.5); // 0 .. 0.5
  const x = d * 2 * CAM_TABLE_STEPS;
  const i = Math.min(CAM_TABLE_STEPS - 1, Math.floor(x));
  const f = x - i;

  return CAM_SUPPORT[i] + (CAM_SUPPORT[i + 1] - CAM_SUPPORT[i]) * f;
};

// Axial position of a valve (and of its cam lobe). sigma +1 intake, -1 exhaust
export const valveX = (cyl: number, sigma: number, sx: number) =>
  CT_X[cyl] + sx * VT.xValve + (sigma > 0 && sx < 0 ? VT.leftIntakeShift : 0);

/* ---------------- materials ---------------- */

/* ---------------- valves ---------------- */

// Local frame: origin at the valve face, the stem runs up along -Y.
export function buildValve(
  b: ReturnType<typeof createMeshBuilder>,
  rh: number,
  mHead: FwMaterial,
  mStem: FwMaterial
) {
  const seg = (
    y0: number, r0: number, y1: number, r1: number,
    n: [number, number], mat: FwMaterial
  ) => b.revolveY({ y0, r0, y1, r1, n, m: mat, steps: 40 });

  // Head: machined face, 45-degree seat, margin, tulip
  seg(0, 0, 0, rh - 1.4, [1, 0], MAT_VT_FACE);
  seg(0, rh - 1.4, -1.4, rh, [0.7, 0.7], MAT_VT_FACE);
  seg(-1.4, rh, -3.2, rh, [0, 1], mHead);
  seg(-3.2, rh, -5.8, rh * 0.55, [-0.6, 0.8], mHead);
  seg(-5.8, rh * 0.55, -9.5, 3.7, [-0.3, 0.95], mHead);
  seg(-9.5, 3.7, -13, 2.8, [-0.2, 0.98], mHead);

  // Stem, with the keeper groove
  seg(-13, 2.8, -81, 2.8, [0, 1], mStem);
  seg(-70.6, 2.84, -69.2, 2.84, [0, 1], MAT_CT_GROOVE);

  // Spring retainer and the split keepers above it
  seg(-65.5, 3.1, -65.5, 9.6, [1, 0], MAT_VT_RETAINER);
  seg(-65.5, 9.6, -62.6, 9.6, [0, 1], MAT_VT_RETAINER);
  seg(-62.6, 9.6, -62.6, 5.8, [-1, 0], MAT_VT_RETAINER);
  seg(-62.6, 5.8, -68.6, 3.6, [-0.5, 0.85], MAT_VT_KEEPER);
  seg(-68.6, 3.6, -68.6, 2.8, [-1, 0], MAT_VT_KEEPER);

  // Bucket tappet with its shim
  seg(-74.2, 10.4, -82.4, 10.4, [0, 1], MAT_VT_BUCKET);
  seg(-82.4, 10.4, -83.4, 9.4, [-0.7, 0.7], MAT_CT_EDGE);
  seg(-83.4, 9.4, -83.4, 7.2, [-1, 0], MAT_VT_BUCKET);
  seg(-83.4, 7.2, -83.8, 7.0, [-0.7, 0.7], MAT_CT_EDGE);
  seg(-83.8, 7.0, -83.8, 0, [-1, 0], MAT_VT_FACE);
  seg(-74.2, 3.2, -74.2, 10.4, [1, 0], MAT_VT_BUCKET);
}

// Static part that goes with every valve: guide boss and spring seat
export function buildValveStatic(b: ReturnType<typeof createMeshBuilder>) {
  const seg = (
    y0: number, r0: number, y1: number, r1: number,
    n: [number, number], mat: FwMaterial
  ) => b.revolveY({ y0, r0, y1, r1, n, m: mat, steps: 40 });

  // Guide boss rising out of the head, bronze guide on top
  seg(-3, 7.4, -22, 7.4, [0, 1], MAT_VT_SEAT);
  seg(-22, 7.4, -22, 6.4, [-1, 0], MAT_VT_SEAT);
  seg(-22, 6.4, -29.5, 6.4, [0, 1], MAT_VT_GUIDE);
  seg(-29.5, 6.4, -29.5, 3.0, [-1, 0], MAT_VT_GUIDE);

  // Rubber stem seal on top of the guide
  seg(-29.5, 4.7, -32.4, 4.7, [0, 1], MAT_INJ_RUBBER);
  seg(-32.4, 4.7, -33.2, 3.9, [-0.7, 0.7], MAT_INJ_RUBBER);
  seg(-33.2, 3.9, -33.2, 3.0, [-1, 0], MAT_INJ_RUBBER);

  // Spring seat washer
  seg(-27.5, 6.4, -27.5, 10.9, [-1, 0], MAT_VT_SEAT);
  seg(-27.5, 10.9, -25.5, 10.9, [0, 1], MAT_VT_SEAT);
  seg(-25.5, 10.9, -25.5, 6.4, [1, 0], MAT_VT_SEAT);
  seg(-27.5, 10.9, -26.9, 10.3, [-0.7, 0.7], MAT_CT_EDGE);
}

// Valve spring: a swept helix, origin at the seat, rising along -Y
export function buildSpring(b: ReturnType<typeof createMeshBuilder>) {
  const turns = 7;
  const rMean = 7.5;
  const wire = 1.3;
  const height = VT.springFree;
  const perTurn = 20;
  const around = 8;
  const count = turns * perTurn;

  const centre = (i: number): FwVec3 => {
    const t = i / count;
    const a = t * turns * TAU;

    // Progressive winding: the coils are closer together at the seat
    const y = height * (0.4 * t + 0.6 * t * t);

    return [rMean * Math.cos(a), -y, rMean * Math.sin(a)];
  };

  const ring = (i: number): FwVec3[] => {
    const p = centre(i);
    const q = centre(Math.min(count, i + 1));
    const o = centre(Math.max(0, i - 1));
    let tx = q[0] - o[0];
    let ty = q[1] - o[1];
    let tz = q[2] - o[2];
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl; ty /= tl; tz /= tl;

    // Normal toward the coil axis, then the binormal
    let nx = -p[0];
    let nz = -p[2];
    const nl = Math.hypot(nx, nz) || 1;
    nx /= nl; nz /= nl;
    const bx = ty * nz;
    const by = tz * nx - tx * nz;
    const bz = -ty * nx;

    const pts: FwVec3[] = [];

    for (let k = 0; k < around; k++) {
      const a = (k / around) * TAU;
      const c = Math.cos(a);
      const s = Math.sin(a);

      pts.push([
        p[0] + wire * (c * nx + s * bx),
        p[1] + wire * (s * by),
        p[2] + wire * (c * nz + s * bz),
      ]);
    }

    return pts;
  };

  let prev = ring(0);

  for (let i = 1; i <= count; i++) {
    const next = ring(i);
    const cp = centre(i - 1);

    for (let k = 0; k < around; k++) {
      const k2 = (k + 1) % around;
      const a = prev[k];
      const bb = prev[k2];
      const c = next[k2];
      const d = next[k];

      // Outward from the wire's own centre line
      const mid: FwVec3 = [
        (a[0] + bb[0] + c[0] + d[0]) / 4 - cp[0],
        (a[1] + bb[1] + c[1] + d[1]) / 4 - cp[1],
        (a[2] + bb[2] + c[2] + d[2]) / 4 - cp[2],
      ];

      b.flatQuad(a, bb, c, d, mid, MAT_VT_SPRING);
    }

    prev = next;
  }
}

/* ---------------- camshafts ---------------- */

const lobeRadius = (psi: number) => VT.camBase + camRise(psi);

const VT_CAM_FRONT = VT.chainX - 24;
const VT_CAM_REAR = CT_X[CT_X.length - 1] + 100;

// Bearing positions along the cam: the front, between cylinders, the rear
const VT_BEARINGS = [CT_X[0] - 75, ...CT_X.slice(0, -1).map((x, i) => (x + CT_X[i + 1]) / 2), CT_X[CT_X.length - 1] + 75];

// A camshaft, made for a bank: its lobes follow that bank's sense of turn and its cylinders' phases
export function buildCam(
  b: ReturnType<typeof createMeshBuilder>,
  peak: number,
  sigma: number,
  bank: Bank
) {
  const cyl = (x0: number, x1: number, r: number, m: FwMaterial) =>
    b.revolve({ x0, r0: r, x1, r1: r, n: [0, 1], m, steps: 48 });

  const face = (x: number, r0: number, r1: number, m: FwMaterial) =>
    b.revolve({ x0: x, r0, x1: x, r1, n: [1, 0], m, steps: 48 });

  // the front of the shaft follows the bank's timing drive, which may stand back from its cylinders (driveShift)
  const sh = driveShift(bank);
  const camFront = VT_CAM_FRONT + sh;
  const flange = VT.chainX + sh;

  // Shaft, with the front flange for the sprocket and a rear end
  cyl(camFront, VT_CAM_REAR, 10.4, MAT_VT_CAM);
  cyl(flange - 5, flange + 1, 19, MAT_VT_CAM);
  face(flange + 1, 10.4, 17.8, MAT_VT_CAM_FACE);
  b.revolve({ x0: flange - 5, r0: 10.4, x1: flange - 5, r1: 17.8, n: [-1, 0], m: MAT_VT_CAM_FACE, steps: 48 });
  b.revolve({ x0: flange - 4.2, r0: 19, x1: flange - 5, r1: 18.2, n: [-0.7, 0.7], m: MAT_CT_EDGE, steps: 48 });
  b.revolve({ x0: flange + 0.2, r0: 19, x1: flange + 1, r1: 18.2, n: [0.7, 0.7], m: MAT_CT_EDGE, steps: 48 });
  cyl(VT_CAM_REAR - 8, VT_CAM_REAR, 13.5, MAT_VT_CAM);
  face(VT_CAM_REAR, 0, 13.5, MAT_VT_CAM_FACE);
  b.disc(VT_CAM_REAR + 0.05, 0, 0, 4.2, MAT_VT_HOLE, 14);

  // The front end of the shaft, with its bolt and washer
  b.disc(camFront, 0, 0, 10.4, MAT_VT_CAM_FACE, 32, 0, 0, -1);
  b.prismDir([camFront, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], 8.2, 1.2, 28, 0, MAT_CT_FACE_PLAIN, MAT_CT_FACE);
  b.prismDir([camFront - 1.2, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], 5.2, 4.4, 6, 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);

  // Bearing journals with an oil groove each
  for (const xb of VT_BEARINGS) {
    cyl(xb - 8, xb + 8, 12, MAT_VT_JOURNAL);
    face(xb + 8, 10.4, 12, MAT_VT_CAM_FACE);
    b.revolve({ x0: xb - 1.2, r0: 12.04, x1: xb + 1.2, r1: 12.04, n: [0, 1], m: MAT_CT_GROOVE, steps: 48, from: -1.5, to: 1.5 });
    b.radialDisc(xb + 4, 0, 0, 12.03, 2.0, 1.6, MAT_VT_HOLE, 10);
  }

  // Lobes: nose angle chosen so the nose points straight down (at the
  // bucket) exactly when the valve of that cylinder is at full lift
  for (let i = 0; i < CT_X.length; i++) {
    const nu = bank.dir * TAU * normalizeCycle(peak - bank.phase[i]);

    for (const sx of [-1, 1]) {
      const xc = valveX(i, sigma, sx);
      const n = 192;
      const bevel = 0.9; // the lobe's edges are chamfered, front and back
      const pts: Array<[number, number]> = [];

      for (let k = 0; k < n; k++) {
        const t = (k / n) * TAU;
        const r = lobeRadius(t - nu);
        pts.push([r * Math.cos(t), r * Math.sin(t)]);
      }

      // The outline pulled in a little: the flat of the face stops there
      const inner = pts.map(([y, z]): [number, number] => {
        const len = Math.hypot(y, z);
        const s = (len - bevel) / len;

        return [y * s, z * s];
      });

      const x1 = xc + VT.lobeW / 2;
      const x0 = xc - VT.lobeW / 2;

      // Smooth normals round the outline
      const normals = pts.map((_, k): [number, number] => {
        const a = pts[(k - 1 + n) % n];
        const c = pts[(k + 1) % n];
        const ty = c[0] - a[0];
        const tz = c[1] - a[1];
        const len = Math.hypot(ty, tz) || 1;

        return [tz / len, -ty / len];
      });

      // Both faces, flat, inside the bevel
      b.flatFan([x1, 0, 0], inner.map(([y, z]): FwVec3 => [x1, y, z]), [1, 0, 0], MAT_VT_LOBE);
      b.flatFan([x0, 0, 0], inner.map(([y, z]): FwVec3 => [x0, y, z]), [-1, 0, 0], MAT_VT_LOBE);

      for (let k = 0; k < n; k++) {
        const k2 = (k + 1) % n;

        // The bevels: from the outline, a little way in, to the inner edge
        b.flatQuad(
          [x1 - bevel, pts[k][0], pts[k][1]], [x1 - bevel, pts[k2][0], pts[k2][1]],
          [x1, inner[k2][0], inner[k2][1]], [x1, inner[k][0], inner[k][1]],
          [0.7, 0.7 * normals[k][0], 0.7 * normals[k][1]], MAT_CT_EDGE
        );

        b.flatQuad(
          [x0 + bevel, pts[k][0], pts[k][1]], [x0 + bevel, pts[k2][0], pts[k2][1]],
          [x0, inner[k2][0], inner[k2][1]], [x0, inner[k][0], inner[k][1]],
          [-0.7, 0.7 * normals[k][0], 0.7 * normals[k][1]], MAT_CT_EDGE
        );

        // The working surface, polished, between the two bevels
        const a: FwVec3 = [x0 + bevel, pts[k][0], pts[k][1]];
        const bb: FwVec3 = [x0 + bevel, pts[k2][0], pts[k2][1]];
        const c: FwVec3 = [x1 - bevel, pts[k2][0], pts[k2][1]];
        const d: FwVec3 = [x1 - bevel, pts[k][0], pts[k][1]];
        const nk: FwVec3 = [0, normals[k][0], normals[k][1]];
        const nk2: FwVec3 = [0, normals[k2][0], normals[k2][1]];

        b.push(a, nk, MAT_VT_LOBE, 1);
        b.push(bb, nk2, MAT_VT_LOBE, 1);
        b.push(c, nk2, MAT_VT_LOBE, 1);

        b.push(a, nk, MAT_VT_LOBE, 1);
        b.push(c, nk2, MAT_VT_LOBE, 1);
        b.push(d, nk, MAT_VT_LOBE, 1);
      }

      // Machined ring round the base circle, on both faces
      b.revolve({ x0: x1 + 0.03, r0: 10.6, x1: x1 + 0.03, r1: VT.camBase - 0.5, n: [1, 0], m: MAT_VT_CAM_FACE, steps: 48 });
      b.revolve({ x0: x0 - 0.03, r0: 10.6, x1: x0 - 0.03, r1: VT.camBase - 0.5, n: [-1, 0], m: MAT_VT_CAM_FACE, steps: 48 });
    }
  }
}

/* ---------------- cam towers (static) ---------------- */

export function buildTowers(b: ReturnType<typeof createMeshBuilder>) {
  const upper = { from: Math.PI / 2, to: (3 * Math.PI) / 2 }; // y < 0, above the cam
  const yFloor = BORE_TOP - 22 - CRANK_Y; // top of the head casting

  for (const side of [-1, 1]) {
    const zc = side * VT.zCam;

    for (const xb of VT_BEARINGS) {
      const ht = 9;

      // Cap: half ring over the journal, with its bolt lugs and bolts
      b.revolve({ x0: xb + ht, r0: 12.3, x1: xb - ht, r1: 12.3, n: [0, -1], m: MAT_VT_TOWER, cy: VT.yCam, cz: zc, steps: 48, ...upper });
      b.revolve({ x0: xb + ht, r0: 12.3, x1: xb - ht, r1: 21, n: [0, 1], m: MAT_VT_TOWER, cy: VT.yCam, cz: zc, steps: 48, ...upper });
      b.revolve({ x0: xb + ht, r0: 12.3, x1: xb + ht, r1: 21, n: [1, 0], m: MAT_VT_TOWER_FACE, cy: VT.yCam, cz: zc, steps: 48, ...upper });
      b.revolve({ x0: xb + ht, r0: 20, x1: xb + ht, r1: 21, n: [1, 0], m: MAT_CT_EDGE, cy: VT.yCam, cz: zc, steps: 48, ...upper });
      b.revolve({ x0: xb - ht, r0: 12.3, x1: xb - ht, r1: 21, n: [-1, 0], m: MAT_VT_TOWER_FACE, cy: VT.yCam, cz: zc, steps: 48, ...upper });
      b.revolve({ x0: xb - ht, r0: 20, x1: xb - ht, r1: 21, n: [-1, 0], m: MAT_CT_EDGE, cy: VT.yCam, cz: zc, steps: 48, ...upper });

      for (const lug of [-1, 1]) {
        const zl = zc + lug * 25;

        b.box(xb - ht, xb + ht, VT.yCam - 11, VT.yCam + 1, zl - 6, zl + 6, MAT_VT_TOWER);
        b.prismDir([xb, VT.yCam - 11, zl], [0, -1, 0], [1, 0, 0], [0, 0, 1], 4.6, 3.6, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
      }

      // Lower saddle: a column down to the head, with a half-round bronze
      // seat for the journal
      b.box(xb - ht, xb + ht, VT.yCam, yFloor, zc - 14, zc - 12.3, MAT_VT_TOWER);
      b.box(xb - ht, xb + ht, VT.yCam, yFloor, zc + 12.3, zc + 14, MAT_VT_TOWER);
      b.box(xb - ht, xb + ht, VT.yCam + 12.3, yFloor, zc - 12.3, zc + 12.3, MAT_VT_TOWER);
      b.box(xb + ht - 0.05, xb + ht, VT.yCam + 12.3, yFloor, zc - 14, zc + 14, MAT_VT_TOWER_FACE);
      b.box(xb - ht, xb - ht + 0.05, VT.yCam + 12.3, yFloor, zc - 14, zc + 14, MAT_VT_TOWER_FACE);
      b.revolve({ x0: xb + ht, r0: 12.3, x1: xb - ht, r1: 12.3, n: [0, -1], m: MAT_CT_SHELL, cy: VT.yCam, cz: zc, steps: 48, from: -Math.PI / 2, to: Math.PI / 2 });
      b.revolve({ x0: xb + ht + 0.05, r0: 12.3, x1: xb + ht + 0.05, r1: 14.2, n: [1, 0], m: MAT_CT_SHELL, cy: VT.yCam, cz: zc, steps: 48, from: -Math.PI / 2, to: Math.PI / 2 });
      b.revolve({ x0: xb - ht - 0.05, r0: 12.3, x1: xb - ht - 0.05, r1: 14.2, n: [-1, 0], m: MAT_CT_SHELL, cy: VT.yCam, cz: zc, steps: 48, from: -Math.PI / 2, to: Math.PI / 2 });
    }
  }
}

/* ---------------- valve seats in the cylinder head ---------------- */

// The cut in the chamber roof for a valve: a round recess the valve head sits in,
// with a dark wall; round it a ring of hard steel pressed into the head, whose
// face stands a hair proud of the roof, and which has a ring of staking notches
// where the metal was driven over its edge; and, up inside the recess, the seat
// cone the valve closes against, then the throat of the port.
//
// Local frame: origin at the valve's face when it is shut, Y down into the chamber,
// like the valves themselves. It is not tilted: the roof is flat.
export function buildValveSeat(b: ReturnType<typeof createMeshBuilder>, rh: number) {
  const seg = (
    y0: number, r0: number, y1: number, r1: number,
    n: [number, number], mat: FwMaterial, steps = 56
  ) => b.revolveY({ y0, r0, y1, r1, n, m: mat, steps });

  const lip = 0.65; // how far the ring stands out of the roof
  const recess = rh + 1.4; // radius of the recess round the valve head
  const ringOut = rh + 5.6; // the ring's outer radius

  // The pressed-in ring: its face, a chamfer on its outer edge, and the thin dark
  // line of the counterbore it sits in
  seg(lip, recess, lip, ringOut - 0.7, [1, 0], MAT_VT_SEAT);
  seg(lip, ringOut - 0.7, 0, ringOut, [0.7, 0.7], MAT_CT_EDGE);
  seg(0, ringOut, 0, ringOut + 0.9, [1, 0], MAT_CT_GROOVE);

  // A chamfer where the ring meets the recess, bright
  seg(lip, recess + 0.7, lip - 0.5, recess, [0.7, -0.7], MAT_CT_EDGE);

  // The recess: a dark wall all round the valve head
  seg(lip - 0.5, recess, -3.0, recess, [0, -1], MAT_CT_GROOVE);

  // The shelf at the top of the recess, and the seat cone the valve closes against:
  // it is on the valve's own bevel, a hair outside it, so that it shows when the
  // valve opens
  seg(-3.0, recess, -3.2, rh + 0.15, [1, 0], MAT_VT_SEAT);
  seg(-3.2, rh + 0.15, -5.8, rh * 0.55 + 0.15, [0.6, -0.8], MAT_VT_FACE);

  // The throat of the port, going on up into the head, dark
  seg(-5.8, rh * 0.55 + 0.15, -12, rh * 0.42, [0, -1], MAT_CT_HOLE);

  // Staking marks: where the head's metal was driven over the ring's edge. Sixteen chisel
  // marks, each a small dark wedge pointing out, standing in a raised bead of the pushed
  // metal, and a bright bump between each pair, all in real relief
  const notches = 16;

  for (let k = 0; k < notches; k++) {
    const a = ((k + 0.5) / notches) * TAU;
    const r = ringOut - 1.9;

    for (const da of [-0.05, 0.05]) {
      const t = a + da;
      const at: FwVec3 = [r * Math.cos(t), lip, r * Math.sin(t)];
      const e1: FwVec3 = [Math.cos(t), 0, Math.sin(t)];
      const e2: FwVec3 = [-Math.sin(t), 0, Math.cos(t)];

      // the bead
      b.prismDir(at, [0, 1, 0], e1, e2, 1.15, 0.38, 12, 0, MAT_CT_EDGE, MAT_VT_SEAT);
      // the chisel's wedge, on top of it
      b.prismDir([at[0], lip + 0.38, at[2]], [0, 1, 0], e1, e2, 0.85, 0.3, 3, t, MAT_CT_SEAM, MAT_CT_SEAM);
    }

    // the bump between the pair
    const mid: FwVec3 = [r * Math.cos(a), lip, r * Math.sin(a)];

    b.prismDir(mid, [0, 1, 0], [Math.cos(a), 0, Math.sin(a)], [-Math.sin(a), 0, Math.cos(a)], 0.7, 0.5, 12, 0, MAT_CT_NUT_HEAD, MAT_VT_SEAT);
  }

  // Two shallow flow cuts, scooped into the ring on the side toward the cylinder's
  // axis: the dark crescent a head has where the ring is relieved for the gas
  for (const side of [-1, 1]) {
    const a0 = Math.PI / 2 + side * 0.62;
    const pts: FwVec3[] = [];

    for (let k = 0; k <= 10; k++) {
      const t = a0 - 0.32 + (0.64 * k) / 10;

      pts.push([(rh + 2.4) * Math.cos(t), lip + 0.05, (rh + 2.4) * Math.sin(t)]);
    }

    for (let k = 10; k >= 0; k--) {
      const t = a0 - 0.32 + (0.64 * k) / 10;

      pts.push([(rh + 4.4) * Math.cos(t), lip + 0.05, (rh + 4.4) * Math.sin(t)]);
    }

    b.flatFan([(rh + 3.4) * Math.cos(a0), lip + 0.05, (rh + 3.4) * Math.sin(a0)], pts, [0, 1, 0], MAT_CT_SEAM);
  }
}
