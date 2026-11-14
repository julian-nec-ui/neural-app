// The cylinder heads: deck, see-through casting, cover and the hardware on them.

import { BORE_R, CT_X, HEAD_HALF_W, PLUG, ROD_LIFT, TAU } from "../core/constants";
import { createMeshBuilder } from "./builder";
import type { FwMaterial, FwVec3 } from "./builder";
import { MAT_CT_GROOVE, MAT_CT_HOLE, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_DECK, MAT_DECK_EDGE, MAT_DECK_RIM, MAT_HEAD_BOOT, MAT_HEAD_BRASS, MAT_HEAD_CAST, MAT_HEAD_CAST_DEEP, MAT_HEAD_MACHINED, MAT_PERF_PLATE, MAT_PERF_RIVET_HEAD, MAT_PERF_RIVET_SIDE, MAT_PLUG_CAP, PLATE_BARS , MAT_BOLT_MATTE_HEAD, MAT_BOLT_MATTE_SIDE, MAT_HEAD_JOINT} from "./materials";
import { collar, curveFromPoints } from "./tubes";
import { planBand, planCap, planWalls, roundedPlan } from "./shapes";
import type { MeshBuilder } from "./tubes";
import { PORT_Y } from "./turbo";
import { VT } from "./valvetrain";

/* ---------------- head deck and cylinder flanges ---------------- */

// The deck of the head is the plate the valve guides, the spark plugs and the
// injectors stand on, the whole length of the bank. Its casting is drawn see-
// through, as a ghost: the combustion chambers, the valve stems, the plugs and
// the injectors can be seen inside it, and the flame from above. Its machined
// edges and the head bolts round each bore are solid.
const DECK_BOX = {
  x0: CT_X[0] - 112,
  x1: CT_X[CT_X.length - 1] + 112,
  zh: HEAD_HALF_W, // as drawn; the heads are built widened by HEAD_WIDEN (core/constants.ts)
};

// The head's ends are rounded in plan, at its four upright corners, by as much as the block's ends are filleted, so that
// the head's corners run on down into the block's
export const HEAD_END_R = 12;
const END_STEPS = 6;

// `shift`: how far the head is moved back along its bank from where its cylinders alone would put it (driveShift), so
// that the two banks' heads stand at the same place and are of one length
export function buildDeckSlab(b: ReturnType<typeof createMeshBuilder>, shift = 0) {
  const plan = roundedPlan(DECK_BOX.x0 + shift, DECK_BOX.x1 + shift, DECK_BOX.zh, HEAD_END_R);

  planWalls(b, plan, 0, VT.ySeat - 22, VT.ySeat, MAT_DECK);
  planCap(b, plan, 0, VT.ySeat - 22, -1, MAT_DECK);
  planCap(b, plan, 0, VT.ySeat, 1, MAT_DECK);
}

export function buildDeck(b: ReturnType<typeof createMeshBuilder>, shift = 0) {
  const yTop = VT.ySeat - 22;
  const { zh } = DECK_BOX;
  const x0 = DECK_BOX.x0 + shift;
  const x1 = DECK_BOX.x1 + shift;
  const e = 1.8;

  // Machined edges along the top, a hair proud of the casting, round its rounded corners
  planBand(b, roundedPlan(x0, x1, zh, HEAD_END_R), -e, 0, yTop - 0.4, yTop, MAT_DECK_EDGE);

  // Six head bolts round every bore: a washer and a hex head
  for (const cx of CT_X) {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + 0.26;
      const at = (dy: number): FwVec3 => [cx + 76 * Math.cos(a), yTop - dy, 76 * Math.sin(a)];

      b.prismDir(at(0), [0, -1, 0], [1, 0, 0], [0, 0, 1], 8.6, 1.4, 24, 0, MAT_DECK_EDGE, MAT_CT_NUT_SIDE);
      b.prismDir(at(1.4), [0, -1, 0], [1, 0, 0], [0, 0, 1], 6.3, 6.5, 6, a, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
    }
  }
}

// The flange at the foot of a cylinder's glass sleeve (origin at the sleeve's
// lower end): the ring that closes the bank at the bottom
export function buildLinerRim(b: ReturnType<typeof createMeshBuilder>) {
  const seg = (
    y0: number, r0: number, y1: number, r1: number,
    n: [number, number], m: FwMaterial
  ) => b.revolveY({ y0, r0, y1, r1, n, m, steps: 72 });

  // the ring marks the bore itself: its inside is the bore, the piston's own size; it is narrow, so as not to reach across
  // the V's middle into the other bank's
  const rIn = BORE_R;
  const rOut = BORE_R + 3.5;

  seg(0, rIn, 0, rOut, [1, 0], MAT_DECK_RIM); // underside
  seg(0, rOut, -8, rOut, [0, 1], MAT_DECK_RIM); // outer wall
  seg(-8, rOut, -8, rIn, [-1, 0], MAT_DECK_RIM); // top face
  seg(-8, rOut - 1.6, -9.2, rOut - 3, [-0.7, 0.7], MAT_DECK_EDGE); // a machined chamfer on top
  seg(-3.8, rOut + 0.03, -4.6, rOut + 0.03, [0, 1], MAT_CT_GROOVE); // a groove round the flange

  // Bolts round the flange
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU + 0.13;

    b.prismDir(
      [(rIn + rOut) / 2 * Math.cos(a), -8, (rIn + rOut) / 2 * Math.sin(a)],
      [0, -1, 0], [1, 0, 0], [0, 0, 1], 1.4, 1.4, 6, a, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE
    );
  }
}
/* ---------------- the cylinder head: a rough red casting, seen through ---------------- */

