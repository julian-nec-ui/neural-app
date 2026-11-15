// All the meshes built into one buffer, and where each part lies in it.

import { BANKS, CHAIN_X_WORLD, DRIVE_DX, TAU, VALVE_RH_EX, VALVE_RH_IN, driveShift, HEAD_WIDEN } from "../core/constants";
import { HEAD } from "../mesh/head";
import type { Bank } from "../core/constants";
import { FW_STRIDE, createMeshBuilder } from "../mesh/builder";
import type { MeshBuilder } from "../mesh/tubes";
import { buildTrainMesh } from "../mesh/crankTrain/trainMesh";
import { buildDownpipes, buildMufflerPart, buildExhaustFlanges, buildExhaustLogs, buildExhaustStubs, buildManifoldWelds, buildTurbineArc, buildTurboFeed } from "../mesh/exhaust";
import { FW_DIM, FW_VERTICES } from "../mesh/flywheel";
import { buildHeadWiring } from "../mesh/headWiring";
import { buildDeck, buildDeckSlab, buildHeadShell, buildHeadSolid, buildHeadTopFittings, buildLinerRim } from "../mesh/head";
import { buildHeadText, buildLidSignature } from "../mesh/headText";
import { buildIntakeManifold, buildPlenumGate, buildVPlenum } from "../mesh/plenum";
import { buildInjector, buildSparkPlug } from "../mesh/injectionIgnition";
import { buildBlock } from "../mesh/block";
import { buildDrySump, buildSumpFrontCover } from "../mesh/drySump";
import { buildTimingCover } from "../mesh/timingCover";
import { buildSmallFan } from "../mesh/fan";
import { buildBlowOffValves, buildChargeCouplers, buildChargePipes, buildCoolPipeWelds, buildCoolPipes, buildIntercooler, buildIntercoolerTank } from "../mesh/intercooler";
import { MAT_VT_HEAD_EX, MAT_VT_HEAD_IN, MAT_VT_VALVE_EX, MAT_VT_VALVE_IN } from "../mesh/materials";
import { buildCollector, buildCollectorFittings, buildIntakePipes, buildIntakeWelds, buildTurboFittings, buildTurboIntakePipe } from "../mesh/plumbing";
import { stretchTurn, buildStarterBody, buildStarterDisc, buildStarterDrive, buildStarterDriveShell, buildStarterFork, buildStarterPinion, buildStarterPlunger, buildStarterShaft, buildStarterShell, buildStarterSpring, buildStarterYoke } from "../mesh/starter";
import { CAM_RC, CHAIN_K, CHAIN_SEP, CHAIN_TEETH, DRIVE, MARK_ANGLE } from "../mesh/timingChain/chainPath";
import { buildChainLink } from "../mesh/timingChain/chainLink";
import { buildChainGuide } from "../mesh/timingChain/chainGuides";
import { buildSprocket } from "../mesh/timingChain/sprocket";
import { CHAIN_FWD, CRANK_GEAR_TEETH, GEAR_HALF, IDLER2 } from "../mesh/timingGears/gearTrain";
import { buildIdlerPost, buildSpurGear } from "../mesh/timingGears/spurGear";
import { buildCompressorWheel, buildTurbineWheel, buildTurboCasing, buildTurboFilter, buildTurboHousing } from "../mesh/turbo";
import { VT_LIFT_PEAK, buildCam, buildSpring, buildTowers, buildValve, buildValveSeat, buildValveStatic } from "../mesh/valvetrain";

/* ---------------- assembly ---------------- */

