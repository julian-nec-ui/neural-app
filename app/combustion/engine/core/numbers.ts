// Small number helpers.


/* =========================================================
   NUMBER HELPERS
   ========================================================= */

export function roundTo(value: number, digits = 4): number {
  const rounded = Number(value.toFixed(digits));
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function normalizeCycle(value: number): number {
  return ((value % 1) + 1) % 1;
}
