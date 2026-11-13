// The intake manifold's plenum (plumbing.ts, PLENUM), in the engine's frame, after a billet racing manifold, blasted a
// fine matte grey: its lower body, the sides chamfered in underneath, a round six-bolt flange on the chamfer for each of
// the twelve runners and a column under the flange over each cylinder, four threaded ports in its back; a double flange
// round its top, the two plates with a fine groove between them; the domed lid of two lobes on it, held down by two
// staggered rows of black socket-head bolts. At its front the gate: a funnel, bosses round it with their bolts, opening
// into a big square flange; the throttle on it; and in front, the Y that brings the cooled charge from both intercoolers.
// The plenum is drawn on the solid engine only (taken away on the see-through one, to see in); the gate, the throttle and
// the Y on both.

import { BANKS, CT_X, TAU, bankPoint } from "../core/constants";
import { FW_STRIDE } from "./builder";
import type { FwVec3 } from "./builder";
import { MAT_ALU_CAST, MAT_ALU_TURNED, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_CLAMP_BLACK, MAT_CLAMP_BLACK_DEEP, MAT_COVER_FIN, MAT_FIN_GREY, MAT_FIN_GREY_CREST, MAT_HEAD_CAST, MAT_FIN_GREY_ROOT, MAT_PIPE_BLACK, MAT_PLENUM_RED, MAT_PLENUM_RED_DEEP, MAT_STEEL_BRIGHT } from "./materials";
import { curveAt, curveFromPoints, flangeBolt, flangeJoint, roundedCurve, sweepTube } from "./tubes";
import type { Curve, MeshBuilder } from "./tubes";
import { PIPES, PLENUM, PLENUM_INLETS, Y_BRANCH, bodySection, headY, lidHeight, plenumW, socketCap } from "./plumbing";
import { vadd, vnorm, vscale } from "../math/vec3";
import { LID_SIG } from "./headText";

const GREY = MAT_PLENUM_RED; // (the plenum's red, matte, with its sandpaper grit)
const DEEP = MAT_PLENUM_RED_DEEP;

// the stations along the plenum: close together toward its ends, where it curves
function stations(): number[] {
  const { xf, xr } = PLENUM;
  const xs: number[] = [];

  for (let k = 0; k <= 10; k++) xs.push(xf + 40 * (1 - Math.cos((k / 10) * (Math.PI / 2))));
  for (let k = 1; k <= 56; k++) xs.push(xf + 40 + ((xr - xf - 100) * k) / 56);
  for (let k = 1; k <= 24; k++) xs.push(xr - 60 + 60 * Math.sin((k / 24) * (Math.PI / 2)));

  return xs;
}

// The plan's outline round the plenum, `o` out from its edge, as plenumW's: along the +z side from the back to the
// front, across the front, back along the -z side, and across the back
function outline(o: number): Array<[number, number]> {
  const { xf, xr } = PLENUM;
  const xs = stations();
  const pts: Array<[number, number]> = [];
  const across = (x: number, z0: number, z1: number) => {
    for (let k = 1; k < 8; k++) pts.push([x, z0 + ((z1 - z0) * k) / 8]);
  };

  for (const x of xs.slice().reverse()) pts.push([x + (x >= xr - 1 ? o : x <= xf + 1 ? -o : 0), plenumW(x) + o]);
  across(xf - o, plenumW(xf) + o, -(plenumW(xf) + o));
  for (const x of xs) pts.push([x + (x >= xr - 1 ? o : x <= xf + 1 ? -o : 0), -(plenumW(x) + o)]);
  across(xr + o, -(plenumW(xr) + o), plenumW(xr) + o);

  return pts;
}

// A plate in plan, of `outline`, from y0 down to y1 (y grows downward): its sides, top and underside
function plate(b: MeshBuilder, pts: Array<[number, number]>, y0: number, y1: number, side: typeof GREY, top: typeof GREY) {
  const n = pts.length;
  const cx = pts.reduce((m, p) => m + p[0], 0) / n;

  for (let k = 0; k < n; k++) {
    const [x0, z0] = pts[k];
    const [x1, z1] = pts[(k + 1) % n];
    const l = Math.hypot(x1 - x0, z1 - z0) || 1;

    b.flatQuad([x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], [(z1 - z0) / l, 0, -(x1 - x0) / l], side);
  }

  b.flatFan([cx, y0, 0], [...pts, pts[0]].map(([x, z]): FwVec3 => [x, y0, z]), [0, -1, 0], top);
  b.flatFan([cx, y1, 0], [...pts, pts[0]].map(([x, z]): FwVec3 => [x, y1, z]), [0, 1, 0], side);
}

