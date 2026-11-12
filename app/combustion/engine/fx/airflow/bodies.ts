// The air bodies: see-through tubes of air and gas filling the pipes, built once for each bank.

import { BANKS, CT_X, HEAD_PORT_DZ, ROD_LIFT, TAU, bankPoint } from "../../core/constants";
import type { Bank } from "../../core/constants";
import { vadd, vlen, vnorm, vscale, vsub } from "../../math/vec3";
import type { FwVec3 } from "../../mesh/builder";
import { DOWNPIPES, EXHAUST_RUNNERS, MODULES, MODULE_ORIGIN, exhaustStub, modulePoint } from "../../mesh/exhaust";
import { CHARGE_PIPES, IC_CHARGE_IN_Z, IC_CHARGE_OUT_Z, IC_STAND_Y, icPlace } from "../../mesh/intercooler";
import { PIPES, PLENUM_MIDS, PORT_SEAT_Y, seatX } from "../../mesh/plumbing";
import { curveFromPoints, roundedCurve } from "../../mesh/tubes";
import { COLLECTOR_CONE, COMPRESSOR_OUTLET_LEN, IC, IC_HALF, PORT_Y, TB, TURBINE_INLET_LEN, collectorRadius, compressorPathLocal, compressorSection, turbinePathLocal, turbineSection, turboWorld } from "../../mesh/turbo";
import { IN_SIDE, VT } from "../../mesh/valvetrain";
import { mixColor, polyLength, scatter, smooth01 } from "./common";
import { AIR_FLOWS, chamberJet } from "./flows";
import { framesOf } from "./streaks";

/* ---------------- the air bodies ---------------- */

export const FOG_FLOATS = 10; // position 3, outward direction 3, then s, angle, tone, fade

type FogMesh = { data: Float32Array; count: number };

type FogSpec = {
  points: FwVec3[];
  nodes: Array<[number, number]>; // [distance along, radius]
  tone?: (s: number, total: number) => number; // 0..1, from the base colour to the tone colour
  fadeIn: number;
  fadeOut: number;
  seg?: number; // sides of the body
  spacing?: number; // distance between rings
};

function buildFog(spec: FogSpec): Float32Array {
  const curve = curveFromPoints(spec.points, spec.spacing ?? 5);
  const frames = framesOf(curve);
  const n = curve.pts.length;
  const seg = spec.seg ?? 22;
  const nodes = spec.nodes;

  const radiusAt = (s: number) => {
    if (s <= nodes[0][0]) return nodes[0][1];

    for (let i = 1; i < nodes.length; i++) {
      if (s <= nodes[i][0]) {
        const k = (s - nodes[i - 1][0]) / (nodes[i][0] - nodes[i - 1][0] || 1);

        return nodes[i - 1][1] + (nodes[i][1] - nodes[i - 1][1]) * k;
      }
    }

    return nodes[nodes.length - 1][1];
  };

  const out = new Float32Array((n - 1) * seg * 6 * FOG_FLOATS);
  let o = 0;

  const ring = (k: number, angle: number) => {
    const nrm = frames.n[k];
    const bin = frames.b[k];
    const cs = Math.cos(angle);
    const sn = Math.sin(angle);
    const dx = nrm[0] * cs + bin[0] * sn;
    const dy = nrm[1] * cs + bin[1] * sn;
    const dz = nrm[2] * cs + bin[2] * sn;
    const s = curve.cum[k];
    const r = radiusAt(s);
    const p = curve.pts[k];
    const fade = smooth01(s / spec.fadeIn) * smooth01((curve.total - s) / spec.fadeOut);

    out[o++] = p[0] + dx * r; out[o++] = p[1] + dy * r; out[o++] = p[2] + dz * r;
    out[o++] = dx; out[o++] = dy; out[o++] = dz;
    out[o++] = s; out[o++] = angle; out[o++] = spec.tone ? spec.tone(s, curve.total) : 0; out[o++] = fade;
  };

  for (let k = 0; k < n - 1; k++) {
    for (let j = 0; j < seg; j++) {
      const a0 = (j / seg) * TAU;
      const a1 = ((j + 1) / seg) * TAU;

      ring(k, a0); ring(k, a1); ring(k + 1, a1);
      ring(k, a0); ring(k + 1, a1); ring(k + 1, a0);
    }
  }

  return out;
}

