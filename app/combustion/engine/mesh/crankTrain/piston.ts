// The piston: crown with valve reliefs, ring pack, skirt, wrist pin and circlips.

import { PISTON_H, TAU, VALVE_RH_EX, VALVE_RH_IN } from "../../core/constants";
import type { FwMaterial, FwVec3 } from "../builder";
import { MAT_CT_ALU, MAT_CT_ALU_CAST, MAT_CT_ANODIZED, MAT_CT_CLIP, MAT_CT_RELIEF, MAT_CT_EDGE, MAT_CT_EXPANDER, MAT_CT_GROOVE, MAT_CT_HOLE, MAT_CT_PIN, MAT_CT_PIN_END, MAT_CT_PLATE, MAT_CT_RING, MAT_CT_RING_DARK, MAT_CT_RING_MOLY, MAT_CT_SKIRT } from "../materials";
import { VT } from "../valvetrain";
import { CT, CT_PISTON_BACK_WALL, CT_PISTON_FRONT_WALL, CT_PISTON_STEPS } from "./dimensions";
import type { MeshBuilder } from "../tubes";

// One piston, in its own frame: the wrist pin at the origin, the crown at -40
export function buildPiston(b: MeshBuilder) {
  // A forged-looking piston, after a real one: a crown with valve reliefs, a top
  // land, two compression rings and a three-piece oil ring, then a full skirt with
  // a round hole through each side for the wrist pin, a bright chamfer round each
  // hole, the sides cut away under the pin and left with a short foot, and the
  // thrust faces reaching lower, barrel-shaped, with two oil grooves.
  //
  // Local frame: origin at the wrist pin, crown at -40, skirt end at +30. The pin
  // runs along X.

  {
    const pr = CT.pistonR; // skirt radius
    const S = CT_PISTON_STEPS;
    const dTheta = TAU / S;
    const crown = -40;
    const skirtEnd = PISTON_H - 40;
    const rTop = pr - 0.7; // top land: a touch smaller, hard anodised
    const rL2 = pr - 0.4;
    const rL3 = pr - 0.25;
    const g = pr - 4.2; // groove floor
    const ringOut = pr + 0.35;
    const ringIn = g + 0.4;
    const ringSteps = 192;
    const bite = 0.5; // chamfer on the groove edges

    const seg = (
      y0: number, r0: number, y1: number, r1: number,
      n: [number, number], m: FwMaterial,
      extra: { mask?: (i: number) => boolean; steps?: number } = {}
    ) => b.revolveY({ y0, r0, y1, r1, n, m, steps: CT_PISTON_STEPS, ...extra });

    // The crown's edge, chamfered; its top, with the valve reliefs cut into it, follows
    seg(crown, rTop - 1.6, crown + 1.6, rTop, [-0.7, 0.7], MAT_CT_EDGE);

    // The crown's top: a surface with real relief, built on a grid fine enough to hold the
    // detail. Four valve reliefs are cut into it, one under each valve, to the valve's size
    // and a little more. Each has a bright chamfer, a step, a steep wall, a deep floor with
    // tool marks running out from its middle like spokes, a small dimple at the centre, and
    // a scalloped rim where the cutter ran out. Where one comes near the crown's edge, it
    // dies away into the land.
    {
      const R = rTop - 1.6; // the top's outer edge, where the chamfer begins
      const pockets = [1, -1].flatMap((sigma) =>
        [-1, 1].map((sx) => ({
          cx: (sx * VT.xValve + (sigma > 0 && sx < 0 ? VT.leftIntakeShift : 0)) * 0.92,
          cz: sigma * VT.zSeat * 0.86, // a little in from under the valve, toward the crown's middle
          rim: (sigma > 0 ? VALVE_RH_IN : VALVE_RH_EX) + 7.5, // larger than the valve, as a deep cut is
        }))
      );

      // How far below the crown's top a point on it lies (positive is down)
      const sink = (x: number, z: number) => {
        let depth = 0;

        for (const k of pockets) {
          const dx = x - k.cx;
          const dz = z - k.cz;
          const d = Math.hypot(dx, dz);
          const a = Math.atan2(dz, dx);

          // a clean cut, no tool marks: a broad chamfer round its rim, a smooth wall, a flat floor
          const u = k.rim - d; // how far inside the rim

          if (u <= 0) continue;

          let h: number;

          if (u < 2.4) h = 1.6 * (u / 2.4); // the chamfer
          else if (u < 4.6) {
            const t = (u - 2.4) / 2.2;

            h = 1.6 + 3.0 * t * t * (3 - 2 * t); // the wall, smooth at both ends
          } else h = 4.6; // the floor

          void a;

          // deeper toward the crown's edge, the ring side, shallower toward its middle: a sloping floor
          const slope = 0.7 + 0.85 * Math.min(1, Math.hypot(x, z) / R);

          depth = Math.max(depth, h * slope);
        }

        // dying away, briefly, at the crown's very edge, so that the land above the top ring stays whole
        const edge = Math.min(1, Math.max(0, (R - Math.hypot(x, z)) / 2.2));

        return depth * edge * edge * (3 - 2 * edge);
      };

      // Surface material by how deep a point is: bright at the chamfer, machined above it, dark on the floor
      // a matte, blasted finish in the reliefs, chamfer and all, against the crown's machined top
      const matAt = (h: number) => (h < 0.03 ? MAT_CT_ALU_CAST : MAT_CT_RELIEF);

      const eps = 0.12;
      const vertex = (x: number, z: number) => {
        // vertices past the edge are drawn in onto it, so that the top is exactly round
        const r = Math.hypot(x, z);
        const px = r > R ? (x * R) / r : x;
        const pz = r > R ? (z * R) / r : z;
        const h = sink(px, pz);
        const fx = (sink(px + eps, pz) - sink(px - eps, pz)) / (2 * eps);
        const fz = (sink(px, pz + eps) - sink(px, pz - eps)) / (2 * eps);
        const len = Math.hypot(fx, 1, fz);

        // the surface y = crown + h faces up (toward -Y): its normal is (fx, -1, fz)
        return { pos: [px, crown + h, pz] as FwVec3, nor: [fx / len, -1 / len, fz / len] as FwVec3, mat: matAt(h) };
      };

      const quad = (x0: number, z0: number, x1: number, z1: number) => {
        const v00 = vertex(x0, z0);
        const v10 = vertex(x1, z0);
        const v11 = vertex(x1, z1);
        const v01 = vertex(x0, z1);

        // two triangles, facing up
        for (const t of [[v00, v11, v10], [v00, v01, v11]]) {
          for (const v of t) b.push(v.pos, v.nor, v.mat, 1);
        }
      };

      const cell = 3.6;
      const fine = 6; // a coarse cell is cut into 6 by 6 where a relief is
      const n = Math.ceil((2 * (R + cell)) / cell);
      const x0 = -((n * cell) / 2);

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const xa = x0 + i * cell;
          const za = x0 + j * cell;
          const xb = xa + cell;
          const zb = za + cell;

          // nothing of it inside the crown
          const nearest = Math.hypot(Math.max(xa, Math.min(0, xb)), Math.max(za, Math.min(0, zb)));

          if (nearest > R) continue;

          // does a relief reach this cell?
          const reaches = pockets.some((k) => {
            const nx = Math.max(xa, Math.min(k.cx, xb));
            const nz = Math.max(za, Math.min(k.cz, zb));

            return Math.hypot(nx - k.cx, nz - k.cz) < k.rim + 1.2;
          });

          if (!reaches) {
            quad(xa, za, xb, zb);
            continue;
          }

          for (let a2 = 0; a2 < fine; a2++) {
            for (let b2 = 0; b2 < fine; b2++) {
              const sx = xa + (a2 * cell) / fine;
              const sz = za + (b2 * cell) / fine;

              if (Math.hypot(Math.max(sx, Math.min(0, sx + cell / fine)), Math.max(sz, Math.min(0, sz + cell / fine))) > R) continue;

              quad(sx, sz, sx + cell / fine, sz + cell / fine);
            }
          }
        }
      }
    }

    // Ring groove with chamfered edges, floor and walls
    const groove = (y0: number, y1: number, rA: number, rB: number) => {
      seg(y0 - bite, rA, y0, rA - bite, [0.7, 0.7], MAT_CT_EDGE);
      seg(y0, rA - bite, y0, g, [1, 0], MAT_CT_GROOVE);
      seg(y0, g, y1, g, [0, 1], MAT_CT_GROOVE);
      seg(y1, g, y1, rB - bite, [-1, 0], MAT_CT_GROOVE);
      seg(y1, rB - bite, y1 + bite, rB, [-0.7, 0.7], MAT_CT_EDGE);
    };

    // A piston ring: chamfered face, optional inlay band, flat sides and
    // a real end gap (one missing step, with the cut faces closed)
    const ring = (
      y0: number, y1: number, rOut: number,
      m: FwMaterial, gapStep: number, inlay?: FwMaterial
    ) => {
      const c = 0.45;
      const opt = { mask: (i: number) => i !== gapStep, steps: ringSteps };

      if (inlay) {
        const ym = (y0 + y1) / 2;
        seg(y0 + c, rOut, ym - 0.6, rOut, [0, 1], m, opt);
        seg(ym - 0.6, rOut, ym + 0.6, rOut, [0, 1], inlay, opt);
        seg(ym + 0.6, rOut, y1 - c, rOut, [0, 1], m, opt);
      } else {
        seg(y0 + c, rOut, y1 - c, rOut, [0, 1], m, opt);
      }

      seg(y0, rOut - c, y0 + c, rOut, [-0.7, 0.7], MAT_CT_EDGE, opt);
      seg(y1 - c, rOut, y1, rOut - c, [0.7, 0.7], MAT_CT_EDGE, opt);
      seg(y0, ringIn, y0, rOut - c, [-1, 0], m, opt);
      seg(y1, ringIn, y1, rOut - c, [1, 0], m, opt);

      const ends: Array<[number, number]> = [
        [(gapStep / ringSteps) * TAU, 1],
        [((gapStep + 1) / ringSteps) * TAU, -1],
      ];

      for (const [t, sign] of ends) {
        const ct = Math.cos(t);
        const st = Math.sin(t);

        b.flatQuad(
          [ringIn * ct, y0, ringIn * st], [rOut * ct, y0, rOut * st],
          [rOut * ct, y1, rOut * st], [ringIn * ct, y1, ringIn * st],
          [-st * sign, 0, ct * sign], MAT_CT_RING_DARK
        );
      }
    };

    // Corrugated oil-ring expander: radius ripples with the angle
    const wavyBand = (
      y0: number, y1: number, baseR: number, amp: number,
      waves: number, steps: number, m: FwMaterial
    ) => {
      const point = (t: number, y: number): [FwVec3, FwVec3] => {
        const r = baseR + amp * Math.sin(waves * t);
        const dr = amp * waves * Math.cos(waves * t);
        const ct = Math.cos(t);
        const st = Math.sin(t);
        const nx = r * ct + dr * st;
        const nz = r * st - dr * ct;
        const len = Math.hypot(nx, nz) || 1;

        return [[r * ct, y, r * st], [nx / len, 0, nz / len]];
      };

      for (let i = 0; i < steps; i++) {
        const [a0, na] = point((i / steps) * TAU, y0);
        const [b0, nb] = point(((i + 1) / steps) * TAU, y0);
        const [c0, nc] = point(((i + 1) / steps) * TAU, y1);
        const [d0, nd] = point((i / steps) * TAU, y1);

        b.push(a0, na, m, 1);
        b.push(b0, nb, m, 1);
        b.push(c0, nc, m, 1);

        b.push(a0, na, m, 1);
        b.push(c0, nc, m, 1);
        b.push(d0, nd, m, 1);
      }
    };

    // ---- Lands, grooves and rings, top to bottom. The ring pack sits high, so
    // that the holes for the wrist pin are clear of it ----

    seg(crown + 1.6, rTop, -35 - bite, rTop, [0, 1], MAT_CT_ANODIZED);

    groove(-35, -32, rTop, rL2);
    ring(-34.7, -32.3, ringOut, MAT_CT_RING, 8, MAT_CT_RING_MOLY);

    seg(-32 + bite, rL2, -29.6 - bite, rL2, [0, 1], MAT_CT_ALU);

    groove(-29.6, -26.6, rL2, rL3);
    ring(-29.3, -26.9, ringOut - 0.1, MAT_CT_RING_DARK, 66);

    seg(-26.6 + bite, rL3, -24.4 - bite, rL3, [0, 1], MAT_CT_ALU);

    // Oil control ring: rail, corrugated expander with slots, rail
    groove(-24.4, -16.6, rL3, pr);
    ring(-24.1, -22.5, ringOut, MAT_CT_RING, 46);
    ring(-18.5, -16.9, ringOut, MAT_CT_RING, 20);

    {
      const waves = 30;
      const expR = ringOut - 1.4;
      const amp = 1.0;

      wavyBand(-22.5, -18.5, expR, amp, waves, waves * 6, MAT_CT_EXPANDER);

      // Drain slots in the expander, at the bottom of every wave
      for (let k = 0; k < waves; k++) {
        const t = ((k + 0.75) / waves) * TAU;
        const hw = 0.03;
        const rise = amp * (1 - Math.cos(waves * hw));
        const rr = expR - amp + rise + 0.06;
        const p = (dt: number, y: number): FwVec3 => [
          rr * Math.cos(t + dt), y, rr * Math.sin(t + dt),
        ];

        b.flatQuad(
          p(-hw, -21.8), p(hw, -21.8), p(hw, -19.2), p(-hw, -19.2),
          [Math.cos(t), 0, Math.sin(t)], MAT_CT_HOLE
        );
      }
    }

    seg(-16.6 + bite, pr, -14.6, pr, [0, 1], MAT_CT_ALU);

    // ---- Skirt ----

    const inner = pr - 3.6;
    const yTop = -14.6; // where the skirt wall starts, under the ring pack
    const ySide = 17; // where the side walls end, under the pin
    const yMid = 8;
    const yLow = skirtEnd - 0.6;
    const rMid = pr;
    const rHigh = pr - 0.15;
    const rLow = pr - 0.47;
    const wallR = (y: number) =>
      y < yMid
        ? rHigh + ((rMid - rHigh) * (y - yTop)) / (yMid - yTop)
        : rMid + ((rLow - rMid) * (y - yMid)) / (yLow - yMid);

    // Which steps have wall. The pin's holes take 12 steps at each side; below the
    // pin only the thrust faces (the two faces that press on the cylinder), and a
    // short foot at each side, go on
    const holeSteps = 6;
    const stepAngle = (i: number) => ((((i % S) + S) % S) + 0.5) * dTheta;
    const inHole = (i: number) => {
      const m = ((i % S) + S) % S;

      return m < holeSteps || m >= S - holeSteps || (m >= S / 2 - holeSteps && m < S / 2 + holeSteps);
    };
    const isThrust = (i: number) => {
      const t = stepAngle(i);

      return Math.abs(Math.cos(t)) < 0.58 && (Math.sin(t) > 0 ? CT_PISTON_FRONT_WALL : CT_PISTON_BACK_WALL);
    };
    const isSideWall = (i: number) => Math.abs(Math.cos(stepAngle(i))) >= 0.58;
    const isFoot = (i: number) => Math.abs(Math.sin(stepAngle(i))) < 0.17;
    const upper = (i: number) => !inHole(i) && (isSideWall(i) || isThrust(i));
    const lower = (i: number) => isThrust(i) || isFoot(i);

    // Outside, in two bands: the upper one runs all round (but for the holes)
    seg(yTop, rHigh, yMid, rMid, [0, 1], MAT_CT_SKIRT, { mask: upper });
    seg(yMid, rMid, ySide, wallR(ySide), [0, 1], MAT_CT_SKIRT, { mask: upper });
    seg(ySide, wallR(ySide), yLow, rLow, [0, 1], MAT_CT_SKIRT, { mask: lower });
    seg(yLow, rLow, skirtEnd, rLow - 0.55, [0.7, 0.7], MAT_CT_EDGE, { mask: lower });

    // Inside, and the bottom faces: the end of the thrust faces and feet, and the
    // underside of the side walls where nothing goes on below
    seg(yTop, inner, ySide, inner, [0, -1], MAT_CT_SKIRT, { mask: upper });
    seg(ySide, inner, skirtEnd, inner, [0, -1], MAT_CT_SKIRT, { mask: lower });
    seg(skirtEnd, inner, skirtEnd, rLow - 0.55, [1, 0], MAT_CT_SKIRT, { mask: lower });
    seg(ySide, inner, ySide, wallR(ySide), [1, 0], MAT_CT_ALU_CAST, { mask: (i) => upper(i) && !lower(i) });

    // Two shallow oil grooves low on the thrust faces
    for (const y of [20, 23.4]) {
      seg(y, wallR(y) + 0.03, y + 1.1, wallR(y + 1.1) + 0.03, [0, 1], MAT_CT_GROOVE, { mask: isThrust });
    }

    // Etched part plate on the +Z thrust face, with three text lines
    if (CT_PISTON_FRONT_WALL) {
      const plate = (tc: number, dt: number, y0: number, y1: number, m: FwMaterial, lift: number) => {
        // A flat chord sits inside the cylinder by r(1 - cos dt): clear it
        const sag = pr * (1 - Math.cos(dt));
        const p = (t: number, y: number): FwVec3 => [
          (wallR(y) + sag + lift) * Math.cos(t), y, (wallR(y) + sag + lift) * Math.sin(t),
        ];

        b.flatQuad(
          p(tc - dt, y0), p(tc + dt, y0), p(tc + dt, y1), p(tc - dt, y1),
          [Math.cos(tc), 0, Math.sin(tc)], m
        );
      };

      plate(Math.PI / 2, 0.12, 3.5, 14, MAT_CT_PLATE, 0.05);

      for (const y of [6, 8.7, 11.4]) {
        plate(Math.PI / 2, 0.085, y, y + 0.9, MAT_CT_GROOVE, 0.09);
      }
    }

    // The faces where the thrust faces and the feet end at the sides
    for (let i = 0; i < S; i++) {
      const here = lower(i);
      const next = lower(i + 1);

      if (here === next) continue;

      const t = ((i + 1) / S) * TAU;
      const ct = Math.cos(t);
      const st = Math.sin(t);
      const sign = here ? 1 : -1; // toward the cut-away side

      b.flatQuad(
        [wallR(ySide) * ct, ySide, wallR(ySide) * st], [rLow * ct, skirtEnd, rLow * st],
        [inner * ct, skirtEnd, inner * st], [inner * ct, ySide, inner * st],
        [-st * sign, 0, ct * sign], MAT_CT_ALU_CAST
      );
    }

    // The round hole for the wrist pin, on each side: a patch of wall round it,
    // a bright chamfer, the bore through the wall, and the patch on the inside
    for (const sx of [-1, 1]) {
      const base = sx > 0 ? 0 : Math.PI;
      const halfS = pr * holeSteps * dTheta; // half the patch's width along the surface
      const hole = 13.1;
      const chamfer = 14.2;
      const n = 32;
      const outward: FwVec3 = [sx, 0, 0];

      // A point of the patch, by its place on the unrolled wall
      const at = (s: number, y: number, radius: number): FwVec3 => {
        const th = base + s / pr;

        return [radius * Math.cos(th), y, radius * Math.sin(th)];
      };

      // Where a ray from the hole's centre meets the patch's border
      const reach = (c: number, sn: number) => {
        const tx = Math.abs(c) > 1e-6 ? halfS / Math.abs(c) : Infinity;
        const ty = Math.abs(sn) > 1e-6 ? (sn < 0 ? -yTop : ySide) / Math.abs(sn) : Infinity;

        return Math.min(tx, ty);
      };

      for (const face of [0, 1]) {
        // face 0: outside; face 1: inside, the same pattern at the inner radius
        const radiusAt = (y: number) => (face === 0 ? wallR(y) : inner);
        const hint: FwVec3 = face === 0 ? outward : [-sx, 0, 0];
        const mat = face === 0 ? MAT_CT_SKIRT : MAT_CT_ALU_CAST;

        for (let j = 0; j < n; j++) {
          const a0 = (j / n) * TAU;
          const a1 = ((j + 1) / n) * TAU;
          const c0 = Math.cos(a0);
          const s0 = Math.sin(a0);
          const c1 = Math.cos(a1);
          const s1 = Math.sin(a1);
          const e0 = reach(c0, s0);
          const e1 = reach(c1, s1);

          const P = (s: number, y: number, dr = 0) => at(s, y, radiusAt(y) - dr);

          // the bore's edge (the chamfer's inner circle), the chamfer's outer circle, the border
          b.flatQuad(P(hole * c0, hole * s0, face === 0 ? 0.9 : 0), P(hole * c1, hole * s1, face === 0 ? 0.9 : 0), P(chamfer * c1, chamfer * s1), P(chamfer * c0, chamfer * s0), hint, face === 0 ? MAT_CT_EDGE : mat);
          b.flatQuad(P(chamfer * c0, chamfer * s0), P(chamfer * c1, chamfer * s1), P(e1 * c1, e1 * s1), P(e0 * c0, e0 * s0), hint, mat);
        }
      }

      // The bore through the wall, dark; the pin's end shows at the bottom of it
      b.revolve({ x0: sx * inner, r0: hole, x1: sx * (wallR(0) - 0.9), r1: hole, n: [0, -1], m: MAT_CT_GROOVE, steps: 48 });
    }

    // The feet: a short thick lug under each pin hole, on the inside of the wall
    for (const sx of [-1, 1]) {
      b.box(sx > 0 ? inner - 7 : -inner, sx > 0 ? inner : -inner + 7, ySide, skirtEnd - 3, -11, 11, MAT_CT_ALU_CAST);
    }

    // Pin bosses with a counterbore, a circlip seated inside it,
    // and the gunmetal wrist pin sitting just below the boss end
    for (const sx of [-1, 1]) {
      b.revolve({ x0: sx * 14, r0: 17.6, x1: sx * 58, r1: 17.6, n: [0, 1], m: MAT_CT_ALU_CAST, steps: 48 });
      b.revolve({ x0: sx * 58, r0: 14.6, x1: sx * 58, r1: 17.6, n: [sx, 0], m: MAT_CT_ALU_CAST, steps: 48 });
      b.revolve({ x0: sx * 58, r0: 14.6, x1: sx * 55.4, r1: 14.6, n: [0, -1], m: MAT_CT_GROOVE, steps: 48 });
      b.revolve({ x0: sx * 55.4, r0: 12, x1: sx * 55.4, r1: 14.6, n: [sx, 0], m: MAT_CT_GROOVE, steps: 48 });
      b.revolve({ x0: sx * 52, r0: 17.64, x1: sx * 54, r1: 17.64, n: [0, 1], m: MAT_CT_GROOVE, steps: 48 });
    }

    b.revolve({ x0: -57.6, r0: 12, x1: 57.6, r1: 12, n: [0, 1], m: MAT_CT_PIN, steps: 48 });
    b.revolve({ x0: 56.8, r0: 12, x1: 57.6, r1: 10.8, n: [0.7, 0.7], m: MAT_CT_EDGE, steps: 48 });
    b.disc(57.6, 0, 0, 10.8, MAT_CT_PIN_END, 24);

    // Circlip, seated in the counterbore
    b.revolve({ x0: 55.9, r0: 14.3, x1: 57.1, r1: 14.3, n: [0, 1], m: MAT_CT_CLIP, steps: 48 });
    b.revolve({ x0: 57.1, r0: 12.1, x1: 57.1, r1: 14.3, n: [1, 0], m: MAT_CT_CLIP, steps: 48 });
  }
}
