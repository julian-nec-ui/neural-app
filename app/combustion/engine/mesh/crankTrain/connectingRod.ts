// The connecting rod: small end, I-beam shank and split big end with its bearing shells and nuts.

import { L } from "../../core/constants";
import { MAT_CT_EDGE, MAT_CT_HOLE, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_CT_ROD, MAT_CT_ROD_FACE, MAT_CT_SEAM, MAT_CT_SHELL } from "../materials";
import { CT } from "./dimensions";
import type { MeshBuilder } from "../tubes";

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
    b.revolve({ x0: hT, r0: bushOut, x1: hT, r1: eyeOut, n: [1, 0], m: MAT_CT_ROD_FACE });
    b.revolve({ x0: hT, r0: eyeOut, x1: -hT, r1: eyeOut, n: [0, 1], m: MAT_CT_ROD });
    b.revolve({ x0: -hT, r0: bore, x1: -hT, r1: bushOut, n: [-1, 0], m: MAT_CT_SHELL });
    b.revolve({ x0: -hT, r0: bushOut, x1: -hT, r1: eyeOut, n: [-1, 0], m: MAT_CT_ROD_FACE });

    // I-beam shank: a loft between two stations
    const y0 = 13;
    const y1 = L - 28;
    const hw0 = 11.5;
    const hw1 = 19.5;

    const profile = (hw: number): Array<[number, number]> => {
      const fx = 9.5;
      const wx = 3.6;
      const fl = 4.6;

      return [
        [-fx, -hw], [fx, -hw], [fx, -hw + fl], [wx, -hw + fl],
        [wx, hw - fl], [fx, hw - fl], [fx, hw], [-fx, hw],
        [-fx, hw - fl], [-wx, hw - fl], [-wx, -hw + fl], [-fx, -hw + fl],
      ];
    };

    const pa = profile(hw0);
    const pb = profile(hw1);

    for (let i = 0; i < pa.length; i++) {
      const j = (i + 1) % pa.length;
      const dx = pa[j][0] - pa[i][0];
      const dz = pa[j][1] - pa[i][1];
      const facesWeb = Math.abs(dx) < 1e-6; // an edge parallel to Z

      b.flatQuad(
        [pa[i][0], y0, pa[i][1]],
        [pa[j][0], y0, pa[j][1]],
        [pb[j][0], y1, pb[j][1]],
        [pb[i][0], y1, pb[i][1]],
        [dz, 0, -dx],
        facesWeb ? MAT_CT_ROD_FACE : MAT_CT_ROD
      );
    }

    // Oil feed hole on the shank web, with a bright collar
    b.disc(3.63, 0, 0, 3.8, MAT_CT_ROD_FACE, 16, L - 62, 0);
    b.disc(3.66, 0, 0, 2.4, MAT_CT_HOLE, 14, L - 62, 0);

    // Big end: eye, bearing shells (rod half and cap half), split line,
    // locating tab, lugs and nuts
    const bT = CT.bigEndHalf;
    const eyeR = CT.bigEndR;

    const shellX = bT + 0.55; // the shells stand a little proud of the eye

    b.revolve({ x0: bT, r0: (CT.pinR + 3.7), x1: bT, r1: eyeR, n: [1, 0], m: MAT_CT_ROD_FACE, cy: L });
    b.revolve({ x0: bT, r0: eyeR, x1: -bT, r1: eyeR, n: [0, 1], m: MAT_CT_ROD, cy: L });
    b.revolve({ x0: bT, r0: eyeR - 1.2, x1: bT, r1: eyeR, n: [0.7, 0.7], m: MAT_CT_EDGE, cy: L });
    b.revolve({ x0: -bT, r0: (CT.pinR + 3.7), x1: -bT, r1: eyeR, n: [-1, 0], m: MAT_CT_ROD_FACE, cy: L });
    b.revolve({ x0: -bT, r0: eyeR - 1.2, x1: -bT, r1: eyeR, n: [-0.7, 0.7], m: MAT_CT_EDGE, cy: L });

    // Both shells: tri-metal face, bright inner chamfer, and a conical
    // flank where the shell meets the eye
    b.revolve({ x0: shellX, r0: (CT.pinR + 0.9), x1: shellX, r1: (CT.pinR + 3.2), n: [1, 0], m: MAT_CT_SHELL, cy: L });
    b.revolve({ x0: shellX, r0: (CT.pinR + 0.9), x1: shellX - 0.45, r1: (CT.pinR + 0.4), n: [0.7, -0.7], m: MAT_CT_EDGE, cy: L });
    b.revolve({ x0: shellX, r0: (CT.pinR + 3.2), x1: bT, r1: (CT.pinR + 3.7), n: [0.7, 0.7], m: MAT_CT_SHELL, cy: L });

    b.revolve({ x0: -shellX, r0: (CT.pinR + 0.9), x1: -shellX, r1: (CT.pinR + 3.2), n: [-1, 0], m: MAT_CT_SHELL, cy: L });
    b.revolve({ x0: -shellX, r0: (CT.pinR + 0.9), x1: -shellX + 0.45, r1: (CT.pinR + 0.4), n: [-0.7, -0.7], m: MAT_CT_EDGE, cy: L });
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

      b.box(-bT, bT, L - 4, L + 11, zl0, zl1, MAT_CT_ROD);
      b.prismDir(
        [0, L + 11, side * (eyeR + 3.8)],
        [0, 1, 0], [1, 0, 0], [0, 0, 1],
        6.3, 5.5, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE
      );
    }
  }
}
