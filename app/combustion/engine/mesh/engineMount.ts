// The engine's stand: three plates across the engine, at its front, under its middle and under the flywheel, each a
// short trapezoid (its broad base on the floor, its narrow top up under the engine, its sides short and sloping) cut away
// along its top to the shape of what stands over it, so that the engine sits down into all three; the middle one arched
// over the exhaust where the turbines' pipes run under the engine. Their faces both sides punched as the perforated plates
// on the heads' covers (pattern 18), a plain border round them, their edges machined. Along the bottom, at the two corners
// of the bases, two bars on the floor tie the three together: welded on to the inner faces of the end plates (so that
// they do not show at the ends) and through the middle one, a bead round each joint; each bar ribbed along its length
// as the timing covers are. Built in the engine's frame (x along the crank, y down, the floor at y 380).

import type { FwVec3 } from "./builder";
import { MAT_COVER, MAT_COVER_FIN, MAT_MOUNT_EDGE, MAT_MOUNT_PERF, MAT_MOUNT_RIB, MAT_MOUNT_RIB_SIDE, MAT_WELD } from "./materials";
import { MOUNT_DZ, MOUNT_PLATES, MOUNT_Z0 } from "./engineMountProfile";
import type { MeshBuilder } from "./tubes";

const T = 7; // half a plate's thickness
const WALL_TOP = 326; // the middle wall's top, low, a little over the bars
const RIB_OFF = 3.6; // the two ribs along each plate's top edge: their middles either side of the plate's
const RIB_W = 2.6; // their width
const RIB_H = 2.2; // how far they stand out of the edge
const RIB_END = 14; // over how long they die away at the ends
const FLOOR = 380;
const BAR = 18; // half a bar's width (square)
const BAR_Z = 300; // the bars' middles, either side
const FIN_PITCH = 9;
const FIN_H = 4;
const FIN_T = 1.3;

type Col = { z: number; top: number; bot: number } | null;

const colsOf = (cols: number[]): Col[] => {
  const out: Col[] = [];

  for (let i = 0; i < cols.length; i += 2) {
    const top = cols[i];
    const bot = cols[i + 1];

    out.push(bot > top ? { z: MOUNT_Z0 + (i / 2) * MOUNT_DZ, top, bot } : null);
  }

  return out;
};

// One plate: its two faces, punched all over, its edges round the outline
function plate(b: MeshBuilder, x: number, cols: Col[]) {
  for (const [xf, s] of [[x - T, -1], [x + T, 1]] as Array<[number, number]>) {
    const N: FwVec3 = [s, 0, 0];
    const P = (z: number, y: number): FwVec3 => [xf, y, z];

    for (let i = 0; i + 1 < cols.length; i++) {
      const a = cols[i];
      const c = cols[i + 1];

      if (!a || !c) continue;

      b.flatQuad(P(a.z, a.top), P(c.z, c.top), P(c.z, c.bot), P(a.z, a.bot), N, MAT_MOUNT_PERF);
    }
  }

  // the edges: along the top and the bottom between columns, and square across where the plate starts or stops
  const Q = (xx: number, z: number, y: number): FwVec3 => [xx, y, z];

  for (let i = 0; i < cols.length; i++) {
    const a = cols[i];
    const c = cols[i + 1];

    if (a && c) {
      b.flatQuad(Q(x - T, a.z, a.top), Q(x - T, c.z, c.top), Q(x + T, c.z, c.top), Q(x + T, a.z, a.top), [0, -1, 0], MAT_MOUNT_EDGE);
      b.flatQuad(Q(x - T, a.z, a.bot), Q(x - T, c.z, c.bot), Q(x + T, c.z, c.bot), Q(x + T, a.z, a.bot), [0, 1, 0], MAT_MOUNT_EDGE, 0.7);
    }

    const prev = cols[i - 1];

    if (a && !prev) b.flatQuad(Q(x - T, a.z, a.top), Q(x - T, a.z, a.bot), Q(x + T, a.z, a.bot), Q(x + T, a.z, a.top), [0, 0, -1], MAT_MOUNT_EDGE);
    if (a && !c) b.flatQuad(Q(x - T, a.z, a.top), Q(x - T, a.z, a.bot), Q(x + T, a.z, a.bot), Q(x + T, a.z, a.top), [0, 0, 1], MAT_MOUNT_EDGE);
  }

  // along the narrow top edge, two parallel ribs, as on the plenum's red lid: of one constant section all the way, each
  // run from one end of the plate's top to the other, dying away smoothly at both ends; dark metallic grey
  let i = 0;

  while (i < cols.length) {
    if (!cols[i]) {
      i++;
      continue;
    }

    let j = i;

    while (j + 1 < cols.length && cols[j + 1]) j++;

    const run = cols.slice(i, j + 1) as Array<{ z: number; top: number; bot: number }>;

    for (const xr of [x - RIB_OFF, x + RIB_OFF]) edgeRib(b, xr, run);
    i = j + 1;
  }
}

