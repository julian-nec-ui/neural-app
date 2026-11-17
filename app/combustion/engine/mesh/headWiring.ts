// On each head's top: the ignition coils and the fuel rail. On each plug a pencil coil stands in its ring on the cover, its
// short lead running to a loom along the head on one side, the loom forward to the harness connector at the head's front;
// on the other side the fuel rail, a steel pipe along the head, with a cup and a clip over each injector, fed at the front
// through a braided line and a pressure regulator at its rear end.

import { CT_X, INJ, PLUG } from "../core/constants";
import type { FwMaterial, FwVec3 } from "./builder";
import { HEAD } from "./head";
import { MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_FUEL_FIN, MAT_FUEL_LINE, MAT_FUEL_PIPE, MAT_FUEL_RAIL, MAT_RAIL_CLAMP, MAT_WELD, MAT_IGN_BOOT, MAT_IGN_LOOM, MAT_INJ_BRASS, MAT_COIL_BODY, MAT_COIL_COLLAR, MAT_COIL_HEAD, MAT_COIL_HEAD_SIDE, MAT_COIL_LATCH, MAT_COIL_PANEL, MAT_COIL_PANEL_SIDE, MAT_COIL_RED, MAT_COIL_SOCKET, MAT_PLENUM_RED_DEEP, MAT_CHEV_RED } from "./materials";
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
  const xFront = HEAD.x0 + shift;
  const loomY = top - 13.5; // the loom lies on the cover, a little above it (thick: twice what it was)
  const xs = CT_X.map((x) => x + PLUG.x);

  // ---- the ignition: a coil on each plug (pencil coils, as on a modern head), each standing in its plug's machined ring on
  // the cover: a black rubber boot with a red band, the coil's dark grey body rising from it, and on top the coil's head, a
  // round-cornered block with a raised panel on its top; out of its outer side the connector, its socket and latch, a
  // short black lead from it down into the loom; beside it a lug, finned, bolted down to the cover ----
  for (const x of xs) coilOnPlug(b, x, top, loomY);

  // ---- the loom: a braided sleeve along the head, gathering the coils' leads, from beyond the last coil to the front, where
  // it ends in the harness's connector ----
  {
    const xEnd = xs[xs.length - 1] + 10;
    const xStart = xFront + 30;
    const pts = bez([xEnd, loomY, LOOM_Z], [xs[2], loomY, LOOM_Z], [xs[0], loomY, LOOM_Z], [xStart + 10, loomY, LOOM_Z], 24);

    sweepTube(b, curveFromPoints(pts, 6), () => 12.4, MAT_IGN_LOOM, { segments: 20 });

    // its clips to the cover, between the cylinders
    for (let k = 0; k < xs.length - 1; k++) {
      const xc = (xs[k] + xs[k + 1]) / 2;

      b.box(xc - 4, xc + 4, loomY - 13.6, top, LOOM_Z - 14, LOOM_Z + 14, MAT_CT_NUT_SIDE);
      b.prismDir([xc, top, LOOM_Z + 17.5], [0, -1, 0], [1, 0, 0], [0, 0, 1], 2.8, 2.4, 6, 0.3, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
    }

    // the harness connector at the front, the loom's end in it
    const cx = xStart + 2;

    roundedBox(b, cx, LOOM_Z, 15, 16, loomY - 16, top, 3.5, MAT_COIL_HEAD, MAT_COIL_HEAD_SIDE);
    b.box(cx - 17, cx - 15, loomY - 10, top - 4, LOOM_Z - 8, LOOM_Z + 8, MAT_COIL_LATCH);
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

// A block with round corners standing on the horizontal: half sizes hx, hz about (cx, cz), from yTop up to... (y down: yHi
// is its top, the smaller y), its corners rounded by r; its top and its sides
function roundedBox(b: MeshBuilder, cx: number, cz: number, hx: number, hz: number, yHi: number, yLo: number, r: number, mTop: FwMaterial, mSide: FwMaterial) {
  const ring: Array<[number, number, number, number]> = []; // x, z and the outward normal
  const corners: Array<[number, number, number]> = [[hx - r, hz - r, 0], [-(hx - r), hz - r, Math.PI / 2], [-(hx - r), -(hz - r), Math.PI], [hx - r, -(hz - r), (3 * Math.PI) / 2]];

  for (const [ox, oz, a0] of corners) {
    for (let k = 0; k <= 5; k++) {
      const a = a0 + (k / 5) * (Math.PI / 2);

      ring.push([cx + ox + r * Math.cos(a), cz + oz + r * Math.sin(a), Math.cos(a), Math.sin(a)]);
    }
  }

  const n = ring.length;

  for (let k = 0; k < n; k++) {
    const [xa, za, nxa, nza] = ring[k];
    const [xc, zc, nxc, nzc] = ring[(k + 1) % n];

    for (const [p, nn] of [[[xa, yHi, za], [nxa, 0, nza]], [[xa, yLo, za], [nxa, 0, nza]], [[xc, yLo, zc], [nxc, 0, nzc]], [[xa, yHi, za], [nxa, 0, nza]], [[xc, yLo, zc], [nxc, 0, nzc]], [[xc, yHi, zc], [nxc, 0, nzc]]] as Array<[FwVec3, FwVec3]>) {
      b.push(p, nn, mSide, 1);
    }
  }

  b.flatFan([cx, yHi, cz], ring.map(([x, z]) => [x, yHi, z] as FwVec3), [0, -1, 0], mTop);
}

// One coil, on the plug at x (its plug's ring on the cover's top at `top`); its lead into the loom at loomY
function coilOnPlug(b: MeshBuilder, x: number, top: number, loomY: number) {
  const z = PLUG.z;
  const y0 = top - 3.4; // the plug ring's top face
  const yBoot = y0 - 13; // the boot's top
  const yBody = yBoot - 12; // the body's top: the head sits on it
  const yHead = yBody - 17; // the head's top

  // the boot's long stem down the plug's tube onto the plug's terminal (hidden in the cover on the solid engine; on the
  // see-through one it shows the coil reaching the plug)
  ry(b, x, z, { y0: VT.ySeat - 92, r0: 4.6, y1: y0, r1: 4.6, n: [0, 1], m: MAT_IGN_BOOT, steps: 16 });

  // the boot: black rubber, a grey collar at its foot, a red band round it, a lip at its top
  ry(b, x, z, { y0, r0: 11.2, y1: y0 - 1.6, r1: 11.2, n: [0, 1], m: MAT_COIL_COLLAR, steps: 32 });
  ry(b, x, z, { y0: y0 - 1.6, r0: 10.4, y1: yBoot, r1: 10.4, n: [0, 1], m: MAT_IGN_BOOT, steps: 32 });
  ry(b, x, z, { y0: y0 - 3.4, r0: 10.7, y1: y0 - 7.4, r1: 10.7, n: [0, 1], m: MAT_COIL_RED, steps: 32 });
  ry(b, x, z, { y0: yBoot + 1.4, r0: 11, y1: yBoot, r1: 11, n: [0, 1], m: MAT_IGN_BOOT, steps: 32 });
  ry(b, x, z, { y0: yBoot, r0: 11, y1: yBoot, r1: 8.6, n: [-1, 0], m: MAT_IGN_BOOT, steps: 32 });

  // the coil's body, dark grey, up to the head
  ry(b, x, z, { y0: yBoot, r0: 8.6, y1: yBody, r1: 8.6, n: [0, 1], m: MAT_COIL_BODY, steps: 32 });

  // the head: a round-cornered block, its long side across the head; a raised panel on its top, its edge chamfered
  const hz0 = -12; // (short on the inner side: the firing order is written there)
  const hz1 = 24;
  const hcz = z + (hz0 + hz1) / 2;
  const hhz = (hz1 - hz0) / 2;

  roundedBox(b, x, hcz, 17, hhz, yHead, yBody, 5, MAT_COIL_HEAD, MAT_COIL_HEAD_SIDE);
  roundedBox(b, x, hcz + 2, 13.5, hhz - 5, yHead - 4, yHead + 0.2, 3.5, MAT_COIL_PANEL, MAT_COIL_PANEL_SIDE); // (raised higher, a lighter shade so it shows from straight above)
  // its foot, a step down to the body
  roundedBox(b, x, z, 11.5, 11.5, yBody, yBody + 2.4, 4, MAT_COIL_HEAD_SIDE, MAT_COIL_HEAD_SIDE);

  // the connector, out of the outer side: a socket, its mouth dark, its latch on top, the lead from its back
  const cz0 = z + hz1 - 1;
  const cz1 = z + hz1 + 13;
  const cy0 = yHead + 3;
  const cy1 = yBody - 3;

  const xc = x - 6; // (beside the lug, both on the outer side)

  b.box(xc - 8, xc + 8, cy0, cy1, cz0, cz1, MAT_COIL_HEAD_SIDE);
  b.box(xc - 6, xc + 6, cy0 + 2, cy1 - 2, cz1 - 0.2, cz1 + 0.05, MAT_COIL_SOCKET);
  roundedBox(b, xc, (cz0 + 1.5 + cz1 - 1.5) / 2, 3.5, (cz1 - cz0 - 3) / 2, cy0 - 1.6, cy0, 1.2, MAT_COIL_LATCH, MAT_COIL_LATCH); // (its corners rounded; as far in from the socket's top edge as from its outer one)
  // on the latch's top two red chevrons, the intake lid's red, pointing to the coil (the way to push it), one above the
  // other with a white line of the latch between them
  {
    const yT = cy0 - 1.6 - 0.03;
    const chev = (zTip: number) => {
      const w = 2.9; // half its width
      const d = 2.2; // how far its arms run back from the tip
      const t = 1.155; // its stroke, along z
      const h = 0.55; // raised in relief off the latch, its walls a deeper red
      const hr = 0.3; // and its top peaked along the middle of the stroke, a ridge, embossed
      const P = (x: number, z: number, hh = h): FwVec3 => [x, yT - hh, z];
      const nl = Math.hypot(w, d);
      const half = (t / 2) * (w / nl); // half the stroke's width, square across it
      const tilt = (sx: number, s: number): FwVec3 => {
        const l = Math.hypot(half, hr);

        return [((s * sx * d) / nl) * (hr / l), -half / l, ((s * w) / nl) * (hr / l)];
      };

      for (const sx of [-1, 1]) {
        const xe = xc + sx * w;
        const m = t / 2;

        // the top: two faces sloping off the ridge, the front one and the back one
        b.flatQuad(P(xc, zTip), P(xe, zTip + d), P(xe, zTip + d + m, h + hr), P(xc, zTip + m, h + hr), tilt(sx, -1), MAT_CHEV_RED);
        b.flatQuad(P(xc, zTip + m, h + hr), P(xe, zTip + d + m, h + hr), P(xe, zTip + d + t), P(xc, zTip + t), tilt(sx, 1), MAT_CHEV_RED);
        // its walls: the front one (toward the coil), the back one, and the square end of the arm
        b.flatQuad(P(xc, zTip, 0), P(xe, zTip + d, 0), P(xe, zTip + d), P(xc, zTip), [sx * -d / nl, 0, -w / nl], MAT_PLENUM_RED_DEEP);
        b.flatQuad(P(xc, zTip + t, 0), P(xe, zTip + d + t, 0), P(xe, zTip + d + t), P(xc, zTip + t), [sx * d / nl, 0, w / nl], MAT_PLENUM_RED_DEEP);
        b.flatQuad(P(xe, zTip + d, 0), P(xe, zTip + d + t, 0), P(xe, zTip + d + m, h + hr), P(xe, zTip + d), [sx, 0, 0], MAT_PLENUM_RED_DEEP);
        b.flatQuad(P(xe, zTip + d + m, h + hr), P(xe, zTip + d + t, 0), P(xe, zTip + d + t), P(xe, zTip + d + m, h + hr), [sx, 0, 0], MAT_PLENUM_RED_DEEP);
      }
    };

    const z0 = cz0 + 3.83; // (where they stood, scaled with the latch from its outer edge)

    chev(z0);
    chev(z0 + 2.85); // (the second, its spacing scaled too)
  }

  // on the head's top, over the latch, in the strip between the head's outer edge and its raised panel, one more chevron,
  // raised, the same red, pointing in the same way: its arms down to the edge, the inside of its V to half the strip, its
  // tip to three quarters; as wide as the latch's chevrons, so its angle opens out; its top peaked along the stroke
  {
    const zE = z + hz1 - 0.05; // the head's outer edge
    const g = zE - (hcz + 2 + hhz - 5); // the strip, to the panel
    const zT = zE - 0.75 * g; // its tip
    const zI = zE - 0.5 * g; // the inside of its V
    const zM = (zT + zI) / 2; // the ridge
    const w = 2.9; // its half width, at the edge (the latch's chevrons')
    const wI = (w * (zE - zI)) / (zE - zT); // the back edge's, at the edge
    const wM = (w + wI) / 2;
    const h = 0.6;
    const hr = 0.3;
    const P = (xx: number, zz: number, hh: number): FwVec3 => [xx, yHead - hh, zz];
    const nrm = (a: FwVec3, c: FwVec3, d: FwVec3, out: FwVec3): FwVec3 => {
      const u = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
      let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const l = Math.hypot(n[0], n[1], n[2]) || 1;

      n = n.map((q) => q / l);
      if (n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0) n = n.map((q) => -q);

      return n as FwVec3;
    };
    const quad = (a: FwVec3, c: FwVec3, d: FwVec3, e: FwVec3, out: FwVec3, m: FwMaterial) => b.flatQuad(a, c, d, e, nrm(a, c, d, out), m);

    for (const sx of [-1, 1]) {
      const xe = xc + sx * w;
      const xi = xc + sx * wI;
      const xm = xc + sx * wM;

      // the top: off the ridge, toward the tip and toward the back
      quad(P(xc, zT, h), P(xe, zE, h), P(xm, zE, h + hr), P(xc, zM, h + hr), [0, -1, -0.3], MAT_CHEV_RED);
      quad(P(xc, zM, h + hr), P(xm, zE, h + hr), P(xi, zE, h), P(xc, zI, h), [0, -1, 0.3], MAT_CHEV_RED);
      // its walls, down to the head: the front one, the back one (inside the V), and its end on the edge
      quad(P(xc, zT, 0), P(xe, zE, 0), P(xe, zE, h), P(xc, zT, h), [0, 0, -1], MAT_PLENUM_RED_DEEP);
      quad(P(xc, zI, 0), P(xi, zE, 0), P(xi, zE, h), P(xc, zI, h), [0, 0, 1], MAT_PLENUM_RED_DEEP);
      quad(P(xe, zE, 0), P(xi, zE, 0), P(xi, zE, h), P(xe, zE, h), [0, 0, 1], MAT_PLENUM_RED_DEEP);
      quad(P(xe, zE, h), P(xi, zE, h), P(xm, zE, h + hr), P(xm, zE, h + hr), [0, 0, 1], MAT_PLENUM_RED_DEEP);
    }
  }

  const ym = (cy0 + cy1) / 2;
  const lead = bez([xc, ym, cz1 - 3], [xc, ym, cz1 + 12], [xc - 8, loomY - 8, LOOM_Z - 6], [xc - 14, loomY, LOOM_Z], 16);

  sweepTube(b, curveFromPoints(lead, 3), () => 3, MAT_IGN_BOOT, { segments: 12 });

  // the lug, out of the outer side beside the connector: a web from the head to a boss standing on the cover, three fins
  // across the web, the bolt on the boss
  const lx = x + 10;
  const lz = z + hz1 + 9;

  b.box(lx - 5.5, lx + 5.5, yHead + 2, yBody - 2, z + hz1 - 1, lz, MAT_COIL_HEAD_SIDE);
  ry(b, lx, lz, { y0: top, r0: 7, y1: yHead + 2, r1: 7, n: [0, 1], m: MAT_COIL_HEAD_SIDE, steps: 24 });
  ry(b, lx, lz, { y0: yHead + 2, r0: 7, y1: yHead + 2, r1: 0, n: [-1, 0], m: MAT_COIL_HEAD, steps: 24 });

  for (let k = 0; k < 3; k++) {
    const yf = yHead + 6 + k * 3.4;

    b.box(lx + 5.5, lx + 6.6, yf - 0.9, yf + 0.9, z + hz1, lz - 3, MAT_COIL_HEAD);
  }

  b.prismDir([lx, yHead + 2, lz], [0, -1, 0], [1, 0, 0], [0, 0, 1], 6, 0.8, 24, 0, MAT_CT_NUT_SIDE, MAT_CT_NUT_SIDE); // the washer
  b.prismDir([lx, yHead + 1.2, lz], [0, -1, 0], [1, 0, 0], [0, 0, 1], 4.6, 3.6, 24, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE); // the socket head
  b.prismDir([lx, yHead - 2.45, lz], [0, -1, 0], [1, 0, 0], [0, 0, 1], 2.1, 0.1, 6, 0, MAT_COIL_SOCKET, MAT_COIL_SOCKET); // its hex socket
}