// The red of the intake's lid and body runs as a gradient along the engine: from the front a deeper red (30% darker
// than the plain #cc0000), held for its first quarter or so, then slowly, gently lightening toward the back, where it
// ends lighter than it began but a touch darker than the plain red. Only the red changes (its deep red in the valleys
// in step); its grit, its sheen and everything else stay as they are
const RED_FRONT: FwVec3 = [143, 0, 0]; // at the front
const RED_BACK: FwVec3 = [192, 0, 0]; // and at the back
const RED_HOLD = 0.27; // the share of the length, from the front, before it begins to lighten
const RED_END: FwVec3 = [214, 8, 6]; // where the back half ends: a little lighter than RED_BACK
// the front half's red at a share u of the length (as the gradient first was, from RED_FRONT toward RED_BACK)
function redFirst(u: number): FwVec3 {
  const v = Math.max(0, Math.min(1, (u - RED_HOLD) / (1 - RED_HOLD)));
  const t = v * v * (3 - 2 * v);

  return [RED_FRONT[0] + (RED_BACK[0] - RED_FRONT[0]) * t, RED_FRONT[1] + (RED_BACK[1] - RED_FRONT[1]) * t, RED_FRONT[2] + (RED_BACK[2] - RED_FRONT[2]) * t];
}
let redSpan: [number, number] = [0, 1]; // the lid's length, front to back (set as it is built)

function redGradient(b: MeshBuilder, start: number) {
  const out = b.out;
  const plain = MAT_PLENUM_RED.color[0] / 255;

  for (let i = start * FW_STRIDE; i < out.length; i += FW_STRIDE) {
    const r = out[i + 6];

    // the plenum's reds only: pure reds, no green or blue in them
    if (r <= 0 || out[i + 7] !== 0 || out[i + 8] !== 0) continue;

    const u = Math.max(0, Math.min(1, (out[i] - redSpan[0]) / (redSpan[1] - redSpan[0] || 1)));
    const k = r / plain; // the deep red keeps its share of the plain red
    let c: FwVec3;

    if (u <= 0.5) {
      // the front half: the gradient as it was
      c = redFirst(u);
    } else {
      // the back half: on from where the front half ends, lightening a little further, slowly, to RED_END
      const m = redFirst(0.5);
      const w = (u - 0.5) / 0.5;
      const t = w * w * (3 - 2 * w);

      c = [m[0] + (RED_END[0] - m[0]) * t, m[1] + (RED_END[1] - m[1]) * t, m[2] + (RED_END[2] - m[2]) * t];
    }

    out[i + 6] = (c[0] / 255) * k;
    out[i + 7] = (c[1] / 255) * k;
    out[i + 8] = (c[2] / 255) * k;
  }
}

export function buildVPlenum(b: MeshBuilder) {
  const start = b.out.length / FW_STRIDE;
  const xs = stations();

  buildLid(b, xs);
  buildLidFins(b);
  buildFlange(b);
  buildBody(b, xs);
  buildVClose(b);
  runnerPads(b);

  // its length, from its front to the back of its reds
  let x1 = -1e9;

  for (let i = start * FW_STRIDE; i < b.out.length; i += FW_STRIDE) {
    if (b.out[i + 6] > 0 && b.out[i + 7] === 0 && b.out[i + 8] === 0) x1 = Math.max(x1, b.out[i]);
  }

  redSpan = [PLENUM.xf, x1];
  redGradient(b, start);
}

// The lid: its dome over the flange, two lobes and the valley between them, its edges rolling down on to the flange
function buildLid(b: MeshBuilder, xs: number[]) {
  const NZ = 80;
  const y0 = PLENUM.yLid;
  const P = (x: number, z: number): FwVec3 => [x, y0 - lidHeight(x, z), z];
  const N = (x: number, z: number): FwVec3 => {
    const e = 0.5;
    const hx = (lidHeight(x + e, z) - lidHeight(x - e, z)) / (2 * e);
    const hz = (lidHeight(x, z + e) - lidHeight(x, z - e)) / (2 * e);

    return vnorm([-hx, -1, -hz]);
  };
  const Z = (x: number, j: number) => -(plenumW(x) - 4) * Math.cos((Math.PI * j) / NZ);

  for (let i = 0; i + 1 < xs.length; i++) {
    for (let j = 0; j < NZ; j++) {
      for (const [ii, jj] of [[i, j], [i + 1, j], [i + 1, j + 1], [i, j], [i + 1, j + 1], [i, j + 1]]) {
        const x = xs[ii];
        const z = Z(x, jj);
        const h = lidHeight(x, z);

        b.push(P(x, z), N(x, z), GREY, 0.72 + 0.28 * Math.min(1, h / 50));
      }
    }
  }
}

// The fins along the lid: close-set, broad, bright metallic grey, standing square out of its skin and following it,
// thick and tall at the front, where the charge comes in from the turbochargers, thinning and lowering toward the
// flywheel; each with a fillet where it grows out of the lid, walls with a little draft and a round machined crest, and
// rounded down into the lid at both its ends
const LID_FIN = {
  // in shares of the lid's half width; the outer four down each side evenly spaced along its curved skin (from the foot
  // by the head up to where it rounds over onto the top)
  across: [-0.985, -0.93, -0.843, -0.7, -0.54, -0.38, -0.22, -0.07, 0.07, 0.22, 0.38, 0.54, 0.7, 0.843, 0.93, 0.985],
  t: [9, 3.6], // the thickness at the foot, at the front and at the back
  h: [15, 5], // how far it stands out
};

