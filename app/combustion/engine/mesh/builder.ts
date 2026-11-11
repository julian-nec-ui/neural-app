// The mesh builder every part is made with: a vertex is position, normal, colour, shine, occlusion, pattern and wetness.

import { TAU } from "../core/constants";

/* =========================================================
   SHARED MESH HELPERS

   Every 3D part (flywheel, crankshaft, rods, pistons) is built
   with these. A vertex is: position 3, normal 3, color 3,
   shine, occlusion, pattern.
   ========================================================= */

export type FwVec3 = [number, number, number];

export type FwMaterial = {
  color: FwVec3;
  shine: number;
  // 0 plain, 1 turned (rings round the X axis), 2 cast grain,
  // 3 ground, 4 bands along local Y, 5 bands along local X, 6 coated skirt
  pattern: number;
  // 0 dry .. 1 soaked in oil (sheen, amber highlights, darker metal)
  wet: number;
};

export const FW_STRIDE = 13; // position 3, normal 3, color 3, shine, occlusion, pattern, wet

export const fwMat = (
  color: FwVec3,
  shine: number,
  pattern = 0,
  wet = 0
): FwMaterial => ({ color, shine, pattern, wet });

export function createMeshBuilder(defaultSteps: number) {
  const out: number[] = [];

  const polar = (
    x: number,
    r: number,
    t: number,
    cy = 0,
    cz = 0
  ): FwVec3 => [x, cy + r * Math.cos(t), cz + r * Math.sin(t)];

  // A turn applied to everything that is pushed, for building a part at an angle: set it, build, clear it
  let turn: ((p: FwVec3, n: FwVec3) => [FwVec3, FwVec3]) | null = null;
  // and a stretch across (along Z), after the turn: for widening a whole part about its middle plane (the heads)
  let stretchZ = 1;

  const push = (
    p0: FwVec3,
    n0: FwVec3,
    m: FwMaterial,
    occ: number
  ) => {
    const [p1, n1] = turn ? turn(p0, n0) : [p0, n0];
    let p = p1;
    let n = n1;

    if (stretchZ !== 1) {
      p = [p1[0], p1[1], p1[2] * stretchZ];

      const nz = n1[2] / stretchZ;
      const l = Math.hypot(n1[0], n1[1], nz) || 1;

      n = [n1[0] / l, n1[1] / l, nz / l];
    }

    out.push(
      p[0], p[1], p[2],
      n[0], n[1], n[2],
      m.color[0] / 255,
      m.color[1] / 255,
      m.color[2] / 255,
      m.shine / 255,
      occ,
      m.pattern,
      m.wet
    );
  };

  const flatNormal = (
    a: FwVec3,
    b: FwVec3,
    c: FwVec3,
    hint: FwVec3
  ): FwVec3 => {
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];

    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;

    const length = Math.hypot(nx, ny, nz) || 1;
    nx /= length;
    ny /= length;
    nz /= length;

    if (nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }

    return [nx, ny, nz];
  };

  const flatTri = (
    a: FwVec3,
    b: FwVec3,
    c: FwVec3,
    hint: FwVec3,
    m: FwMaterial,
    oa = 1,
    ob = oa,
    oc = oa
  ) => {
    const n = flatNormal(a, b, c, hint);
    push(a, n, m, oa);
    push(b, n, m, ob);
    push(c, n, m, oc);
  };

  const flatQuad = (
    a: FwVec3,
    b: FwVec3,
    c: FwVec3,
    d: FwVec3,
    hint: FwVec3,
    m: FwMaterial,
    occ = 1
  ) => {
    flatTri(a, b, c, hint, m, occ);
    flatTri(a, c, d, hint, m, occ);
  };

  const flatFan = (
    center: FwVec3,
    ring: FwVec3[],
    hint: FwVec3,
    m: FwMaterial,
    occ = 1
  ) => {
    for (let i = 0; i < ring.length; i++) {
      flatTri(center, ring[i], ring[(i + 1) % ring.length], hint, m, occ);
    }
  };

  /* Surface of revolution round an axis parallel to X, from one
     straight profile segment. `n` is the wanted normal direction
     in the (x, r) plane. */
  const revolve = (s: {
    x0: number;
    r0: number;
    x1: number;
    r1: number;
    n: [number, number];
    m: FwMaterial;
    occ0?: number;
    occ1?: number;
    mask?: (step: number) => boolean;
    cy?: number;
    cz?: number;
    from?: number;
    to?: number;
    steps?: number;
  }) => {
    let nx = -(s.r1 - s.r0);
    let nr = s.x1 - s.x0;
    const length = Math.hypot(nx, nr) || 1;
    nx /= length;
    nr /= length;

    if (nx * s.n[0] + nr * s.n[1] < 0) {
      nx = -nx;
      nr = -nr;
    }

    const o0 = s.occ0 ?? 1;
    const o1 = s.occ1 ?? 1;
    const steps = s.steps ?? defaultSteps;
    const from = s.from ?? 0;
    const span = (s.to ?? TAU) - from;
    const cy = s.cy ?? 0;
    const cz = s.cz ?? 0;

    for (let i = 0; i < steps; i++) {
      if (s.mask && !s.mask(i)) continue;

      const ta = from + (i / steps) * span;
      const tb = from + ((i + 1) / steps) * span;

      const a = polar(s.x0, s.r0, ta, cy, cz);
      const b = polar(s.x0, s.r0, tb, cy, cz);
      const c = polar(s.x1, s.r1, tb, cy, cz);
      const d = polar(s.x1, s.r1, ta, cy, cz);

      const na: FwVec3 = [nx, nr * Math.cos(ta), nr * Math.sin(ta)];
      const nb: FwVec3 = [nx, nr * Math.cos(tb), nr * Math.sin(tb)];

      push(a, na, s.m, o0);
      push(b, nb, s.m, o0);
      push(c, nb, s.m, o1);

      push(a, na, s.m, o0);
      push(c, nb, s.m, o1);
      push(d, na, s.m, o1);
    }
  };

  /* Same, round an axis parallel to Y (pistons). The profile is
     (y, r); the angle runs from +X toward +Z. */
  const revolveY = (s: {
    y0: number;
    r0: number;
    y1: number;
    r1: number;
    n: [number, number];
    m: FwMaterial;
    occ0?: number;
    occ1?: number;
    mask?: (step: number) => boolean;
    steps?: number;
  }) => {
    let ny = -(s.r1 - s.r0);
    let nr = s.y1 - s.y0;
    const length = Math.hypot(ny, nr) || 1;
    ny /= length;
    nr /= length;

    if (ny * s.n[0] + nr * s.n[1] < 0) {
      ny = -ny;
      nr = -nr;
    }

    const o0 = s.occ0 ?? 1;
    const o1 = s.occ1 ?? 1;
    const steps = s.steps ?? defaultSteps;

    for (let i = 0; i < steps; i++) {
      if (s.mask && !s.mask(i)) continue;

      const ta = (i / steps) * TAU;
      const tb = ((i + 1) / steps) * TAU;

      const a: FwVec3 = [s.r0 * Math.cos(ta), s.y0, s.r0 * Math.sin(ta)];
      const b: FwVec3 = [s.r0 * Math.cos(tb), s.y0, s.r0 * Math.sin(tb)];
      const c: FwVec3 = [s.r1 * Math.cos(tb), s.y1, s.r1 * Math.sin(tb)];
      const d: FwVec3 = [s.r1 * Math.cos(ta), s.y1, s.r1 * Math.sin(ta)];

      const na: FwVec3 = [nr * Math.cos(ta), ny, nr * Math.sin(ta)];
      const nb: FwVec3 = [nr * Math.cos(tb), ny, nr * Math.sin(tb)];

      push(a, na, s.m, o0);
      push(b, nb, s.m, o0);
      push(c, nb, s.m, o1);

      push(a, na, s.m, o0);
      push(c, nb, s.m, o1);
      push(d, na, s.m, o1);
    }
  };

  /* Flat disc facing +X (or -X with `facing` = -1). */
  const disc = (
    x: number,
    r: number,
    t: number,
    radius: number,
    m: FwMaterial,
    sides = 18,
    cy = 0,
    cz = 0,
    facing = 1
  ) => {
    const px = cy + r * Math.cos(t);
    const pz = cz + r * Math.sin(t);
    const ring: FwVec3[] = [];

    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * TAU;
      ring.push([x, px + radius * Math.cos(a), pz + radius * Math.sin(a)]);
    }

    flatFan([x, px, pz], ring, [facing, 0, 0], m);
  };

  /* Small flat disc lying on a cylinder (axis parallel to X through
     (cy, cz)): oil holes and paint marks. */
  const radialDisc = (
    x: number,
    cy: number,
    cz: number,
    r: number,
    theta: number,
    radius: number,
    m: FwMaterial,
    sides = 12
  ) => {
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const center: FwVec3 = [x, cy + r * ct, cz + r * st];
    const ring: FwVec3[] = [];

    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * TAU;
      const u = radius * Math.cos(a); // along X
      const v = radius * Math.sin(a); // along the tangent
      ring.push([x + u, center[1] - v * st, center[2] + v * ct]);
    }

    flatFan(center, ring, [0, ct, st], m);
  };

  /* Short prism standing on the +X side of a face (bolt heads,
     washers, dowel pins). Round ones get smooth side normals. */
  const prism = (
    x: number,
    r: number,
    t: number,
    radius: number,
    height: number,
    sides: number,
    rot: number,
    topMat: FwMaterial,
    sideMat: FwMaterial
  ) => {
    const cy = r * Math.cos(t);
    const cz = r * Math.sin(t);
    const base: FwVec3[] = [];
    const top: FwVec3[] = [];
    const angles: number[] = [];

    for (let k = 0; k < sides; k++) {
      const a = rot + (k / sides) * TAU;
      angles.push(a);
      const dy = radius * Math.cos(a);
      const dz = radius * Math.sin(a);

      base.push([x, cy + dy, cz + dz]);
      top.push([x + height, cy + dy, cz + dz]);
    }

    for (let k = 0; k < sides; k++) {
      const k2 = (k + 1) % sides;

      if (sides >= 12) {
        const n1: FwVec3 = [0, Math.cos(angles[k]), Math.sin(angles[k])];
        const n2: FwVec3 = [0, Math.cos(angles[k2]), Math.sin(angles[k2])];

        push(base[k], n1, sideMat, 1);
        push(base[k2], n2, sideMat, 1);
        push(top[k2], n2, sideMat, 1);

        push(base[k], n1, sideMat, 1);
        push(top[k2], n2, sideMat, 1);
        push(top[k], n1, sideMat, 1);
      } else {
        const mid = rot + ((k + 0.5) / sides) * TAU;

        flatQuad(
          base[k], base[k2], top[k2], top[k],
          [0, Math.cos(mid), Math.sin(mid)],
          sideMat
        );
      }
    }

    flatFan([x + height, cy, cz], top, [1, 0, 0], topMat);
  };

  /* Prism along any axis: `b` and `c` span the cross-section. */
  const prismDir = (
    center: FwVec3,
    dir: FwVec3,
    b: FwVec3,
    c: FwVec3,
    radius: number,
    height: number,
    sides: number,
    rot: number,
    topMat: FwMaterial,
    sideMat: FwMaterial
  ) => {
    const base: FwVec3[] = [];
    const top: FwVec3[] = [];
    const radial: FwVec3[] = [];

    for (let k = 0; k < sides; k++) {
      const a = rot + (k / sides) * TAU;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const rx = ca * b[0] + sa * c[0];
      const ry = ca * b[1] + sa * c[1];
      const rz = ca * b[2] + sa * c[2];

      radial.push([rx, ry, rz]);
      base.push([
        center[0] + radius * rx,
        center[1] + radius * ry,
        center[2] + radius * rz,
      ]);
      top.push([
        center[0] + radius * rx + height * dir[0],
        center[1] + radius * ry + height * dir[1],
        center[2] + radius * rz + height * dir[2],
      ]);
    }

    for (let k = 0; k < sides; k++) {
      const k2 = (k + 1) % sides;

      if (sides >= 12) {
        push(base[k], radial[k], sideMat, 1);
        push(base[k2], radial[k2], sideMat, 1);
        push(top[k2], radial[k2], sideMat, 1);

        push(base[k], radial[k], sideMat, 1);
        push(top[k2], radial[k2], sideMat, 1);
        push(top[k], radial[k], sideMat, 1);
      } else {
        const hint: FwVec3 = [
          radial[k][0] + radial[k2][0],
          radial[k][1] + radial[k2][1],
          radial[k][2] + radial[k2][2],
        ];

        flatQuad(base[k], base[k2], top[k2], top[k], hint, sideMat);
      }
    }

    flatFan(
      [
        center[0] + height * dir[0],
        center[1] + height * dir[1],
        center[2] + height * dir[2],
      ],
      top,
      dir,
      topMat
    );
  };

  /* Axis-aligned box. */
  const box = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
    m: FwMaterial,
    occ = 1
  ) => {
    const p = (x: number, y: number, z: number): FwVec3 => [x, y, z];

    flatQuad(p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1), p(x1, y0, z1), [1, 0, 0], m, occ);
    flatQuad(p(x0, y0, z0), p(x0, y1, z0), p(x0, y1, z1), p(x0, y0, z1), [-1, 0, 0], m, occ);
    flatQuad(p(x0, y1, z0), p(x1, y1, z0), p(x1, y1, z1), p(x0, y1, z1), [0, 1, 0], m, occ);
    flatQuad(p(x0, y0, z0), p(x1, y0, z0), p(x1, y0, z1), p(x0, y0, z1), [0, -1, 0], m, occ);
    flatQuad(p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1), [0, 0, 1], m, occ);
    flatQuad(p(x0, y0, z0), p(x1, y0, z0), p(x1, y1, z0), p(x0, y1, z0), [0, 0, -1], m, occ);
  };

  return {
    out,
    polar,
    push,
    flatNormal,
    flatTri,
    flatQuad,
    flatFan,
    revolve,
    revolveY,
    disc,
    radialDisc,
    prism,
    prismDir,
    box,
    setTurn: (fn: ((p: FwVec3, n: FwVec3) => [FwVec3, FwVec3]) | null) => {
      turn = fn;
    },
    setStretchZ: (k: number) => {
      stretchZ = k;
    },
  };
}
