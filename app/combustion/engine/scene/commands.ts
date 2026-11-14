// Where every part is drawn this frame.

import { BANKS, CRANK_DIRECTION, driveShift, CT_X, CYLS, FLYWHEEL_WORLD_X, INJ, L, LINER_H, ORIENT, PLUG, R } from "../core/constants";
import type { Bank } from "../core/constants";
import { normalizeCycle } from "../core/numbers";
import { SCENE_OPTIONS } from "../core/options";
import type { FwVec3 } from "../mesh/builder";
import { MODULES, modulePoint } from "../mesh/exhaust";
import type { TModule } from "../mesh/exhaust";
import { FAN_PAIR } from "../mesh/fan";
import { IC_CORE_Z, IC_INNER_Z, IC_OUTER_Z, IC_STAND_Y, icPlace } from "../mesh/intercooler";
import { ST_AT, ST_PHI_MAX, ST_PIV_A, ST_PIV_Q, ST_SQ, sA, stA } from "../mesh/starter";
import { CAM_RC, IDLER_Y, PRIMARY, SECONDARY, VT_PITCH, VT_RC, primaryDx } from "../mesh/timingChain/chainPath";
import type { Chain } from "../mesh/timingChain/chainPath";
import { IC, IC_HALF, TURBO_AT } from "../mesh/turbo";
import { IN_SIDE, VT, VT_LIFT_PEAK, VT_TILT, camLift, valveX } from "../mesh/valvetrain";
import { FLY_RANGE, FW_MARK_OFFSET_DEG, HEAD_RANGE, TRAIN_MESH, bankPart } from "./meshes";
import type { EngineFrame } from "../sim/clock";
import { STARTER, stPlunger, stSlide, starterArm, starterPin, starterTrack } from "../sim/starter";

/* ---------------- per-frame draw commands ---------------- */

export type DrawCmd = {
  range: [number, number];
  spin: [number, number];
  offset: FwVec3;
  scaleY: number;
  orient: number; // a place in ORIENTATIONS (see ORIENT)
};

// The command list is the same length every frame, so its objects are
// reused instead of being allocated 200 times per frame: no garbage, no
// collector pauses, a steadier frame rate.
const SCENE_CMDS: DrawCmd[] = [];
let sceneCount = 0;

function emit(
  range: [number, number],
  s0: number, s1: number,
  ox: number, oy: number, oz: number,
  scaleY = 1,
  orient = 0
) {
  let c = SCENE_CMDS[sceneCount];

  if (!c) {
    c = { range: [0, 0], spin: [1, 0], offset: [0, 0, 0], scaleY: 1, orient: 0 };
    SCENE_CMDS[sceneCount] = c;
  }

  sceneCount++;

  c.range[0] = range[0];
  c.range[1] = range[1];
  c.spin[0] = s0;
  c.spin[1] = s1;
  c.offset[0] = ox;
  c.offset[1] = oy;
  c.offset[2] = oz;
  c.scaleY = scaleY;
  c.orient = orient;
}

// A part of a bank: placed in the bank's own frame, and turned into the engine's
function emitInBank(
  bank: Bank,
  range: [number, number],
  s0: number, s1: number,
  ox: number, oy: number, oz: number,
  scaleY = 1
) {
  const m = bank.m;

  emit(range, s0, s1, ox, m[4] * oy + m[7] * oz, m[5] * oy + m[8] * oz, scaleY, bank.orient);
}

const CHAIN_A = { y: 0, z: 0, circle: -1 };
const CHAIN_B = { y: 0, z: 0, circle: -1 };

// Where the crank pin of cylinder `i` really is: the crankshaft's own spin
// applied to the pin's place in the crank. The rod and the piston hang from it,
// so they cannot drift away from the crank.
const PIN_STATE = { pinY: 0, zp: 0, dy: 0, wristY: 0 };

