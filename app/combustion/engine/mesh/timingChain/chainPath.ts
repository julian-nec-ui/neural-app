// The timing drive's two chains: their paths round their sprockets, the sprockets' phases, and the timing mark's angle.

import { PRIMARY_DX, ROD_LIFT, TAU, driveShift } from "../../core/constants";
import type { Bank } from "../../core/constants";
import { VT } from "../valvetrain";

/* ---------------- chain path ---------------- */

type ChainCircle = { y: number; z: number; r: number };

export type ChainSeg =
  | { kind: "line"; length: number; from: [number, number]; dir: [number, number] }
  | { kind: "poly"; length: number; pts: Array<[number, number]>; cum: number[] }
  | {
      kind: "arc";
      length: number;
      center: [number, number];
      r: number;
      a0: number;
      sweep: number;
    };

type ChainPath = {
  total: number;
  circles: ChainCircle[];
  segs: ChainSeg[];
  at: (
    s: number,
    out?: { y: number; z: number; circle: number }
  ) => { y: number; z: number; circle: number };
};

// A chain round any number of sprockets, traversed counter-clockwise in the (y, z) plane. The runs flagged in
// `tensioned` (the run after circle i) are pushed in by `depth` by a tensioner, the others are straight
function buildChainPath(circles: ChainCircle[], tensioned: boolean[], depth: number): ChainPath {
  const n = circles.length;
  const tangents: Array<{ p0: [number, number]; p1: [number, number] }> = [];

  for (let i = 0; i < n; i++) {
    const a = circles[i];
    const b = circles[(i + 1) % n];
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const len = Math.hypot(dy, dz);
    const uy = dy / len;
    const uz = dz / len;
    const ry = uz; // normal on the right of the direction of travel
    const rz = -uy;
    const s = (a.r - b.r) / len;
    const c = Math.sqrt(Math.max(0, 1 - s * s));
    const ny = s * uy + c * ry;
    const nz = s * uz + c * rz;

    tangents.push({
      p0: [a.y + a.r * ny, a.z + a.r * nz],
      p1: [b.y + b.r * ny, b.z + b.r * nz],
    });
  }

  const segs: ChainSeg[] = [];
  const angle = (c: ChainCircle, p: [number, number]) =>
    Math.atan2(p[1] - c.z, p[0] - c.y);

  for (let i = 0; i < n; i++) {
    // Arc on circle i: from the tangent coming in to the one going out
    const c = circles[i];
    const inT = tangents[(i - 1 + n) % n].p1;
    const outT = tangents[i].p0;
    const a0 = angle(c, inT);
    let sweep = angle(c, outT) - a0;
    sweep = ((sweep % TAU) + TAU) % TAU;

    segs.push({
      kind: "arc",
      length: sweep * c.r,
      center: [c.y, c.z],
      r: c.r,
      a0,
      sweep,
    });

    // Run to the next circle
    const t = tangents[i];
    const dy = t.p1[0] - t.p0[0];
    const dz = t.p1[1] - t.p0[1];
    const length = Math.hypot(dy, dz);

    if (tensioned[i]) {
      // The two long runs, each with a hydraulic tensioner pressing on it:
      // pushed inward in the middle, with zero slope at both ends so they
      // leave the sprockets tangentially
      const uy = dy / length;
      const uz = dz / length;
      const ny = uz; // outward normal, on the right of the direction of travel
      const nz = -uy;
      const m = 80;
      const pts: Array<[number, number]> = [];
      const cum: number[] = [0];

      for (let k = 0; k <= m; k++) {
        const u = k / m;
        const d = depth * Math.pow(Math.sin(Math.PI * u), 2);

        pts.push([t.p0[0] + dy * u - ny * d, t.p0[1] + dz * u - nz * d]);

        if (k > 0) {
          cum.push(
            cum[k - 1] +
              Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])
          );
        }
      }

      segs.push({ kind: "poly", length: cum[m], pts, cum });
    } else {
      segs.push({
        kind: "line",
        length,
        from: t.p0,
        dir: [dy / length, dz / length],
      });
    }
  }

  const total = segs.reduce((sum, seg) => sum + seg.length, 0);

  // Fills `out` (or a new object): called for every link, every frame
  const at = (
    sIn: number,
    out: { y: number; z: number; circle: number } = { y: 0, z: 0, circle: -1 }
  ) => {
    let s = ((sIn % total) + total) % total;

    for (let k = 0; k < segs.length; k++) {
      const seg = segs[k];

      if (s <= seg.length || k === segs.length - 1) {
        out.circle = -1;

        if (seg.kind === "poly") {
          let j = 1;

          while (j < seg.cum.length - 1 && seg.cum[j] < s) j++;

          const f = (s - seg.cum[j - 1]) / (seg.cum[j] - seg.cum[j - 1] || 1);

          out.y = seg.pts[j - 1][0] + (seg.pts[j][0] - seg.pts[j - 1][0]) * f;
          out.z = seg.pts[j - 1][1] + (seg.pts[j][1] - seg.pts[j - 1][1]) * f;

          return out;
        }

        if (seg.kind === "line") {
          out.y = seg.from[0] + seg.dir[0] * s;
          out.z = seg.from[1] + seg.dir[1] * s;

          return out;
        }

        const a = seg.a0 + s / seg.r;

        out.y = seg.center[0] + seg.r * Math.cos(a);
        out.z = seg.center[1] + seg.r * Math.sin(a);
        out.circle = Math.floor(k / 2);

        return out;
      }

      s -= seg.length;
    }

    out.y = 0;
    out.z = 0;
    out.circle = -1;

    return out;
  };

  return { total, circles, segs, at };
}

