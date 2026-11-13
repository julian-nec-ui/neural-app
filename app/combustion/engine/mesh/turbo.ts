// The turbocharger: its layout, housings and wheels.

import { CT_X, ROD_LIFT, TAU, composeTurn } from "../core/constants";
import type { FwMaterial, FwVec3 } from "./builder";
import { vcross, vnorm, vscale, vsub } from "../math/vec3";
import { MAT_ALU_TURNED, MAT_CT_EDGE, MAT_CT_HOLE, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_PIPE_BLACK, MAT_MUFFLER_WIRE, MAT_TURBO_FLANGE_DARK, MAT_TURBO_GRAIN, MAT_TURBO_RIDGE, MAT_TURBO_RIDGE_EDGE, MAT_STEEL_BRIGHT, MAT_WHEEL_ALU, MAT_WHEEL_EDGE, MAT_WHEEL_HOT, MAT_WHEEL_HOT_HUB } from "./materials";
import { curveAt, curveFromPoints, pipeFlange, roundedCurve, sweepTube } from "./tubes";
import type { Curve, MeshBuilder } from "./tubes";

/* ---------------- turbocharger, intercooler and plumbing ---------------- */

// In a bank's own frame the exhaust leaves the head on the -Z side (the valley side of
// the V) and the intake enters on the +Z side (the outside). The intake plenum stands
// close to the head, above the ports' height, and stops at the first and last cylinder;
// each cylinder has its own runner from it. The exhaust goes by short stubs into a log
// that runs to the turbocharger module in front of the engine.
export const PORT_Y = -281 - ROD_LIFT; // the height of the head's ports, exhaust and intake
export const PLENUM_Y = -345 - ROD_LIFT; // axis of the intake plenum, above the runners' height
export const PLENUM_Z = 165; // the intake plenum's

// The collector's radius, by distance from the top of the cone: a cone that the log
// comes into, narrowing in 60 units to the size of the pipe to the turbine
export const COLLECTOR_CONE = 30;

export const collectorRadius = (s: number) => {
  if (s < COLLECTOR_CONE) {
    const k = s / COLLECTOR_CONE;

    return 31 - 4 * k * k * (3 - 2 * k);
  }

  return Math.max(24, 27 - 3 * ((s - COLLECTOR_CONE) / 60));
};

// The turbocharger module's own frame (MODULES turns it into the engine's): the
// collector's cone points down, and the turbocharger hangs from it, the turbine's
// inlet bolted to the collector's flange, as in a real engine.
export const HDR_MOUTH_Y = -195; // the top of the cone, where the exhaust comes in
export const HDR_CX = (CT_X[0] + CT_X[CT_X.length - 1]) / 2; // the collector's axis, in the module's frame
export const HDR_CZ = -138;
export const COLLECTOR_LEN = 100; // the cone and the short straight stub under it

// The turbocharger's parts are built in their own frame, the shaft along X (the turbine
// at -X, the compressor at +X), and turned into place: local x -> world -x, local y ->
// world -z, local z -> world -y (in the module's frame). So the turbine's inlet, at the top
// of the scroll, faces up to the collector.
// How much bigger the whole turbocharger is drawn than it is built (housings, spirals, flanges, wheels, all of it):
// sturdier, more like a real one. It grows about the top of its turbine's inlet, so that the inlet still meets the
// collector's end where it did; everything fixed to the turbo (its pipes' ends, the gas in it) goes with it
export const TURBO_SCALE = 1.15;
// and how much wider its two spirals are, besides
export const SPIRAL_WIDEN = 1.08;

export const TURBO = {
  x: HDR_CX - 58, // the turbine's wheel stands under the collector's axis
  y: HDR_MOUTH_Y - 6 + COLLECTOR_LEN + 50, // the inlet pipe's top is the collector's end
  z: HDR_CZ - (36 + 2 + 26 * SPIRAL_WIDEN), // (the turbine's spiral starts this far out: its tip, 36, and 2 and its section)
};