export type FinPt = { p: [number, number]; n: [number, number]; m: typeof MAT_FIN_GREY };

export function finSection(t: number, h: number): FinPt[] {
  const f = t * 0.4; // the fillet
  const tb = t / 2;
  const tt = Math.min(tb * 0.7, h * 0.42); // the crest's radius
  const yc = Math.max(tt, h - tt);
  const wl = Math.hypot(yc - f, tb - tt) || 1;
  const wall: [number, number] = [-(yc - f) / wl, (tb - tt) / wl];
  const left: FinPt[] = [];

  for (let k = 0; k <= 4; k++) {
    const a = (k / 4) * (Math.PI / 2);

    left.push({ p: [-tb - f + f * Math.sin(a), f - f * Math.cos(a)], n: [-Math.sin(a), Math.cos(a)], m: MAT_FIN_GREY_ROOT });
  }
  left.push({ p: [-tb, f], n: wall, m: MAT_FIN_GREY });
  left.push({ p: [-tt, yc], n: wall, m: MAT_FIN_GREY });
  for (let k = 1; k <= 6; k++) {
    const a = Math.PI - (k / 12) * Math.PI;

    left.push({ p: [tt * Math.cos(a), yc + tt * Math.sin(a)], n: [Math.cos(a), Math.sin(a)], m: MAT_FIN_GREY_CREST });
  }

  return [...left, ...left.slice(0, -1).reverse().map((q): FinPt => ({ p: [-q.p[0], q.p[1]], n: [-q.n[0], q.n[1]], m: q.m }))];
}

function buildLidFins(b: MeshBuilder) {
  const { xf, xr, yLid } = PLENUM;
  const x0 = xf + 30;
  const x1 = xr - 50;
  const n = 120;
  const P = (x: number, z: number): FwVec3 => [x, yLid - lidHeight(x, z), z];
  const N = (x: number, z: number): FwVec3 => {
    const e = 0.5;
    const hx = (lidHeight(x + e, z) - lidHeight(x - e, z)) / (2 * e);
    const hz = (lidHeight(x, z + e) - lidHeight(x, z - e)) / (2 * e);

    return vnorm([-hx, -1, -hz]);
  };

  for (const c of LID_FIN.across) {
    const rows: Array<Array<{ p: FwVec3; n: FwVec3; m: typeof MAT_FIN_GREY }> | null> = [];

    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n;
      const z = c * (plenumW(x) - 4);

      if (lidHeight(x, z) < 2) {
        rows.push(null);
        continue;
      }

      // the fins in the middle stop short of the signature cut into the lid there, a margin all round it, and round down
      // into the lid at the gap as they do at their ends
      const gx = Math.abs(x - LID_SIG.x) - (LID_SIG.hx + LID_SIG.margin);
      const inBand = Math.abs(z - LID_SIG.z) < LID_SIG.hz + LID_SIG.margin;

      if (inBand && gx < 0) {
        rows.push(null);
        continue;
      }

      const u = k / n;
      const ends = Math.min(1, (x - x0) / 26, (x1 - x) / 40, inBand ? gx / 22 : 1);
      const h = Math.max(0.5, (LID_FIN.h[0] + (LID_FIN.h[1] - LID_FIN.h[0]) * Math.pow(u, 0.9)) * Math.sqrt(Math.max(0, ends)));
      const t = (LID_FIN.t[0] + (LID_FIN.t[1] - LID_FIN.t[0]) * Math.pow(u, 0.9)) * (0.55 + 0.45 * Math.sqrt(Math.max(0, ends)));
      const p0 = P(x, z);
      const nn = N(x, z);
      const side = vnorm([0, nn[2], -nn[1]]);

      rows.push(finSection(t, h).map((q) => ({
        p: vadd(vadd(p0, vscale(side, q.p[0])), vscale(nn, q.p[1] - 0.8)),
        n: vnorm(vadd(vscale(side, q.n[0]), vscale(nn, q.n[1]))),
        m: q.m,
      })));
    }

    for (let k = 0; k < n; k++) {
      const A = rows[k];
      const B = rows[k + 1];

      if (!A || !B) continue;

      for (let j = 0; j + 1 < A.length; j++) {
        const m = A[j].m === A[j + 1].m ? A[j].m : MAT_FIN_GREY;

        for (const q of [A[j], B[j], B[j + 1], A[j], B[j + 1], A[j + 1]]) b.push(q.p, q.n, m, 1);
      }
    }
  }
}

// The double flange round the plenum's top: the upper plate (the lid's), a fine groove, the lower (the body's); and on
// it two staggered rows of socket-head bolts along both sides, and three round the back and the front
function buildFlange(b: MeshBuilder) {
  const { yLid, yFlange, xf, xr } = PLENUM;
  const ym = (yLid + yFlange) / 2;

  plate(b, outline(14), yLid, ym - 0.8, GREY, GREY);
  plate(b, outline(11.5), ym - 0.8, ym + 0.8, DEEP, DEEP);
  plate(b, outline(14), ym + 0.8, yFlange, GREY, GREY);

  const pitch = (CT_X[1] - CT_X[0]) / 2;

  for (let x = xf + 30, k = 0; x < xr - 40; x += pitch, k++) {
    for (const sd of [-1, 1]) {
      const z = sd * (k % 2 === 0 ? plenumW(x) + 2 : plenumW(x) + 9.5);

      socketCap(b, [x, yLid, z], [0, -1, 0], 3.6);
    }
  }

  for (const f of [-0.6, 0, 0.6]) {
    socketCap(b, [xr + 6, yLid, f * plenumW(xr)], [0, -1, 0], 3.6);
    socketCap(b, [xf - 6, yLid, f * 1.2 * plenumW(xf)], [0, -1, 0], 3.6);
  }
}