// One rib along a run of the top edge, its middle at xr: its section RIB_W wide and RIB_H high, standing square out of the
// edge (along the edge's own normal), its height easing down to nothing over RIB_END at each end of the run
function edgeRib(b: MeshBuilder, xr: number, run: Array<{ z: number; top: number }>) {
  if (run.length < 3) return;

  const n = run.length;
  const len: number[] = [0];

  for (let k = 1; k < n; k++) len.push(len[k - 1] + Math.hypot(run[k].z - run[k - 1].z, run[k].top - run[k - 1].top));

  const total = len[n - 1];
  // the normal of the edge (y down: out of the top, upward), from its neighbours
  const nrm = run.map((_, k) => {
    const a = run[Math.max(0, k - 1)];
    const c = run[Math.min(n - 1, k + 1)];
    const dz = c.z - a.z;
    const dy = c.top - a.top;
    const l = Math.hypot(dz, dy) || 1;

    return [-dz / l, dy / l] as [number, number]; // (y, z)
  });
  const h = (k: number) => {
    const e = Math.min(len[k], total - len[k]) / RIB_END;

    return RIB_H * (e >= 1 ? 1 : Math.sin((e * Math.PI) / 2));
  };
  const at = (k: number, xx: number, hh: number): FwVec3 => [xx, run[k].top + nrm[k][0] * hh - nrm[k][0] * 0.05, run[k].z + nrm[k][1] * hh];
  const x0 = xr - RIB_W / 2;
  const x1 = xr + RIB_W / 2;

  for (let k = 0; k + 1 < n; k++) {
    const ha = h(k);
    const hc = h(k + 1);
    const up: FwVec3 = [0, (nrm[k][0] + nrm[k + 1][0]) / 2, (nrm[k][1] + nrm[k + 1][1]) / 2];

    b.flatQuad(at(k, x0, ha), at(k + 1, x0, hc), at(k + 1, x1, hc), at(k, x1, ha), up, MAT_MOUNT_RIB);
    b.flatQuad(at(k, x0, 0), at(k + 1, x0, 0), at(k + 1, x0, hc), at(k, x0, ha), [-1, 0, 0], MAT_MOUNT_RIB_SIDE);
    b.flatQuad(at(k, x1, 0), at(k + 1, x1, 0), at(k + 1, x1, hc), at(k, x1, ha), [1, 0, 0], MAT_MOUNT_RIB_SIDE);
  }
}