// the point it grows about, in its own frame: the middle of the top of the turbine's inlet
const PIVOT: FwVec3 = [-58, -(36 + 2 + 26 * SPIRAL_WIDEN), 50];
// and turned a little about the same point, round its upright: the compressor's end swings out, away from the block
// (grown, its spiral would reach into the block's side), while the turbine's inlet stays where it meets the collector
export const TURBO_YAW_DEG = -7;
const YAW_C = Math.cos((TURBO_YAW_DEG * Math.PI) / 180);
const YAW_S = Math.sin((TURBO_YAW_DEG * Math.PI) / 180);
const grown = (p: FwVec3): FwVec3 => {
  const dx = p[0] - PIVOT[0];
  const dy = p[1] - PIVOT[1];

  return [
    PIVOT[0] + (dx * YAW_C - dy * YAW_S) * TURBO_SCALE,
    PIVOT[1] + (dx * YAW_S + dy * YAW_C) * TURBO_SCALE,
    PIVOT[2] + (p[2] - PIVOT[2]) * TURBO_SCALE,
  ];
};

export const turboWorld = (q: FwVec3): FwVec3 => {
  const p = grown(q);

  return [TURBO.x - p[0], TURBO.y - p[2], TURBO.z - p[1]];
};

// where the turbo's own frame is set in its module (its origin, grown about the pivot): its parts are placed there
export const TURBO_AT: FwVec3 = turboWorld([0, 0, 0]);

// its turn into place, and its growth
export const TURBO_ORIENT = composeTurn(
  new Float32Array([-1, 0, 0, 0, 0, -1, 0, -1, 0]),
  [YAW_C, YAW_S, 0, -YAW_S, YAW_C, 0, 0, 0, 1].map((v) => v * TURBO_SCALE)
);

// How fast the wheels turn at full boost, radians a second: far slower than a
// real turbocharger, so that they can be seen turning
export const TURBO_MAX_OMEGA = 40;

export const TB = {
  half: 58, // each wheel's distance from the middle of the turbo
  turbineTip: 36,
  compressorTip: 41,
};

export const IC_PORT_DX = 56; // how far ahead of x = -537 the intercooler's middle stands
export const IC = { x: -537 - IC_PORT_DX, y: 28, z: 18.5 }; // the intercooler's centre
export const IC_HALF = { x: 40, y: 100, z: 138 }; // the core

/* ---- the turbocharger, in its own frame (shaft along X) ---- */

// A scroll: the housing's spiral, as a sweep along a spiral about the shaft.
// `sections` and `radii` give the spiral's centre radius and the tube's radius
// along it, from 0 to 1.
function spiralPoints(
  x: number, phi0: number, phi1: number,
  centreRadius: (u: number) => number, n = 90
): FwVec3[] {
  const pts: FwVec3[] = [];

  for (let k = 0; k <= n; k++) {
    const u = k / n;
    const phi = phi0 + (phi1 - phi0) * u;
    const r = centreRadius(u);

    pts.push([x, r * Math.cos(phi), r * Math.sin(phi)]);
  }

  return pts;
}

const SPIRAL_SWEEP = (335 * Math.PI) / 180;

// Turbine: the exhaust comes in along local +z (from the log), circles in the
// spiral, and goes into the wheel; it leaves along the shaft, toward -x
export const turbineSection = (u: number) => (26 - 18 * u) * SPIRAL_WIDEN;
const turbineCentre = (u: number) => TB.turbineTip + 2 + turbineSection(u);

// Compressor: the air comes in along the shaft (from +x), is thrown outward
// by the wheel into the spiral, and leaves along local -z (toward the intercooler)
export const compressorSection = (u: number) => (7 + 15 * u) * SPIRAL_WIDEN; // (a compact spiral: clear of the block)
export const compressorCentre = (u: number) => TB.compressorTip + 2 + compressorSection(u);

export const TURBINE_INLET_LEN = 50;
export const COMPRESSOR_OUTLET_LEN = 48;

export function turbinePathLocal(): FwVec3[] {
  const x = -TB.half;
  const inletY = -turbineCentre(0);
  const pts: FwVec3[] = [[x, inletY, TURBINE_INLET_LEN], [x, inletY, 0]];

  pts.push(...spiralPoints(x, Math.PI, Math.PI + SPIRAL_SWEEP, turbineCentre).slice(1));

  return pts;
}

export function compressorPathLocal(): FwVec3[] {
  const x = TB.half;
  const phi1 = Math.PI;
  const pts = spiralPoints(x, phi1 - SPIRAL_SWEEP, phi1, compressorCentre);
  const outY = -compressorCentre(1);

  pts.push([x, outY, -COMPRESSOR_OUTLET_LEN]);

  // wound the other way: the spiral and its outlet are the mirror image of what they were
  return pts.map((p): FwVec3 => [p[0], -p[1], p[2]]);
}

