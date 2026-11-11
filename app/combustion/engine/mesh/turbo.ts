// The turbocharger: its layout, housings and wheels.

import { CT_X, ROD_LIFT, TAU } from "../core/constants";
import type { FwMaterial, FwVec3 } from "./builder";
import { MAT_ALU_TURNED, MAT_CT_EDGE, MAT_CT_HOLE, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_IRON, MAT_PIPE_BLACK, MAT_TURBO_GRAIN, MAT_STEEL_BRIGHT, MAT_WHEEL_ALU, MAT_WHEEL_HOT } from "./materials";
import { curveFromPoints, pipeFlange, roundedCurve, sweepTube } from "./tubes";
import type { MeshBuilder } from "./tubes";

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
export const TURBO = {
  x: HDR_CX - 58, // the turbine's wheel stands under the collector's axis
  y: HDR_MOUTH_Y - 6 + COLLECTOR_LEN + 50, // the inlet pipe's top is the collector's end
  z: HDR_CZ - 64, // (the turbine's spiral starts this far out: its tip, 36, and 2 and 26)
};

export const turboWorld = (p: FwVec3): FwVec3 => [TURBO.x - p[0], TURBO.y - p[2], TURBO.z - p[1]];

export const TURBO_ORIENT = [-1, 0, 0, 0, 0, -1, 0, -1, 0];

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
export const turbineSection = (u: number) => 26 - 18 * u;
const turbineCentre = (u: number) => TB.turbineTip + 2 + turbineSection(u);

// Compressor: the air comes in along the shaft (from +x), is thrown outward
// by the wheel into the spiral, and leaves along local -z (toward the intercooler)
export const compressorSection = (u: number) => 8 + 22 * u;
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
  rev(-72, 40, -44, 40, [0, 1], MAT_TURBO_GRAIN);
  rev(-72, 40, -100, 24, [-0.5, 0.85], MAT_TURBO_GRAIN);
  rev(-100, 24, -130, 24, [0, 1], MAT_TURBO_GRAIN);

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
  rev(112, 26, 96, 26, [0, 1], MAT_ALU_TURNED);
  rev(96, 26, 72, 44, [0.6, 0.8], MAT_TURBO_GRAIN);
  rev(72, 44, 44, 44, [0, 1], MAT_TURBO_GRAIN);
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
  rev(-130, 24, -130, 32, [-1, 0], MAT_CT_EDGE);
  rev(-130, 32, -135, 32, [0, 1], MAT_STEEL_BRIGHT);
  rev(-135, 24, -135, 32, [-1, 0], MAT_CT_EDGE);
  rev(-135, 18, -135, 24, [-1, 0], MAT_CT_HOLE);
  rev(-44, 0, -44, 52, [1, 0], MAT_TURBO_GRAIN);
  rev(-44, 52, -38, 52, [0, 1], MAT_TURBO_GRAIN);

  rev(44, 0, 44, 56, [-1, 0], MAT_TURBO_GRAIN);
  rev(44, 56, 38, 56, [0, 1], MAT_TURBO_GRAIN);

  // the centre housing
  rev(-38, 24, 38, 24, [0, 1], MAT_IRON);

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
  const S = 16; // steps along a blade
  const U = 7; // steps across it
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

    for (let i = 0; i < S; i++) {
      const sA = sStart + (1 - sStart) * (i / S);
      const sB = sStart + (1 - sStart) * ((i + 1) / S);
      const thMid = theta0 + (o.sweep * (sA + sB)) / 2;

      for (let j = 0; j < U; j++) {
        const uA = j / U;
        const uB = (j + 1) / U;

        for (const side of [-1, 1]) {
          b.flatQuad(
            pt(sA, uA, side), pt(sB, uA, side), pt(sB, uB, side), pt(sA, uB, side),
            [0, -Math.sin(thMid) * side, Math.cos(thMid) * side], o.matBlade
          );
        }
      }

      // the polished tip
      b.flatQuad(pt(sA, 1, -1), pt(sB, 1, -1), pt(sB, 1, 1), pt(sA, 1, 1), [0, Math.cos(thMid), Math.sin(thMid)], MAT_STEEL_BRIGHT);

      // the fillet, either side
      for (const side of [-1, 1]) {
        b.flatQuad(root(sA, side), root(sB, side), pt(sB, 0.09, side), pt(sA, 0.09, side), [0, Math.cos(thMid), Math.sin(thMid)], o.matHub);
      }
    }

    // the leading edge and the trailing edge
    b.flatQuad(pt(sStart, 0, -1), pt(sStart, 0, 1), pt(sStart, 1, 1), pt(sStart, 1, -1), [-toBack, 0, 0], o.matBlade);
    b.flatQuad(pt(1, 0, -1), pt(1, 0, 1), pt(1, 1, 1), pt(1, 1, -1), [toBack, 0, 0], o.matBlade);
  };

  for (let k = 0; k < o.blades; k++) {
    blade((k / o.blades) * TAU, 0);

    if (o.splitters) blade(((k + 0.5) / o.blades) * TAU, 0.42);
  }
}

export function buildCompressorWheel(b: MeshBuilder) {
  buildWheel(b, {
    xFront: TB.half + 17, xBack: TB.half - 14, tip: TB.compressorTip, hub0: 8, tip0: 27,
    blades: 9, splitters: true, sweep: -0.95, thick: 1.5,
    matHub: MAT_WHEEL_ALU, matBlade: MAT_WHEEL_ALU,
  });

  // the nut on its nose
  b.prismDir([TB.half + 17, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 5, 4, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
}

export function buildTurbineWheel(b: MeshBuilder) {
  buildWheel(b, {
    xFront: -TB.half - 15, xBack: -TB.half + 14, tip: TB.turbineTip, hub0: 9, tip0: 20,
    blades: 13, splitters: false, sweep: 0.75, thick: 2.0,
    matHub: MAT_WHEEL_HOT, matBlade: MAT_WHEEL_HOT,
  });
}
