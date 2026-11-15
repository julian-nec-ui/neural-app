// On each head's top: the spark plugs' ignition leads and the fuel rail. From each plug's cap a lead rises in its boot, arcs
// over to a loom running the length of the head on one side, and the loom runs forward to the coil pack at the head's front;
// on the other side the fuel rail, a steel pipe along the head, with a cup and a clip over each injector, fed at the front
// through a braided line and a pressure regulator at its rear end.

import { CT_X, INJ, PLUG } from "../core/constants";
import type { FwVec3 } from "./builder";
import { HEAD } from "./head";
import { MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_FUEL_FIN, MAT_FUEL_LINE, MAT_FUEL_PIPE, MAT_FUEL_RAIL, MAT_RAIL_CLAMP, MAT_WELD, MAT_IGN_BOOT, MAT_IGN_COIL, MAT_IGN_LEAD, MAT_IGN_LOOM, MAT_INJ_BRASS } from "./materials";
import { curveFromPoints, sweepTube } from "./tubes";
import { VT } from "./valvetrain";
import type { MeshBuilder } from "./tubes";

const LOOM_Z = 58; // the loom's line across the head, on its +z side
const RAIL_Z = -70; // the fuel rail's, on the other side

// a cubic Bezier through four points, sampled
function bez(p0: FwVec3, p1: FwVec3, p2: FwVec3, p3: FwVec3, n = 14): FwVec3[] {
  const out: FwVec3[] = [];

  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = (1 - t) ** 3;
    const bb = 3 * t * (1 - t) ** 2;
    const c = 3 * t * t * (1 - t);
    const d = t ** 3;

    out.push([0, 1, 2].map((k) => a * p0[k] + bb * p1[k] + c * p2[k] + d * p3[k]) as FwVec3);
  }

  return out;
}

// a revolveY about the vertical line through (x, z)
function ry(b: MeshBuilder, x: number, z: number, s: Parameters<MeshBuilder["revolveY"]>[0]) {
  b.setTurn((p, n) => [[p[0] + x, p[1], p[2] + z], n]);
  b.revolveY(s);
  b.setTurn(null);
}

