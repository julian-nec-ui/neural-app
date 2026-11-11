// The crank train as one mesh: every part built in turn, and where each lies in it.

import { FW_STRIDE, createMeshBuilder } from "../builder";
import { buildConnectingRod } from "./connectingRod";
import { buildCrankNose } from "./crankNose";
import { buildCrankshaft } from "./crankshaft";
import { CT_STEPS } from "./dimensions";
import { buildMainBearings } from "./mainBearings";
import { buildPiston } from "./piston";

type TrainMesh = {
  vertices: Float32Array;
  crank: [number, number];
  snout: [number, number];
  rod: [number, number];
  piston: [number, number];
  caps: [number, number];
};

export function buildTrainMesh(): TrainMesh {
  const b = createMeshBuilder(CT_STEPS);
  const mark = () => b.out.length / FW_STRIDE;

  // Each part, with the range of vertices it takes
  const part = (build: (builder: typeof b) => void): [number, number] => {
    const start = mark();

    build(b);

    return [start, mark() - start];
  };

  const crank = part(buildCrankshaft);
  const snout = part(buildCrankNose);
  const rod = part(buildConnectingRod);
  const piston = part(buildPiston);
  const caps = part(buildMainBearings);

  return { vertices: new Float32Array(b.out), crank, snout, rod, piston, caps };
}