// The lower body under the flange: its section along the plenum, its ends closed; a column under the flange over each
// cylinder, and in its back face four threaded ports
function buildBody(b: MeshBuilder, xs: number[]) {
  const ring = (x: number): FwVec3[] => {
    const half = bodySection(x);
    const all = [...half, ...half.slice().reverse().map(([z, y]): [number, number] => [-z, y])];

    return all.map(([z, y]): FwVec3 => [x, y, z]);
  };

  for (let i = 0; i + 1 < xs.length; i++) {
    const a = ring(xs[i]);
    const c = ring(xs[i + 1]);

    for (let k = 0; k + 1 < a.length; k++) {
      const dz = a[k + 1][2] - a[k][2];
      const dy = a[k + 1][1] - a[k][1];
      const l = Math.hypot(dz, dy) || 1;
      const nn: FwVec3 = [0, dz / l, -dy / l];
      const out = (a[k][2] + a[k + 1][2]) * nn[2] + ((a[k][1] + a[k + 1][1]) / 2 - PLENUM.yFlange) * nn[1] >= 0;

      b.flatQuad(a[k], c[k], c[k + 1], a[k + 1], out ? nn : [0, -nn[1], -nn[2]], k === bodySection(xs[i]).length - 1 ? DEEP : GREY);
    }
  }

  for (const [x, dir] of [[xs[0], -1], [xs[xs.length - 1], 1]] as Array<[number, number]>) {
    const r = ring(x);

    b.flatFan([x, (PLENUM.yFlange + PLENUM.yb) / 2, 0], [...r, r[0]], [dir, 0, 0], GREY);
  }

  // the columns, over each cylinder (between the two banks' runners), on both sides
  for (const cx of CT_X) {
    for (const sd of [-1, 1]) {
      const W = plenumW(cx) - 5;
      const z0 = sd > 0 ? W - 1 : -W - 5;

      b.box(cx - 8, cx + 8, PLENUM.yFlange, headY(W) - 1, z0, z0 + 6, GREY);
    }
  }

  // the four ports in its back: each a machined spot face, the threaded bore dark in it
  const xb = xs[xs.length - 1];

  for (const z of [-30, -11, 11, 30]) {
    b.prismDir([xb, -440, z], [1, 0, 0], [0, 1, 0], [0, 0, 1], 7, 1.2, 24, 0, MAT_ALU_TURNED, MAT_ALU_TURNED);
    b.prismDir([xb + 1.2, -440, z], [1, 0, 0], [0, 1, 0], [0, 0, 1], 4.2, 0.3, 20, 0, MAT_PIPE_BLACK, MAT_PIPE_BLACK);
  }
}

// At the back, past the last runners, the V under the body closed down to where the heads' walls meet: a wedge cast
// with the body, let into the walls a little, its back face flat, its front sloping down and forward
function buildVClose(b: MeshBuilder) {
  const x1 = CT_X[CT_X.length - 1] + 120; // its back face
  const len = 50;
  const ramp = 30;
  const top = PLENUM.yb;
  const apex = -214;
  const wall = (y: number) => 54 + ((115 - 54) * (y + 304)) / (-402 + 304) - 2;
  const sec: Array<[number, number]> = [];

  for (let k = 0; k <= 12; k++) {
    const y = top + ((apex - top) * k) / 12;

    sec.push([Math.max(4, wall(y)), y]);
  }
  for (let k = 12; k >= 0; k--) sec.push([-sec[k][0], sec[k][1]]);

  const front = (y: number) => x1 - len + (ramp * (y - top)) / (apex - top);
  const back = sec.map(([z, y]): FwVec3 => [x1, y, z]);
  const fr = sec.map(([z, y]): FwVec3 => [front(y), y, z]);
  const mid = (top + apex) / 2;

  b.flatFan([x1, mid, 0], [...back, back[0]], [1, 0, 0], GREY);
  b.flatFan([front(mid), mid, 0], [...fr, fr[0]], [-1, 0, 0], DEEP);

  for (let k = 0; k + 1 < sec.length; k++) {
    const [z0, y0] = sec[k];
    const [z1, y1] = sec[k + 1];
    const nz = y1 - y0;
    const ny = -(z1 - z0);
    const l = Math.hypot(nz, ny) || 1;
    const sgn = (z0 + z1) * nz >= 0 ? 1 : -1;

    b.flatQuad(back[k], back[k + 1], fr[k + 1], fr[k], [0, (sgn * ny) / l, (sgn * nz) / l], GREY);
  }
}

