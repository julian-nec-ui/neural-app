// The intake plenum and runners, the exhaust collector, the air intake and filter.

import { BANKS, CT_X, HEAD_PORT_DZ, TAU } from "../core/constants";
import { vadd, vcross, vnorm, vscale, vsub } from "../math/vec3";
import type { FwMaterial, FwVec3 } from "./builder";
import { MAT_ALU_CAST, MAT_ALU_TURNED, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, MAT_EXH_GUNMETAL, MAT_HDR_BLUE, MAT_HDR_FLANGE, MAT_HDR_GOLD, MAT_HDR_PURPLE, MAT_IRON, MAT_MANIFOLD_GREY, MAT_MANIFOLD_GREY_DEEP, MAT_PIPE_BLACK, MAT_STEEL_BRIGHT, MAT_TURBO_GRAIN, MAT_WELD } from "./materials";
import { collar, curveAt, curveFromPoints, flangeJoint, ovalFlare, pipeFlange, roundedCurve, subCurve, sweepTube } from "./tubes";
import type { Curve, MeshBuilder } from "./tubes";
import { COLLECTOR_CONE, COLLECTOR_LEN, COMPRESSOR_OUTLET_LEN, HDR_CX, HDR_CZ, HDR_MOUTH_Y, PLENUM_Y, PLENUM_Z, PORT_Y, TB, collectorRadius, compressorCentre, turboWorld } from "./turbo";
import { IN_SIDE, VT, valveX } from "./valvetrain";
import { buildAirFilter } from "./airFilter";
import { lobedPlate } from "./shapes";
import type { P2 } from "./shapes";

/* ---- the plumbing, in world coordinates ---- */

// The paths of the pipes. The air follows the same paths as sprites, so they
// are defined once, here.
export const PORT_SEAT_Y = VT.ySeat + 0.5;

export function seatX(cyl: number, sigma: number, sx: number) {
  return valveX(cyl, sigma, sx);
}

// The pipes that are the same on both banks, each in its bank's own frame (or, for the turbocharger's, in the
// module's): the intake plenum and its runners, the exhaust collector under the turbine, the compressor's outlet
// and the air intake that goes up to the filter.
// The compressor's outlet points down: the hot charge pipe runs straight down from it this far, to the level where it
// turns toward the intercooler, round an elbow of HOT_BEND
export const OUTLET_DROP = 56;
export const HOT_BEND = 22;

// The distributor, in a bank's frame: at the middle of the bank, on the outside, a little above the ports
// The mouth of the turbine's inlet elbow, in the module's frame: facing back along the bank, where the pipe from the
// collector is bolted to it
export const INLET_MOUTH: FwVec3 = [HDR_CX, HDR_MOUTH_Y - 6 + COLLECTOR_LEN - 20, HDR_CZ]; // right on top of the turbine's inlet, low
// the way the mouth faces, in the module's frame: up, so that the pipe from the collector, arching over, comes down onto it
export const INLET_FACING: FwVec3 = [0, -1, 0];


// The intake manifold, in the engine's frame, after a billet racing manifold (plenum.ts builds it): over the V, a long
// plenum, its lower body with its sides chamfered in underneath, a double flange round its top, and on it the lid, bolted
// down by two staggered rows of socket-head bolts: a domed lid of two long lobes with a shallow valley between them, tall
// at the front, dipping at the middle and rising again in a hump toward the back, rounded off there like a dome. At its
// front, one gate: a funnel opening into a big square flange, on it the throttle, and in front of the throttle a Y that
// takes the cooled charge from both intercoolers. Out of its chamfered underside, on round six-bolt flanges, twelve
// short, fat runners, six for each bank, all one length, down into the V and square into the ports on the heads' valley
// sides, through a base rail bolted along each head; on each runner an injector's boss, and over each bank's six a fuel
// rail. All of it machined from billet and blasted a fine matte grey.
export const PLENUM = {
  xf: CT_X[0] - 84, // its front
  xr: CT_X[CT_X.length - 1] + 140, // its back, a little past the heads' ends, covering them
  wF: 142, // its half width, at the flange: broad at the front
  wB: 108, // and narrower at the back
  hF: 134, // the lid's height at the front: tall and round
  hB: 86, // and at the back
  yLid: -443, // the flange's top, where the lid sits: low, the flange lying just over the heads' covers
  yFlange: -430, // the flange's underside
  yb: -375, // its body's flat bottom, deep in the V, just over the runners' base rails
  yGate: -471, // the gate's axis
  gateLen: 58, // how far the gate stands out in front of it
  gateR: 58, // its bore
  neckR: 58,
  throttle: { r: 62, len: 56 },
  xn: CT_X[0] - 84 - 58 - 2, // the throttle's back, against the gate's flange
};

