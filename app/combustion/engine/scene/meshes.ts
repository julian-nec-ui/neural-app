// All the meshes built into one buffer, and where each part lies in it.

import { BANKS, TAU, VALVE_RH_EX, VALVE_RH_IN, driveShift, HEAD_WIDEN } from "../core/constants";
import type { Bank } from "../core/constants";
import { FW_STRIDE, createMeshBuilder } from "../mesh/builder";
import type { MeshBuilder } from "../mesh/tubes";
import { buildTrainMesh } from "../mesh/crankTrain/trainMesh";
import { buildDownpipes, buildExhaustFlanges, buildExhaustLogs, buildExhaustStubs, buildManifoldWelds, buildTurbineArc, buildTurboFeed } from "../mesh/exhaust";
import { FW_DIM, FW_VERTICES } from "../mesh/flywheel";
import { buildDeck, buildDeckSlab, buildHeadShell, buildHeadSolid, buildHeadTopFittings, buildLinerRim } from "../mesh/head";
import { buildHeadText } from "../mesh/headText";
import { buildInjector, buildSparkPlug } from "../mesh/injectionIgnition";
import { buildBlock } from "../mesh/block";
import { buildDrySump } from "../mesh/drySump";
import { buildTimingCover } from "../mesh/timingCover";
import { buildSmallFan } from "../mesh/fan";
import { buildBlowOffValves, buildChargeCouplers, buildChargePipes, buildCoolPipes, buildIntercooler, buildIntercoolerTank } from "../mesh/intercooler";
import { MAT_VT_HEAD_EX, MAT_VT_HEAD_IN, MAT_VT_VALVE_EX, MAT_VT_VALVE_IN } from "../mesh/materials";
import { buildCollector, buildCollectorFittings, buildIntakePipes, buildIntakeWelds, buildTurboFittings, buildTurboIntakePipe } from "../mesh/plumbing";
import { buildStarterBody, buildStarterDisc, buildStarterDrive, buildStarterFork, buildStarterPinion, buildStarterPlunger, buildStarterShaft, buildStarterShell, buildStarterSpring, buildStarterYoke } from "../mesh/starter";
import { CAM_RC, CHAIN_TEETH, MARK_ANGLE, PRIMARY, SECONDARY, VT_RC, primaryDx } from "../mesh/timingChain/chainPath";
import { buildChainLink } from "../mesh/timingChain/chainLink";
import { buildChainShoes } from "../mesh/timingChain/chainGuides";
import { buildSprocket } from "../mesh/timingChain/sprocket";
import { buildCompressorWheel, buildTurbineWheel, buildTurboCasing, buildTurboFilter, buildTurboHousing } from "../mesh/turbo";
import { VT, VT_LIFT_PEAK, buildCam, buildSpring, buildTowers, buildValve, buildValveSeat, buildValveStatic } from "../mesh/valvetrain";

/* ---------------- assembly ---------------- */

