// The engine block's walls: a V of two banks over a crankcase, its skin a cool violet grey, sand-cast and matte. Built in the
// engine's own frame from each bank's: each bank's outer wall runs from its deck down along the bank, then the crankcase's
// skirt goes on down, a little inward, to the floor under the crank; the two banks' inner walls run down from their decks
// into the valley, where they meet. The two ends close it.
// As a casting is, it is rounded: its long corners (the valley, where each outer wall turns into the skirt, and where the
// skirt turns under into the floor) are filleted, and so is every edge round its two ends, except along the decks, where the
// heads stand on it: there the heads' ends, rounded the same way, carry the curve on up. Its ends stand where the heads' do.
// Ribs stand up and down it, rounded beads cast in relief, a light satin metal: down its two ends, and down its outer walls,
// its skirts and its inner walls into the valley, and two along the valley's channel. And the details of a real casting: a machined lip under each deck, core
// plugs in the outer walls between the cylinders, the engine mounts' bosses on the skirts, the sump rail's bolts along the
// floor, and the oil galleries' plugs in the ends.

import { BANKS, CT_X, DRIVE_DX } from "../core/constants";
import type { Bank } from "../core/constants";
import type { FwVec3 } from "./builder";
import { MAT_BLOCK, MAT_BLOCK_EMBOSS, MAT_BLOCK_MACH, MAT_BLOCK_RIB, MAT_CORE_PLUG, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE } from "./materials";
import { HEAD, HEAD_END_R } from "./head";
import { add, cross, filletArc, len, mul, quiltPanel, roundedRib, sub, triangulate, unit } from "./shapes";
import type { P2 } from "./shapes";
import type { MeshBuilder } from "./tubes";
import { VT } from "./valvetrain";


export const BLOCK = {
  x0: HEAD.x0 + DRIVE_DX, // its front face, where the heads' ends are, behind the timing drive and the sump pumps' gear cover
  x1: HEAD.x1 + DRIVE_DX, // its rear face, where the heads' ends are, in front of the flywheel
  half: 96, // each bank's half-width, at its deck
  outerFoot: -60, // where a bank's outer wall ends and the skirt begins, along the bank
  rail: 96, // the crankcase's floor, under the crank
  railZ: 92, // and how far out from the middle its edges are
};

const END_R = HEAD_END_R; // the fillet round the two ends: the heads' ends are rounded by as much, so that they run on into it
const END_STEPS = 6;
const CORNER_R = 16; // the fillets of the long corners
const CORNER_STEPS = 7;
const RIB = { pitch: 18, w: 8.8, h: 2.6, margin: 8, steps: 8 }; // the ribs: spacing, width, height, room left at their ends
// the walls' embossed pattern, outside and in the valley: linen-embossed stainless, upright columns RIB.pitch apart, their
// creases waving LENS.amp to either side over LENS.len (5.4 times the pitch, as the pattern it copies), each half a wave
// behind the next, so that each column is a chain of
// tall bulges and necks nested between its neighbours'; LENS.h high; drawn as a height field LENS.ds by LENS.dx fine,
// easing down to the wall over LENS.edge at its edges and round the plugs and mounts
const LENS = { pitch: 8, len: 43, amp: 8 * 0.31, h: 4.6, ds: 2.5, dx: 0.95, edge: 4 };

// A point of a bank's own section (y along the bank, z across it) in the engine's
const inBank = (bank: Bank, y: number, z: number): P2 => [bank.m[4] * y + bank.m[7] * z, bank.m[5] * y + bank.m[8] * z];

function section() {
  const deckY = VT.ySeat;
  const { half, outerFoot, rail, railZ } = BLOCK;
  // which side of a bank is out from the engine: its z whose engine z is away from the middle
  const outSign = (bank: Bank) => (Math.sign(inBank(bank, 0, 1)[1]) === Math.sign(inBank(bank, deckY, 0)[1]) ? 1 : -1);
  const bank = (b: Bank) => {
    const o = outSign(b);
    const deckOut = inBank(b, deckY, o * half);
    const deckIn = inBank(b, deckY, -o * half);
    const foot = inBank(b, outerFoot, o * half);
    // where the inner wall meets the middle plane
    const zi = inBank(b, 0, -o * half)[1];
    const dz = inBank(b, 1, 0)[1];
    const valley = inBank(b, -zi / dz, -o * half);
    const railP: P2 = [rail, Math.sign(foot[1]) * railZ];

    return { deckOut, deckIn, foot, valley, railP };
  };

  return { a: bank(BANKS[0]), b: bank(BANKS[1]) };
}