// The two housings' skins are drawn see-through, so that the wheels and the gas
// moving through the spirals can be seen
// Ridges along a scroll, in relief: broad flat ribs running round with the spiral, the way the wheel inside turns and
// the gas goes, side by side over its outer half (from one face over the rim to the other). Each is a low band with a
// flat crown, its edges bevelled down to the skin (the bevels catching the light brighter), rising out of the skin at
// its start and sinking back into it at its end: a texture of circling bands
// (narrower than their spacing, 20 degrees: the housing's own flange-grey shows in the gaps between them)
const RIDGE = { half: (4.6 * Math.PI) / 180, bevel: (1.8 * Math.PI) / 180, edge: (1 * Math.PI) / 180, lift: 0.85, step: 3 };

// `sMin`..`s1`: where on the curve the ridges run; `angles`: where round the tube each runs (0 is straight out from the
// shaft, ± toward either face); a rib's width goes with the tube's (a share of its round)
function scrollRidges(b: MeshBuilder, c: Curve, sMin: number, s1: number, radius: (s: number) => number, angles: number[]) {
  const at: FwVec3 = [0, 0, 0];
  const t: FwVec3 = [0, 0, 0];
  const n = Math.max(4, Math.ceil((s1 - sMin) / RIDGE.step));
  // across a rib: (angle off its middle, share of its height); the crown, its rounded shoulders, the bevels down
  const H = RIDGE.half;
  // (and a fine groove down the middle of its crown, its sides bright like the bevels)
  const G = RIDGE.edge * 0.6;
  const PROFILE: Array<[number, number]> = [
    [-H - RIDGE.bevel, 0], [-H, 0.78], [-H + RIDGE.edge, 1], [-G, 1], [0, 0.55], [G, 1], [H - RIDGE.edge, 1], [H, 0.78], [H + RIDGE.bevel, 0],
  ];
  const MATS = [
    MAT_TURBO_RIDGE_EDGE, MAT_TURBO_RIDGE_EDGE, MAT_TURBO_RIDGE, MAT_TURBO_RIDGE_EDGE, MAT_TURBO_RIDGE_EDGE, MAT_TURBO_RIDGE, MAT_TURBO_RIDGE_EDGE, MAT_TURBO_RIDGE_EDGE,
  ];

  // the frame round the tube at s: its middle, the way out from the shaft and the way along it
  const frame = (s: number) => {
    curveAt(c, s, at, t);

    const len = Math.hypot(at[1], at[2]) || 1;
    const out: FwVec3 = [0, at[1] / len, at[2] / len];
    const side: FwVec3 = Math.abs(t[0]) > 0.5 ? [0, 1, 0] : [1, 0, 0];
    const across: FwVec3 = Math.abs(t[2]) > 0.7 ? vnorm(vcross(t, side)) : out;
    const along: FwVec3 = Math.abs(t[2]) > 0.7 ? vnorm(vcross(t, across)) : [1, 0, 0];

    return { p: [at[0], at[1], at[2]] as FwVec3, across, along };
  };

  for (const ang of angles) {
    const rows: Array<Array<{ p: FwVec3; n: FwVec3 }>> = [];

    for (let i = 0; i <= n; i++) {
      const s = sMin + ((s1 - sMin) * i) / n;
      const f = frame(s);
      // rising out of the skin over its first and last stretch
      const e = Math.min(1, (s - sMin) / 14, (s1 - s) / 14);
      const rise = e * e * (3 - 2 * e);
      const r = radius(s);
      const dirAt = (a: number): FwVec3 => [
        f.along[0] * Math.sin(a) + f.across[0] * Math.cos(a),
        f.along[1] * Math.sin(a) + f.across[1] * Math.cos(a),
        f.along[2] * Math.sin(a) + f.across[2] * Math.cos(a),
      ];

      rows.push(PROFILE.map(([da, hh], k) => {
        const a = ang + da;
        const d = dirAt(a);
        const tan = dirAt(a + Math.PI / 2); // round the tube
        const h = (RIDGE.lift * hh + 0.05) * rise - (1 - rise) * 0.6;
        // the normal: out on the crown, leaning to its side on the bevels
        // (the bevels lean out to their side; the groove's sides lean in toward its bottom)
        const lean = k === 0 || k === 8 ? 0.62 : k === 1 || k === 7 ? 0.35 : k === 3 || k === 5 ? -0.45 : 0;
        const sgn = da < 0 ? -1 : 1;
        const nn = vnorm([d[0] + tan[0] * sgn * lean, d[1] + tan[1] * sgn * lean, d[2] + tan[2] * sgn * lean]);

        return { p: [f.p[0] + d[0] * (r + h), f.p[1] + d[1] * (r + h), f.p[2] + d[2] * (r + h)] as FwVec3, n: nn };
      }));
    }

    for (let i = 0; i < n; i++) {
      for (let k = 0; k < PROFILE.length - 1; k++) {
        const a0 = rows[i][k];
        const a1 = rows[i][k + 1];
        const b0 = rows[i + 1][k];
        const b1 = rows[i + 1][k + 1];
        const m = MATS[k];
        const o = m === MAT_TURBO_RIDGE ? 1 : k === 3 || k === 4 ? 0.7 : 0.85;

        b.push(a0.p, a0.n, m, o);
        b.push(b0.p, b0.n, m, o);
        b.push(b1.p, b1.n, m, o);
        b.push(a0.p, a0.n, m, o);
        b.push(b1.p, b1.n, m, o);
        b.push(a1.p, a1.n, m, o);
      }
    }
  }
}

