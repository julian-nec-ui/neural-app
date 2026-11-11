"use client";

// The page: the engine.
// The engine is in ./engine: core/ (dimensions, banks, firing order), mesh/ (one file per component),
// sim/ (the clock and the starter), fx/ (combustion and airflow), render/ (shaders, camera, WebGL),
// scene/ (the meshes in one buffer, and where each part is drawn) and ui/ (the stage and the controls).
import Engine from "./engine/ui/Engine";

export default function Page() {
  return (
    <main className="flex w-full flex-col gap-4">
      <Engine />
    </main>
  );
}
