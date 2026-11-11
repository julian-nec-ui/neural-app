// The timing covers: over each bank's timing drive, at the front of the engine, a cover in two pieces, an upper one over
// the camshafts' sprockets and a lower one over the intermediate shaft and the crank's sprocket, meeting at a joint. Dark
// metal with a carbon-fibre weave in its skin (surface pattern 8), bright cooling fins in relief along its face, a
// machined rim round its face, and bolts round its edge.
// Built in a bank's own frame, about the timing drive's plane; drawn see-through, as the head is, solid when the engine is.

import { PRIMARY_DX, TAU } from "../core/constants";
import type { FwMaterial, FwVec3 } from "./builder";
import { MAT_COVER, MAT_COVER_FIN, MAT_COVER_RIM } from "./materials";
import { CAM_RC, IDLER_Y, VT_RC } from "./timingChain/chainPath";
import { flangeBolt } from "./tubes";
import type { MeshBuilder } from "./tubes";
import { VT } from "./valvetrain";

const FIN_PITCH = 9; // the fins' spacing across the cover
const FIN_H = 6; // how far they stand out of its face
const FIN_T = 1.3; // half a fin's thickness

// The cover's face stands in front of everything of the drive: the chains, the cams' sprocket bolts and the crank's bolt,
// all hidden under it; its back edge, against the head's front, behind the rear chain
const X_FACE = VT.chainX - 34;
const X_BACK = VT.chainX + PRIMARY_DX + 14;
const JOINT_Y = (IDLER_Y + VT.yCam) / 2 + 30; // where the two pieces meet

type P2 = [number, number]; // y, z

function hull(pts: P2[]): P2[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: P2, a: P2, c: P2) => (a[0] - o[0]) * (c[1] - o[1]) - (a[1] - o[1]) * (c[0] - o[0]);
  const lo: P2[] = [];
  const hi: P2[] = [];

  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }

  for (let i = p.length - 1; i >= 0; i--) {
    while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p[i]) <= 0) hi.pop();
    hi.push(p[i]);
  }

  return [...lo.slice(0, -1), ...hi.slice(0, -1)];
}

// The part of a convex outline on one side of the line y = c (keep: +1 below it, -1 above)
function clip(poly: P2[], c: number, keep: number): P2[] {
  const out: P2[] = [];
  const inside = (q: P2) => (q[0] - c) * keep >= 0;

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];

    if (inside(a)) out.push(a);

    if (inside(a) !== inside(b)) {
      const t = (c - a[0]) / (b[0] - a[0]);

      out.push([c, a[1] + (b[1] - a[1]) * t]);
    }
  }

  return out;
}

function piece(b: MeshBuilder, poly: P2[]) {
  const n = poly.length;
  const cy = poly.reduce((t, q) => t + q[0], 0) / n;
  const cz = poly.reduce((t, q) => t + q[1], 0) / n;
  const P = (q: P2, x: number): FwVec3 => [x, q[0], q[1]];
  // the face, set in a little from the rim
  const inset = (q: P2, d: number): P2 => {
    const dy = q[0] - cy;
    const dz = q[1] - cz;
    const l = Math.hypot(dy, dz) || 1;

    return [q[0] - (dy / l) * d, q[1] - (dz / l) * d];
  };
  const wall = (ring: P2[], x0: number, x1: number, mat: FwMaterial) => {
    for (let k = 0; k < ring.length; k++) {
      const a = ring[k];
      const c = ring[(k + 1) % ring.length];

      b.flatQuad(P(a, x0), P(c, x0), P(c, x1), P(a, x1), [0, (a[0] + c[0]) / 2 - cy, (a[1] + c[1]) / 2 - cz], mat);
    }
  };
  const inner = poly.map((q) => inset(q, 7));

  wall(poly, X_FACE + 4, X_BACK, MAT_COVER); // its side wall
  wall(poly, X_FACE + 1, X_FACE + 4, MAT_COVER_RIM); // the machined rim round its face
  b.flatFan([X_FACE + 1, cy, cz], poly.map((q) => P(q, X_FACE + 1)), [-1, 0, 0], MAT_COVER_RIM);
  wall(inner, X_FACE - 2, X_FACE + 1, MAT_COVER); // the raised face, inside the rim
  b.flatFan([X_FACE - 2, cy, cz], inner.map((q) => P(q, X_FACE - 2)), [-1, 0, 0], MAT_COVER);

  // cooling fins along its face, in relief, running the length of the cover (along the bank), close together: each a thin
  // blade standing out of the face, cut to the face's outline
  const fins = poly.map((q) => inset(q, 14));
  const zs = fins.map((q) => q[1]);

  for (let z = Math.min(...zs) + 4; z < Math.max(...zs) - 3; z += FIN_PITCH) {
    const ys: number[] = [];

    for (let k = 0; k < fins.length; k++) {
      const p0 = fins[k];
      const p1 = fins[(k + 1) % fins.length];

      if ((p0[1] - z) * (p1[1] - z) <= 0 && p0[1] !== p1[1]) ys.push(p0[0] + ((z - p0[1]) / (p1[1] - p0[1])) * (p1[0] - p0[0]));
    }

    if (ys.length < 2) continue;

    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);

    if (y1 - y0 < 12) continue;

    b.box(X_FACE - 2 - FIN_H, X_FACE - 2, y0, y1, z - FIN_T, z + FIN_T, MAT_COVER_FIN);
  }

  // bolts round its edge, on the rim
  const perim = poly.map((q, k) => Math.hypot(poly[(k + 1) % n][0] - q[0], poly[(k + 1) % n][1] - q[1]));
  const total = perim.reduce((t, l) => t + l, 0);
  const count = Math.max(6, Math.round(total / 70));

  for (let i = 0; i < count; i++) {
    let s = ((i + 0.5) / count) * total;
    let k = 0;

    while (s > perim[k]) s -= perim[k++];

    const a = poly[k];
    const c = poly[(k + 1) % n];
    const t = s / perim[k];
    const q = inset([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t], 3.5);

    flangeBolt(b, [X_FACE + 1, q[0], q[1]], [-1, 0, 0], 3.2, 0.3 * i);
  }
}

export function buildTimingCover(b: MeshBuilder) {
  const circles: Array<[number, number, number]> = [
    [VT.yCam, VT.zCam, CAM_RC + 20],
    [VT.yCam, -VT.zCam, CAM_RC + 20],
    [IDLER_Y, 0, 2 * VT_RC + 16],
    [0, 0, VT_RC + 18],
  ];
  const pts: P2[] = [];

  for (const [y, z, r] of circles) {
    for (let k = 0; k < 36; k++) pts.push([y + r * Math.cos((k / 36) * TAU), z + r * Math.sin((k / 36) * TAU)]);
  }

  const outline = hull(pts);

  piece(b, clip(outline, JOINT_Y, -1)); // the upper piece, over the cams
  piece(b, clip(outline, JOINT_Y + 1.5, 1)); // the lower one, a hair below: the joint shows as a line
}
