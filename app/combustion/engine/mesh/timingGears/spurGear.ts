// A spur gear of the timing drive: involute teeth cut straight across a toothed rim, a web, a hub; and the idlers' posts.

import { TAU } from "../../core/constants";
import type { FwVec3, createMeshBuilder } from "../builder";
import { MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_PAINT, MAT_SPROCKET_WEB, MAT_VT_CAM_FACE, MAT_VT_HOLE, MAT_VT_SPROCKET, MAT_VT_TOOTH, MAT_VT_TOOTH_TIP } from "../materials";
import { buildRelief } from "../timingChain/sprocket";
import { GEAR_HALF, GEAR_MODULE } from "./gearTrain";

type B = ReturnType<typeof createMeshBuilder>;

const PRESSURE = (20 * Math.PI) / 180;
const inv = (a: number) => Math.tan(a) - a;

export type GearSpec = {
  teeth: number;
  hubR: number;
  boreR: number;
  hubLen: number; // how far the hub reaches toward the engine (+x)
  holes: number; // round lightening holes in the web (0: a solid web)
  relief?: "cam" | "crank"; // the front's relief, as the chain drive's sprockets had it (sprocket.ts)
  markTooth?: boolean; // tooth 0 painted, in line with the crankshaft's timing mark
  mark?: boolean; // a paint dot on the face, by tooth 0
  half?: number; // half its face width (GEAR_HALF unless given)
};

