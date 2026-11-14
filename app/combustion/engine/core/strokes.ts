// The colours of the four strokes, and which stroke a point of the cycle is in.

import { normalizeCycle, roundTo } from "./numbers";

/* =========================================================
   STROKE COLORS
   ========================================================= */

export const STROKE_COLORS = {
  intake: {
    start: [130, 212, 255],
    end: [0, 140, 255],
  },
  compression: {
    start: [255, 232, 90],
    end: [255, 176, 0],
  },
  power: {
    start: [255, 84, 0],
    end: [255, 150, 30],
  },
  exhaust: {
    start: [246, 251, 255],
    end: [206, 220, 242],
  },
};

export type Stroke = keyof typeof STROKE_COLORS;

export function strokeOf(p: number): Stroke {
  if (p < 0.25) return "intake";
  if (p < 0.5) return "compression";
  if (p < 0.75) return "power";
  return "exhaust";
}

function lerpColor(
  start: number[],
  end: number[],
  factor: number
): number[] {
  return start.map((value, index) =>
    Math.round(roundTo(value + (end[index] - value) * factor, 8))
  );
}

function getBaseStrokeColor(p: number): number[] {
  const normalized = normalizeCycle(p);
  const local = (normalized % 0.25) / 0.25;
  const colors = STROKE_COLORS[strokeOf(normalized)];

  return lerpColor(colors.start, colors.end, local);
}

export function getSmoothGasRgb(p: number): number[] {
  const normalized = normalizeCycle(p);
  const current = getBaseStrokeColor(normalized);
  const distance = 0.25 - (normalized % 0.25);

  if (distance < 0.05) {
    const next = getBaseStrokeColor(normalized + distance);
    const blend = 1 - distance / 0.05;
    const smooth = (1 - Math.cos(blend * Math.PI)) / 2;

    return lerpColor(current, next, smooth);
  }

  return current;
}