// The head is a metallic red casting with the rough skin of sand casting. It is drawn see-through, so
// that the valves, the springs, the cams, the plugs and the injectors can be seen working inside it. It
// has two parts: the shell, which is see-through, and the hardware, which is solid.
//
// The shell is the lower casting, from the deck plate up to the joint, with its ribs; the cover over the
// cams, from the joint up, with its ribs; and a tube round each spark plug.
// The hardware is the machined flange at the joint with its bolts, the machined faces where the intake
// and exhaust ports are, the core plugs, the seals where the camshafts go through the ends, the plug
// boots, the oil filler cap, the breather and the plate.
//
// The roughness of the skin is in the shader (surface pattern 7), not in the mesh: it costs nothing.


export const HEAD = {
  x0: DECK_BOX.x0,
  x1: DECK_BOX.x1,
  zh: DECK_BOX.zh, // the faces where the ports are
  yDeck: VT.ySeat - 22, // the top of the deck plate: the lower casting stands on it
  yJoint: -361 - ROD_LIFT, // the joint between the casting and the cover
  yTop: -402 - ROD_LIFT, // the top of the cover
  inset: 5, // the cover is set in from the casting's ends
};

// The cover's section, across the engine: one half, from the joint upward and inward. [z, y]. It rises from the joint
// in one long, smooth curve (a superellipse, fuller than a circle) to a flat top just wide enough for the plates and the
// lettering: no straight side, no tight corner
const COVER_HALF: Array<[number, number]> = (() => {
  const zSide = 92; // at the joint
  const zFlat = 54; // where the top's flat begins
  const height = HEAD.yTop - HEAD.yJoint; // negative: upward
  const n = 2.6; // the curve's fullness: 2 is a quarter circle, more is squarer
  const pts: Array<[number, number]> = [];

  for (let k = 0; k <= 14; k++) {
    const t = (k / 14) * (Math.PI / 2);
    const c = Math.cos(t);
    const s = Math.sin(t);

    pts.push([zFlat + (zSide - zFlat) * Math.pow(c, 2 / n), HEAD.yJoint + height * Math.pow(s, 2 / n)]);
  }

  return pts;
})();

// The mid-points between the cylinders: where the casting has its ribs
const HEAD_RIBS_X = CT_X.slice(0, -1).map((x, i) => (x + CT_X[i + 1]) / 2);

// Run the build function with everything it builds moved by (x, y, z), for placing parts built at the origin
function placed(b: MeshBuilder, x: number, y: number, z: number, build: () => void) {
  b.setTurn((p, n) => [[p[0] + x, p[1] + y, p[2] + z], n]);
  build();
  b.setTurn(null);
}

// A stadium's outline (two straight runs and two half circles), n points, by length along it
function stadiumPoints(half: number, r: number, n: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const run = 2 * half;
  const arc = Math.PI * r;
  const total = 2 * run + 2 * arc;

  for (let k = 0; k < n; k++) {
    let d = (k / n) * total;

    if (d < run) {
      pts.push([-half + d, -r]);
      continue;
    }

    d -= run;

    if (d < arc) {
      const a = -Math.PI / 2 + d / r;

      pts.push([half + r * Math.cos(a), r * Math.sin(a)]);
      continue;
    }

    d -= arc;

    if (d < run) {
      pts.push([half - d, r]);
      continue;
    }

    d -= run;

    const a = Math.PI / 2 + d / r;

    pts.push([-half + r * Math.cos(a), r * Math.sin(a)]);
  }

  return pts;
}

/* ---- the shell: see-through ---- */