// The woven sleeve of grey metal wire (as on the pipe from the turbine to the silencer, exhaust.ts) over a stretch of
// the turbo's own pipe along its shaft, from x0 to x1 at radius r: two sets of wires in opposite helices, crossing over
// and under, and a crimped band at each end
function wovenSleeve(b: MeshBuilder, x0: number, x1: number, r: number) {
  const WIRES = 14;
  const lead = 96;
  const rr = r + 0.9;
  const n = Math.max(8, Math.ceil(Math.abs(x1 - x0) / 1.5));

  for (const hand of [-1, 1]) {
    for (let w = 0; w < WIRES; w++) {
      const wire: FwVec3[] = [];

      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n;
        const along = Math.abs(x - x0);
        const th = (w / WIRES) * TAU + hand * (along / lead) * TAU;
        const rad = rr + 0.35 * Math.sin(th * WIRES * 0.5 + hand * along * 0.9);

        wire.push([x, Math.cos(th) * rad, Math.sin(th) * rad]);
      }

      sweepTube(b, curveFromPoints(wire, 3), () => 0.55, MAT_MUFFLER_WIRE, { segments: 4 });
    }
  }

  for (const x of [x0, x1]) {
    const d = x1 > x0 ? 1 : -1;
    const a = x === x0 ? x : x - 4 * d;

    b.revolve({ x0: a, r0: r + 2, x1: a + 4 * d, r1: r + 2, n: [0, 1], m: MAT_MUFFLER_WIRE, steps: 48 });
    b.revolve({ x0: a, r0: r, x1: a, r1: r + 2, n: [-d, 0], m: MAT_MUFFLER_WIRE, steps: 48 });
    b.revolve({ x0: a + 4 * d, r0: r, x1: a + 4 * d, r1: r + 2, n: [d, 0], m: MAT_MUFFLER_WIRE, steps: 48 });
  }
}

