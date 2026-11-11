// The sprockets: tooth profile, web, hub and timing marks.

import { TAU } from "../../core/constants";
import type { FwVec3, createMeshBuilder } from "../builder";
import { MAT_PAINT, MAT_VT_CAM_FACE, MAT_VT_HOLE, MAT_VT_SPROCKET, MAT_VT_TOOTH, MAT_VT_TOOTH_TIP } from "../materials";

/* ---------------- sprocket ---------------- */

// Tooth profile over one pitch: [distance from the gap centre (0..1),
// height above the pitch circle]. The gap is the roller seat. The tooth
// stands a little above the waist of the chain's plates (1.9), below their
// rounded ends (3.9): its tip shows just out of the link
const TIP_TOP = 3.0;
const SPROCKET_PROFILE: Array<[number, number]> = [
  [0.0, -2.95],
  [0.1, -2.85],
  [0.22, -2.45],
  [0.34, -1.6],
  [0.46, -0.35],
  [0.58, 0.95],
  [0.7, 2.0],
  [0.82, 2.65],
  [0.92, 2.92],
  [1.0, TIP_TOP],
];

// Above this height over the pitch circle a tooth is its tip, in darker steel
const TIP_FROM = 1.4;

const sprocketHeight = (a: number) => {
  for (let i = 0; i < SPROCKET_PROFILE.length - 1; i++) {
    const [a0, h0] = SPROCKET_PROFILE[i];
    const [a1, h1] = SPROCKET_PROFILE[i + 1];

    if (a <= a1) {
      const t = (a - a0) / (a1 - a0);
      const e = (1 - Math.cos(Math.PI * t)) / 2;

      return h0 + (h1 - h0) * e;
    }
  }

  return SPROCKET_PROFILE[SPROCKET_PROFILE.length - 1][1];
};

type SprocketSpec = {
  teeth: number;
  rPitch: number;
  windows: number;
  hubR: number;
  boreR: number;
  hubLen: number; // how far the hub reaches toward the engine
  mark: boolean;
  markTooth?: boolean; // tooth 0 is painted, in line with the timing mark on the crankshaft
};