// Every part built into the shared mesh, by name, in the order it is built. A name is typed: a part drawn or built
// under a name that is not here is a compile error, and a name here that is never built stops the engine at load.
export const PART_NAMES = [
  "valveIn", "valveEx", "valveStatic", "spring", "camIn", "camEx", "camInB", "camExB", "towers", "deck", "deckB", "deckSlab", "deckSlabB",
  "headShell", "headShellB", "headSolid", "headSolidB", "headTop", "headTopB", "linerRim", "turboHousing", "turboCasing", "intakePipes", "turboIntakePipe", "collector",
  "turboFilter", "seatIn", "seatEx", "turboWheelC", "turboWheelT", "collectorFittings", "turboFittings",
  "intercooler", "blowOffValves", "manifoldWelds", "intakeWelds", "turbineArc", "timingCover", "starterShell", "starterYoke", "drySump", "drySumpShell", "block", "icTank", "icTankB", "icTankLow", "icTankLowB", "icTankBare", "icTankBareB", "fanShroud", "fanRotor", "chargePipes", "coolPipes", "chargeCouplers", "exhaustLogs", "turboFeed", "exhaustStubs",
  "exhaustFlanges", "downpipes", "starterBody", "starterShaft", "starterDrive", "starterPinion", "starterPlunger",
  "starterDisc", "starterSpring", "starterFork", "headTextA", "headTextB", "sprocketCrank", "sprocketCam",
  "chainInner", "chainOuter", "blade", "bladeFar", "bladePrimary", "bladePrimaryB", "sprocketIdler", "sprocketIdlerSmall", "injector", "sparkPlug",
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

  const part = (name: PartName, build: () => void) => {
    const start = b.out.length / FW_STRIDE;
    build();
    parts[name] = [start, b.out.length / FW_STRIDE - start];
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
  part("starterShell", () => buildStarterShell(b));
  part("starterYoke", () => buildStarterYoke(b));
  part("drySump", () => buildDrySump(b, "solid"));
  part("drySumpShell", () => buildDrySump(b, "shell"));
  part("block", () => buildBlock(b));
  part("intakeWelds", () => buildIntakeWelds(b));
  part("icTank", () => buildIntercoolerTank(b, 1));
  part("icTankB", () => buildIntercoolerTank(b, -1));
  part("icTankLow", () => buildIntercoolerTank(b, 1, true));
  part("icTankLowB", () => buildIntercoolerTank(b, -1, true));
  part("icTankBare", () => buildIntercoolerTank(b, 1, false, false));
  part("icTankBareB", () => buildIntercoolerTank(b, -1, false, false));
  part("fanShroud", () => buildSmallFan(b, "shroud"));
  part("fanRotor", () => buildSmallFan(b, "rotor"));
  part("chargePipes", () => buildChargePipes(b));
  part("coolPipes", () => buildCoolPipes(b));
  part("chargeCouplers", () => buildChargeCouplers(b));
  part("exhaustLogs", () => buildExhaustLogs(b));
  part("turboFeed", () => buildTurboFeed(b));
  part("exhaustStubs", () => buildExhaustStubs(b));
  part("exhaustFlanges", () => buildExhaustFlanges(b));
  part("downpipes", () => buildDownpipes(b));
  part("starterBody", () => buildStarterBody(b));
  part("starterShaft", () => buildStarterShaft(b));
  part("starterDrive", () => buildStarterDrive(b));
  part("starterPinion", () => buildStarterPinion(b));
  part("starterPlunger", () => buildStarterPlunger(b));
  part("starterDisc", () => buildStarterDisc(b));
  part("starterSpring", () => buildStarterSpring(b));
  part("starterFork", () => buildStarterFork(b));
  part("headTextA", () => widened(b, () => buildHeadText(b, 0)));
  part("headTextB", () => widened(b, () => buildHeadText(b, 1)));

  part("sprocketCrank", () =>
    buildSprocket(b, {
      teeth: CHAIN_TEETH.crank,
      rPitch: VT_RC,
      windows: 0, // too small for lightening windows: a solid web
      hubR: 22,
      boreR: 17.15, // a hair larger than the shaft: no coincident surfaces, and no visible gap
      hubLen: 13,
      mark: false, // its mark is the painted tooth
      markTooth: true,
    })
  );

  part("sprocketCam", () =>
    buildSprocket(b, {
      teeth: CHAIN_TEETH.cam,
      rPitch: CAM_RC,
      windows: 0, // small enough now to sit inside the head's outline: a solid web
      hubR: 19,
      boreR: 11,
      hubLen: 7,
      mark: true,
    })
  );

  // The intermediate shaft's two sprockets: the large one, driven by the primary chain, with the shaft's hub running
  // back from it to the engine's front face; and the small one, which drives the secondary chain
  part("sprocketIdler", () =>
    buildSprocket(b, {
      teeth: CHAIN_TEETH.idler,
      rPitch: VT_RC * 2,
      windows: 6,
      hubR: 16,
      boreR: 8,
      hubLen: 16,
      mark: false,
    })
  );

  part("sprocketIdlerSmall", () =>
    buildSprocket(b, {
      teeth: CHAIN_TEETH.cam,
      rPitch: CAM_RC,
      windows: 0,
      hubR: 14,
      boreR: 8,
      hubLen: 9,
      mark: false,
    })
  );

  part("chainInner", () => buildChainLink(b, false));
  part("chainOuter", () => buildChainLink(b, true));
  part("blade", () => buildChainShoes(b, SECONDARY, 0, "near"));
  part("bladeFar", () => buildChainShoes(b, SECONDARY, 2, "far"));
  part("bladePrimary", () => buildChainShoes(b, PRIMARY, 0, "near", VT.chainX + primaryDx(BANKS[0])));
  part("bladePrimaryB", () => buildChainShoes(b, PRIMARY, 0, "near", VT.chainX + primaryDx(BANKS[1])));
  part("injector", () => buildInjector(b));
  part("sparkPlug", () => buildSparkPlug(b));

  const missing = PART_NAMES.filter((n) => !parts[n]);

  if (missing.length > 0) throw new Error(`Parts named but never built: ${missing.join(", ")}`);

  return { vertices: new Float32Array(b.out), parts: parts as Record<PartName, [number, number]> };
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
  headText: ["headTextA", "headTextB"],
  bladePrimary: ["bladePrimary", "bladePrimaryB"],
} as const satisfies Record<string, readonly [PartName, PartName]>;

export const bankPart = (bank: Bank, part: keyof typeof BANK_PARTS): [number, number] =>
  HEAD_RANGE[BANK_PARTS[part][bank === BANKS[0] ? 0 : 1]];

export const FLY_RANGE: [number, number] = [
  (TRAIN_MESH.vertices.length + HEAD_MESH.vertices.length) / FW_STRIDE,
  FW_VERTICES.length / FW_STRIDE,
];
