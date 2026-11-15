// The connecting rod: small end, I-beam shank and split big end with its bearing shells and nuts.

import { L } from "../../core/constants";
import { MAT_CT_EDGE, MAT_CT_HOLE, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_CT_ROD, MAT_CT_ROD_FACE, MAT_CT_SEAM, MAT_CT_SHELL } from "../materials";
import { CT } from "./dimensions";
import type { MeshBuilder } from "../tubes";

// A rounded edge round an eye: a quarter round from its face (at x = sx * h, out to radius r - e) to its rim (radius r,
// at x = sx * (h - e)), about the eye's axis at y = cy
function eyeEdge(b: MeshBuilder, sx: number, h: number, r: number, e: number, cy: number, m: typeof MAT_CT_ROD) {
  const S = 4;

  for (let j = 0; j < S; j++) {
    const pa = (j / S) * (Math.PI / 2);
    const pb = ((j + 1) / S) * (Math.PI / 2);
    const pm = (pa + pb) / 2;

    b.revolve({
      x0: sx * (h - e + e * Math.sin(pa)), r0: r - e + e * Math.cos(pa),
      x1: sx * (h - e + e * Math.sin(pb)), r1: r - e + e * Math.cos(pb),
      n: [sx * Math.sin(pm), Math.cos(pm)], m, cy,
    });
  }
}

// A box with its edges rounded along x (its section in y, z a rounded rectangle), its two end faces set in by the rounding
function roundedLug(b: MeshBuilder, hx: number, y0: number, y1: number, z0: number, z1: number, r: number, m: typeof MAT_CT_ROD) {
  const pts: Array<[number, number, number, number]> = []; // y, z, normal y, normal z
  const corners: Array<[number, number, number]> = [[y1 - r, z1 - r, 0], [y0 + r, z1 - r, 0.5], [y0 + r, z0 + r, 1], [y1 - r, z0 + r, 1.5]];

  for (const [cy, cz, q] of corners) {
    for (let j = 0; j <= 3; j++) {
      const a = (q + j / 6) * Math.PI;

      pts.push([cy + r * Math.cos(a), cz + r * Math.sin(a), Math.cos(a), Math.sin(a)]);
    }
  }

  const n = pts.length;

  for (let k = 0; k < n; k++) {
    const p = pts[k];
    const q = pts[(k + 1) % n];

    b.push([-hx, p[0], p[1]], [0, p[2], p[3]], m, 1); b.push([-hx, q[0], q[1]], [0, q[2], q[3]], m, 1); b.push([hx, q[0], q[1]], [0, q[2], q[3]], m, 1);
    b.push([-hx, p[0], p[1]], [0, p[2], p[3]], m, 1); b.push([hx, q[0], q[1]], [0, q[2], q[3]], m, 1); b.push([hx, p[0], p[1]], [0, p[2], p[3]], m, 1);
  }

  for (const sx of [-1, 1]) {
    b.flatFan([sx * hx, (y0 + y1) / 2, (z0 + z1) / 2], pts.map((p): [number, number, number] => [sx * hx, p[0], p[1]]), [sx, 0, 0], m);
  }
}

