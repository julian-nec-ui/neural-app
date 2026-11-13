// The air filters on the turbochargers' intakes: a K&N-style cone, pleated, under a woven net.

import { TAU } from "../core/constants";
import { vadd, vcross, vnorm, vscale, vsub } from "../math/vec3";
import type { FwMaterial, FwVec3 } from "./builder";
import { MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_FILTER_CAP, MAT_FILTER_NET, MAT_FILTER_WRAP, MAT_FILTER_WRAP_B, MAT_FILTER_WRAP_B_DEEP, MAT_FILTER_WRAP_B_HI, MAT_FILTER_WRAP_DEEP, MAT_FILTER_WRAP_HI, MAT_FILTER_WIRE, MAT_FLANGE_BLACK, MAT_PIPE_BLACK, MAT_STEEL_BRIGHT } from "./materials";
import { collar, curveFromPoints, sweepTube } from "./tubes";
import type { MeshBuilder } from "./tubes";

// How far the air intake turns, from the compressor's axis, down to its filter: 27 degrees, in one smooth bend, the
// filter on the bent end's line
export const FILTER_TURN = (68 * Math.PI) / 180; // down, mostly: hanging under the turbocharger, on the side of the engine

// How sharp the filter's folds' gaps are: the higher, the thicker each fold and the narrower the gap between two
const FOLD_SHARP = 4.5;

// A K&N-style air filter, hanging from the end of a pipe: a truncated cone in metallic red, wide at
// the flange and narrowing to a closed cap. Its wrapper is pleated, long folds that run from the flange
// to the cap, to give it more area to filter with. Over the pleats lies a fine woven net, and fine wires
// run along it; a band holds it at each end. A rubber bead runs round the flange's edge on a black plate
// that carries it, with rivets, and a band is clamped on the neck. The cap has a raised rim, a boss with a
// badge plate, and a ring of bolts.
//
// Light and shadow: every fold is shaded deeper in its valley and catches the light on its crest, the
// wrapper is darker under the flange (which shades it) and toward the cap, and a soft shadow lies on the
// floor beneath, falling away from the light. All of it quiet.
// The wrapper's stripes: one per fold, along it from the flange to the cap, two pink-red and one bright blue in turn round it,
// each from one valley to the next, so that every fold is one colour, crest and walls; each colour by shade, [deep,
// plain, crest]
const RING_RED: FwMaterial[] = [MAT_FILTER_WRAP_DEEP, MAT_FILTER_WRAP, MAT_FILTER_WRAP_HI];
const RING_BLUE: FwMaterial[] = [MAT_FILTER_WRAP_B_DEEP, MAT_FILTER_WRAP_B, MAT_FILTER_WRAP_B_HI];