export function buildHeadShell(b: MeshBuilder, shift = 0) {
  const { zh, yDeck, yJoint, yTop, inset } = HEAD;
  const x0 = HEAD.x0 + shift;
  const x1 = HEAD.x1 + shift;

  // ---- the lower casting: its walls from the deck plate to the joint, its upright corners rounded ----
  planWalls(b, roundedPlan(x0, x1, zh, HEAD_END_R), 0, yDeck, yJoint, MAT_HEAD_CAST);

  // Ribs on the two long walls, between the cylinders, and a belt round the middle
  for (const side of [-1, 1]) {
    const z0 = side * zh;
    const z1 = side * (zh + 3.4);

    for (const xm of HEAD_RIBS_X) {
      b.box(xm - 3, xm + 3, yJoint + 4, yDeck - 3, Math.min(z0, z1), Math.max(z0, z1), MAT_HEAD_CAST);
      // and on up the cover's wall
      b.box(xm - 3, xm + 3, -372 - ROD_LIFT, yJoint, side * 92 - (side < 0 ? 3.2 : 0), side * 92 + (side > 0 ? 3.2 : 0), MAT_HEAD_CAST);
    }

    // a bead along the wall, level with the springs
    b.box(x0 + HEAD_END_R, x1 - HEAD_END_R, -338 - ROD_LIFT, -334 - ROD_LIFT, Math.min(z0, z1 - side * 1.2), Math.max(z0, z1 - side * 1.2), MAT_HEAD_CAST);
  }

  // Ribs on the two ends
  for (const end of [-1, 1]) {
    const xe = end < 0 ? x0 : x1;
    const xo = xe + end * 3.4;

    for (const zr of [-52, 0, 52]) {
      b.box(Math.min(xe, xo), Math.max(xe, xo), yJoint + 4, yDeck - 3, zr - 3, zr + 3, MAT_HEAD_CAST);
    }
  }

  // ---- the cover: its section run along the engine, its ends closed and rounded into the cover ----
  const xa = x0 + inset;
  const xb = x1 - inset;
  const ring: Array<[number, number]> = [];

  for (const q of [
    ...COVER_HALF.map(([z, y]) => [-z, y] as [number, number]),
    ...COVER_HALF.slice().reverse().map(([z, y]) => [z, y] as [number, number]),
  ]) {
    const last = ring[ring.length - 1];

    if (!last || Math.hypot(last[0] - q[0], last[1] - q[1]) > 1e-6) ring.push(q);
  }

  // each point's outward normal (z, y): smooth along the section; at its two feet, on the joint, straight out sideways
  const yMid = (yJoint + yTop) / 2;
  const ringN: Array<[number, number]> = ring.map(([z, y], k) => {
    if (k === 0) return [-1, 0];
    if (k === ring.length - 1) return [1, 0];

    const [za, ya] = ring[k - 1];
    const [zb, yb] = ring[k + 1];
    let nz = yb - ya;
    let ny = -(zb - za);

    if (nz * z + ny * (y - yMid) < 0) {
      nz = -nz;
      ny = -ny;
    }

    const l = Math.hypot(nz, ny) || 1;

    return [nz / l, ny / l];
  });
  const COVER_R = 9; // the round of the cover's ends
  const coverRings: Array<{ x: number; d: number; lean: number }> = [];

  for (let k = END_STEPS; k >= 0; k--) {
    const th = (k / END_STEPS) * (Math.PI / 2);

    coverRings.push({ x: xa + COVER_R - COVER_R * Math.sin(th), d: COVER_R * (1 - Math.cos(th)), lean: -Math.sin(th) });
  }

  for (let k = 0; k <= END_STEPS; k++) {
    const th = (k / END_STEPS) * (Math.PI / 2);

    coverRings.push({ x: xb - COVER_R + COVER_R * Math.sin(th), d: COVER_R * (1 - Math.cos(th)), lean: Math.sin(th) });
  }

  const cAt = (k: number, r: { x: number; d: number }): FwVec3 => [r.x, ring[k][1] - ringN[k][1] * r.d, ring[k][0] - ringN[k][0] * r.d];
  const cN = (k: number, lean: number): FwVec3 => {
    const c = Math.sqrt(Math.max(0, 1 - lean * lean));

    return [lean, ringN[k][1] * c, ringN[k][0] * c];
  };

  for (let r = 0; r + 1 < coverRings.length; r++) {
    const A = coverRings[r];
    const B = coverRings[r + 1];

    for (let k = 0; k + 1 < ring.length; k++) {
      b.push(cAt(k, A), cN(k, A.lean), MAT_HEAD_CAST, 1);
      b.push(cAt(k + 1, A), cN(k + 1, A.lean), MAT_HEAD_CAST, 1);
      b.push(cAt(k + 1, B), cN(k + 1, B.lean), MAT_HEAD_CAST, 1);
      b.push(cAt(k, A), cN(k, A.lean), MAT_HEAD_CAST, 1);
      b.push(cAt(k + 1, B), cN(k + 1, B.lean), MAT_HEAD_CAST, 1);
      b.push(cAt(k, B), cN(k, B.lean), MAT_HEAD_CAST, 1);
    }
  }

  // the two ends of the cover, flat inside their round
  for (const [xe, end] of [[xa, -1], [xb, 1]] as Array<[number, number]>) {
    const fan: FwVec3[] = ring.map((_, k) => cAt(k, { x: xe, d: COVER_R }));

    b.flatFan([xe, yMid, 0], fan, [end, 0, 0], MAT_HEAD_CAST);
  }

  // Ribs along the edges of the top (the ones across it, between the first two cylinders and the last two, gave way to the
  // perforated plates, perfPlate)
  for (const zr of [-62, 62]) {
    b.box(xa + 14, xb - 14, yTop - 2.6, yTop, zr - 1.6, zr + 1.6, MAT_HEAD_CAST);
  }

  b.box(xa + 14, xa + 20, yTop - 2.6, yTop, -62, 62, MAT_HEAD_CAST);
  b.box(xb - 20, xb - 14, yTop - 2.6, yTop, -62, 62, MAT_HEAD_CAST);

  // ---- a tube round each spark plug, from the deck plate up through the cover ----
  for (const cx of CT_X) {
    placed(b, cx + PLUG.x, 0, PLUG.z, () => {
      b.revolveY({ y0: yDeck, r0: 13.8, y1: yTop, r1: 13.8, n: [0, 1], m: MAT_HEAD_CAST_DEEP, steps: 32 });
    });
  }
}