/* ---------------- the two chains ---------------- */

// The drive is in two stages, so that the camshafts' sprockets can be small enough to sit inside the head's outline.
// The primary chain runs from the crankshaft's sprocket to a large sprocket on an intermediate shaft, which it turns at
// half the crank's speed; on the same shaft a small sprocket drives the secondary chain, up to the two camshafts'
// sprockets, as small as it is, so that they turn at its speed: half the crank's. The intermediate shaft stands on the
// bank's centre line, between the crank and the cams. Both chains have the same pitch; each has a whole, even number
// of links (inner and outer plates alternate), made exact by how far its tensioner pushes it in.

export const VT_RC = 27.7; // the crankshaft's sprocket's pitch radius
const CRANK_TEETH = 19;
export const VT_PITCH = (TAU * VT_RC) / CRANK_TEETH;
export const CAM_TEETH = 18; // the camshafts' sprockets, and the small one on the intermediate shaft
export const CAM_RC = (CAM_TEETH * VT_PITCH) / TAU;
export const IDLER_TEETH = 2 * CRANK_TEETH; // the large sprocket on the intermediate shaft
// A bank's primary chain plane from its secondary's: behind it, toward the engine, for the bank whose drive stands at its
// cylinders' own place; in front of it for the other, whose drive is moved back to the same place, so that the two primary
// chains run side by side on the crank's nose, clear of each other
export const primaryDx = (bank: Bank) => (driveShift(bank) > 0 ? -PRIMARY_DX : PRIMARY_DX);
export const CHAIN_TEETH = { crank: CRANK_TEETH, cam: CAM_TEETH, idler: IDLER_TEETH };

export type Chain = { path: ChainPath; links: number; phases: number[]; speed: number[] };

// A chain round these circles, with these teeth, made a whole even number of links long; `speed` is each sprocket's
// turn for one turn of the crank
function makeChain(circles: ChainCircle[], tensioned: boolean[], teeth: number[], speed: number[]): Chain {
  const lengthAt = (d: number) => buildChainPath(circles, tensioned, d).total;
  // the first even number of links the chain can be with its tensioners pushing in a little; the push is then found
  // that makes it exactly that long
  const links = 2 * Math.ceil(lengthAt(3) / VT_PITCH / 2);
  let lo = 0;
  let hi = 40;

  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;

    if (lengthAt(mid) < links * VT_PITCH) lo = mid;
    else hi = mid;
  }

  const path = buildChainPath(circles, tensioned, (lo + hi) / 2);

  // At crankAngle 0, turn each sprocket so that a tooth gap sits on a roller
  const phases = circles.map((circle, c) => {
    const delta = TAU / teeth[c];

    for (let i = 0; i < links; i++) {
      const pos = path.at(i * VT_PITCH);

      if (pos.circle !== c) continue;

      const theta = Math.atan2(pos.z - circle.z, pos.y - circle.y);

      return (((-theta) % delta) + delta) % delta;
    }

    return 0;
  });

  return { path, links, phases, speed };
}

// The intermediate shaft, on the bank's centre line, in the bank's frame: about 180 above the crank, placed exactly so that
// the primary chain, with its two tensioners pushing in moderately, is a whole even number of links long
const primaryCircles = (y: number): ChainCircle[] => [{ y: 0, z: 0, r: VT_RC }, { y, z: 0, r: VT_RC * 2 }];
const PRIMARY_PUSH = 12;
const IDLER_NEAR = -180 - ROD_LIFT / 2; // about halfway up, with the head raised for the longer rods

export const IDLER_Y = (() => {
  const lengthAt = (y: number) => buildChainPath(primaryCircles(y), [true, true], PRIMARY_PUSH).total;
  const links = 2 * Math.round(lengthAt(IDLER_NEAR) / VT_PITCH / 2);
  let lo = IDLER_NEAR - 50; // longer
  let hi = IDLER_NEAR + 50; // shorter

  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;

    if (lengthAt(mid) > links * VT_PITCH) lo = mid;
    else hi = mid;
  }

  return (lo + hi) / 2;
})();

export const PRIMARY = makeChain(
  primaryCircles(IDLER_Y),
  [true, true], // a tensioner on each of its two runs, the two sides alike
  [CRANK_TEETH, IDLER_TEETH],
  [1, 0.5]
);

export const SECONDARY = makeChain(
  [{ y: IDLER_Y, z: 0, r: CAM_RC }, { y: VT.yCam, z: VT.zCam, r: CAM_RC }, { y: VT.yCam, z: -VT.zCam, r: CAM_RC }],
  [true, false, true],
  [CAM_TEETH, CAM_TEETH, CAM_TEETH],
  [0.5, 0.5, 0.5]
);

// The timing mark, as one angle on the crankshaft: the stripe along the front
// journal, the painted tooth of the crank sprocket (tooth 0, which turns with
// the phase above) and the painted tooth of the flywheel all lie on it
export const MARK_ANGLE = 0.5 * (TAU / CRANK_TEETH) - PRIMARY.phases[0];
