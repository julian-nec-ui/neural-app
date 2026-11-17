// The timing covers: over each bank's timing drive, at the front of the engine, a cover in two pieces, an upper one over
// the camshafts' sprockets and a lower one over the chain's guides, its tensioner and the crank's sprocket, meeting at a joint. Dark
// metal with a carbon-fibre weave in its skin (surface pattern 8), bright cooling fins in relief along its face, a
// machined rim round its face, and bolts round its edge.
// Built in a bank's own frame, about the timing drive's plane; drawn see-through, as the head is, solid when the engine is.

import { TAU } from "../core/constants";
import type { FwMaterial, FwVec3 } from "./builder";
import { MAT_COVER, MAT_COVER_FIN, MAT_COVER_RIM, MAT_GASKET } from "./materials";
import { runOffset } from "./timingChain/chainGuides";
import { CAM_RC, CHAIN_SEP, DRIVE, VT_RC } from "./timingChain/chainPath";
import { CHAIN_FWD, GEARS, GEAR_MODULE, pitchR } from "./timingGears/gearTrain";
import { HEAD } from "./head";
import { flangeBolt } from "./tubes";
import type { MeshBuilder } from "./tubes";
import { VT } from "./valvetrain";

const FIN_PITCH = 9; // the fins' spacing across the cover
const FIN_H = 6; // how far they stand out of its face
const FIN_T = 1.3; // half a fin's thickness

// The cover's face stands in front of everything of the drive (the chain run in front, CHAIN_SEP, with its sprockets'
// bolts and the crank's bolt), all hidden under it; its back edge, against the head's front, behind the chain
const X_FACE = VT.chainX - CHAIN_SEP - CHAIN_FWD - 26; // out in front of the chain, which runs in front of the gears
const X_BACK = HEAD.x0; // right on the head's and the block's front face: sealed to it, no gap
const JOINT_Y = VT.yCam * 0.45; // where the two pieces meet

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

