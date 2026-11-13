// A perforated plate: polished sheet steel punched with a close grid of big round holes, rows offset by half a pitch, and
// between every three of them a small hole on a tiny raised dimple. Each big hole has its punched wall, bright where the
// light falls into it, a fine countersunk lip round its mouth, and darkness behind it. It is laid on a face of the engine
// as a flat outline in (y, z): the holes are punched only where a whole cell of the grid lies inside the outline, a margin
// in from its edge; round the edge the plate is left plain.
//
// Built facing -x (toward the front of the engine), its face at xFace, `thick` deep.

import type { FwMaterial, FwVec3 } from "./builder";
import { MAT_BPERF_DIMPLE, MAT_BPERF_HOLE, MAT_BPERF_LIP, MAT_BPERF_PLATE, MAT_BPERF_WALL } from "./materials";
import { triangulate } from "./shapes";
import type { P2 } from "./shapes";
import type { MeshBuilder } from "./tubes";

const PERF = {
  pitch: 22, // from one big hole's middle to the next, along a row
  r: 5.2, // a big hole's radius (30% smaller than it was)
  lip: 1.1, // its countersunk lip, round its mouth
  small: 0.9, // a small hole's radius (30% smaller)
  dimple: 2.05, // and the dimple it is punched in
  margin: 7, // the plain border round the punched field
  seg: 24, // the steps round a big hole (a multiple of six, so that the cell's corners are on it)
};

// y, z of a point of the outline; the plate's points in space
const S = (x: number, q: P2): FwVec3 => [x, q[0], q[1]];

function inside(poly: P2[], p: P2): boolean {
  let c = false;

  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];

    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }

  return c;
}

function distToEdges(poly: P2[], p: P2): number {
  let m = 1e9;

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)));

    m = Math.min(m, Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t));
  }

  return m;
}

// The outline clipped to a convex polygon (Sutherland–Hodgman: the outline may be concave, the window must be convex)
function clip(subject: P2[], win: P2[]): P2[] {
  let out = subject;
  const ccw = win.reduce((s, p, i) => s + (p[0] * win[(i + 1) % win.length][1] - win[(i + 1) % win.length][0] * p[1]), 0) > 0;

  for (let i = 0; i < win.length && out.length; i++) {
    const a = win[i];
    const b = win[(i + 1) % win.length];
    const inSide = (p: P2) => (ccw ? 1 : -1) * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) >= 0;
    const cut = (p: P2, q: P2): P2 => {
      const d1 = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      const d2 = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
      const t = d1 / (d1 - d2);

      return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    };
    const next: P2[] = [];

    for (let k = 0; k < out.length; k++) {
      const p = out[k];
      const q = out[(k + 1) % out.length];

      if (inSide(q)) {
        if (!inSide(p)) next.push(cut(p, q));
        next.push(q);
      } else if (inSide(p)) {
        next.push(cut(p, q));
      }
    }

    out = next;
  }

  return out;
}

