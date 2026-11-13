// The intercooler's electric fans, two in front of each core: the shroud and its motor, and the turning rotor.

import { TAU } from "../core/constants";
import type { FwVec3 } from "./builder";
import { MAT_FAN_BLADE, MAT_FAN_EDGE, MAT_FAN_MOTOR, MAT_FAN_SHROUD, MAT_IC_PLATE, MAT_STEEL_BRIGHT } from "./materials";
import { curveFromPoints, sweepTube } from "./tubes";
import type { MeshBuilder } from "./tubes";
import { IC_HALF } from "./turbo";

// ======== THE FANS ========
// Each fan is built in its own frame: x along its axis, toward the core (the air is drawn from the front, -x, through the
// core); the origin on the axis, in the plane of the core's front face. The shroud is an open frame, so that the core
// shows round the fan: a round venturi that the rotor turns in, with a narrow flange, held to the core's corners by four
// flat arms; the motor stands on five arms across the venturi, behind the rotor. The rotor has six broad, swept, twisted
// blades, as a modern fan's are.

export const FAN = {
  plateHalfY: IC_HALF.y - 4, // the frame's arms reach this far: never higher or wider than the core
  plateHalfZ: IC_HALF.z - 4,
  ringR: 84.6, // the venturi's bore
  ringDepth: 24,
  tipR: 82.3, // the blades' tips, just inside the venturi
  hubR: 22,
  blades: 6,
  x: -15, // the rotor's middle plane
  depth: 6.5, // how far a blade's chord runs along the axis at the hub (the pitch)
};

// Each core has two smaller fans side by side along it, each the fan above built at this scale, in its own half of the
// core's face; their axes this far either side of the core's middle
export const FAN_PAIR = { scale: 0.72, offset: 69 };

// One of the pair: the fan built in a frame scaled down about its axis, its shroud's arms reaching its own half's corners
export function buildSmallFan(b: MeshBuilder, part: "shroud" | "rotor") {
  const k = FAN_PAIR.scale;

  b.setTurn((p, n) => [[p[0] * k, p[1] * k, p[2] * k], n]);

  if (part === "shroud") buildFanShroud(b, FAN.plateHalfY / k, (FAN_PAIR.offset - 4) / k);
  else buildFanRotor(b);

  b.setTurn(null);
}

const P = (x: number, r: number, t: number): FwVec3 => [x, r * Math.cos(t), r * Math.sin(t)];