// Every part built into the shared mesh, by name, in the order it is built. A name is typed: a part drawn or built
// under a name that is not here is a compile error, and a name here that is never built stops the engine at load.
export const PART_NAMES = [
  "valveIn", "valveEx", "valveStatic", "spring", "camIn", "camEx", "camInB", "camExB", "towers", "deck", "deckB", "deckSlab", "deckSlabB",
  "headShell", "headShellB", "headSolid", "headSolidB", "headTop", "headTopB", "headWiring", "headWiringB", "linerRim", "turboHousing", "turboCasing", "intakePipes", "turboIntakePipe", "collector",
  "turboFilter", "seatIn", "seatEx", "turboWheelC", "turboWheelT", "collectorFittings", "turboFittings",
  "intercooler", "blowOffValves", "manifoldWelds", "intakeWelds", "turbineArc", "timingCover", "starterShell", "starterYoke", "drySump", "drySumpShell", "drySumpShellB", "block", "icTank", "icTankB", "icTankLow", "icTankLowB", "icTankBare", "icTankBareB", "fanShroud", "fanRotor", "chargePipes", "chargePipesB", "coolPipes", "coolPipesB", "coolWelds", "chargeCouplers", "exhaustLogs", "exhaustLogsR", "exhaustLogsB", "exhaustLogsBR", "turboFeed", "turboFeedB", "exhaustStubs",
  "exhaustFlanges", "downpipes", "downpipesB", "mufflers", "starterBody", "starterShaft", "starterDrive", "starterDriveShell", "starterPinion", "starterPlunger",
  "starterDisc", "starterSpring", "starterFork", "headTextA", "headTextB", "lidText", "vPlenum", "plenumGate", "intakeManifold", "gearCrank", "sumpFrontCover",
  "gearIdler1", "idlerPost2", "idlerPost2Spaced", "sprocketIdler", "sprocketCam",
  "sprocketCamSpaced", "chainInner", "chainOuter", "guideFixed", "guideArm", "injector", "sparkPlug",
] as const;

export type PartName = (typeof PART_NAMES)[number];

type HeadMesh = {
  vertices: Float32Array;
  parts: Record<PartName, [number, number]>;
};

// Build a head's part widened across by HEAD_WIDEN, about its bank's middle plane
function widened(b: MeshBuilder, build: () => void) {
  b.setStretchZ(HEAD_WIDEN);
  build();
  b.setStretchZ(1);
}