export function buildSprocket(b: ReturnType<typeof createMeshBuilder>, spec: SprocketSpec) {
  const { teeth, rPitch, windows, hubR, boreR } = spec;
  const per = 18; // samples per tooth
  const half = 2.6; // half width of the toothed ring: the teeth run between the inner plates
  const webHalf = 1.9;
  const rRoot = rPitch - 4.4;
  const delta = TAU / teeth;

  // The marked tooth is tooth 0, centred half a pitch from the first gap
  const markCentre = 0.5 * delta;
  const markHalf = 0.28 * delta;
  const hot = (theta: number) => {
    if (!spec.markTooth) return false;

    const d = ((theta - markCentre + Math.PI) % TAU + TAU) % TAU - Math.PI;

    return Math.abs(d) <= markHalf;
  };

  type P = { y: number; z: number; r: number; theta: number; h: number };
  const outline: P[] = [];

  for (let k = 0; k < teeth; k++) {
    for (let j = 0; j < per; j++) {
      const u = ((j + 0.5) / per) * 2 - 1;
      const theta = k * delta + (u * delta) / 2;
      const h = sprocketHeight(Math.abs(u));
      const r = rPitch + h;

      outline.push({ y: r * Math.cos(theta), z: r * Math.sin(theta), r, theta, h });
    }
  }

  const n = outline.length;

  // Smooth side wall of the toothed ring
  const normals = outline.map((_, i): [number, number] => {
    const a = outline[(i - 1 + n) % n];
    const c = outline[(i + 1) % n];
    const ty = c.y - a.y;
    const tz = c.z - a.z;
    const len = Math.hypot(ty, tz) || 1;

    return [tz / len, -ty / len];
  });

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const pa = outline[i];
    const pb = outline[j];
    const na: FwVec3 = [0, normals[i][0], normals[i][1]];
    const nb: FwVec3 = [0, normals[j][0], normals[j][1]];

    const a: FwVec3 = [-half, pa.y, pa.z];
    const bb: FwVec3 = [-half, pb.y, pb.z];
    const c: FwVec3 = [half, pb.y, pb.z];
    const d: FwVec3 = [half, pa.y, pa.z];

    // the working flank is bright steel; the tip, above it, dark, heavy steel, shaded toward its crown
    const tipZone = pa.h > TIP_FROM;
    const tip = hot(pa.theta) ? MAT_PAINT : tipZone ? MAT_VT_TOOTH_TIP : pa.h > -0.2 ? MAT_VT_TOOTH : MAT_VT_SPROCKET;
    const occ = tipZone ? 1 - 0.35 * Math.min(1, (pa.h - TIP_FROM) / (TIP_TOP - TIP_FROM)) : 0.5 + 0.5 * Math.min(1, Math.max(0, (pa.h + 2.95) / 5.4));

    b.push(a, na, tip, occ); b.push(bb, nb, tip, occ); b.push(c, nb, tip, occ);
    b.push(a, na, tip, occ); b.push(c, nb, tip, occ); b.push(d, na, tip, occ);
  }

  // Both faces: from the tooth outline down to the root circle, with a
  // chamfer where it meets the teeth
  const chamfer = 0.9;

  for (const sx of [1, -1]) {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const pa = outline[i];
      const pb = outline[j];
      const ia = pa.r - chamfer * (0.35 + 0.65 * Math.min(1, Math.max(0, (pa.h + 2.95) / 6.3)));
      const ib = pb.r - chamfer * (0.35 + 0.65 * Math.min(1, Math.max(0, (pb.h + 2.95) / 6.3)));

      const pt = (r: number, theta: number, x: number): FwVec3 => [
        x, r * Math.cos(theta), r * Math.sin(theta),
      ];

      const painted = hot(pa.theta);

      // Chamfer band
      b.flatQuad(
        pt(pa.r, pa.theta, sx * (half - chamfer)), pt(pb.r, pb.theta, sx * (half - chamfer)),
        pt(ib, pb.theta, sx * half), pt(ia, pa.theta, sx * half),
        [sx, 0, 0], painted ? MAT_PAINT : pa.h > TIP_FROM ? MAT_VT_TOOTH_TIP : MAT_VT_TOOTH
      );

      // Flat face down to the root circle
      b.flatQuad(
        pt(ia, pa.theta, sx * half), pt(ib, pb.theta, sx * half),
        pt(rRoot, pb.theta, sx * half), pt(rRoot, pa.theta, sx * half),
        [sx, 0, 0], painted ? MAT_PAINT : MAT_VT_SPROCKET
      );
    }
  }

  // Root wall, then the thinner web with lightening windows
  b.revolve({ x0: half, r0: rRoot, x1: webHalf, r1: rRoot, n: [0, 1], m: MAT_VT_SPROCKET, steps: 96 });
  b.revolve({ x0: -half, r0: rRoot, x1: -webHalf, r1: rRoot, n: [0, 1], m: MAT_VT_SPROCKET, steps: 96 });

  const winRin = hubR + 5.5;
  const winRout = rRoot - 5.5;
  const S = windows * 12;
  const inWindow = (i: number) => {
    const k = i % 12;
    return k >= 2 && k <= 9;
  };

  if (windows === 0) {
    // A solid web, from the hub to the tooth root
    b.revolve({ x0: webHalf, r0: hubR, x1: webHalf, r1: rRoot, n: [1, 0], m: MAT_VT_SPROCKET, steps: 72 });
    b.revolve({ x0: -webHalf, r0: hubR, x1: -webHalf, r1: rRoot, n: [-1, 0], m: MAT_VT_SPROCKET, steps: 72 });
  } else {
    b.revolve({ x0: webHalf, r0: hubR, x1: webHalf, r1: winRin, n: [1, 0], m: MAT_VT_SPROCKET, steps: S });
    b.revolve({ x0: webHalf, r0: winRout, x1: webHalf, r1: rRoot, n: [1, 0], m: MAT_VT_SPROCKET, steps: S });
    b.revolve({ x0: webHalf, r0: winRin, x1: webHalf, r1: winRout, n: [1, 0], m: MAT_VT_SPROCKET, steps: S, mask: (i) => !inWindow(i) });

    b.revolve({ x0: -webHalf, r0: hubR, x1: -webHalf, r1: winRin, n: [-1, 0], m: MAT_VT_SPROCKET, steps: S });
    b.revolve({ x0: -webHalf, r0: winRout, x1: -webHalf, r1: rRoot, n: [-1, 0], m: MAT_VT_SPROCKET, steps: S });
    b.revolve({ x0: -webHalf, r0: winRin, x1: -webHalf, r1: winRout, n: [-1, 0], m: MAT_VT_SPROCKET, steps: S, mask: (i) => !inWindow(i) });

    // Window walls: inner arc, outer arc, and the two straight sides
    b.revolve({ x0: webHalf, r0: winRin, x1: -webHalf, r1: winRin, n: [0, -1], m: MAT_VT_SPROCKET, steps: S, mask: inWindow });
    b.revolve({ x0: webHalf, r0: winRout, x1: -webHalf, r1: winRout, n: [0, 1], m: MAT_VT_SPROCKET, steps: S, mask: inWindow });
  }

  for (let k = 0; k < windows; k++) {
    for (const edge of [2, 10]) {
      const t = ((k * 12 + edge) / S) * TAU;
      const ct = Math.cos(t);
      const st = Math.sin(t);
      const sign = edge === 2 ? 1 : -1; // toward the window

      b.flatQuad(
        [webHalf, winRin * ct, winRin * st], [webHalf, winRout * ct, winRout * st],
        [-webHalf, winRout * ct, winRout * st], [-webHalf, winRin * ct, winRin * st],
        [0, -st * sign, ct * sign], MAT_VT_SPROCKET
      );
    }
  }

  // The paint carried on from the marked tooth: down the root wall and across
  // the web to the hub, and along the hub itself
  if (spec.markTooth) {
    for (const sx of [1, -1]) {
      b.revolve({ x0: sx * half, r0: rRoot + 0.03, x1: sx * webHalf, r1: rRoot + 0.03, n: [0, 1], m: MAT_PAINT, from: markCentre - markHalf, to: markCentre + markHalf, steps: 6 });
      b.revolve({ x0: sx * (webHalf + 0.03), r0: hubR, x1: sx * (webHalf + 0.03), r1: rRoot, n: [sx, 0], m: MAT_PAINT, from: markCentre - markHalf, to: markCentre + markHalf, steps: 6 });
    }

    const ct = Math.cos(markCentre);
    const st = Math.sin(markCentre);
    const hw = 3.0; // the same width as on the shaft
    const rr = hubR + 0.05;
    const hubPoint = (x: number, w: number): FwVec3 => [x, rr * ct - w * st, rr * st + w * ct];
    const hubHalf = Math.atan(hw / hubR);

    b.flatQuad(hubPoint(-3.2, -hw), hubPoint(spec.hubLen - 0.8, -hw), hubPoint(spec.hubLen - 0.8, hw), hubPoint(-3.2, hw), [0, ct, st], MAT_PAINT);

    // On over both ends of the hub: the chamfers, and across the bolt side's machined face
    b.revolve({ x0: -3.2, r0: hubR + 0.03, x1: -4.03, r1: hubR - 0.8, n: [-0.7, 0.7], m: MAT_PAINT, from: markCentre - hubHalf, to: markCentre + hubHalf, steps: 6 });
    b.revolve({ x0: spec.hubLen - 0.8, r0: hubR + 0.03, x1: spec.hubLen + 0.03, r1: hubR - 0.8, n: [0.7, 0.7], m: MAT_PAINT, from: markCentre - hubHalf, to: markCentre + hubHalf, steps: 6 });

    const endFace = (r: number, w: number): FwVec3 => [-4.03, r * ct - w * st, r * st + w * ct];

    b.flatQuad(endFace(spec.boreR, -hw), endFace(hubR - 0.8, -hw), endFace(hubR - 0.8, hw), endFace(spec.boreR, hw), [-1, 0, 0], MAT_PAINT);
  }

  // Hub boss with a machined face and a pilot bore
  const hubLen = spec.hubLen;
  b.revolve({ x0: -4, r0: hubR, x1: hubLen, r1: hubR, n: [0, 1], m: MAT_VT_SPROCKET, steps: 72 });
  b.revolve({ x0: hubLen, r0: boreR, x1: hubLen, r1: hubR - 0.8, n: [1, 0], m: MAT_VT_CAM_FACE, steps: 72 });
  b.revolve({ x0: hubLen - 0.8, r0: hubR, x1: hubLen, r1: hubR - 0.8, n: [0.7, 0.7], m: MAT_VT_TOOTH, steps: 72 });
  b.revolve({ x0: hubLen, r0: boreR, x1: hubLen - 6, r1: boreR, n: [0, -1], m: MAT_VT_HOLE, steps: 72 });

  // The same machined end on the side toward the chain end
  b.revolve({ x0: -4, r0: boreR, x1: -4, r1: hubR - 0.8, n: [-1, 0], m: MAT_VT_CAM_FACE, steps: 72 });
  b.revolve({ x0: -4 + 0.8, r0: hubR, x1: -4, r1: hubR - 0.8, n: [-0.7, 0.7], m: MAT_VT_TOOTH, steps: 72 });
  b.revolve({ x0: -4, r0: boreR, x1: 4, r1: boreR, n: [0, -1], m: MAT_VT_HOLE, steps: 72 });

  // Timing mark: a paint dot on the face, and a marked tooth
  if (spec.mark) {
    b.disc(half + 0.05, rPitch - 1.5, 0, 1.5, MAT_PAINT, 14);
    b.disc(-half - 0.05, rPitch - 1.5, 0, 1.5, MAT_PAINT, 14, 0, 0, -1);
  }

  // Dowel holes on the web, in line with the windows
  for (let k = 0; k < windows; k++) {
    const t = ((k + 0.5) / windows) * TAU;
    b.disc(webHalf + 0.05, hubR + 2.7, t, 1.1, MAT_VT_HOLE, 10);
    b.disc(-webHalf - 0.05, hubR + 2.7, t, 1.1, MAT_VT_HOLE, 10, 0, 0, -1);
  }
}
