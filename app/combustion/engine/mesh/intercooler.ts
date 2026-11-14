// The intercooler cores and tanks, and the charge pipes to and from them.

import { BANKS, TAU, bankPoint, composeTurn } from "../core/constants";
import type { Bank } from "../core/constants";
import { vadd, vcross, vnorm, vscale, vsub } from "../math/vec3";
import type { FwMaterial, FwVec3 } from "./builder";
import { MODULES, modulePoint } from "./exhaust";
import type { TModule } from "./exhaust";
import { MAT_ALU_TURNED, MAT_COOL_PIPE, MAT_CASE_GREY, MAT_EXH_GUNMETAL, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_FIN_BACK, MAT_IC_FIN, MAT_IC_FIN_DEEP, MAT_IC_PLATE, MAT_IC_RUBBER, MAT_IC_TANK, MAT_IC_TUBE, MAT_PIPE_BLACK, MAT_STEEL_BRIGHT, MAT_WELD, MAT_AIR_DUCT } from "./materials";
import { PIPES, PLENUM_INLETS, PORT_JOINT, weld } from "./plumbing";
import { curveAt, curveFromPoints, flangeJoint, roundedCurve, sweepTube } from "./tubes";
import type { Curve, MeshBuilder } from "./tubes";
import { IC, IC_HALF } from "./turbo";

/* ---------------- the intercooler: a modern bar-and-plate core with cast end tanks ---------------- */

// The core is made as such a core is: nine flat aluminium tubes run from one end tank to the other,
// one above another, and in every gap between two tubes there is a fin, a strip of metal folded to and
// fro into a zig-zag, with louvres cut across its folds. The air goes through the gaps, from the front
// to the back, between the tubes, over the folds; the charge goes through the tubes, from tank to tank.
// Over the core lie a top and a bottom plate, and at each end a header plate that the tubes go through.
//
// Each end tank is cast and tapered: wide where it meets the header, narrowing toward its closed end,
// with a hose port standing up from its top that the charge pipe comes down on to, a bead on that port to hold the
// hose, a TIG weld all round where it meets the header, and a boss for a sensor in its side.
//
// The tubes' heights are those that the charge's own flow (the air bodies, below) runs along.

const IC_TUBES = 9; // flat tubes, one above another
const IC_TUBE_PITCH = 22; // from the middle of one to the middle of the next
const IC_TUBE_H = 7; // a tube's height
const IC_PLATE_T = 4; // the top and the bottom plate
const IC_HEADER_T = 4; // the header plates
export const IC_PORT_UP = 142; // the end of a tank's hose port, on top of it: this far above the tank's middle

// An end tank's sections, from the header (local z = -IC_TANK_LEN / 2) to its closed end: [z, half width,
// half height, corner radius]
const IC_TANK_SECTIONS: Array<[number, number, number, number]> = [
  [-24.5, 42.5, 98, 7],
  [-15, 42.5, 98, 8],
  [1, 41, 95, 9],
  [13, 36.5, 77, 9],
  [21, 30, 56, 8],
  [24.5, 24, 38, 7],
];

