// The main bearings, their caps and shells, and the front seal housing.

import { CT_X, TAU } from "../../core/constants";
import { MAT_CT_CAP, MAT_CT_CAP_FACE, MAT_CT_EDGE, MAT_CT_HOLE, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_CT_OIL, MAT_CT_SEAM, MAT_CT_SHELL, MAT_INJ_RUBBER } from "../materials";
import { CT, CT_REAR_NECK, shellHalf } from "./dimensions";
import type { MeshBuilder } from "../tubes";
import { crankHelpers } from "./helpers";

// The static parts round the crankshaft
export function buildMainBearings(b: MeshBuilder) {
  const { cylX } = crankHelpers(b);

  const throwCount = CT_X.length;

  {
    const bearings: Array<{ xc: number; half: number }> = [];
    const front = CT_X[0] - 28 - 72.2;

    bearings.push({ xc: front + 30, half: 30 });

    for (let i = 0; i < throwCount - 1; i++) {
      bearings.push({
        xc: (CT_X[i] + CT_X[i + 1]) / 2,
        half: (CT_X[i + 1] - CT_X[i] - (2 * CT.webOut + 72)) / 2,
      });
    }

    bearings.push({ xc: CT_X[throwCount - 1] + CT.webOut + CT_REAR_NECK + 30, half: 30 });

    const lower = { from: -Math.PI / 2, to: Math.PI / 2 };
    const upper = { from: Math.PI / 2, to: (3 * Math.PI) / 2 };

    for (const { xc, half } of bearings) {
      const sh = shellHalf(half); // exposed shell half-width
      const ht = sh - 0.8; // the cap is a touch narrower than the shell

      // Cap casting (lower half) with its wings
      b.revolve({ x0: xc + ht, r0: (CT.journalR + 11), x1: xc - ht, r1: (CT.journalR + 11), n: [0, 1], m: MAT_CT_CAP, ...lower });
      b.revolve({ x0: xc + ht, r0: (CT.journalR + 3), x1: xc + ht, r1: (CT.journalR + 11), n: [1, 0], m: MAT_CT_CAP_FACE, ...lower });
      b.revolve({ x0: xc + ht, r0: (CT.journalR + 10), x1: xc + ht, r1: (CT.journalR + 11), n: [1, 0], m: MAT_CT_EDGE, ...lower });
      b.revolve({ x0: xc - ht, r0: (CT.journalR + 3), x1: xc - ht, r1: (CT.journalR + 11), n: [-1, 0], m: MAT_CT_CAP_FACE, ...lower });
      b.revolve({ x0: xc - ht, r0: (CT.journalR + 10), x1: xc - ht, r1: (CT.journalR + 11), n: [-1, 0], m: MAT_CT_EDGE, ...lower });

      b.box(xc - ht, xc + ht, 0, 11, (CT.journalR + 9), (CT.journalR + 23), MAT_CT_CAP);
      b.box(xc - ht, xc + ht, 0, 11, -(CT.journalR + 23), -(CT.journalR + 9), MAT_CT_CAP);

      // Bearing shells, both halves: tri-metal face with a bright chamfer
      b.revolve({ x0: xc + sh, r0: (CT.journalR + 0.7), x1: xc + sh, r1: (CT.journalR + 3), n: [1, 0], m: MAT_CT_SHELL });
      b.revolve({ x0: xc + sh, r0: (CT.journalR + 0.7), x1: xc + sh - 0.5, r1: (CT.journalR - 0.8), n: [0.7, -0.7], m: MAT_CT_EDGE });
      b.revolve({ x0: xc - sh, r0: (CT.journalR + 0.7), x1: xc - sh, r1: (CT.journalR + 3), n: [-1, 0], m: MAT_CT_SHELL });
      b.revolve({ x0: xc - sh, r0: (CT.journalR + 0.7), x1: xc - sh + 0.5, r1: (CT.journalR - 0.8), n: [-0.7, -0.7], m: MAT_CT_EDGE });

      // The upper half stands in the open: its outer skin, with the oil
      // feed hole drilled through it and a stain of oil around the hole
      cylX(xc - sh, xc + sh, (CT.journalR + 3), MAT_CT_SHELL, upper);
      b.radialDisc(xc, 0, 0, (CT.journalR + 3.02), 2.4, 3.6, MAT_CT_OIL, 16);
      b.radialDisc(xc, 0, 0, (CT.journalR + 3.05), 2.4, 2.1, MAT_CT_HOLE, 14);

      // Split line and the locating tab on the cap half
      for (const side of [-1, 1]) {
        b.flatQuad(
          [xc + sh + 0.03, -0.45, side * (CT.journalR + 0.7)], [xc + sh + 0.03, 0.45, side * (CT.journalR + 0.7)],
          [xc + sh + 0.03, 0.45, side * (CT.journalR + 3)], [xc + sh + 0.03, -0.45, side * (CT.journalR + 3)],
          [1, 0, 0], MAT_CT_SEAM
        );

        b.flatQuad(
          [xc - sh - 0.03, -0.45, side * (CT.journalR + 0.7)], [xc - sh - 0.03, 0.45, side * (CT.journalR + 0.7)],
          [xc - sh - 0.03, 0.45, side * (CT.journalR + 3)], [xc - sh - 0.03, -0.45, side * (CT.journalR + 3)],
          [-1, 0, 0], MAT_CT_SEAM
        );
      }

      b.box(xc + sh - 3, xc + sh + 0.3, 0.45, 2.4, (CT.journalR + 1.4), (CT.journalR + 4.4), MAT_CT_SHELL);
    }
  }

  // The front crankshaft seal housing: a static ring round the shaft, against
  // the first journal's shoulder, with a rubber lip seal and its bolts. The
  // nose goes through it, so the shaft visibly comes out of the engine.
  {
    const xs = CT_X[0] - 28 - 72.2;

    b.revolve({ x0: xs - 0.6, r0: (CT.journalR + 3), x1: xs - 7.4, r1: (CT.journalR + 3), n: [0, 1], m: MAT_CT_CAP });
    b.revolve({ x0: xs - 7.4, r0: 20, x1: xs - 7.4, r1: (CT.journalR + 1.8), n: [-1, 0], m: MAT_CT_CAP_FACE });
    b.revolve({ x0: xs - 6.2, r0: (CT.journalR + 3), x1: xs - 7.4, r1: (CT.journalR + 1.8), n: [-0.7, 0.7], m: MAT_CT_EDGE });
    b.revolve({ x0: xs - 7.4, r0: 17.3, x1: xs - 7.9, r1: 17.9, n: [-0.7, 0.7], m: MAT_INJ_RUBBER }); // lip seal
    b.revolve({ x0: xs - 7.9, r0: 17.9, x1: xs - 7.9, r1: 20, n: [-1, 0], m: MAT_INJ_RUBBER });
    b.revolve({ x0: xs - 7.4, r0: 20, x1: xs - 7.9, r1: 20, n: [0, 1], m: MAT_INJ_RUBBER });

    for (let k = 0; k < 6; k++) {
      const t = ((k + 0.5) / 6) * TAU;

      b.prismDir(
        [xs - 7.4, (CT.journalR - 0.6) * Math.cos(t), (CT.journalR - 0.6) * Math.sin(t)],
        [-1, 0, 0], [0, 1, 0], [0, 0, 1], 1.7, 1.3, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE
      );
    }
  }
}
