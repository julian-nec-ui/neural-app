// The fuel injectors and the spark plugs.

import { ELECTRODE_TIP_Y, INJ, TAU } from "../core/constants";
import { FW_STRIDE, createMeshBuilder } from "./builder";
import type { FwMaterial, FwVec3 } from "./builder";
import { MAT_CT_EDGE, MAT_CT_GROOVE, MAT_CT_HOLE, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_INJ_BODY, MAT_INJ_BRASS, MAT_INJ_LABEL, MAT_INJ_PLASTIC, MAT_INJ_RUBBER, MAT_INJ_SEAL, MAT_INJ_SLEEVE, MAT_INJ_STEEL, MAT_PLUG_BAND, MAT_PLUG_CERAMIC, MAT_PLUG_ELECTRODE, MAT_PLUG_IRIDIUM, MAT_PLUG_SHELL, MAT_PLUG_THREAD } from "./materials";

/* ---------------- fuel injectors and rail ---------------- */

// Built upright (nozzle at the origin, rising along -Y), scaled, then leaned
// over: the top goes to the right (+X), the nozzle points down and to the left.
export function buildInjector(b: ReturnType<typeof createMeshBuilder>) {
  const start = b.out.length;

  const seg = (
    y0: number, r0: number, y1: number, r1: number,
    n: [number, number], m: FwMaterial
  ) => b.revolveY({ y0, r0, y1, r1, n, m, steps: 36 });

  // A rubber O-ring, as a rounded band
  const oring = (y0: number, y1: number, rBase: number, bulge: number) => {
    seg(y0, rBase, y0 - (y1 - y0 > 0 ? -0.9 : 0.9), rBase + bulge, [0.3, 0.95], MAT_INJ_RUBBER);
    seg(y0 - (y1 - y0 > 0 ? -0.9 : 0.9), rBase + bulge, y1 + (y1 - y0 > 0 ? -0.9 : 0.9), rBase + bulge, [0, 1], MAT_INJ_RUBBER);
    seg(y1 + (y1 - y0 > 0 ? -0.9 : 0.9), rBase + bulge, y1, rBase, [-0.3, 0.95], MAT_INJ_RUBBER);
  };

  // A flat disc across the axis (the nozzle's face, the spray holes)
  const discY = (y: number, cx: number, cz: number, radius: number, m: FwMaterial, sides = 10) => {
    const ring: FwVec3[] = [];

    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * TAU;
      ring.push([cx + radius * Math.cos(a), y, cz + radius * Math.sin(a)]);
    }

    b.flatFan([cx, y, cz], ring, [0, 1, 0], m);
  };

  // Nozzle: orifice plate with a ring of six spray holes round a centre pin, and the tip cone
  seg(0, 0, 0, 3.3, [1, 0], MAT_INJ_STEEL);
  seg(0, 1.0, 0, 2.7, [1, 0], MAT_INJ_SEAL);

  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.3;

    discY(0.04, 1.85 * Math.cos(a), 1.85 * Math.sin(a), 0.4, MAT_CT_HOLE);
  }

  discY(0.04, 0, 0, 0.55, MAT_INJ_STEEL);
  seg(0, 3.3, -4.6, 4.8, [0.45, 0.9], MAT_INJ_STEEL);
  seg(-4.6, 4.8, -5.4, 5.5, [0.2, 1], MAT_CT_EDGE);

  // Stainless sleeve with the tip seal
  seg(-5.4, 5.5, -33, 5.5, [0, 1], MAT_INJ_SLEEVE);

  for (const y of [-19, -22.4, -25.8, -29.2]) {
    seg(y, 5.54, y - 0.8, 5.54, [0, 1], MAT_CT_GROOVE);
  }
  seg(-8.5, 5.5, -8.5, 6.7, [1, 0], MAT_INJ_SEAL);
  seg(-8.5, 6.7, -14.5, 6.7, [0, 1], MAT_INJ_SEAL);
  seg(-14.5, 6.7, -14.5, 5.5, [-1, 0], MAT_INJ_SEAL);

  // Shoulder, lower tube and its O-ring
  seg(-33, 5.5, -33, 7.7, [1, 0], MAT_INJ_STEEL);
  seg(-33, 7.7, -43, 7.7, [0, 1], MAT_INJ_STEEL);
  oring(-36, -40, 7.7, 0.9);

  // Solenoid housing: bright rims, bands, a label with etched lines
  seg(-43, 7.7, -43, 8.7, [1, 0], MAT_INJ_BODY);
  seg(-43, 8.7, -44.3, 9.5, [0.6, 0.8], MAT_INJ_BODY);
  seg(-44.3, 9.5, -79, 9.5, [0, 1], MAT_INJ_BODY);
  seg(-47, 9.56, -49, 9.56, [0, 1], MAT_INJ_STEEL);
  seg(-73, 9.56, -75, 9.56, [0, 1], MAT_INJ_STEEL);
  seg(-53, 9.54, -60, 9.54, [0, 1], MAT_INJ_LABEL);
  for (const y of [-54.6, -56.4, -58.2]) {
    seg(y, 9.58, y - 0.7, 9.58, [0, 1], MAT_CT_GROOVE);
  }
  seg(-79, 9.5, -80.3, 8.6, [-0.6, 0.8], MAT_INJ_BODY);
  seg(-80.3, 8.6, -80.3, 7.1, [-1, 0], MAT_INJ_BODY);

  // Upper neck: fuel inlet with its filter and O-ring, ending in the rail cup
  seg(-80.3, 7.1, -99, 7.1, [0, 1], MAT_INJ_BODY);
  oring(-85, -89, 7.1, 0.9);

  // Spring retaining clip: a bar across the inlet, with two prongs
  b.box(-8.4, 8.4, -92, -90.4, -1.1, 1.1, MAT_INJ_STEEL);
  b.box(-8.4, -7, -95.5, -90.4, -1.1, 1.1, MAT_INJ_STEEL);
  b.box(7, 8.4, -95.5, -90.4, -1.1, 1.1, MAT_INJ_STEEL);
  seg(-94, 7.14, -96, 7.14, [0, 1], MAT_CT_GROOVE);
  seg(-99, 7.1, -99, 6.2, [-1, 0], MAT_INJ_BODY);
  seg(-99, 6.2, -102, 6.2, [0, 1], MAT_INJ_BODY);
  seg(-102, 6.2, -102, 0, [-1, 0], MAT_INJ_BODY);

  // Fuel line head: a short red stub with its clamp, running off behind the cams
  seg(-99, 6.4, -116, 5.4, [0, 1], MAT_INJ_BODY);
  seg(-104, 6.9, -106.6, 6.9, [0, 1], MAT_INJ_STEEL);
  seg(-104, 5.9, -104, 6.9, [1, 0], MAT_INJ_STEEL);
  seg(-106.6, 6.9, -106.6, 5.9, [-1, 0], MAT_INJ_STEEL);
  seg(-116, 5.4, -116, 0, [-1, 0], MAT_INJ_BODY);

  seg(-108.6, 6.2, -112.2, 6.2, [0, 1], MAT_INJ_STEEL);
  seg(-108.6, 6.2, -108.6, 5.8, [1, 0], MAT_INJ_STEEL);
  seg(-112.2, 6.2, -112.2, 5.4, [-1, 0], MAT_INJ_STEEL);
  b.prismDir([6.2, -110.4, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 1.8, 2.8, 6, 0, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);

  // Electrical connector: a shroud facing the viewer, with brass pins
  const wall = 1.4;
  b.box(-6.6, 6.6, -71, -71 + wall, -21, -6, MAT_INJ_PLASTIC);
  b.box(-6.6, 6.6, -57 - wall, -57, -21, -6, MAT_INJ_PLASTIC);
  b.box(-6.6, -6.6 + wall, -71, -57, -21, -6, MAT_INJ_PLASTIC);
  b.box(6.6 - wall, 6.6, -71, -57, -21, -6, MAT_INJ_PLASTIC);
  b.box(-5.2, 5.2, -69.6, -58.4, -13, -6, MAT_INJ_PLASTIC);

  for (const x of [-2.6, 2.6]) {
    b.box(x - 0.9, x + 0.9, -68, -61, -19.5, -13, MAT_INJ_BRASS);
  }

  // Ribs on the shroud's sides
  for (const sx of [-1, 1]) {
    for (const z0 of [-19, -14, -9]) {
      b.box(sx > 0 ? 6.6 : -7.3, sx > 0 ? 7.3 : -6.6, -69, -59, z0 - 1, z0 + 1, MAT_INJ_PLASTIC);
    }
  }

  // Locking latch on top of the shroud
  b.box(-4.2, 4.2, -73.6, -71, -19, -9, MAT_INJ_PLASTIC);
  b.box(-4.2, 4.2, -75.2, -73.6, -19, -15, MAT_INJ_PLASTIC);

  // Lean the whole injector over, about the Z axis
  const c = Math.cos(INJ.tilt);
  const s = Math.sin(INJ.tilt);

  for (let i = start; i < b.out.length; i += FW_STRIDE) {
    const x = b.out[i] * INJ.scale;
    const y = b.out[i + 1] * INJ.scale;
    const z = b.out[i + 2] * INJ.scale;
    b.out[i] = x * c - y * s;
    b.out[i + 1] = x * s + y * c;
    b.out[i + 2] = z;

    const nx = b.out[i + 3];
    const ny = b.out[i + 4];
    b.out[i + 3] = nx * c - ny * s;
    b.out[i + 4] = nx * s + ny * c;
  }
}