/* ---- the hardware: solid ---- */

export function buildHeadSolid(b: MeshBuilder, shift = 0) {
  const { zh, yDeck, yJoint, inset } = HEAD;
  const x0 = HEAD.x0 + shift;
  const x1 = HEAD.x1 + shift;

  // ---- the machined flange at the joint, all the way round, with a bolt every so often ----
  const fl = 100.5;

  // round the casting's rounded outline, from inside its wall to out past it; across the two ends it is open where the
  // camshafts come through
  planBand(b, roundedPlan(x0, x1, zh, HEAD_END_R, [-82, -38, 38, 82]), 90 - zh, fl - zh, yJoint - 6, yJoint, MAT_HEAD_JOINT, (q) =>
    Math.abs(q.nx) > 0.99 && Math.abs(q.z) > 38 && Math.abs(q.z) < 82
  );

  // a fine step where the cover meets it: a black gasket line
  for (const side of [-1, 1]) {
    b.box(x0 + inset - 1, x1 - inset + 1, yJoint - 0.9, yJoint, Math.min(side * 90.2, side * 92.6), Math.max(side * 90.2, side * 92.6), MAT_HEAD_BOOT);
  }

  const bolt = (x: number, z: number) => {
    b.prismDir([x, yJoint - 6, z], [0, -1, 0], [1, 0, 0], [0, 0, 1], 6.6, 1.4, 24, 0, MAT_BOLT_MATTE_SIDE, MAT_BOLT_MATTE_SIDE);
    b.prismDir([x, yJoint - 7.4, z], [0, -1, 0], [1, 0, 0], [0, 0, 1], 4.9, 5.2, 6, 0.3, MAT_BOLT_MATTE_HEAD, MAT_BOLT_MATTE_SIDE); // (dark, matte)
  };

  const along = 15;

  for (let k = 0; k < along; k++) {
    const x = x0 + 14 + ((x1 - x0 - 28) * k) / (along - 1);

    bolt(x, -95.8);
    bolt(x, 95.8);
  }

  // and on the ends: one in the middle, one on each rounded corner
  const rb = HEAD_END_R - 0.75;
  const cz = zh - HEAD_END_R;

  for (const [xe, sx] of [[x0, -1], [x1, 1]] as Array<[number, number]>) {
    bolt(xe, 0);

    for (const sz of [-1, 1]) bolt(xe - sx * HEAD_END_R + sx * rb * Math.SQRT1_2, sz * (cz + rb * Math.SQRT1_2));
  }

  // ---- the machined faces where the ports are: a rim of bright metal round each port, flush with the wall ----
  const outline = stadiumPoints(21, 19.5, 56);
  const mouth = stadiumPoints(17, 11, 56);

  for (const side of [-1, 1]) {
    const z = side * (zh + 0.45);

    for (const cx of CT_X) {
      for (let k = 0; k < outline.length; k++) {
        const k2 = (k + 1) % outline.length;
        const o0 = outline[k];
        const o1 = outline[k2];
        const m0 = mouth[k];
        const m1 = mouth[k2];

        b.flatQuad(
          [cx + o0[0], PORT_Y + o0[1], z], [cx + o1[0], PORT_Y + o1[1], z],
          [cx + m1[0], PORT_Y + m1[1], z], [cx + m0[0], PORT_Y + m0[1], z],
          [0, 0, side], MAT_HEAD_MACHINED
        );
        // the port itself, dark
        b.flatQuad(
          [cx + m0[0], PORT_Y + m0[1], z], [cx + m1[0], PORT_Y + m1[1], z],
          [cx + m1[0] * 0.5, PORT_Y + m1[1] * 0.5, z - side * 0.1], [cx + m0[0] * 0.5, PORT_Y + m0[1] * 0.5, z - side * 0.1],
          [0, 0, side], MAT_CT_HOLE
        );
      }

      // stud holes either side
      for (const sx of [-1, 1]) {
        b.prismDir([cx + sx * 33, PORT_Y, z], [0, 0, side], [1, 0, 0], [0, 1, 0], 3.4, 0.2, 14, 0, MAT_CT_HOLE, MAT_CT_HOLE);
      }
    }
  }

  // ---- core plugs, in the walls: brass discs with a dimple ----
  // a plug in a wall whose outward direction is `dir`; u and v lie in the wall
  const plugAt = (at: FwVec3, dir: FwVec3, u: FwVec3, v: FwVec3) => {
    const p = (k: number): FwVec3 => [at[0] + dir[0] * k, at[1] + dir[1] * k, at[2] + dir[2] * k];

    b.prismDir(p(-0.4), dir, u, v, 10, 2.1, 24, 0, MAT_HEAD_BRASS, MAT_HEAD_BRASS);
    b.prismDir(p(1.7), dir, u, v, 7.2, 0.5, 24, 0, MAT_CT_HOLE, MAT_HEAD_BRASS);
    b.prismDir(p(2.0), dir, u, v, 2.4, 0.4, 12, 0, MAT_HEAD_BRASS, MAT_HEAD_BRASS);
  };

  for (const xm of [CT_X[0] - 70, ...HEAD_RIBS_X, CT_X[CT_X.length - 1] + 70]) {
    plugAt([xm - 24, -322 - ROD_LIFT, zh], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    plugAt([xm + 24, -322 - ROD_LIFT, -zh], [0, 0, -1], [1, 0, 0], [0, 1, 0]);
  }

  for (const z of [-48, 48]) {
    plugAt([x1, -322 - ROD_LIFT, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    plugAt([x0, -322 - ROD_LIFT, z], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
  }

  // ---- the camshafts leave through the chain end: a seal housing round each, with a black lip ----
  for (const z of [-VT.zCam, VT.zCam]) {
    const stub = curveFromPoints([[x0 + 1, VT.yCam, z], [x0 - 11, VT.yCam, z]], 2);

    collar(b, stub, 4.8, 12.7, 19.6, 9.6, MAT_HEAD_MACHINED, MAT_HEAD_MACHINED);
    collar(b, stub, 10.6, 12.4, 16.2, 3.2, MAT_HEAD_BOOT, MAT_HEAD_BOOT);

    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + Math.PI / 4;

      b.prismDir([x0 - 0.2, VT.yCam + 15.6 * Math.cos(a), z + 15.6 * Math.sin(a)], [-1, 0, 0], [0, 1, 0], [0, 0, 1], 2.2, 1.5, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
    }
  }

  // ... and end in blind plates at the other end
  for (const z of [-VT.zCam, VT.zCam]) {
    b.prismDir([x1, VT.yCam, z], [1, 0, 0], [0, 1, 0], [0, 0, 1], 19, 4.2, 36, 0, MAT_HEAD_MACHINED, MAT_HEAD_MACHINED);
    b.prismDir([x1 + 4.2, VT.yCam, z], [1, 0, 0], [0, 1, 0], [0, 0, 1], 6, 2.2, 20, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);

    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + Math.PI / 4;

      b.prismDir([x1 + 4.2, VT.yCam + 13 * Math.cos(a), z + 13 * Math.sin(a)], [1, 0, 0], [0, 1, 0], [0, 0, 1], 2.4, 1.8, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
    }
  }

  // ---- the breather: a barbed nipple on the cover, on the side toward the intake ----
  const breather = { x: x0 + 70, y: -383 - ROD_LIFT };

  b.prismDir([breather.x, breather.y, 92], [0, 0, 1], [1, 0, 0], [0, 1, 0], 7.2, 18, 18, 0, MAT_HEAD_BOOT, MAT_HEAD_BOOT);
  b.prismDir([breather.x, breather.y, 106], [0, 0, 1], [1, 0, 0], [0, 1, 0], 8.8, 3.2, 18, 0, MAT_HEAD_BOOT, MAT_HEAD_BOOT);
  b.prismDir([breather.x, breather.y, 98], [0, 0, 1], [1, 0, 0], [0, 1, 0], 10.4, 2.4, 18, 0, MAT_HEAD_MACHINED, MAT_HEAD_MACHINED);

  // ---- bosses on the deck plate, round the plug tubes: a ring of steel where each tube stands ----
  for (const cx of CT_X) {
    placed(b, cx + PLUG.x, 0, PLUG.z, () => {
      b.revolveY({ y0: yDeck, r0: 13.8, y1: yDeck - 2.4, r1: 15.6, n: [0.4, 0.9], m: MAT_HEAD_MACHINED, steps: 32 });
    });
  }
}

// The fittings on the cover's top: the spark plugs' caps with their steel rings, the oil filler cap, the perforated plates
// and the coloured ones. Drawn only on the plain, solid engine: see-through, they are left off, so that the workings show
// from above (the firing order and the signature stay)
export function buildHeadTopFittings(b: MeshBuilder, shift = 0) {
  const { yTop } = HEAD;
  const x1 = HEAD.x1 + shift;

  // ---- on each spark plug's tube, a low cap rising out of the cover, with a steel ring round its foot: a dome, nearly a
  // half sphere, flattened a little, matte, smooth-shaded, its foot in shade ----
  for (const cx of CT_X) {
    placed(b, cx + PLUG.x, 0, PLUG.z, () => {
      b.revolveY({ y0: yTop, r0: 13.8, y1: yTop, r1: 17.6, n: [-1, 0], m: MAT_HEAD_MACHINED, steps: 32 });
      b.revolveY({ y0: yTop, r0: 17.6, y1: yTop - 3.4, r1: 17.6, n: [0, 1], m: MAT_HEAD_MACHINED, steps: 32 });
      b.revolveY({ y0: yTop - 3.4, r0: 17.6, y1: yTop - 3.4, r1: 11.2, n: [-1, 0], m: MAT_HEAD_MACHINED, steps: 32 });
      plugCap(b, yTop - 3.4, 11.2, 7.2);
    });
  }

  // ---- the oil filler cap, over the end cylinder, with its ring of grip ----
  const cap = { x: x1 - 52, z: 0 };

  placed(b, cap.x, 0, cap.z, () => {
    b.revolveY({ y0: yTop, r0: 27, y1: yTop - 3.2, r1: 27, n: [0, 1], m: MAT_HEAD_MACHINED, steps: 48 });
    b.revolveY({ y0: yTop - 3.2, r0: 27, y1: yTop - 3.2, r1: 23.4, n: [-1, 0], m: MAT_HEAD_MACHINED, steps: 48 });
    b.revolveY({ y0: yTop - 3.2, r0: 23.4, y1: yTop - 13, r1: 22, n: [0, 1], m: MAT_HEAD_BOOT, steps: 48 });
    b.revolveY({ y0: yTop - 13, r0: 22, y1: yTop - 14.2, r1: 19.6, n: [-0.7, 0.7], m: MAT_HEAD_BOOT, steps: 48 });
    b.revolveY({ y0: yTop - 14.2, r0: 19.6, y1: yTop - 14.2, r1: 0, n: [-1, 0], m: MAT_HEAD_MACHINED, steps: 48 });

    // the grip: twenty ribs round the cap
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * TAU;

      b.prismDir([22.8 * Math.cos(a), yTop - 8, 22.8 * Math.sin(a)], [Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)], 1.5, 1.6, 4, 0, MAT_HEAD_BOOT, MAT_HEAD_BOOT);
    }

    // a lever on its top, an arrow
    b.box(-14, 14, yTop - 14.9, yTop - 14.2, -2.1, 2.1, MAT_HEAD_BOOT);
  });

  // ---- a perforated plate on top, between the first two plugs and between the last two: the same plate as the
  // coloured ones (its size, its rivets), its face a polished sheet punched in a staggered grid of round holes, small holes
  // between them (perfPlate) ----
  for (const k of [0, CT_X.length - 2]) perfPlate(b, HEAD_RIBS_X[k], 0, yTop);

  // ---- a plate on top, with three engraved lines and four rivets ----
  // the plate stands twice, one each side of the middle of the head, where the signature stands: in the second gap from either end. It
  // is a little larger than it was, and its three bars are red, yellow and blue, from the valley side outward
  for (const plateX of [HEAD_RIBS_X[1], HEAD_RIBS_X[HEAD_RIBS_X.length - 2]]) {
    const plate = { x: plateX, z: 0 };
    const plateTop = yTop - 2.2;

    b.box(plate.x - 44, plate.x + 44, plateTop, yTop, plate.z - 20, plate.z + 20, MAT_HEAD_MACHINED);

    [-9.5, 0, 9.5].forEach((dz, k) => plateBar(b, plate.x - 33, plate.x + 33, plate.z + dz, 2.7, plateTop, PLATE_BARS[k]));

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        b.prismDir([plate.x + sx * 39, plateTop, plate.z + sz * 16.4], [0, -1, 0], [1, 0, 0], [0, 0, 1], 1.8, 1.1, 10, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
      }
    }
  }
}

// A spark plug's cap: a dome of radius r standing on yb, h high (a half sphere, flattened when h < r), its normals smooth,
// darker toward its foot; built about the vertical axis through the origin
function plugCap(b: MeshBuilder, yb: number, r: number, h: number) {
  const NA = 36;
  const NV = 10;
  const P = (ia: number, iv: number): FwVec3 => {
    const a = (ia / NA) * TAU;
    const t = (iv / NV) * (Math.PI / 2);
    const rr = r * Math.cos(t);

    return [rr * Math.cos(a), yb - h * Math.sin(t), rr * Math.sin(a)];
  };
  const N = (ia: number, iv: number): FwVec3 => {
    const a = (ia / NA) * TAU;
    const t = (iv / NV) * (Math.PI / 2);
    const nr = Math.cos(t) / r;
    const ny = Math.sin(t) / h;
    const l = Math.hypot(nr, ny) || 1;

    return [(nr / l) * Math.cos(a), -ny / l, (nr / l) * Math.sin(a)];
  };
  const occ = (iv: number) => 0.55 + 0.45 * Math.sin((iv / NV) * (Math.PI / 2));

  for (let ia = 0; ia < NA; ia++) {
    for (let iv = 0; iv < NV; iv++) {
      const q = [[ia, iv], [ia + 1, iv], [ia + 1, iv + 1], [ia, iv], [ia + 1, iv + 1], [ia, iv + 1]];

      for (const [i, v] of q) b.push(P(i, v), N(i, v), MAT_PLUG_CAP, occ(v));
    }
  }
}

// The perforated plate (on top, between the end plugs): a plate as the coloured ones, 88 by 40, standing 2.2 proud, with
// a hex bolt in each corner (perfBolt), a little darker than it; its face a mid grey metal punched through in a staggered (hexagonal) grid of round holes,
// PERF.cols across and PERF.rows down, every other row half a pitch along; in every three-cornered gap between them a
// small hole, and the same small holes round the grid's edge. Each big hole is black, its far wall lit as a bright
// crescent along its inside edge, a thin chamfer round its mouth lit on the side toward the light and shadowed on the
// other; each small hole a dark dot in a little bright rim. The light, as an angle round a hole in the plate (PERF.light)
const PERF = { pitch: 7.6, r: 2.5, rSmall: 0.55, cols: 9, rows: 5, light: (3 * Math.PI) / 4 };

// A hex bolt holding the perforated plate, standing on the plate's top at (x, y, z), turned by rot: a flat washer, a hex
// head with its top edges chamfered, a raised round face on its top, and the maker's mark, a small recess in the middle
function perfBolt(b: MeshBuilder, x: number, y: number, z: number, rot: number) {
  const up: FwVec3 = [0, -1, 0];
  const e1: FwVec3 = [1, 0, 0];
  const e2: FwVec3 = [0, 0, 1];
  const at = (h: number): FwVec3 => [x, y - h, z];

  b.prismDir(at(0), up, e1, e2, 2.95, 0.36, 28, 0, MAT_PERF_RIVET_SIDE, MAT_PERF_RIVET_SIDE); // the washer
  b.prismDir(at(0.36), up, e1, e2, 2.35, 1.25, 6, rot, MAT_PERF_RIVET_HEAD, MAT_PERF_RIVET_SIDE); // the hex
  b.prismDir(at(1.61), up, e1, e2, 1.98, 0.2, 24, 0, MAT_PERF_RIVET_HEAD, MAT_PERF_RIVET_SIDE); // the chamfer, cut round
  b.prismDir(at(1.81), up, e1, e2, 1.6, 0.12, 24, 0, MAT_PERF_RIVET_HEAD, MAT_PERF_RIVET_HEAD); // the raised face
  b.prismDir(at(1.93), up, e1, e2, 0.55, 0.03, 12, 0, MAT_CT_HOLE, MAT_CT_HOLE); // the mark
}

function perfPlate(b: MeshBuilder, xc: number, zc: number, yTop: number) {
  const plateTop = yTop - 2.2;
  const yF = plateTop - 0.04; // the punched face's drawing, a hair above the plate
  const N: FwVec3 = [0, -1, 0];
  const S = 24;
  const shade = (g: number): FwMaterial => ({ color: [g, g * 1.01, g * 1.03], shine: 0.15 * 255, pattern: 0, wet: 0 });
  const put = (p: FwVec3, g: number) => b.push(p, N, shade(g), 1);
  const at = (x: number, z: number, r: number, a: number, dy = 0): FwVec3 => [x + r * Math.cos(a), yF - dy, z + r * Math.sin(a)];
  const toward = (a: number) => Math.cos(a - PERF.light); // 1 on the side toward the light

  b.box(xc - 44, xc + 44, plateTop, yTop, zc - 20, zc + 20, MAT_PERF_PLATE);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      perfBolt(b, xc + sx * 39, plateTop, zc + sz * 16.4, 0.35 * (sx + 2 * sz));
    }
  }

  const px = PERF.pitch;
  const pz = (px * Math.sqrt(3)) / 2;
  const x0 = -((PERF.cols - 1) * px) / 2;
  const z0 = -((PERF.rows - 1) * pz) / 2;

  // the big holes
  for (let row = 0; row < PERF.rows; row++) {
    const odd = row % 2 === 1;
    const n = odd ? PERF.cols - 1 : PERF.cols;

    for (let c = 0; c < n; c++) {
      const x = xc + x0 + c * px + (odd ? px / 2 : 0);
      const z = zc + z0 + row * pz;
      const r = PERF.r;

      for (let i = 0; i < S; i++) {
        const a0 = (i / S) * Math.PI * 2;
        const a1 = ((i + 1) / S) * Math.PI * 2;
        // the chamfer round the mouth: bright toward the light, in shade away from it
        const cg = (a: number) => 168 + 70 * toward(a);
        // the far wall seen inside, lit where it faces the light (the side away from it), black elsewhere
        const wg = (a: number) => 12 + 215 * Math.pow(Math.max(0, -toward(a)), 2.2);
        const c0 = at(x, z, r + 0.45, a0);
        const c1 = at(x, z, r + 0.45, a1);
        const m0 = at(x, z, r, a0, 0.01);
        const m1 = at(x, z, r, a1, 0.01);
        const w0 = at(x, z, r * 0.74, a0, 0.02);
        const w1 = at(x, z, r * 0.74, a1, 0.02);

        put(c0, cg(a0)); put(c1, cg(a1)); put(m1, cg(a1) * 0.92);
        put(c0, cg(a0)); put(m1, cg(a1) * 0.92); put(m0, cg(a0) * 0.92);
        put(m0, wg(a0)); put(m1, wg(a1)); put(w1, 12);
        put(m0, wg(a0)); put(w1, 12); put(w0, 12);
        put(at(x, z, 0, 0, 0.03), 8); put(w0, 12); put(w1, 12);
      }
    }
  }

  // the small holes: in each three-cornered gap of the grid (its triangles' middles), within the plate, clear of the rivets
  const pts: Array<[number, number]> = [];

  for (let row = -1; row < PERF.rows; row++) {
    for (let c = -2; c <= PERF.cols; c++) {
      const odd = ((row % 2) + 2) % 2 === 1;
      const xa = x0 + c * px + (odd ? px / 2 : 0);
      const za = z0 + row * pz;

      // the triangle below this point of the grid (to the next row) and the one beside it
      pts.push([xa + px / 2, za + pz / 3], [xa + px, za + (2 * pz) / 3]);
    }
  }

  for (const [lx, lz] of pts) {
    if (Math.abs(lx) > 36.5 || Math.abs(lz) > 17.6) continue;
    if (Math.hypot(Math.abs(lx) - 39, Math.abs(lz) - 16.4) < 4.9) continue;

    const x = xc + lx;
    const z = zc + lz;
    const r = PERF.rSmall;

    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * Math.PI * 2;
      const a1 = ((i + 1) / 12) * Math.PI * 2;
      const rg = (a: number) => 150 + 80 * toward(a);

      put(at(x, z, r + 0.35, a0), rg(a0)); put(at(x, z, r + 0.35, a1), rg(a1)); put(at(x, z, r, a1, 0.01), 60);
      put(at(x, z, r + 0.35, a0), rg(a0)); put(at(x, z, r, a1, 0.01), 60); put(at(x, z, r, a0, 0.01), 60);
      put(at(x, z, 0, 0, 0.02), 14); put(at(x, z, r, a0, 0.01), 30 + 60 * Math.max(0, -toward(a0))); put(at(x, z, r, a1, 0.01), 30 + 60 * Math.max(0, -toward(a1)));
    }
  }
}