export function crankPin(frame: EngineFrame, i: number) {
  const cy = CYLS[i];
  const alpha = (cy.bank.dir * frame.crankAngle * Math.PI) / 180;
  const spinC = Math.cos(alpha);
  const spinS = Math.sin(alpha);
  const beta = cy.bank.betaLocal[cy.k];
  const y0 = -R * Math.cos(beta);
  const z0 = R * Math.sin(beta);

  PIN_STATE.pinY = y0 * spinC + z0 * spinS;
  PIN_STATE.zp = -y0 * spinS + z0 * spinC; // crank pin sideways
  PIN_STATE.dy = Math.sqrt(Math.max(0, L * L - PIN_STATE.zp * PIN_STATE.zp));
  PIN_STATE.wristY = PIN_STATE.pinY - PIN_STATE.dy;

  return PIN_STATE;
}

// Everything of one bank that moves or stands: its head, its cams, its valves, its timing drive
function computeBankCommands(frame: EngineFrame, bank: Bank) {
  const r = HEAD_RANGE;
  const alpha = (bank.dir * frame.crankAngle * Math.PI) / 180;
  const camAlpha = (bank.dir * frame.camAngle * Math.PI) / 180;
  const cosT = Math.cos(VT_TILT);
  const sinT = Math.sin(VT_TILT);
  const y0 = VT.ySeat + 0.5;
  const dx = bank.dx;

  // Static casting parts: the cam towers, and the deck of the head
  emitInBank(bank, r.towers, 1, 0, dx, 0, 0);
  emitInBank(bank, bankPart(bank, "deck"), 1, 0, dx, 0, 0);
  emitInBank(bank, bankPart(bank, "headSolid"), 1, 0, dx, 0, 0);

  for (let k = 0; k < CT_X.length; k++) {
    // The flange at the foot of each glass sleeve
    emitInBank(bank, r.linerRim, 1, 0, CT_X[k] + dx, VT.ySeat + LINER_H, 0);

    // One fuel injector per cylinder, its nozzle at the chamber roof
    emitInBank(bank, r.injector, 1, 0, CT_X[k] + dx + INJ.x, VT.ySeat + 1, INJ.z);

    // The spark plug, standing on the chamber roof, on the bore's axis
    emitInBank(bank, r.sparkPlug, 1, 0, CT_X[k] + dx + PLUG.x, VT.ySeat, PLUG.z);
  }

  // The flanges at the ports, and the welds where the intake runners leave the plenum and meet the head
  if (!SCENE_OPTIONS.seeThrough) emitInBank(bank, r.exhaustFlanges, 1, 0, dx, 0, 0); // (the headers' port flanges: with the headers, solid engine only)
  if (!SCENE_OPTIONS.seeThrough) emitInBank(bank, r.intakeWelds, 1, 0, dx, 0, 0); // (the intake rail and its port flanges behind the head: solid engine only)

  // Camshafts: this bank's, made for its own phases and its own sense of turn
  const cc = Math.cos(camAlpha);
  const cs = Math.sin(camAlpha);

  emitInBank(bank, bankPart(bank, "camIn"), cc, cs, dx, VT.yCam, IN_SIDE * VT.zCam);
  emitInBank(bank, bankPart(bank, "camEx"), cc, cs, dx, VT.yCam, -IN_SIDE * VT.zCam);

  // Valves: two intake and two exhaust per cylinder
  for (let k = 0; k < CT_X.length; k++) {
    const p = normalizeCycle(frame.t + bank.phase[k]);

    for (let sg = 0; sg < 2; sg++) {
      const sigma = sg === 0 ? 1 : -1;
      const peak = sigma > 0 ? VT_LIFT_PEAK.intake : VT_LIFT_PEAK.exhaust;
      // The tappet rides on the real profile; the valve slides along its tilted
      // axis, so its travel is the vertical lift divided by cos(tilt)
      const lift = camLift(p, peak) / cosT;
      const zs = sigma * IN_SIDE; // the side of the head this valve is on
      const spin1 = zs * sinT;
      const valve = sigma > 0 ? r.valveIn : r.valveEx;

      for (let sxi = 0; sxi < 2; sxi++) {
        const x = valveX(k, sigma, sxi === 0 ? -1 : 1) + dx;

        emitInBank(bank, r.valveStatic, cosT, spin1, x, y0, zs * VT.zSeat);
        emitInBank(bank, sigma > 0 ? r.seatIn : r.seatEx, 1, 0, x, y0, zs * VT.zSeat);
        emitInBank(bank, valve, cosT, spin1, x, y0 + lift * cosT, zs * (VT.zSeat - lift * sinT));
        emitInBank(
          bank, r.spring, cosT, spin1,
          x, y0 - 27.5 * cosT, zs * (VT.zSeat + 27.5 * sinT),
          (VT.springFree - lift) / VT.springFree
        );
      }
    }
  }

  // Timing drive, in two stages (see chainPath.ts): the primary chain from the crank's sprocket to the intermediate
  // shaft's large sprocket, and the secondary chain from its small sprocket up to the cams' sprockets
  // the bank's timing drive, at the place both banks' drives share (DRIVE_DX), its primary chain behind or in front of
  // its secondary (primaryDx), so that the two primaries run clear of each other on the crank's nose
  const driveX = dx + driveShift(bank);
  const chainX = VT.chainX + driveX;
  const primaryX = chainX + primaryDx(bank);
  const spin = (turn: number, phase: number): [number, number] => [Math.cos(alpha * turn + phase), Math.sin(alpha * turn + phase)];
  const P = PRIMARY.phases;
  const S = SECONDARY.phases;

  emitInBank(bank, r.blade, 1, 0, driveX, 0, 0);
  emitInBank(bank, r.bladeFar, 1, 0, driveX, 0, 0);
  emitInBank(bank, bankPart(bank, "bladePrimary"), 1, 0, driveX, 0, 0);
  emitInBank(bank, bankPart(bank, "bladePrimaryFar"), 1, 0, driveX, 0, 0);

  emitInBank(bank, r.sprocketCrank, ...spin(1, P[0]), primaryX, 0, 0);
  emitInBank(bank, r.sprocketIdler, ...spin(0.5, P[1]), primaryX, IDLER_Y, 0);
  emitInBank(bank, r.sprocketIdlerSmall, ...spin(0.5, S[0]), chainX, IDLER_Y, 0);
  emitInBank(bank, r.sprocketCam, ...spin(0.5, S[1]), chainX, VT.yCam, VT.zCam);
  emitInBank(bank, r.sprocketCam, ...spin(0.5, S[2]), chainX, VT.yCam, -VT.zCam);

  // Each chain moves against its driving sprocket's turning direction in the path's own (counter-clockwise) parameter
  emitChain(bank, PRIMARY, -VT_RC * alpha, primaryX);
  emitChain(bank, SECONDARY, -CAM_RC * alpha * 0.5, chainX);
}