// One vertex of the block's outline: where it is, and whether the outline is smooth through it (on a fillet's arc)
type OV = { p: P2; smooth: boolean };

// The section's outline, all the way round, its long corners filleted. `deck[i]`: the edge from vertex i to i + 1 is a
// deck, where a head stands (not rounded at the ends)
function outline(): { v: OV[]; deck: boolean[] } {
  const { a, b } = section();
  const V: P2 = [(a.valley[0] + b.valley[0]) / 2, 0];
  // the sharp outline, and the radius of each corner's fillet (0: left sharp)
  const sharp: Array<{ p: P2; r: number }> = [
    { p: a.deckOut, r: 0 },
    { p: a.deckIn, r: 0 },
    { p: V, r: CORNER_R },
    { p: b.deckIn, r: 0 },
    { p: b.deckOut, r: 0 },
    { p: b.foot, r: CORNER_R * 2.5 },
    { p: b.railP, r: CORNER_R },
    { p: a.railP, r: CORNER_R },
    { p: a.foot, r: CORNER_R * 2.5 },
  ];
  const v: OV[] = [];
  const deck: boolean[] = [];
  const n = sharp.length;

  for (let i = 0; i < n; i++) {
    const { p, r } = sharp[i];

    if (r === 0) {
      v.push({ p, smooth: false });
      deck.push(i === 0 || i === 3); // a.deckOut → a.deckIn, b.deckIn → b.deckOut
      continue;
    }

    // a fillet of radius r, tangent to the two edges at the corner
    const arc = filletArc(sharp[(i + n - 1) % n].p, p, sharp[(i + 1) % n].p, r, CORNER_STEPS);

    arc.forEach((q, k) => {
      v.push({ p: q, smooth: k > 0 && k < CORNER_STEPS });
      deck.push(false);
    });
  }

  return { v, deck };
}