function buildHeadMesh(): HeadMesh {
  const b = createMeshBuilder(48);
  const parts: Partial<Record<PartName, [number, number]>> = {};

  // a starter part built along its axis, drawn with the motor made longer (starter.ts, ST_STRETCH)
  const stretched = (f: () => void) => {
    b.setTurn(stretchTurn);
    f();
    b.setTurn(null);
  };
  // Each part's vertices are moved out of the builder's working array into a typed chunk as soon as it is built, and the
  // array emptied: a plain array of the whole engine's floats would pass the most a JavaScript array may hold
  const chunks: Float32Array[] = [];
  let flushed = 0; // vertices moved out so far
  const flush = () => {
    if (b.out.length === 0) return;

    chunks.push(new Float32Array(b.out));
    flushed += b.out.length / FW_STRIDE;
    b.out.length = 0;
  };
  const part = (name: PartName, build: () => void) => {
    flush();
    const start = flushed;
    build();
    parts[name] = [start, flushed + b.out.length / FW_STRIDE - start];
    flush();
  };

  part("valveIn", () => buildValve(b, VALVE_RH_IN, MAT_VT_HEAD_IN, MAT_VT_VALVE_IN));
  part("valveEx", () => buildValve(b, VALVE_RH_EX, MAT_VT_HEAD_EX, MAT_VT_VALVE_EX));
  part("valveStatic", () => buildValveStatic(b));
  part("spring", () => buildSpring(b));
  part("camIn", () => buildCam(b, VT_LIFT_PEAK.intake, 1, BANKS[0]));
  part("camEx", () => buildCam(b, VT_LIFT_PEAK.exhaust, -1, BANKS[0]));
  part("camInB", () => buildCam(b, VT_LIFT_PEAK.intake, 1, BANKS[1]));
  part("camExB", () => buildCam(b, VT_LIFT_PEAK.exhaust, -1, BANKS[1]));
  part("towers", () => buildTowers(b));
  // each bank's head, moved back along its bank so that the two stand at the same place, of one length
  part("deck", () => widened(b, () => buildDeck(b, driveShift(BANKS[0]))));
  part("deckB", () => widened(b, () => buildDeck(b, driveShift(BANKS[1]))));
  part("deckSlab", () => widened(b, () => buildDeckSlab(b, driveShift(BANKS[0]))));
  part("deckSlabB", () => widened(b, () => buildDeckSlab(b, driveShift(BANKS[1]))));
  part("headShell", () => widened(b, () => buildHeadShell(b, driveShift(BANKS[0]))));
  part("headShellB", () => widened(b, () => buildHeadShell(b, driveShift(BANKS[1]))));
  part("headSolid", () => widened(b, () => buildHeadSolid(b, driveShift(BANKS[0]))));
  part("headSolidB", () => widened(b, () => buildHeadSolid(b, driveShift(BANKS[1]))));
  part("headTop", () => widened(b, () => buildHeadTopFittings(b, driveShift(BANKS[0]))));
  part("headTopB", () => widened(b, () => buildHeadTopFittings(b, driveShift(BANKS[1]))));
  // the ignition leads and the fuel rail on each head's top: drawn on the solid engine and on the see-through one alike
  part("headWiring", () => widened(b, () => buildHeadWiring(b, driveShift(BANKS[0]))));
  part("headWiringB", () => widened(b, () => buildHeadWiring(b, driveShift(BANKS[1]))));
  part("linerRim", () => buildLinerRim(b));
  part("turboHousing", () => buildTurboHousing(b));
  part("turboCasing", () => buildTurboCasing(b));
  part("intakePipes", () => buildIntakePipes(b));
  part("turboIntakePipe", () => buildTurboIntakePipe(b));
  part("collector", () => buildCollector(b));
  part("turboFilter", () => buildTurboFilter(b));
  part("seatIn", () => buildValveSeat(b, VALVE_RH_IN));
  part("seatEx", () => buildValveSeat(b, VALVE_RH_EX));
  part("turboWheelC", () => buildCompressorWheel(b));
  part("turboWheelT", () => buildTurbineWheel(b));
  part("collectorFittings", () => buildCollectorFittings(b));
  part("turboFittings", () => buildTurboFittings(b));
  part("intercooler", () => buildIntercooler(b));
  part("blowOffValves", () => buildBlowOffValves(b));
  part("manifoldWelds", () => buildManifoldWelds(b));
  part("turbineArc", () => buildTurbineArc(b));
  part("timingCover", () => buildTimingCover(b));
  part("starterShell", () => stretched(() => buildStarterShell(b)));
  part("starterYoke", () => stretched(() => buildStarterYoke(b)));
  part("drySump", () => buildDrySump(b, "solid"));
  part("sumpFrontCover", () => buildSumpFrontCover(b));
  part("drySumpShell", () => buildDrySump(b, "shell", -1));
  part("drySumpShellB", () => buildDrySump(b, "shell", 1));
  part("block", () => buildBlock(b));
  part("intakeWelds", () => buildIntakeWelds(b));
  part("vPlenum", () => buildVPlenum(b));
  part("plenumGate", () => buildPlenumGate(b));
  part("intakeManifold", () => buildIntakeManifold(b));
  part("icTank", () => buildIntercoolerTank(b, 1));
  part("icTankB", () => buildIntercoolerTank(b, -1));
  part("icTankLow", () => buildIntercoolerTank(b, 1, true, false));
  part("icTankLowB", () => buildIntercoolerTank(b, -1, true, false));
  part("icTankBare", () => buildIntercoolerTank(b, 1, false, false));
  part("icTankBareB", () => buildIntercoolerTank(b, -1, false, false));
  part("fanShroud", () => buildSmallFan(b, "shroud"));
  part("fanRotor", () => buildSmallFan(b, "rotor"));
  part("chargePipes", () => buildChargePipes(b, 0));
  part("chargePipesB", () => buildChargePipes(b, 1));
  part("coolPipes", () => buildCoolPipes(b, 0));
  part("coolPipesB", () => buildCoolPipes(b, 1));
  part("coolWelds", () => buildCoolPipeWelds(b));
  part("chargeCouplers", () => buildChargeCouplers(b));
  part("exhaustLogs", () => buildExhaustLogs(b, 0, 0));
  part("exhaustLogsR", () => buildExhaustLogs(b, 0, 1));
  part("exhaustLogsB", () => buildExhaustLogs(b, 1, 0));
  part("exhaustLogsBR", () => buildExhaustLogs(b, 1, 1));
  part("turboFeed", () => buildTurboFeed(b, 0));
  part("turboFeedB", () => buildTurboFeed(b, 1));
  part("exhaustStubs", () => buildExhaustStubs(b));
  part("exhaustFlanges", () => buildExhaustFlanges(b));
  part("downpipes", () => buildDownpipes(b, 0));
  part("downpipesB", () => buildDownpipes(b, 1));
  part("mufflers", () => buildMufflerPart(b));
  part("starterBody", () => stretched(() => buildStarterBody(b)));
  part("starterShaft", () => stretched(() => buildStarterShaft(b)));
  part("starterDrive", () => buildStarterDrive(b));
  part("starterDriveShell", () => buildStarterDriveShell(b));
  part("starterPinion", () => buildStarterPinion(b));
  part("starterPlunger", () => stretched(() => buildStarterPlunger(b)));
  part("starterDisc", () => stretched(() => buildStarterDisc(b)));
  part("starterSpring", () => buildStarterSpring(b));
  part("starterFork", () => buildStarterFork(b));
  part("headTextA", () => widened(b, () => buildHeadText(b, 0)));
  part("headTextB", () => widened(b, () => buildHeadText(b, 1)));
  part("lidText", () => buildLidSignature(b));

  // The timing drive (timingGears/gearTrain.ts, timingChain/chainPath.ts): gears low down, a short chain above them. The
  // crank's gear: one wide gear on the crank's nose, its teeth wide enough for both banks' idlers, each in its own plane;
  // a plain silver face, its hub reaching back to the crank's collar
  part("gearCrank", () =>
    buildSpurGear(b, { teeth: CRANK_GEAR_TEETH, hubR: 19.5, boreR: 17.15, hubLen: 13 + CHAIN_SEP / 2, holes: 0, markTooth: true, half: GEAR_HALF + CHAIN_SEP / 2 }));

  // the idler, turning on its post: a web with round lightening holes, a plain hub
  part("gearIdler1", () => buildSpurGear(b, { teeth: IDLER2.teeth, hubR: 15, boreR: 9, hubLen: GEAR_HALF + 1, holes: 5 }));

  // the idler's chain sprocket, in front of it on its hub: as the cams', its hub reaching back to the gear
  const sprocket = (hubLen: number) =>
    buildSprocket(b, { teeth: CHAIN_TEETH.cam, rPitch: CAM_RC, windows: 0, relief: "cam", hubR: 19, boreR: 11, hubLen, mark: true });

  // (the idler's the same as the cams': from the front all three look alike)
  part("sprocketIdler", () => sprocket(CHAIN_FWD - GEAR_HALF));
  // the cams' sprockets, their fronts in relief (the face with its holes, the hub, the cam's flanged bolt), out in the
  // chain's plane: their hubs reach back to the camshafts (the front bank's over the spacer as well)
  part("sprocketCam", () => sprocket(7 + CHAIN_FWD));
  part("sprocketCamSpaced", () => sprocket(7 + CHAIN_SEP + CHAIN_FWD));

  part("chainInner", () => buildChainLink(b, false));
  part("chainOuter", () => buildChainLink(b, true));
  // up the chain's first run (the idler's sprocket to the first cam) the tensioner arm, down its last the fixed guide
  part("guideArm", () => buildChainGuide(b, DRIVE, 0, "arm", 1, CHAIN_X_WORLD - CHAIN_FWD));
  part("guideFixed", () => buildChainGuide(b, DRIVE, 2, "fixed", 0, CHAIN_X_WORLD - CHAIN_FWD));

  // the idler's post, back to the back plate on the head's front face (the rear bank's gears stand close to it, the front
  // bank's a chain's width further out), out into its sprocket, whose own hub and bolt close it in front
  const toPlate = HEAD.x0 - CHAIN_X_WORLD - DRIVE_DX;
  const sprocketFront = -CHAIN_FWD - 4 * CHAIN_K;

  part("idlerPost2", () => buildIdlerPost(b, 9, toPlate, sprocketFront, false));
  part("idlerPost2Spaced", () => buildIdlerPost(b, 9, toPlate + CHAIN_SEP, sprocketFront, false));
  part("injector", () => buildInjector(b));
  part("sparkPlug", () => buildSparkPlug(b));

  const missing = PART_NAMES.filter((n) => !parts[n]);

  if (missing.length > 0) throw new Error(`Parts named but never built: ${missing.join(", ")}`);

  flush();

  const vertices = new Float32Array(flushed * FW_STRIDE);
  let at = 0;

  for (const c of chunks) {
    vertices.set(c, at);
    at += c.length;
  }

  return { vertices, parts: parts as Record<PartName, [number, number]> };
}