// A convex outline brought in by d, square to each of its edges (each edge's line moved in, the corners where two meet)
function offsetIn(poly: P2[], d: number): P2[] {
  const n = poly.length;
  let area = 0;

  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const c = poly[(i + 1) % n];

    area += a[0] * c[1] - c[0] * a[1];
  }

  const s = area > 0 ? 1 : -1; // (inward is to the left of each edge when the outline runs counter-clockwise)
  const lines = poly.map((a, i) => {
    const c = poly[(i + 1) % n];
    const dy = c[0] - a[0];
    const dz = c[1] - a[1];
    const l = Math.hypot(dy, dz) || 1;
    const ny = (-dz / l) * s;
    const nz = (dy / l) * s;

    return { p: [a[0] + ny * d, a[1] + nz * d] as P2, v: [dy / l, dz / l] as P2 };
  });
  const out: P2[] = [];

  for (let i = 0; i < n; i++) {
    const L0 = lines[(i - 1 + n) % n];
    const L1 = lines[i];
    const den = L0.v[0] * L1.v[1] - L0.v[1] * L1.v[0];

    if (Math.abs(den) < 1e-9) {
      out.push(L1.p);
      continue;
    }

    const t = ((L1.p[0] - L0.p[0]) * L1.v[1] - (L1.p[1] - L0.p[1]) * L1.v[0]) / den;

    out.push([L0.p[0] + L0.v[0] * t, L0.p[1] + L0.v[1] * t]);
  }

  return out;
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
  const fins = offsetIn(poly, 11); // (the same margin from every edge, square to it)
  const zs = fins.map((q) => q[1]);

  // (on one grid across both pieces, symmetric about the middle: each fin of the lower piece runs on from one of the upper
  // piece's, in line with it across the joint, none starting off on its own)
  const zFirst = Math.ceil((Math.min(...zs) + 4 - FIN_PITCH / 2) / FIN_PITCH) * FIN_PITCH + FIN_PITCH / 2;

  for (let z = zFirst; z < Math.max(...zs) - 3; z += FIN_PITCH) {
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

  // where it meets the engine: a broad flange round its back, standing out from its wall, bolted to the head and the block
  // all round, with a gasket under it, so that it is sealed and the oil on the chain stays in
  const FL = 7; // how far the flange stands out from the wall
  const FT = 5; // its thickness
  const GT = 0.9; // the gasket's
  const out = (q: P2, d: number): P2 => inset(q, -d);
  const flange = poly.map((q) => out(q, FL));
  const gasket = poly.map((q) => out(q, FL + 0.7));

  wall(flange, X_BACK - GT - FT, X_BACK - GT, MAT_COVER_RIM); // the flange's edge
  for (let k = 0; k < n; k++) {
    const a = poly[k];
    const c = poly[(k + 1) % n];

    // its front face, from the wall out to its edge
    b.flatQuad(P(a, X_BACK - GT - FT), P(c, X_BACK - GT - FT), P(flange[(k + 1) % n], X_BACK - GT - FT), P(flange[k], X_BACK - GT - FT), [-1, 0, 0], MAT_COVER);
  }

  wall(gasket, X_BACK - GT, X_BACK, MAT_GASKET); // the gasket, a dark line just proud of the flange

  // the flange's bolts, into the head and the block, close together
  {
    const fp = poly.map((q) => out(q, FL / 2));
    const lens = fp.map((q, k) => Math.hypot(fp[(k + 1) % n][0] - q[0], fp[(k + 1) % n][1] - q[1]));
    const tot = lens.reduce((s, l) => s + l, 0);
    const cnt = Math.max(10, Math.round(tot / 34));

    for (let i = 0; i < cnt; i++) {
      let s = (i / cnt) * tot;
      let k = 0;

      while (s > lens[k]) s -= lens[k++];

      const a = fp[k];
      const c = fp[(k + 1) % n];
      const u = s / lens[k];

      flangeBolt(b, [X_BACK - GT - FT, a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u], [-1, 0, 0], 2.6, 0.5 * i);
    }
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

function backPlate(b: MeshBuilder, outline: P2[]) {
  const n = outline.length;
  const cy = outline.reduce((s, q) => s + q[0], 0) / n;
  const cz = outline.reduce((s, q) => s + q[1], 0) / n;
  const grow = (q: P2, d: number): P2 => {
    const dy = q[0] - cy;
    const dz = q[1] - cz;
    const l = Math.hypot(dy, dz) || 1;

    return [q[0] + (dy / l) * d, q[1] + (dz / l) * d];
  };
  const PT = 6; // its thickness, back into the engine's front from the covers' seat
  const ring = outline.map((q) => grow(q, 15));
  const P = (q: P2, x: number): FwVec3 => [x, q[0], q[1]];
  const x0 = X_BACK; // its front, where the covers' gaskets sit
  const x1 = X_BACK + PT;

  // its front face (the covers seat on it) and its back
  b.flatFan([x0, cy, cz], ring.map((q) => P(q, x0)), [-1, 0, 0], MAT_COVER_RIM);
  b.flatFan([x1, cy, cz], ring.map((q) => P(q, x1)).reverse(), [1, 0, 0], MAT_COVER_RIM);

  // its edge, with a chamfer on the front
  const ringC = outline.map((q) => grow(q, 13.6));

  for (let k = 0; k < n; k++) {
    const a = ring[k];
    const c = ring[(k + 1) % n];
    const nrm: FwVec3 = [0, (a[0] + c[0]) / 2 - cy, (a[1] + c[1]) / 2 - cz];

    b.flatQuad(P(a, x0 + 1.2), P(c, x0 + 1.2), P(c, x1), P(a, x1), nrm, MAT_COVER);
    b.flatQuad(P(ringC[k], x0 - 0.01), P(ringC[(k + 1) % n], x0 - 0.01), P(c, x0 + 1.2), P(a, x0 + 1.2), [-1, nrm[1] * 0.02, nrm[2] * 0.02], MAT_COVER_FIN);
  }

  // its bolts into the engine, round its edge
  const fp = outline.map((q) => grow(q, 11));
  const lens = fp.map((q, k) => Math.hypot(fp[(k + 1) % n][0] - q[0], fp[(k + 1) % n][1] - q[1]));
  const tot = lens.reduce((s, l) => s + l, 0);
  const cnt = Math.max(12, Math.round(tot / 40));

  for (let i = 0; i < cnt; i++) {
    let s = ((i + 0.5) / cnt) * tot;
    let k = 0;

    while (s > lens[k]) s -= lens[k++];

    const a = fp[k];
    const c = fp[(k + 1) % n];
    const u = s / lens[k];

    flangeBolt(b, [x0, a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u], [-1, 0, 0], 2.8, 0.7 * i);
  }
}

export function buildTimingCover(b: MeshBuilder) {
  const circles: Array<[number, number, number]> = [
    [VT.yCam, VT.zCam, CAM_RC + 20],
    [VT.yCam, -VT.zCam, CAM_RC + 20],
    [0, 0, VT_RC + 18],
    // and round the gears, low down
    ...GEARS.map((g): [number, number, number] => [g.y, g.z, pitchR(g.teeth) + GEAR_MODULE + 12]),
  ];
  // and clear of the guides and the tensioner standing out from the arm, down both side runs
  const reach: Array<[number, number, number]> = [];

  for (let k = 0; k <= 10; k++) {
    const u = 0.09 + 0.082 * k;

    reach.push([0, u, 38], [2, u, 38]);
  }

  reach.push([0, 0.287, 86], [2, 0.713, 86]); // (and round both tensioners)
  const pts: P2[] = [];

  for (const [y, z, r] of circles) {
    for (let k = 0; k < 36; k++) pts.push([y + r * Math.cos((k / 36) * TAU), z + r * Math.sin((k / 36) * TAU)]);
  }

  for (const [run, u, off] of reach) {
    const [y, z] = runOffset(DRIVE, run, u, off);

    for (let k = 0; k < 12; k++) pts.push([y + 12 * Math.cos((k / 12) * TAU), z + 12 * Math.sin((k / 12) * TAU)]);
  }

  const outline = hull(pts);

  piece(b, clip(outline, JOINT_Y, -1)); // the upper piece, over the cams
  piece(b, clip(outline, JOINT_Y + 1.5, 1)); // the lower one, a hair below: the joint shows as a line

  // Behind both pieces, the timing case's back plate: a cast plate as large as the covers' flanges and a little more,
  // bolted to the block and the head's front, closing the drive in from behind where the covers reach out past the head;
  // the covers' flanges bolt onto it. Its own bolts, into the engine, stand round its edge outside the covers'.
  backPlate(b, outline);
}
