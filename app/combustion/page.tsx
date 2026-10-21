"use client";
import Engine from "./engine";

export default function EnginePage() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-8 px-4">
      <h1 className="text-2xl md:text-3xl font-bold mb-1 tracking-tight">
        4‑Cylinder 4‑Stroke Engine
      </h1>
      <p className="text-slate-400 mb-6 text-sm">
        Live SVG animation · firing order 1‑3‑4‑2 · 720° cycle
      </p>
      <Engine />
    </main>
  );
}