// A rounded rectangle's outline, round the middle, counter-clockwise
function roundedRectRing(ax: number, ay: number, rc: number, perCorner = 7): Array<[number, number]> {
  const r = Math.min(rc, ax - 0.5, ay - 0.5);
  const corners: Array<[number, number, number]> = [
    [ax - r, ay - r, 0],
    [-(ax - r), ay - r, Math.PI / 2],
    [-(ax - r), -(ay - r), Math.PI],
    [ax - r, -(ay - r), (3 * Math.PI) / 2],
  ];
  const pts: Array<[number, number]> = [];

  for (const [cx, cy, a0] of corners) {
    for (let k = 0; k <= perCorner; k++) {
      const a = a0 + (k / perCorner) * (Math.PI / 2);

      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }

  return pts;
}

/* ---- the core ---- */

export function buildIntercooler(b: MeshBuilder) {
  const { x, y, z } = IC;
  const hx = IC_HALF.x;
  const hy = IC_HALF.y;
  const hz = IC_HALF.z;

  // A quad with a normal and an occlusion at each corner
  const quad = (
    p0: FwVec3, p1: FwVec3, p2: FwVec3, p3: FwVec3,
    mat: FwMaterial, o0: number, o1: number, o2: number, o3: number
  ) => {
    const n = vnorm(vcross(vsub(p1, p0), vsub(p3, p0)));

    b.push(p0, n, mat, o0);
    b.push(p1, n, mat, o1);
    b.push(p2, n, mat, o2);
    b.push(p0, n, mat, o0);
    b.push(p2, n, mat, o2);
    b.push(p3, n, mat, o3);
  };

  // ---- the dark inside of the core, behind the fins ----
  b.box(x - hx + 0.6, x + hx - 0.6, y - hy + IC_PLATE_T, y + hy - IC_PLATE_T, z - hz, z + hz, MAT_FIN_BACK);

  // ---- the flat tubes, with a fin in every gap ----
  const pitch = 3.2; // the fin's folds, from crest to crest, along the tube
  const folds = Math.floor((hz * 2) / (pitch / 2));
  // where a louvre cuts across a fold, as fractions of the core's depth
  const cuts = [0.2, 0.4, 0.6, 0.8];
  const slit = 0.03;
  const bounds: Array<[number, number, boolean]> = [];
  let u0 = 0;

  for (const c of cuts) {
    bounds.push([u0, c - slit, false]);
    bounds.push([c - slit, c + slit, true]);
    u0 = c + slit;
  }

  bounds.push([u0, 1, false]);

  const depthShade = (u: number) => 0.64 + 0.36 * Math.pow(Math.abs(2 * u - 1), 1.4);

  for (let k = 0; k < IC_TUBES; k++) {
    const yc = y - 88 + k * IC_TUBE_PITCH;
    const t0 = yc - IC_TUBE_H / 2;
    const t1 = yc + IC_TUBE_H / 2;

    // the tube: a bar, with its edge a little rounded, a bright line along it at the front
    b.box(x - hx, x + hx, t0, t1, z - hz, z + hz, MAT_IC_TUBE);
    b.box(x - hx - 0.5, x - hx, t0 + 1.2, t1 - 1.2, z - hz, z + hz, MAT_IC_PLATE);
    b.box(x + hx, x + hx + 0.5, t0 + 1.2, t1 - 1.2, z - hz, z + hz, MAT_IC_PLATE);

    // the fin above this tube, between it and the one above (or the plate)
    const gapTop = k === 0 ? y - hy + IC_PLATE_T : t0 - (IC_TUBE_PITCH - IC_TUBE_H);
    const gapBot = t0;
    const ya = gapTop + 0.3;
    const yb = gapBot - 0.3;

    for (let f = 0; f < folds; f++) {
      const za = z - hz + (f * pitch) / 2;
      const zb = za + pitch / 2;
      const upA = f % 2 === 0;
      const yA = upA ? ya : yb;
      const yB = upA ? yb : ya;

      // the fold's edge, on the front and on the back: a thin bright strip facing out
      for (const [xe, nx] of [[x - hx - 0.05, -1], [x + hx + 0.05, 1]] as Array<[number, number]>) {
        b.flatQuad([xe, yA, za], [xe, yB, zb], [xe, yB, zb + 0.6], [xe, yA, za + 0.6], [nx, 0, 0], MAT_IC_PLATE);
      }

      for (const [ua, ub, isSlit] of bounds) {
        const xa = x - hx + ua * hx * 2;
        const xb = x - hx + ub * hx * 2;
        const mat = isSlit ? MAT_IC_FIN_DEEP : MAT_IC_FIN;
        const shade = f % 2 === 0 ? 1 : 0.86; // alternate folds catch the light differently

        quad(
          [xa, yA, za], [xb, yA, za], [xb, yB, zb], [xa, yB, zb], mat,
          depthShade(ua) * shade, depthShade(ub) * shade, depthShade(ub) * shade, depthShade(ua) * shade
        );
      }
    }
  }

  // the last gap, between the bottom tube and the bottom plate
  {
    const yc = y - 88 + (IC_TUBES - 1) * IC_TUBE_PITCH;
    const gapTop = yc + IC_TUBE_H / 2;
    const gapBot = y + hy - IC_PLATE_T;
    const ya = gapTop + 0.3;
    const yb = gapBot - 0.3;

    for (let f = 0; f < folds; f++) {
      const za = z - hz + (f * pitch) / 2;
      const zb = za + pitch / 2;
      const upA = f % 2 === 0;
      const yA = upA ? ya : yb;
      const yB = upA ? yb : ya;

      for (const [xe, nx] of [[x - hx - 0.05, -1], [x + hx + 0.05, 1]] as Array<[number, number]>) {
        b.flatQuad([xe, yA, za], [xe, yB, zb], [xe, yB, zb + 0.6], [xe, yA, za + 0.6], [nx, 0, 0], MAT_IC_PLATE);
      }

      for (const [ua, ub, isSlit] of bounds) {
        const xa = x - hx + ua * hx * 2;
        const xb = x - hx + ub * hx * 2;
        const mat = isSlit ? MAT_IC_FIN_DEEP : MAT_IC_FIN;
        const shade = f % 2 === 0 ? 1 : 0.86;

        quad(
          [xa, yA, za], [xb, yA, za], [xb, yB, zb], [xa, yB, zb], mat,
          depthShade(ua) * shade, depthShade(ub) * shade, depthShade(ub) * shade, depthShade(ua) * shade
        );
      }
    }
  }

  // ---- the top and the bottom plate, with a raised rib along them ----
  for (const side of [-1, 1]) {
    const y0 = side < 0 ? y - hy : y + hy - IC_PLATE_T;

    b.box(x - hx - 1, x + hx + 1, y0, y0 + IC_PLATE_T, z - hz - 1, z + hz + 1, MAT_IC_PLATE);

    // ribs across the plate: stiffening
    for (let k = 0; k < 9; k++) {
      const xr = x - hx + 8 + (k * (hx * 2 - 16)) / 8;

      if (side < 0) b.box(xr - 1.1, xr + 1.1, y0 - 1.6, y0, z - hz + 12, z + hz - 12, MAT_IC_PLATE);
      else b.box(xr - 1.1, xr + 1.1, y0 + IC_PLATE_T, y0 + IC_PLATE_T + 1.6, z - hz + 12, z + hz - 12, MAT_IC_PLATE);
    }
  }

  // ---- the header plates at the two ends: the tubes go through them ----
  for (const side of [-1, 1]) {
    const z0 = side < 0 ? z - hz - IC_HEADER_T : z + hz;

    b.box(x - hx - 1, x + hx + 1, y - hy, y + hy, z0, z0 + IC_HEADER_T, MAT_IC_PLATE);
  }

  // ---- the corners: machined end blocks, so the frame has edges ----
  for (const sz of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const bz = sz * (hz + IC_HEADER_T / 2 + 0.4);
      const by = sy * (hy - 1);

      b.box(x - hx - 2.4, x + hx + 2.4, y + by - 3, y + by + 3, z + bz - 3.4, z + bz + 3.4, MAT_IC_PLATE);
    }
  }

  // ---- mounts: a tab with a rubber bush and a bolt on each end of the top plate (it stands leaning in front of its
  // bank, its foot toward the middle of the V, so it has no brackets under it, which would reach across to the other) ----
  for (const dz of [-88, 88]) {
    const zc = z + dz;
    const yTop = y - hy;

    b.box(x - 12, x + 12, yTop - 7, yTop, zc - 9, zc + 9, MAT_CASE_GREY);
    b.prismDir([x, yTop - 7, zc], [0, -1, 0], [1, 0, 0], [0, 0, 1], 7.6, 3, 20, 0, MAT_IC_RUBBER, MAT_IC_RUBBER);
    b.prismDir([x, yTop - 10, zc], [0, -1, 0], [1, 0, 0], [0, 0, 1], 6, 1.4, 20, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
    b.prismDir([x, yTop - 11.4, zc], [0, -1, 0], [1, 0, 0], [0, 0, 1], 4.2, 4.4, 6, 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
  }
}

// The low tank's hot port: a neck cast on its face toward the engine, a little out from the middle of its length, where
// the hot pipe comes straight in from the turbocharger; the sensor's boss moved to the other side of the middle for it
const HOT_PORT_Y = -36;
const HOT_PORT_Z = -6; // across the tank, from its middle, toward its closed end
const HOT_NECK_CLEAR = 34; // the fins on that face part this far each side of it
const sensorY = (low: boolean) => (low ? 46 : -30);

// The fins on an end tank's broad faces (see buildIntercoolerTank)
const TANK_FIN = { pitch: 4.8, h: 5.4, root: 1.0, tip: 0.6, z0: -21, z1: 9, endRun: 12, dy: 3 };

function tankFins(b: MeshBuilder, side: number, low = false) {
  const sy = sensorY(low);
  const hp = low ? HOT_PORT_Y : null; // the hot pipe's cast port, on the low tank's face toward the engine
  // the tank's half width and half height at a point along it, from its sections
  const secAt = (zl: number, k: 1 | 2) => {
    const s = IC_TANK_SECTIONS;

    for (let i = 0; i + 1 < s.length; i++) {
      if (zl <= s[i + 1][0]) {
        const t = (zl - s[i][0]) / (s[i + 1][0] - s[i][0]);

        return s[i][k] + (s[i + 1][k] - s[i][k]) * t;
      }
    }

    return s[s.length - 1][k];
  };
  const F = TANK_FIN;
  // a fin's section, across it: from its root on one side, up round its tip, down to its root on the other; [across, out]
  const sec: Array<[number, number]> = [[-F.root, 0], [-F.tip, 0.78]];

  for (let k = 0; k <= 6; k++) {
    const a = Math.PI - (k / 6) * Math.PI;

    sec.push([F.tip * Math.cos(a), 0.78 + 0.22 * Math.sin(a)]);
  }

  sec.push([F.tip, 0.78], [F.root, 0]);

  for (const sx of [-1, 1]) {
    for (let zl = F.z0; zl <= F.z1 + 1e-6; zl += F.pitch) {
      const ax = secAt(zl, 1);
      const ay = secAt(zl, 2) - 16; // clear of the rounded corners
      // the runs of this fin along the tank: on the face toward the engine (+x), parted round the sensor's boss
      let runs: Array<[number, number]> = sx > 0 && Math.abs(zl + 3) < 13 ? [[-ay, sy - 15], [sy + 15, ay]] : [[-ay, ay]];

      // (and round the hot port's neck)
      if (sx > 0 && hp !== null) runs = runs.flatMap(([a, c]): Array<[number, number]> => [[a, Math.min(c, hp - HOT_NECK_CLEAR)], [Math.max(a, hp + HOT_NECK_CLEAR), c]]).filter(([a, c]) => c - a > 6);

      for (const [ya, yb] of runs) {
        const n = Math.max(2, Math.ceil((yb - ya) / F.dy));
        const hAt = (y: number) => {
          const e = Math.min(y - ya, yb - y) / F.endRun;

          return F.h * (e >= 1 ? 1 : Math.sin((Math.max(0, e) * Math.PI) / 2));
        };
        const P = (y: number, q: [number, number]): FwVec3 => [sx * (ax - 0.3 + q[1] * hAt(y)), y, side * (zl + q[0] * (0.6 + 0.4 * hAt(y) / F.h))];

        for (let k = 0; k + 1 < sec.length; k++) {
          const q0 = sec[k];
          const q1 = sec[k + 1];
          // the normal of this strip of the section, out of the fin
          const nz = -(q1[1] - q0[1]) * F.h * side;
          const nxv = (q1[0] - q0[0]) * sx;
          const l = Math.hypot(nxv, nz) || 1;
          const nrm: FwVec3 = [nxv / l, 0, nz / l];
          const o0 = 0.55 + 0.45 * q0[1];
          const o1 = 0.55 + 0.45 * q1[1];

          for (let i = 0; i < n; i++) {
            const y0 = ya + ((yb - ya) * i) / n;
            const y1 = ya + ((yb - ya) * (i + 1)) / n;

            b.push(P(y0, q0), nrm, MAT_IC_TANK, o0);
            b.push(P(y1, q0), nrm, MAT_IC_TANK, o0);
            b.push(P(y1, q1), nrm, MAT_IC_TANK, o1);
            b.push(P(y0, q0), nrm, MAT_IC_TANK, o0);
            b.push(P(y1, q1), nrm, MAT_IC_TANK, o1);
            b.push(P(y0, q1), nrm, MAT_IC_TANK, o1);
          }
        }
      }
    }
  }
}

/* ---- an end tank ---- */

// Built round its own centre (the middle of its length along the engine, where its hose port is), for
// the side of the core it stands on: side = +1 on the far side of the core's middle, -1 on the near side.
// Its header is toward the core, its closed end away from it.
export function buildIntercoolerTank(b: MeshBuilder, side: number, low = false, port = true) {
  const py = low ? 1 : -1; // the way the hose port stands: up, or down for the tank the hot charge comes into from below
  const secs = IC_TANK_SECTIONS.map(([zl, ax, ay, rc]) => ({ z: side * zl, ring: roundedRectRing(ax, ay, rc, 7) }));
  const count = secs[0].ring.length;
  const point = (i: number, j: number): FwVec3 => {
    const [px, py] = secs[i].ring[((j % count) + count) % count];

    return [px, py, secs[i].z];
  };

  // The tank's skin: a loft, with smooth normals from the neighbours of every point
  const normal = (i: number, j: number): FwVec3 => {
    const around = vsub(point(i, j + 1), point(i, j - 1));
    const along = vsub(point(Math.min(secs.length - 1, i + 1), j), point(Math.max(0, i - 1), j));
    const n = vnorm(vcross(around, along));
    const p = point(i, j);

    return n[0] * p[0] + n[1] * p[1] < 0 ? vscale(n, -1) : n;
  };

  for (let i = 0; i < secs.length - 1; i++) {
    for (let j = 0; j < count; j++) {
      const v: Array<[FwVec3, FwVec3]> = [
        [point(i, j), normal(i, j)],
        [point(i, j + 1), normal(i, j + 1)],
        [point(i + 1, j + 1), normal(i + 1, j + 1)],
        [point(i + 1, j), normal(i + 1, j)],
      ];

      // a little darker toward the closed end, a quiet shadow
      const occ = [1 - 0.18 * (i / secs.length), 1 - 0.18 * (i / secs.length), 1 - 0.18 * ((i + 1) / secs.length), 1 - 0.18 * ((i + 1) / secs.length)];

      for (const k of [0, 1, 2, 0, 2, 3]) b.push(v[k][0], v[k][1], MAT_IC_TANK, occ[k]);
    }
  }

  // the closed end
  {
    const last = secs.length - 1;
    const ring: FwVec3[] = [];

    for (let j = 0; j < count; j++) ring.push(point(last, j));

    b.flatFan([0, 0, secs[last].z], ring, [0, 0, side], MAT_IC_TANK, 0.8);
  }

  // ---- a TIG weld all round the tank, where it meets the header: a bead of ripples ----
  {
    const ripple = 3.6; // the ripples' pitch along the bead
    const ring = roundedRectRing(IC_TANK_SECTIONS[0][1] + 0.5, IC_TANK_SECTIONS[0][2] + 0.5, IC_TANK_SECTIONS[0][3] + 0.5, 12);
    const pts: FwVec3[] = ring.map(([px, py]) => [px, py, side * (IC_TANK_SECTIONS[0][0] + 0.4)] as FwVec3);

    pts.push(pts[0]);

    const bead = curveFromPoints(pts, 3);

    sweepTube(b, bead, (u) => 1.45 + 0.42 * Math.sin(u * bead.total / ripple * TAU), MAT_WELD, { segments: 6 });
  }

  // ---- the hose port on top of the tank (or under it). Its flange is in two halves: the near one is cast as one with
  // the tank, a stadium-shaped boss that rises out of the tank's skin, flush with it, from deep inside it; the far one is
  // machined, on the neck, with a gasket between, and the two are held by two bolts screwed into the cast half ----
  if (port) {
    const up = IC_PORT_UP;
    const axis: FwVec3 = [0, py, 0];
    const at = (y: number): FwVec3 => vscale(axis, y);
    const castTop = IC_TANK_SECTIONS[0][2] + 6; // the joint: a little above the tank's highest point
    const neck = curveFromPoints([at(castTop + 7), at(up)], 2);

    // a round neck cast with the tank, out of it from inside, plain; on its end a round bolted flange joint, as at the
    // cooled charge's outlet: the tank's flange and the pipe's, dark grey metal, a gasket between, six bolts; and the
    // pipe's end standing on it
    sweepTube(b, curveFromPoints([at(30), at(castTop - 8)], 2), () => PORT_NECK_R, MAT_IC_TANK, { segments: 40 });
    flangeJoint(b, at(castTop - 8 + PORT_JOINT.castT), axis, PORT_JOINT);
    sweepTube(b, neck, () => 17, MAT_ALU_TURNED, { segments: 32 });
  }

  // ---- a boss in the side facing the engine for a sensor, with a hex plug; a smaller one underneath, for a vacuum line ----
  {
    const xSide = IC_TANK_SECTIONS[2][1];
    const yTop = IC_TANK_SECTIONS[2][2];

    const sy = sensorY(low);

    b.prismDir([xSide - 1, sy, side * -3], [1, 0, 0], [0, 1, 0], [0, 0, 1], 9.4, 7, 24, 0, MAT_IC_PLATE, MAT_IC_PLATE);
    b.prismDir([xSide + 6, sy, side * -3], [1, 0, 0], [0, 1, 0], [0, 0, 1], 6.4, 5.6, 6, 0.2, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
    b.prismDir([xSide + 11.6, sy, side * -3], [1, 0, 0], [0, 1, 0], [0, 0, 1], 2.6, 3.4, 12, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);

    b.prismDir([12, -py * (yTop - 1), side * 4], [0, -py, 0], [1, 0, 0], [0, 0, 1], 5.6, 6, 18, 0, MAT_IC_PLATE, MAT_IC_PLATE);
    b.prismDir([12, -py * (yTop + 5), side * 4], [0, -py, 0], [1, 0, 0], [0, 0, 1], 3.4, 4, 12, 0, MAT_IC_RUBBER, MAT_IC_RUBBER);
  }

  // ---- cooling fins cast on its two broad faces, front and back: thin blades standing out of the skin, running the
  // tank's length, close together across it; rounded at their tips, thicker at their roots, their ends sloping down into
  // the skin before the tank's rounded corners; on the face toward the engine they part round the sensor's boss ----
  tankFins(b, side, low);

  // ---- ribs cast into the tank's top and bottom faces, along the engine's length ----
  for (const sy of [-1, 1]) {
    for (const sx of sy === py && !low ? [-30, 30] : [-18, 0, 18]) {
      const y0 = sy * 96;

      b.box(sx - 1.4, sx + 1.4, Math.min(y0, y0 + sy * 3.2), Math.max(y0, y0 + sy * 3.2), Math.min(side * -23, side * -2), Math.max(side * -23, side * -2), MAT_IC_TANK);
    }
  }
}

// ---- THE CHARGE: one big intercooler, two cores side by side with four tanks. Each turbocharger's hot pipe comes down
// on to the top of an inner tank, in the middle, one for each bank; the cooled charge leaves by the top of the outer
// tank, at the core's far end, on that bank's own side, and goes straight up beside the engine to the throttle body at
// the front of the bank's plenum, so that the hot and the cold pipes of a bank never cross. The pipes are laid in the
// engine's own frame, with round elbows and a straight run before each ----
export const IC_INNER_Z = 24.5; // an inner tank's middle, from the middle of the engine
export const IC_CORE_Z = 53 + IC_HALF.z; // a core's middle
export const IC_OUTER_Z = IC_CORE_Z + IC_HALF.z + 4 + 24.5; // an outer tank's middle
export const IC_CHARGE_IN_Z = IC_INNER_Z; // the tank the hot charge comes into
export const IC_CHARGE_OUT_Z = IC_OUTER_Z; // and the one the cooled charge leaves by

export const IC_STAND_Y = 237; // where the intercooler was built to stand, in front of the engine
export const IC_PORT_Y = IC_STAND_Y - IC_PORT_UP; // the level of the tanks' hose ports' ends (on top)

// ---- THE INTERCOOLERS AT THE FRONT, LEANING WITH THE BANKS. The intercooler is built as it was, two cores side by side,
// each with its two tanks and its fan; each half is then set in front of its own bank, in the bank's frame, so that it
// leans as the bank does and the two make a V seen from the front: the core stands along the bank's axis, its fan to the
// front, its tanks one low (toward the crank: the hot charge comes into it) and one high (the cooled charge leaves by
// it), their hose ports turned out, toward the bank's intake side. `icPlace` takes a point of the half as it was built
// to where it is; `icTurn` is the turn that goes with it ----
// the middle of each half, in its bank's frame: its high tank level with the distributor, so that the cooled charge's
// pipe runs straight back to it
export const IC_FRONT = { x: -462, y: -244, z: 160 }; // (was x -480, z 235: brought in closer to the block, its pipes shorter)
const IC_DROP = 125; // how far the intercoolers are lowered, straight down, from where the bank's frame puts them
const IC_HALF_MID = (IC_INNER_Z + IC_OUTER_Z) / 2;

const bankOfSide = (zs: number) => (zs < 0 ? BANKS[0] : BANKS[1]);

// the half's own axes in the bank's frame: its x (front to back) along the engine, its y (down) toward the bank's valley
// side, its z (across the two cores) along the bank's axis, the inner tank toward the crank
const icInBank = (zs: number) => [1, 0, 0, 0, 0, -1, 0, -zs, 0];

export const icTurn = (zs: number) => composeTurn(bankOfSide(zs).m, icInBank(zs));

export function icPlace(zs: number, p: FwVec3): FwVec3 {
  const dx = p[0] - IC.x;
  const dy = p[1] - IC_STAND_Y;
  const dz = p[2] - zs * IC_HALF_MID;

  const q = bankPoint(bankOfSide(zs), IC_FRONT.x + dx, IC_FRONT.y - zs * dz, IC_FRONT.z - dy);

  return [q[0], q[1] + IC_DROP, q[2]]; // and lowered, straight down, leaning as it did
}

const PORT_NECK_R = 19; // the cast neck it stands on

// the outlet's neck, cast with the tank: how far it starts inside the tank, and how far out its flange stands
// The cooled charge's outlet: out of the high tank's inner end, along the tank (parallel to the core), a neck cast as one
// with the tank, blending out of its end into a round throat, and on it the cast flange. In the tank's own frame (x
// across, y along it, toward its inner end, z from the header toward its closed end)
const OUT_Z0 = -6; // the throat's middle, from the tank's middle, toward its closed end
const OUT_R = 29; // the throat, round: the pipe's thickness and a little
const OUT_RINGS: Array<[number, number, number, number]> = [ // [y, half width, half depth, squareness: 2 round .. square]
  [64, 34, 15, 9],
  [94, 37, 17, 8],
  [106, 34, 22, 4.5],
  [118, 30, 27, 2.6],
  [128, OUT_R, OUT_R, 2],
];
const OUT_FLANGE_Y = 128 + 10; // the joint's plane (the cast flange is under it, on the throat)
const HOT_FLANGE_X = 58; // the hot port's joint, out from the tank's middle toward the engine
export const hotPortLocal = (zs: number, lx: number, ly: number, lz: number) =>
  icPlace(zs, [IC.x + lx, IC_STAND_Y + ly, zs * IC_CHARGE_IN_Z - zs * lz]);
export const coolOutLocal = (zs: number, lx: number, ly: number, lz: number) =>
  icPlace(zs, [IC.x + lx, IC_STAND_Y + ly, zs * IC_CHARGE_OUT_Z + zs * lz]);
// the cooled pipe's bend at the top, from its rise into the throttle's mouth: its radius, and how far ahead of the mouth
// the rise stands, so that the bend has room to be that broad (with a straight stretch after it, for the coupler)
const TOP_BEND = 46;
const S_AHEAD = 84; // how far in front of the throttle's mouth the pipe's last S turns it back in
const COOL_ELBOW: Array<{ s0: number; s1: number }> = []; // where each pipe's elbow starts and ends, along it

export const CHARGE_PIPES = (() => {
  // The hot pipe, the short way: down out of the compressor a little, forward along the side, down in front of the engine,
  // and up into the port in the bottom of the intercooler, out of the low tank's closed end
  const hot = (m: TModule, zSign: number) => {
    // straight from the compressor to the low tank's cast port, on its face toward the engine: down out of the compressor a
    // little, forward and out along the side, above the dry sump's pump and clear of its outer side, and square into the
    // port. One run, broad bends, nothing under the engine
    const o = modulePoint(m, PIPES.outlet);
    const port = hotPortLocal(zSign, HOT_FLANGE_X, HOT_PORT_Y, HOT_PORT_Z);
    const d = vnorm(vsub(modulePoint(m, vadd(PIPES.outlet, [0, 10, 0])), o));
    const near: FwVec3 = [port[0] + 64, port[1], port[2]]; // straight behind the port, in its line

    return roundedCurve([o, vadd(o, vscale(d, 26)), [o[0] - 110, 80, zSign * 135], [-290, 86, zSign * 202], near, port], 50, 5);
  };

  // The cold pipe: out of the high tank's port, up the front of the engine and in, toward the middle, and at the height
  // of the plenum on top of the V, one bend back, square into its throttle's mouth, which faces forward (plumbing.ts,
  // plenum.ts)
  const cool = (bank: Bank, zSign: number) => {
    // out of the flange along the tank, toward the middle, then in one broad bend forward and in, and up the front to
    // the U at the top, as before
    const start = coolOutLocal(zSign, 0, OUT_FLANGE_Y, OUT_Z0);
    const d = vnorm(vsub(coolOutLocal(zSign, 0, OUT_FLANGE_Y + 10, OUT_Z0), start));
    const inlet = PLENUM_INLETS[zSign < 0 ? 0 : 1];
    // out along the tank as it is, then an S up and in toward the middle, close in front of the engine, and a second S
    // that lays it level, square into the throttle's mouth: no long run forward, no right angles
    const k0 = vadd(start, vscale(d, 64));
    const k1: FwVec3 = [inlet[0] - S_AHEAD * 0.55, (k0[1] + inlet[1]) / 2 + 30, (k0[2] + inlet[2]) / 2];
    const k2: FwVec3 = [inlet[0] - S_AHEAD, inlet[1] + 40, inlet[2]];
    const k3: FwVec3 = [inlet[0] - S_AHEAD * 0.5, inlet[1], inlet[2]];
    // broad bends, then smoothed along: each point eased toward its neighbours, many times over, the two ends (square out
    // of the tank's flange and into the throttle's mouth) held, so that the pipe runs in long, even curves, no knees
    const rough = roundedCurve([start, k0, k1, k2, k3, inlet], TOP_BEND + 22, 2);
    const pts = rough.pts.map((q) => [q[0], q[1], q[2]] as FwVec3);
    const hold = (k: number) => rough.cum[k] < 22 || rough.total - rough.cum[k] < 30;

    for (let pass = 0; pass < 60; pass++) {
      const prev = pts.map((q) => [q[0], q[1], q[2]] as FwVec3);

      for (let k = 2; k < pts.length - 2; k++) {
        if (hold(k)) continue;

        for (let a = 0; a < 3; a++) pts[k][a] = (prev[k - 2][a] + 2 * prev[k - 1][a] + 2 * prev[k][a] + 2 * prev[k + 1][a] + prev[k + 2][a]) / 8;
      }
    }

    const c = curveFromPoints(pts.filter((_, k) => k % 2 === 0 || k === pts.length - 1), 4); // (every other point: as fine as before)
    // the bend at the top, a mandrel-bent piece welded in: from where the rise comes near it to where it leaves it
    const near = (p: FwVec3, d: number) => c.pts.map((q, k) => [Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]), k]).filter(([l]) => l < d).map(([, k]) => k);
    // (the smoothed pipe passes a little off the corner: the elbow is the stretch round the point nearest it)
    let kNear = 0;

    c.pts.forEach((q, k) => {
      if (Math.hypot(q[0] - k2[0], q[1] - k2[1], q[2] - k2[2]) < Math.hypot(c.pts[kNear][0] - k2[0], c.pts[kNear][1] - k2[1], c.pts[kNear][2] - k2[2])) kNear = k;
    });

    const s0 = Math.max(40, c.cum[kNear] - (TOP_BEND + 12));
    const s1 = Math.min(c.total - 60, c.cum[kNear] + (TOP_BEND + 12));
    void near;

    COOL_ELBOW.push({ s0, s1 });
    void bank;

    return c;
  };

  return {
    hot: [hot(MODULES[0], -1), hot(MODULES[1], 1)],
    cool: [cool(BANKS[0], -1), cool(BANKS[1], 1)],
  };
})();

// The charge pipes are thick along their length, and narrow in a straight cone at each end to the port, the throttle
// body or the compressor's outlet they are coupled to
export const CHARGE_R = 28; // their thickness along the way
const CHARGE_END_R = 17; // at their ends, under the couplers
const CHARGE_CONE = 56; // how long each end's cone is
const CHARGE_COUPLED = 36; // and how far from the end it starts: the coupler's length, plain

export const chargeRadius = (s: number, total: number, big = CHARGE_R) => {
  const d = Math.min(s, total - s);
  const k = Math.min(1, Math.max(0, (d - CHARGE_COUPLED) / (CHARGE_CONE * big / CHARGE_R)));

  return CHARGE_END_R + (big - CHARGE_END_R) * k;
};

export function buildChargePipes(b: MeshBuilder, bi: number) {
  // polished aluminium, as the cooled charge's pipes (one bank's)
  for (const c of [CHARGE_PIPES.hot[bi]]) sweepTube(b, c, (u) => chargeRadius(u * c.total, c.total), MAT_AIR_DUCT, { segments: 32 });
}

// The cooled charge's pipes, from the intercoolers to the distributors: drawn more as metal than as glass, polished
// aluminium, each with a welded elbow at each end (the welds are with the couplers, solid)
export const COOL_R = 27; // round and thick

export function buildCoolPipes(b: MeshBuilder, bi: number) {
  for (const c of [CHARGE_PIPES.cool[bi]]) {
    sweepTube(b, c, () => COOL_R, MAT_COOL_PIPE, { segments: 44 });
  }
}

// The metal couplers: at the tanks, and at the throttle bodies (those at the compressors' outlets are with the turbochargers)
export function buildChargeCouplers(b: MeshBuilder) {
  // (the hot pipes are bolted on at both ends by flanges: at the compressor, with the turbocharger; at the tank, on the
  // tank's cast port: its flange cast with it, a gasket, the pipe's flange)
  for (const zs of [-1, 1]) {
    const c = CHARGE_PIPES.hot[zs < 0 ? 0 : 1];
    const end = c.pts[c.pts.length - 1];

    castHotPort(b, zs);
    flangeJoint(b, end, [1, 0, 0], { ...PORT_JOINT, cast: MAT_IC_TANK });
  }

  for (const c of CHARGE_PIPES.cool) {
    const bi = CHARGE_PIPES.cool.indexOf(c);
    const { s0, s1 } = COOL_ELBOW[bi];

    // its U is a mandrel-bent piece welded in: a bead where it starts and where it ends, and one more where the pipe goes
    // into the throttle's mouth, on the plenum
    weld(b, c, s0, COOL_R);
    weld(b, c, s1, COOL_R);
    weld(b, c, c.total - 2.2, COOL_R);
    coolElbowDetail(b, c, s0, s1);

    // the cooled pipe's root on the tank (drawn solid, as the tank is): a neck cast as one with the tank, blending out of
    // its inner end into a round throat, and the cast flange on it, the same casting; then a gasket and the pipe's
    // flange, dark grey metal, held by eight bolts with their washers and nuts
    const zs = bi === 0 ? -1 : 1;
    const p0 = c.pts[0];
    const dir = vnorm(vsub(c.pts[2], c.pts[0]));

    castOutlet(b, zs);
    flangeJoint(b, p0, dir, {
      pipeR: COOL_R - 1,
      r: COOL_R + 16,
      castT: 10,
      mateT: 8,
      bolts: 8,
      pitch: COOL_R + 9.5,
      cast: MAT_IC_TANK, // cast with the tank
      mate: MAT_EXH_GUNMETAL,
      gasket: MAT_PIPE_BLACK,
      bolt: 4.4,
    });
  }

}

// The cast outlet on a high tank's inner end: a loft from a rounded rectangle, sunk in the tank, out through its end,
// to the round throat under the flange; smooth normals, the same casting as the tank
function castOutlet(b: MeshBuilder, zs: number) {
  const N = 48;
  const rings = OUT_RINGS.map(([y, hx, hz, n]) => {
    const pts: FwVec3[] = [];

    for (let j = 0; j < N; j++) {
      const a = (j / N) * TAU;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const px = hx * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const pz = hz * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);

      pts.push(coolOutLocal(zs, px, y, OUT_Z0 + pz));
    }

    return { pts, mid: coolOutLocal(zs, 0, y, OUT_Z0) };
  });
  // the throat runs on, round, into the cast flange
  const last = rings[rings.length - 1];
  const yEnd = OUT_FLANGE_Y - 4;

  rings.push({ pts: last.pts.map((q) => vadd(q, vsub(coolOutLocal(zs, 0, yEnd, OUT_Z0), last.mid))), mid: coolOutLocal(zs, 0, yEnd, OUT_Z0) });

  loftCast(b, rings);
}

