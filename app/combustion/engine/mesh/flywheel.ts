// The flywheel, with its ring gear and timing mark.

import { FW_GEAR_HALF, FW_SCALE, TAU } from "../core/constants";
import { RING, RING_TEETH, ringHalfAngle } from "./gearing";
import { FW_STRIDE, createMeshBuilder } from "./builder";
import type { FwVec3 } from "./builder";
import { MAT_BEARING, MAT_BOLT_HEAD, MAT_BOLT_SIDE, MAT_CAST, MAT_CAST_FACE, MAT_CAVITY, MAT_EDGE, MAT_FRICTION_A, MAT_FRICTION_B, MAT_FRICTION_C, MAT_GEAR_BODY, MAT_GEAR_ROOT, MAT_HOLE, MAT_HUB, MAT_LAND, MAT_PAINT, MAT_PIN, MAT_RACE, MAT_SEAM, MAT_THREAD, MAT_TICK, MAT_TOOTH, MAT_TOOTH_END, MAT_TOOTH_TIP, MAT_TURNED, MAT_WALL, MAT_WASHER } from "./materials";

/* =========================================================
   FLYWHEEL MESH (WebGL)

   Built once, in a local frame:
     - the crankshaft is the X axis
     - +X is the face that points at the viewer
     - the disc lies in the YZ plane, perpendicular to the shaft

   Modelled in base units, then scaled by FW_SCALE. Per-frame
   work is only a spin uniform; a depth buffer resolves
   visibility between rim, ring-gear teeth, windows and hub.
   ========================================================= */

const FW_SECTOR_STEPS = 24;
const FW_STEPS = FW_SECTOR_STEPS * 6;
const FW_WINDOW_FROM = 3; // first window step inside a sector
const FW_WINDOW_TO = 21; // one past the last window step

export const FW_DIM = {
  rimInner: 51,
  rimOuter: 64,
  rimHalf: 11,
  rimChamfer: 1.2,
  innerLandOut: 53.4,
  frictionOut: 58.6,
  frictionDrop: 0.55,
  landOut: 62.8,
  webFront: 3,
  webBack: -3,
  windowIn: 30,
  windowOut: 47,
  hubRadius: 22,
  hubFront: 14,
  flangeRadius: 19.5,
  boreRadius: 8.5,
  gearRoot: RING.root / FW_SCALE, // the ring gear's teeth: their roots, and how many (see gearing.ts)
  gearTeeth: RING_TEETH,
};