// On the chamfered underside, where each runner leaves the plenum: a round flange, six socket-head bolts round it, and
// the weld where the runner is let into it
function runnerPads(b: MeshBuilder) {
  for (const [bi, bank] of BANKS.entries()) {
    for (let i = 0; i < CT_X.length; i++) {
      const c = PIPES.runner(i);
      const w = c.pts.map((q) => bankPoint(bank, q[0] + bank.dx, q[1], q[2]));
      const k = w.findIndex((q) => q[1] > PLENUM.yb);

      if (k < 1) continue;

      const p: FwVec3 = [w[k][0], PLENUM.yb, w[k][2]];
      const d: FwVec3 = [0, 1, 0];
      const e1: FwVec3 = [1, 0, 0];
      const e2: FwVec3 = [0, 0, 1];

      b.prismDir(p, d, e1, e2, 31, 5, 36, 0, GREY, DEEP);
      b.prismDir([p[0], p[1] + 5, p[2]], d, e1, e2, 26, 1.4, 36, 0, MAT_ALU_TURNED, MAT_ALU_TURNED);

      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * TAU + 0.26 + bi * 0.1;

        socketCap(b, [p[0] + 27 * Math.cos(a), p[1] + 5, p[2] + 27 * Math.sin(a)], d, 2.8);
      }
    }
  }
}

// (the gate: buildPlenumGate) The throttle and the Y, on the solid engine and on the see-through one alike
// The gate: the funnel out of the plenum's front, its bosses and the square flange with its fins. A part of the plenum:
// drawn on the solid engine only, taken away with it on the see-through one
export function buildPlenumGate(b: MeshBuilder) {
  const gateStart = b.out.length / FW_STRIDE;

  buildGateParts(b);
  redGradient(b, gateStart); // (at the front: the deeper red, as the lid's front)
}

