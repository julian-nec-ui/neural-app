// The streaming flows: how much of a valve's flow has gone by, the jets into the cylinders, the air through the intercooler's fins.

import { CT_X, TAU } from "../../core/constants";
import type { FwVec3 } from "../../mesh/builder";
import { IC_CORE_Z, IC_STAND_Y, icPlace } from "../../mesh/intercooler";
import { PORT_SEAT_Y } from "../../mesh/plumbing";
import { curveFromPoints } from "../../mesh/tubes";
import { IC } from "../../mesh/turbo";
import { VT_LIFT_PEAK, camLift } from "../../mesh/valvetrain";
import { AIR_COOL, AIR_WARM, mixColor, scatter, smooth01 } from "./common";
import type { Flow } from "./common";

/* ---- how much of a valve's flow has gone by ---- */

// As a fraction of the whole at cycle phase p (0..1): it grows only while the
// valve is open
const FLOW_STEPS = 360;

const FLOW_CUM = [VT_LIFT_PEAK.intake, VT_LIFT_PEAK.exhaust].map((peak) => {
  const table = new Float32Array(FLOW_STEPS + 1);

  for (let k = 1; k <= FLOW_STEPS; k++) {
    table[k] = table[k - 1] + camLift((k - 0.5) / FLOW_STEPS, peak);
  }

  const total = table[FLOW_STEPS] || 1;

  for (let k = 0; k <= FLOW_STEPS; k++) table[k] /= total;

  return table;
});

export const flowCum = (valve: number, p: number) => {
  const table = FLOW_CUM[valve];
  const x = p * FLOW_STEPS;
  const i = Math.min(FLOW_STEPS - 1, Math.floor(x));

  return table[i] + (table[i + 1] - table[i]) * (x - i);
};

// The air in a cylinder: from a valve's seat, a straight jet down into the bore,
// leaning a little toward its axis, that widens as it goes
export function chamberJet(cyl: number, x0: number, z0: number): FwVec3[] {
  const cx = CT_X[cyl];
  const pts: FwVec3[] = [];

  for (let k = 0; k <= 10; k++) {
    const u = k / 10;
    const lean = 0.45 * u;

    pts.push([x0 + (cx - x0) * lean, PORT_SEAT_Y + 3 + 78 * u, z0 * (1 - lean)]);
  }

  return pts;
}

// Ambient air through the intercooler's fins, front to back: thin streaks
export const AIR_FLOWS: Flow[] = (() => {
  const flows: Flow[] = [];
  let seed = 1;

  for (const dz of [-IC_CORE_Z - 80, -IC_CORE_Z, -IC_CORE_Z + 80, IC_CORE_Z - 80, IC_CORE_Z, IC_CORE_Z + 80]) {
    for (const dy of [-80, -40, 0, 40, 80]) {
      seed++;

      const count = 6;
      const radii = scatter(count, seed * 5 + 2);

      flows.push({
        // from outside, through the core, toward the engine (the intercoolers stand on the engine's sides)
        curve: curveFromPoints([icPlace(Math.sign(dz), [IC.x - 150, IC_STAND_Y + dy, dz]), icPlace(Math.sign(dz), [IC.x + 150, IC_STAND_Y + dy, dz])], 6),
        count,
        passes: 4,
        alpha: 0.6,
        spread: 3,
        swirl: 0,
        trail: 40,
        width: 1.2,
        tint: (u) => mixColor(AIR_COOL, AIR_WARM, smooth01((u - 0.45) / 0.3) * 0.6),
        ends: 0.08,
        theta: scatter(count, seed * 3).map((v) => v * TAU),
        radial: radii.map((v) => 0.2 + 0.8 * Math.sqrt(v)),
        rnd: scatter(count, seed * 7 + 1),
      });
    }
  }

  return flows;
})();