function buildFlywheelVertices(): Float32Array {
  const {
    out, polar, push, flatTri, flatQuad, flatFan, revolve, disc, prism,
  } = createMeshBuilder(FW_STEPS);

  /* Hex bolt on a round washer. */
  const hexBolt = (
    x: number,
    r: number,
    t: number,
    radius: number,
    height: number
  ) => {
    prism(x, r, t, radius * 1.4, 0.5, 18, 0, MAT_WASHER, MAT_WASHER);
    prism(x + 0.5, r, t, radius, height, 6, t, MAT_BOLT_HEAD, MAT_BOLT_SIDE);
  };

  const D = FW_DIM;
  const lip = D.rimHalf - D.rimChamfer;
  const frontX = D.rimHalf;
  const frictionX = D.rimHalf - D.frictionDrop;
  const gearHalf = FW_GEAR_HALF;

  /* ---- Rim: cast body with a turned clutch face ---- */

  // Recessed inner wall: front of the web, then behind it
  revolve({ x0: lip, r0: D.rimInner, x1: 5, r1: D.rimInner, n: [0, -1], m: MAT_CAVITY, occ0: 1, occ1: 0.42 });
  revolve({ x0: D.webBack, r0: D.rimInner, x1: -lip, r1: D.rimInner, n: [0, -1], m: MAT_CAVITY, occ0: 0.3, occ1: 0.3 });

  // Inner chamfer, inner land, step down to the friction face
  revolve({ x0: frontX, r0: D.rimInner + D.rimChamfer, x1: lip, r1: D.rimInner, n: [0.7, -0.7], m: MAT_EDGE });
  revolve({ x0: frontX, r0: D.rimInner + D.rimChamfer, x1: frontX, r1: D.innerLandOut, n: [1, 0], m: MAT_TURNED });
  revolve({ x0: frontX, r0: D.innerLandOut, x1: frictionX, r1: D.innerLandOut, n: [0, 1], m: MAT_EDGE });

  // Friction face: ground, with a faint heat tint toward the outside
  revolve({ x0: frictionX, r0: D.innerLandOut, x1: frictionX, r1: 55.3, n: [1, 0], m: MAT_FRICTION_A });
  revolve({ x0: frictionX, r0: 55.3, x1: frictionX, r1: 57.2, n: [1, 0], m: MAT_FRICTION_B });
  revolve({ x0: frictionX, r0: 57.2, x1: frictionX, r1: D.frictionOut, n: [1, 0], m: MAT_FRICTION_C });

  // Step back up to the outer land, then chamfer to the rim cylinder
  revolve({ x0: frictionX, r0: D.frictionOut, x1: frontX, r1: D.frictionOut, n: [0, -1], m: MAT_EDGE });
  revolve({ x0: frontX, r0: D.frictionOut, x1: frontX, r1: D.landOut, n: [1, 0], m: MAT_LAND });
  revolve({ x0: frontX, r0: D.landOut, x1: lip, r1: D.rimOuter, n: [0.7, 0.7], m: MAT_EDGE });

  // Rim cylinder (the ring gear sits on it) and the back chamfer
  revolve({ x0: lip, r0: D.rimOuter, x1: -lip, r1: D.rimOuter, n: [0, 1], m: MAT_CAST });
  revolve({ x0: -lip, r0: D.rimOuter, x1: -D.rimHalf, r1: D.rimOuter - D.rimChamfer, n: [-0.7, 0.7], m: MAT_EDGE });

  // Clutch-cover bolt holes (countersunk, threaded) and dowel pins
  for (let k = 0; k < 6; k++) {
    const t = ((k + 0.5) / 6) * TAU;
    disc(frontX + 0.03, 60.7, t, 2.1, MAT_EDGE, 16);
    disc(frontX + 0.06, 60.7, t, 1.45, MAT_HOLE, 16);
    disc(frontX + 0.08, 60.7, t, 0.85, MAT_THREAD, 12);
  }

  for (let k = 0; k < 3; k++) {
    prism(frontX, 60.7, (k / 3) * TAU, 1.35, 1.4, 14, 0, MAT_PIN, MAT_PIN);
  }

  // Degree ticks on the outer chamfer, longer every 30 degrees
  for (let k = 0; k < 36; k++) {
    const t = (k / 36) * TAU;
    const long = k % 3 === 0;
    const w = long ? 0.013 : 0.008;
    const u0 = long ? 0.08 : 0.3;
    const u1 = 0.92;
    const at = (u: number, a: number): FwVec3 =>
      polar(
        frontX - D.rimChamfer * u + 0.03,
        D.landOut + (D.rimOuter - D.landOut) * u + 0.03,
        a
      );

    flatQuad(at(u0, t - w), at(u0, t + w), at(u1, t + w), at(u1, t - w), [0.7, 0.7, 0], MAT_TICK);
  }

  // Timing mark: a painted triangle on the friction face, its point toward tooth 0
  {
    const t0 = (0.5 / D.gearTeeth) * TAU; // angle of tooth 0
    const w = 0.085; // half-width of the base, as an angle
    const x = frictionX + 0.05;

    flatTri(
      polar(x, 53.6, t0 - w), // base, toward the hub
      polar(x, 53.6, t0 + w),
      polar(x, 58.4, t0), // point, outward, aimed at the tooth
      [1, 0, 0], MAT_PAINT
    );
  }

  // The same mark carried out onto the ring gear's front face
  {
    const t0 = (0.5 / D.gearTeeth) * TAU;
    const w = 0.05;
    const x = gearHalf + 0.06;
    flatQuad(
      polar(x, D.rimOuter + 0.6, t0 - w), polar(x, D.rimOuter + 0.6, t0 + w),
      polar(x, D.gearRoot - 0.9, t0 + w), polar(x, D.gearRoot - 0.9, t0 - w),
      [1, 0, 0], MAT_PAINT
    );
  }

  /* ---- Ring gear: shrunk onto the rim ---- */

  // Front face with a dark seam against the rim, and a chamfered root edge
  revolve({ x0: gearHalf + 0.03, r0: D.rimOuter, x1: gearHalf + 0.03, r1: D.rimOuter + 0.45, n: [1, 0], m: MAT_SEAM });
  revolve({ x0: gearHalf, r0: D.rimOuter + 0.45, x1: gearHalf, r1: D.gearRoot - 0.8, n: [1, 0], m: MAT_GEAR_BODY, occ0: 0.7, occ1: 1 });
  revolve({ x0: gearHalf, r0: D.gearRoot - 0.8, x1: gearHalf - 0.8, r1: D.gearRoot, n: [0.7, 0.7], m: MAT_EDGE });
  revolve({ x0: gearHalf - 0.8, r0: D.gearRoot, x1: -gearHalf + 0.8, r1: D.gearRoot, n: [0, 1], m: MAT_GEAR_ROOT, occ0: 0.8, occ1: 0.8 });

  {
    const rb = D.gearRoot;
    const rt = RING.tip / FW_SCALE;
    const height = rt - rb;
    const chamferFront = 1.1;
    const chamferBack = 1.5; // the side the pinion comes in from: a larger chamfer leads its teeth in
    const xFrontMid = gearHalf - chamferFront;
    const xBackMid = -(gearHalf - chamferBack);

    // Involute teeth (see gearing.ts): a fillet at the root, the flank's curve, and a rounded tip; the chamfers at the
    // ends keep their size in absolute units. [height fraction, half width as arc length], both in base units
    const FLANK_ROWS = 14;
    const flank: Array<[number, number]> = Array.from({ length: FLANK_ROWS + 1 }, (_, i) => {
      // closer together at the root's fillet and at the tip's round, where the outline bends most
      const u = i / FLANK_ROWS;
      const hf = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
      const R = (rb + height * hf) * FW_SCALE;

      return [hf, Math.max(0.15 * FW_SCALE, ringHalfAngle(Math.min(RING.tip, Math.max(RING.root, R))) * R) / FW_SCALE];
    });

    type Pt = { y: number; z: number; hf: number };

    const rc = rb + height * 0.5;
    const toothOcc = (hf: number) =>
      0.38 + 0.62 * Math.min(1, (hf * height) / 3.8);

    for (let k = 0; k < D.gearTeeth; k++) {
      const theta = ((k + 0.5) / D.gearTeeth) * TAU;
      const cy = Math.cos(theta);
      const cz = Math.sin(theta);

      // Tooth 0 is painted: the same paint as the mark on the friction face
      const marked = k === 0;
      const toothFlank = marked ? MAT_PAINT : MAT_TOOTH;
      const toothTip = marked ? MAT_PAINT : MAT_TOOTH_TIP;
      const toothEnd = marked ? MAT_PAINT : MAT_TOOTH_END;

      // Tooth outline from the left root over the tip to the right root;
      // `inset` shrinks it toward the tip, which is how the chamfers are made
      const outline = (inset: number): Pt[] => {
        const pts: Pt[] = [];

        const make = (index: number, side: number): Pt => {
          const [hf, hw0] = flank[index];
          // End chamfers: the top edge drops by `inset`, the side edges
          // move in by `inset`, but never at the root where the tooth
          // joins the ring (the drop grows smoothly toward the tip, so
          // the outline never folds over itself)
          const radial = hf * hf * hf;
          const lateral = Math.min(1, (hf * height) / 0.9);
          const r = rb + height * hf - inset * radial;
          const hw = Math.max(0.3, hw0 - inset * lateral);
          const a = theta + (side * hw) / r;

          return { y: r * Math.cos(a), z: r * Math.sin(a), hf };
        };

        for (let i = 0; i < flank.length; i++) pts.push(make(i, -1));
        for (let i = flank.length - 1; i >= 0; i--) pts.push(make(i, 1));

        return pts;
      };

      const full = outline(0);
      const front = outline(chamferFront);
      const back = outline(chamferBack);
      const count = full.length;
      const tipSegment = flank.length - 1; // segment between the two tip points
      const TIP_ROWS = 2; // the rounded tip: this many segments either side of it are bright, worn metal

      // One crisp normal per face in the YZ plane, pointing away from the tooth core
      const segmentNormals: Array<[number, number]> = [];

      for (let i = 0; i < count - 1; i++) {
        const dy = full[i + 1].y - full[i].y;
        const dz = full[i + 1].z - full[i].z;
        let ny = dz;
        let nz = -dy;
        const length = Math.hypot(ny, nz) || 1;
        ny /= length;
        nz /= length;

        const my = (full[i].y + full[i + 1].y) / 2 - cy * rc;
        const mz = (full[i].z + full[i + 1].z) / 2 - cz * rc;

        if (ny * my + nz * mz < 0) {
          ny = -ny;
          nz = -nz;
        }

        segmentNormals.push([ny, nz]);
      }

      // The flank is curved: each point's normal is the mean of its two segments', so that it shades smoothly, except at
      // the root, where the tooth meets the ring
      const pointNormals: Array<[number, number]> = full.map((_, i) => {
        const a = segmentNormals[Math.max(0, i - 1)];
        const b = segmentNormals[Math.min(count - 2, i)];
        const ny = a[0] + b[0];
        const nz = a[1] + b[1];
        const length = Math.hypot(ny, nz) || 1;

        return [ny / length, nz / length];
      });

      // Straight middle section: the working flanks and the tip
      for (let i = 0; i < count - 1; i++) {
        // The rounded top is bright, worn metal
        const m =
          i >= tipSegment - TIP_ROWS && i <= tipSegment + TIP_ROWS
            ? toothTip
            : toothFlank;
        const pa = full[i];
        const pb = full[i + 1];
        const na = i === 0 ? segmentNormals[i] : pointNormals[i];
        const nb = i + 1 === count - 1 ? segmentNormals[i] : pointNormals[i + 1];
        const oa = toothOcc(pa.hf);
        const ob = toothOcc(pb.hf);

        const a0: FwVec3 = [xBackMid, pa.y, pa.z];
        const b0: FwVec3 = [xBackMid, pb.y, pb.z];
        const a1: FwVec3 = [xFrontMid, pa.y, pa.z];
        const b1: FwVec3 = [xFrontMid, pb.y, pb.z];

        push(a0, [0, na[0], na[1]], m, oa);
        push(b0, [0, nb[0], nb[1]], m, ob);
        push(b1, [0, nb[0], nb[1]], m, ob);

        push(a0, [0, na[0], na[1]], m, oa);
        push(b1, [0, nb[0], nb[1]], m, ob);
        push(a1, [0, na[0], na[1]], m, oa);
      }

      // Chamfers: a loft from the full outline to the inset one, both ends
      const loft = (
        from: Pt[],
        xFrom: number,
        to: Pt[],
        xTo: number
      ) => {
        for (let i = 0; i < count - 1; i++) {
          const a: FwVec3 = [xFrom, from[i].y, from[i].z];
          const b: FwVec3 = [xFrom, from[i + 1].y, from[i + 1].z];
          const c: FwVec3 = [xTo, to[i + 1].y, to[i + 1].z];
          const d: FwVec3 = [xTo, to[i].y, to[i].z];

          const qy = (a[1] + b[1] + c[1] + d[1]) / 4 - cy * rc;
          const qz = (a[2] + b[2] + c[2] + d[2]) / 4 - cz * rc;
          const qx = ((xFrom + xTo) / 2) * 0.25;

          const oa = toothOcc(from[i].hf);
          const ob = toothOcc(from[i + 1].hf);
          const oc = toothOcc(to[i + 1].hf);
          const od = toothOcc(to[i].hf);

          flatTri(a, b, c, [qx, qy, qz], toothTip, oa, ob, oc);
          flatTri(a, c, d, [qx, qy, qz], toothTip, oa, oc, od);
        }
      };

      loft(full, xFrontMid, front, gearHalf);
      loft(full, xBackMid, back, -gearHalf);

      // End faces
      const cap = (pts: Pt[], x: number, hintX: number) => {
        const ring: FwVec3[] = pts.map((p) => [x, p.y, p.z]);
        flatFan([x, cy * rc, cz * rc], ring, [hintX, 0, 0], toothEnd, 0.85);
      };

      cap(front, gearHalf, 1);
      cap(back, -gearHalf, -1);
    }
  }

  /* ---- Web with six lightening windows ---- */

  const inSpoke = (i: number) => {
    const j = i % FW_SECTOR_STEPS;
    return j < FW_WINDOW_FROM || j >= FW_WINDOW_TO;
  };
  const inWindow = (i: number) => !inSpoke(i);

  const bevel = 0.9;
  const xf = D.webFront;
  const xb = D.webBack;
  const rIn = D.windowIn;
  const rOut = D.windowOut;

  // Fillets blending the web into the hub and into the rim wall
  revolve({ x0: 5.5, r0: D.hubRadius, x1: xf, r1: D.hubRadius + 2.5, n: [0.7, 0.7], m: MAT_CAST, occ0: 0.7, occ1: 0.5 });
  revolve({ x0: xf, r0: D.rimInner - 2, x1: 5, r1: D.rimInner, n: [0.7, -0.7], m: MAT_CAST, occ0: 0.5, occ1: 0.7 });

  // Front face: hub ring, spokes, rim ring
  revolve({ x0: xf, r0: D.hubRadius + 2.5, x1: xf, r1: rIn - bevel, n: [1, 0], m: MAT_CAST_FACE, occ0: 0.5, occ1: 1 });
  revolve({ x0: xf, r0: rIn - bevel, x1: xf, r1: rOut + bevel, n: [1, 0], m: MAT_CAST_FACE, mask: inSpoke });
  revolve({ x0: xf, r0: rOut + bevel, x1: xf, r1: D.rimInner - 2, n: [1, 0], m: MAT_CAST_FACE, occ0: 1, occ1: 0.55 });

  // Beveled window edges and window walls
  revolve({ x0: xf, r0: rIn - bevel, x1: xf - bevel, r1: rIn, n: [0.7, 0.7], m: MAT_EDGE, mask: inWindow });
  revolve({ x0: xf - bevel, r0: rOut, x1: xf, r1: rOut + bevel, n: [0.7, -0.7], m: MAT_EDGE, mask: inWindow });
  revolve({ x0: xf - bevel, r0: rOut, x1: xb + bevel, r1: rOut, n: [0, -1], m: MAT_WALL, occ0: 0.8, occ1: 0.3, mask: inWindow });
  revolve({ x0: xf - bevel, r0: rIn, x1: xb + bevel, r1: rIn, n: [0, 1], m: MAT_WALL, occ0: 0.8, occ1: 0.3, mask: inWindow });

  for (let k = 0; k < 6; k++) {
    const sides: Array<[number, number]> = [
      [((k * FW_SECTOR_STEPS + FW_WINDOW_FROM) / FW_STEPS) * TAU, 1],
      [((k * FW_SECTOR_STEPS + FW_WINDOW_TO) / FW_STEPS) * TAU, -1],
    ];

    for (const [t, sign] of sides) {
      flatQuad(
        polar(xf, rIn, t),
        polar(xf, rOut, t),
        polar(xb, rOut, t),
        polar(xb, rIn, t),
        [0, -Math.sin(t) * sign, Math.cos(t) * sign],
        MAT_WALL,
        0.6
      );
    }

    // One bolt on the middle of each spoke
    hexBolt(xf, 38.5, (k / 6) * TAU, 2.5, 1.7);
  }

  /* ---- Hub, crank flange and pilot bearing ---- */

  revolve({ x0: D.hubFront - 1.5, r0: D.hubRadius, x1: 5.5, r1: D.hubRadius, n: [0, 1], m: MAT_HUB, occ0: 1, occ1: 0.55 });
  revolve({ x0: D.hubFront, r0: D.flangeRadius, x1: D.hubFront - 1.5, r1: D.hubRadius, n: [0.7, 0.7], m: MAT_EDGE });
  revolve({ x0: D.hubFront, r0: D.boreRadius + 1.2, x1: D.hubFront, r1: D.flangeRadius, n: [1, 0], m: MAT_TURNED });
  revolve({ x0: D.hubFront, r0: D.boreRadius, x1: D.hubFront - 0.9, r1: D.boreRadius, n: [0, -1], m: MAT_CAVITY, occ0: 0.8, occ1: 0.4 });
  revolve({ x0: D.hubFront, r0: D.boreRadius, x1: D.hubFront, r1: D.boreRadius + 1.2, n: [0.7, 0.7], m: MAT_EDGE });

  // Pilot bearing: outer ring, race with balls, shaft-end hole
  revolve({ x0: D.hubFront - 0.9, r0: 5.3, x1: D.hubFront - 0.9, r1: D.boreRadius - 0.1, n: [1, 0], m: MAT_BEARING });
  revolve({ x0: D.hubFront - 1.1, r0: 3.4, x1: D.hubFront - 1.1, r1: 5.3, n: [1, 0], m: MAT_RACE, occ0: 0.8, occ1: 0.8 });

  for (let k = 0; k < 9; k++) {
    disc(D.hubFront - 1.0, 4.35, (k / 9) * TAU, 0.72, MAT_BEARING, 10);
  }

  disc(D.hubFront - 1.2, 0, 0, 3.4, MAT_HOLE, 20);

  // Flange bolts on washers, and two dowel pins
  for (let k = 0; k < 8; k++) {
    hexBolt(D.hubFront, 14, ((k + 0.5) / 8) * TAU, 2.4, 2.1);
  }

  prism(D.hubFront, 17.2, 0, 1.2, 1.2, 14, 0, MAT_PIN, MAT_PIN);
  prism(D.hubFront, 17.2, Math.PI, 1.2, 1.2, 14, 0, MAT_PIN, MAT_PIN);

  /* ---- Engine side: the face toward the crankshaft ---- */

  // Rim: a turned back face with its two chamfers, and three balancing holes
  revolve({ x0: -D.rimHalf, r0: D.rimInner + D.rimChamfer, x1: -lip, r1: D.rimInner, n: [-0.7, -0.7], m: MAT_EDGE });
  revolve({ x0: -D.rimHalf, r0: D.rimInner + D.rimChamfer, x1: -D.rimHalf, r1: D.rimOuter - D.rimChamfer, n: [-1, 0], m: MAT_TURNED });

  for (let k = 0; k < 3; k++) {
    const t = ((k + 0.35) / 3) * TAU;
    disc(-D.rimHalf - 0.03, 57.6, t, 2.4, MAT_EDGE, 16, 0, 0, -1);
    disc(-D.rimHalf - 0.06, 57.6, t, 1.7, MAT_HOLE, 16, 0, 0, -1);
  }

  // Ring gear: back face, seam against the rim, and a chamfered root edge
  revolve({ x0: -gearHalf - 0.03, r0: D.rimOuter, x1: -gearHalf - 0.03, r1: D.rimOuter + 0.45, n: [-1, 0], m: MAT_SEAM });
  revolve({ x0: -gearHalf, r0: D.rimOuter + 0.45, x1: -gearHalf, r1: D.gearRoot - 0.8, n: [-1, 0], m: MAT_GEAR_BODY, occ0: 0.7, occ1: 1 });
  revolve({ x0: -gearHalf + 0.8, r0: D.gearRoot, x1: -gearHalf, r1: D.gearRoot - 0.8, n: [-0.7, 0.7], m: MAT_EDGE });

  // Web: fillets, the flat back face with the six windows, and their bevels
  revolve({ x0: -5.5, r0: D.hubRadius, x1: xb, r1: D.hubRadius + 2.5, n: [-0.7, 0.7], m: MAT_CAST, occ0: 0.7, occ1: 0.5 });
  revolve({ x0: xb, r0: D.rimInner - 2, x1: -5, r1: D.rimInner, n: [-0.7, -0.7], m: MAT_CAST, occ0: 0.5, occ1: 0.7 });

  revolve({ x0: xb, r0: D.hubRadius + 2.5, x1: xb, r1: rIn - bevel, n: [-1, 0], m: MAT_CAST_FACE, occ0: 0.5, occ1: 1 });
  revolve({ x0: xb, r0: rIn - bevel, x1: xb, r1: rOut + bevel, n: [-1, 0], m: MAT_CAST_FACE, mask: inSpoke });
  revolve({ x0: xb, r0: rOut + bevel, x1: xb, r1: D.rimInner - 2, n: [-1, 0], m: MAT_CAST_FACE, occ0: 1, occ1: 0.55 });

  revolve({ x0: xb, r0: rIn - bevel, x1: xb + bevel, r1: rIn, n: [-0.7, 0.7], m: MAT_EDGE, mask: inWindow });
  revolve({ x0: xb + bevel, r0: rOut, x1: xb, r1: rOut + bevel, n: [-0.7, -0.7], m: MAT_EDGE, mask: inWindow });

  // Hub: the boss the crank flange seats against
  revolve({ x0: -5.5, r0: D.hubRadius, x1: -10, r1: D.hubRadius, n: [0, 1], m: MAT_HUB, occ0: 1, occ1: 0.7 });
  revolve({ x0: -10, r0: D.boreRadius + 8, x1: -10, r1: D.hubRadius - 0.8, n: [-1, 0], m: MAT_TURNED });
  revolve({ x0: -9.2, r0: D.hubRadius, x1: -10, r1: D.hubRadius - 0.8, n: [-0.7, 0.7], m: MAT_EDGE });

  // The timing mark again, on this side: a painted triangle on the rim, its
  // point toward tooth 0, and the same dab on the ring gear
  {
    const t0 = (0.5 / D.gearTeeth) * TAU;
    const w = 0.085;
    const x = -D.rimHalf - 0.05;

    flatTri(
      polar(x, 53.8, t0 - w),
      polar(x, 53.8, t0 + w),
      polar(x, 61.6, t0),
      [-1, 0, 0], MAT_PAINT
    );

    const wg = 0.05;
    const xg = -gearHalf - 0.06;

    flatQuad(
      polar(xg, D.rimOuter + 0.6, t0 - wg), polar(xg, D.rimOuter + 0.6, t0 + wg),
      polar(xg, D.gearRoot - 0.9, t0 + wg), polar(xg, D.gearRoot - 0.9, t0 - wg),
      [-1, 0, 0], MAT_PAINT
    );
  }

  const scaled = new Float32Array(out.length);

  for (let i = 0; i < out.length; i += FW_STRIDE) {
    scaled[i] = out[i] * FW_SCALE;
    scaled[i + 1] = out[i + 1] * FW_SCALE;
    scaled[i + 2] = out[i + 2] * FW_SCALE;

    for (let j = 3; j < FW_STRIDE; j++) {
      scaled[i + j] = out[i + j];
    }
  }

  return scaled;
}

export const FW_VERTICES = buildFlywheelVertices();