// `keepOut`: circles (y, z, radius) left plain, unpunched (where something passes through the plate); `margin` the plain
// border round its edge
export function buildPerforatedPlate(b: MeshBuilder, outline: P2[], xFace: number, thick: number, keepOut: Array<[number, number, number]> = [], margin = PERF.margin) {
  const { pitch, r, lip, small, dimple, seg } = PERF;
  const h = (pitch * Math.sqrt(3)) / 2; // between rows
  const R = pitch / Math.sqrt(3); // a cell's corner, from its middle
  const front: FwVec3 = [-1, 0, 0];
  const xBack = xFace + thick;
  const ys = outline.map((q) => q[0]);
  const zs = outline.map((q) => q[1]);
  const [y0, y1, z0, z1] = [Math.min(...ys), Math.max(...ys), Math.min(...zs), Math.max(...zs)];
  const yc = (y0 + y1) / 2;
  const zc = (z0 + z1) / 2;
  // a cell's corner k (k from 0 to 5), as (y, z): at 60k degrees from +y toward +z (its neighbours are at 30 + 60k)
  const corner = (c: P2, k: number): P2 => {
    const a = ((60 * k) * Math.PI) / 180;

    return [c[0] + R * Math.cos(a), c[1] + R * Math.sin(a)];
  };
  const quad = (p0: FwVec3, p1: FwVec3, p2: FwVec3, p3: FwVec3, n0: FwVec3, n1: FwVec3, m: FwMaterial, o0 = 1, o1 = 1) => {
    b.push(p0, n0, m, o0);
    b.push(p1, n0, m, o0);
    b.push(p2, n1, m, o1);
    b.push(p0, n0, m, o0);
    b.push(p2, n1, m, o1);
    b.push(p3, n1, m, o1);
  };

  // darkness behind the holes: a black sheet just behind the plate, over all of the outline
  for (const [i, j, k] of triangulate(outline)) {
    b.push(S(xBack + 0.3, outline[i]), front, MAT_BPERF_HOLE, 0.4);
    b.push(S(xBack + 0.3, outline[j]), front, MAT_BPERF_HOLE, 0.4);
    b.push(S(xBack + 0.3, outline[k]), front, MAT_BPERF_HOLE, 0.4);
  }

  const rows = Math.ceil((y1 - y0) / h / 2) + 2;
  const cols = Math.ceil((z1 - z0) / pitch / 2) + 2;
  const smallAt = new Set<string>();

  for (let jr = -rows; jr <= rows; jr++) {
    for (let ic = -cols; ic <= cols; ic++) {
      const c: P2 = [yc + jr * h, zc + ic * pitch + (jr & 1 ? pitch / 2 : 0)];
      const hex: P2[] = [0, 1, 2, 3, 4, 5].map((k) => corner(c, k));
      const whole = hex.every((q) => inside(outline, q) && distToEdges(outline, q) > margin) && distToEdges(outline, c) > R + margin
        && keepOut.every(([ky, kz, kr]) => Math.hypot(c[0] - ky, c[1] - kz) > kr + R);

      if (!whole) {
        // the plain border: the part of this cell inside the outline, solid
        const part = clip(outline, hex);

        if (part.length >= 3) {
          for (const [i, j, k] of triangulate(part)) {
            b.push(S(xFace, part[i]), front, MAT_BPERF_PLATE, 1);
            b.push(S(xFace, part[j]), front, MAT_BPERF_PLATE, 1);
            b.push(S(xFace, part[k]), front, MAT_BPERF_PLATE, 1);
          }
        }

        continue;
      }

      // a punched cell: its face from the cell's edge in to the hole's lip, the lip sloping down into the hole, and the
      // hole's wall back through the plate
      const at = (k: number, rad: number): P2 => {
        const a = (k / seg) * Math.PI * 2;

        return [c[0] + rad * Math.cos(a), c[1] + rad * Math.sin(a)];
      };
      const edge = (k: number): P2 => {
        // the cell's edge along the ray at this step: the hexagon's apothem over the cosine to the nearest edge's normal
        const a = (k / seg) * Math.PI * 2; // (y, z) = (cos, sin)
        const off = (((((a * 180) / Math.PI) - 30) % 60) + 60) % 60; // the edges' normals at 30, 90, ... degrees
        const d = pitch / 2 / Math.cos(((off > 30 ? off - 60 : off) * Math.PI) / 180);

        return [c[0] + d * Math.cos(a), c[1] + d * Math.sin(a)];
      };

      for (let k = 0; k < seg; k++) {
        const e0 = edge(k);
        const e1 = edge(k + 1);
        const l0 = at(k, r + lip);
        const l1 = at(k + 1, r + lip);
        const h0 = at(k, r);
        const h1 = at(k + 1, r);
        const rad0: FwVec3 = [0, -Math.cos((k / seg) * Math.PI * 2), -Math.sin((k / seg) * Math.PI * 2)]; // into the hole
        const rad1: FwVec3 = [0, -Math.cos(((k + 1) / seg) * Math.PI * 2), -Math.sin(((k + 1) / seg) * Math.PI * 2)];
        const lipN = (q: FwVec3): FwVec3 => {
          const l = Math.hypot(1, q[1] * 0.8, q[2] * 0.8);

          return [-1 / l, (q[1] * 0.8) / l, (q[2] * 0.8) / l];
        };

        // the face
        quad(S(xFace, e0), S(xFace, e1), S(xFace, l1), S(xFace, l0), front, front, MAT_BPERF_PLATE);
        // the lip, countersunk
        quad(S(xFace, l0), S(xFace, l1), S(xFace + lip * 0.7, h1), S(xFace + lip * 0.7, h0), lipN(rad0), lipN(rad1), MAT_BPERF_LIP);
        // the wall, through the plate, darker toward its back
        b.push(S(xFace + lip * 0.7, h0), rad0, MAT_BPERF_WALL, 1);
        b.push(S(xFace + lip * 0.7, h1), rad1, MAT_BPERF_WALL, 1);
        b.push(S(xBack, h1), rad1, MAT_BPERF_WALL, 0.35);
        b.push(S(xFace + lip * 0.7, h0), rad0, MAT_BPERF_WALL, 1);
        b.push(S(xBack, h1), rad1, MAT_BPERF_WALL, 0.35);
        b.push(S(xBack, h0), rad0, MAT_BPERF_WALL, 0.35);
      }

      // the small holes at its corners (each shared by three cells: drawn once)
      for (let k = 0; k < 6; k++) {
        const q = hex[k];
        const key = `${Math.round(q[0] * 10)},${Math.round(q[1] * 10)}`;

        if (smallAt.has(key)) continue;

        smallAt.add(key);

        // the dimple, a low cone standing a little out of the face, and the hole dark in its top
        const n = 12;
        const rise = 0.9;

        for (let m = 0; m < n; m++) {
          const a0 = (m / n) * Math.PI * 2;
          const a1 = ((m + 1) / n) * Math.PI * 2;
          const o = (a: number, rad: number): P2 => [q[0] + rad * Math.cos(a), q[1] + rad * Math.sin(a)];
          const cn = (a: number): FwVec3 => {
            const l = Math.hypot(1, 0.32);

            return [-1 / l, (0.32 * Math.cos(a)) / l, (0.32 * Math.sin(a)) / l];
          };

          quad(S(xFace - 0.05, o(a0, dimple)), S(xFace - 0.05, o(a1, dimple)), S(xFace - rise, o(a1, small + 0.5)), S(xFace - rise, o(a0, small + 0.5)), cn(a0), cn(a1), MAT_BPERF_DIMPLE, 1, 0.9);
          quad(S(xFace - rise, o(a0, small + 0.5)), S(xFace - rise, o(a1, small + 0.5)), S(xFace - rise + 0.05, o(a1, small)), S(xFace - rise + 0.05, o(a0, small)), front, front, MAT_BPERF_LIP);
          b.push(S(xFace - rise + 0.06, q), front, MAT_BPERF_HOLE, 0.5);
          b.push(S(xFace - rise + 0.06, o(a0, small)), front, MAT_BPERF_HOLE, 0.5);
          b.push(S(xFace - rise + 0.06, o(a1, small)), front, MAT_BPERF_HOLE, 0.5);
        }
      }
    }
  }
}