const tAlong = (x: number) => Math.min(1, Math.max(0, (x - PLENUM.xf) / (PLENUM.xr - PLENUM.xf)));

// The plan's half width at x: broad at the front, narrowing a little, evenly, toward the back; its corners rounded,
// broadly at the back, a little at the front
export function plenumW(x: number): number {
  const { xf, xr, wF, wB } = PLENUM;
  const base = (xx: number) => wF + (wB - wF) * Math.pow(tAlong(xx), 1.15);
  const rb = 58;
  const rf = 16;

  if (x > xr - rb) return base(xr - rb) - rb + Math.sqrt(Math.max(0, rb * rb - (x - (xr - rb)) ** 2));
  if (x < xf + rf) return base(xf + rf) - rf + Math.sqrt(Math.max(0, rf * rf - (xf + rf - x) ** 2));

  return base(x);
}

// The lid's height over the flange at (x, z): tall and round at the front, coming down evenly toward the back; its two
// lobes across with the valley between them; and its edges rolling down round on to the flange, more broadly in front
export function lidHeight(x: number, z: number): number {
  const { xf, xr, hF, hB } = PLENUM;
  const W = plenumW(x) - 4;

  if (Math.abs(z) >= W) return 0;

  const t = tAlong(x);
  const H = hF + (hB - hF) * Math.pow(t, 1.1);
  const zl = 0.44 * W;
  const wl = 0.75 * W;
  const e = (c: number) => Math.sqrt(Math.max(0, 1 - ((z - c) / wl) ** 2));
  const a = e(zl);
  const b = e(-zl);
  const lob = (a + b + Math.sqrt((a - b) ** 2 + 0.15 * 0.15)) / 2; // the two lobes, the valley between them soft
  const d = Math.min(W - Math.abs(z), (xr - 4 - x) * 1.1, (x - xf) * 2.2);
  const R = 50 - 18 * t;
  const fall = d <= 0 ? 0 : Math.sqrt(Math.max(0, 1 - (1 - Math.min(d, R) / R) ** 2));

  return H * lob * fall;
}

// The heads' outline where the plenum's body is fitted down on to them, one side (+z), in the engine's frame, [z, y]: the
// cover's top, rounding down at its inner edge, and the valley wall under it, down to where the runners' rails are
const HEAD_LINE: Array<[number, number]> = [[286, -350], [160, -423], [147, -425], [136, -423], [126, -416], [115, -402], [54, -304]];

export function headY(z: number): number {
  for (let k = 0; k + 1 < HEAD_LINE.length; k++) {
    const [z0, y0] = HEAD_LINE[k];
    const [z1, y1] = HEAD_LINE[k + 1];

    if (z <= z0 && z >= z1) return y0 + ((y1 - y0) * (z0 - z)) / (z0 - z1);
  }

  return -304;
}

// The valley wall's z at height y
const wallZ = (y: number) => 54 + ((115 - 54) * (y + 304)) / (-402 + 304);

// The body's section at x, one side (+z), from the flange down: [z, y]: down from the flange to the head's cover, along
// the cover and down the valley wall, let into them a little so that no gap shows anywhere, to its flat bottom over
// the rails
const SINK = 2;

export function bodySection(x: number): Array<[number, number]> {
  const W = plenumW(x) - 5;
  const pts: Array<[number, number]> = [[W, PLENUM.yFlange]];

  // (always as many points, so that the sections join along the plenum)
  for (let k = 0; k <= 8; k++) {
    const z = W + ((115 - W) * k) / 8;

    pts.push([z - (k ? SINK : 0), headY(z) + SINK]);
  }

  const zb = wallZ(PLENUM.yb) - SINK;

  pts.push([zb, PLENUM.yb]);

  return pts;
}

// the gate's axis, at x
export const plenumCentre = (_zs: number, x: number): FwVec3 => [x, PLENUM.yGate, 0];
// where the cooled charge's pipes end, on the Y's two branches in front of the throttle, facing forward
export const Y_BRANCH = { z: 54, len: 76, r: 31 }; // (a little over the cooled charge's pipes, 27)
export const PLENUM_INLETS: FwVec3[] = [-1, 1].map((zs): FwVec3 => [PLENUM.xn - 12 - PLENUM.throttle.len - 6 - Y_BRANCH.len, PLENUM.yGate, zs * Y_BRANCH.z]);
// the middle of each half of the plenum, where the charge is gathered for the runners
export const PLENUM_MIDS: FwVec3[] = [-1, 1].map((zs): FwVec3 => [(PLENUM.xf + PLENUM.xr) / 2, -410, zs * 60]);
// a point of the engine's frame in a bank's own frame, [y, z] (the same for both banks, whose frames are mirror images:
// worked out with B's, and its +Z log)
const inBank = (y: number, z: number): [number, number] => {
  const inv = BANKS[1].mInv;

  return [inv[4] * y + inv[7] * z, inv[5] * y + inv[8] * z];
};
// the intake's port face on the head's valley side, in a bank's frame (the heads widened)
const IN_FACE = IN_SIDE * (97.4 + HEAD_PORT_DZ);