// Several bodies in one mesh. `toEngine` turns their points from the frame they were made in (a bank's, a turbocharger
// module's) into the engine's; null when they were made in the engine's own frame
function fogMesh(specsIn: FogSpec[], toEngine: ((q: FwVec3) => FwVec3) | null): FogMesh {
  const fx = toEngine;
  const specs = fx ? specsIn.map((sp) => ({ ...sp, points: sp.points.map((q) => fx(q)) })) : specsIn;

  const parts = specs.map(buildFog);
  let total = 0;

  for (const p of parts) total += p.length;

  const data = new Float32Array(total);
  let at = 0;

  for (const p of parts) {
    data.set(p, at);
    at += p.length;
  }

  return { data, count: total / FOG_FLOATS };
}

// kind 4: the hot gas past the collectors (to the turbines and out), darker; kind 0: the cold air going in; kind 1: the hot gas going out; kind 2: the hot gas's
// brighter core through the turbine; kind 3: the air's brighter, cooler core through the compressor
type FogGroup = {
  mesh: FogMesh;
  kind: number;
  cyl: number; // -1: always moving; else the cylinder whose valve drives it
  valve: number; // 0 intake, 1 exhaust
  passes: number;
  feeds: number[]; // for a body that is always moving: the cylinders whose exhaust it carries
  phase: number; // this frame
  drive: number; // 0..1, this frame
};

// A body with one radius all along
const flat = (r: number): Array<[number, number]> => [[0, r]];

export const FOG_GROUPS: FogGroup[] = [];

// The radius a body has at distance s along it, from its nodes
function nodeRadius(nodes: Array<[number, number]>, s: number): number {
  if (s <= nodes[0][0]) return nodes[0][1];

  for (let i = 1; i < nodes.length; i++) {
    if (s <= nodes[i][0]) {
      const k = (s - nodes[i - 1][0]) / (nodes[i][0] - nodes[i - 1][0] || 1);

      return nodes[i - 1][1] + (nodes[i][1] - nodes[i - 1][1]) * k;
    }
  }

  return nodes[nodes.length - 1][1];
}

// A thin thread inside a body, running along it: the body's path, moved sideways by a share of the body's
// radius, at an angle round it. Three of them, a third of a turn apart, run side by side, straight, not
// winding; and the pattern runs along them as along the body
function threadSpec(
  points: FwVec3[], nodes: Array<[number, number]>, share: number, phi: number, minOffset: number,
  fadeIn: number, fadeOut: number, threadR = 1.5
): FogSpec {
  const curve = curveFromPoints(points, 6);
  const fr = framesOf(curve);
  const cs = Math.cos(phi);
  const sn = Math.sin(phi);
  const pts: FwVec3[] = curve.pts.map((p, k) => {
    const o = Math.max(minOffset, nodeRadius(nodes, curve.cum[k]) * share);

    return [
      p[0] + (fr.n[k][0] * cs + fr.b[k][0] * sn) * o,
      p[1] + (fr.n[k][1] * cs + fr.b[k][1] * sn) * o,
      p[2] + (fr.n[k][2] * cs + fr.b[k][2] * sn) * o,
    ] as FwVec3;
  });

  return { points: pts, nodes: [[0, threadR]], fadeIn, fadeOut, seg: 8, spacing: 6 };
}