// One of the bars on a plate: raised a little from the plate's top (at height yb), bevelled, lit on the side toward the valley and in
// shade on the other, with a soft shadow on the plate beside it
function plateBar(b: MeshBuilder, x0: number, x1: number, zc: number, hw: number, yb: number, m: { top: FwMaterial; lit: FwMaterial; dark: FwMaterial }) {
  const h = 0.8;
  const bv = 0.6;
  const zA = zc - hw;
  const zB = zc + hw;
  const Q = (x: number, z: number, hh: number): FwVec3 => [x, yb - hh, z];

  b.flatQuad(Q(x0 + 0.6, zA + 0.5, 0.05), Q(x1 + 0.6, zA + 0.5, 0.05), Q(x1 + 0.6, zB + 1.1, 0.05), Q(x0 + 0.6, zB + 1.1, 0.05), [0, -1, 0], MAT_HEAD_BOOT, 0.6);

  // the top, shaded across
  b.flatTri(Q(x0 + bv, zA + bv, h), Q(x1 - bv, zA + bv, h), Q(x1 - bv, zB - bv, h), [0, -1, 0], m.top, 1, 1, 0.7);
  b.flatTri(Q(x0 + bv, zA + bv, h), Q(x1 - bv, zB - bv, h), Q(x0 + bv, zB - bv, h), [0, -1, 0], m.top, 1, 0.7, 0.7);

  // the bevels
  b.flatQuad(Q(x0, zA, 0), Q(x1, zA, 0), Q(x1 - bv, zA + bv, h), Q(x0 + bv, zA + bv, h), [0, -0.7, -1], m.lit, 1);
  b.flatQuad(Q(x0, zB, 0), Q(x1, zB, 0), Q(x1 - bv, zB - bv, h), Q(x0 + bv, zB - bv, h), [0, -0.7, 1], m.dark, 0.7);
  b.flatQuad(Q(x0, zA, 0), Q(x0, zB, 0), Q(x0 + bv, zB - bv, h), Q(x0 + bv, zA + bv, h), [-1, -0.7, 0], m.lit, 1);
  b.flatQuad(Q(x1, zA, 0), Q(x1, zB, 0), Q(x1 - bv, zB - bv, h), Q(x1 - bv, zA + bv, h), [1, -0.7, 0], m.dark, 0.8);
}