function buildGateParts(b: MeshBuilder) {
  const { xf, gateLen, gateR, yGate: y } = PLENUM;
  const xg = xf - gateLen; // the square flange's face

  // the funnel, from the plenum's front out to the flange, narrowing
  const funnel = curveFromPoints([[xf + 26, y, 0], [xg + 14, y, 0]], 2);

  sweepTube(b, funnel, (u) => gateR + 8 + 30 * Math.pow(1 - u, 2.2), GREY, { segments: 64 });

  // the bosses round it, along it, each with a socket-head bolt in its front
  for (const a of [Math.PI / 2, Math.PI * 0.84, Math.PI * 0.16, -Math.PI * 0.2, -Math.PI * 0.8]) {
    const r = gateR + 19;
    const p: FwVec3 = [xf + 10, y - r * Math.sin(a), r * Math.cos(a)];

    b.prismDir(p, [-1, 0, 0], [0, 1, 0], [0, 0, 1], 9, 34, 24, 0, GREY, GREY);
    socketCap(b, [p[0] - 34, p[1], p[2]], [-1, 0, 0], 4);
  }

  // the square flange: its plate, the bore dark in its face, and the four holes at its corners
  const half = gateR + 26;

  b.box(xg, xg + 14, y - half, y + half, -half, half, GREY);
  b.box(xg - 0.6, xg, y - half + 3, y + half - 3, -half + 3, half - 3, MAT_ALU_TURNED);
  b.prismDir([xg - 0.6, y, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], gateR, 0.4, 48, 0, MAT_PIPE_BLACK, MAT_PIPE_BLACK);

  for (const [dy, dz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    socketCap(b, [xg - 0.6, y + dy * (half - 12), dz * (half - 12)], [-1, 0, 0], 4.6);
  }

  // fins in relief on its face, upright, close together, as on the timing chain's cover: each a thin bar, parted round the
  // bore and stopping short of the bolts at the corners
  {
    const pitch = 9;
    const t = 1.3; // half a fin's thickness
    const h = 5; // how far it stands out of the face
    const clearBore = gateR + 8;
    const clearBolt = 11;
    const face = xg - 0.6;

    for (let z = -half + 8; z <= half - 8 + 1e-6; z += pitch) {
      const runs: Array<[number, number]> = [];
      let a = y - half + 6;
      const end = y + half - 6;
      // the stretches of y along this fin that are clear of the bore and of the corner bolts
      const blocked = (yy: number) => Math.hypot(yy - y, z) < clearBore
        || [[-1, -1], [-1, 1], [1, -1], [1, 1]].some(([dy, dz]) => Math.hypot(yy - (y + dy * (half - 12)), z - dz * (half - 12)) < clearBolt);

      for (let yy = a; yy <= end; yy += 0.5) {
        if (blocked(yy)) {
          if (yy - a > 3) runs.push([a, yy]);
          a = yy + 0.5;
        }
      }
      if (end - a > 3) runs.push([a, end]);

      for (const [y0, y1] of runs) b.box(face - h, face, y0, y1, z - t, z + t, MAT_COVER_FIN);
    }
  }

}

export function buildIntakeManifold(b: MeshBuilder) {
  const { yGate: y, xn, throttle: T } = PLENUM;

  buildThrottle(b, 1, y, 0);

  // the Y in front of the throttle: two branches, each from where an intercooler's pipe is bolted on, joined into one
  // bore into the throttle's mouth
  const mouth = xn - 12 - T.len - 4;

  buildYClamp(b, mouth, y, T.r);

  for (const zs of [-1, 1]) {
    const inlet = PLENUM_INLETS[zs < 0 ? 0 : 1];
    const branch = roundedCurve([inlet, [inlet[0] + 26, y, inlet[2]], [mouth - 14, y, zs * 6], [mouth - 7, y, 0]], 30, 2);

    const branchR = (u: number) => Y_BRANCH.r + (T.r - 8 - Y_BRANCH.r) * u * u;

    sweepTube(b, branch, branchR, MAT_HEAD_CAST, { segments: 48 }); // (the U in the heads' own sand-cast navy, #0c1826)
    branchFins(b, branch, branchR);
    if (zs > 0) crossFins(b, branch, branchR, mouth, y);
    // where the intercooler's pipe comes into the branch: the black clamp flange, six hex bolts
    flangeJoint(b, inlet, [1, 0, 0], {
      pipeR: 27, r: 43, castT: 8, mateT: 7, bolts: 6, pitch: 35,
      cast: MAT_CLAMP_BLACK, mate: MAT_CLAMP_BLACK, gasket: MAT_CLAMP_BLACK_DEEP, bolt: 4.4,
    });
  }
}

// Fins along a Y branch, as the lid's: four, evenly round it, the same grey and section, standing out of the red,
// starting just clear of the intercooler's clamp flange and dying away before the Y's clamp
const BRANCH_FIN = { count: 4, t: 5.6, h: 7.5, from: 14, to: 20 };

function branchFins(b: MeshBuilder, branch: Curve, radius: (u: number) => number) {
  const L = branch.total;
  const s0 = BRANCH_FIN.from;
  const s1 = L - BRANCH_FIN.to;
  const n = 70;
  const at: FwVec3 = [0, 0, 0];
  const dir: FwVec3 = [0, 0, 0];

  for (let f = 0; f < BRANCH_FIN.count; f++) {
    const a = ((f + 0.5) / BRANCH_FIN.count) * TAU;
    const rows: Array<Array<{ p: FwVec3; n: FwVec3; m: typeof MAT_FIN_GREY }>> = [];

    for (let k = 0; k <= n; k++) {
      const sk = s0 + ((s1 - s0) * k) / n;

      curveAt(branch, sk, at, dir);

      // the branch lies level: across it, and up
      const across = vnorm([dir[2], 0, -dir[0]]);
      const up: FwVec3 = [0, -1, 0];
      const nn = vnorm(vadd(vscale(up, Math.cos(a)), vscale(across, Math.sin(a))));
      const side = vnorm([nn[1] * dir[2] - nn[2] * dir[1], nn[2] * dir[0] - nn[0] * dir[2], nn[0] * dir[1] - nn[1] * dir[0]]);
      const ends = Math.min(1, (sk - s0) / 14, (s1 - sk) / 22);
      const e = Math.sqrt(Math.max(0, ends));
      const h = Math.max(0.5, BRANCH_FIN.h * e);
      const t = BRANCH_FIN.t * (0.55 + 0.45 * e);
      const p0 = vadd(at, vscale(nn, radius(sk / L)));

      rows.push(finSection(t, h).map((q) => ({
        p: vadd(vadd(p0, vscale(side, q.p[0])), vscale(nn, q.p[1] - 0.8)),
        n: vnorm(vadd(vscale(side, q.n[0]), vscale(nn, q.n[1]))),
        m: q.m,
      })));
    }

    for (let k = 0; k < n; k++) {
      const A = rows[k];
      const B = rows[k + 1];

      for (let j = 0; j + 1 < A.length; j++) {
        const m = A[j].m === A[j + 1].m ? A[j].m : MAT_FIN_GREY;

        for (const q of [A[j], B[j], B[j + 1], A[j], B[j + 1], A[j + 1]]) b.push(q.p, q.n, m, 1);
      }
    }
  }
}

// Where the inner fins of the two branches cross, on top of the Y and under it: one fin on from the crossing, as broad
// as the crossing, straight along the joined bore to the Y's clamp, so that the two V's of fins run into one ridge
function crossFins(b: MeshBuilder, branch: Curve, radius: (u: number) => number, mouth: number, y: number) {
  const L = branch.total;
  const at: FwVec3 = [0, 0, 0];
  const dir: FwVec3 = [0, 0, 0];
  // the branch's middle and radius, sampled along it
  const samples: Array<{ x: number; z: number; r: number }> = [];

  for (let k = 0; k <= 400; k++) {
    const sk = (L * k) / 400;

    curveAt(branch, sk, at, dir);
    samples.push({ x: at[0], z: at[2], r: radius(sk / L) });
  }

  for (const vs of [-1, 1]) {
    // the inner fin (toward z = 0) on this face: where it crosses z = 0
    const a = vs < 0 ? TAU / 8 : (3 * TAU) / 8;
    let xc = mouth - 30;
    let yc = y; // and the fins' foot there (where the new fin starts, bridging over between the two bores)

    for (let k = 0; k <= 400; k++) {
      const sk = BRANCH_FIN.from + ((L - BRANCH_FIN.to - BRANCH_FIN.from) * k) / 400;

      curveAt(branch, sk, at, dir);

      const across = vnorm([dir[2], 0, -dir[0]]);
      const nn = vnorm(vadd(vscale([0, -1, 0], Math.cos(a)), vscale(across, Math.sin(a))));
      const rr = radius(sk / L);
      const fp: FwVec3 = vadd(at, vscale(nn, rr + BRANCH_FIN.h * 0.5));
      // where the fin's crest comes within its own breadth of the middle: the two V's meet there

      if (fp[2] <= BRANCH_FIN.t * 1.1) {
        xc = fp[0];
        yc = fp[1] - vs * BRANCH_FIN.h * 0.5;
        break;
      }
    }

    const x0 = xc - 3;
    const x1 = mouth - 2;
    const n = 40;
    const rows: Array<Array<{ p: FwVec3; n: FwVec3; m: typeof MAT_FIN_GREY }>> = [];
    const up: FwVec3 = [0, vs, 0]; // out of the face: up (-y) on top, down under it
    const side: FwVec3 = [0, 0, 1];

    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n;
      // the joined bore's skin at z = 0, or, where the two bores do not yet meet there, the crossing fins' foot
      // (the tube as a string of spheres along its middle: the highest of them over (x, 0))
      let hMax = 0;

      for (const q of samples) {
        const d2 = (x - q.x) * (x - q.x) + q.z * q.z;

        if (d2 < q.r * q.r) hMax = Math.max(hMax, Math.sqrt(q.r * q.r - d2));
      }

      const skin = y + vs * hMax;
      const yb = vs < 0 ? Math.min(skin, yc) : Math.max(skin, yc);
      const e = Math.sqrt(Math.max(0, Math.min(1, (x - x0) / 6, (x1 - x) / 8)));
      const h = Math.max(0.5, BRANCH_FIN.h * (0.6 + 0.4 * e));
      const t = BRANCH_FIN.t * 1.7 * (0.7 + 0.3 * e); // as broad as the crossing
      const p0: FwVec3 = [x, yb, 0];

      rows.push(finSection(t, h).map((q) => ({
        p: vadd(vadd(p0, vscale(side, q.p[0])), vscale(up, q.p[1] - 1.2)),
        n: vnorm(vadd(vscale(side, q.n[0]), vscale(up, q.n[1]))),
        m: q.m,
      })));
    }

    for (let k = 0; k < n; k++) {
      const A = rows[k];
      const B = rows[k + 1];

      for (let j = 0; j + 1 < A.length; j++) {
        const m = A[j].m === A[j + 1].m ? A[j].m : MAT_FIN_GREY;

        for (const q of [A[j], B[j], B[j + 1], A[j], B[j + 1], A[j + 1]]) b.push(q.p, q.n, m, 1);
      }
    }
  }
}