const RAIL = { y0: PORT_Y - 36, y1: PORT_Y + 30, t: 11, tilt: (20 * Math.PI) / 180 };

// The rail's tilted face, in a bank's frame: the middle of its face [y, z] and its outward axis [y, z] (turned
// counterclockwise, seen from the front, by its wedge: up and out of the head's valley face, toward the plenum)
export function railFace(): { E: [number, number]; dir: [number, number] } {
  const zf = Math.abs(IN_FACE);
  const sa = Math.sin(RAIL.tilt);
  const ca = Math.cos(RAIL.tilt);

  return { E: [PORT_Y - RAIL.t * sa, IN_SIDE * (zf + RAIL.t * ca)], dir: [-sa, IN_SIDE * ca] };
}

// The air intake's run out, level, straight out from the engine's side and a little forward, and the filter's axis at its
// end, bent down from it, through 40 degrees: both in the turbocharger module's frame (x along the engine, y down the bank,
// z out from it; the module's z leans down with the bank, 30 degrees)
export const INTAKE_OUT: FwVec3 = vnorm([-0.3, -0.475, 0.823]);
export const FILTER_DIR: FwVec3 = vnorm([-0.23, 0.191, 0.954]);

export const PIPES = (() => {
  const first = CT_X[0] - 26; // the intake plenum stops at the first and the last cylinder
  const last = CT_X[CT_X.length - 1] + 26;

  // the turbine's inlet: an elbow whose mouth faces back along the bank (the module's +z), toward the collector, so that
  // the pipe from it comes straight in; it bends down through a right angle, broadly, into the turbine
  const collectorEnd: FwVec3 = [HDR_CX, HDR_MOUTH_Y - 6 + COLLECTOR_LEN, HDR_CZ];
  // under the flange, the turbine's inlet: a short straight neck down into its scroll
  const log = curveFromPoints([INLET_MOUTH, [collectorEnd[0], collectorEnd[1] + 10, collectorEnd[2]]], 3);

  const plenum = curveFromPoints([[first, PLENUM_Y, PLENUM_Z], [last, PLENUM_Y, PLENUM_Z]], 6);

  // ---- intake: six short runners for each bank, all one length and one shape, each out of its manifold's log straight
  // under its cylinder, down and out, and square into its port on the head's valley side ----
  const intakeRunners = CT_X.map((x) => {
    const W = (y: number, z: number): FwVec3 => {
      const [by, bz] = inBank(y, z);

      return [x, by, bz];
    };
    const { E, dir } = railFace();
    const at = (d: number): FwVec3 => [x, E[0] + dir[0] * d, E[1] + dir[1] * d];

    return roundedCurve([
      W(-412, 64), // in the plenum's body, deep in the V
      at(54), // short, down out of it, on the rail's tilted axis
      at(24),
      at(0), // square into the rail's tilted face
      [x, PORT_Y, IN_SIDE * (98 + HEAD_PORT_DZ)], // and on into the port
    ], 26, 3);
  });






  const runner = (cyl: number) => intakeRunners[cyl];

  // ---- the compressor's outlet: the charge leaves it downward, through a metal coupler. The pipe that
  // goes on from there to the intercooler is CHARGE_PIPES' ----
  const outlet = turboWorld([TB.half, compressorCentre(1), -COMPRESSOR_OUTLET_LEN]);
  const outletRun = curveFromPoints([outlet, [outlet[0], outlet[1] + OUTLET_DROP - HOT_BEND, outlet[2]]], 5);
  const throttleEnd: FwVec3 = PLENUM_INLETS[1]; // where the cooled charge's pipe ends (B's)

  // The air intake leaves the compressor's inlet along the shaft, turns out from the engine, runs out level, and bends
  // down into the air filter
  const intakeStart = turboWorld([135, 0, 0]);
  const intakeBend: FwVec3 = vadd(intakeStart, [-34 + 118 * INTAKE_OUT[0], 118 * INTAKE_OUT[1], 118 * INTAKE_OUT[2]]);
  const intake = roundedCurve([
    intakeStart,
    [intakeStart[0] - 34, intakeStart[1], intakeStart[2]],
    // a bend, out from the engine, level, a long run out; and a broad bend down, the filter on its end
    intakeBend,
    vadd(intakeBend, vscale(FILTER_DIR, 58)), // (its leg down to the filter: the same bend, a shorter straight after it)
  ], 48, 12);

  return { log, plenum, runner, collectorEnd, outlet, outletRun, intake, throttleEnd };
})();

