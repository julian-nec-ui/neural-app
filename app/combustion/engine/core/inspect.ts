// The plenum inspector: the intake plenum alone, with its two log plenums and its runners, in a panel of its own on the
// stage's right, turned and magnified there exactly as the engine is (a camera of its own, made as the engine's is), while
// the engine stays where it is. `el` is the panel's box on the stage (the renderer draws into it); `section` which half of
// the plenum is cut away to show its inside: 0 none, -1 the left (seen from the timing drive's end), +1 the right
export type InspectView = { right: [number, number, number]; down: [number, number, number]; back: [number, number, number]; distance: number };

export const INSPECT: { on: boolean; el: HTMLElement | null; section: -1 | 0 | 1; view: (() => InspectView) | null } = {
  on: false,
  el: null,
  section: 0,
  view: null,
};

// What it looks at, and how much of it there is (the plenum and its runners down to the heads: x -593 to 615, y -616 to
// -200, z -193 to 193)
export const INSPECT_TARGET: [number, number, number] = [10, -405, 0];
export const INSPECT_RADIUS = 640;

// The component being dragged toward the detail window: drawn alone in a small card that follows the pointer (`el`), turned
// as the engine is seen at that moment (`view`)
export const GHOST: { el: HTMLElement | null; view: (() => InspectView) | null } = { el: null, view: null };