// The tooth's half angle about its middle at radius R: the involute above the base circle, straight in below it, eased at
// the tip and filleted at the root. Tooth 0 stands half a pitch from local angle 0, where a space is, as on the sprockets
export function buildSpurGear(b: B, spec: GearSpec) {
  const m = GEAR_MODULE;
  const N = spec.teeth;
  const Rp = (m * N) / 2;
  const Rb = Rp * Math.cos(PRESSURE);
  const tip = Rp + m;
  const root = Rp - 1.25 * m;
  const thick = m * (Math.PI / 2) - 0.12; // a little backlash
  const delta = TAU / N;
  const W = spec.half ?? GEAR_HALF;
  const C = 0.55; // the faces' chamfer at the teeth
  const fillet = 0.35 * m;

  const half = (R: number) => {
    const r = Math.max(R, Rb);
    let psi = thick / (2 * Rp) + inv(PRESSURE) - inv(Math.acos(Math.min(1, Rb / r)));

    if (R < root + fillet) {
      const u = 1 - (R - root) / fillet;

      psi += (fillet * (1 - Math.sqrt(Math.max(0, 1 - u * u)))) / R;
    }

    return psi;
  };

  type P = { r: number; t: number; zone: 0 | 1 | 2 }; // 0 root, 1 flank, 2 tip
  const outline: P[] = [];
  const FL = 9; // samples up a flank
  const tipEase = 0.45;

  for (let k = 0; k < N; k++) {
    const c = (k + 0.5) * delta;
    const psiRoot = half(root);
    const psiTip = half(tip - tipEase);

    // the root, from the middle of the space before
    for (let j = 0; j < 3; j++) outline.push({ r: root, t: c - delta / 2 + (j / 3) * (delta / 2 - psiRoot), zone: 0 });
    // up the leading flank
    for (let j = 0; j <= FL; j++) {
      const R = root + ((tip - tipEase - root) * j) / FL;

      outline.push({ r: R, t: c - half(R), zone: R > Rp + 0.35 * m ? 2 : 1 });
    }
    // across the tip, its corners eased
    for (let j = 0; j <= 4; j++) {
      const u = j / 4;
      const e = Math.sin(Math.PI * u);

      outline.push({ r: tip - tipEase * (1 - e), t: c - psiTip + 2 * psiTip * u, zone: 2 });
    }
    // and down the trailing one
    for (let j = FL; j >= 0; j--) {
      const R = root + ((tip - tipEase - root) * j) / FL;

      outline.push({ r: R, t: c + half(R), zone: R > Rp + 0.35 * m ? 2 : 1 });
    }
    for (let j = 1; j <= 3; j++) outline.push({ r: root, t: c + psiRoot + (j / 3) * (delta / 2 - psiRoot), zone: 0 });
  }

  const n = outline.length;
  const pt = (r: number, t: number, x: number): FwVec3 => [x, r * Math.cos(t), r * Math.sin(t)];
  const painted = (t: number) => {
    if (!spec.markTooth) return false;

    const d = ((t - 0.5 * delta + Math.PI) % TAU + TAU) % TAU - Math.PI;

    return Math.abs(d) <= 0.32 * delta;
  };
  const toothMat = (p: P) => (painted(p.t) ? MAT_PAINT : p.zone === 2 ? MAT_VT_TOOTH_TIP : p.zone === 1 ? MAT_VT_TOOTH : MAT_VT_SPROCKET);

  // the teeth's working faces, straight across
  const normals = outline.map((_, i): [number, number] => {
    const a = outline[(i - 1 + n) % n];
    const c = outline[(i + 1) % n];
    const ty = c.r * Math.cos(c.t) - a.r * Math.cos(a.t);
    const tz = c.r * Math.sin(c.t) - a.r * Math.sin(a.t);
    const len = Math.hypot(ty, tz) || 1;

    return [tz / len, -ty / len];
  });

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const pa = outline[i];
    const pb = outline[j];
    const na: FwVec3 = [0, normals[i][0], normals[i][1]];
    const nb: FwVec3 = [0, normals[j][0], normals[j][1]];
    const mat = toothMat(pa);
    const occ = pa.zone === 0 ? 0.55 : pa.zone === 1 ? 0.8 : 1;

    b.push(pt(pa.r, pa.t, -W + C), na, mat, occ); b.push(pt(pb.r, pb.t, -W + C), nb, mat, occ); b.push(pt(pb.r, pb.t, W - C), nb, mat, occ);
    b.push(pt(pa.r, pa.t, -W + C), na, mat, occ); b.push(pt(pb.r, pb.t, W - C), nb, mat, occ); b.push(pt(pa.r, pa.t, W - C), na, mat, occ);
  }

  // both faces: a chamfer at the teeth, then flat down to the rim's inside
  const rRim = Math.max(root - 1.6 * m, spec.hubR);

  for (const sx of [1, -1]) {
    for (let i = 0; i < n; i++) {
      const pa = outline[i];
      const pb = outline[(i + 1) % n];
      const ia = pa.r - C;
      const ib = pb.r - C;
      const mat = painted(pa.t) ? MAT_PAINT : pa.zone === 2 ? MAT_VT_TOOTH_TIP : MAT_VT_TOOTH;

      b.flatQuad(pt(pa.r, pa.t, sx * (W - C)), pt(pb.r, pb.t, sx * (W - C)), pt(ib, pb.t, sx * W), pt(ia, pa.t, sx * W), [sx * 0.7, 0, 0], mat);
      b.flatQuad(pt(ia, pa.t, sx * W), pt(ib, pb.t, sx * W), pt(rRim, pb.t, sx * W), pt(rRim, pa.t, sx * W), [sx, 0, 0], painted(pa.t) ? MAT_PAINT : MAT_VT_SPROCKET);
    }
  }

  // the rim's inside, down to the web; the web; the hub
  const webHalf = spec.relief === "crank" || spec.holes === 0 ? W : W * 0.55;
  const hubR = spec.hubR;

  if (webHalf < W) {
    for (const sx of [1, -1]) {
      b.revolve({ x0: sx * W, r0: rRim, x1: sx * webHalf, r1: rRim, n: [0, -1], m: MAT_SPROCKET_WEB, steps: 120 });
      b.revolve({ x0: sx * W, r0: rRim + 0.8, x1: sx * (W - 0.8), r1: rRim, n: [sx * 0.7, -0.7], m: MAT_VT_TOOTH, steps: 120 });
    }
  }

  const holes = spec.holes;
  const holeR = holes ? Math.min((rRim - hubR) * 0.32, (Math.PI * (hubR + rRim) * 0.5) / holes * 0.36) : 0;
  const holeC = (hubR + rRim) / 2;

  for (const sx of [1, -1]) {
    const x = sx * webHalf;

    if (!holes) {
      b.revolve({ x0: x, r0: hubR, x1: x, r1: rRim, n: [sx, 0], m: MAT_VT_SPROCKET, steps: 120 });
      continue;
    }

    // the web's face round the holes: rings in and out of them, and between them a face with the holes left out
    b.revolve({ x0: x, r0: hubR, x1: x, r1: holeC - holeR - 0.4, n: [sx, 0], m: MAT_SPROCKET_WEB, steps: 120 });
    b.revolve({ x0: x, r0: holeC + holeR + 0.4, x1: x, r1: rRim, n: [sx, 0], m: MAT_SPROCKET_WEB, steps: 120 });

    const rin = holeC - holeR - 0.4;
    const rout = holeC + holeR + 0.4;

    for (let h = 0; h < holes; h++) {
      const t0 = (h / holes) * TAU;
      const span = TAU / holes;
      const tcH = t0 + span / 2;
      const hy = holeC * Math.cos(tcH);
      const hz = holeC * Math.sin(tcH);
      // the hole's sector of the band (between the two rings, between its two radial lines): from the hole's middle, every
      // ray meets its edge once; the face is laid between the hole's rim and that edge
      const inside = (y: number, z: number) => {
        const r = Math.hypot(y, z);
        let a = Math.atan2(z, y) - t0;

        a = ((a % TAU) + TAU) % TAU;

        return r >= rin && r <= rout && a <= span;
      };
      const rayEdge = (phi: number): [number, number] => {
        const dy = Math.cos(phi);
        const dz = Math.sin(phi);
        let lo = holeR;
        let hi = rout * 2;

        for (let it = 0; it < 40; it++) {
          const mid = (lo + hi) / 2;

          if (inside(hy + dy * mid, hz + dz * mid)) lo = mid;
          else hi = mid;
        }

        return [hy + dy * lo, hz + dz * lo];
      };
      const S = 48;

      for (let s2 = 0; s2 < S; s2++) {
        const p0 = (s2 / S) * TAU;
        const p1 = ((s2 + 1) / S) * TAU;
        const e0 = rayEdge(p0);
        const e1 = rayEdge(p1);
        const r0: FwVec3 = [x, hy + (holeR + 0.4) * Math.cos(p0), hz + (holeR + 0.4) * Math.sin(p0)];
        const r1: FwVec3 = [x, hy + (holeR + 0.4) * Math.cos(p1), hz + (holeR + 0.4) * Math.sin(p1)];

        if (sx > 0) b.flatQuad(r0, [x, e0[0], e0[1]], [x, e1[0], e1[1]], r1, [sx, 0, 0], MAT_SPROCKET_WEB);
        else b.flatQuad(r1, [x, e1[0], e1[1]], [x, e0[0], e0[1]], r0, [sx, 0, 0], MAT_SPROCKET_WEB);
      }

      // the hole's bore through the web, and a chamfer round it on each face
      const tc = t0 + span / 2;
      const cy = holeC * Math.cos(tc);
      const cz = holeC * Math.sin(tc);

      if (sx > 0) {
        for (let s = 0; s < 28; s++) {
          const a0 = (s / 28) * TAU;
          const a1 = ((s + 1) / 28) * TAU;
          const P = (x2: number, a: number): FwVec3 => [x2, cy + holeR * Math.cos(a), cz + holeR * Math.sin(a)];
          const am = (a0 + a1) / 2;

          b.flatQuad(P(webHalf, a0), P(-webHalf, a0), P(-webHalf, a1), P(webHalf, a1), [0, -Math.cos(am), -Math.sin(am)], MAT_VT_HOLE);
        }
      }

      b.revolve({ x0: x, r0: holeR + 0.4, x1: x - sx * 0.01, r1: holeR, n: [sx, 0], m: MAT_VT_TOOTH, steps: 28, cy, cz });
    }
  }

  // hub boss: through from the front face to the engine side, machined ends, the bore
  const front = -Math.max(W + 1, 4);
  const back = spec.hubLen;

  b.revolve({ x0: front, r0: hubR, x1: back, r1: hubR, n: [0, 1], m: MAT_VT_SPROCKET, steps: 72 });
  b.revolve({ x0: back, r0: spec.boreR, x1: back, r1: hubR - 0.8, n: [1, 0], m: MAT_VT_CAM_FACE, steps: 72 });
  b.revolve({ x0: back - 0.8, r0: hubR, x1: back, r1: hubR - 0.8, n: [0.7, 0.7], m: MAT_VT_TOOTH, steps: 72 });
  b.revolve({ x0: front, r0: spec.boreR, x1: front, r1: hubR - 0.8, n: [-1, 0], m: MAT_VT_CAM_FACE, steps: 72 });
  b.revolve({ x0: front + 0.8, r0: hubR, x1: front, r1: hubR - 0.8, n: [-0.7, 0.7], m: MAT_VT_TOOTH, steps: 72 });
  b.revolve({ x0: front, r0: spec.boreR, x1: back, r1: spec.boreR, n: [0, -1], m: MAT_VT_HOLE, steps: 72 });

  if (spec.mark) {
    for (const sx of [1, -1]) b.disc(sx * (W + 0.05), Rp - 2.2 * m, 0.5 * delta, 1.5, MAT_PAINT, 14, 0, 0, sx);
  }

  if (spec.relief) {
    buildRelief(b, { relief: spec.relief, teeth: N, rPitch: Rp, windows: 0, hubR, boreR: spec.boreR, hubLen: spec.hubLen, mark: false }, rRim, webHalf, W);
  }
}