// The air of one bank: its intake, its charge as far as the intercooler and back, its cylinders' ports and jets, its
// exhaust and its turbocharger. It is made in the bank's own frame, with what lies in the engine's frame (the charge
// pipes, the intercooler) put into the bank's, and turned into the engine's at the end.
function buildBankFog(bank: Bank, bi: number) {
  const base = bi * CT_X.length; // this bank's first cylinder, among the twelve
  const m = MODULES[bi];
  const XB = (q: FwVec3): FwVec3 => bankPoint(bank, q[0] + bank.dx, q[1], q[2]); // a point of the bank's frame, in the engine's
  const XM = (q: FwVec3): FwVec3 => modulePoint(m, q); // a point of the module's frame, in the engine's
  const toMod = (q: FwVec3): FwVec3 => {
    // a point of the engine's frame, in the module's
    const d: FwVec3 = [q[0] - m.q[0], q[1] - m.q[1], q[2] - m.q[2]];

    return [
      m.r[0] * d[0] + m.r[1] * d[1] + m.r[2] * d[2] + MODULE_ORIGIN[0],
      m.r[3] * d[0] + m.r[4] * d[1] + m.r[5] * d[2] + MODULE_ORIGIN[1],
      m.r[6] * d[0] + m.r[7] * d[1] + m.r[8] * d[2] + MODULE_ORIGIN[2],
    ];
  };

  const zs = bank.phi > 0 ? -1 : 1; // which side of the intercooler this bank is on

  const group = (mesh: FogMesh, kind: number, cyl = -1, valve = 0, feeds: number[] = []) => {
    FOG_GROUPS.push({ mesh, kind, cyl: cyl >= 0 ? base + cyl : cyl, valve, passes: 3, feeds: feeds.map((c) => base + c), phase: 0, drive: 1 });
  };

  // ---- the intake, from outside to the intercooler's inlet tank ----
  // out below the air filter, up through it, round the elbow, and along the shaft to the wheel
  const intakeBack = PIPES.intake.pts.slice().reverse();
  const mouthPt = intakeBack[0];
  const filterAxis = vnorm(vsub(mouthPt, intakeBack[1])); // out of the pipe, along the filter
  const start: FwVec3 = vadd(mouthPt, vscale(filterAxis, 190));
  const wheel = turboWorld([TB.half, 0, 0]);
  const compressorPts = compressorPathLocal().map(turboWorld);
  const IP = (p: FwVec3) => icPlace(zs, p); // a point of the intercooler as it was built, where it stands
  const tankInC = toMod(IP([IC.x, IC_STAND_Y, zs * IC_CHARGE_IN_Z])); // the rear tank: the hot charge comes in (in the module's frame)
  const tankOutC = IP([IC.x, IC_STAND_Y, zs * IC_CHARGE_OUT_Z]); // the front tank: the cooled charge leaves (in the engine's)
  const hotPts = CHARGE_PIPES.hot[bi].pts.map(toMod);
  const coolPts = CHARGE_PIPES.cool[bi].pts;
  const cPts: FwVec3[] = [start, ...intakeBack, wheel, ...compressorPts, ...hotPts, tankInC];

  const toWheel = polyLength([start, ...intakeBack, wheel]);
  const radial = vlen(vsub(compressorPts[0], wheel));
  const compressorLen = polyLength(compressorPts);
  const spiralLen = compressorLen - COMPRESSOR_OUTLET_LEN;
  const s0 = toWheel + radial; // the spiral's start
  const sOut = s0 + compressorLen; // the end of the outlet
  const sHot = sOut + polyLength(hotPts);
  const sEnd = sHot + vlen(vsub(tankInC, hotPts[hotPts.length - 1]));

  const chargeNodes: Array<[number, number]> = [
    [0, 62], [80, 46], [190, 17], [toWheel - 20, 11], [toWheel, 6], [s0, compressorSection(0) * 0.5],
  ];

  for (let k = 1; k <= 8; k++) chargeNodes.push([s0 + (k / 8) * spiralLen, compressorSection(k / 8) * 0.5]);

  chargeNodes.push([sOut, compressorSection(1) * 0.5], [sOut + 30, 14.5], [sHot - 10, 14.5], [sEnd, 20]);

  // the two tanks and the core between them: the air spreads into the tank, goes
  // through the core's flat tubes, and is gathered in the second tank
  const tankHalf = IC_HALF.y - 12;
  // (hot: 1 for the tank the warm charge comes into, 0 for the one the cooled charge leaves by)
  const tank = (z: number, hot: number): FogSpec => ({
    points: [IP([IC.x, IC_STAND_Y - tankHalf, z]), IP([IC.x, IC_STAND_Y + tankHalf, z])],
    nodes: flat(21), fadeIn: 24, fadeOut: 24, seg: 18, spacing: 8,
    tone: () => hot,
  });
  const coreTubes: FogSpec[] = [];

  for (let k = 0; k < 9; k++) {
    coreTubes.push({
      points: [IP([IC.x, IC_STAND_Y - 88 + k * 22, zs * IC_CHARGE_IN_Z]), IP([IC.x, IC_STAND_Y - 88 + k * 22, zs * IC_CHARGE_OUT_Z])],
      nodes: flat(5.5), fadeIn: 14, fadeOut: 14, seg: 10, spacing: 8,
      tone: (s, total) => 1 - smooth01(s / total), // cooled along the tube
    });
  }

  // after the intercooler: the cool pipe, the throttle, the plenum
  const afterPts: FwVec3[] = [tankOutC, ...coolPts, PLENUM_MIDS[zs < 0 ? 0 : 1]]; // into the plenum, where the runners take it
  const sCool = vlen(vsub(coolPts[0], tankOutC)) + polyLength(coolPts);

  // the colour goes from the sky blue of the air coming in, through cobalt in the compressor, to the indigo of the
  // warm compressed charge, as the exhaust goes from orange through gold to red
  group(fogMesh([{ points: cPts, nodes: chargeNodes, fadeIn: 110, fadeOut: 40, tone: (s) => smooth01((s - toWheel) / Math.max(1, sHot - toWheel)) }], XM), 0);
  group(fogMesh([tank(zs * IC_CHARGE_IN_Z, 1), tank(zs * IC_CHARGE_OUT_Z, 0), ...coreTubes], null), 0);
  group(fogMesh([{
    points: afterPts,
    nodes: [[0, 14.5], [sCool, 14.5], [sCool + 12, 17.5]],
    fadeIn: 24, fadeOut: 40, spacing: 6,
  }], null), 0);

  // ---- through the compressor the air shows a cooler core inside the body, with three threads beside it, as the gas
  // does through the turbine: in at the filter's pipe, round the wheel's housing, and out. Here the core is wide and
  // soft, filling most of the housing's section, and the threads are spread out through it, so that the cold air
  // is seen to fill the compressor rather than run through it as a sharp line ----
  const coldPath: FwVec3[] = [...intakeBack, wheel, ...compressorPts];
  const toWheelC = polyLength([...intakeBack, wheel]);
  const COLD_CORE = 0.62; // of the housing's section
  const coldNodes: Array<[number, number]> = [
    [0, 11], [toWheelC - 20, 11], [toWheelC, 8], [toWheelC + radial, compressorSection(0) * COLD_CORE],
  ];

  for (let k = 1; k <= 8; k++) coldNodes.push([toWheelC + radial + (k / 8) * spiralLen, compressorSection(k / 8) * COLD_CORE]);

  coldNodes.push([toWheelC + radial + compressorLen, 10]);

  group(
    fogMesh([
      { points: coldPath, nodes: coldNodes, fadeIn: 30, fadeOut: 40, spacing: 4 },
      ...[0, TAU / 3, (2 * TAU) / 3].map((phi) => threadSpec(coldPath, coldNodes, 0.55, phi, 3.0, 30, 40, 2.6)),
    ], XM),
    3
  );

  // streaks along each cylinder's port, bright while its valve is open: the air is seen to go in and out of every cylinder
  const CY_IN: [number, number, number] = [0.22, 0.8, 1.0];
  const CY_IN2: [number, number, number] = [0.7, 0.95, 1.0];
  const CY_EX: [number, number, number] = [1.0, 0.24, 0.02];
  const CY_EX2: [number, number, number] = [1.0, 0.7, 0.3];
  const cylTracer = (pts: FwVec3[], cylIndex: number, valve: number, seed: number) => {
    AIR_FLOWS.push({
      curve: curveFromPoints(pts.map(XB), 5), count: 3, passes: 3, alpha: 0.95, spread: 4, swirl: 0, trail: 45, width: 1.9, ends: 0.08,
      tint: valve === 0 ? (u: number) => mixColor(CY_IN, CY_IN2, smooth01(u)) : (u: number) => mixColor(CY_EX, CY_EX2, smooth01(1 - u)),
      theta: scatter(3, seed * 3).map((_, i) => (i * TAU) / 3 + 0.5),
      radial: scatter(3, seed * 5 + 2).map(() => 1),
      rnd: scatter(3, seed * 7 + 1),
      gate: { cyl: cylIndex, valve },
      straight: true,
      hot: valve === 1,
    });
  };

  // ---- each cylinder: a runner, and a port with a jet for each valve ----
  for (let i = 0; i < CT_X.length; i++) {
    for (const sigma of [1, -1]) {
      const side = sigma * IN_SIDE; // the side of the head its valves are on
      // (on the exhaust side: the short stub into the log)
      const stub = exhaustStub(CT_X[i]); // from the port out to the log: reversed, from the log to the head
      const runner = sigma > 0 ? PIPES.runner(i) : curveFromPoints([...stub.pts.slice().reverse(), [CT_X[i], PORT_Y, side * (98 + HEAD_PORT_DZ)]], 4);
      const inHead = runner.pts[runner.pts.length - 1];
      const specs: FogSpec[] = [];
      const runnerPts = sigma > 0 ? runner.pts : runner.pts.slice().reverse();

      const runnerLen = polyLength(runnerPts);

      specs.push({
        points: runnerPts,
        // exhaust runners are the same width all along; the intake ones widen toward the head
        nodes: sigma > 0 ? [[0, 17], [runnerLen * 0.72, 17], [runnerLen, 11]] : [[0, 11], [Math.min(60, runnerLen), 16]],
        fadeIn: sigma > 0 ? 14 : 1, fadeOut: sigma > 0 ? 1 : 16, seg: 14, spacing: 6,
      });

      for (const sx of [-1, 1]) {
        const x = seatX(i, sigma, sx);
        const seatZ = side * VT.zSeat;
        const port = roundedCurve([inHead, [x, -277 - ROD_LIFT, side * 66], [x, -272 - ROD_LIFT, side * 42], [x, PORT_SEAT_Y, seatZ]], 9, 5);
        const jet = chamberJet(i, x, seatZ);
        const forward = [...port.pts, ...jet.slice(1)];
        const toSeat = polyLength(port.pts);
        const total = polyLength(forward);

        if (sigma > 0) {
          // in through the port, then a jet that widens as it goes down the bore
          specs.push({
            points: forward,
            nodes: [[0, 6.5], [toSeat, 6.5], [total, 15]],
            fadeIn: 1, fadeOut: 60, seg: 12, spacing: 6,
          });
        } else {
          // the same, backwards: drawn in from the bore, up through the port
          specs.push({
            points: forward.slice().reverse(),
            nodes: [[0, 15], [total - toSeat, 6.5], [total, 6.5]],
            fadeIn: 60, fadeOut: 1, seg: 12, spacing: 6,
          });
        }

        cylTracer(
          sigma > 0 ? [...runnerPts, ...forward] : [...forward.slice().reverse(), ...runnerPts],
          base + i, sigma > 0 ? 0 : 1, 900 + base * 3 + i * 7 + (sigma > 0 ? 0 : 3) + (sx > 0 ? 1 : 0)
        );
      }

      group(fogMesh(specs, XB), sigma > 0 ? 0 : 1, i, sigma > 0 ? 0 : 1);
    }
  }

  // ---- the exhaust: out of each port along its runner, into its 3-into-1 collector, up into the cone (this bank's
  // own), then, with the other bank's, through the turbine, out of the pipe under the engine, where it spreads and thins
  const runners = EXHAUST_RUNNERS[bi];
  const runnerSpecs: FogSpec[] = [];

  // out of each port along its runner and on through the collector and its pipe into the turbine: as it was, in a
  // light orange (kind 4), not the fiery red of the ports
  for (let i = 0; i < CT_X.length; i++) {
    const col = runners.collectors[0];
    const pts: FwVec3[] = [...runners.runners[i].pts, ...col.pts];
    const len = polyLength(pts);

    runnerSpecs.push({ points: pts, nodes: [[0, 10.5], [60, 16], [len - col.total, 16], [len, 24]], fadeIn: 20, fadeOut: 30, seg: 14, spacing: 6 });
  }

  group(fogMesh(runnerSpecs, null), 4, -1, 1, CT_X.map((_, c) => c));

  const turbinePts = turbinePathLocal().map(turboWorld);
  const centre = turboWorld([-TB.half, 0, 0]);
  const exitEnd = turboWorld([-135, 0, 0]);
  const downPts = DOWNPIPES[bi].pts.map(toMod); // the exhaust pipe under the engine
  const tailEnd = downPts[downPts.length - 1];
  const plumeEnd: FwVec3 = vadd(tailEnd, vscale(vnorm(vsub(tailEnd, downPts[downPts.length - 2])), 132));
  const gPts: FwVec3[] = [...PIPES.log.pts, ...turbinePts, centre, exitEnd, ...downPts, plumeEnd];

  const logLen = polyLength([...PIPES.log.pts, turbinePts[0]]);
  const turbineLen = polyLength(turbinePts);
  const spiral2 = turbineLen - TURBINE_INLET_LEN;
  const g0 = logLen + TURBINE_INLET_LEN; // the spiral's start
  const g1 = logLen + turbineLen; // its end
  const g2 = g1 + vlen(vsub(centre, turbinePts[turbinePts.length - 1])) + vlen(vsub(exitEnd, centre)); // end of the exit
  const g3 = g2 + polyLength(downPts);

  {
    const gasNodes: Array<[number, number]> = [
      [0, collectorRadius(0) * 0.85], [COLLECTOR_CONE, collectorRadius(COLLECTOR_CONE) * 0.85],
      [COLLECTOR_CONE + 30, 24 * 0.85], [logLen, 24 * 0.85], [g0 - 10, 22],
    ];

    for (let k = 0; k <= 8; k++) gasNodes.push([g0 + (k / 8) * spiral2, turbineSection(k / 8) * 0.5]);

    gasNodes.push([g1 + 40, 10], [g2, 15], [g3 - 70, 17], [g3 - 15, 21], [g3, 25], [g3 + 132, 60]);

    // this bank's gas: fed by its six cylinders
    group(
      fogMesh([{
        points: gPts,
        nodes: gasNodes,
        // from orange to a deeper orange as it cools, along the tail and the plume
        tone: (s) => smooth01((s - g1) / Math.max(1, g3 + 132 - g1)),
        fadeIn: 30, fadeOut: 170,
      }], XM),
      4, -1, 1, CT_X.map((_, c) => c) // kind 4: the gas past the collector, a darker, quieter red than in the runners
    );

    // Through the turbine the gas shows a hotter, brighter core, inside the body:
    // in at the inlet, round the wheel's housing, and out along the shaft
    const coreNodes: Array<[number, number]> = [[0, 12], [TURBINE_INLET_LEN, 12]];

    for (let k = 1; k <= 8; k++) coreNodes.push([TURBINE_INLET_LEN + (k / 8) * spiral2, turbineSection(k / 8) * 0.3]);

    coreNodes.push([turbineLen + 40, 6], [turbineLen + 120, 8]);

    // and three fine threads beside it, straight, a third of a turn apart
    const turbinePath: FwVec3[] = [...turbinePts, centre, exitEnd];

    group(
      fogMesh([
        { points: turbinePath, nodes: coreNodes, fadeIn: 30, fadeOut: 40, spacing: 4 },
        ...[0, TAU / 3, (2 * TAU) / 3].map((phi) => threadSpec(turbinePath, coreNodes, 0, phi, 3.2, 30, 40)),
      ], XM),
      2
    );
  }

  // ---- tracers: bright streaks that run the whole way along the air's path, from the filter to the plenum, and the
  // gas's, from the collector to the tail, so that the circulation through the engine can be followed at a glance ----
  const tracer = (
    pts: FwVec3[], count: number, passes: number, spread: number, swirl: number, width: number, trail: number,
    tint: (u: number) => [number, number, number], hot = false
  ) => {
    const seed = 40 + bi * 17 + AIR_FLOWS.length;

    // three straight lines side by side along the path (`count` is how many streaks run in all, a third on each line)
    AIR_FLOWS.push({
      curve: curveFromPoints(pts, 6), count, passes, alpha: 0.95, spread, swirl, trail, width, tint, ends: 0.05,
      theta: scatter(count, seed * 3).map((_, i) => ((i % 3) * TAU) / 3 + 0.5),
      radial: scatter(count, seed * 5 + 2).map(() => 1),
      rnd: scatter(count, seed * 7 + 1),
      straight: true,
      hot,
    });
  };

  const SKY: [number, number, number] = [0.25, 0.82, 1.0];
  const COBALT: [number, number, number] = [0.06, 0.42, 1.0];
  const INDIGO: [number, number, number] = [0.5, 0.34, 1.0];
  const EMBER: [number, number, number] = [1.0, 0.24, 0.02];
  const GOLD: [number, number, number] = [1.0, 0.6, 0.18];

  tracer(
    [
      ...[start, ...intakeBack, wheel, ...compressorPts].map(XM),
      ...CHARGE_PIPES.hot[bi].pts,
      IP([IC.x, IC_STAND_Y, zs * IC_CHARGE_IN_Z]), IP([IC.x, IC_STAND_Y, zs * IC_CHARGE_OUT_Z]),
      ...CHARGE_PIPES.cool[bi].pts,
      PLENUM_MIDS[zs < 0 ? 0 : 1],
    ],
    18, 3, 9, 0, 2.4, 80,
    (u) => mixColor(mixColor(SKY, COBALT, smooth01(u / 0.12)), INDIGO, smooth01((u - 0.14) / 0.1) * (1 - smooth01((u - 0.5) / 0.12)) * 0.7)
  );

  tracer([...runners.runners[1].pts, ...runners.collectors[0].pts, ...gPts.map(XM)], 15, 4, 9, 0, 2.3, 75, (u) => mixColor(EMBER, GOLD, smooth01(u / 0.3) * (1 - smooth01((u - 0.55) / 0.3))), true);

}

for (let bi = 0; bi < BANKS.length; bi++) buildBankFog(BANKS[bi], bi);
