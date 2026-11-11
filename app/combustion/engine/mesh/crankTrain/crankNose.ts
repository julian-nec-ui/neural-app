// The crankshaft's nose: the stub the crank sprocket sits on, its key, the crank bolt, and the timing stripe.

import { CHAIN_X_WORLD, CT_X } from "../../core/constants";
import type { FwVec3 } from "../builder";
import { MAT_CT_EDGE, MAT_CT_FACE, MAT_CT_FACE_PLAIN, MAT_CT_GROOVE, MAT_CT_JOURNAL, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_PAINT } from "../materials";
import { MARK_ANGLE } from "../timingChain/chainPath";
import { CT, CT_SNOUT_X } from "./dimensions";
import type { MeshBuilder } from "../tubes";
import { crankHelpers } from "./helpers";

// The nose, drawn with the sprocket and the chain so that they sort by their real depth
export function buildCrankNose(b: MeshBuilder) {
  const { cylX, faceX, radialQuad } = crankHelpers(b);

  // The nose the crank sprocket sits on, with its key, the crank bolt and
  // the collar. It is drawn with the sprocket and the chain, not with the
  // rest of the crank train, so that all of them sort by their real depth.

  {
    const xJ0 = CT_X[0] - 28 - 72.2; // where the front journal begins

    cylX(CT_SNOUT_X, xJ0, CT.snoutR, MAT_CT_JOURNAL);
    b.disc(CT_SNOUT_X - 0.01, 0, 0, CT.snoutR, MAT_CT_FACE_PLAIN, 40, 0, 0, -1);

    // The timing line on this side of the sprocket is one strip of one width
    // (3 units each side), without a gap, from the housing to the bolt head:
    // nose, hub end, collar, washer, bolt head
    const stripeHalf = 3.0;
    const markCt = Math.cos(MARK_ANGLE);
    const markSt = Math.sin(MARK_ANGLE);

    // A strip lying across a face (facing -X) from radius r0 to r1
    const faceStripe = (x: number, r0: number, r1: number) => {
      const at = (r: number, w: number): FwVec3 => [x, r * markCt - w * markSt, r * markSt + w * markCt];

      b.flatQuad(at(r0, -stripeHalf), at(r1, -stripeHalf), at(r1, stripeHalf), at(r0, stripeHalf), [-1, 0, 0], MAT_PAINT);
    };

    // The paint over a chamfer ring, from one profile segment
    const chamferStripe = (x0: number, r0: number, x1: number, r1: number, nx: number) => {
      const half = Math.atan(stripeHalf / Math.max(r0, r1));

      b.revolve({ x0, r0, x1, r1, n: [nx, 0.7], m: MAT_PAINT, from: MARK_ANGLE - half, to: MARK_ANGLE + half, steps: 6 });
    };

    // The nose, from its end (inside the hub's bore) to the seal housing
    radialQuad(CT_SNOUT_X, xJ0 - 7.95, MARK_ANGLE, stripeHalf, CT.snoutR + 0.06, MAT_PAINT);

    // The key runs from inside the sprocket hub out along the shaft
    radialQuad(CHAIN_X_WORLD + 2, xJ0 - 9, Math.PI / 2, 2.7, CT.snoutR + 0.04, MAT_CT_GROOVE);
    radialQuad(CHAIN_X_WORLD + 4, xJ0 - 10, Math.PI / 2, 1.6, CT.snoutR + 0.08, MAT_CT_FACE_PLAIN);

    // Crank bolt and washer, clamping the sprocket on the nose
    b.prismDir([CT_SNOUT_X, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], 15.2, 2.2, 28, 0, MAT_CT_FACE_PLAIN, MAT_CT_FACE);
    b.prismDir([CT_SNOUT_X - 2.2, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], 10.6, 7, 6, 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);

    // The line goes on: over the end of the nose, along the washer's rim, across
    // its face, up the side of the bolt head and over its top, like a torque-seal stripe
    faceStripe(CT_SNOUT_X - 0.03, 15.3, CT.snoutR);
    radialQuad(CT_SNOUT_X - 2.2, CT_SNOUT_X, MARK_ANGLE, stripeHalf, 15.24, MAT_PAINT);
    faceStripe(CT_SNOUT_X - 2.23, 9.7, 15.1);

    {
      // The side of the bolt head. The line is as wide here as everywhere else,
      // so it runs over the corner of the hexagon onto the next flat: one quad
      // on each flat it touches.
      const hexRot = 0.3;
      const hexR = 10.6;
      const flat = hexR * Math.cos(Math.PI / 6);
      const step = Math.PI / 3;
      const xa = CT_SNOUT_X - 2.2;
      const xb = CT_SNOUT_X - 2.2 - 7;
      const lo = MARK_ANGLE - Math.atan(stripeHalf / flat);
      const hi = MARK_ANGLE + Math.atan(stripeHalf / flat);

      const rAtOn = (th: number, normal: number) => flat / Math.cos(th - normal) + 0.03;

      // Break the range where it crosses a corner of the hexagon
      const cuts: number[] = [lo];

      for (let k = Math.ceil((lo - hexRot) / step); hexRot + k * step < hi; k++) {
        const corner = hexRot + k * step;

        if (corner > lo) cuts.push(corner);
      }

      cuts.push(hi);

      for (let i = 0; i < cuts.length - 1; i++) {
        const t0 = cuts[i];
        const t1 = cuts[i + 1];
        const k = Math.floor(((t0 + t1) / 2 - hexRot) / step);
        const normal = hexRot + (k + 0.5) * step;
        const pt = (x: number, th: number): FwVec3 => [x, rAtOn(th, normal) * Math.cos(th), rAtOn(th, normal) * Math.sin(th)];
        const mid = (t0 + t1) / 2;

        b.flatQuad(pt(xa, t0), pt(xa, t1), pt(xb, t1), pt(xb, t0), [0, Math.cos(mid), Math.sin(mid)], MAT_PAINT);
      }

      // And across the top of the head: out to the edge, ending in a point so
      // that it stays inside the hexagon
      const xt = xb - 0.03;
      const at = (r: number, w: number): FwVec3 => [xt, r * markCt - w * markSt, r * markSt + w * markCt];
      const edge = rAtOn(MARK_ANGLE, hexRot + (Math.floor((MARK_ANGLE - hexRot) / step) + 0.5) * step) - 0.03;

      b.flatFan(at(3, 0), [at(0, -stripeHalf), at(8.5, -stripeHalf), at(edge, 0), at(8.5, stripeHalf), at(0, stripeHalf)], [-1, 0, 0], MAT_PAINT);
    }

    // A collar on the shaft where it leaves the hub, carrying the mark across
    cylX(CHAIN_X_WORLD + 13, CHAIN_X_WORLD + 18, 19.6, MAT_CT_FACE_PLAIN);
    radialQuad(CHAIN_X_WORLD + 13, CHAIN_X_WORLD + 16.8, MARK_ANGLE, stripeHalf, 19.66, MAT_PAINT);
    chamferStripe(CHAIN_X_WORLD + 16.8, 19.66, CHAIN_X_WORLD + 18.03, 18.4, 0.7);
    faceX(CHAIN_X_WORLD + 18, CT.snoutR, 19.6, MAT_CT_FACE_PLAIN);
    b.revolve({ x0: CHAIN_X_WORLD + 16.8, r0: 19.6, x1: CHAIN_X_WORLD + 18, r1: 18.4, n: [0.7, 0.7], m: MAT_CT_EDGE, steps: 72 });
  }
}
