// The intake manifold's plenum (plumbing.ts, PLENUM), in the engine's frame, after a billet racing manifold, blasted a
// fine matte grey: its lower body, the sides chamfered in underneath, a round six-bolt flange on the chamfer for each of
// the twelve runners and a column under the flange over each cylinder, four threaded ports in its back; a double flange
// round its top, the two plates with a fine groove between them; the domed lid of two lobes on it, held down by two
// staggered rows of black socket-head bolts. At its front the gate: a funnel, bosses round it with their bolts, opening
// into a big square flange; the throttle on it; and in front, the Y that brings the cooled charge from both intercoolers.
// The plenum is drawn on the solid engine only (taken away on the see-through one, to see in); the gate, the throttle and
// the Y on both.

import { BANKS, CT_X, DRIVE_DX, TAU, bankPoint } from "../core/constants";
import { HEAD } from "./head";
import { FW_STRIDE } from "./builder";
import type { FwMaterial, FwVec3 } from "./builder";
import { MAT_ALU_TURNED, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_CLAMP_BLACK, MAT_CLAMP_BLACK_DEEP, MAT_COVER_FIN, MAT_FIN_GREY, MAT_FIN_GREY_CREST, MAT_HEAD_CAST, MAT_FIN_GREY_ROOT, MAT_PIPE_BLACK, MAT_PLENUM_RED, MAT_PLENUM_RED_DEEP, MAT_STEEL_BRIGHT, MAT_TB_BODY, MAT_TB_BODY_DEEP, MAT_TB_COVER, MAT_TB_COVER_RIB, MAT_TB_HOLE, MAT_TB_LATCH, MAT_TB_PIN, MAT_TB_PLATE, MAT_TB_PLUG, MAT_TB_RIB, MAT_THROTTLE_RING } from "./materials";
import { curveAt, curveFromPoints, flangeBolt, flangeJoint, roundedCurve, sweepTube } from "./tubes";
import type { Curve, MeshBuilder } from "./tubes";
import { PIPES, PLENUM, PLENUM_INLETS, Y_BRANCH, bodySection, headY, lidHeight, plenumW, socketCap, wallZ } from "./plumbing";
import { vadd, vnorm, vscale } from "../math/vec3";
import { LID_SIG } from "./headText";
import { railWorld } from "./headWiring";

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
// front, across the front, back along the -z side, and across the back; each point moved out square to the plan's own
// edge, so that its corners stay rounded (the plan's rounding, `o` broader)
function outline(o: number): Array<[number, number]> {
  const { xf, xr } = PLENUM;
  const xs = stations();
  const plan: Array<[number, number]> = [];
  const across = (x: number, z0: number, z1: number) => {
    for (let k = 1; k < 8; k++) plan.push([x, z0 + ((z1 - z0) * k) / 8]);
  };

  for (const x of xs.slice().reverse()) plan.push([x, plenumW(x)]);
  across(xf, plenumW(xf), -plenumW(xf));
  for (const x of xs) plan.push([x, -plenumW(x)]);
  across(xr, -plenumW(xr), plenumW(xr));

  const n = plan.length;
  const cx = (xf + xr) / 2;

  return plan.map(([x, z], k) => {
    const [xa, za] = plan[(k - 1 + n) % n];
    const [xb, zb] = plan[(k + 1) % n];
    let nx = zb - za;
    let nz = -(xb - xa);
    const l = Math.hypot(nx, nz) || 1;

    nx /= l;
    nz /= l;
    if ((x - cx) * nx + z * nz < 0) {
      nx = -nx;
      nz = -nz;
    }

    return [x + nx * o, z + nz * o];
  });
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
const RED_FRONT: FwVec3 = [129, 0, 0]; // at the front (deeper)
const RED_BACK: FwVec3 = [192, 0, 0]; // and at the back
const RED_HOLD = 0.3; // the share of the length, from the front, before it begins to lighten
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
  runnerPads(b);

  // the castings that fill the V at the block's two ends: built here, for the reds' span and shading, then kept apart (a part
  // of their own, vClose: they are the block's, and stay on the engine when the plenum is taken out of it)
  const vcStart = b.out.length;

  buildVClose(b);

  // its length, from its front to the back of its reds
  let x1 = -1e9;

  for (let i = start * FW_STRIDE; i < b.out.length; i += FW_STRIDE) {
    if (b.out[i + 6] > 0 && b.out[i + 7] === 0 && b.out[i + 8] === 0) x1 = Math.max(x1, b.out[i]);
  }

  redSpan = [PLENUM.xf, x1];
  redGradient(b, start);
  vCloseVerts = b.out.slice(vcStart);
  b.out.length = vcStart;
}