// A weld bead round the bar where it meets a plate's face at x, on the side `s` (toward the bar): a string of small
// beads, overlapping, all round the square
function weldRing(b: MeshBuilder, x: number, s: number, zc: number) {
  const y0 = FLOOR - 2 * BAR;
  const perim: Array<[number, number]> = [];
  const n = 18; // beads along each side

  for (let k = 0; k < n; k++) perim.push([zc - BAR + (2 * BAR * k) / n, y0]);
  for (let k = 0; k < n; k++) perim.push([zc + BAR, y0 + (2 * BAR * k) / n]);
  for (let k = 0; k < n; k++) perim.push([zc + BAR - (2 * BAR * k) / n, FLOOR]);
  for (let k = 0; k < n; k++) perim.push([zc - BAR, FLOOR - (2 * BAR * k) / n]);

  for (const [z, y] of perim) {
    if (y >= FLOOR - 0.01) continue; // (not under the bar, on the floor)
    b.prismDir([x, y, z], [s, 0, 0], [0, 1, 0], [0, 0, 1], 2.6, 2.2, 8, 0, MAT_WELD, MAT_WELD);
  }
}

// The weld seams along the foot of the middle wall's side s, where it meets the end plates (short beads up its height)
function weldSeam(b: MeshBuilder, s: number, xa: number, xb: number) {
  for (const [x, dir] of [[xa, 1], [xb, -1]] as Array<[number, number]>) {
    for (let y = WALL_TOP + 2; y < FLOOR - 1; y += 3.6) {
      b.prismDir([x, y, s * T], [dir, 0, 0], [0, 1, 0], [0, 0, 1], 2.4, 2, 8, 0, MAT_WELD, MAT_WELD);
    }
  }
}

// A bar along the floor at zc, from x0 to x1: square, its body the timing covers' dark metal, fins along it on its top
// and on its outer side
function bar(b: MeshBuilder, x0: number, x1: number, zc: number) {
  const y0 = FLOOR - 2 * BAR;

  b.box(x0, x1, y0, FLOOR, zc - BAR, zc + BAR, MAT_COVER);

  // fins along the top
  for (let z = zc - BAR + 6; z <= zc + BAR - 6 + 1e-6; z += FIN_PITCH) b.box(x0, x1, y0 - FIN_H, y0, z - FIN_T, z + FIN_T, MAT_COVER_FIN);

  // and down the outer side
  const out = Math.sign(zc);
  const zs = zc + out * BAR;

  for (let y = y0 + 6; y <= FLOOR - 6 + 1e-6; y += FIN_PITCH) b.box(x0, x1, y - FIN_T, y + FIN_T, Math.min(zs, zs + out * FIN_H), Math.max(zs, zs + out * FIN_H), MAT_COVER_FIN);
}

export function buildEngineMount(b: MeshBuilder) {
  for (const p of MOUNT_PLATES) plate(b, p.x, colsOf(p.cols));

  // the bars: from the front plate's inner face to the rear plate's, through the middle one
  const xs = MOUNT_PLATES.map((p) => p.x).sort((a, c) => a - c);
  const xa = xs[0] + T;
  const xb = xs[xs.length - 1] - T;

  // and down the middle, under the engine, a low wall of the same punched plate joining all three, the front plate to the
  // rear one, through the middle one
  {
    const Pz = (x: number, y: number, z: number): FwVec3 => [x, y, z];

    for (const s of [-1, 1]) b.flatQuad(Pz(xa, WALL_TOP, s * T), Pz(xb, WALL_TOP, s * T), Pz(xb, FLOOR, s * T), Pz(xa, FLOOR, s * T), [0, 0, s], MAT_MOUNT_PERF);
    b.flatQuad(Pz(xa, WALL_TOP, -T), Pz(xb, WALL_TOP, -T), Pz(xb, WALL_TOP, T), Pz(xa, WALL_TOP, T), [0, -1, 0], MAT_MOUNT_EDGE);
    for (const s of [-1, 1]) weldSeam(b, s, xa, xb);
  }

  for (const zc of [-BAR_Z, BAR_Z]) {
    bar(b, xa, xb, zc);
    weldRing(b, xa, 1, zc);
    weldRing(b, xb, -1, zc);

    for (const xm of xs.slice(1, -1)) {
      weldRing(b, xm - T, -1, zc);
      weldRing(b, xm + T, 1, zc);
    }
  }
}
