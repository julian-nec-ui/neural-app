// The chain guides, their pressure pads and the hydraulic tensioners.

import type { FwVec3, createMeshBuilder } from "../builder";
import { MAT_CT_EDGE, MAT_CT_GROOVE, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_VT_JOURNAL, MAT_VT_PAD, MAT_VT_PIN_HEAD, MAT_VT_SEAT, MAT_VT_SHOE, MAT_VT_TOWER, MAT_VT_TOWER_FACE } from "../materials";
import { VT } from "../valvetrain";
import type { Chain, ChainSeg } from "./chainPath";

/* ---------------- guide, tensioner shoe and hydraulic tensioner (static) ---------------- */

// A point on one chain run, `s` along it
function runPoint(seg: ChainSeg, s: number): [number, number] {
  if (seg.kind === "line") {
    return [seg.from[0] + seg.dir[0] * s, seg.from[1] + seg.dir[1] * s];
  }

  if (seg.kind === "poly") {
    let j = 1;

    while (j < seg.cum.length - 1 && seg.cum[j] < s) j++;

    const f = (s - seg.cum[j - 1]) / (seg.cum[j] - seg.cum[j - 1] || 1);

    return [
      seg.pts[j - 1][0] + (seg.pts[j][0] - seg.pts[j - 1][0]) * f,
      seg.pts[j - 1][1] + (seg.pts[j][1] - seg.pts[j - 1][1]) * f,
    ];
  }

  return [0, 0];
}

// Centre line of a run with its outward normal (right of the direction of travel)
function sampleRun(seg: ChainSeg, from: number, to: number, count: number) {
  const out: Array<{ y: number; z: number; ny: number; nz: number }> = [];

  for (let k = 0; k <= count; k++) {
    const s = (from + ((to - from) * k) / count) * seg.length;
    const p = runPoint(seg, s);
    const q = runPoint(seg, Math.min(seg.length, s + 0.6));
    const o = runPoint(seg, Math.max(0, s - 0.6));
    const ty = q[0] - o[0];
    const tz = q[1] - o[1];
    const len = Math.hypot(ty, tz) || 1;

    out.push({ y: p[0], z: p[1], ny: tz / len, nz: -ty / len });
  }

  return out;
}