export function buildHeadWiring(b: MeshBuilder, shift = 0) {
  const top = HEAD.yTop; // the cover's top (y up is negative)
  const capTop = top - 3.4 - 7.2; // the plug cap's crown
  const xFront = HEAD.x0 + shift;
  const loomY = top - 7; // the loom lies on the cover, a little above it
  const xs = CT_X.map((x) => x + PLUG.x);

  // ---- the ignition leads ----
  for (const x of xs) {
    // the boot on the cap: a rubber sleeve, its ribs, and the lead leaving its top
    const bootTop = capTop - 14;

    // the boot's long stem down the plug's tube onto the plug's terminal (hidden in the cover on the solid engine; on the
    // see-through one it shows the lead reaching the plug)
    ry(b, x, PLUG.z, { y0: VT.ySeat - 92, r0: 4.6, y1: capTop + 0.5, r1: 4.6, n: [0, 1], m: MAT_IGN_BOOT, steps: 16 });

    ry(b, x, PLUG.z, { y0: capTop + 0.5, r0: 6.4, y1: bootTop, r1: 5.2, n: [0, 1], m: MAT_IGN_BOOT, steps: 20 });
    for (const k of [0.25, 0.5, 0.75]) {
      const y = capTop + (bootTop - capTop) * k;

      ry(b, x, PLUG.z, { y0: y + 0.8, r0: 6.6 - 1.2 * k, y1: y - 0.8, r1: 6.6 - 1.2 * k, n: [0, 1], m: MAT_IGN_BOOT, steps: 20 });
    }
    ry(b, x, PLUG.z, { y0: bootTop, r0: 5.2, y1: bootTop - 1.4, r1: 3, n: [0, 1], m: MAT_IGN_BOOT, steps: 20 });

    // the lead: up out of the boot, over in an arc, down into the loom, leaning back toward the front
    const pts = bez([x, bootTop - 1, PLUG.z], [x, bootTop - 26, PLUG.z], [x - 14, loomY - 22, LOOM_Z - 6], [x - 22, loomY, LOOM_Z]);

    sweepTube(b, curveFromPoints(pts, 3), () => 4.2, MAT_IGN_LEAD, { segments: 12 });
  }

  // ---- the loom: a braided sleeve along the head, from beyond the last lead to the front, then the coil pack ----
  {
    const xEnd = xs[xs.length - 1] + 10;
    const xStart = xFront + 30;
    const pts = bez([xEnd, loomY, LOOM_Z], [xs[2], loomY, LOOM_Z], [xs[0], loomY, LOOM_Z], [xStart + 10, loomY, LOOM_Z], 24);

    sweepTube(b, curveFromPoints(pts, 6), () => 6.2, MAT_IGN_LOOM, { segments: 14 });

    // its clips to the cover, between the cylinders
    for (let k = 0; k < xs.length - 1; k++) {
      const xc = (xs[k] + xs[k + 1]) / 2;

      b.box(xc - 3, xc + 3, loomY - 7.2, top, LOOM_Z - 7.6, LOOM_Z + 7.6, MAT_CT_NUT_SIDE);
      b.prismDir([xc, loomY - 7.2, LOOM_Z + 9.5], [0, -1, 0], [1, 0, 0], [0, 0, 1], 2.4, 2, 6, 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
    }

    // the coil pack at the front: a finned block, its connector toward the loom
    const cx = xStart - 4;
    const cy = top - 14;

    b.box(cx - 20, cx + 20, cy - 13, top, LOOM_Z - 16, LOOM_Z + 16, MAT_IGN_COIL);
    for (let k = -3; k <= 3; k++) b.box(cx - 21.5, cx + 21.5, cy - 13 - 2.2, cy - 13, LOOM_Z + k * 4.4 - 1, LOOM_Z + k * 4.4 + 1, MAT_IGN_COIL); // its fins
    b.box(cx + 20, cx + 27, cy - 9, cy + 1, LOOM_Z - 7, LOOM_Z + 7, MAT_IGN_BOOT); // the connector
    for (const sz of [-1, 1]) {
      b.prismDir([cx + sz * 16, top, LOOM_Z + 19], [0, -1, 0], [1, 0, 0], [0, 0, 1], 2.6, 3.2, 6, 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
    }
  }

  // ---- the fuel rail ----
  {
    const xi = CT_X.map((x) => x + INJ.x);
    const railY = top - 26; // high enough over the cover that the injectors' lines are seen leaving it, straight down
    const x0 = xi[0] - 22;
    const x1 = xi[xi.length - 1] + 30;

    // the rail itself, a straight steel pipe, its ends capped
    b.revolve({ x0, r0: 10, x1, r1: 10, n: [0, 1], m: MAT_FUEL_RAIL, steps: 24, cy: railY, cz: RAIL_Z });
    b.disc(x0, 0, 0, 10, MAT_FUEL_RAIL, 24, railY, RAIL_Z, -1);

    // where each injector's line goes through the cover a grommet, and a clip and bolt holding the rail
    for (const x of xi) {
      ry(b, x, RAIL_Z, { y0: top, r0: 9.6, y1: top - 2, r1: 9.6, n: [0, 1], m: MAT_INJ_BRASS, steps: 20 }); // a grommet where the line goes through the cover
      b.box(x + 11, x + 17, railY - 12, top, RAIL_Z - 13, RAIL_Z + 13, MAT_CT_NUT_SIDE); // the bracket
      b.prismDir([x + 14, railY - 12, RAIL_Z], [0, -1, 0], [1, 0, 0], [0, 0, 1], 2.8, 2.4, 6, 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
    }

    // from each cup a steel feed line down through the cover onto its injector's top, a union nut at the injector (the lines
    // run in the cover on the solid engine; on the see-through one they show the fuel's way from the rail to each injector)
    const injTop = VT.ySeat + 1 - INJ.length;

    for (const x of xi) {
      // out of the rail's side, facing the injectors, through its clamp: one smooth sweep, out level, round and straight down,
      // then over to the injector, its tangent unbroken from end to end
      const z0 = RAIL_Z + 16; // where it leaves the boss
      const zd = RAIL_Z + 27; // the line of its drop
      const B1 = bez([x, railY, z0], [x, railY, zd], [x, railY, zd], [x, top + 4, zd], 18);
      const B2 = bez([x, top + 4, zd], [x, top + 30, zd], [x, injTop - 24, INJ.z], [x, injTop - 3, INJ.z], 26);
      const line = [...B1, ...B2.slice(1)];
      sweepTube(b, curveFromPoints(line, 3), () => 2.4, MAT_FUEL_PIPE, { segments: 12 });

      // six fins along it, raised, small: thin beads at the tube's skin, following it
      const fine = line;
      const frames = fine.map((p, i) => {
        const a = fine[Math.max(0, i - 1)];
        const c = fine[Math.min(fine.length - 1, i + 1)];
        const tg = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        const tl = Math.hypot(tg[0], tg[1], tg[2]) || 1;
        const tn = tg.map((v) => v / tl);
        // a side vector across the tube: +x (the lines run in y-z), made square to the tangent
        const d = tn[0];
        const s1 = [1 - d * tn[0], -d * tn[1], -d * tn[2]];
        const sl = Math.hypot(s1[0], s1[1], s1[2]) || 1;
        const e1 = s1.map((v) => v / sl);
        const e2 = [tn[1] * e1[2] - tn[2] * e1[1], tn[2] * e1[0] - tn[0] * e1[2], tn[0] * e1[1] - tn[1] * e1[0]];

        return { p, e1, e2 };
      });

      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const ca = Math.cos(a) * 2.3;
        const sa = Math.sin(a) * 2.3;
        const rib = frames.map(({ p, e1, e2 }): FwVec3 => [p[0] + e1[0] * ca + e2[0] * sa, p[1] + e1[1] * ca + e2[1] * sa, p[2] + e1[2] * ca + e2[2] * sa]);

        sweepTube(b, curveFromPoints(rib.slice(1, -1), 3), () => 0.42, MAT_FUEL_FIN, { segments: 5 });
      }
      // where it leaves the rail: a clamp round the rail, a broad steel band with a bolt through its lug on top; out of its side
      // a short boss, welded to it, a fillet weld bead round it, its ripples dark rings
      const along: FwVec3 = [0, 0, 1];
      const e1: FwVec3 = [1, 0, 0];
      const e2: FwVec3 = [0, 1, 0];
      const CR = 12.4; // the clamp's outer radius

      b.revolve({ x0: x - 7, r0: CR, x1: x + 7, r1: CR, n: [0, 1], m: MAT_RAIL_CLAMP, steps: 32, cy: railY, cz: RAIL_Z });
      for (const sx of [-1, 1]) {
        b.revolve({ x0: x + sx * 7, r0: 10, x1: x + sx * 7, r1: CR, n: [sx, 0], m: MAT_RAIL_CLAMP, steps: 32, cy: railY, cz: RAIL_Z });
        b.revolve({ x0: x + sx * 7.5, r0: CR - 0.4, x1: x + sx * 7.5, r1: CR + 0.05, n: [sx, 0], m: MAT_CT_NUT_SIDE, steps: 32, cy: railY, cz: RAIL_Z }); // its edge line
      }
      // its lug on top, split, and the clamping bolt through it, its head and washer on the near side
      b.box(x - 7, x + 7, railY - CR - 7, railY - CR + 1, RAIL_Z - 5, RAIL_Z + 5, MAT_RAIL_CLAMP);
      b.box(x - 7.05, x + 7.05, railY - CR - 7.05, railY - CR + 1, RAIL_Z - 0.5, RAIL_Z + 0.5, MAT_CT_NUT_SIDE); // the split
      b.prismDir([x, railY - CR - 3.5, RAIL_Z + 5], along, e1, e2, 3.4, 1, 20, 0, MAT_INJ_BRASS, MAT_INJ_BRASS); // washer
      b.prismDir([x, railY - CR - 3.5, RAIL_Z + 6], along, e1, e2, 3.1, 3.4, 6, 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE); // bolt head
      b.prismDir([x, railY - CR - 3.5, RAIL_Z - 5], [0, 0, -1], e1, e2, 3.1, 2.8, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE); // its nut

      b.prismDir([x, railY, RAIL_Z + CR - 0.6], along, e1, e2, 4.4, 4.4, 24, 0, MAT_RAIL_CLAMP, MAT_RAIL_CLAMP); // the boss
      b.prismDir([x, railY, RAIL_Z + CR - 0.8], along, e1, e2, 7, 1.4, 28, 0, MAT_WELD, MAT_WELD); // the bead, wide at the clamp
      b.prismDir([x, railY, RAIL_Z + CR + 0.6], along, e1, e2, 5.8, 1.1, 28, 0, MAT_WELD, MAT_WELD); // narrowing onto the boss
      for (const [dz, r] of [[CR - 0.1, 7.05], [CR + 1.1, 5.85]] as Array<[number, number]>) {
        b.prismDir([x, railY, RAIL_Z + dz], along, e1, e2, r, 0.25, 28, 0, MAT_CT_NUT_SIDE, MAT_CT_NUT_SIDE);
      }

      // a polished metal band round the line, halfway down
      {
        const i = B1.length + 8;
        const p = line[i];
        const q = line[i + 1];
        const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
        const l = Math.hypot(d[0], d[1], d[2]) || 1;
        const dn: FwVec3 = [d[0] / l, d[1] / l, d[2] / l];
        const s2: FwVec3 = [0, -dn[2], dn[1]];

        b.prismDir([p[0] - dn[0] * 2.2, p[1] - dn[1] * 2.2, p[2] - dn[2] * 2.2], dn, [1, 0, 0], s2, 3.8, 4.4, 20, 0, MAT_FUEL_RAIL, MAT_FUEL_RAIL);
      }

      // into the injector: a sleeve over the injector's top, the line running into it, a union nut on it and a ferrule
      ry(b, x, INJ.z, { y0: injTop - 10, r0: 3.4, y1: injTop + 4, r1: 3.4, n: [0, 1], m: MAT_FUEL_RAIL, steps: 20 }); // the sleeve
      ry(b, x, INJ.z, { y0: injTop - 11.5, r0: 2.5, y1: injTop - 10, r1: 3.4, n: [-0.7, 0.7], m: MAT_FUEL_RAIL, steps: 20 }); // its taper onto the line
      b.prismDir([x, injTop - 2, INJ.z], [0, 1, 0], [1, 0, 0], [0, 0, 1], 5.2, 4.6, 6, 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE); // union nut
      ry(b, x, INJ.z, { y0: injTop + 2.6, r0: 4.4, y1: injTop + 4, r1: 4.4, n: [0, 1], m: MAT_INJ_BRASS, steps: 20 }); // the ferrule's brass collar
    }

    // the pressure regulator at the rear end: a round body with a vacuum nipple
    b.revolve({ x0: x1, r0: 13, x1: x1 + 18, r1: 13, n: [0, 1], m: MAT_INJ_BRASS, steps: 24, cy: railY, cz: RAIL_Z });
    b.disc(x1 + 18, 0, 0, 13, MAT_INJ_BRASS, 24, railY, RAIL_Z, 1);
    b.revolve({ x0: x1 + 18, r0: 2.8, x1: x1 + 27, r1: 2.4, n: [0, 1], m: MAT_FUEL_RAIL, steps: 12, cy: railY, cz: RAIL_Z });

    // the feed: a braided line from the rail's front end, forward and down off the head toward the pump
    const feed = bez([x0, railY, RAIL_Z], [x0 - 30, railY, RAIL_Z], [xFront - 10, top + 10, RAIL_Z - 20], [xFront - 16, top + 60, RAIL_Z - 30]);

    sweepTube(b, curveFromPoints(feed, 4), () => 5.2, MAT_FUEL_LINE, { segments: 12 });
    // its fitting, a hex nut on the rail
    b.prismDir([x0 - 1, railY, RAIL_Z], [-1, 0, 0], [0, 1, 0], [0, 0, 1], 8.4, 7, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
  }

}
