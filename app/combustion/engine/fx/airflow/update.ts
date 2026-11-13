// This frame's air: where each body's pattern is, how strongly each port shows, and the streaks.

import { CYLS } from "../../core/constants";
import { normalizeCycle } from "../../core/numbers";
import type { FwVec3 } from "../../mesh/builder";
import { MODULES, modulePoint } from "../../mesh/exhaust";
import { TB, turboWorld } from "../../mesh/turbo";
import { VT, VT_LIFT_PEAK, camLift } from "../../mesh/valvetrain";
import { ENGINE_GAS } from "../../sim/clock";
import type { EngineFrame } from "../../sim/clock";
import { GLOW, addPoint } from "../points";
import { FOG_GROUPS } from "./bodies";
import { smooth01 } from "./common";
import { AIR_FLOWS, flowCum } from "./flows";
import { addSegment, flowPoint } from "./streaks";

// What the renderer needs to draw the bodies this frame
export const FOG_STATE = { on: false };

const TRAIL_STEPS = 9;
const A_HEAD: FwVec3 = [0, 0, 0];
const A_TAIL: FwVec3 = [0, 0, 0];

// This frame's air: where each body's pattern is, how strongly each port shows
// (by how far its valve is open), and the ambient streaks; each side shows as full of gas as the engine is now
export function pushAirflow(frame: EngineFrame) {
  const boost = frame.turboSpeed;
  const intake = ENGINE_GAS.intake;
  const exhaust = ENGINE_GAS.exhaust;

  FOG_STATE.on = intake > 0.005 || exhaust > 0.005;

  if (!FOG_STATE.on) return;

  for (const g of FOG_GROUPS) {
    if (g.cyl >= 0) {
      const p = normalizeCycle(frame.t + CYLS[g.cyl].bank.phase[CYLS[g.cyl].k]);
      const peak = g.valve === 0 ? VT_LIFT_PEAK.intake : VT_LIFT_PEAK.exhaust;

      // The pattern moves while the valve is open; the body is plain, and dim, when it is shut
      g.phase = 2 * flowCum(g.valve, p);
      g.drive = 0.12 + 0.88 * Math.min(1, camLift(p, peak) / VT.lift);
    } else {
      g.phase = g.passes * frame.gasT; // the pipes' gas moves on as the engine is emptied, the ports' only with the valves
      g.drive = 1;

      if (g.feeds.length > 0) {
        // The more of its cylinders' exhaust valves are open, the denser the body
        let open = 0;

        for (const c of g.feeds) {
          open += camLift(normalizeCycle(frame.t + CYLS[c].bank.phase[CYLS[c].k]), VT_LIFT_PEAK.exhaust) / VT.lift;
        }

        // (pulsing with each exhaust event at cranking speed; running, the pulses come faster than the frames and would
        // flicker, so the body settles to its mean, steady)
        const steady = smooth01(((frame.rpm ?? 0) - 150) / 450);

        g.drive = (0.3 + 0.7 * Math.min(1, open)) * (1 - steady) + 0.72 * steady;
      }
    }

    // the hot gas (kinds 1 and 2) is as full as the exhaust side, the air (kinds 0 and 3) as the intake side
    g.drive *= g.kind === 1 || g.kind === 2 || g.kind === 4 ? exhaust : intake;
  }

  for (let n = 0; n < AIR_FLOWS.length; n++) {
    const f = AIR_FLOWS[n];
    const phase = f.passes * (f.gate ? frame.t : frame.gasT);
    const step = (f.straight ? f.trail : 40) / TRAIL_STEPS;
    const full = f.hot ? exhaust : intake;
    let gate = full;

    if (full < 0.01) continue;

    if (f.gate) {
      const cy = CYLS[f.gate.cyl];
      const lift = camLift(normalizeCycle(frame.t + cy.bank.phase[cy.k]), f.gate.valve === 0 ? VT_LIFT_PEAK.intake : VT_LIFT_PEAK.exhaust);

      gate = full * (0.06 + 0.94 * Math.min(1, lift / VT.lift));
    }

    for (let i = 0; i < f.count; i++) {
      let u = i / f.count + phase;

      u -= Math.floor(u);

      const edge = f.ends > 0 ? smooth01(Math.min(u, 1 - u) / f.ends) : 1;
      const head = f.alpha * gate * edge * (0.55 + 0.45 * f.rnd[i]);

      if (head < 0.02) continue;

      const [r, g, b] = f.tint(u);
      const s = u * f.curve.total;
      let from = A_HEAD;
      let to = A_TAIL;
      let fromAlpha = head;

      flowPoint(f, i, s, from);

      for (let k = 1; k <= TRAIL_STEPS; k++) {
        const s2 = s - k * step;

        if (s2 < 0) break;

        flowPoint(f, i, s2, to);

        const toAlpha = head * Math.pow(1 - k / TRAIL_STEPS, 1.3);

        addSegment(from, to, r, g, b, fromAlpha, toAlpha, f.width, f.width * (1 - 0.6 * (k / TRAIL_STEPS)));

        const swap = from;

        from = to;
        to = swap;
        fromAlpha = toAlpha;
      }
    }
  }

  // The turbine housing glows with the heat of the exhaust as the boost builds
  if (boost > 0.05 && exhaust > 0.01) {
    const h0 = turboWorld([-TB.half, 0, 0]);

    for (const m of MODULES) {
      const hot = modulePoint(m, h0);

      addPoint(GLOW, null, hot[0], hot[1], hot[2], 105, 1.0, 0.36, 0.08, 0.2 * boost * boost * exhaust);
    }
  }
}