/* ---------------- spark plug ---------------- */

// Local frame: origin on the chamber roof (the seat); the plug rises along -Y,
// the electrode tip is ELECTRODE_TIP_Y below the roof
export function buildSparkPlug(b: ReturnType<typeof createMeshBuilder>) {
  const seg = (
    y0: number, r0: number, y1: number, r1: number,
    n: [number, number], m: FwMaterial, steps = 40
  ) => b.revolveY({ y0, r0, y1, r1, n, m, steps });

  // ---- Business end: the shell's foot, the insulator nose, the electrodes ----
  seg(0, 3.3, 0, 4.7, [1, 0], MAT_PLUG_SHELL); // foot of the shell
  seg(0, 4.7, -1.4, 5.5, [0.5, 0.85], MAT_CT_EDGE); // chamfered edge
  seg(0, 3.3, 2.4, 1.7, [0.7, 0.7], MAT_PLUG_CERAMIC); // insulator nose
  seg(2.4, 1.7, 2.4, 1.15, [1, 0], MAT_PLUG_CERAMIC);

  seg(2.4, 1.15, 5.8, 0.95, [0, 1], MAT_PLUG_ELECTRODE); // centre electrode
  seg(5.8, 0.95, ELECTRODE_TIP_Y, 0.5, [0.3, 0.95], MAT_PLUG_IRIDIUM); // fine iridium tip
  seg(ELECTRODE_TIP_Y, 0.5, ELECTRODE_TIP_Y, 0, [1, 0], MAT_PLUG_IRIDIUM);

  // Ground strap: bent over the centre electrode, toward -Z; the spark jumps this gap
  b.box(-1.25, 1.25, 0, 5.7, -5.0, -3.9, MAT_PLUG_ELECTRODE);
  b.box(-1.25, 1.25, 4.5, 5.7, -5.0, -1.5, MAT_PLUG_ELECTRODE);

  // ---- Threaded shank, crush washer, hex, collar ----
  seg(-1.4, 5.5, -22, 5.5, [0, 1], MAT_PLUG_THREAD);
  seg(-19.6, 5.56, -21.4, 5.56, [0, 1], MAT_CT_GROOVE); // thread run-out

  seg(-22, 5.5, -22, 7, [1, 0], MAT_PLUG_SHELL); // crush washer
  seg(-22, 7, -24, 7, [0, 1], MAT_PLUG_SHELL);
  seg(-22, 7, -22.4, 7, [0, 1], MAT_CT_GROOVE);

  // The hex, a flat toward the viewer, with a chamfered top
  b.prismDir([0, -24, 0], [0, -1, 0], [1, 0, 0], [0, 0, 1], 8.5, 7, 6, Math.PI / 6, MAT_PLUG_SHELL, MAT_PLUG_SHELL);
  seg(-31, 7.7, -31.9, 6.5, [-0.6, 0.8], MAT_CT_EDGE);
  seg(-31.9, 6.5, -31.9, 6.1, [-1, 0], MAT_PLUG_SHELL);

  // Collar and the rolled-over crimp that holds the insulator
  seg(-31.9, 6.1, -35.4, 6.1, [0, 1], MAT_PLUG_SHELL);
  seg(-33.5, 6.14, -34.1, 6.14, [0, 1], MAT_CT_GROOVE);
  seg(-35.4, 6.1, -36.2, 5.3, [-0.7, 0.7], MAT_CT_EDGE);

  // ---- Ceramic insulator: tapered, with three ribs and a printed band ----
  const base = (y: number) => {
    const t = Math.min(1, Math.max(0, (-y - 36.2) / (66 - 36.2)));

    return 5.35 - 3.55 * Math.pow(t, 1.35);
  };

  const rib = (y: number) => {
    let r = 0;

    for (const c of [-50.5, -55.5, -60.5]) {
      const d = Math.abs(y - c);

      if (d < 1.7) r += 0.5 * Math.pow(Math.cos((d / 1.7) * Math.PI / 2), 2);
    }

    return r;
  };

  const step = 0.6;
  let yPrev = -36.2;
  let rPrev = base(yPrev);

  for (let y = yPrev - step; y >= -66 - 1e-6; y -= step) {
    const r = base(y) + rib(y);

    seg(yPrev, rPrev, y, r, [0, 1], MAT_PLUG_CERAMIC, 36);
    yPrev = y;
    rPrev = r;
  }

  seg(-66, 1.8, -66, 0, [-1, 0], MAT_PLUG_CERAMIC);

  // Printed band (blue), just proud of the ceramic
  seg(-43.6, base(-43.6) + 0.04, -45.4, base(-45.4) + 0.04, [0, 1], MAT_PLUG_BAND, 36);

  // ---- Terminal: stud, ring, and the nut on top (behind the cams, but built) ----
  seg(-66, 2.3, -68, 2.3, [0, 1], MAT_PLUG_SHELL);
  seg(-68, 2.3, -68, 1.5, [-1, 0], MAT_PLUG_SHELL);
  seg(-68, 1.5, -92, 1.5, [0, 1], MAT_PLUG_ELECTRODE);
  b.prismDir([0, -83, 0], [0, -1, 0], [1, 0, 0], [0, 0, 1], 3.9, 5.5, 6, Math.PI / 6, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
  seg(-88.5, 1.5, -92, 1.5, [0, 1], MAT_PLUG_ELECTRODE);
  seg(-92, 1.5, -92, 0, [-1, 0], MAT_PLUG_SHELL);
}