let vCloseVerts: number[] = [];

// The V's end castings (built with the plenum, buildVPlenum, which is to be built first)
export function buildVPlenumClose(b: MeshBuilder) {
  for (let i = 0; i < vCloseVerts.length; i++) b.out.push(vCloseVerts[i]);
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
  // (the two either side of the writing, out clear of its letters, straight and unbroken all along)
  across: [-0.985, -0.93, -0.843, -0.7, -0.56, -0.42, -0.29, -0.07, 0.07, 0.29, 0.42, 0.56, 0.7, 0.843, 0.93, 0.985],
  t: [10, 4], // the thickness at the foot, at the front and at the back (in step with the bigger lid)
  h: [17, 5.8], // how far it stands out
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

  // the fins in the middle stop short of the writing's band; the two either side of it run straight past it, clear of it
  const cut = (c: number) => {
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n;
      const z = c * (plenumW(x) - 4);

      if (Math.abs(z - LID_SIG.z) < LID_SIG.hz + LID_SIG.margin && Math.abs(x - LID_SIG.x) < LID_SIG.hx + LID_SIG.margin) return true;
    }

    return false;
  };
  const cutFins = LID_FIN.across.filter(cut);
  const joined = new Set([Math.min(...cutFins), Math.max(...cutFins)]);

  for (const c of LID_FIN.across) {
    const rows: Array<Array<{ p: FwVec3; n: FwVec3; m: typeof MAT_FIN_GREY }> | null> = [];
    const join = joined.has(c);

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
      const inBand = !join && Math.abs(z - LID_SIG.z) < LID_SIG.hz + LID_SIG.margin;
      const u = k / n;

      if (inBand && gx < 0) {
        rows.push(null);
        continue;
      }

      const ends = Math.min(1, (x - x0) / 26, (x1 - x) / 40, inBand ? gx / 22 : 1);
      const h = Math.max(0.5, (LID_FIN.h[0] + (LID_FIN.h[1] - LID_FIN.h[0]) * Math.pow(u, 0.9)) * Math.sqrt(Math.max(0, ends)));
      const t = (LID_FIN.t[0] + (LID_FIN.t[1] - LID_FIN.t[0]) * Math.pow(u, 0.9)) * (0.55 + 0.45 * Math.sqrt(Math.max(0, ends)));
      const p0 = P(x, z);
      // (the two in the middle, either side of the valley between the lobes, where the skin's slope turns sharply across,
      // stand straight up, so that their crests run straight and do not wander with the slope)
      const nn = Math.abs(c) < 0.1 ? ([0, -1, 0] as FwVec3) : N(x, z);
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

// The double flange round the plenum's top: the upper plate (the lid's), a fine groove, the lower (the body's); broad, out
// under the fuel rails; on it one row of big hex bolts round its outer edge, each on a washer; and from it, a bracket at
// each cylinder holding up the fuel rail over it
const FLANGE_O = 24; // how far the flange stands out round the lid
const BOLT_O = 15; // the bolts' row, out from the lid's edge

function hexBolt(b: MeshBuilder, x: number, y: number, z: number) {
  const up: FwVec3 = [0, -1, 0];

  b.prismDir([x, y, z], up, [1, 0, 0], [0, 0, 1], 7.6, 1.2, 24, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT); // the washer
  b.prismDir([x, y - 1.2, z], up, [1, 0, 0], [0, 0, 1], 6.2, 4.6, 6, 0.4, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE); // the head, a big hex
  b.prismDir([x, y - 5.8, z], up, [1, 0, 0], [0, 0, 1], 2.6, 0.5, 12, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT); // the bolt's end
}

function buildFlange(b: MeshBuilder) {
  const { yLid, yFlange, xf, xr } = PLENUM;
  const ym = (yLid + yFlange) / 2;

  plate(b, outline(FLANGE_O), yLid, ym - 0.8, GREY, GREY);
  plate(b, outline(FLANGE_O - 2.5), ym - 0.8, ym + 0.8, DEEP, DEEP);
  plate(b, outline(FLANGE_O), ym + 0.8, yFlange, GREY, GREY);

  const pitch = (CT_X[1] - CT_X[0]) / 2;
  const TAB = 2.4; // the brackets' foot, a plate under the bolt

  for (let x = xf + 30, k = 0; x < xr - 40; x += pitch, k++) {
    for (const sd of [-1, 1]) {
      const z = sd * (plenumW(x) + BOLT_O);
      const bracket = k % 2 === 1 && k < 2 * CT_X.length; // (one at each cylinder)

      if (bracket) railBracket(b, x, z, sd, TAB);
      hexBolt(b, x, yLid - (bracket ? TAB : 0), z);
    }
  }

  // five across the back, evenly spaced along the bolts' line from one rounded corner to the other
  {
    const line = outline(BOLT_O).filter(([x]) => x > xr - 22);
    // (in order round the back: the -z side's end, across, the +z side's end)
    const back = line.slice().sort((p, q) => Math.atan2(p[1], p[0] - (xr - 60)) - Math.atan2(q[1], q[0] - (xr - 60)));
    const len: number[] = [0];

    for (let k = 1; k < back.length; k++) len.push(len[k - 1] + Math.hypot(back[k][0] - back[k - 1][0], back[k][1] - back[k - 1][1]));

    const total = len[len.length - 1];

    for (let i = 0; i < 5; i++) {
      const t = (total * i) / 4;
      let k = 1;

      while (k < back.length - 1 && len[k] < t) k++;

      const u = (t - len[k - 1]) / (len[k] - len[k - 1] || 1);

      hexBolt(b, back[k - 1][0] + (back[k][0] - back[k - 1][0]) * u, yLid, back[k - 1][1] + (back[k][1] - back[k - 1][1]) * u);
    }
  }
  for (const f of [-0.6, 0, 0.6]) hexBolt(b, xf - BOLT_O, yLid, f * plenumW(xf));
}

// A bracket holding up the fuel rail over the flange: its foot a plate under one of the flange's bolts, a post standing
// up from it beside the bolt, and round the rail a clamp, split on top, a bolt through it
function railBracket(b: MeshBuilder, x: number, zb: number, sd: number, tab: number) {
  const { yLid } = PLENUM;
  const [yR, zR] = railWorld(sd > 0 ? 1 : 0);
  const xp = x + 15; // the post's middle, beside the bolt
  const CR = 13.6; // the clamp's outer radius (the rail's is 10)
  const z0 = Math.min(zb, zR) - 9;
  const z1 = Math.max(zb, zR) + 9;

  // the foot, its corners off
  b.box(x - 10, xp + 5, yLid - tab, yLid, z0, z1, MAT_CLAMP_BLACK);
  // the post, leaning out from the foot up to the clamp
  {
    const f: FwVec3 = [xp, yLid - tab, zb];
    const c: FwVec3 = [xp, yR + CR - 1, zR];
    const d = vnorm([0, c[1] - f[1], c[2] - f[2]]);
    const len = Math.hypot(c[1] - f[1], c[2] - f[2]);
    const e2: FwVec3 = [0, d[2], -d[1]];

    b.prismDir(f, d, [1, 0, 0], e2, 5.6, len, 4, Math.PI / 4, MAT_CLAMP_BLACK, MAT_CLAMP_BLACK);
    b.prismDir(vadd(f, vscale(e2, 3.6)), d, [1, 0, 0], e2, 1.3, len, 6, 0, MAT_CLAMP_BLACK_DEEP, MAT_CLAMP_BLACK_DEEP); // a rib down its face
  }
  // the clamp round the rail
  b.revolve({ x0: xp - 5, r0: CR, x1: xp + 5, r1: CR, n: [0, 1], m: MAT_CLAMP_BLACK, steps: 32, cy: yR, cz: zR });
  for (const s of [-1, 1]) b.revolve({ x0: xp + s * 5, r0: 10, x1: xp + s * 5, r1: CR, n: [s, 0], m: MAT_CLAMP_BLACK_DEEP, steps: 32, cy: yR, cz: zR });
  // its lug on top, split, and the bolt across it
  b.box(xp - 5, xp + 5, yR - CR - 6, yR - CR + 1, zR - 5, zR + 5, MAT_CLAMP_BLACK);
  b.box(xp - 5.05, xp + 5.05, yR - CR - 6.05, yR - CR + 1, zR - 0.5, zR + 0.5, MAT_CLAMP_BLACK_DEEP);
  b.prismDir([xp, yR - CR - 3, zR + 5], [0, 0, 1], [1, 0, 0], [0, 1, 0], 3.2, 2.8, 6, 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
  b.prismDir([xp, yR - CR - 3, zR - 5], [0, 0, -1], [1, 0, 0], [0, 1, 0], 3.2, 2.4, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
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

// At both ends, the V under the body closed right down to where the walls of the heads and the block meet: cast with the
// body, filling the V whole, let into the walls so that no gap shows; at the back a wedge from under the body, its back face
// flat, its front sloping down and forward; at the front a block from under the flange, its face flush with the heads'
// fronts, so the red runs down the V as one casting
function vSection(top: Array<[number, number]>, from: number, sink = 4, round = 0): Array<[number, number]> {
  const apex = -208; // (a little below where the walls meet: the casting closes the V's foot)
  const half: Array<[number, number]> = [...top];

  if (round > 0) {
    // down the walls to where it is `round` from the middle, then round under the V's foot, as the block's own is rounded
    const yr = -304 + ((round - sink - 54) * (-402 + 304)) / (115 - 54); // where wallZ + sink = round

    for (let k = 1; k <= 14; k++) {
      const y = from + ((yr - from) * k) / 14;

      half.push([wallZ(y) + sink, y]);
    }
    for (let k = 1; k <= 8; k++) {
      const t = (k / 8) * (Math.PI / 2);

      half.push([round * Math.cos(t), yr + round * Math.sin(t)]);
    }
  } else {
    for (let k = 1; k <= 14; k++) {
      const y = from + ((apex - from) * k) / 14;

      half.push([Math.max(0, wallZ(y) + sink), y]);
    }
  }

  return [...half, ...half.slice().reverse().map(([z, y]): [number, number] => [-z, y])];
}

function vBlock(b: MeshBuilder, sec: Array<[number, number]>, xf0: (y: number) => number, xf1: (y: number) => number, face: -1 | 1, faceMat: FwMaterial) {
  const A = sec.map(([z, y]): FwVec3 => [xf0(y), y, z]);
  const B = sec.map(([z, y]): FwVec3 => [xf1(y), y, z]);
  const ym = sec.reduce((m, [, y]) => m + y, 0) / sec.length;

  // its outer face, and the inner one
  const outer = face > 0 ? B : A;
  const inner = face > 0 ? A : B;

  b.flatFan([outer[0][0], ym, 0], [...outer, outer[0]], [face, 0, 0], faceMat);
  b.flatFan([inner[0][0], ym, 0], [...inner, inner[0]], [-face, 0, 0], DEEP);

  const n = sec.length;
  const cz = 0;
  const cy = ym;

  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n;
    const [z0, y0] = sec[k];
    const [z1, y1] = sec[j];
    let nz = y1 - y0;
    let ny = -(z1 - z0);
    const l = Math.hypot(nz, ny) || 1;

    nz /= l;
    ny /= l;
    if (((z0 + z1) / 2 - cz) * nz + ((y0 + y1) / 2 - cy) * ny < 0) {
      nz = -nz;
      ny = -ny;
    }

    b.flatQuad(A[k], A[j], B[j], B[k], [0, ny, nz], GREY);
  }
}

function buildVClose(b: MeshBuilder) {
  // at the back: from under the body (its flat bottom) down
  {
    const x1 = HEAD.x1 + DRIVE_DX + 2.5; // its back face, a little proud of the block's end: it wraps over its rounded edges
    const len = 52;
    const ramp = 30;
    const top = PLENUM.yb;
    const zt = wallZ(top) + 16;
    const sec = vSection([[zt, top]], top, 16, 15); // (over the walls' rounded edges, and round under the V's rounded foot)
    const apex = -198;

    vBlock(b, sec, (y) => x1 - len + (ramp * (y - top)) / (apex - top), () => x1, 1, GREY);
  }

  // at the front: from under the flange, the body's own section, then down the V; from the heads' fronts back into the body
  {
    const xa = CT_X[0] - 112; // the heads' fronts
    const xb = PLENUM.xf + 12; // into the body
    const top = bodySection(PLENUM.xf).map(([z, y]): [number, number] => [z, y]);
    const from = top[top.length - 1][1];

    vBlock(b, vSection(top, from), () => xa, () => xb, -1, GREY);
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

  // the square flange: its plate, its corners rounded, cut short at its foot so that it stands clear over the timing
  // chains' covers; the bore dark in its face, and the four holes at its corners
  const half = gateR + 26;
  const yTop = y - half;
  const yBot = y + half - 16; // (its foot, short: over the covers)
  const RC = 16; // its corners' radius
  const rrect = (inset: number): Array<[number, number]> => {
    const pts: Array<[number, number]> = []; // [y, z]
    const r = RC - inset;
    const cs: Array<[number, number, number]> = [[yBot - inset - r, half - inset - r, 0], [yTop + inset + r, half - inset - r, 1], [yTop + inset + r, -half + inset + r, 2], [yBot - inset - r, -half + inset + r, 3]];

    for (const [cy, cz, q] of cs) {
      for (let k = 0; k <= 6; k++) {
        const a = ((q + k / 6) * Math.PI) / 2;

        pts.push([cy + r * Math.cos(a), cz + r * Math.sin(a)]);
      }
    }

    return pts;
  };
  const plateRR = (x0: number, x1: number, inset: number, mFace: FwMaterial, mSide: FwMaterial) => {
    const pts = rrect(inset);
    const ym = (yTop + yBot) / 2;

    b.flatFan([x0, ym, 0], [...pts, pts[0]].map(([py, pz]): FwVec3 => [x0, py, pz]), [-1, 0, 0], mFace);
    b.flatFan([x1, ym, 0], [...pts, pts[0]].map(([py, pz]): FwVec3 => [x1, py, pz]), [1, 0, 0], mSide);
    for (let k = 0; k < pts.length; k++) {
      const [ya, za] = pts[k];
      const [yb2, zb2] = pts[(k + 1) % pts.length];
      const l = Math.hypot(yb2 - ya, zb2 - za) || 1;
      let ny = (zb2 - za) / l;
      let nz = -(yb2 - ya) / l;

      if ((ya - ym) * ny + za * nz < 0) {
        ny = -ny;
        nz = -nz;
      }
      b.flatQuad([x0, ya, za], [x1, ya, za], [x1, yb2, zb2], [x0, yb2, zb2], [0, ny, nz], mSide);
    }
  };

  plateRR(xg, xg + 14, 0, GREY, GREY);
  plateRR(xg - 0.6, xg, 3, MAT_ALU_TURNED, MAT_ALU_TURNED);
  b.prismDir([xg - 0.6, y, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], gateR, 0.4, 48, 0, MAT_PIPE_BLACK, MAT_PIPE_BLACK);

  const boltAt = (dy: number, dz: number): [number, number] => [dy < 0 ? yTop + 14 : yBot - 14, dz * (half - 14)];

  for (const [dy, dz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const [by, bz] = boltAt(dy, dz);

    socketCap(b, [xg - 0.6, by, bz], [-1, 0, 0], 4.6);
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
      let a = yTop + 6;
      const end = yBot - 6;
      // the stretches of y along this fin that are clear of the bore, of the corner bolts and of the rounded corners
      const inCorner = (yy: number) => {
        const cy = Math.min(Math.max(yy, yTop + RC), yBot - RC);
        const cz = Math.min(Math.max(z, -half + RC), half - RC);

        return Math.hypot(yy - cy, z - cz) > RC - 6;
      };
      const blocked = (yy: number) => Math.hypot(yy - y, z) < clearBore || inCorner(yy)
        || [[-1, -1], [-1, 1], [1, -1], [1, 1]].some(([dy, dz]) => {
          const [by, bz] = boltAt(dy, dz);

          return Math.hypot(yy - by, z - bz) < clearBolt;
        });

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
      pipeR: 21.6, r: 34.4, castT: 6.4, mateT: 5.6, bolts: 6, pitch: 28, // (a fifth smaller, as the pipe)
      cast: MAT_CLAMP_BLACK, mate: MAT_CLAMP_BLACK, gasket: MAT_CLAMP_BLACK_DEEP, bolt: 3.5,
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

// A prism of any section, from `c` along `dir` for `len`: its outline `outer(t)` (t round 0..1, counter-clockwise in
// (e1, e2)), its side smooth-shaded, its two ends closed (or, with `inner` > 0, a round bore through it, the ends
// annular and the bore's wall facing in)
function extrudeShape(
  b: MeshBuilder, c: FwVec3, dir: FwVec3, e1: FwVec3, e2: FwVec3, len: number, outer: (t: number) => [number, number],
  N: number, side: FwMaterial, cap: FwMaterial, inner = 0, bore: FwMaterial = cap, occ = 1
) {
  const P = (x: number, u: number, v: number): FwVec3 => [
    c[0] + dir[0] * x + e1[0] * u + e2[0] * v, c[1] + dir[1] * x + e1[1] * u + e2[1] * v, c[2] + dir[2] * x + e1[2] * u + e2[2] * v,
  ];
  const D = (u: number, v: number): FwVec3 => vnorm([e1[0] * u + e2[0] * v, e1[1] * u + e2[1] * v, e1[2] * u + e2[2] * v]);
  const o = Array.from({ length: N + 1 }, (_, k) => outer(k / N));
  // the side's normals: across the outline, averaged at each point
  const nrm = o.map((_, k) => {
    const a = o[(k - 1 + N) % N];
    const z = o[(k + 1) % N];

    return D(z[1] - a[1], -(z[0] - a[0]));
  });
  const back: FwVec3 = [-dir[0], -dir[1], -dir[2]];

  for (let k = 0; k < N; k++) {
    const [u0, v0] = o[k];
    const [u1, v1] = o[k + 1];
    const n0 = nrm[k];
    const n1 = nrm[(k + 1) % N];

    for (const [q, n] of [[P(0, u0, v0), n0], [P(len, u0, v0), n0], [P(len, u1, v1), n1], [P(0, u0, v0), n0], [P(len, u1, v1), n1], [P(0, u1, v1), n1]] as Array<[FwVec3, FwVec3]>) {
      b.push(q, n, side, occ);
    }

    const t0 = (k / N) * TAU;
    const t1 = ((k + 1) / N) * TAU;

    if (inner > 0) {
      const [a0, a1] = [[inner * Math.cos(t0), inner * Math.sin(t0)], [inner * Math.cos(t1), inner * Math.sin(t1)]];

      b.flatQuad(P(0, u0, v0), P(0, u1, v1), P(0, a1[0], a1[1]), P(0, a0[0], a0[1]), back, cap, occ);
      b.flatQuad(P(len, u0, v0), P(len, u1, v1), P(len, a1[0], a1[1]), P(len, a0[0], a0[1]), dir, cap, occ);
      b.flatQuad(P(0, a0[0], a0[1]), P(0, a1[0], a1[1]), P(len, a1[0], a1[1]), P(len, a0[0], a0[1]), D(-Math.cos((t0 + t1) / 2), -Math.sin((t0 + t1) / 2)), bore, 0.6);
    } else {
      b.flatTri(P(0, 0, 0), P(0, u0, v0), P(0, u1, v1), back, cap, occ);
      b.flatTri(P(len, 0, 0), P(len, u0, v0), P(len, u1, v1), dir, cap, occ);
    }
  }
}

// a superellipse's outline: half sizes a, b, power n (2 a circle or an ellipse, higher squarer with round corners)
const squircle = (a: number, bb: number, n: number) => (t: number): [number, number] => {
  const th = t * TAU;
  const c = Math.cos(th);
  const s = Math.sin(th);

  return [a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), bb * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)];
};

function buildThrottle(b: MeshBuilder, zs: number, y: number, z: number) {
  const { xn, neckR } = PLENUM;

  // The throttle, on the neck, facing forward: a black rubber coupler with its two clamps; then a modern drive-by-wire
  // throttle body. Its casting a squared, round-cornered block in bright satin aluminium, a round flange at its back
  // bolted to the coupler's side by six bolts, two machined grooves round it; through it the bore, machined bright, and in
  // it the brass butterfly, a little open, on its shaft. On its outer side the actuator: the motor's round can along it,
  // the gear case over the shaft with its black satin cover, ribbed and held by six screws, the position sensor's round
  // housing on it, and on top the connector, its latch and its pins. On the other side two coolant nipples, and on top
  // a small vacuum port. Its front goes into the Y's clamp
  const T = PLENUM.throttle;
  const fwd: FwVec3 = [-1, 0, 0];
  const e1: FwVec3 = [0, 1, 0];
  const e2: FwVec3 = [0, 0, 1];
  const x0 = xn + 2; // the coupler's back
  const xb = xn - 12; // the body's back
  const boreR = T.r - 6;
  const H = T.r + 6; // the block's half size
  const xc = xb - T.len / 2; // the butterfly's shaft

  b.prismDir([x0, y, z], fwd, e1, e2, neckR + 2.5, 14, 56, 0, MAT_PIPE_BLACK, MAT_PIPE_BLACK);

  for (const xq of [x0 - 3, x0 - 11]) b.prismDir([xq, y, z], fwd, e1, e2, neckR + 4, 2.4, 56, 0, MAT_ALU_TURNED, MAT_STEEL_BRIGHT);

  // the back flange: round, machined, its six bolts
  extrudeShape(b, [xb, y, z], fwd, e1, e2, 7, squircle(H + 4, H + 4, 2), 96, MAT_ALU_TURNED, MAT_ALU_TURNED, boreR, MAT_ALU_TURNED);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.3;

    flangeBolt(b, [xb, y + (H - 2) * Math.sin(a), z + (H - 2) * Math.cos(a)], [1, 0, 0], 3.4, 0.2);
  }

  // the block, in three lengths with the two grooves between them
  const blockEnd = xb - T.len + 4; // (its front inside the Y's clamp)
  const lens = [[xb - 7, xb - 20], [xb - 22, xb - 36], [xb - 38, blockEnd]];

  for (const [xa, xe] of lens) extrudeShape(b, [xa, y, z], fwd, e1, e2, xa - xe, squircle(H, H, 5), 128, MAT_TB_BODY, MAT_TB_BODY, boreR, MAT_ALU_TURNED);
  for (const xg of [xb - 20, xb - 36]) extrudeShape(b, [xg, y, z], fwd, e1, e2, 2, squircle(H - 2.2, H - 2.2, 5), 128, MAT_TB_BODY_DEEP, MAT_TB_BODY_DEEP, boreR, MAT_ALU_TURNED, 0.7);

  // ribs along it, in relief and darker, as on the heads' covers: across the top, and down its inner side, parted round
  // the vacuum port and the coolant nipples; each a bar standing 3 out of the casting, from the back flange to the clamp
  {
    const surf = (v: number) => H * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(v) / H, 5)), 0.2); // the block's face at v
    const xa = xb - 7;
    const xe = blockEnd;
    const t = 1.4;
    const h = 3;

    for (let v = -H * 0.72; v <= H * 0.72 + 1e-6; v += 8) {
      if (Math.abs(v) < 9) continue; // (the vacuum port)
      const top = y - surf(v);

      b.box(xe, xa, top - h, top + 1, z + v - t, z + v + t, MAT_TB_RIB);
    }
    for (let u = -H * 0.72; u <= H * 0.72 + 1e-6; u += 8) {
      if (Math.abs(u - 30) < 11) continue; // (the coolant nipples)
      const sd = surf(u);
      const zz = z - zs * sd;

      b.box(xe, xa, y + u - t, y + u + t, Math.min(zz, zz - zs * h), Math.max(zz + zs * 1, zz - zs * h), MAT_TB_RIB);
    }
  }

  // the butterfly: a brass disc on its shaft across the bore (along z), turned 14 degrees open; two screws through it
  {
    const th = 0.24;
    const N = 48;
    const r = boreR - 0.6;
    const ax: FwVec3 = [Math.sin(th), Math.cos(th), 0]; // the disc's direction across the shaft
    const nrm: FwVec3 = [Math.cos(th), -Math.sin(th), 0];

    for (const sgn of [-1, 1]) {
      const ring: FwVec3[] = [];

      for (let k = 0; k < N; k++) {
        const a = (k / N) * TAU;
        const u = r * Math.cos(a);
        const v = r * Math.sin(a);

        ring.push([xc + ax[0] * u + nrm[0] * sgn * 1.1, y + ax[1] * u + nrm[1] * sgn * 1.1, z + v]);
      }
      b.flatFan([xc + nrm[0] * sgn * 1.1, y + nrm[1] * sgn * 1.1, z], ring, [nrm[0] * sgn, nrm[1] * sgn, 0], MAT_TB_PLATE);
    }
    b.prismDir([xc, y, z - H - 1], [0, 0, 1], [1, 0, 0], [0, 1, 0], 4.2, 2 * H + 2, 16, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
    for (const sv of [-1, 1]) b.prismDir([xc - nrm[0] * 1.1, y - nrm[1] * 1.1, z + sv * 16], [-nrm[0], -nrm[1], 0], ax, [0, 0, 1], 3.2, 1.6, 12, 0, MAT_STEEL_BRIGHT, MAT_CT_NUT_SIDE);
  }

  // the actuator, on the outer side (zs)
  const zf = z + zs * H; // the block's side face
  const out: FwVec3 = [0, 0, zs];
  const xm = (xb - 7 + blockEnd) / 2;

  // the gear case: a round-cornered box standing out of the side, over the shaft and down over the motor
  const caseC: FwVec3 = [xm, y + 10, zf - zs * 2];

  extrudeShape(b, caseC, out, [1, 0, 0], [0, 1, 0], 22, squircle(24, 70, 4), 96, MAT_TB_BODY, MAT_TB_BODY);
  // its black satin cover, a little smaller, on top of it; raised ribs across it; six screws round its edge
  const lidC: FwVec3 = [xm, y + 10, zf + zs * 20];

  extrudeShape(b, lidC, out, [1, 0, 0], [0, 1, 0], 5, squircle(21.5, 66, 4), 96, MAT_TB_COVER, MAT_TB_COVER);
  for (let k = 0; k < 7; k++) {
    const yy = y - 26 + k * 10;

    b.box(xm - 13, xm + 13, yy - 1.4, yy + 1.4, Math.min(zf + zs * 25, zf + zs * 27.2), Math.max(zf + zs * 25, zf + zs * 27.2), MAT_TB_COVER_RIB);
  }
  for (const [dx, dy] of [[-17, -48], [17, -48], [-18, 10], [18, 10], [-17, 68], [17, 68]]) {
    b.prismDir([xm + dx, y + dy, zf + zs * 25], out, [1, 0, 0], [0, 1, 0], 2.6, 1.6, 16, 0, MAT_STEEL_BRIGHT, MAT_CT_NUT_SIDE);
    b.prismDir([xm + dx, y + dy, zf + zs * 26.62], out, [1, 0, 0], [0, 1, 0], 1.1, 0.1, 6, 0, MAT_TB_HOLE, MAT_TB_HOLE); // (its Torx)
  }
  // the position sensor's housing, round, over the shaft's end
  b.prismDir([xc, y, zf + zs * 25], out, [1, 0, 0], [0, 1, 0], 15, 7, 48, 0, MAT_TB_COVER_RIB, MAT_TB_COVER);
  b.prismDir([xc, y, zf + zs * 32], out, [1, 0, 0], [0, 1, 0], 9, 1, 40, 0, MAT_TB_COVER, MAT_TB_COVER);

  // the motor's can, along the bottom of the case, its round end standing out in front with a domed cap
  {
    const my = y + 56;
    const mz = zf + zs * 6;

    b.prismDir([xb - 2, my, mz], fwd, e1, e2, 17, T.len + 4, 48, 0, MAT_TB_COVER, MAT_TB_BODY);
    b.prismDir([xb - T.len - 2, my, mz], fwd, e1, e2, 14, 3, 48, 0, MAT_ALU_TURNED, MAT_ALU_TURNED);
    b.revolve({ x0: xb - T.len - 5, r0: 0, x1: xb - T.len - 5, r1: 9, n: [-1, 0], m: MAT_TB_COVER_RIB, steps: 32, cy: my, cz: mz });
    // its two flutes along it
    for (const a of [0.6, 2.2]) {
      const fy = my + 17.2 * Math.sin(a);
      const fz = mz + zs * 17.2 * Math.cos(a);

      b.box(xb - T.len + 2, xb - 6, fy - 1, fy + 1, fz - 1, fz + 1, MAT_TB_BODY_DEEP);
    }
  }

  // the connector, on top of the case: a black plastic shell, its mouth open upward, six pins in it, a grey latch
  {
    const cy = y - 60; // its foot, on the case's top
    const cz = zf + zs * 12;
    const xa = xm - 14;
    const xe = xm + 14;
    const z0 = Math.min(cz - 9, cz + 9);
    const z1 = Math.max(cz - 9, cz + 9);

    b.box(xa, xe, cy - 22, cy, z0, z1, MAT_TB_PLUG);
    b.box(xa + 2, xe - 2, cy - 22.2, cy - 6, z0 + 2, z1 - 2, MAT_TB_HOLE); // its mouth
    for (let k = 0; k < 3; k++) {
      for (const dz of [-3.5, 3.5]) {
        const px = xa + 7 + k * 7;

        b.box(px - 0.8, px + 0.8, cy - 16, cy - 6.3, cz + dz - 0.8, cz + dz + 0.8, MAT_TB_PIN);
      }
    }
    b.box(xa + 8, xe - 8, cy - 24, cy - 22, z1 - 1, z1 + 2.5, MAT_TB_LATCH);
    b.box(xa - 3, xa, cy - 20, cy - 4, z0 + 3, z1 - 3, MAT_TB_PLUG); // its keying rib
  }

  // the two coolant nipples on the inner side, and the vacuum port on top
  for (const dx of [-12, 12]) {
    const p: FwVec3 = [xm + dx, y + 30, z - zs * H];

    b.prismDir(p, [0, 0, -zs], [1, 0, 0], [0, 1, 0], 7, 4, 24, 0, MAT_TB_BODY, MAT_TB_BODY);
    b.prismDir([p[0], p[1], p[2] - zs * 4], [0, 0, -zs], [1, 0, 0], [0, 1, 0], 4.2, 14, 20, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
    for (const t of [7, 12]) b.prismDir([p[0], p[1], p[2] - zs * t], [0, 0, -zs], [1, 0, 0], [0, 1, 0], 5.2, 1.6, 20, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
  }
  b.prismDir([xm, y - H, z], [0, -1, 0], [1, 0, 0], [0, 0, 1], 6, 4, 24, 0, MAT_TB_BODY, MAT_TB_BODY);
  b.prismDir([xm, y - H - 4, z], [0, -1, 0], [1, 0, 0], [0, 0, 1], 3, 10, 18, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
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
  b.prismDir([x - tF + 0.2, y, 0], fwd, e1, e2, r + 1.5, 1, 64, 0, MAT_THROTTLE_RING, MAT_THROTTLE_RING); // the groove's ring

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
