// The chain's guides: the fixed guide, the tensioner arm and its hydraulic tensioner.

import type { FwVec3, createMeshBuilder } from "../builder";
import { MAT_CT_EDGE, MAT_CT_GROOVE, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_GUIDE_ARM, MAT_GUIDE_SAND, MAT_VT_JOURNAL, MAT_VT_PAD, MAT_VT_SEAT, MAT_VT_CAM_FACE, MAT_VT_TOWER_FACE } from "../materials";
import { VT } from "../valvetrain";
import { CHAIN_K } from "./chainPath";
import type { Chain, ChainSeg } from "./chainPath";

/* ---------------- guide, tensioner shoe and hydraulic tensioner (static) ---------------- */

// A point on one chain run, `s` along it
function runPoint(seg: ChainSeg, s: number): [number, number] {
  if (seg.kind === "line") {
    return [seg.from[0] + seg.dir[0] * s, seg.from[1] + seg.dir[1] * s];
  }

  if (seg.kind === "poly") {
    let j = 1;

    while (j < seg.cum.length - 1 && seg.cum[j] < s) j++;

    const f = (s - seg.cum[j - 1]) / (seg.cum[j] - seg.cum[j - 1] || 1);

    return [
      seg.pts[j - 1][0] + (seg.pts[j][0] - seg.pts[j - 1][0]) * f,
      seg.pts[j - 1][1] + (seg.pts[j][1] - seg.pts[j - 1][1]) * f,
    ];
  }

  return [0, 0];
}

// Centre line of a run with its outward normal (right of the direction of travel)
function sampleRun(seg: ChainSeg, from: number, to: number, count: number) {
  const out: Array<{ y: number; z: number; ny: number; nz: number }> = [];

  for (let k = 0; k <= count; k++) {
    const s = (from + ((to - from) * k) / count) * seg.length;
    const p = runPoint(seg, s);
    const q = runPoint(seg, Math.min(seg.length, s + 0.6));
    const o = runPoint(seg, Math.max(0, s - 0.6));
    const ty = q[0] - o[0];
    const tz = q[1] - o[1];
    const len = Math.hypot(ty, tz) || 1;

    out.push({ y: p[0], z: p[1], ny: tz / len, nz: -ty / len });
  }

  return out;
}

// A point `off` out from the centre line of run `run`, at `u` of its length (for what must clear the drive: the cover)
export function runOffset(chain: Chain, run: number, u: number, off: number): [number, number] {
  const seg = chain.path.segs.filter((s) => s.kind !== "arc")[run];
  const p = sampleRun(seg, u, u, 1)[0];

  return [p.y + p.ny * off, p.z + p.nz * off];
}