// One chain's links, inner and outer plates in turn, from where the chain has moved to
function emitChain(bank: Bank, chain: Chain, s0: number, x: number) {
  const r = HEAD_RANGE;
  let prev = chain.path.at(s0, CHAIN_A);
  let next = CHAIN_B;

  for (let i = 0; i < chain.links; i++) {
    chain.path.at(s0 + (i + 1) * VT_PITCH, next);

    const dy = next.y - prev.y;
    const dz = next.z - prev.z;
    const len = Math.hypot(dy, dz) || 1;

    emitInBank(bank, i % 2 === 0 ? r.chainInner : r.chainOuter, dy / len, -dz / len, x, prev.y, prev.z);

    const tmp = prev;
    prev = next;
    next = tmp;
  }
}

// Every part's placement for this frame: the crank train, then each bank
export function computeSceneCommands(frame: EngineFrame): DrawCmd[] {
  sceneCount = 0;

  const alpha = (CRANK_DIRECTION * frame.crankAngle * Math.PI) / 180;

  emit(TRAIN_MESH.caps, 1, 0, 0, 0, 0);
  emit(TRAIN_MESH.crank, Math.cos(alpha), Math.sin(alpha), 0, 0, 0);

  // The nose of the shaft
  emit(TRAIN_MESH.snout, Math.cos(alpha), Math.sin(alpha), 0, 0, 0);

  // The flywheel turns with the crankshaft, on its flange, with its marked tooth
  // on the same line as the mark on the crankshaft
  const flySpin = ((CRANK_DIRECTION * frame.crankAngle + FW_MARK_OFFSET_DEG) * Math.PI) / 180;

  emit(FLY_RANGE, Math.cos(flySpin), Math.sin(flySpin), FLYWHEEL_WORLD_X, 0, 0);

  // Rods swing in the bank's own plane, so a rod's spin has the opposite sign to the
  // crankshaft's; each piston slides along its bank's axis
  for (let i = 0; i < CYLS.length; i++) {
    const cy = CYLS[i];
    const pin = crankPin(frame, i);

    emitInBank(cy.bank, TRAIN_MESH.rod, pin.dy / L, -pin.zp / L, cy.x, pin.wristY, 0);
    emitInBank(cy.bank, TRAIN_MESH.piston, 1, 0, cy.x, pin.wristY, 0);
  }

  for (const bank of BANKS) computeBankCommands(frame, bank);

  // The intercooler: two cores side by side, with an outer tank at each end and, between them, an inner tank for each core
  const r = HEAD_RANGE;

  // The turbocharger module: one, in the middle of the V
  const place = (range: Parameters<typeof emit>[0], m: TModule, turned: boolean, o: FwVec3, cos = 1, sin = 0) => {
    const w = modulePoint(m, o);

    emit(range, cos, sin, w[0], w[1], w[2], 1, turned ? m.orientTurbo : m.orientModule);
  };

  for (const m of MODULES) {
    const t: FwVec3 = TURBO_AT;
    const c = Math.cos(frame.turboAngle);
    const sn = Math.sin(frame.turboAngle);

    place(r.collectorFittings, m, false, [0, 0, 0]);
    place(r.turboFittings, m, false, [0, 0, 0]);
    place(r.turboHousing, m, true, t);
    place(r.turboFilter, m, true, t);
    place(r.turboWheelC, m, true, t, c, sn);
    place(r.turboWheelT, m, true, t, c, sn);
  }

  // The starter motor, on the side of the engine, its axis along the engine's, its pinion just in front of the ring gear and its body going
  // forward: in its own frame its axis `a` points toward the front of the engine, `p` out from the crank's axis (down and toward -z) and `q`
  // across (down and toward +z); its axis is at ST_D from the crank's
  starterTrack(flySpin);

  {
    const [bx, by, bz] = ST_AT;
    const phi = ST_PHI_MAX * STARTER.pull;
    const slide = stSlide(phi);
    const plunge = stPlunger(phi);
    const pin = starterPin();
    const arm = starterArm();
    const at = (a: number, p: number, q: number): FwVec3 => [bx - a, by + Math.SQRT1_2 * (p + q), bz + Math.SQRT1_2 * (q - p)];

    emit(r.starterBody, 1, 0, bx, by, bz, 1, ORIENT.STARTER);
    emit(r.starterShaft, Math.cos(arm), Math.sin(arm), bx, by, bz, 1, ORIENT.STARTER);
    emit(r.starterDrive, Math.cos(arm), Math.sin(arm), bx + slide, by, bz, 1, ORIENT.STARTER);
    // the drive's shell whole on the solid engine; cut open, to show its rollers, only on the see-through one
    if (!SCENE_OPTIONS.seeThrough) emit(r.starterDriveShell, Math.cos(arm), Math.sin(arm), bx + slide, by, bz, 1, ORIENT.STARTER);
    emit(r.starterPinion, Math.cos(pin), Math.sin(pin), bx + slide, by, bz, 1, ORIENT.STARTER);
    emit(r.starterPlunger, 1, 0, bx - plunge, by, bz, 1, ORIENT.STARTER);
    emit(r.starterDisc, 1, 0, bx - Math.min(plunge, 8), by, bz, 1, ORIENT.STARTER);

    const sp = at(stA(sA(240)) + plunge, 0, ST_SQ);

    emit(r.starterSpring, 1, 0, sp[0], sp[1], sp[2], (20 - plunge) / 20, ORIENT.STARTER_AXIAL);

    const pv = at(ST_PIV_A, 0, ST_PIV_Q);

    emit(r.starterFork, Math.cos(phi), Math.sin(phi), pv[0], pv[1], pv[2], 1, ORIENT.STARTER_FORK);
  }

  // The intake plenum on top of the V: on the solid engine only; on the see-through one it is taken away, to see in
  if (!SCENE_OPTIONS.seeThrough) emit(r.vPlenum, 1, 0, 0, 0, 0);
  if (!SCENE_OPTIONS.seeThrough) emit(r.plenumGate, 1, 0, 0, 0, 0); // its gate and square flange go with it
  // and the intake manifold under it, on both: its logs, flanges and throttles
  emit(r.intakeManifold, 1, 0, 0, 0, 0);

  // The intercoolers, one on each side of the engine (see icPlace): each core, the fan on its outer face, its two tanks
  for (const zs of [-1, 1]) {
    const turn = zs < 0 ? ORIENT.IC_NEG : ORIENT.IC_POS;
    const at = (p: FwVec3) => icPlace(zs, p);
    const core = at([0, IC_STAND_Y - IC.y, zs * IC_CORE_Z - IC.z]);

    const inner = at([IC.x, IC_STAND_Y, zs * IC_INNER_Z]);
    const outer = at([IC.x, IC_STAND_Y, zs * IC_OUTER_Z]);

    emit(r.intercooler, 1, 0, core[0], core[1], core[2], 1, turn);
    // two smaller fans on each core's face, side by side along it
    for (const dz of [-FAN_PAIR.offset, FAN_PAIR.offset]) {
      const fan = at([IC.x - IC_HALF.x - 1.5, IC_STAND_Y, zs * IC_CORE_Z + dz]);

      emit(r.fanShroud, 1, 0, fan[0], fan[1], fan[2], 1, turn);
      emit(r.fanRotor, Math.cos(frame.fanAngle), Math.sin(frame.fanAngle), fan[0], fan[1], fan[2], 1, turn);
    }
    // the low tank, the hot charge's: its port is cast on its face toward the engine (with the couplers)
    emit(zs < 0 ? r.icTankLow : r.icTankLowB, 1, 0, inner[0], inner[1], inner[2], 1, turn);
    // and the high tank, the cooled charge's: its outlet leaves its back face (with the cooled charge's pipe)
    emit(zs < 0 ? r.icTankBareB : r.icTankBare, 1, 0, outer[0], outer[1], outer[2], 1, turn);
  }

  emit(r.mufflers, 1, 0, 0, 0, 0); // the silencers, solid, in their wire sleeves
  emit(r.chargeCouplers, 1, 0, 0, 0, 0);
  emit(r.blowOffValves, 1, 0, 0, 0, 0);
  if (!SCENE_OPTIONS.seeThrough) emit(r.manifoldWelds, 1, 0, 0, 0, 0); // (the headers' joints and bungs: likewise)
  emit(r.turbineArc, 1, 0, 0, 0, 0);
  emit(r.drySump, 1, 0, 0, 0, 0);
  SCENE_CMDS.length = sceneCount;

  return SCENE_CMDS;
}
