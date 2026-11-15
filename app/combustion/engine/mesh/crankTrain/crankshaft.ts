// The crankshaft: its throws, webs, counterweights, journals and flywheel flange.

import { CT_X, R, TAU } from "../../core/constants";
import type { FwVec3 } from "../builder";
import { MAT_CT_EDGE, MAT_CT_FACE, MAT_CT_FACE_PLAIN, MAT_CT_FORGED, MAT_CT_HOLE, MAT_CT_JOURNAL, MAT_CT_OIL, MAT_CT_TEMPER, MAT_PAINT } from "../materials";
import { MARK_ANGLE } from "../timingChain/chainPath";
import { CT, CT_BETA, CT_NOSE_END, CT_REAR_NECK, shellHalf } from "./dimensions";
import type { MeshBuilder } from "../tubes";
import { crankHelpers } from "./helpers";

// The crankshaft, from the front main journal to the flywheel flange
export function buildCrankshaft(b: MeshBuilder) {
  const { cylX, faceX, shoulder, shoulderUp, radialQuad } = crankHelpers(b);

  const webOutline = (beta: number, n: number): Array<[number, number]> => {
    const thetaPin = Math.PI - beta; // polar angle of the crank pin
    const pts: Array<[number, number]> = [];

    for (let k = 0; k < n; k++) {
      const t = (k / n) * TAU;
      let phi = t - thetaPin;
      phi = Math.atan2(Math.sin(phi), Math.cos(phi));

      let r = CT.webBaseR;

      // Lobe wrapping the crank pin
      const s = R * Math.sin(phi);

      if (Math.abs(phi) < Math.PI / 2 && Math.abs(s) < CT.webLobeR) {
        r = Math.max(
          r,
          R * Math.cos(phi) + Math.sqrt(CT.webLobeR * CT.webLobeR - s * s)
        );
      }

      // Counterweight on the opposite side
      const away = Math.PI - Math.abs(phi);
      const w = Math.min(1, Math.max(0, (CT.cwHalf - away) / (CT.cwHalf * 0.3)));
      const sm = w * w * (3 - 2 * w);
      r = Math.max(r, CT.webBaseR + (CT.cwR - CT.webBaseR) * sm);

      pts.push([r * Math.cos(t), r * Math.sin(t)]);
    }

    return pts;
  };

  const web = (x0: number, x1: number, beta: number, pinSide: boolean) => {
    const n = 120;
    // its edges rounded all round: the faces set in by RE, a quarter round from them to the side wall
    const RE = 4.2;
    const outer = webOutline(beta, n);
    const pts = outer.map((v): [number, number] => {
      const l = Math.hypot(v[0], v[1]) || 1;
      const s = (l - RE) / l;

      return [v[0] * s, v[1] * s];
    });
    const thetaCw = -beta;

    // Front face and a bright machined edge band
    b.flatFan([x1, 0, 0], pts.map(([y, z]): FwVec3 => [x1, y, z]), [1, 0, 0], MAT_CT_FORGED);

    for (let k = 0; k < n; k++) {
      const p = pts[k];
      const q = pts[(k + 1) % n];
      const shrink = (v: [number, number]): [number, number] => {
        const len = Math.hypot(v[0], v[1]);
        const s = (len - 1.8) / len;
        return [v[0] * s, v[1] * s];
      };
      const pi = shrink(p);
      const qi = shrink(q);

      b.flatQuad(
        [x1 + 0.02, p[0], p[1]],
        [x1 + 0.02, q[0], q[1]],
        [x1 + 0.02, qi[0], qi[1]],
        [x1 + 0.02, pi[0], pi[1]],
        [1, 0, 0],
        MAT_CT_FACE_PLAIN
      );
    }

    // Side wall with smooth normals, and the rounded edges into both faces
    const normals = outer.map((_, k): [number, number] => {
      const a = outer[(k - 1 + n) % n];
      const c = outer[(k + 1) % n];
      const ty = c[0] - a[0];
      const tz = c[1] - a[1];
      const len = Math.hypot(ty, tz) || 1;

      return [tz / len, -ty / len];
    });
    const FS = 4; // steps round each rounded edge
    // a ring round the web: set in by s from the outline, at x
    const ringAt = (k: number, s: number, x: number): FwVec3 => {
      const v = outer[k];
      const l = Math.hypot(v[0], v[1]) || 1;
      const f = (l - s) / l;

      return [x, v[0] * f, v[1] * f];
    };
    // the strip between two rings, its normals tilted from the side wall's toward ±x by phi
    const strip = (s0: number, x0r: number, p0: number, s1: number, x1r: number, p1: number, sx: number) => {
      for (let k = 0; k < n; k++) {
        const k2 = (k + 1) % n;
        const nrm = (kk: number, phi: number): FwVec3 => [sx * Math.sin(phi), normals[kk][0] * Math.cos(phi), normals[kk][1] * Math.cos(phi)];

        b.push(ringAt(k, s0, x0r), nrm(k, p0), MAT_CT_FORGED, 1);
        b.push(ringAt(k2, s0, x0r), nrm(k2, p0), MAT_CT_FORGED, 1);
        b.push(ringAt(k2, s1, x1r), nrm(k2, p1), MAT_CT_FORGED, 1);

        b.push(ringAt(k, s0, x0r), nrm(k, p0), MAT_CT_FORGED, 1);
        b.push(ringAt(k2, s1, x1r), nrm(k2, p1), MAT_CT_FORGED, 1);
        b.push(ringAt(k, s1, x1r), nrm(k, p1), MAT_CT_FORGED, 1);
      }
    };

    strip(0, x0 + RE, 0, 0, x1 - RE, 0, 1);

    for (const sx of [1, -1]) {
      const xe = sx > 0 ? x1 : x0;

      for (let j = 0; j < FS; j++) {
        const pa = (j / FS) * (Math.PI / 2);
        const pb = ((j + 1) / FS) * (Math.PI / 2);

        strip(RE * (1 - Math.cos(pa)), xe - sx * RE * (1 - Math.sin(pa)), pa, RE * (1 - Math.cos(pb)), xe - sx * RE * (1 - Math.sin(pb)), pb, sx);
      }
    }

    // Machined boss round the shaft, and round the pin on its own web
    faceX(x1 + 0.04, CT.neckR + 0.6, 30.4, MAT_CT_FACE);

    if (pinSide) {
      const cy = -R * Math.cos(beta);
      const cz = R * Math.sin(beta);

      faceX(x1 + 0.04, CT.pinR + 0.6, 26.4, MAT_CT_FACE_PLAIN, 1, { cy, cz });
    }

    // Balance holes in the counterweight
    for (const d of [-0.32, 0.32]) {
      b.disc(x1 + 0.04, 49, thetaCw + d, 7, MAT_CT_FACE_PLAIN, 16);
      b.disc(x1 + 0.06, 49, thetaCw + d, 5.6, MAT_CT_HOLE, 16);
    }

    // The face toward the chain end: the same flat face, machined edge band,
    // bosses and balance holes
    b.flatFan([x0, 0, 0], pts.map(([y, z]): FwVec3 => [x0, y, z]), [-1, 0, 0], MAT_CT_FORGED);

    for (let k = 0; k < n; k++) {
      const p = pts[k];
      const q = pts[(k + 1) % n];
      const shrinkIn = (v: [number, number]): [number, number] => {
        const len = Math.hypot(v[0], v[1]);
        const sc = (len - 1.8) / len;

        return [v[0] * sc, v[1] * sc];
      };
      const pi = shrinkIn(p);
      const qi = shrinkIn(q);

      b.flatQuad(
        [x0 - 0.02, p[0], p[1]],
        [x0 - 0.02, q[0], q[1]],
        [x0 - 0.02, qi[0], qi[1]],
        [x0 - 0.02, pi[0], pi[1]],
        [-1, 0, 0],
        MAT_CT_FACE_PLAIN
      );
    }

    faceX(x0 - 0.04, CT.neckR + 0.6, 30.4, MAT_CT_FACE, -1);

    if (!pinSide) {
      // This web's inner face is the one the crank pin is seated on
      const cy = -R * Math.cos(beta);
      const cz = R * Math.sin(beta);

      faceX(x0 - 0.04, CT.pinR + 0.6, 26.4, MAT_CT_FACE_PLAIN, -1, { cy, cz });
    }

    for (const d of [-0.32, 0.32]) {
      b.disc(x0 - 0.04, 49, thetaCw + d, 7, MAT_CT_FACE_PLAIN, 16, 0, 0, -1);
      b.disc(x0 - 0.06, 49, thetaCw + d, 5.6, MAT_CT_HOLE, 16, 0, 0, -1);
    }
  };


  // Journals, necks, shoulders and oil features: feed holes beside the
  // shell, and a ring of oil creeping out from under each shell edge
  const journalFeatures = (xc: number, halfLen: number) => {
    const sh = shellHalf(halfLen);
    const mid = (sh + halfLen) / 2;

    b.radialDisc(xc - mid, 0, 0, CT.journalR + 0.03, 0.9, 1.9, MAT_CT_HOLE, 12);
    b.radialDisc(xc + mid, 0, 0, CT.journalR + 0.03, 2.5, 1.9, MAT_CT_HOLE, 12);

    for (const side of [-1, 1]) {
      cylX(xc + side * (sh + 0.2), xc + side * (sh + 1.8), CT.journalR + 0.04, MAT_CT_OIL);
    }
  };

  const throwCount = CT_X.length;

  // Front: a paint dab, then the front main journal
  {
    const xJ0 = CT_X[0] - 28 - 72.2; // start of the front journal
    const xJ1 = xJ0 + 60;

    // The timing mark: a wide stripe along the front journal, in line with the
    // marked tooth of the crank sprocket and the marked tooth of the flywheel
    // (the bearing shells cover the rest of the journal, so the stripe is on the
    // part that stays in sight: the neck beside the sprocket, and the shoulder)
    radialQuad(xJ0 + 0.8, xJ0 + 9.6, MARK_ANGLE, 3.0, CT.journalR + 0.06, MAT_PAINT);
    b.revolve({ x0: xJ0 - 0.04, r0: CT.snoutR + 0.9, x1: xJ0 - 0.04, r1: CT.journalR - 1.4, n: [-1, 0], m: MAT_PAINT, from: MARK_ANGLE - 0.13, to: MARK_ANGLE + 0.13, steps: 6 });

    cylX(xJ0, xJ1, CT.journalR, MAT_CT_JOURNAL);
    shoulderUp(xJ0, CT.journalR, CT.snoutR);
    b.disc(xJ0 + 0.02, 0, 0, CT.snoutR, MAT_CT_FACE_PLAIN, 40, 0, 0, -1); // the shaft goes on through this face
    shoulder(xJ1, CT.journalR, CT.neckR);
    journalFeatures((xJ0 + xJ1) / 2, (xJ1 - xJ0) / 2);
    cylX(xJ1, CT_X[0] - CT.webOut, CT.neckR, MAT_CT_JOURNAL);
    cylX(xJ1, xJ1 + 3.4, CT.neckR + 0.03, MAT_CT_TEMPER);
    cylX(CT_X[0] - CT.webOut - 3.4, CT_X[0] - CT.webOut, CT.neckR + 0.03, MAT_CT_TEMPER);
  }

  // Throws: two webs and the pin between them
  for (let i = 0; i < throwCount; i++) {
    const xc = CT_X[i];
    const beta = CT_BETA[i];
    const cy = -R * Math.cos(beta);
    const cz = R * Math.sin(beta);

    web(xc - CT.webOut, xc - CT.pinHalf, beta, true);
    web(xc + CT.pinHalf, xc + CT.webOut, beta, false);

    cylX(xc - CT.pinHalf - 0.3, xc + CT.pinHalf + 0.3, CT.pinR, MAT_CT_JOURNAL, { cy, cz });
    cylX(xc - CT.pinHalf - 0.3, xc - CT.pinHalf + 2.2, CT.pinR + 0.03, MAT_CT_TEMPER, { cy, cz });
    cylX(xc + CT.pinHalf - 2.2, xc + CT.pinHalf + 0.3, CT.pinR + 0.03, MAT_CT_TEMPER, { cy, cz });

    // Fillets where the pin meets each web
    // (a full quarter round, larger: the pin flows into the webs)
    for (const sg of [1, -1]) {
      const xw = xc - sg * CT.pinHalf;
      const FR = 4.6;

      for (let j = 0; j < 4; j++) {
        const pa = (j / 4) * (Math.PI / 2);
        const pb = ((j + 1) / 4) * (Math.PI / 2);
        const pm = (pa + pb) / 2;

        b.revolve({
          x0: xw + sg * FR * (1 - Math.cos(pa)), r0: CT.pinR + FR * (1 - Math.sin(pa)),
          x1: xw + sg * FR * (1 - Math.cos(pb)), r1: CT.pinR + FR * (1 - Math.sin(pb)),
          n: [sg * Math.sin(pm), Math.cos(pm)], m: MAT_CT_JOURNAL, cy, cz,
        });
      }
    }

    // Oil hole on the pin, in line with the crank
    const pinTheta = Math.PI - beta + Math.PI + 0.9;
    b.radialDisc(xc - 4, cy, cz, CT.pinR + 0.03, pinTheta, 2.3, MAT_CT_HOLE, 12);
  }

  // Between throws: necks, a main journal, and thrust flanges on the middle one
  const thrustMain = Math.floor((throwCount - 2) / 2);

  for (let i = 0; i < throwCount - 1; i++) {
    const xa = CT_X[i] + CT.webOut;
    const xb = CT_X[i + 1] - CT.webOut;
    const j0 = xa + 36;
    const j1 = xb - 36;

    cylX(xa, j0, CT.neckR, MAT_CT_JOURNAL);
    cylX(xa, xa + 3.4, CT.neckR + 0.03, MAT_CT_TEMPER);
    cylX(j0 - 3.4, j0, CT.neckR + 0.03, MAT_CT_TEMPER);
    cylX(j0, j1, CT.journalR, MAT_CT_JOURNAL);

    if (i !== thrustMain) shoulderUp(j0, CT.journalR, CT.neckR);

    shoulder(j1, CT.journalR, CT.neckR);
    cylX(j1, xb, CT.neckR, MAT_CT_JOURNAL);
    cylX(j1, j1 + 3.4, CT.neckR + 0.03, MAT_CT_TEMPER);
    cylX(xb - 3.4, xb, CT.neckR + 0.03, MAT_CT_TEMPER);
    journalFeatures((j0 + j1) / 2, (j1 - j0) / 2);

    if (i === thrustMain) {
      // Thrust faces either side of the middle main bearing
      cylX(j0 - 6, j0, CT.journalR + 9, MAT_CT_FORGED);
      shoulderUp(j0 - 6, CT.journalR + 9, CT.neckR);
      faceX(j0, CT.journalR + 0.5, CT.journalR + 9, MAT_CT_FACE, 1);
      cylX(j1, j1 + 6, CT.journalR + 9, MAT_CT_FORGED);
      faceX(j1, CT.journalR + 0.5, CT.journalR + 9, MAT_CT_FACE, -1);
      shoulder(j1 + 6, CT.journalR + 9, CT.neckR);
    }
  }

  // Rear: neck, last main journal, flywheel flange and pilot nose
  {
    const xr = CT_X[throwCount - 1] + CT.webOut;
    const j0 = xr + CT_REAR_NECK;
    const j1 = j0 + 60;
    const f0 = j1 + 14;
    const f1 = f0 + 14;

    cylX(xr, j0, CT.neckR, MAT_CT_JOURNAL);
    cylX(xr, xr + 3.4, CT.neckR + 0.03, MAT_CT_TEMPER);
    cylX(j0 - 3.4, j0, CT.neckR + 0.03, MAT_CT_TEMPER);
    cylX(j0, j1, CT.journalR, MAT_CT_JOURNAL);
    shoulder(j1, CT.journalR, CT.neckR);
    shoulderUp(j0, CT.journalR, CT.neckR);
    journalFeatures((j0 + j1) / 2, (j1 - j0) / 2);
    cylX(j1, f0, CT.neckR, MAT_CT_JOURNAL);
    cylX(j1, j1 + 3.4, CT.neckR + 0.03, MAT_CT_TEMPER);
    cylX(f0 - 3.4, f0, CT.neckR + 0.03, MAT_CT_TEMPER);

    // Flywheel flange with its bolt holes
    cylX(f0, f1, 36, MAT_CT_FORGED);
    faceX(f1, CT.neckR, 34.2, MAT_CT_FACE, 1);
    b.revolve({ x0: f1 - 1.2, r0: 36, x1: f1, r1: 34.8, n: [0.7, 0.7], m: MAT_CT_EDGE });

    // The side toward the chain end, with the same pattern of bolt holes
    faceX(f0, CT.neckR, 34.8, MAT_CT_FACE, -1);
    b.revolve({ x0: f0 + 1.2, r0: 36, x1: f0, r1: 34.8, n: [-0.7, 0.7], m: MAT_CT_EDGE });

    for (let k = 0; k < 8; k++) {
      const t = ((k + 0.5) / 8) * TAU;
      b.disc(f0 - 0.04, 27, t, 3.1, MAT_CT_EDGE, 14, 0, 0, -1);
      b.disc(f0 - 0.07, 27, t, 2.2, MAT_CT_HOLE, 14, 0, 0, -1);
    }

    for (let k = 0; k < 8; k++) {
      const t = ((k + 0.5) / 8) * TAU;
      b.disc(f1 + 0.04, 27, t, 3.1, MAT_CT_EDGE, 14);
      b.disc(f1 + 0.07, 27, t, 2.2, MAT_CT_HOLE, 14);
    }

    cylX(f1, CT_NOSE_END, CT.neckR, MAT_CT_JOURNAL);
  }
}