// ---- the shroud: the plate, the venturi with its rolled lip, the motor and its arms; it stands still ----
export function buildFanShroud(b: MeshBuilder, hy = FAN.plateHalfY, hz = FAN.plateHalfZ) {
  const { ringR, ringDepth } = FAN;
  const steps = 96;
  const plateX0 = -5;
  const plateX1 = -0.5;

  // the flange: a narrow, flat ring round the venturi, against the core
  b.revolve({ x0: plateX0, r0: ringR, x1: plateX0, r1: ringR + 9, n: [-1, 0], m: MAT_FAN_SHROUD, steps });
  b.revolve({ x0: plateX1, r0: ringR, x1: plateX1, r1: ringR + 9, n: [1, 0], m: MAT_FAN_SHROUD, steps });
  b.revolve({ x0: plateX0, r0: ringR + 9, x1: plateX1, r1: ringR + 9, n: [0, 1], m: MAT_IC_PLATE, steps });

  // the four arms, flat straps from the flange out to the core's corners, each ending in a tab with a bolt
  const strap = (a: [number, number], c: [number, number], w: number) => {
    const dy = c[0] - a[0];
    const dz = c[1] - a[1];
    const len = Math.hypot(dy, dz);
    const ny = (-dz / len) * w;
    const nz = (dy / len) * w;
    const q = (x: number, p: [number, number], s: number): FwVec3 => [x, p[0] + ny * s, p[1] + nz * s];

    b.flatQuad(q(plateX0, a, -1), q(plateX0, c, -1), q(plateX0, c, 1), q(plateX0, a, 1), [-1, 0, 0], MAT_FAN_SHROUD);
    b.flatQuad(q(plateX1, a, -1), q(plateX1, c, -1), q(plateX1, c, 1), q(plateX1, a, 1), [1, 0, 0], MAT_FAN_SHROUD);
    b.flatQuad(q(plateX0, a, 1), q(plateX0, c, 1), q(plateX1, c, 1), q(plateX1, a, 1), [0, ny, nz], MAT_FAN_SHROUD);
    b.flatQuad(q(plateX0, a, -1), q(plateX0, c, -1), q(plateX1, c, -1), q(plateX1, a, -1), [0, -ny, -nz], MAT_FAN_SHROUD);
  };

  for (const [sy, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const corner: [number, number] = [sy * (hy - 9), sz * (hz - 9)];
    const t = Math.atan2(corner[1], corner[0]);
    const from: [number, number] = [(ringR + 6) * Math.cos(t), (ringR + 6) * Math.sin(t)];

    strap(from, corner, 6.5);
    b.box(plateX0, plateX1, corner[0] - 9, corner[0] + 9, corner[1] - 9, corner[1] + 9, MAT_FAN_SHROUD);
    b.prismDir([plateX0, corner[0], corner[1]], [-1, 0, 0], [0, 1, 0], [0, 0, 1], 4.2, 3, 6, 0.3, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
  }

  // the venturi: a short tube round the rotor, its front edge rolled outward into a lip
  b.revolve({ x0: plateX0, r0: ringR, x1: -ringDepth, r1: ringR, n: [0, -1], m: MAT_FAN_SHROUD, steps });
  b.revolve({ x0: plateX0, r0: ringR + 2.6, x1: -ringDepth + 4, r1: ringR + 2.6, n: [0, 1], m: MAT_FAN_SHROUD, steps });

  for (let k = 0; k < 6; k++) {
    const a0 = (k / 6) * Math.PI;
    const a1 = ((k + 1) / 6) * Math.PI;
    const at = (a: number): [number, number] => [-ringDepth - 2.2 * Math.sin(a), ringR + 1.3 - 1.3 * Math.cos(a) * 2];

    const [x0, r0] = at(a0);
    const [x1, r1] = at(a1);

    b.revolve({ x0, r0, x1, r1, n: [-Math.sin((a0 + a1) / 2), -Math.cos((a0 + a1) / 2)], m: k === 2 || k === 3 ? MAT_IC_PLATE : MAT_FAN_SHROUD, steps });
  }

  // the motor: a can behind the rotor's hub, its back on the core, with a ribbed band and a cable gland
  b.revolve({ x0: -9.5, r0: 21, x1: -0.5, r1: 21, n: [0, 1], m: MAT_FAN_MOTOR, steps: 48 });
  b.revolve({ x0: -9.5, r0: 8, x1: -9.5, r1: 21, n: [-1, 0], m: MAT_FAN_MOTOR, steps: 48 });

  for (const x of [-7.5, -5, -2.5]) b.revolve({ x0: x - 0.5, r0: 21.6, x1: x + 0.5, r1: 21.6, n: [0, 1], m: MAT_STEEL_BRIGHT, steps: 48 });

  // five arms from the motor out to the venturi, in the plate's plane, each a flat, slightly curved strut
  for (let k = 0; k < 5; k++) {
    const t = (k / 5) * TAU + 0.31;
    const pts: FwVec3[] = [];

    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      const r = 20 + (ringR + 0.5 - 20) * u;

      pts.push(P(-3, r, t + 0.18 * u * u));
    }

    sweepTube(b, curveFromPoints(pts, 4), (u) => 2.6 - 0.8 * u, MAT_FAN_SHROUD, { segments: 8, capStart: true, capEnd: true });
  }
}

// ---- the rotor: the hub with its cap, and the blades; it turns about its axis ----
export function buildFanRotor(b: MeshBuilder) {
  const { tipR, hubR, blades, x: xm, depth } = FAN;
  const hubFront = xm - 9;
  const hubBack = xm + 7;

  // the hub: a cylinder with a domed, bright cap in front
  b.revolve({ x0: hubFront, r0: hubR, x1: hubBack, r1: hubR, n: [0, 1], m: MAT_FAN_BLADE, steps: 64 });

  for (let k = 0; k < 6; k++) {
    const a0 = (k / 6) * (Math.PI / 2);
    const a1 = ((k + 1) / 6) * (Math.PI / 2);
    const R = (a: number) => hubR * Math.cos(a);
    const X = (a: number) => hubFront - 7 * Math.sin(a);
    const am = (a0 + a1) / 2;

    b.revolve({ x0: X(a0), r0: R(a0), x1: X(a1), r1: Math.max(0.01, R(a1)), n: [-Math.sin(am), Math.cos(am)], m: k < 2 ? MAT_FAN_BLADE : MAT_FAN_EDGE, steps: 64 });
  }

  b.revolve({ x0: hubBack, r0: 6, x1: hubBack, r1: hubR, n: [1, 0], m: MAT_FAN_BLADE, steps: 64 });

  // the blades: each a thin, twisted sheet, swept forward toward its tip like a sickle, its chord steeply pitched at the
  // hub and flatter at the tip, with a rounded tip and a bright leading edge
  const NR = 12; // along the blade, root to tip
  const NC = 7; // across it, leading edge to trailing edge
  const thick = 0.9;

  for (let k = 0; k < blades; k++) {
    const t0 = (k / blades) * TAU;
    const at = (i: number, j: number, side: number): FwVec3 => {
      const u = i / NR; // root to tip
      const v = j / NC; // leading edge (0) to trailing edge (1)
      const r = hubR - 1 + (tipR - hubR + 1) * u;
      const sweep = 0.55 * u * u; // the blade curves round toward its tip
      const chord = 0.7 - 0.2 * u - 0.16 * Math.pow(u, 6); // its width, as an angle: broad (six blades do the work of more), narrower and rounded at the tip
      const t = t0 + sweep + chord * (v - 0.5);
      const pitch = depth * 1.25 * (1 - 0.45 * u); // how far its chord runs along the axis: the broader blade, the same pitch angle
      const camber = 1.6 * Math.sin(Math.PI * v) * (1 - 0.3 * u); // a slight curve across the chord

      return P(xm + pitch * (v - 0.5) * 2 - camber + side * thick * 0.5, r, t);
    };

    for (let i = 0; i < NR; i++) {
      for (let j = 0; j < NC; j++) {
        const mat = j === 0 ? MAT_FAN_EDGE : MAT_FAN_BLADE;

        b.flatQuad(at(i, j, -1), at(i + 1, j, -1), at(i + 1, j + 1, -1), at(i, j + 1, -1), [-1, 0, 0], mat);
        b.flatQuad(at(i, j, 1), at(i + 1, j, 1), at(i + 1, j + 1, 1), at(i, j + 1, 1), [1, 0, 0], mat);
      }

      // the leading and trailing edges
      b.flatQuad(at(i, 0, -1), at(i + 1, 0, -1), at(i + 1, 0, 1), at(i, 0, 1), [0, 0, 0], MAT_FAN_EDGE);
      b.flatQuad(at(i, NC, -1), at(i + 1, NC, -1), at(i + 1, NC, 1), at(i, NC, 1), [0, 0, 0], MAT_FAN_BLADE);
    }

    // the tip
    for (let j = 0; j < NC; j++) {
      b.flatQuad(at(NR, j, -1), at(NR, j + 1, -1), at(NR, j + 1, 1), at(NR, j, 1), [0, Math.cos(t0 + 0.55), Math.sin(t0 + 0.55)], MAT_FAN_EDGE);
    }
  }
}