const HEAD_MESH = buildHeadMesh();

/* ---------------- sprocket phase ---------------- */

// The flywheel can sit on its flange at any angle: turn it so that its marked
// tooth (tooth 0, half a pitch from its first gap) lies on the same line
export const FW_MARK_OFFSET_DEG = (((0.5 / FW_DIM.gearTeeth) * TAU - MARK_ANGLE) * 180) / Math.PI;

// Built here, after the phase it needs
export const TRAIN_MESH = buildTrainMesh();

// Draw ranges of the parts inside the merged mesh (set up in the scene block)
export const HEAD_RANGE = {} as Record<PartName, [number, number]>;

/* ---------------- whole scene ---------------- */

// The crank train, the head and the flywheel, in one buffer
export const SCENE_VERTICES = (() => {
  const out = new Float32Array(
    TRAIN_MESH.vertices.length + HEAD_MESH.vertices.length + FW_VERTICES.length
  );

  out.set(TRAIN_MESH.vertices, 0);
  out.set(HEAD_MESH.vertices, TRAIN_MESH.vertices.length);
  out.set(FW_VERTICES, TRAIN_MESH.vertices.length + HEAD_MESH.vertices.length);

  return out;
})();

const SCENE_HEAD_BASE = TRAIN_MESH.vertices.length / FW_STRIDE;