// A blade along one of a chain's tensioned runs, with its steel pressure pad, a pivot bolt, and the hydraulic tensioner
// that bears on the pad: on run `run` of the chain's path (its runs counted from the first circle), in the plane x.
// `which` says which way the run goes: "near" runs up, away from its lower sprocket, "far" comes back down to it.
export function buildChainShoes(
  b: ReturnType<typeof createMeshBuilder>,
  chain: Chain,
  run: number,
  which: "near" | "far",
  chainX = VT.chainX
) {
  const runs = chain.path.segs.filter((s) => s.kind !== "arc");
  const seg = runs[run];

  // A guide rail along the run, as a ribbon: lit in the middle and darker
  // toward the ends and along the chain-side face, so it keeps a soft shadow
  const ribbon = (
    from: number, to: number,
    gap: number, thick: number, hx: number
  ) => {
    const samples = sampleRun(seg, from, to, 24);
    const x = chainX;
    const shade = (i: number, base: number) =>
      base * (0.55 + 0.45 * Math.pow(Math.sin((Math.PI * i) / (samples.length - 1)), 0.6));

    const quad = (
      p0: FwVec3, p1: FwVec3, p2: FwVec3, p3: FwVec3,
      hint: FwVec3, o0: number, o1: number
    ) => {
      b.flatTri(p0, p1, p2, hint, MAT_VT_SHOE, o0, o1, o1);
      b.flatTri(p0, p2, p3, hint, MAT_VT_SHOE, o0, o1, o0);
    };

    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i];
      const c = samples[i + 1];
      const at = (p: typeof a, off: number): [number, number] => [p.y + p.ny * off, p.z + p.nz * off];
      const a0 = at(a, gap);
      const c0 = at(c, gap);
      const a1 = at(a, gap + thick);
      const c1 = at(c, gap + thick);
      const lit0 = shade(i, 1);
      const lit1 = shade(i + 1, 1);

      // The face toward the engine, the chain-side face, and the outer face
      quad([x + hx, a0[0], a0[1]], [x + hx, c0[0], c0[1]], [x + hx, c1[0], c1[1]], [x + hx, a1[0], a1[1]], [1, 0, 0], lit0, lit1);
      quad([x - hx, a0[0], a0[1]], [x - hx, c0[0], c0[1]], [x - hx, c1[0], c1[1]], [x - hx, a1[0], a1[1]], [-1, 0, 0], lit0, lit1);
      quad([x - hx, a0[0], a0[1]], [x + hx, a0[0], a0[1]], [x + hx, c0[0], c0[1]], [x - hx, c0[0], c0[1]], [0, -a.ny, -a.nz], lit0 * 0.55, lit1 * 0.55);
      quad([x - hx, a1[0], a1[1]], [x + hx, a1[0], a1[1]], [x + hx, c1[0], c1[1]], [x - hx, c1[0], c1[1]], [0, a.ny, a.nz], lit0, lit1);
    }

    return samples;
  };

  // Both blades are 35% shorter than the first design, centred on the bulge
  // that their tensioner makes. The blade rides right on the chain's edge,
  // a little wider than the chain. Both guides are the same size: the camera's
  // perspective makes the farther one smaller.
  const s = 1;
  const gap = 6.6;
  const thick = 4.2 * s;
  const hx = 6.4 * s;
  const blade = ribbon(0.5 - 0.273 * s, 0.5 + 0.273 * s, gap, thick, hx);

  // A rivet: a steel washer, a domed head with a punch mark, and a head on each
  // side of the blade
  // `along` moves it along the blade (the direction the blade runs is (-nz, ny))
  const rivet = (at: { y: number; z: number; ny: number; nz: number }, along = 0) => {
    const rivetY = at.y + at.ny * (gap + thick / 2) - at.nz * along;
    const rivetZ = at.z + at.nz * (gap + thick / 2) + at.ny * along;

    for (const sg of [-1, 1]) {
      const rivetAt = (d: number): FwVec3 => [chainX + sg * (hx + d), rivetY, rivetZ];

      b.prismDir(rivetAt(0), [sg, 0, 0], [0, 1, 0], [0, 0, 1], 3.6 * s, 0.8 * s, 24, 0, MAT_VT_PAD, MAT_VT_PAD); // washer
      b.prismDir(rivetAt(0.8 * s), [sg, 0, 0], [0, 1, 0], [0, 0, 1], 2.6 * s, 0.9 * s, 20, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE); // head
      b.prismDir(rivetAt(1.7 * s), [sg, 0, 0], [0, 1, 0], [0, 0, 1], 1.7 * s, 0.4 * s, 16, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE); // dome
      b.disc(chainX + sg * (hx + 2.1 * s + 0.03), 0, 0, 0.6 * s, MAT_CT_GROOVE, 10, rivetY, rivetZ, sg); // punch mark
    }
  };

  // On both guides: one rivet near the upper end, and one at the very bottom,
  // where the guide pivots (it takes the place of the hexagonal pivot bolt). The
  // blade's lower end is the first sample on the "near" run and the last on the
  // "far" one, so "inward" is +1 on the first and -1 on the second.
  rivet(blade[which === "near" ? blade.length - 2 : 1]);
  rivet(which === "near" ? blade[0] : blade[blade.length - 1], (which === "near" ? 1 : -1) * 2 * s);

  // The tensioner acts at the middle of the blade, along its outward normal
  const mid = blade[Math.floor(blade.length / 2)];
  const ny = mid.ny;
  const nz = mid.nz;
  const padH = 1.7 * s;
  const base = gap + thick + padH; // distance from the chain's centre line to the piston tip
  const at = (dist: number): FwVec3 => [
    chainX,
    mid.y + ny * (base + dist),
    mid.z + nz * (base + dist),
  ];
  const dir: FwVec3 = [0, ny, nz];
  const bx: FwVec3 = [1, 0, 0];
  const cx: FwVec3 = [0, nz, -ny];

  // Steel pressure pad on the blade's outer face, where the piston bears
  const pad = (along: number): FwVec3[] => {
    // `along` is a distance along the run from the contact point
    const ty = -nz;
    const tz = ny; // direction of the run at the contact
    const py = mid.y + ny * (gap + thick) + ty * along;
    const pz = mid.z + nz * (gap + thick) + tz * along;
    return [
      [chainX - 5.2 * s, py, pz],
      [chainX + 5.2 * s, py, pz],
      [chainX + 5.2 * s, py + ny * padH, pz + nz * padH],
      [chainX - 5.2 * s, py + ny * padH, pz + nz * padH],
    ];
  };
  const p0 = pad(-14 * s);
  const p1 = pad(14 * s);

  // outer face, the face toward the engine, and the two ends
  b.flatQuad(p0[3], p0[2], p1[2], p1[3], dir, MAT_VT_PAD);
  b.flatQuad(p0[1], p1[1], p1[2], p0[2], [1, 0, 0], MAT_VT_PAD);
  b.flatQuad(p0[0], p1[0], p1[3], p0[3], [-1, 0, 0], MAT_VT_PAD);
  b.flatQuad(p0[0], p0[1], p0[2], p0[3], [0, -nz, ny], MAT_VT_PAD);
  b.flatQuad(p1[0], p1[1], p1[2], p1[3], [0, nz, -ny], MAT_VT_PAD);

  // Hydraulic tensioner, in proportion to the blade: piston, body, flange
  // with two bolts, check-valve cap and hex plug
  b.prismDir(at(0), dir, bx, cx, 4.2 * s, 15 * s, 20, 0, MAT_VT_PIN_HEAD, MAT_VT_JOURNAL); // piston
  for (const d of [3, 5.6, 8.2, 10.8]) {
    b.prismDir(at(d * s), dir, bx, cx, 4.28 * s, 0.7 * s, 20, 0, MAT_CT_GROOVE, MAT_CT_GROOVE); // ratchet grooves
  }

  b.prismDir(at(13 * s), dir, bx, cx, 8.4 * s, 22 * s, 22, 0, MAT_VT_SEAT, MAT_VT_TOWER); // body
  b.prismDir(at(14 * s), dir, bx, cx, 9.1 * s, 1.1 * s, 22, 0, MAT_CT_EDGE, MAT_CT_EDGE); // seal ring at the mouth
  b.prismDir(at(13 * s), dir, bx, cx, 11.8 * s, 3.4 * s, 6, 0.3, MAT_VT_TOWER_FACE, MAT_VT_SEAT); // mounting flange
  b.prismDir(at(33 * s), dir, bx, cx, 9.8 * s, 3 * s, 22, 0, MAT_VT_TOWER_FACE, MAT_VT_SEAT); // check-valve cap ring
  b.prismDir(at(38 * s), dir, bx, cx, 5.4 * s, 4.8 * s, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE); // hex plug

  for (const side of [-1, 1]) {
    const flange = at(13 * s);

    b.prismDir(
      [flange[0] + side * 8.8 * s, flange[1], flange[2]],
      dir, bx, cx, 2.8 * s, 5 * s, 6, 0.4, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE
    ); // flange bolts
  }
}
