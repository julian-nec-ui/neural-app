// A chain link, inner (with rollers) or outer (with riveted pins).

import type { createMeshBuilder } from "../builder";
import { MAT_CT_EDGE, MAT_CT_GROOVE, MAT_VT_PIN_HEAD, MAT_VT_PLATE, MAT_VT_PLATE_OUT, MAT_VT_ROLLER } from "../materials";
import { VT_PITCH } from "./chainPath";

/* ---------------- chain links ---------------- */

// Local frame: origin at the first joint, the next joint is at +Y = pitch.
export function buildChainLink(b: ReturnType<typeof createMeshBuilder>, outer: boolean) {
  const p = VT_PITCH;
  const rEnd = 3.9;
  const waist = 1.9; // a deep waist: the plates are figure-eights, with room to see the teeth through
  const t = 1.05;
  const bevel = 0.4;
  const plateX = outer ? 4.65 : 3.35;
  const mat = outer ? MAT_VT_PLATE_OUT : MAT_VT_PLATE;

  // Plate outline in (y, z), counter-clockwise: two rounded ends joined by a waist
  const outline: Array<[number, number]> = [];
  const arcN = 10;

  for (let k = 0; k <= arcN; k++) {
    const phi = Math.PI / 2 + (k / arcN) * Math.PI;
    outline.push([rEnd * Math.cos(phi), rEnd * Math.sin(phi)]);
  }

  const edge = (sign: number, from: number, to: number) => {
    const steps = 10;

    for (let k = 1; k < steps; k++) {
      const y = from + ((to - from) * k) / steps;
      const w = Math.pow(Math.sin((Math.PI * y) / p), 1.1);
      outline.push([y, sign * (rEnd - (rEnd - waist) * w)]);
    }
  };

  edge(-1, 0, p);

  for (let k = 0; k <= arcN; k++) {
    const phi = -Math.PI / 2 + (k / arcN) * Math.PI;
    outline.push([p + rEnd * Math.cos(phi), rEnd * Math.sin(phi)]);
  }

  edge(1, p, 0);

  const n = outline.length;

  // Outward normals round the outline, and the outline pulled in by the bevel
  const out = outline.map((_, i): [number, number] => {
    const a = outline[(i - 1 + n) % n];
    const c = outline[(i + 1) % n];
    const ty = c[0] - a[0];
    const tz = c[1] - a[1];
    const len = Math.hypot(ty, tz) || 1;

    return [tz / len, -ty / len];
  });
  const inner = outline.map((o, i): [number, number] => [o[0] - out[i][0] * bevel, o[1] - out[i][1] * bevel]);

  for (const side of [-1, 1]) {
    // The plate's outer face (away from the chain's centre line), its inner
    // face, and where the bevel starts
    const xo = side * (plateX + t / 2);
    const xi = side * (plateX - t / 2);
    const xb = xo - side * bevel;

    // Outer face: bright in the middle, shaded toward the pin ends and
    // the edges, so every plate reads as a slightly domed piece of metal
    const shade = (index: number) => {
      const y = outline[index][0];
      const end = Math.min(y, p - y);

      return end < 1.2 ? 0.5 : index < n / 2 ? 0.86 : 0.78;
    };

    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n;

      b.flatTri(
        [xo, p / 2, 0],
        [xo, inner[k][0], inner[k][1]],
        [xo, inner[k2][0], inner[k2][1]],
        [side, 0, 0], mat, 1, shade(k), shade(k2)
      );

      // The bevel: a thin bright rim round the whole plate
      b.flatQuad(
        [xb, outline[k][0], outline[k][1]], [xb, outline[k2][0], outline[k2][1]],
        [xo, inner[k2][0], inner[k2][1]], [xo, inner[k][0], inner[k][1]],
        [0.7 * side, 0.7 * out[k][0], 0.7 * out[k][1]], MAT_CT_EDGE, 1
      );

      // The edge of the plate, from the inner face to the bevel
      const a = outline[k];
      const c = outline[k2];
      const ny = c[1] - a[1];
      const nz = -(c[0] - a[0]);

      b.flatQuad(
        [xi, a[0], a[1]], [xi, c[0], c[1]], [xb, c[0], c[1]], [xb, a[0], a[1]],
        [0, ny, nz],
        mat, 0.45
      );
    }
  }

  const joints = [0, p];

  for (const y of joints) {
    if (outer) {
      // Pin ends, riveted over the outer plates on both sides: a dark
      // counterbore, the domed head, and a punch mark in the middle
      for (const sg of [-1, 1]) {
        const xs = sg * (plateX + t / 2);

        b.revolve({ x0: xs + sg * 0.02, r0: 2.2, x1: xs + sg * 0.02, r1: 3.0, n: [sg, 0], m: MAT_CT_GROOVE, cy: y, steps: 16 });
        b.revolve({ x0: xs, r0: 0, x1: xs, r1: 2.2, n: [sg, 0], m: MAT_VT_PIN_HEAD, cy: y, steps: 16 });
        b.revolve({ x0: xs, r0: 2.2, x1: xs + sg * 0.55, r1: 1.9, n: [0.4 * sg, 0.9], m: MAT_VT_PIN_HEAD, cy: y, steps: 16 });
        b.revolve({ x0: xs + sg * 0.55, r0: 0.5, x1: xs + sg * 0.55, r1: 1.9, n: [sg, 0], m: MAT_VT_PIN_HEAD, cy: y, steps: 16 });
        b.revolve({ x0: xs + sg * 0.56, r0: 0, x1: xs + sg * 0.56, r1: 0.5, n: [sg, 0], m: MAT_CT_GROOVE, cy: y, steps: 10 });
      }
    } else {
      // Rollers between the inner plates
      b.revolve({ x0: -2.7, r0: 2.95, x1: 2.7, r1: 2.95, n: [0, 1], m: MAT_VT_ROLLER, cy: y, steps: 20, occ0: 0.55, occ1: 0.55 });
      b.revolve({ x0: 2.7, r0: 1.6, x1: 2.7, r1: 2.95, n: [1, 0], m: MAT_VT_ROLLER, cy: y, steps: 20, occ0: 0.45, occ1: 0.6 });
    }
  }
}
