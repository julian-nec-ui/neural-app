// The dry-sump oil system: no oil pan under the crank. On each side of the crankcase, low, below the crank's axis, a
// long multi-stage pump: a pressure stage at the front and four scavenge stages behind it, each stage a ribbed block
// between plates, held together by long through-bolts, driven from the crank by a gear train in a cover at the front.
// Each scavenge stage draws oil from under the crank by its own pickup; the pump returns it to a finned oil tank, a long box,
// that lies along the side of the engine, level with the crank and below; the pressure stage draws from the tank's foot and
// feeds the main gallery at the front main bearing. All of it dark aluminium, with dark metal lines and hex fittings.
//
// Built in the engine's own frame: x along the engine, y down, z across (bank A at -z).

import { TAU } from "../core/constants";
import { BLOCK } from "./block";
import { vcross, vnorm } from "../math/vec3";
import type { FwVec3 } from "./builder";
import { MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_EXH_GUNMETAL, MAT_STEEL_BRIGHT, MAT_SUMP_ALU, MAT_SUMP_CAST, MAT_SUMP_FIN } from "./materials";
import { curveAt, curveFromPoints, flangeBolt, roundedCurve, sweepTube } from "./tubes";
import type { Curve, MeshBuilder } from "./tubes";


// The pump: along the engine, on each side, under the crankcase's edge
export const SUMP_PUMP = { x0: -380, x1: 236, y: 150, z: 128, h: 28 };
const STAGE_X = [-380, -296, -176, -56, 64, 184, 236]; // the stages' ends: the pressure stage, four scavenge stages, the end cap
const PIPE_R = 7;

// The system is built in two passes: its shell (the tank's body and fins, the pump's blocks and ribs, the lines), drawn
// see-through so that the oil can be seen moving in it, and its solid hardware (plates, bolts, fittings, covers, caps)
let pass: "shell" | "solid" = "solid";
const shell = (f: () => void) => { if (pass === "shell") f(); };
const solid = (f: () => void) => { if (pass === "solid") f(); };

// A pipe of dark metal, with a hex fitting at each end
function line(b: MeshBuilder, pts: FwVec3[], bend = 28, r = PIPE_R) {
  const c = roundedCurve(pts, bend, 3);

  shell(() => sweepTube(b, c, () => r, MAT_EXH_GUNMETAL, { segments: 20 }));
  solid(() => { fitting(b, c, 0, r); fitting(b, c, c.total, r); });

  return c;
}