// The pipes' skins, drawn see-through: the air moving inside them can be seen.
// A bank's intake runners: a bell mouth where each leaves the plenum, then full and round down into the V, narrowing as
// it turns into the port, like a throat (the plenum they leave is solid: plenum.ts)
export const runnerRadius = (u: number) =>
  19 + 5 * Math.pow(Math.max(0, 1 - u / 0.14), 2) - 5 * Math.pow(Math.max(0, (u - 0.66) / 0.34), 1.5);

export function buildIntakePipes(b: MeshBuilder) {
  for (let i = 0; i < CT_X.length; i++) sweepTube(b, PIPES.runner(i), runnerRadius, MAT_MANIFOLD_GREY, { segments: 32 });
}

// The manifold's base, solid, for each bank, in its frame: a cast rail bolted along the head's valley face, over the
// ports, each runner flaring into it, the port's own shape; bolts between the runners, above and below, and at its ends; at
// its front end a cast boss with its threaded ports. On each runner, near the port, an injector's boss, its injector in
// it, and along the six a black fuel rail, bolted down on to them, a fitting at each end
export function buildIntakeWelds(b: MeshBuilder) {
  const zf = Math.abs(IN_FACE);
  const x0 = CT_X[0] - 66;
  const x1 = CT_X[CT_X.length - 1] + 60;
  const sa = Math.sin(RAIL.tilt);
  const ca = Math.cos(RAIL.tilt);
  // the rail turned about its middle on the head's face, counterclockwise: its bottom out, its face looking up and out;
  // drawn as on the outer side, and turned over, square across the bank, on to the valley side
  const turn = (p: FwVec3, n: FwVec3): [FwVec3, FwVec3] => {
    const y = PORT_Y + (p[1] - PORT_Y) * ca - (p[2] - zf) * sa;
    const z = zf + (p[1] - PORT_Y) * sa + (p[2] - zf) * ca;
    const ny = n[1] * ca - n[2] * sa;
    const nz = n[1] * sa + n[2] * ca;

    return IN_SIDE < 0 ? [[p[0], y, -z], [n[0], ny, -nz]] : [[p[0], y, z], [n[0], ny, nz]];
  };

  b.setTurn(turn);

  b.box(x0, x1, RAIL.y0, RAIL.y1, zf, zf + RAIL.t, MAT_MANIFOLD_GREY);
  b.box(x0 + 2, x1 - 2, RAIL.y0 + 2, RAIL.y1 - 2, zf + RAIL.t, zf + RAIL.t + 1.2, MAT_ALU_TURNED); // its machined face's edge

  for (let i = 0; i < CT_X.length; i++) {
    ovalFlare(b, CT_X[i], PORT_Y, zf + RAIL.t, 16, 23, 19, 14, MAT_MANIFOLD_GREY);
  }

  // the bolts: four round each runner's port, hex-headed, on washers
  for (const x of CT_X) {
    for (const dx of [-29, 29]) {
      for (const y of [RAIL.y0 + 9, RAIL.y1 - 9]) hexBolt(b, [x + dx, y, zf + RAIL.t + 1.2], [0, 0, 1], 5, 0.4 + 0.11 * x + y);
    }
  }

  // the boss at its front end, with two threaded ports in it
  b.box(x0 - 22, x0 + 4, RAIL.y0 - 6, RAIL.y1 - 10, zf, zf + RAIL.t + 18, MAT_MANIFOLD_GREY);
  for (const [y, k] of [[RAIL.y0 + 10, 0], [RAIL.y1 - 26, 1]] as Array<[number, number]>) {
    b.prismDir([x0 - 22, y, zf + RAIL.t + 9], [-1, 0, 0], [0, 1, 0], [0, 0, 1], 7 + k, 1.5, 6, 0.4, MAT_ALU_TURNED, MAT_ALU_TURNED);
    b.prismDir([x0 - 23.4, y, zf + RAIL.t + 9], [-1, 0, 0], [0, 1, 0], [0, 0, 1], 4.4, 0.8, 18, 0, MAT_PIPE_BLACK, MAT_PIPE_BLACK);
  }

  // the wedge, cast with the rail under its turned plate: the material added at its bottom that sets the new angle, from
  // the head's face out to the plate's back, with its socket-head bolts down into the head through its foot
  b.setTurn(IN_SIDE < 0 ? (p, n) => [[p[0], p[1], -p[2]], [n[0], n[1], -n[2]]] : null);

  const rot = (y: number): [number, number] => [PORT_Y + (y - PORT_Y) * ca, zf + (y - PORT_Y) * sa];
  const [ym, zm] = rot(PORT_Y);
  const [yb, zb] = rot(RAIL.y1);
  const sec: Array<[number, number]> = [[ym, zm], [yb, zb], [yb, zf], [ym, zf]];

  for (let k = 0; k < 4; k++) {
    const [ya, za] = sec[k];
    const [yc, zc] = sec[(k + 1) % 4];
    const l = Math.hypot(yc - ya, zc - za) || 1;

    b.flatQuad([x0, ya, za], [x1, ya, za], [x1, yc, zc], [x0, yc, zc], [0, (zc - za) / l, -(yc - ya) / l], MAT_MANIFOLD_GREY);
  }

  for (const [x, dir] of [[x0, -1], [x1, 1]] as Array<[number, number]>) {
    b.flatQuad([x, sec[0][0], sec[0][1]], [x, sec[1][0], sec[1][1]], [x, sec[2][0], sec[2][1]], [x, sec[3][0], sec[3][1]], [dir, 0, 0], MAT_MANIFOLD_GREY);
  }

  b.setTurn(null);

  // the injectors' bosses, each on its runner near the port, leaning toward it; and the fuel rail over them
  const tops: FwVec3[] = [];

  for (let i = 0; i < CT_X.length; i++) {
    const r = PIPES.runner(i);
    const s = r.total - 52;
    const p: FwVec3 = [0, 0, 0];

    curveAt(r, s, p);

    const axis = vnorm([0, -0.86, -IN_SIDE * 0.5]); // up, leaning toward the port
    const e1: FwVec3 = [1, 0, 0];
    const e2 = vnorm([0, axis[2], -axis[1]]);
    const rr = runnerRadius(s / r.total);
    const base = vadd(p, vscale(axis, rr - 6));

    b.prismDir(base, axis, e1, e2, 9, 20, 24, 0, MAT_MANIFOLD_GREY, MAT_MANIFOLD_GREY); // the boss, cast with the runner
    b.prismDir(vadd(base, vscale(axis, 20)), axis, e1, e2, 6.2, 9, 20, 0, MAT_PIPE_BLACK, MAT_PIPE_BLACK); // the injector
    b.prismDir(vadd(base, vscale(axis, 23)), axis, e1, e2, 7, 2.2, 20, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT); // its clip
    tops.push(vadd(base, vscale(axis, 32)));
  }

  // the rail: a black square bar along the six, a bolt down through it beside every second injector, and a fitting at
  // each end
  const ry = tops[0][1];
  const rz = tops[0][2];
  const ra = CT_X[0] - 46;
  const rb = CT_X[CT_X.length - 1] + 40;

  // a broad billet bar, fine grooves milled along its top, socket-head bolts down through it, its ends bored and threaded
  b.box(ra, rb, ry - 9, ry + 9, rz - 13, rz + 13, MAT_MANIFOLD_GREY);
  for (let k = 0; k < 7; k++) {
    const zg = rz - 10.5 + k * 3.5;

    b.box(ra + 3, rb - 3, ry - 9.5, ry - 9, zg - 0.6, zg + 0.6, MAT_MANIFOLD_GREY_DEEP);
  }

  for (let i = 0; i < CT_X.length; i += 2) {
    const x = (CT_X[i] + CT_X[i + 1]) / 2;

    socketCap(b, [x, ry - 9.5, rz], [0, -1, 0], 4.4);
    b.box(x - 7, x + 7, ry + 9, ry + 24, rz - 5, rz + 5, MAT_MANIFOLD_GREY); // its stand, down to the runners
  }

  for (const [x, dir] of [[ra, -1], [rb, 1]] as Array<[number, number]>) {
    b.prismDir([x, ry, rz], [dir, 0, 0], [0, 1, 0], [0, 0, 1], 7.5, 0.6, 24, 0, MAT_PIPE_BLACK, MAT_PIPE_BLACK); // its bore
    b.prismDir([x, ry, rz], [dir, 0, 0], [0, 1, 0], [0, 0, 1], 9.5, 0.4, 24, 0, MAT_ALU_TURNED, MAT_ALU_TURNED); // the thread's chamfer
  }
}