// Ribs round a cone or a band of a housing (a surface of revolution about the shaft, from (x0, r0) to (x1, r1)): broad
// flat rings, bevelled down to the skin like the scrolls' ribs, centred at the given shares along it
function coneRings(b: MeshBuilder, x0: number, r0: number, x1: number, r1: number, at: number[]) {
  const len = Math.hypot(x1 - x0, r1 - r0);
  const gx = (x1 - x0) / len; // along the surface (in x, and out from the shaft)
  const gr = (r1 - r0) / len;
  const nx = gr; // and its normal (out of the housing)
  const nr = -gx;
  const W = 1.6; // half a ring's crown
  const BV = 0.9; // its bevels
  const E = 0.5; // its rounded shoulders
  const PROFILE: Array<[number, number]> = [[-W - BV, 0], [-W, 0.78], [-W + E, 1], [W - E, 1], [W, 0.78], [W + BV, 0]];
  const MATS = [MAT_TURBO_RIDGE_EDGE, MAT_TURBO_RIDGE_EDGE, MAT_TURBO_RIDGE, MAT_TURBO_RIDGE_EDGE, MAT_TURBO_RIDGE_EDGE];
  const STEPS = 72;

  for (const u of at) {
    const sc = u * len;
    const ring = (k: number, phi: number) => {
      const [d, hh] = PROFILE[k];
      const h = RIDGE.lift * hh + 0.05;
      const x = x0 + gx * (sc + d) + nx * h;
      const r = r0 + gr * (sc + d) + nr * h;
      const lean = k === 0 || k === 5 ? 0.62 : k === 1 || k === 4 ? 0.35 : 0;
      const sg = d < 0 ? -1 : 1;
      const mx = nx + gx * sg * lean;
      const mr = nr + gr * sg * lean;
      const ml = Math.hypot(mx, mr);

      return {
        p: [x, r * Math.cos(phi), r * Math.sin(phi)] as FwVec3,
        n: [mx / ml, (mr / ml) * Math.cos(phi), (mr / ml) * Math.sin(phi)] as FwVec3,
      };
    };

    for (let i = 0; i < STEPS; i++) {
      const p0 = (i / STEPS) * Math.PI * 2;
      const p1 = ((i + 1) / STEPS) * Math.PI * 2;

      for (let k = 0; k < PROFILE.length - 1; k++) {
        const a0 = ring(k, p0);
        const a1 = ring(k + 1, p0);
        const b0 = ring(k, p1);
        const b1 = ring(k + 1, p1);
        const m = MATS[k];
        const o = k === 2 ? 1 : 0.85;

        b.push(a0.p, a0.n, m, o);
        b.push(b0.p, b0.n, m, o);
        b.push(b1.p, b1.n, m, o);
        b.push(a0.p, a0.n, m, o);
        b.push(b1.p, b1.n, m, o);
        b.push(a1.p, a1.n, m, o);
      }
    }
  }
}

// round each tube: nine ribs over its outer half, from one face to the other
const RIDGE_ANGLES = [-80, -60, -40, -20, 0, 20, 40, 60, 80].map((d) => (d * Math.PI) / 180);
// and all the way round it: eighteen
const RIDGE_ANGLES_ROUND = Array.from({ length: 18 }, (_, k) => ((-180 + 20 * k) * Math.PI) / 180);

export function buildTurboCasing(b: MeshBuilder) {
  const rev = (x0: number, r0: number, x1: number, r1: number, n: [number, number], m: FwMaterial) =>
    b.revolve({ x0, r0, x1, r1, n, m, steps: 48 });

  // turbine: the spiral with its inlet, the shroud, the cone and the axial outlet
  const turbineCurve = curveFromPoints(turbinePathLocal(), 4);

  sweepTube(
    b, turbineCurve,
    (u) => {
      const s = u * turbineCurve.total;

      return s < TURBINE_INLET_LEN ? 26 : turbineSection((s - TURBINE_INLET_LEN) / (turbineCurve.total - TURBINE_INLET_LEN));
    },
    MAT_TURBO_GRAIN, { segments: 26, capEnd: true }
  );
  // (on the hot side, from the inlet's flange round to the spiral's end)
  scrollRidges(
    b, turbineCurve, 6, turbineCurve.total - 2,
    (s) => (s < TURBINE_INLET_LEN ? 26 * SPIRAL_WIDEN : turbineSection((s - TURBINE_INLET_LEN) / (turbineCurve.total - TURBINE_INLET_LEN))),
    RIDGE_ANGLES
  );
  rev(-72, 40, -44, 40, [0, 1], MAT_TURBO_GRAIN);
  rev(-72, 40, -100, 24, [-0.5, 0.85], MAT_TURBO_GRAIN);
  rev(-100, 24, -130, 24, [0, 1], MAT_STEEL_BRIGHT);
  wovenSleeve(b, -102, -128, 24); // (the outlet to its flange: woven wire, as the pipe it joins)

  // compressor: the spiral with its outlet, and the cover over the wheel
  const compressorCurve = curveFromPoints(compressorPathLocal(), 4);
  const spiralLen = compressorCurve.total - COMPRESSOR_OUTLET_LEN;

  sweepTube(
    b, compressorCurve,
    (u) => {
      const s = u * compressorCurve.total;

      return s < spiralLen ? compressorSection(s / spiralLen) : compressorSection(1);
    },
    MAT_TURBO_GRAIN, { segments: 26, capStart: true }
  );
  // (on the cold side all the way round the tube, and on along its outlet to the flange)
  scrollRidges(b, compressorCurve, 2, compressorCurve.total - 5, (s) => (s < spiralLen ? compressorSection(s / spiralLen) : compressorSection(1)), RIDGE_ANGLES_ROUND);
  rev(112, 26, 96, 26, [0, 1], MAT_ALU_TURNED);
  rev(96, 26, 72, 44, [0.6, 0.8], MAT_TURBO_GRAIN);
  rev(72, 44, 44, 44, [0, 1], MAT_TURBO_GRAIN);
  // (and its cone and its back band ringed with the same ribs, so that the whole of the cold side is covered)
  coneRings(b, 96, 26, 72, 44, [0.16, 0.38, 0.6, 0.82]);
  coneRings(b, 72, 44, 44, 44, [0.2, 0.5, 0.8]);
}