function fitting(b: MeshBuilder, c: Curve, s: number, r: number) {
  const at: FwVec3 = [0, 0, 0];
  const d: FwVec3 = [0, 0, 0];

  curveAt(c, Math.min(c.total, Math.max(0, s)), at, d);

  const dir: FwVec3 = s > 0 ? [-d[0], -d[1], -d[2]] : d; // pointing along the pipe, away from its end
  const e1 = vnorm(vcross(dir, Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  const e2 = vcross(dir, e1);

  b.prismDir(at, dir, e1, e2, r + 4.2, 8, 6, 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
  b.prismDir([at[0] + dir[0] * 8, at[1] + dir[1] * 8, at[2] + dir[2] * 8], dir, e1, e2, r + 2.4, 5, 20, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
}

function buildPump(b: MeshBuilder, s: number) {
  const { y, z: zp, h } = SUMP_PUMP;
  const z = s * zp;

  if (pass === "shell") for (let i = 0; i < STAGE_X.length - 1; i++) {
    const xa = STAGE_X[i] + 4;
    const xb = STAGE_X[i + 1] - 4;

    // the stage's block, ribbed along its length on its top, bottom and outer face
    b.box(xa, xb, y - h, y + h, z - h, z + h, MAT_SUMP_ALU);

    for (let k = -2; k <= 2; k++) {
      b.box(xa + 4, xb - 4, y - h - 3, y - h, z + k * 10 - 1.6, z + k * 10 + 1.6, MAT_SUMP_FIN);
      b.box(xa + 4, xb - 4, y + h, y + h + 3, z + k * 10 - 1.6, z + k * 10 + 1.6, MAT_SUMP_FIN);
      b.box(xa + 4, xb - 4, y + k * 10 - 1.6, y + k * 10 + 1.6, s > 0 ? z + h : z - h - 3, s > 0 ? z + h + 3 : z - h, MAT_SUMP_FIN);
    }
  }

  if (pass === "shell") return;

  // the plates between the stages, and the end plates
  for (const x of STAGE_X) b.box(x - 4, x + 4, y - h - 6, y + h + 6, z - h - 6, z + h + 6, MAT_SUMP_CAST);

  // four through-bolts along its length, at its corners, their nuts on the end plates
  for (const [dy, dz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const py = y + dy * (h + 1);
    const pz = z + dz * (h + 1);

    sweepTube(b, curveFromPoints([[STAGE_X[0] - 4, py, pz], [STAGE_X[STAGE_X.length - 1] + 4, py, pz]], 20), () => 2.4, MAT_STEEL_BRIGHT, { segments: 10 });
    flangeBolt(b, [STAGE_X[0] - 4, py, pz], [-1, 0, 0], 4, 0.2);
    flangeBolt(b, [STAGE_X[STAGE_X.length - 1] + 4, py, pz], [1, 0, 0], 4, 0.2);
  }

}

// The gear cover at the front, over the crank's nose: the gear train from the crank to the two pumps, in one cast cover
// (the front one: behind both banks' chains, so that they show in front of it; and at the back, the same kind of plate,
// the engine's rear mount, over the crank and out to two mounting ears, each with its bolt, against the block's rear face)
const FRONT_COVER: Array<[number, number, number]> = [[0, 0, 42], [SUMP_PUMP.y, -SUMP_PUMP.z, 40], [SUMP_PUMP.y, SUMP_PUMP.z, 40]];
const REAR_MOUNT: Array<[number, number, number]> = [[0, 0, 60], [54, -168, 30], [54, 168, 30], [110, 0, 40]];

function buildGearCover(b: MeshBuilder, x0 = -386, x1 = -374, circles = FRONT_COVER) {
  const pts: Array<[number, number]> = [];

  for (const [cy, cz, r] of circles) {
    for (let k = 0; k < 48; k++) {
      const a = (k / 48) * TAU;

      pts.push([cy + r * Math.cos(a), cz + r * Math.sin(a)]);
    }
  }

  // the outline: the convex hull of the three gears' circles
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);

  const cross = (o: [number, number], a: [number, number], c: [number, number]) => (a[0] - o[0]) * (c[1] - o[1]) - (a[1] - o[1]) * (c[0] - o[0]);
  const lower: Array<[number, number]> = [];
  const upper: Array<[number, number]> = [];

  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }

  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];

    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }

  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  const n = hull.length;
  const cy = (circles[0][0] + circles[1][0] + circles[2][0]) / 3;
  // the crank comes through it: the face is a ring round the crank's nose and the rest of the outline
  const P = (q: [number, number], x: number): FwVec3 => [x, q[0], q[1]];

  for (let k = 0; k < n; k++) {
    const a = hull[k];
    const c = hull[(k + 1) % n];

    b.flatQuad(P(a, x0), P(c, x0), P(c, x1), P(a, x1), [0, (a[0] + c[0]) / 2 - cy, (a[1] + c[1]) / 2], MAT_SUMP_CAST);
  }

  b.flatFan([x0, cy + 20, 0], hull.map((q) => P(q, x0)), [-1, 0, 0], MAT_SUMP_CAST);
  b.flatFan([x1, cy + 20, 0], hull.map((q) => P(q, x1)), [1, 0, 0], MAT_SUMP_CAST);

  // bolts round its outer face
  for (let k = 0; k < n; k += Math.max(1, Math.floor(n / 14))) {
    const q = hull[k];
    const d = Math.hypot(q[0] - cy, q[1]) || 1;

    const xf = x0 < 0 ? x0 : x1; // on its outer face: the front one's front, the rear one's back

    flangeBolt(b, [xf, q[0] - ((q[0] - cy) / d) * 9, q[1] - (q[1] / d) * 9], [Math.sign(xf), 0, 0], 3.4, 0.2 * k);
  }
}

// The ways the oil goes, for its flow: each a curve and how wide the flow is (wide: a spread across a tank's body)
export const OIL_PATHS: Array<{ curve: Curve; r: number; wide: number }> = [];

// The oil cooler: one, under the engine on its middle plane, standing upright between the two exhaust pipes, long along
// the engine and thin across it, so that from the front only its narrow edge shows; from the side, its whole face. A core
// of flat tubes and deep fins between a header tank at each end; inside it the oil's way divides into two tubes, which
// run its length and come together again at its other end
export const OIL_COOLER = { x0: -296, x1: 256, y0: 112, y1: 234, hz: 15, fin: 24 }; // the core: its ends, top and bottom, half its thickness; the fins' half-width
const COOLER_IN: FwVec3 = [OIL_COOLER.x1 + 26, 134, 0]; // where the oil comes in, at the rear header's top
const COOLER_OUT: FwVec3 = [OIL_COOLER.x0 - 26, 212, 0]; // and leaves, at the front header's foot
const COOLER_TUBES = [146, 200]; // the two tubes' heights inside it

function buildCooler(b: MeshBuilder) {
  const { x0, x1, y0, y1, hz, fin } = OIL_COOLER;

  if (pass === "shell") {
    // the core's flat tubes, one above another, and between them the fins: deep plates across it, wider than it
    for (let y = y0 + 6; y < y1 - 4; y += 15) b.box(x0, x1, y, y + 4, -hz, hz, MAT_SUMP_ALU);
    for (let x = x0 + 4; x < x1 - 3; x += 8) b.box(x, x + 1.8, y0, y1, -fin, fin, MAT_SUMP_FIN);

    // the oil's two tubes inside it, from the rear header to the front one
    for (const ty of COOLER_TUBES) sweepTube(b, curveFromPoints([[x1 + 10, ty, 0], [x0 - 10, ty, 0]], 20), () => 9, MAT_EXH_GUNMETAL, { segments: 20 });

    return;
  }

  // the header tanks at each end, the side plates along its top and bottom
  for (const [xa, xb] of [[x0 - 34, x0], [x1, x1 + 34]]) {
    b.box(xa, xb, y0 - 10, y1 + 10, -fin - 2, fin + 2, MAT_SUMP_CAST);

    for (const yb of [y0 + 10, (y0 + y1) / 2, y1 - 10]) {
      for (const sz of [-1, 1]) flangeBolt(b, [(xa + xb) / 2, yb, sz * (fin + 2)], [0, 0, sz], 3.4, 0.2);
    }
  }

  for (const [ya, yb] of [[y0 - 10, y0], [y1, y1 + 10]]) b.box(x0, x1, ya, yb, -fin - 1, fin + 1, MAT_SUMP_CAST);

  // two brackets that hang it from the pumps
  for (const xb of [STAGE_X[3], STAGE_X[5]]) { // at the pumps' plates, clear of the pickups
    b.box(xb - 9, xb + 9, y0 - 18, y0 - 10, -SUMP_PUMP.z, SUMP_PUMP.z, MAT_SUMP_CAST);
  }
}

export function buildDrySump(b: MeshBuilder, which: "shell" | "solid") {
  pass = which;
  solid(() => buildGearCover(b, BLOCK.x0 - 12, BLOCK.x0)); // on the block's front face
  solid(() => buildGearCover(b, BLOCK.x1, BLOCK.x1 + 14, REAR_MOUNT));
  solid(() => { for (const sz of [-1, 1]) flangeBolt(b, [BLOCK.x1 + 14, 54, sz * 168], [1, 0, 0], 7, 0.3); }); // the mounts' big bolts
  buildCooler(b);

  const paths: Array<{ pts: FwVec3[]; r: number }> = [];
  const { y, z: zp, h } = SUMP_PUMP;
  const back = STAGE_X[STAGE_X.length - 1];
  const merge: FwVec3 = [COOLER_IN[0] + 30, COOLER_IN[1], 0]; // where the two pumps' oil comes together, behind the cooler
  const split: FwVec3 = [COOLER_OUT[0] - 30, COOLER_OUT[1], 0]; // and where it divides again, in front of it

  for (const s of [-1, 1]) {
    buildPump(b, s);

    const pz = s * zp;

    // each scavenge stage's pickup, under the crank, and its line down to the stage
    for (let i = 1; i <= 4; i++) {
      const xc = (STAGE_X[i] + STAGE_X[i + 1]) / 2;
      const pick: FwVec3 = [xc, 106, s * 46];

      solid(() => b.prismDir([xc, 100, s * 46], [0, 1, 0], [1, 0, 0], [0, 0, 1], 15, 6, 24, 0, MAT_SUMP_CAST, MAT_SUMP_ALU)); // the pickup's bell
      const pc = line(b, [pick, [xc, 112, s * 90], [xc, y - h - 6, pz]], 18, 6);

      paths.push({ pts: [...pc.pts, [xc, y, pz], [back, y, pz]], r: 6 }); // up the pickup, and back along the pump
    }

    // the scavenged oil: out of the pump's end cap, and round under it to where the two pumps' oil comes together
    const ret = line(b, [[back + 6, y, pz], [merge[0], y, pz], [merge[0], merge[1], s * 40], merge], 30, 8);
    // the cooled oil, from where it divides in front of the cooler, under the pump, up its outer side into the pressure stage
    const feed = line(b, [split, [split[0], split[1] - 30, s * 60], [-338, y + h + 20, s * 60], [-338, y + h + 20, pz + s * (h + 14)], [-338, y, pz + s * (h + 6)]], 26, 8);
    // and the pressure stage feeds the main gallery at the front main bearing
    const gallery = line(b, [[-338, y - h - 6, pz], [-338, 96, s * 80], [-360, 42, s * 30]], 24, 7);

    paths.push({ pts: ret.pts, r: 8 });
    paths.push({ pts: [...feed.pts, [-338, y, pz], ...gallery.pts], r: 8 });
  }

  // one pipe into the cooler, and one out of it
  const inLine = line(b, [merge, COOLER_IN], 20, 10);
  const outLine = line(b, [COOLER_OUT, split], 20, 10);

  // through the cooler: from its inlet down into each tube, along it, and out of it to the outlet
  for (const ty of COOLER_TUBES) {
    paths.push({ pts: [...inLine.pts, [OIL_COOLER.x1 + 10, ty, 0], [OIL_COOLER.x0 - 10, ty, 0], ...outLine.pts], r: 9 });
  }

  if (which === "solid") OIL_PATHS.splice(0, OIL_PATHS.length, ...paths.map((q) => ({ curve: curveFromPoints(q.pts, 4), r: q.r, wide: 0 })));
}