// One rod, in its own frame: the small end at the origin, the big end at +Y = L
export function buildConnectingRod(b: MeshBuilder) {
  // Local frame: origin at the small end, the big end is at +Y = L.

  {
    // Small end: forged eye with a bronze bush
    const hT = 13.4;
    const eyeOut = 19.2;
    const bushOut = 15.3;
    const bore = 12.4;

    b.revolve({ x0: hT, r0: bore, x1: hT, r1: bushOut, n: [1, 0], m: MAT_CT_SHELL });
    const SE = 4.6; // its edges rounded

    b.revolve({ x0: hT, r0: bushOut, x1: hT, r1: eyeOut - SE, n: [1, 0], m: MAT_CT_ROD_FACE });
    b.revolve({ x0: hT - SE, r0: eyeOut, x1: -hT + SE, r1: eyeOut, n: [0, 1], m: MAT_CT_ROD });
    eyeEdge(b, 1, hT, eyeOut, SE, 0, MAT_CT_ROD);
    eyeEdge(b, -1, hT, eyeOut, SE, 0, MAT_CT_ROD);
    b.revolve({ x0: -hT, r0: bore, x1: -hT, r1: bushOut, n: [-1, 0], m: MAT_CT_SHELL });
    b.revolve({ x0: -hT, r0: bushOut, x1: -hT, r1: eyeOut - SE, n: [-1, 0], m: MAT_CT_ROD_FACE });

    // I-beam shank: a loft between two stations
    const y0 = 13;
    const y1 = L - 28;
    const hw0 = 11.5;
    const hw1 = 19.5;

    // the I-beam's section: its flanges and web, every corner rounded (the outer ones more), smooth-shaded round them
    const profile = (hw: number): Array<[number, number]> => {
      const fx = 9.5;
      const wx = 3.6;
      const fl = 4.6;
      const raw: Array<[number, number, number]> = [
        [-fx, -hw, 3.4], [fx, -hw, 3.4], [fx, -hw + fl, 1.8], [wx, -hw + fl, 1.7],
        [wx, hw - fl, 1.7], [fx, hw - fl, 1.8], [fx, hw, 3.4], [-fx, hw, 3.4],
        [-fx, hw - fl, 1.8], [-wx, hw - fl, 1.7], [-wx, -hw + fl, 1.7], [-fx, -hw + fl, 1.8],
      ];
      const out: Array<[number, number]> = [];

      for (let i = 0; i < raw.length; i++) {
        const p = raw[(i - 1 + raw.length) % raw.length];
        const c = raw[i];
        const q = raw[(i + 1) % raw.length];
        const r = c[2];
        const da = [p[0] - c[0], p[1] - c[1]];
        const db = [q[0] - c[0], q[1] - c[1]];
        const la = Math.hypot(da[0], da[1]);
        const lb = Math.hypot(db[0], db[1]);
        const a: [number, number] = [c[0] + (da[0] / la) * r, c[1] + (da[1] / la) * r];
        const e: [number, number] = [c[0] + (db[0] / lb) * r, c[1] + (db[1] / lb) * r];

        // a quadratic arc from a, by the corner, to e
        for (let j = 0; j <= 3; j++) {
          const u = j / 3;

          out.push([
            (1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * c[0] + u * u * e[0],
            (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * c[1] + u * u * e[1],
          ]);
        }
      }

      return out;
    };

    // the shank in stations, flaring at both ends where it runs into the eyes, so that there is no hard step there
    const ST = 8;
    const stations: Array<{ y: number; p: Array<[number, number]> }> = [];

    for (let s = 0; s <= ST; s++) {
      const u = s / ST;
      const flare = 5.5 * (Math.exp(-u * 9) + Math.exp(-(1 - u) * 9));

      stations.push({ y: y0 + (y1 - y0) * u, p: profile(hw0 + (hw1 - hw0) * u + flare) });
    }

    const pa = stations[0].p;
    const m2 = pa.length;
    const nrm = (pr: Array<[number, number]>, i: number): [number, number] => {
      const a = pr[(i - 1 + m2) % m2];
      const c = pr[(i + 1) % m2];
      const dx = c[0] - a[0];
      const dz = c[1] - a[1];
      const l = Math.hypot(dx, dz) || 1;

      return [dz / l, -dx / l];
    };

    for (let s = 0; s < ST; s++) {
      const A = stations[s];
      const B = stations[s + 1];

      for (let i = 0; i < m2; i++) {
        const j = (i + 1) % m2;
        const ni = nrm(A.p, i);
        const nj = nrm(A.p, j);
        const mat = Math.abs(A.p[j][0] - A.p[i][0]) < 0.3 && Math.abs(A.p[i][0]) < 5 ? MAT_CT_ROD_FACE : MAT_CT_ROD; // the web's faces brighter

        b.push([A.p[i][0], A.y, A.p[i][1]], [ni[0], 0, ni[1]], mat, 1);
        b.push([A.p[j][0], A.y, A.p[j][1]], [nj[0], 0, nj[1]], mat, 1);
        b.push([B.p[j][0], B.y, B.p[j][1]], [nj[0], 0, nj[1]], mat, 1);
        b.push([A.p[i][0], A.y, A.p[i][1]], [ni[0], 0, ni[1]], mat, 1);
        b.push([B.p[j][0], B.y, B.p[j][1]], [nj[0], 0, nj[1]], mat, 1);
        b.push([B.p[i][0], B.y, B.p[i][1]], [ni[0], 0, ni[1]], mat, 1);
      }
    }

    // Oil feed hole on the shank web, with a bright collar
    b.disc(3.63, 0, 0, 3.8, MAT_CT_ROD_FACE, 16, L - 62, 0);
    b.disc(3.66, 0, 0, 2.4, MAT_CT_HOLE, 14, L - 62, 0);

    // Big end: eye, bearing shells (rod half and cap half), split line,
    // locating tab, lugs and nuts
    const bT = CT.bigEndHalf;
    const eyeR = CT.bigEndR;

    const shellX = bT + 0.55; // the shells stand a little proud of the eye

    const BE = 5.2; // its edges rounded

    b.revolve({ x0: bT, r0: (CT.pinR + 3.7), x1: bT, r1: eyeR - BE, n: [1, 0], m: MAT_CT_ROD_FACE, cy: L });
    b.revolve({ x0: bT - BE, r0: eyeR, x1: -bT + BE, r1: eyeR, n: [0, 1], m: MAT_CT_ROD, cy: L });
    eyeEdge(b, 1, bT, eyeR, BE, L, MAT_CT_EDGE);
    eyeEdge(b, -1, bT, eyeR, BE, L, MAT_CT_EDGE);
    b.revolve({ x0: -bT, r0: (CT.pinR + 3.7), x1: -bT, r1: eyeR - BE, n: [-1, 0], m: MAT_CT_ROD_FACE, cy: L });

    // Both shells: tri-metal face, bright inner chamfer, and a conical
    // flank where the shell meets the eye
    b.revolve({ x0: shellX, r0: (CT.pinR + 1.3), x1: shellX, r1: (CT.pinR + 3.2), n: [1, 0], m: MAT_CT_SHELL, cy: L });
    b.revolve({ x0: shellX, r0: (CT.pinR + 1.3), x1: shellX - 0.9, r1: (CT.pinR + 0.3), n: [0.7, -0.7], m: MAT_CT_EDGE, cy: L });
    b.revolve({ x0: shellX, r0: (CT.pinR + 3.2), x1: bT, r1: (CT.pinR + 3.7), n: [0.7, 0.7], m: MAT_CT_SHELL, cy: L });

    b.revolve({ x0: -shellX, r0: (CT.pinR + 1.3), x1: -shellX, r1: (CT.pinR + 3.2), n: [-1, 0], m: MAT_CT_SHELL, cy: L });
    b.revolve({ x0: -shellX, r0: (CT.pinR + 1.3), x1: -shellX + 0.9, r1: (CT.pinR + 0.3), n: [-0.7, -0.7], m: MAT_CT_EDGE, cy: L });
    b.revolve({ x0: -shellX, r0: (CT.pinR + 3.2), x1: -bT, r1: (CT.pinR + 3.7), n: [-0.7, 0.7], m: MAT_CT_SHELL, cy: L });

    // Locating tab on the cap shell, standing out of the face
    b.box(bT - 2.5, shellX + 0.05, L + 0.3, L + 2.5, 23.4, 27.2, MAT_CT_SHELL);

    for (const side of [-1, 1]) {
      const z1 = side * eyeR;

      b.flatQuad(
        [bT + 0.25, L - 0.4, side * (CT.pinR + 3.7)], [bT + 0.25, L + 0.4, side * (CT.pinR + 3.7)],
        [bT + 0.25, L + 0.4, z1], [bT + 0.25, L - 0.4, z1],
        [1, 0, 0], MAT_CT_SEAM
      );

      // Where the two shells meet
      b.flatQuad(
        [shellX + 0.03, L - 0.5, side * (CT.pinR + 0.9)], [shellX + 0.03, L + 0.5, side * (CT.pinR + 0.9)],
        [shellX + 0.03, L + 0.5, side * (CT.pinR + 3.2)], [shellX + 0.03, L - 0.5, side * (CT.pinR + 3.2)],
        [1, 0, 0], MAT_CT_SEAM
      );

      // The same two seams on the side toward the chain end
      b.flatQuad(
        [-bT - 0.25, L - 0.4, side * (CT.pinR + 3.7)], [-bT - 0.25, L + 0.4, side * (CT.pinR + 3.7)],
        [-bT - 0.25, L + 0.4, side * eyeR], [-bT - 0.25, L - 0.4, side * eyeR],
        [-1, 0, 0], MAT_CT_SEAM
      );

      b.flatQuad(
        [-shellX - 0.03, L - 0.5, side * (CT.pinR + 0.9)], [-shellX - 0.03, L + 0.5, side * (CT.pinR + 0.9)],
        [-shellX - 0.03, L + 0.5, side * (CT.pinR + 3.2)], [-shellX - 0.03, L - 0.5, side * (CT.pinR + 3.2)],
        [-1, 0, 0], MAT_CT_SEAM
      );

      // Lug beside the eye, with a nut under it
      const zl0 = side > 0 ? eyeR - 2 : -(eyeR + 9.5);
      const zl1 = side > 0 ? eyeR + 9.5 : -(eyeR - 2);

      roundedLug(b, bT - 0.6, L - 4, L + 11, zl0, zl1, 4.2, MAT_CT_ROD);
      b.prismDir(
        [0, L + 11, side * (eyeR + 3.8)],
        [0, 1, 0], [1, 0, 0], [0, 0, 1],
        6.3, 5.5, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE
      );
    }
  }
}