// An idler's post: the stub shaft it turns on, standing out of the back plate, with a needle race showing at the hub, a
// thick washer and a flanged hex bolt holding the gear on. It stands still: drawn apart from the gear
export function buildIdlerPost(b: B, boreR: number, toPlate: number, front?: number, bolt = true) {
  const W = GEAR_HALF;
  const f = front ?? -Math.max(W + 1, 4); // the gear's hub's front face (or what it carries in front of it)

  // the shaft, back to the plate, with a broad foot
  b.revolve({ x0: f, r0: boreR - 0.3, x1: toPlate, r1: boreR - 0.3, n: [0, 1], m: MAT_VT_CAM_FACE, steps: 48 });
  b.revolve({ x0: toPlate - 3, r0: boreR + 6, x1: toPlate, r1: boreR + 6, n: [0, 1], m: MAT_VT_SPROCKET, steps: 48 });
  b.revolve({ x0: toPlate - 3, r0: boreR - 0.3, x1: toPlate - 3, r1: boreR + 6, n: [-1, 0], m: MAT_VT_CAM_FACE, steps: 48 });
  // the needle race, a dark ring just inside the bore at each end
  for (const x of [f - 0.02, W + 1.02]) b.revolve({ x0: x, r0: boreR - 0.3, x1: x, r1: boreR, n: [x < 0 ? -1 : 1, 0], m: MAT_SPROCKET_WEB, steps: 48 });

  if (!bolt) return; // (what it carries has its own bolt on its face)

  // the thrust washer, then the flanged hex bolt
  const wR = boreR + 4.5;

  b.revolve({ x0: f, r0: wR, x1: f - 1.6, r1: wR, n: [0, 1], m: MAT_CT_NUT_SIDE, steps: 48 });
  b.revolve({ x0: f - 1.6, r0: 0, x1: f - 1.6, r1: wR - 0.4, n: [-1, 0], m: MAT_CT_NUT_HEAD, steps: 48 });
  b.revolve({ x0: f - 1.6, r0: wR - 0.4, x1: f - 1.2, r1: wR, n: [-0.7, 0.7], m: MAT_VT_TOOTH, steps: 48 });

  const x0 = f - 1.6;

  b.prismDir([x0, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], boreR * 0.95, 1.2, 36, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
  b.prismDir([x0 - 1.2, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], boreR * 0.72, 4.6, 6, 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
  b.revolve({ x0: x0 - 5.8, r0: boreR * 0.3, x1: x0 - 5.8, r1: boreR * 0.55, n: [-1, 0], m: MAT_VT_CAM_FACE, steps: 24 });
  b.prismDir([x0 - 5.82, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], boreR * 0.3, 0.05, 6, 0, MAT_VT_HOLE, MAT_VT_HOLE);
}