// A cast neck's skin: a loft through rings of points round their middles, smooth normals, the tank's casting
function loftCast(b: MeshBuilder, rings: Array<{ pts: FwVec3[]; mid: FwVec3 }>) {
  const N = rings[0].pts.length;
  const P = (i: number, j: number) => rings[i].pts[((j % N) + N) % N];
  const normal = (i: number, j: number): FwVec3 => {
    const around = vsub(P(i, j + 1), P(i, j - 1));
    const along = vsub(P(Math.min(rings.length - 1, i + 1), j), P(Math.max(0, i - 1), j));
    const n = vnorm(vcross(around, along));
    const out = vsub(P(i, j), rings[i].mid);

    return n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0 ? vscale(n, -1) : n;
  };

  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < N; j++) {
      const v: Array<[FwVec3, FwVec3]> = [[P(i, j), normal(i, j)], [P(i, j + 1), normal(i, j + 1)], [P(i + 1, j + 1), normal(i + 1, j + 1)], [P(i + 1, j), normal(i + 1, j)]];

      for (const k of [0, 1, 2, 0, 2, 3]) b.push(v[k][0], v[k][1], MAT_IC_TANK, 1);
    }
  }
}

// The hot pipe's cast port on a low tank: a neck that grows out of the tank's face toward the engine, from a broad rounded
// oblong sunk in the casting to the round throat under the flange
function castHotPort(b: MeshBuilder, zs: number) {
  const N = 40;
  const spec: Array<[number, number, number, number]> = [[24, 30, 20, 8], [40, 28, 21, 5], [46, 24, 22.5, 3], [51, 21.5, 21.5, 2]];
  const rings = spec.map(([x, hy, hz, n]) => {
    const pts: FwVec3[] = [];

    for (let j = 0; j < N; j++) {
      const a = (j / N) * TAU;
      const c = Math.cos(a);
      const sn = Math.sin(a);

      pts.push(hotPortLocal(zs, x, HOT_PORT_Y + hy * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), HOT_PORT_Z + hz * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n)));
    }

    return { pts, mid: hotPortLocal(zs, x, HOT_PORT_Y, HOT_PORT_Z) };
  });

  loftCast(b, rings);
}