for (const name of PART_NAMES) {
  const range = HEAD_MESH.parts[name];

  HEAD_RANGE[name] = [range[0] + SCENE_HEAD_BASE, range[1]];
}

// Each part's middle, in its own frame (the average of its points): where it stands, to draw the see-through ones far to
// near from wherever the eye is
export const PART_CENTER = {} as Record<PartName, [number, number, number]>;

for (const name of PART_NAMES) {
  const [start, count] = HEAD_MESH.parts[name];
  const v = HEAD_MESH.vertices;
  const step = Math.max(1, Math.floor(count / 4000));
  let x = 0, y = 0, z = 0, n = 0;

  for (let i = 0; i < count; i += step) {
    const k = (start + i) * FW_STRIDE;

    x += v[k]; y += v[k + 1]; z += v[k + 2]; n++;
  }

  PART_CENTER[name] = n ? [x / n, y / n, z / n] : [0, 0, 0];
}

const CENTER_BY_RANGE = new Map<[number, number], [number, number, number]>(PART_NAMES.map((name) => [HEAD_RANGE[name], PART_CENTER[name]]));

// the middle of the part drawn by this range (one of HEAD_RANGE's), in the part's own frame
export const partCenter = (range: [number, number]) => CENTER_BY_RANGE.get(range) ?? [0, 0, 0];

// The parts built once for each bank (its own cams, its head's casting, its lettering, its timing drive's primary
// guide): for each, its name for bank A and for bank B. `bankPart` gives a bank's own one
export const BANK_PARTS = {
  camIn: ["camIn", "camInB"],
  camEx: ["camEx", "camExB"],
  deck: ["deck", "deckB"],
  deckSlab: ["deckSlab", "deckSlabB"],
  headShell: ["headShell", "headShellB"],
  headSolid: ["headSolid", "headSolidB"],
  headTop: ["headTop", "headTopB"],
  headWiring: ["headWiring", "headWiringB"],
  headText: ["headTextA", "headTextB"],
} as const satisfies Record<string, readonly [PartName, PartName]>;

export const bankPart = (bank: Bank, part: keyof typeof BANK_PARTS): [number, number] =>
  HEAD_RANGE[BANK_PARTS[part][bank === BANKS[0] ? 0 : 1]];

export const FLY_RANGE: [number, number] = [
  (TRAIN_MESH.vertices.length + HEAD_MESH.vertices.length) / FW_STRIDE,
  FW_VERTICES.length / FW_STRIDE,
];