// The two guides of the bank's chain, after the twin-cam drive: up the one side run a fixed guide, bolted to the engine's
// front at both ends; down the other a tensioner arm, pivoting on a bolt at its upper end and pushed in near its lower end by
// a hydraulic tensioner. Both are long curved blades of moulded nylon, the chain riding in a channel along their edge (a
// lip either side keeps it on), their faces stiffened by a raised truss: a rim round the edge and diagonal ribs between,
// the pockets between them sunk and shadowed. The fixed guide is in pale sand nylon, the arm in an amber-brown one.
// On run `run` of the chain's path (its runs counted from the first circle), in the plane x; the run's upper end is its end
// (`upEnd` 1) or its start (0).
export function buildChainGuide(
  b: ReturnType<typeof createMeshBuilder>,
  chain: Chain,
  run: number,
  kind: "fixed" | "arm",
  upEnd: 0 | 1,
  chainX = VT.chainX
) {
  const runs = chain.path.segs.filter((s) => s.kind !== "arc");
  const seg = runs[run];
  const K = CHAIN_K;
  const mat = kind === "fixed" ? MAT_GUIDE_SAND : MAT_GUIDE_ARM;
  const u0 = 0.09;
  const u1 = 0.91;
  const N = 40;
  const samples = sampleRun(seg, u0, u1, N);
  const gap = 6.5 * K; // the chain's edge, from its centre line (its plates 1.6 times as tall)
  const T = 26; // the blade's depth at its deepest, outward from the chain: broad, as in the picture
  const hx = 12 * K; // half its thickness along the crank: over the chain twice as wide
  const LIP = 1.6; // the lips either side of the channel
  const RIB = 3.4; // how far the truss stands out of the faces: deep pockets between
  const x = chainX;

  // a point `off` out from the chain's centre line at sample i, at x
  const P = (i: number, off: number, px: number): FwVec3 => {
    const s = samples[i];

    return [px, s.y + s.ny * off, s.z + s.nz * off];
  };
  const quad = (p0: FwVec3, p1: FwVec3, p2: FwVec3, p3: FwVec3, hint: FwVec3, o0: number, o1: number, m = mat) => {
    b.flatTri(p0, p1, p2, hint, m, o0, o1, o1);
    b.flatTri(p0, p2, p3, hint, m, o0, o1, o0);
  };
  // the blade is deepest a little below its middle and tapers to both ends, as in the picture
  const depth = (i: number) => {
    const u = upEnd === 1 ? i / N : 1 - i / N; // 0 at its lower end
    const e = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.85)), 0.7);

    return T * (0.34 + 0.66 * e);
  };

  // the body: its two faces (sunk, the pockets' floor), its back, and the channel's floor
  for (let i = 0; i < N; i++) {
    const s = samples[i];
    const d0 = gap + depth(i);
    const d1 = gap + depth(i + 1);

    for (const sg of [-1, 1]) {
      quad(P(i, gap, x + sg * hx), P(i + 1, gap, x + sg * hx), P(i + 1, d1, x + sg * hx), P(i, d0, x + sg * hx), [sg, 0, 0], 0.42, 0.42);
    }

    quad(P(i, d0, x - hx - LIP * 0), P(i, d0, x + hx), P(i + 1, d1, x + hx), P(i + 1, d1, x - hx), [0, s.ny, s.nz], 0.95, 0.95); // back
    quad(P(i, gap, x - hx), P(i + 1, gap, x - hx), P(i + 1, gap, x + hx), P(i, gap, x + hx), [0, -s.ny, -s.nz], 0.7, 0.7); // channel floor

    // the lips either side of the channel, standing toward the chain
    for (const sg of [-1, 1]) {
      const xo = x + sg * hx;
      const xi = x + sg * (hx - 1.5);

      quad(P(i, gap, xi), P(i + 1, gap, xi), P(i + 1, gap - LIP, xi), P(i, gap - LIP, xi), [-sg, 0, 0], 0.75, 0.75);
      quad(P(i, gap - LIP, xi), P(i + 1, gap - LIP, xi), P(i + 1, gap - LIP, xo), P(i, gap - LIP, xo), [0, -s.ny, -s.nz], 1, 1);
      quad(P(i, gap - LIP, xo), P(i + 1, gap - LIP, xo), P(i + 1, gap, xo), P(i, gap, xo), [sg, 0, 0], 0.9, 0.9);
    }
  }

  // the ends
  for (const i of [0, N]) {
    const s = samples[i];
    const sg = i === 0 ? -1 : 1;
    const t: FwVec3 = [0, -s.nz * sg, s.ny * sg];

    quad(P(i, gap - LIP, x - hx), P(i, gap - LIP, x + hx), P(i, gap + depth(i), x + hx), P(i, gap + depth(i), x - hx), t, 0.85, 0.85);
  }

  // the truss on both faces: a rim along the chain edge and along the back, ribs across at the ends, and diagonal ribs between
  // a raised bar from (i0, off0) to (i1, off1), `w` wide, on the face sg
  const bar = (i0: number, off0: number, i1: number, off1: number, w: number, sg: number) => {
    const a = P(i0, off0, 0);
    const c = P(i1, off1, 0);
    const dy = c[1] - a[1];
    const dz = c[2] - a[2];
    const l = Math.hypot(dy, dz) || 1;
    const ny = (-dz / l) * (w / 2);
    const nz = (dy / l) * (w / 2);
    const xs = x + sg * hx;
    const xr = x + sg * (hx + RIB);
    const c0: FwVec3 = [xr, a[1] - ny, a[2] - nz];
    const c1: FwVec3 = [xr, c[1] - ny, c[2] - nz];
    const c2: FwVec3 = [xr, c[1] + ny, c[2] + nz];
    const c3: FwVec3 = [xr, a[1] + ny, a[2] + nz];
    const lo = (q: FwVec3): FwVec3 => [xs, q[1], q[2]];

    quad(c0, c1, c2, c3, [sg, 0, 0], 1.12, 1.12); // its top
    quad(lo(c0), lo(c1), c1, c0, [0, -ny, -nz], 0.8, 0.8); // its sides
    quad(c3, c2, lo(c2), lo(c3), [0, ny, nz], 0.8, 0.8);
    quad(lo(c0), c0, c3, lo(c3), [0, -dy, -dz], 0.8, 0.8); // its ends
    quad(c1, lo(c1), lo(c2), c2, [0, dy, dz], 0.8, 0.8);
  };

  // as in the picture: a rim round both faces, and rungs straight across between, a ladder, the pockets between them sunk
  const BAY = 3; // samples from one rung to the next

  for (const sg of [-1, 1]) {
    for (let i = 0; i < N; i++) {
      bar(i, gap + 1.4, i + 1, gap + 1.4, 2.8, sg);
      bar(i, gap + depth(i) - 1.4, i + 1, gap + depth(i + 1) - 1.4, 2.8, sg);
    }

    for (let i = BAY; i < N; i += BAY) bar(i, gap + 1.4, i, gap + depth(i) - 1.4, 2.0, sg);

    bar(0, gap + 1.4, 0, gap + depth(0) - 1.4, 2.6, sg);
    bar(N, gap + 1.4, N, gap + depth(N) - 1.4, 2.6, sg);
  }

  // a bolt through the blade: a boss on the face, a washer, a flanged hex head; and its end on the far side
  const bolt = (i: number, r: number) => {
    const at = P(i, gap + depth(i) / 2, 0);

    for (const sg of [-1, 1]) {
      const face = x + sg * (hx + RIB);

      b.prismDir([face, at[1], at[2]], [sg, 0, 0], [0, 1, 0], [0, 0, 1], r + 2.6, 1.2, 24, 0, mat, mat); // the boss round it
    }

    b.prismDir([x - hx - RIB - 0.8, at[1], at[2]], [-1, 0, 0], [0, 1, 0], [0, 0, 1], r + 1.4, 0.9, 24, 0, MAT_VT_PAD, MAT_VT_PAD); // washer
    b.prismDir([x - hx - RIB - 1.7, at[1], at[2]], [-1, 0, 0], [0, 1, 0], [0, 0, 1], r + 0.6, 1.1, 24, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE); // flange
    b.prismDir([x - hx - RIB - 2.8, at[1], at[2]], [-1, 0, 0], [0, 1, 0], [0, 0, 1], r, 3.2, 6, 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE); // hex
    b.disc(x - hx - RIB - 6.0 - 0.03, 0, 0, r * 0.45, MAT_CT_GROOVE, 12, at[1], at[2], -1); // its centre mark
    // behind it, the standoff it is bolted through to the engine's front, a turned post with a collar
    b.prismDir([x + hx + RIB, at[1], at[2]], [1, 0, 0], [0, 1, 0], [0, 0, 1], r + 1.2, 12, 20, 0, MAT_VT_JOURNAL, MAT_VT_JOURNAL);
    b.prismDir([x + hx + RIB + 10, at[1], at[2]], [1, 0, 0], [0, 1, 0], [0, 0, 1], r + 2.6, 2, 20, 0, MAT_VT_TOWER_FACE, MAT_VT_SEAT);
  };

  const top = upEnd === 1 ? N - 2 : 2;
  const low = upEnd === 1 ? 2 : N - 2;

  if (kind === "fixed") {
    bolt(top, 3.6);
    bolt(low, 3.6);
  } else {
    bolt(top, 4.2); // the arm's pivot
  }

  // the hydraulic tensioner, bearing on the blade's back near its lower end (on both: the arm and the fixed guide)
  const iT = upEnd === 1 ? Math.round(N * 0.24) : Math.round(N * 0.76);
  const mid = samples[iT];
  const s = 1.25;
  const base = gap + depth(iT);
  const at = (dist: number): FwVec3 => [x, mid.y + mid.ny * (base + dist), mid.z + mid.nz * (base + dist)];
  const dir: FwVec3 = [0, mid.ny, mid.nz];
  const bx: FwVec3 = [1, 0, 0];
  const cx: FwVec3 = [0, mid.nz, -mid.ny];

  // as in the picture: the piston's broad round shoe, beige nylon, bearing on the arm's back; the piston; and the tensioner's
  // round body, machined, with its mounting flange
  b.prismDir(at(-0.2), dir, bx, cx, 9 * s, 2.6, 28, 0, MAT_GUIDE_SAND, MAT_GUIDE_SAND); // the shoe
  b.prismDir(at(2.4), dir, bx, cx, 4.2 * s, 14 * s, 20, 0, MAT_VT_JOURNAL, MAT_VT_JOURNAL); // piston

  for (const d of [3, 5.6, 8.2, 10.8]) b.prismDir(at(1.2 + d * s), dir, bx, cx, 4.28 * s, 0.7 * s, 20, 0, MAT_CT_GROOVE, MAT_CT_GROOVE); // ratchet grooves

  b.prismDir(at(1.2 + 13 * s), dir, bx, cx, 8.4 * s, 22 * s, 22, 0, MAT_VT_SEAT, MAT_VT_CAM_FACE); // body
  b.prismDir(at(1.2 + 14 * s), dir, bx, cx, 9.1 * s, 1.1 * s, 22, 0, MAT_CT_EDGE, MAT_CT_EDGE); // seal ring at its mouth
  b.prismDir(at(1.2 + 13 * s), dir, bx, cx, 11.8 * s, 3.4 * s, 6, 0.3, MAT_VT_TOWER_FACE, MAT_VT_SEAT); // its mounting flange
  for (const d of [20, 26]) b.prismDir(at(1.2 + d * s), dir, bx, cx, 8.6 * s, 0.8 * s, 22, 0, MAT_CT_GROOVE, MAT_CT_GROOVE); // turned rings
  b.prismDir(at(1.2 + 33 * s), dir, bx, cx, 9.8 * s, 3 * s, 22, 0, MAT_VT_TOWER_FACE, MAT_VT_SEAT); // cap ring
  b.prismDir(at(1.2 + 38 * s), dir, bx, cx, 5.4 * s, 4.8 * s, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE); // hex plug

  for (const side of [-1, 1]) {
    const flange = at(1.2 + 13 * s);

    b.prismDir([flange[0] + side * 8.8 * s, flange[1], flange[2]], dir, bx, cx, 2.8 * s, 5 * s, 6, 0.4, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE); // flange bolts
  }
}