export function buildBlock(b: MeshBuilder) {
  const { x0, x1 } = BLOCK;
  const { v, deck } = outline();
  const n = v.length;
  const pts = v.map((q) => q.p);
  const ccw = pts.reduce((s, p, i) => s + cross(p, pts[(i + 1) % n]), 0) > 0;
  // each edge's outward normal (in the section)
  const edgeN: P2[] = pts.map((p, i) => {
    const d = unit(sub(pts[(i + 1) % n], p));

    return ccw ? [d[1], -d[0]] : [-d[1], d[0]];
  });
  // a vertex's normal on edge e: smooth through a fillet, the edge's own at a sharp corner
  const vertN = (i: number, e: number): P2 => (v[i].smooth ? unit(add(edgeN[(i + n - 1) % n], edgeN[i])) : edgeN[e]);

  // the outline drawn in by d (every edge but the decks), its vertices where the drawn-in edges meet
  const inset = (d: number): P2[] =>
    pts.map((p, i) => {
      const e0 = (i + n - 1) % n;
      const n0 = edgeN[e0];
      const n1 = edgeN[i];
      const d0 = deck[e0] ? 0 : d;
      const d1 = deck[i] ? 0 : d;
      const det = cross(n0, n1);

      if (Math.abs(det) < 1e-6) return sub(p, mul(n1, d1));

      // the shift a with a · n0 = -d0 and a · n1 = -d1
      const ax = (-d0 * n1[1] + d1 * n0[1]) / det;
      const ay = (-d1 * n0[0] + d0 * n1[0]) / det;

      return [p[0] + ax, p[1] + ay];
    });

  const P = (q: P2, x: number): FwVec3 => [x, q[0], q[1]];
  const N3 = (q: P2, nx: number): FwVec3 => {
    const l = Math.hypot(nx, q[0], q[1]) || 1;

    return [nx / l, q[0] / l, q[1] / l];
  };
  const tri = (a: FwVec3, na: FwVec3, c: FwVec3, nc: FwVec3, d: FwVec3, nd: FwVec3) => {
    b.push(a, na, MAT_BLOCK, 1);
    b.push(c, nc, MAT_BLOCK, 1);
    b.push(d, nd, MAT_BLOCK, 1);
  };

  // the rings along the block: the fillet at the front, then (one long step) the walls, then the fillet at the rear. Each
  // ring: its x, how far it is drawn in, and how far its normals lean toward the end it faces (the fillet's sine, signed)
  const rings: Array<{ x: number; d: number; lean: number }> = [];

  for (let k = END_STEPS; k >= 0; k--) {
    const th = (k / END_STEPS) * (Math.PI / 2);

    rings.push({ x: x0 + END_R - END_R * Math.sin(th), d: END_R * (1 - Math.cos(th)), lean: -Math.sin(th) });
  }

  for (let k = 0; k <= END_STEPS; k++) {
    const th = (k / END_STEPS) * (Math.PI / 2);

    rings.push({ x: x1 - END_R + END_R * Math.sin(th), d: END_R * (1 - Math.cos(th)), lean: Math.sin(th) });
  }

  const ringPts = rings.map((r) => inset(r.d));

  for (let r = 0; r + 1 < rings.length; r++) {
    const A = rings[r];
    const B = rings[r + 1];

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      // the normal at one end of the edge, leaning toward the block's end (the decks stay flat: they are not rounded)
      const nAt = (vi: number, lean: number): FwVec3 =>
        deck[i] ? N3(edgeN[i], 0) : N3(mul(vertN(vi, i), Math.sqrt(Math.max(0, 1 - lean * lean))), lean);
      const pAi = P(ringPts[r][i], A.x);
      const pAj = P(ringPts[r][j], A.x);
      const pBi = P(ringPts[r + 1][i], B.x);
      const pBj = P(ringPts[r + 1][j], B.x);

      tri(pAi, nAt(i, A.lean), pAj, nAt(j, A.lean), pBj, nAt(j, B.lean));
      tri(pAi, nAt(i, A.lean), pBj, nAt(j, B.lean), pBi, nAt(i, B.lean));
    }
  }

  // the two end faces: the outline drawn in by the whole fillet
  const cap = inset(END_R);
  const capTris = triangulate(cap);

  for (const [x, nx] of [[x0, -1], [x1, 1]] as Array<[number, number]>) {
    const nn: FwVec3 = [nx, 0, 0];

    for (const [i, j, k] of capTris) tri(P(cap[i], x), nn, P(cap[j], x), nn, P(cap[k], x), nn);
  }

  // ---- the ribs ----
  // one rib: a bead in relief from s0 to s1 along `along`, its middle line through `c`, standing out along `out`
  const rib = (c: FwVec3, along: FwVec3, out: FwVec3, w: FwVec3, s0: number, s1: number) =>
    roundedRib(b, MAT_BLOCK_RIB, RIB, c, along, out, w, s0, s1);

  // the outline's straight walls: each run from vertex i to i + 1 that is a wall (not a deck, not on a fillet)
  type Run = { p: P2; d: P2; no: P2; len: number; deckAt0: boolean; deckAt1: boolean; kind: "outer" | "skirt" | "inner" };
  const runs: Run[] = [];

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;

    if (deck[i] || v[i].smooth || v[j].smooth) continue;

    const p = pts[i];
    const runLen = len(sub(pts[j], p));

    if (runLen < 30) continue;

    const deckAt0 = deck[(i + n - 1) % n];
    const deckAt1 = deck[j];
    const no = edgeN[i];
    // the outer walls face away from the middle and up; the inner ones, into the valley, face up and toward the middle
    const kind = deckAt0 || deckAt1 ? (Math.sign(no[1]) === Math.sign(p[1]) ? "outer" : "inner") : "skirt";

    runs.push({ p, d: unit(sub(pts[j], p)), no, len: runLen, deckAt0, deckAt1, kind });
  }

  const LIP = 7; // the machined lip's height, under the deck
  // the core plugs: in each outer wall, between that bank's cylinders, halfway down it
  const plugXs = (bankIdx: number) => CT_X.slice(0, -1).map((x, k) => (x + CT_X[k + 1]) / 2 + BANKS[bankIdx].dx);
  // the engine mounts' bosses: on each skirt, near the front and the rear
  const MOUNT = { len: 70, h: 3, at: [x0 + 160, x1 - 160] };

  for (const run of runs) {
    const { p, d, no } = run;
    const bankIdx = Math.sign(p[1]) === Math.sign(inBank(BANKS[0], -200, 0)[1]) ? 0 : 1;
    const plugs = run.kind === "outer" ? plugXs(bankIdx) : [];
    const mounts = run.kind === "skirt" ? MOUNT.at : [];
    const s0 = run.deckAt0 ? LIP + 4 : RIB.margin;
    const s1 = run.len - (run.deckAt1 ? LIP + 4 : RIB.margin);
    const P3 = (s: number, x: number, h = 0): FwVec3 => [x, p[0] + d[0] * s + no[0] * h, p[1] + d[1] * s + no[1] * h];

    // the embossed pattern over the wall, quilted metal, the length of the block; flat round each core plug and mount
    {
      const sMid = run.len / 2;
      const flat = (s: number, x: number) => {
        let f = 0;

        for (const xp of plugs) f = Math.max(f, 1 - Math.max(0, Math.hypot(x - xp, s - sMid) - 12) / 6);
        for (const xm of mounts) f = Math.max(f, 1 - Math.max(0, Math.abs(x - xm) - MOUNT.len / 2 - 2) / 6);

        return Math.max(0, Math.min(1, f));
      };

      quiltPanel(b, MAT_BLOCK_EMBOSS, LENS, P3(0, 0), [0, d[0], d[1]], [0, no[0], no[1]], [1, 0, 0], s0, s1, x0 + END_R + 2, x1 - END_R - 2, flat);
    }

    // the machined lip under the deck, the length of the block
    if (run.deckAt0 || run.deckAt1) {
      const sa = run.deckAt0 ? 0 : run.len - LIP;
      const sb = sa + LIP;
      const xa = x0 + END_R;
      const xb = x1 - END_R;
      const t = 1.2;
      const nOut: FwVec3 = [0, no[0], no[1]];
      const nUp: FwVec3 = [0, -d[0], -d[1]];

      b.flatQuad(P3(sa, xa, t), P3(sa, xb, t), P3(sb, xb, t), P3(sb, xa, t), nOut, MAT_BLOCK_MACH);
      b.flatQuad(P3(sa, xa, 0), P3(sa, xb, 0), P3(sa, xb, t), P3(sa, xa, t), nUp, MAT_BLOCK_MACH);
      b.flatQuad(P3(sb, xa, 0), P3(sb, xb, 0), P3(sb, xb, t), P3(sb, xa, t), [0, d[0], d[1]], MAT_BLOCK_MACH);

      for (const [x, sx] of [[xa, -1], [xb, 1]] as Array<[number, number]>) {
        b.flatQuad(P3(sa, x, 0), P3(sb, x, 0), P3(sb, x, t), P3(sa, x, t), [sx, 0, 0], MAT_BLOCK_MACH);
      }
    }

    // the core plugs: brass cups pressed into the wall, each in a machined spot face
    for (const xp of plugs) {
      const c = P3(run.len / 2, xp);
      const ax: FwVec3 = [0, no[0], no[1]];
      const u: FwVec3 = [1, 0, 0];
      const vv: FwVec3 = [0, d[0], d[1]];

      b.prismDir(c, ax, u, vv, 13, 0.8, 32, 0, MAT_BLOCK_MACH, MAT_BLOCK_MACH);
      b.prismDir([c[0] + ax[0] * 0.8, c[1] + ax[1] * 0.8, c[2] + ax[2] * 0.8], ax, u, vv, 9.5, 1.6, 32, 0, MAT_CORE_PLUG, MAT_CORE_PLUG);
    }

    // the engine mounts' bosses: a raised pad on the skirt, machined flat, with four bolts
    for (const xm of mounts) {
      const sm = run.len / 2;
      const hl = MOUNT.len / 2;
      const hs = Math.min(26, run.len / 2 - 6);
      const H = MOUNT.h;
      const q = (ds: number, dx: number, h: number) => P3(sm + ds, xm + dx, h);
      const nOut: FwVec3 = [0, no[0], no[1]];

      b.flatQuad(q(-hs, -hl, H), q(-hs, hl, H), q(hs, hl, H), q(hs, -hl, H), nOut, MAT_BLOCK_MACH);
      b.flatQuad(q(-hs, -hl, 0), q(-hs, hl, 0), q(-hs, hl, H), q(-hs, -hl, H), [0, -d[0], -d[1]], MAT_BLOCK);
      b.flatQuad(q(hs, -hl, 0), q(hs, hl, 0), q(hs, hl, H), q(hs, -hl, H), [0, d[0], d[1]], MAT_BLOCK);
      b.flatQuad(q(-hs, -hl, 0), q(hs, -hl, 0), q(hs, -hl, H), q(-hs, -hl, H), [-1, 0, 0], MAT_BLOCK);
      b.flatQuad(q(-hs, hl, 0), q(hs, hl, 0), q(hs, hl, H), q(-hs, hl, H), [1, 0, 0], MAT_BLOCK);

      for (const ds of [-hs + 9, hs - 9]) {
        for (const dx of [-hl + 11, hl - 11]) {
          const c = q(ds, dx, H);

          b.prismDir(c, nOut, [1, 0, 0], [0, d[0], d[1]], 7.4, 1.4, 24, 0, MAT_BLOCK_MACH, MAT_CT_NUT_SIDE);
          b.prismDir([c[0] + nOut[0] * 1.4, c[1] + nOut[1] * 1.4, c[2] + nOut[2] * 1.4], nOut, [1, 0, 0], [0, d[0], d[1]], 5.4, 5, 6, 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
        }
      }
    }
  }

  // along the valley's channel, where the two banks' inner walls meet: two ribs side by side the length of the block, on
  // the fillet's curve, either side of its bottom
  {
    const iB = deck.findIndex((dk, i) => dk && i > 0); // b.deckIn: the valley's arc lies between a.deckIn and it
    const arc = Array.from({ length: iB - 2 }, (_, k) => k + 2);

    for (const k of [arc[2], arc[arc.length - 3]]) {
      const q = pts[k];
      const nq = vertN(k, k);
      const t: P2 = [-nq[1], nq[0]];

      rib([0, q[0], q[1]], [1, 0, 0], [0, nq[0], nq[1]], [0, t[0], t[1]], x0 + END_R + 3, x1 - END_R - 3);
    }
  }

  // down the two ends: upright ribs, each cut to the end face's outline (under the valley it runs from it to the floor)
  {
    const zs = cap.map((q) => q[1]);
    const zLo = Math.min(...zs) + RIB.margin + RIB.w;
    const zHi = Math.max(...zs) - RIB.margin - RIB.w;
    const count = Math.floor((zHi - zLo) / RIB.pitch);
    const start = (zLo + zHi) / 2 - (count * RIB.pitch) / 2;

    for (let k = 0; k <= count; k++) {
      const z = start + k * RIB.pitch;
      const ys: number[] = [];

      for (let i = 0; i < cap.length; i++) {
        const p = cap[i];
        const q = cap[(i + 1) % cap.length];

        if ((p[1] - z) * (q[1] - z) < 0) ys.push(p[0] + ((z - p[1]) / (q[1] - p[1])) * (q[0] - p[0]));
      }

      ys.sort((u, w) => u - w);

      for (let m = 0; m + 1 < ys.length; m += 2) {
        for (const [x, nx] of [[x0, -1], [x1, 1]] as Array<[number, number]>) {
          rib([x, 0, z], [0, 1, 0], [nx, 0, 0], [0, 0, 1], ys[m] + RIB.margin, ys[m + 1] - RIB.margin);
        }
      }
    }
  }

  // the oil galleries' plugs, in the two ends: hex plugs high up, either side of the valley, on bright spot faces
  for (const [x, nx] of [[x0, -1], [x1, 1]] as Array<[number, number]>) {
    for (const sz of [-1, 1]) {
      const c: FwVec3 = [x, -150, sz * 58];
      const ax: FwVec3 = [nx, 0, 0];

      b.prismDir([c[0] + nx * RIB.h, c[1], c[2]], ax, [0, 1, 0], [0, 0, 1], 9, 0.8, 28, 0, MAT_BLOCK_MACH, MAT_BLOCK_MACH);
      b.prismDir([c[0] + nx * (RIB.h + 0.8), c[1], c[2]], ax, [0, 1, 0], [0, 0, 1], 6, 3.4, 6, 0.2, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
    }
  }

  // the sump rail's bolts: up through the floor's two edges, all along it
  {
    const { rail, railZ } = BLOCK;
    const nb = Math.floor((x1 - x0 - 2 * END_R - 40) / 55);

    for (let k = 0; k <= nb; k++) {
      const x = x0 + END_R + 20 + ((x1 - x0 - 2 * END_R - 40) * k) / nb;

      for (const sz of [-1, 1]) {
        const c: FwVec3 = [x, rail, sz * (railZ - CORNER_R - 8)];

        b.prismDir(c, [0, 1, 0], [1, 0, 0], [0, 0, 1], 6.4, 1.2, 24, 0, MAT_BLOCK_MACH, MAT_CT_NUT_SIDE);
        b.prismDir([c[0], c[1] + 1.2, c[2]], [0, 1, 0], [1, 0, 0], [0, 0, 1], 4.8, 4.4, 6, 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
      }
    }
  }
}