function buildThrottle(b: MeshBuilder, zs: number, y: number, z: number) {
  const { xn, neckR } = PLENUM;

  // the throttle, on the neck, facing forward: a black rubber coupler with its two clamps, then the chromed body, a
  // flange ring at each end, held by six bolts, and the bore's rolled mouth
  const T = PLENUM.throttle;
  const fwd: FwVec3 = [-1, 0, 0];
  const e1: FwVec3 = [0, 1, 0];
  const e2: FwVec3 = [0, 0, 1];
  const x0 = xn + 2; // the coupler's back
  const xb = xn - 12; // the body's back

  b.prismDir([x0, y, z], fwd, e1, e2, neckR + 2.5, 14, 56, 0, MAT_PIPE_BLACK, MAT_PIPE_BLACK);

  for (const xc of [x0 - 3, x0 - 11]) b.prismDir([xc, y, z], fwd, e1, e2, neckR + 4, 2.4, 56, 0, MAT_ALU_TURNED, MAT_STEEL_BRIGHT);

  b.prismDir([xb, y, z], fwd, e1, e2, T.r, T.len, 64, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
  b.prismDir([xb, y, z], fwd, e1, e2, T.r + 6, 7, 64, 0, MAT_ALU_TURNED, MAT_ALU_TURNED);
  b.prismDir([xb - T.len + 7, y, z], fwd, e1, e2, T.r + 6, 7, 64, 0, MAT_ALU_TURNED, MAT_ALU_TURNED);
  b.prismDir([xb - T.len, y, z], fwd, e1, e2, T.r + 3, 4, 64, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT); // the rolled lip

  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.3;

    for (const [xq, dir] of [[xb, 1], [xb - T.len, -1]] as Array<[number, number]>) {
      flangeBolt(b, [xq, y + (T.r + 2.5) * Math.sin(a), z + (T.r + 2.5) * Math.cos(a)], [dir, 0, 0], 3.3, 0.2);
    }
  }

  // its actuator, on its outer side: a cast housing with a ribbed cover, the motor's round end, and the connector
  {
    const xa = xb - 8;
    const xe = xb - T.len + 8;
    const zo = z + zs * (T.r + 2);

    b.box(xe, xa, y - 22, y + 18, Math.min(zo, zo + zs * 30), Math.max(zo, zo + zs * 30), MAT_ALU_CAST);
    for (let k = 0; k < 4; k++) {
      const xk = xe + 5 + (k * (xa - xe - 10)) / 3;

      b.box(xk - 1.3, xk + 1.3, y - 25, y - 22, Math.min(zo + zs * 3, zo + zs * 27), Math.max(zo + zs * 3, zo + zs * 27), MAT_ALU_TURNED);
    }
    b.prismDir([(xa + xe) / 2, y + 18, zo + zs * 15], [0, 1, 0], [1, 0, 0], [0, 0, 1], 12, 16, 32, 0, MAT_PIPE_BLACK, MAT_PIPE_BLACK); // the motor
    b.box(xe + 4, xe + 18, y - 14, y + 2, Math.min(zo + zs * 30, zo + zs * 40), Math.max(zo + zs * 30, zo + zs * 40), MAT_PIPE_BLACK); // the connector

    for (const [bx, bz] of [[xa - 4, 4], [xe + 4, 4], [xa - 4, 26], [xe + 4, 26]]) {
      b.prismDir([bx, y - 22, zo + zs * bz], [0, -1, 0], [1, 0, 0], [0, 0, 1], 2.6, 2.4, 6, 0.2, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
    }
  }
}

// The clamp flange where the Y is bolted to the throttle's mouth: two thick black flanges, metallic with a fine sandpaper
// grit, each with a chamfered rim and a machined groove round its face, a dark gasket between them; six lugs round them,
// and through each a hex bolt: on the Y's side a washer, a flanged hex head with its chamfered top and the maker's dot; on
// the throttle's side a washer, a hex nut, and the bolt's threaded end standing out of it
function buildYClamp(b: MeshBuilder, x: number, y: number, r: number) {
  const C = MAT_CLAMP_BLACK;
  const D = MAT_CLAMP_BLACK_DEEP;
  const fwd: FwVec3 = [-1, 0, 0];
  const back: FwVec3 = [1, 0, 0];
  const e1: FwVec3 = [0, 1, 0];
  const e2: FwVec3 = [0, 0, 1];
  const R = r + 12; // the flanges' radius
  const tN = 8; // the throttle's side flange
  const tF = 9; // the Y's side flange
  const pitch = r + 10;
  const lug = 9.5; // the lugs' radius

  // the throttle's side flange (from x back), its chamfered rim, the groove in its face
  b.prismDir([x + tN, y, 0], fwd, e1, e2, R - 1.5, tN - 1.2, 72, 0, C, C);
  b.prismDir([x + 1.2, y, 0], fwd, e1, e2, R - 3, 1.2, 72, 0, D, D);
  // the gasket
  b.prismDir([x, y, 0], fwd, e1, e2, R - 4, 1.2, 72, 0, MAT_PIPE_BLACK, MAT_PIPE_BLACK);
  // the Y's side flange (from x forward)
  b.prismDir([x - 1.2, y, 0], fwd, e1, e2, R - 3, 1.2, 72, 0, D, D);
  b.prismDir([x - 2.4, y, 0], fwd, e1, e2, R - 1.5, tF - 3.6, 72, 0, C, C);
  b.prismDir([x - tF + 1.2, y, 0], fwd, e1, e2, R - 3, 1.2, 72, 0, D, D);
  b.prismDir([x - tF + 0.2, y, 0], fwd, e1, e2, r + 1.5, 1, 64, 0, MAT_ALU_TURNED, MAT_ALU_TURNED); // the groove's ring

  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + Math.PI / 6;
    const py = y + pitch * Math.sin(a);
    const pz = pitch * Math.cos(a);

    // the lugs, through both flanges, round, standing out of their rims
    b.prismDir([x + tN, py, pz], fwd, e1, e2, lug, tN - 1.2, 28, 0, C, D);
    b.prismDir([x - 2.4, py, pz], fwd, e1, e2, lug, tF - 3.6, 28, 0, C, D);

    // the Y's side: a washer, the flanged hex head (rot set so that the six heads lie alike round the joint)
    flangeBolt(b, [x - tF, py, pz], fwd, 5.2, a);

    // the throttle's side: a washer, a hex nut, the threaded end
    const under: FwVec3 = [x + tN, py, pz];

    b.prismDir(under, back, e1, e2, 6.6, 0.9, 20, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
    b.prismDir([under[0] + 0.9, py, pz], back, e1, e2, 5.2, 4.6, 6, a + 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
    b.prismDir([under[0] + 5.5, py, pz], back, e1, e2, 4.4, 0.6, 18, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE); // its chamfer
    b.prismDir([under[0] + 6.1, py, pz], back, e1, e2, 2.6, 3.2, 14, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);

    for (let t = 0; t < 3; t++) {
      b.prismDir([under[0] + 6.4 + t * 0.9, py, pz], back, e1, e2, 2.9, 0.3, 14, 0, MAT_CT_NUT_SIDE, MAT_CT_NUT_SIDE);
    }
  }
}
