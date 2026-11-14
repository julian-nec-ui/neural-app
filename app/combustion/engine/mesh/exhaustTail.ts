// The tail pipes out of the silencers: not round, but an upside-down trapezoid in section (its wide side on top, its
// narrow side below), every corner well rounded, run straight back to behind the flywheel. Where each leaves its
// silencer it stands in a bevelled weld flange; at its end it wears a separate collar of darker grey: bevelled on to
// the pipe, two fine grooves round it, a small socket screw on each slanted side, and its mouth bevelled outward, a
// bright lip, then a rounded edge into the bore, which goes dark inside.
//
// The section is drawn in (y, z) round the pipe's middle line (+y is down), and swept along x; every band of the mesh
// is the same rounded trapezoid grown or shrunk by an offset, so the faces stay flat and the corners round.

import type { FwMaterial, FwVec3 } from "./builder";
import { MAT_MUFFLER_WIRE, MAT_TAIL_BORE, MAT_TAIL_PIPE, MAT_TAIL_COLLAR, MAT_TAIL_COLLAR_EDGE, MAT_TAIL_SCREW, MAT_WELD } from "./materials";
import type { MeshBuilder } from "./tubes";

// half its height; half its width on top and below; its corners' radius; the steps round each corner
export const TAIL_SECTION = { h: 29, top: 41, bottom: 26, round: 10, steps: 10 };

type Ring = { p: Array<[number, number]>; n: Array<[number, number]> }; // (y, z) points and their outward normals