// The turbocharger's solid fittings: flanges, clamps, the centre housing, oil
// and coolant lines
export function buildTurboHousing(b: MeshBuilder) {
  const rev = (x0: number, r0: number, x1: number, r1: number, n: [number, number], m: FwMaterial) =>
    b.revolve({ x0, r0, x1, r1, n, m, steps: 48 });

  pipeFlange(b, curveFromPoints(turbinePathLocal(), 4), false, 38, MAT_TURBO_GRAIN);

  const compressorCurve = curveFromPoints(compressorPathLocal(), 4);

  pipeFlange(b, compressorCurve, true, 38, MAT_ALU_TURNED);

  // turbine outlet flange and the back plates
  rev(-130, 24, -130, 32, [-1, 0], MAT_TURBO_FLANGE_DARK);
  rev(-130, 32, -135, 32, [0, 1], MAT_TURBO_FLANGE_DARK);
  rev(-135, 24, -135, 32, [-1, 0], MAT_TURBO_FLANGE_DARK);
  rev(-135, 18, -135, 24, [-1, 0], MAT_CT_HOLE);
  rev(-44, 0, -44, 52, [1, 0], MAT_TURBO_GRAIN);
  rev(-44, 52, -38, 52, [0, 1], MAT_TURBO_GRAIN);

  rev(44, 0, 44, 56, [-1, 0], MAT_TURBO_GRAIN);
  rev(44, 56, 38, 56, [0, 1], MAT_TURBO_GRAIN);

  // the centre housing
  rev(-38, 24, 38, 24, [0, 1], MAT_STEEL_BRIGHT);
  wovenSleeve(b, -29, 29, 24); // (wrapped in the same woven wire as the pipe from the turbine to the silencer)

  for (const x of [-34, 34]) {
    // V-band clamps joining it to the two housings
    rev(x - 4, 36, x + 4, 36, [0, 1], MAT_STEEL_BRIGHT);
    rev(x - 4, 24, x - 4, 36, [-1, 0], MAT_CT_EDGE);
    rev(x + 4, 24, x + 4, 36, [1, 0], MAT_CT_EDGE);
    b.prismDir([x, -36, 0], [0, -1, 0], [1, 0, 0], [0, 0, 1], 5, 7, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
  }

  // oil feed on top, with a banjo fitting, and the two coolant pipes
  b.prismDir([0, -24, 0], [0, -1, 0], [1, 0, 0], [0, 0, 1], 5, 7, 18, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
  sweepTube(b, roundedCurve([[0, -30, 0], [0, -46, 0], [-16, -52, 20]], 8, 3), () => 2.6, MAT_STEEL_BRIGHT, { segments: 12, capEnd: true });

  for (const side of [-1, 1]) {
    sweepTube(b, roundedCurve([[side * 14, 20, 12], [side * 14, 36, 12], [side * 14, 40, 40]], 8, 3), () => 3.2, MAT_PIPE_BLACK, { segments: 12, capEnd: true });
  }

}

// The air filter on the compressor's inlet, on the turbo's axis
export function buildTurboFilter(b: MeshBuilder) {
  const rev = (x0: number, r0: number, x1: number, r1: number, n: [number, number], m: FwMaterial) =>
    b.revolve({ x0, r0, x1, r1, n, m, steps: 48 });

  // The compressor's inlet goes on along the shaft, to a flange, as the turbine's outlet does on
  // the other side: the two are mirror images about the middle of the turbocharger
  rev(112, 26, 130, 26, [0, 1], MAT_ALU_TURNED);
  rev(130, 26, 130, 32, [1, 0], MAT_CT_EDGE);
  rev(130, 32, 135, 32, [0, 1], MAT_ALU_TURNED);
  rev(135, 26, 135, 32, [1, 0], MAT_CT_EDGE);
  rev(135, 18, 135, 26, [1, 0], MAT_CT_HOLE);
}

// A wheel: a hub that flares out, a back disc, and the blades: bent plates
// that sweep back from the front edge to the back. Splitter blades between them.
type WheelSpec = {
  xFront: number; xBack: number; tip: number; hub0: number; tip0: number;
  blades: number; splitters: boolean; sweep: number; thick: number;
  matHub: FwMaterial; matBlade: FwMaterial;
};

function buildWheel(b: MeshBuilder, o: WheelSpec) {
  const S = 20; // steps along a blade
  const U = 8; // steps across it
  const rHub = (s: number) => o.hub0 + (0.8 * o.tip - o.hub0) * Math.pow(s, 1.7);
  const rTip = (s: number) => o.tip0 + (o.tip - o.tip0) * Math.pow(s, 1.15);
  const xAt = (s: number) => o.xFront + (o.xBack - o.xFront) * s;
  const toBack = Math.sign(o.xBack - o.xFront);

  // the hub, in sixteen steps
  for (let i = 0; i < S; i++) {
    const s0 = i / S;
    const s1 = (i + 1) / S;

    b.revolve({ x0: xAt(s0), r0: rHub(s0), x1: xAt(s1), r1: rHub(s1), n: [0, 1], m: o.matHub, steps: 48 });
  }

  // fine rings turned into the hub
  for (const s of [0.2, 0.45, 0.7]) {
    const sB = s + 0.035;

    b.revolve({ x0: xAt(s), r0: rHub(s), x1: xAt(s), r1: rHub(s) + 0.9, n: [-toBack, 0], m: o.matHub, steps: 48 });
    b.revolve({ x0: xAt(s), r0: rHub(s) + 0.9, x1: xAt(sB), r1: rHub(sB) + 0.9, n: [0, 1], m: o.matHub, steps: 48 });
    b.revolve({ x0: xAt(sB), r0: rHub(sB) + 0.9, x1: xAt(sB), r1: rHub(sB), n: [toBack, 0], m: o.matHub, steps: 48 });
  }

  // the nose: a rounded cap, with the blades' roots running into it
  b.revolve({ x0: o.xFront, r0: 0, x1: o.xFront, r1: o.hub0, n: [-toBack, 0], m: o.matHub, steps: 48 });
  b.revolve({ x0: o.xFront - toBack * 4, r0: 0, x1: o.xFront, r1: o.hub0, n: [-0.55 * toBack, 0.84], m: MAT_STEEL_BRIGHT, steps: 48 });

  // the back: a disc as wide as the blades, with a rim and three rings cut in its face
  const rBack = 0.97 * o.tip;

  b.revolve({ x0: o.xBack, r0: 0, x1: o.xBack, r1: rBack, n: [toBack, 0], m: o.matHub, steps: 64 });
  b.revolve({ x0: o.xBack, r0: rBack, x1: o.xBack - toBack * 3, r1: rBack, n: [0, 1], m: o.matHub, steps: 64 });
  b.revolve({ x0: o.xBack - toBack * 3, r0: rHub(1), x1: o.xBack - toBack * 3, r1: rBack, n: [-toBack, 0], m: o.matHub, steps: 64 });

  for (const f of [0.35, 0.55, 0.75]) {
    b.revolve({ x0: o.xBack + toBack * 0.15, r0: rBack * f, x1: o.xBack + toBack * 0.15, r1: rBack * f + 1.2, n: [toBack, 0], m: MAT_CT_EDGE, steps: 64 });
  }

  // three small balancing notches on the rim of the back
  for (const th of [0.4, 2.5, 4.6]) {
    b.prismDir([o.xBack - toBack * 1.5, rBack * Math.cos(th), rBack * Math.sin(th)], [toBack, 0, 0], [0, Math.cos(th), Math.sin(th)], [0, -Math.sin(th), Math.cos(th)], 1.6, 1.2, 8, 0, MAT_CT_HOLE, MAT_CT_HOLE);
  }

  // a blade: thick at its root and thin at its tip, thinning toward both edges, curved more at the tip than at the root,
  // with a polished tip and a fillet where it meets the hub
  const halfT = (s: number, u: number) => (o.thick / 2) * (1.35 - 0.75 * u) * Math.min(1, 0.45 + 2.2 * s) * (1 - 0.35 * s);

  const blade = (theta0: number, sStart: number) => {
    const rAt = (s: number, u: number) => rHub(s) + (rTip(s) - rHub(s)) * u;
    const pt = (s: number, u: number, side: number): FwVec3 => {
      const r = rAt(s, u);
      const th = theta0 + o.sweep * s * (0.8 + 0.2 * u) + (side * halfT(s, u)) / Math.max(r, 1);

      return [xAt(s), r * Math.cos(th), r * Math.sin(th)];
    };
    const root = (s: number, side: number): FwVec3 => {
      const r = rHub(s);
      const th = theta0 + o.sweep * s * 0.8 + (side * halfT(s, 0) * 2.1) / Math.max(r, 1);

      return [xAt(s), r * Math.cos(th), r * Math.sin(th)];
    };

    // its two faces, smooth: each point's normal from the surface round it, so that the light runs along the curve of
    // the blade as on a machined wheel, not in flat strips
    const nrm = (s: number, u: number, side: number): FwVec3 => {
      const e = 1e-3;
      const ds = vsub(pt(Math.min(1, s + e), u, side), pt(Math.max(0, s - e), u, side));
      const du = vsub(pt(s, Math.min(1, u + e), side), pt(s, Math.max(0, u - e), side));
      let n = vnorm(vcross(ds, du));
      const p = pt(s, u, side);
      const q = pt(s, u, -side);

      if (n[0] * (p[0] - q[0]) + n[1] * (p[1] - q[1]) + n[2] * (p[2] - q[2]) < 0) n = vscale(n, -1);

      return n;
    };

    for (let i = 0; i < S; i++) {
      const sA = sStart + (1 - sStart) * (i / S);
      const sB = sStart + (1 - sStart) * ((i + 1) / S);
      const thMid = theta0 + (o.sweep * (sA + sB)) / 2;

      for (let j = 0; j < U; j++) {
        const uA = j / U;
        const uB = (j + 1) / U;

        for (const side of [-1, 1]) {
          const v: Array<[number, number]> = [[sA, uA], [sB, uA], [sB, uB], [sA, uB]];
          const P = v.map(([s, u]) => pt(s, u, side));
          const N = v.map(([s, u]) => nrm(s, u, side));
          // a little darker at the root, where the blades crowd together; bright out at the tip
          const O = v.map(([, u]) => 0.72 + 0.28 * u);
          const order = side > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];

          for (const k of order) b.push(P[k], N[k], o.matBlade, O[k]);
        }
      }

      // the polished tip
      b.flatQuad(pt(sA, 1, -1), pt(sB, 1, -1), pt(sB, 1, 1), pt(sA, 1, 1), [0, Math.cos(thMid), Math.sin(thMid)], MAT_WHEEL_EDGE);

      // the fillet, either side
      for (const side of [-1, 1]) {
        b.flatQuad(root(sA, side), root(sB, side), pt(sB, 0.09, side), pt(sA, 0.09, side), [0, Math.cos(thMid), Math.sin(thMid)], o.matHub);
      }
    }

    // the leading edge and the trailing edge
    b.flatQuad(pt(sStart, 0, -1), pt(sStart, 0, 1), pt(sStart, 1, 1), pt(sStart, 1, -1), [-toBack, 0, 0], MAT_WHEEL_EDGE);
    b.flatQuad(pt(1, 0, -1), pt(1, 0, 1), pt(1, 1, 1), pt(1, 1, -1), [toBack, 0, 0], MAT_WHEEL_EDGE);
  };

  for (let k = 0; k < o.blades; k++) {
    blade((k / o.blades) * TAU, 0);

    if (o.splitters) blade(((k + 0.5) / o.blades) * TAU, 0.42);
  }
}

export function buildCompressorWheel(b: MeshBuilder) {
  buildWheel(b, {
    xFront: TB.half + 17, xBack: TB.half - 14, tip: TB.compressorTip, hub0: 8, tip0: 27,
    blades: 9, splitters: true, sweep: -0.95, thick: 2.1,
    matHub: MAT_WHEEL_ALU, matBlade: MAT_WHEEL_ALU,
  });

  // the nut on its nose
  b.prismDir([TB.half + 17, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 5, 4, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
}

export function buildTurbineWheel(b: MeshBuilder) {
  buildWheel(b, {
    xFront: -TB.half - 15, xBack: -TB.half + 14, tip: TB.turbineTip, hub0: 9, tip0: 20,
    blades: 12, splitters: false, sweep: 0.75, thick: 2.6,
    matHub: MAT_WHEEL_HOT_HUB, matBlade: MAT_WHEEL_HOT,
  });
}