// The elbow's details, solid: a machined band round the stub just above the flange's weld; on the elbow's outside, at
// its middle, a welded boss with the charge-air temperature sensor screwed in, its hex and its connector, the wire led
// back along the run
function coolElbowDetail(b: MeshBuilder, c: Curve, s0: number, s1: number) {
  const at: FwVec3 = [0, 0, 0];
  const dir: FwVec3 = [0, 0, 0];
  const frame = (s: number) => {
    curveAt(c, s, at, dir);

    const p: FwVec3 = [at[0], at[1], at[2]];
    const d: FwVec3 = [dir[0], dir[1], dir[2]];

    return { p, d };
  };

  // the band round the stub: a turned ring, a hair proud of the pipe
  {
    const { p, d } = frame(c.total - 9);
    const e1 = vnorm(vcross(d, [0, 1, 0]));
    const e2 = vcross(d, e1);

    b.prismDir(vadd(p, vscale(d, -3)), d, e1, e2, COOL_R + 1.6, 6, 48, 0, MAT_STEEL_BRIGHT, MAT_ALU_TURNED);
  }

  // the sensor, on the elbow's outside at its middle: the outward way there is away from the bend's centre
  {
    const sm = (s0 + s1) / 2;
    const { p: pm } = frame(sm);
    const { p: pa } = frame(s0);
    const { p: pb } = frame(s1);
    const mid = vscale(vadd(pa, pb), 0.5);
    const out = vnorm(vsub(pm, mid));
    const e1 = vnorm(vcross(out, [0, 1, 0]));
    const e2 = vcross(out, e1);
    const skin = vadd(pm, vscale(out, COOL_R - 3));

    b.prismDir(skin, out, e1, e2, 8.5, 6, 24, 0, MAT_WELD, MAT_WELD); // the weld round the boss
    b.prismDir(vadd(skin, vscale(out, 1)), out, e1, e2, 7.2, 8, 24, 0, MAT_ALU_TURNED, MAT_ALU_TURNED); // the boss
    b.prismDir(vadd(skin, vscale(out, 9)), out, e1, e2, 7, 5, 6, 0.2, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE); // the sensor's hex
    b.prismDir(vadd(skin, vscale(out, 14)), out, e1, e2, 4.6, 5, 20, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
    b.prismDir(vadd(skin, vscale(out, 19)), out, e1, e2, 5.6, 9, 20, 0, MAT_PIPE_BLACK, MAT_PIPE_BLACK); // its connector

    // the wire: out of the connector, and back along the top of the run
    const top: FwVec3 = [0, -1, 0];
    const plug = vadd(skin, vscale(out, 28));
    const { p: back } = frame(Math.max(4, s0 - 70));
    const along = vadd(back, vscale(top, COOL_R + 5));

    sweepTube(b, roundedCurve([plug, vadd(plug, vscale(out, 8)), vadd(vadd(pa, vscale(top, COOL_R + 5)), vscale(out, 6)), along], 10, 3), () => 1.8, MAT_PIPE_BLACK, { segments: 8, capEnd: true });
  }
}

// The blow-off valves: on each hot pipe, a little way up from the compressor, a short branch to a black anodised valve
// with a cap and a vent trumpet; it lets the boost out when the throttle closes
export const BOV_AT = 0.28; // how far along the hot pipe, as a share of it

export function buildBlowOffValves(b: MeshBuilder) {
  for (let bi = 0; bi < CHARGE_PIPES.hot.length; bi++) {
    const c = CHARGE_PIPES.hot[bi];
    const zs = MODULES[bi].bank.phi > 0 ? -1 : 1;
    const at: FwVec3 = [0, 0, 0];
    const dir: FwVec3 = [0, 0, 0];

    curveAt(c, c.total * BOV_AT, at, dir);

    // the branch stands out sideways from the pipe, away from the engine
    const side = vnorm(vcross(dir, [0, 1, 0]));
    const out = vscale(side, Math.sign(side[2] || 1) === zs ? 1 : -1);
    const e1 = vnorm(vcross(out, Math.abs(out[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
    const e2 = vcross(out, e1);
    const neckEnd = vadd(at, vscale(out, CHARGE_R + 12));

    sweepTube(b, curveFromPoints([at, neckEnd], 3), () => 10, MAT_PIPE_BLACK, { segments: 20 });
    b.prismDir(neckEnd, out, e1, e2, 17, 30, 28, 0, MAT_PIPE_BLACK, MAT_PIPE_BLACK);

    for (const k of [7, 15, 23]) b.prismDir(vadd(neckEnd, vscale(out, k)), out, e1, e2, 18, 1.4, 28, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);

    b.prismDir(vadd(neckEnd, vscale(out, 30)), out, e1, e2, 13, 7, 28, 0, MAT_PIPE_BLACK, MAT_STEEL_BRIGHT);

    // the vent: a short trumpet pointing down from the valve's side
    const ventAt = vadd(vadd(neckEnd, vscale(out, 12)), [0, 17, 0]);

    sweepTube(b, curveFromPoints([ventAt, vadd(ventAt, [0, 16, 0])], 2), (u) => 6 + 4 * u * u, MAT_ALU_TURNED, { segments: 18 });

    // the vacuum line, from the valve's cap to the plenum's cover
    const cap = vadd(neckEnd, vscale(out, 37));

    sweepTube(b, roundedCurve([cap, vadd(cap, vscale(out, 14)), vadd(cap, [40, -60, -zs * 20])], 12, 3), () => 2, MAT_PIPE_BLACK, { segments: 8, capEnd: true });
  }
}
