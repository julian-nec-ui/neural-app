// The components that can be picked out of the engine (the context menu's "Select component"), outlined on the stage,
// dragged into the detail window and shown there alone. Each is a set of the scene's parts (scene/meshes.ts) with the
// box it fills (its middle and radius, for the outline's work area); `id` is its number in the renderer's picking pass
// (1 to 255; 0 is no component). `extras`: parts that go with it out of the engine but are neither picked nor outlined
// (small, scattered pieces whose outline would only be noise: welds, the see-through pipes into it)
export type ComponentDef = { id: number; name: string; parts: readonly string[]; extras: readonly string[]; center: [number, number, number]; radius: number };

export const COMPONENTS: readonly ComponentDef[] = [
  {
    id: 1,
    name: "Intake plenum",
    parts: ["vPlenum", "plenumGate", "intakeManifold", "plenumLogs", "lidText"],
    extras: ["coolWelds", "coolPipes", "coolPipesB"],
    center: [10, -405, 0],
    radius: 640,
  },
];

export const componentById = (id: number) => COMPONENTS.find((c) => c.id === id) ?? null;

// `selected`: the component outlined on the stage (0 none); `detached`: the one taken out of the engine into the detail
// window (0 none: it is in its place)
export const SELECT: { selected: number; detached: number } = { selected: 0, detached: 0 };

// whether a part of the scene is drawn on the engine (not taken out into the detail window)
export const partShown = (name: string) => {
  if (!SELECT.detached) return true;

  const c = componentById(SELECT.detached);

  return !c || (!c.parts.includes(name) && !c.extras.includes(name));
};