// The rounded trapezoid, grown by `off` (negative: shrunk): the corners' middles are the trapezoid's corners moved in
// along their bisectors by the corner radius; the outline is round them at radius + off
export function tailRing(off: number): Ring {
  const { h, top, bottom, round, steps } = TAIL_SECTION;
  const poly: Array<[number, number]> = [[-h, -top], [-h, top], [h, bottom], [h, -bottom]]; // round in one sense
  const m = poly.length;
  const edgeN: Array<[number, number]> = [];
  // the centre's side: the outward normal of each edge
  for (let i = 0; i < m; i++) {
    const a = poly[i];
    const c = poly[(i + 1) % m];
    const dy = c[0] - a[0];
    const dz = c[1] - a[1];
    const l = Math.hypot(dy, dz);
    let n: [number, number] = [dz / l, -dy / l];

    if (n[0] * (a[0] + c[0]) + n[1] * (a[1] + c[1]) < 0) n = [-n[0], -n[1]];
    edgeN.push(n);
  }

  const out: Ring = { p: [], n: [] };

  for (let i = 0; i < m; i++) {
    const n0 = edgeN[(i + m - 1) % m];
    const n1 = edgeN[i];
    // the corner's middle: moved in from the corner so that it is `round` from both edges
    const bis = [n0[0] + n1[0], n0[1] + n1[1]];
    const bl = Math.hypot(bis[0], bis[1]);
    const cosHalf = (n0[0] * bis[0] + n0[1] * bis[1]) / bl;
    const d = round / cosHalf;
    const cy = poly[i][0] - (bis[0] / bl) * d;
    const cz = poly[i][1] - (bis[1] / bl) * d;
    const a0 = Math.atan2(n0[1], n0[0]);
    let a1 = Math.atan2(n1[1], n1[0]);

    while (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
    while (a1 - a0 < -Math.PI) a1 += Math.PI * 2;

    for (let k = 0; k <= steps; k++) {
      const a = a0 + ((a1 - a0) * k) / steps;
      const ny = Math.cos(a);
      const nz = Math.sin(a);

      out.p.push([cy + (round + off) * ny, cz + (round + off) * nz]);
      out.n.push([ny, nz]);
    }
  }

  return out;
}

// One pipe's tail, from x0 (inside its silencer's end) to x1 (its mouth), its middle at (y, z)
export function buildTrapezoidTail(b: MeshBuilder, x0: number, x1: number, y: number, z: number) {
  const P = (x: number, q: [number, number]): FwVec3 => [x, y + q[0], z + q[1]];

  // a band from the outline grown by offA at xA to the one grown by offB at xB; its normal leans with its slope
  const band = (xA: number, offA: number, xB: number, offB: number, m: FwMaterial, oA = 1, oB = 1) => {
    const ra = tailRing(offA);
    const rb = tailRing(offB);
    const dx = xB - xA;
    const dOff = offB - offA;
    const l = Math.hypot(dx, dOff) || 1;
    const N = (q: [number, number]): FwVec3 => [-dOff / l, (Math.sign(dx || 1) * Math.abs(dx) / l) * q[0], (Math.sign(dx || 1) * Math.abs(dx) / l) * q[1]];
    const fixN = (q: [number, number]): FwVec3 => (dx === 0 ? [-Math.sign(dOff), 0, 0] : N(q));
    const k = ra.p.length;

    for (let i = 0; i < k; i++) {
      const j = (i + 1) % k;
      const a0 = P(xA, ra.p[i]);
      const a1 = P(xA, ra.p[j]);
      const b0 = P(xB, rb.p[i]);
      const b1 = P(xB, rb.p[j]);
      const n0 = fixN(ra.n[i]);
      const n1 = fixN(ra.n[j]);

      b.push(a0, n0, m, oA);
      b.push(a1, n1, m, oA);
      b.push(b1, n1, m, oB);
      b.push(a0, n0, m, oA);
      b.push(b1, n1, m, oB);
      b.push(b0, n0, m, oB);
    }
  };
  // a run of bands through (x, offset) stations
  const run = (st: Array<[number, number]>, m: FwMaterial) => {
    for (let i = 1; i < st.length; i++) band(st[i - 1][0], st[i - 1][1], st[i][0], st[i][1], m);
  };

  const CL = 50; // the collar's length
  const xc = x1 - CL; // where it starts
  const C = 3.4; // how much it stands proud of the pipe

  // the pipe itself, from inside the silencer's end to under the collar
  band(x0, 0, xc + 6, 0, MAT_TAIL_PIPE);

  // the weld flange where it leaves the silencer: a bevelled ring, a bead of weld behind it
  const xf = x0 + 6;
  run([[xf - 2, 0.6], [xf - 0.5, 1.6]], MAT_WELD);
  run([[xf, 0], [xf, 3.2], [xf + 1.4, 4.4], [xf + 5, 4.4], [xf + 7, 2.6], [xf + 8.5, 0]], MAT_MUFFLER_WIRE);
  // a fine bezel along the pipe a little behind the collar: a raised bead round the outline
  run([[xc - 14, 0], [xc - 13, 1.1], [xc - 11, 1.4], [xc - 9, 1.1], [xc - 8, 0]], MAT_TAIL_COLLAR_EDGE);

  // the collar: bevelled on at its back, its body with two fine grooves, its mouth bevelled outward
  run([
    [xc, 0], [xc, 1.2], [xc + 2.4, C], // the back bevel
    [xc + 12, C], [xc + 12.6, C - 0.9], [xc + 14.2, C - 0.9], [xc + 14.8, C], // a groove
    [xc + 18, C], [xc + 18.6, C - 0.9], [xc + 20.2, C - 0.9], [xc + 20.8, C], // and another
    [x1 - 4.5, C], [x1 - 3, C + 0.6], [x1 - 1.2, C + 0.6], // a raised band at the mouth
  ], MAT_TAIL_COLLAR);
  // the mouth: its outer bevel bright, a flat lip, then the rounded edge into the bore
  run([[x1 - 1.2, C + 0.6], [x1, C - 0.6], [x1, -1.2]], MAT_TAIL_COLLAR_EDGE);
  run([[x1, -1.2], [x1 - 0.6, -2.8], [x1 - 2, -3.6]], MAT_TAIL_COLLAR_EDGE);
  // the bore, going dark inside
  band(x1 - 2, -3.6, x1 - 34, -3.6, MAT_TAIL_BORE, 1, 0.15);

  // and its end deep inside, black
  {
    const r = tailRing(-3.6);
    const xe = x1 - 34;
    const cN: FwVec3 = [1, 0, 0];

    for (let i = 0; i < r.p.length; i++) {
      const j = (i + 1) % r.p.length;

      b.push([xe, y, z], cN, MAT_TAIL_BORE, 0.05);
      b.push(P(xe, r.p[i]), cN, MAT_TAIL_BORE, 0.1);
      b.push(P(xe, r.p[j]), cN, MAT_TAIL_BORE, 0.1);
    }
  }

  // a socket screw on each slanted side of the collar, between the grooves and the mouth: a domed round head with a
  // hex socket in it, standing out along the side's normal
  {
    const { h, top, bottom } = TAIL_SECTION;
    const xs = (xc + 20.8 + x1 - 4.5) / 2;

    for (const sz of [-1, 1]) {
      // the side's middle and its outward normal, in (y, z)
      const ez = sz * ((top + bottom) / 2) + sz * C;
      const dy = 2 * h;
      const dz = sz * (bottom - top);
      const l = Math.hypot(dy, dz);
      let n: [number, number] = [-dz / l, dy / l];

      if (n[1] * sz < 0) n = [-n[0], -n[1]];
      const t: [number, number] = [-n[1], n[0]]; // along the side, in the section
      const base: FwVec3 = [xs, y, z + ez];
      const at = (rad: number, a: number, lift: number): FwVec3 => [
        base[0] + rad * Math.cos(a),
        base[1] + rad * Math.sin(a) * t[0] + lift * n[0],
        base[2] + rad * Math.sin(a) * t[1] + lift * n[1],
      ];
      const nrm = (a: number, up: number): FwVec3 => {
        const s = Math.hypot(1, up);
        const c = 1 / s;
        const u = up / s;

        return [Math.cos(a) * c, Math.sin(a) * t[0] * c + n[0] * u, Math.sin(a) * t[1] * c + n[1] * u];
      };
      const seg = 20;
      const R = 3.6;

      for (let k = 0; k < seg; k++) {
        const a0 = (k / seg) * Math.PI * 2;
        const a1 = ((k + 1) / seg) * Math.PI * 2;
        // its side, a low cylinder
        const q = (pa: FwVec3, pb: FwVec3, pc: FwVec3, pd: FwVec3, na: FwVec3, nb: FwVec3, m: FwMaterial) => {
          b.push(pa, na, m, 1); b.push(pb, nb, m, 1); b.push(pc, nb, m, 1);
          b.push(pa, na, m, 1); b.push(pc, nb, m, 1); b.push(pd, na, m, 1);
        };

        q(at(R, a0, -0.5), at(R, a1, -0.5), at(R, a1, 1.2), at(R, a0, 1.2), nrm(a0, 0), nrm(a1, 0), MAT_TAIL_SCREW);
        // its domed top, to the socket's rim
        q(at(R, a0, 1.2), at(R, a1, 1.2), at(1.9, a1, 1.9), at(1.9, a0, 1.9), nrm(a0, 1.6), nrm(a1, 1.6), MAT_TAIL_COLLAR_EDGE);
      }

      // the hex socket, dark, sunk in the top
      for (let k = 0; k < 6; k++) {
        const a0 = (k / 6) * Math.PI * 2;
        const a1 = ((k + 1) / 6) * Math.PI * 2;
        const up: FwVec3 = [0, n[0], n[1]];

        b.push(at(0, 0, 1.0), up, MAT_TAIL_BORE, 0.2);
        b.push(at(1.7, a0, 1.85), up, MAT_TAIL_BORE, 0.4);
        b.push(at(1.7, a1, 1.85), up, MAT_TAIL_BORE, 0.4);
      }
    }
  }
}
