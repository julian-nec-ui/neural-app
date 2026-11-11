// Small shapes the crankshaft, its nose and the main bearings are all built with.

import type { FwMaterial, FwVec3 } from "../builder";
import { MAT_CT_EDGE, MAT_CT_FACE_PLAIN } from "../materials";
import type { MeshBuilder } from "../tubes";

// The shapes, drawn into the builder b
export function crankHelpers(b: MeshBuilder) {
  const cylX = (
    x0: number,
    x1: number,
    r: number,
    m: FwMaterial,
    extra: { cy?: number; cz?: number; from?: number; to?: number } = {}
  ) =>
    b.revolve({ x0, r0: r, x1, r1: r, n: [0, 1], m, ...extra });

  const faceX = (
    x: number,
    r0: number,
    r1: number,
    m: FwMaterial,
    sign = 1,
    extra: { cy?: number; cz?: number; from?: number; to?: number } = {}
  ) =>
    b.revolve({ x0: x, r0, x1: x, r1, n: [sign, 0], m, ...extra });

  // Step down toward +X: a visible shoulder with a chamfered edge
  const shoulder = (x: number, rBig: number, rSmall: number) => {
    faceX(x, rSmall, rBig - 1.2, MAT_CT_FACE_PLAIN);
    b.revolve({ x0: x - 1.2, r0: rBig, x1: x, r1: rBig - 1.2, n: [0.7, 0.7], m: MAT_CT_EDGE });
  };

  // Step up toward +X: the same shoulder, seen from the chain end
  const shoulderUp = (x: number, rBig: number, rSmall: number) => {
    faceX(x, rSmall, rBig - 1.2, MAT_CT_FACE_PLAIN, -1);
    b.revolve({ x0: x + 1.2, r0: rBig, x1: x, r1: rBig - 1.2, n: [-0.7, 0.7], m: MAT_CT_EDGE });
  };

  const radialQuad = (
    xA: number,
    xB: number,
    theta: number,
    halfWidth: number,
    r: number,
    m: FwMaterial
  ) => {
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const p = (x: number, w: number): FwVec3 => [
      x,
      r * ct - w * st,
      r * st + w * ct,
    ];

    b.flatQuad(p(xA, -halfWidth), p(xB, -halfWidth), p(xB, halfWidth), p(xA, halfWidth), [0, ct, st], m);
  };

  return { cylX, faceX, shoulder, shoulderUp, radialQuad };
}