export function buildAirFilter(b: MeshBuilder, e: FwVec3, dir?: FwVec3) {
  // The filter is built upright, hanging from the pipe's end (its axis the local y, down), and turned about that end so
  // that it stands on the pipe's own axis `dir` (by default the pipe's, turned FILTER_TURN down from level, forward)
  const Y = vnorm(dir ?? [-Math.cos(FILTER_TURN), Math.sin(FILTER_TURN), 0]);
  const X = vnorm(vcross(Y, Math.abs(Y[2]) < 0.95 ? [0, 0, 1] : [1, 0, 0]));
  const Z = vcross(X, Y);

  // and made bigger about the pipe's end: 39% in its radii (the wrapper's both ends, its band, its flange and cap),
  // 45.5% in its length
  const SR = 1.1 * 1.15 * 1.1;
  const SL = 1.15 * 1.15 * 1.1;

  b.setTurn((p, n) => {
    const dx = (p[0] - e[0]) * SR;
    const dy = (p[1] - e[1]) * SL;
    const dz = (p[2] - e[2]) * SR;
    const m = vnorm([n[0] / SR, n[1] / SL, n[2] / SR]);

    return [
      [e[0] + dx * X[0] + dy * Y[0] + dz * Z[0], e[1] + dx * X[1] + dy * Y[1] + dz * Z[1], e[2] + dx * X[2] + dy * Y[2] + dz * Z[2]],
      [m[0] * X[0] + m[1] * Y[0] + m[2] * Z[0], m[0] * X[1] + m[1] * Y[1] + m[2] * Z[1], m[0] * X[2] + m[1] * Y[2] + m[2] * Z[2]],
    ];
  });

  const cx = e[0];
  const cz = e[2];
  const yFlange = e[1] + 8; // the flange's plane, just under the pipe's end
  const top = yFlange + 5; // where the pleated cone begins
  const length = 98; // a little longer
  const rTop = 46;
  const rBot = 34;
  const pleats = 24; // broad, puffed folds (a multiple of three, so that the stripes' red, red, blue go round evenly)
  const rows = 96;
  const cols = pleats * 16;
  const depth = 7.2; // how deep a fold is cut: puffed out, round

  const sm = (x: number) => {
    const k = Math.min(1, Math.max(0, x));

    return k * k * (3 - 2 * k);
  };

  // A point on the wrapper: t along its length (0 at the flange), th round it. The folds fade
  // away at both ends, where the wrapper is held by the flange and by the cap.
  const P = (t: number, th: number): FwVec3 => {
    const fade = sm(t / 0.055) * sm((1 - t) / 0.055);
    const w = Math.cos(pleats * th);
    // a fold puffed out round, as a cushion: a full half round of a crest, and a narrow, sharp valley between
    const dip = 1 - Math.sqrt(Math.max(0, 1 - Math.pow(0.5 - 0.5 * w, FOLD_SHARP * 0.8)));
    const r = rTop + (rBot - rTop) * t - depth * dip * fade;

    return [cx + r * Math.cos(th), top + length * t, cz + r * Math.sin(th)];
  };

  const normalAt = (t: number, th: number): FwVec3 => {
    const d = 1e-3;
    const a0 = P(t, th + d);
    const a1 = P(t, th - d);
    const b0 = P(Math.min(1, t + d), th);
    const b1 = P(Math.max(0, t - d), th);
    const n = vnorm(vcross(vsub(a0, a1), vsub(b0, b1)));
    const p = P(t, th);
    const out: FwVec3 = [p[0] - cx, 0, p[2] - cz];

    return n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0 ? vscale(n, -1) : n;
  };

  // The grid of points, worked out once
  type FilterVertex = { pos: FwVec3; nor: FwVec3; kind: number; occ: number };
  const grid: FilterVertex[] = [];

  for (let i = 0; i <= rows; i++) {
    for (let j = 0; j <= cols; j++) {
      const t = i / rows;
      const jj = j % cols;
      const th = (jj / cols) * TAU;
      const w = Math.cos(pleats * th);
      const fade = sm(t / 0.055) * sm((1 - t) / 0.055);
      const valley = Math.pow(0.5 - 0.5 * w, FOLD_SHARP / 1.7); // only the narrow gaps count as valleys

      // Shadow: deeper in the valleys; darker under the flange, which shades the top of the wrapper,
      // and a little toward the cap
      const shade = 1 - 0.22 * Math.pow(valley, 1.3) * fade;
      const underFlange = 0.86 + 0.14 * sm(t / 0.16);
      const toCap = 0.92 + 0.08 * sm((1 - t) / 0.12);
      const occ = shade * underFlange * toCap;

      // Shade: bright on the crests (2), deep in the valleys (0)
      const kind = valley > 0.5 ? 0 : w > 0.55 ? 2 : 1;

      grid.push({ pos: P(t, th), nor: normalAt(t, th), kind, occ });
    }
  }

  const at = (i: number, j: number) => grid[i * (cols + 1) + j];

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const v00 = at(i, j);
      const v10 = at(i + 1, j);
      const v11 = at(i + 1, j + 1);
      const v01 = at(i, j + 1);

      // its stripe: the fold it is on, two red and one blue in turn round the wrapper, each edge sharp, in a valley
      const per = cols / pleats;
      const ring = Math.floor((j + 0.5 + per / 2) / per) % 3 === 2 ? RING_BLUE : RING_RED; // two red, one blue

      for (const v of [v00, v10, v11, v00, v11, v01]) b.push(v.pos, v.nor, ring[v.kind], v.occ);
    }
  }

  // ---- the net: a fine woven mesh of dark grey threads laid over the folds, following each of them down into its valley
  // and up over its crest, a hair off the wrapper; the threads one way round it, the other way along it, each a narrow
  // ribbon, lifted and dropped a little where it crosses the others (over one, under the next), shaded deeper in the
  // valleys as the wrapper is ----
  {
    const NET_PITCH = 2.6; // from one thread to the next, along the wrapper's own surface
    const NET_W = 0.18; // a thread's width (15% finer than 0.32)
    const NET_OFF = 0.3; // how far off the wrapper the net lies
    const WEAVE = 0.07; // and how far a thread rises and dips, over and under
    const t0 = 0.02;
    const t1 = 0.98;
    // the wrapper's occlusion at a point: as the grid's
    const occAt = (t: number, th: number) => {
      const w = Math.cos(pleats * th);
      const fade = sm(t / 0.055) * sm((1 - t) / 0.055);
      const valley = Math.pow(0.5 - 0.5 * w, FOLD_SHARP / 1.7);

      return (1 - 0.42 * Math.pow(valley, 1.3) * fade) * (0.76 + 0.24 * sm(t / 0.16)) * (0.86 + 0.14 * sm((1 - t) / 0.12));
    };
    const norm = (v: FwVec3) => vnorm(v);
    const ribbon = (pts: FwVec3[], nrm: FwVec3[], side: FwVec3[], occ: number[]) => {
      for (let k = 0; k + 1 < pts.length; k++) {
        const a0 = vadd(pts[k], vscale(side[k], -NET_W / 2));
        const a1 = vadd(pts[k], vscale(side[k], NET_W / 2));
        const b0 = vadd(pts[k + 1], vscale(side[k + 1], -NET_W / 2));
        const b1 = vadd(pts[k + 1], vscale(side[k + 1], NET_W / 2));

        b.push(a0, nrm[k], MAT_FILTER_NET, occ[k]);
        b.push(b0, nrm[k + 1], MAT_FILTER_NET, occ[k + 1]);
        b.push(b1, nrm[k + 1], MAT_FILTER_NET, occ[k + 1]);
        b.push(a0, nrm[k], MAT_FILTER_NET, occ[k]);
        b.push(b1, nrm[k + 1], MAT_FILTER_NET, occ[k + 1]);
        b.push(a1, nrm[k], MAT_FILTER_NET, occ[k]);
      }
    };

    // the arc length round the folded wrapper, at a given t, as a function of th: to space the threads along it evenly
    const ARC_STEPS = cols * 2;
    const arcTable = (t: number) => {
      const acc = [0];

      for (let k = 1; k <= ARC_STEPS; k++) {
        const p0 = P(t, ((k - 1) / ARC_STEPS) * TAU);
        const p1 = P(t, (k / ARC_STEPS) * TAU);

        acc.push(acc[k - 1] + Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]));
      }

      return acc;
    };
    const midArc = arcTable(0.5);
    const total = midArc[ARC_STEPS];
    const nAlong = Math.round(total / NET_PITCH);
    // the th of each thread along the wrapper: evenly spaced in arc length round the middle of it
    const thAlong: number[] = [];

    for (let m = 0, k = 0; m < nAlong; m++) {
      const target = (m / nAlong) * total;

      while (k < ARC_STEPS && midArc[k + 1] < target) k++;

      const f = (target - midArc[k]) / (midArc[k + 1] - midArc[k] || 1);

      thAlong.push(((k + f) / ARC_STEPS) * TAU);
    }

    const nRound = Math.round(((t1 - t0) * length) / NET_PITCH);
    const dT = 1e-3;
    const tangentT = (t: number, th: number) => norm(vsub(P(Math.min(1, t + dT), th), P(Math.max(0, t - dT), th)));
    const tangentTh = (t: number, th: number) => norm(vsub(P(t, th + dT), P(t, th - dT)));

    // the threads round the wrapper: at evenly spaced t, each through every fold
    for (let r = 0; r <= nRound; r++) {
      const t = t0 + ((t1 - t0) * r) / nRound;
      const pts: FwVec3[] = [];
      const nrm: FwVec3[] = [];
      const side: FwVec3[] = [];
      const occ: number[] = [];
      const steps = cols * 2;

      for (let k = 0; k <= steps; k++) {
        const th = (k / steps) * TAU;
        const n = normalAt(t, th);
        // over and under the threads along it: up where it crosses one, down at the next
        const weave = WEAVE * Math.sin((k / steps) * nAlong * Math.PI + r * Math.PI);

        pts.push(vadd(P(t, th), vscale(n, NET_OFF + weave)));
        nrm.push(n);
        side.push(tangentT(t, th));
        occ.push(occAt(t, th));
      }

      ribbon(pts, nrm, side, occ);
    }

    // the threads along it: from end to end, each at its th
    for (let m = 0; m < thAlong.length; m++) {
      const th = thAlong[m];
      const pts: FwVec3[] = [];
      const nrm: FwVec3[] = [];
      const side: FwVec3[] = [];
      const occ: number[] = [];
      const steps = rows;

      for (let k = 0; k <= steps; k++) {
        const t = t0 + ((t1 - t0) * k) / steps;
        const n = normalAt(t, th);
        const weave = WEAVE * Math.sin(((t - t0) / (t1 - t0)) * nRound * Math.PI + m * Math.PI + Math.PI);

        pts.push(vadd(P(t, th), vscale(n, NET_OFF + 0.02 + weave)));
        nrm.push(n);
        side.push(tangentTh(t, th));
        occ.push(occAt(t, th));
      }

      ribbon(pts, nrm, side, occ);
    }
  }

  // (no band round the middle: the wrapper is held only at its two ends)
  const spine = curveFromPoints([[cx, top, cz], [cx, top + length, cz]], 2);

  // two narrower bands near the ends, where the wrapper is held
  for (const t of [0.075, 0.925]) {
    const rc = rTop + (rBot - rTop) * t;

    collar(b, spine, length * t, rc - 0.6, rc + 0.8, 1.6, MAT_STEEL_BRIGHT);
  }

  // the wire cage over the net, standing just off the folds' crests: fine wires along it (its thin rings taken off)
  const crest = (t: number) => rTop + (rBot - rTop) * t + 0.75;

  for (let k = 0; k < 30; k++) {
    const a = ((k + 0.5) / 30) * TAU;
    const wireCurve = curveFromPoints(
      [
        [cx + crest(0.06) * Math.cos(a), top + length * 0.06, cz + crest(0.06) * Math.sin(a)],
        [cx + crest(0.94) * Math.cos(a), top + length * 0.94, cz + crest(0.94) * Math.sin(a)],
      ],
      2
    );

    sweepTube(b, wireCurve, () => 0.28, MAT_FILTER_WIRE, { segments: 5 });
  }

  // the neck, a black rubber sleeve from the pipe to the flange, with a steel band clamped on it
  const neck = curveFromPoints([[cx, e[1] - 12, cz], [cx, yFlange + 4, cz]], 3);

  sweepTube(b, neck, () => 25, MAT_PIPE_BLACK, { segments: 36 });
  collar(b, neck, 9, 25, 28, 7, MAT_STEEL_BRIGHT);
  b.box(cx + 22, cx + 36, e[1] - 12 + 3, e[1] - 12 + 14, cz - 5, cz + 5, MAT_STEEL_BRIGHT);
  b.prismDir([cx + 36, e[1] - 12 + 8.5, cz], [1, 0, 0], [0, 1, 0], [0, 0, 1], 3.6, 5, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);

  // the flange: a black plate round the neck, hollow, with a rubber bead on its rim that the wrapper is
  // set in, and twelve rivets round it
  collar(b, neck, neck.total - 3, 25, rTop + 4, 5, MAT_FLANGE_BLACK, MAT_FLANGE_BLACK);
  collar(b, neck, neck.total - 0.6, rTop - 1, rTop + 3.5, 3.4, MAT_PIPE_BLACK, MAT_PIPE_BLACK);

  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    const rr = rTop - 8;

    b.prismDir([cx + rr * Math.cos(a), yFlange - 1.2, cz + rr * Math.sin(a)], [0, -1, 0], [1, 0, 0], [0, 0, 1], 2.1, 1.4, 12, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
  }

  // the cap at the closed end: a black turned plate with a raised bead on its rim, a boss in the middle
  // with a badge plate on it, a ring cut in its face, and a ring of eight bolts
  const yEnd = top + length;

  b.prismDir([cx, yEnd, cz], [0, 1, 0], [1, 0, 0], [0, 0, 1], rBot + 1.6, 5, 48, 0, MAT_FILTER_CAP, MAT_FILTER_CAP);
  b.prismDir([cx, yEnd + 5, cz], [0, 1, 0], [1, 0, 0], [0, 0, 1], rBot + 1.0, 1.6, 48, 0, MAT_FILTER_CAP, MAT_STEEL_BRIGHT);
  b.prismDir([cx, yEnd + 5, cz], [0, 1, 0], [1, 0, 0], [0, 0, 1], 11, 3, 28, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
  b.box(cx - 7, cx + 7, yEnd + 8, yEnd + 9.2, cz - 3, cz + 3, MAT_FILTER_WRAP);

  // the cap's rim knurled for the hand, and fine ribs cast in its face, from the boss to the bolts
  for (let k = 0; k < 60; k++) {
    const a = (k / 60) * TAU;
    const rr = rBot + 1.7;

    b.prismDir([cx + rr * Math.cos(a), yEnd + 2.5, cz + rr * Math.sin(a)], [Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)], 0.55, 0.6, 4, 0, MAT_FILTER_CAP, MAT_FILTER_CAP);
  }

  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU;
    const c = Math.cos(a);
    const sn = Math.sin(a);

    for (let r = 13; r < 18.5; r += 1.1) b.prismDir([cx + r * c, yEnd + 5, cz + r * sn], [0, 1, 0], [c, 0, sn], [-sn, 0, c], 0.45, 0.7, 4, 0, MAT_STEEL_BRIGHT, MAT_FILTER_CAP);
  }
  collar(b, curveFromPoints([[cx, yEnd - 2, cz], [cx, yEnd + 8, cz]], 2), 3.5, rBot - 5, rBot - 3.2, 1.4, MAT_STEEL_BRIGHT);

  for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) / 8) * TAU;

    b.prismDir([cx + 21 * Math.cos(a), yEnd + 5, cz + 21 * Math.sin(a)], [0, 1, 0], [1, 0, 0], [0, 0, 1], 2.4, 1.8, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
  }

  b.setTurn(null);
}