// A socket-head cap screw's head at p, facing `dir`: a black round head, chamfered, its hex socket dark in it
// A hex-headed bolt on its washer: the washer, the head with its six flats and its top chamfered, a maker's mark ring
export function hexBolt(b: MeshBuilder, p: FwVec3, dir: FwVec3, r: number, rot = 0) {
  const d = vnorm(dir);
  const e1 = vnorm(vcross(d, Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  const e2 = vcross(d, e1);

  b.prismDir(p, d, e1, e2, r * 1.45, r * 0.18, 24, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
  b.prismDir(vadd(p, vscale(d, r * 0.18)), d, e1, e2, r * 1.1, r * 0.72, 6, rot, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
  b.prismDir(vadd(p, vscale(d, r * 0.9)), d, e1, e2, r * 0.98, r * 0.16, 6, rot, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE); // the chamfer
  b.prismDir(vadd(p, vscale(d, r * 1.06 - 0.05)), d, e1, e2, r * 0.55, 0.1, 20, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT); // the mark
}

export function socketCap(b: MeshBuilder, p: FwVec3, dir: FwVec3, r: number) {
  const d = vnorm(dir);
  const e1 = vnorm(vcross(d, Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  const e2 = vcross(d, e1);

  b.prismDir(p, d, e1, e2, r, r * 0.9, 20, 0, MAT_PIPE_BLACK, MAT_PIPE_BLACK);
  b.prismDir(vadd(p, vscale(d, r * 0.9)), d, e1, e2, r * 0.82, r * 0.12, 20, 0, MAT_PIPE_BLACK, MAT_CT_NUT_SIDE);
  b.prismDir(vadd(p, vscale(d, r * 1.02 - 0.3)), d, e1, e2, r * 0.42, 0.4, 6, 0.3, MAT_CT_NUT_SIDE, MAT_CT_NUT_SIDE);
}

// A turbocharger module's air intake, from the compressor up to the filter
export function buildTurboIntakePipe(b: MeshBuilder) {
  sweepTube(b, PIPES.intake, () => 20, MAT_ALU_TURNED, { segments: 26 });
}

// The exhaust collector's skin, drawn see-through with a steel contour: the cone and its stub
export function buildCollector(b: MeshBuilder) {
  // the cone into the turbine, grey metal
  const lt = PIPES.log.total;
  const stretch = (s0: number, s1: number, mat: FwMaterial) =>
    sweepTube(b, subCurve(PIPES.log, s0, s1, 4), (u) => collectorRadius(s0 + u * (s1 - s0)), mat, { segments: 32 });

  const collectorBase = () => MAT_ALU_CAST; // one grey metal, as the intake's pipes are

  for (const [s0, s1, mat] of tintedStretches(0, lt, collectorWelds(lt), collectorBase)) stretch(s0, s1, mat);
}

// A weld round a pipe, as it is on stainless tube: a raised bead made of overlapping
// ripples, each a crescent, the bead's edge wavering a little, with the colours of heat beside
// it: straw-gold, then purple, then blue, on both sides. The bead is hollow: only the outside
// of it is there, so that the pipe's inside can be seen through it.
// `half`, when given, keeps only the half of the bead on that side of the pipe: the half that shows
export function weld(b: MeshBuilder, curve: Curve, s: number, pipeR: number, half?: FwVec3) {
  const centre: FwVec3 = [0, 0, 0];
  const dir: FwVec3 = [0, 0, 0];

  curveAt(curve, s, centre, dir);

  const e1 = vnorm(vcross(dir, Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  const e2 = vcross(dir, e1);
  const R0 = pipeR + 0.2;
  const ripples = Math.max(14, Math.round((TAU * R0) / 3.1)); // about 3 units from crest to crest
  const N = ripples * 4; // samples round the pipe
  const M = 7; // samples across the bead
  const hw = WELD_HALF; // half the bead's width

  const P = (th: number, ph: number): FwVec3 => {
    // ripple crests: the bead is higher, and a little wider, on each crest, and the crest leans
    const crest = Math.sin(ripples * th);
    const lean = Math.sin(ripples * th + 1.2);
    const height = (1.1 + 0.26 * crest) * Math.sin(ph);
    const along = hw * Math.cos(ph) * (1 + 0.09 * crest + 0.07 * Math.sin(ripples * th * 0.5 + 0.7)) + 0.34 * lean * Math.sin(ph);
    const rr = R0 + height;
    const cs = Math.cos(th) * rr;
    const sn = Math.sin(th) * rr;

    return [
      centre[0] + dir[0] * along + e1[0] * cs + e2[0] * sn,
      centre[1] + dir[1] * along + e1[1] * cs + e2[1] * sn,
      centre[2] + dir[2] * along + e1[2] * cs + e2[2] * sn,
    ];
  };

  const normal = (th: number, ph: number): FwVec3 => {
    const d = 1e-3;
    const a0 = P(th + d, ph);
    const a1 = P(th - d, ph);
    const b0 = P(th, ph + d);
    const b1 = P(th, ph - d);
    const n = vnorm(vcross(vsub(a0, a1), vsub(b0, b1)));
    const out = vsub(P(th, Math.PI / 2), centre);

    // pointing out of the pipe
    return n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0 ? vscale(n, -1) : n;
  };

  for (let i = 0; i < N; i++) {
    if (half) {
      const tm = ((i + 0.5) / N) * TAU;
      const rx = e1[0] * Math.cos(tm) + e2[0] * Math.sin(tm);
      const ry = e1[1] * Math.cos(tm) + e2[1] * Math.sin(tm);
      const rz = e1[2] * Math.cos(tm) + e2[2] * Math.sin(tm);

      if (rx * half[0] + ry * half[1] + rz * half[2] < 0) continue;
    }

    const t0 = (i / N) * TAU;
    const t1 = ((i + 1) / N) * TAU;

    for (let j = 0; j < M; j++) {
      const p0 = (j / M) * Math.PI;
      const p1 = ((j + 1) / M) * Math.PI;
      const v: Array<[FwVec3, FwVec3]> = [
        [P(t0, p0), normal(t0, p0 + 1e-3)],
        [P(t1, p0), normal(t1, p0 + 1e-3)],
        [P(t1, p1), normal(t1, p1 - 1e-3)],
        [P(t0, p1), normal(t0, p1 - 1e-3)],
      ];

      for (const k of [0, 1, 2, 0, 2, 3]) b.push(v[k][0], v[k][1], MAT_WELD, 1);
    }
  }
}

// The colours of heat beside a weld, and the stretches of a pipe's skin they make. The pipe's own
// colour runs gold, then bronze, then blue along its length; beside each weld it is straw-gold,
// then purple, then blue, on both sides. The skin is see-through like the rest of the pipe, so
// nothing closes the pipe from inside.
const WELD_HALF = 1.95; // half the width of a weld's bead
const HAZ: Array<[number, number, FwMaterial]> = [
  [0.4, 2.8, MAT_HDR_GOLD],
  [2.8, 4.7, MAT_HDR_PURPLE],
  [4.7, 7.0, MAT_HDR_BLUE],
];

export function tintedStretches(
  from: number, to: number, welds: number[], base: (s: number) => FwMaterial
): Array<[number, number, FwMaterial]> {
  const matAt = (s: number): FwMaterial => {
    for (const w of welds) {
      const d = Math.abs(s - w) - WELD_HALF;

      for (const [a, c, m] of HAZ) {
        if (d >= a && d < c) return m;
      }
    }

    return base(s);
  };

  const out: Array<[number, number, FwMaterial]> = [];
  const step = 0.4;
  let start = from;
  let current = matAt(from + step / 2);

  for (let s = from + step; s < to; s += step) {
    const m = matAt(s + step / 2);

    if (m !== current) {
      out.push([start, s, current]);
      start = s;
      current = m;
    }
  }

  out.push([start, to, current]);

  return out;
}

// Where the welds are along the collector
const collectorWelds = (t: number) => [COLLECTOR_CONE + 16, t * 0.8];

// A part standing out of a pipe at an angle: a sensor, a boss. Returns where its top is
function standOut(b: MeshBuilder, at: FwVec3, dir: FwVec3, r: number, len: number, top: FwMaterial, side: FwMaterial, sides = 14) {
  const d = vnorm(dir);
  const e1 = vnorm(vcross(d, Math.abs(d[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
  const e2 = vcross(d, e1);

  b.prismDir(at, d, e1, e2, r, len, sides, 0, top, side);

  return vadd(at, vscale(d, len));
}

// The solid fittings of the turbine's inlet elbow, in a turbocharger module's frame: the bolted flange at its mouth, the
// plate at the turbine, its welds, and the oxygen sensor
export function buildCollectorFittings(b: MeshBuilder) {
  // the turbine's inlet flange, level, facing up, right on its housing; the pipe comes down onto it with its own
  // flange, and the two are bolted together, a gasket between: rounded squares of dark metal, eight bolts
  {
    const [mx, my, mz] = INLET_MOUTH;
    const half = 54; // (round the exhaust's one pipe, 43.5 across its half)

    // built level about the origin, its up local z, and set on the mouth
    b.setTurn((p, n) => [[mx + p[0], my - p[2], mz + p[1]], [n[0], -n[2], n[1]]]);
    // round, with three ears, as the header's own end flange is: the turbine's cast one under, a gasket, the pipe's
    // machined plate over, and three studs with their nuts
    const ring: P2[] = [];

    for (let i = 0; i < 180; i++) {
      const a = (i / 180) * TAU;
      let r = half - 4;

      for (let k = 0; k < 3; k++) {
        const d = Math.atan2(Math.sin(a - (k * TAU) / 3 - 0.5), Math.cos(a - (k * TAU) / 3 - 0.5));

        r = Math.max(r, half + 8 - 40 * d * d);
      }

      ring.push([r * Math.cos(a), r * Math.sin(a)]);
    }

    lobedPlate(b, ring, -9, 0, 1.2, MAT_TURBO_GRAIN);
    lobedPlate(b, ring.map(([x, y]) => [x * 0.97, y * 0.97] as P2), 0, 1, 0.2, MAT_PIPE_BLACK);
    lobedPlate(b, ring, 1, 10, 1.4, MAT_HDR_FLANGE);

    for (let k = 0; k < 3; k++) {
      const a = (k * TAU) / 3 + 0.5;
      const px = (half + 1) * Math.cos(a);
      const py = (half + 1) * Math.sin(a);

      b.prismDir([px, py, 10], [0, 0, 1], [1, 0, 0], [0, 1, 0], 5.6, 0.8, 18, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
      b.prismDir([px, py, 10.8], [0, 0, 1], [1, 0, 0], [0, 1, 0], 5, 5, 6, a, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
      b.prismDir([px, py, 15.8], [0, 0, 1], [1, 0, 0], [0, 1, 0], 2.6, 7, 14, 0, MAT_STEEL_BRIGHT, MAT_STEEL_BRIGHT);
      b.prismDir([px, py, -9], [0, 0, -1], [1, 0, 0], [0, 1, 0], 4.2, 4, 6, 0.2, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE);
    }

    b.setTurn(null);
  }

  for (const w of collectorWelds(PIPES.log.total)) weld(b, PIPES.log, w, collectorRadius(w));

  // the oxygen sensor on the stub, with its wire, standing out toward the viewer
  const sensorAt: FwVec3 = [HDR_CX + 6, PIPES.collectorEnd[1] - 40, HDR_CZ - 24];
  const sensorDir: FwVec3 = vnorm([0.35, -0.3, -0.88]);
  const boss = standOut(b, sensorAt, sensorDir, 8, 7, MAT_IRON, MAT_IRON);
  const hexTop = standOut(b, boss, sensorDir, 6, 6, MAT_CT_NUT_HEAD, MAT_CT_NUT_SIDE, 6);
  const bodyTop = standOut(b, hexTop, sensorDir, 4.6, 26, MAT_PIPE_BLACK, MAT_PIPE_BLACK);

  sweepTube(b, roundedCurve([bodyTop, vadd(bodyTop, [14, -14, -14]), vadd(bodyTop, [50, -30, -6])], 10, 3), () => 1.5, MAT_PIPE_BLACK, { segments: 8, capEnd: true });
}


// The round bolted flange joint the hot charge pipes are held by, at the compressor's outlet and at the tank's port: as
// the cooled charge's outlet's, smaller, for the narrower pipe end
export const PORT_JOINT = {
  pipeR: 15,
  r: 32,
  castT: 8,
  mateT: 7,
  bolts: 6,
  pitch: 25,
  cast: MAT_EXH_GUNMETAL,
  mate: MAT_EXH_GUNMETAL,
  gasket: MAT_PIPE_BLACK,
  bolt: 3.8,
};

// The solid fittings of a turbocharger module's own pipes: the metal coupler on the compressor's outlet, the air
// intake's flange, ring and lip, and the air filter on its end
export function buildTurboFittings(b: MeshBuilder) {
  // the compressor's outlet: a round neck cast with the housing, and on it the round bolted flange joint the hot pipe is
  // held by (as at the intercooler's port)
  {
    const run = PIPES.outletRun;
    const p0: FwVec3 = [0, 0, 0];
    const p1: FwVec3 = [0, 0, 0];

    curveAt(run, 0, p0);
    curveAt(run, 10, p1);

    const dir = vnorm(vsub(p1, p0));

    sweepTube(b, curveFromPoints([vadd(p0, vscale(dir, -6)), p1], 2), () => 19, MAT_TURBO_GRAIN, { segments: 40 });
    flangeJoint(b, vadd(p1, vscale(dir, PORT_JOINT.castT)), dir, PORT_JOINT);
  }

  const intake = PIPES.intake;

  pipeFlange(b, intake, false, 30, MAT_ALU_TURNED);
  collar(b, intake, intake.total * 0.55, 20, 22.5, 4, MAT_ALU_TURNED);
  collar(b, intake, intake.total - 3, 20, 24.5, 6, MAT_ALU_TURNED);
  // The air filter, hanging from the intake's open end: a K&N-style cone
  buildAirFilter(b, intake.pts[intake.pts.length - 1], FILTER_DIR);
}
