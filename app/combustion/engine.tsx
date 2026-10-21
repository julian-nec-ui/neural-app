"use client";

import { useEffect, useRef, useState } from "react";

/* ---------- geometry constants (SVG user units) ----------- */
const VB_W = 1000;
const VB_H = 600;
const CRANK_Y = 470;            // crankshaft centre line
const CAM_Y = 182;             // camshaft bar
const CAM_LEFT = 100;          
const CAM_RIGHT = 800;         
const CHAIN_X = 110;           
const R = 55;                  // crank throw radius
const L = 120;                 // connecting-rod length
const BORE_W = 110;
const BORE_TOP = 260;          
const BORE_BOTTOM = 430;       
const PISTON_H = 40;
const CYL_X = [250, 410, 570, 730]; // Balanced position

/* firing order 1-3-4-2 */
const PHASE = [0, 0.75, 0.25, 0.5]; 

/* ---------- helpers ---------- */
function pistonPinY(thetaDeg: number) {
  const t = (thetaDeg * Math.PI) / 180;
  const cy = CRANK_Y - R * Math.cos(t);
  return cy - Math.sqrt(L * L - (R * Math.sin(t)) ** 2);
}

function bump(p: number, centre: number, halfWidth: number) {
  const d = Math.min(Math.abs(p - centre), 1 - Math.abs(p - centre));
  if (d > halfWidth) return 0;
  return 0.5 * (1 + Math.cos((Math.PI * d) / halfWidth));
}

type Stroke = "intake" | "compression" | "power" | "exhaust";
function strokeOf(p: number): Stroke {
  if (p < 0.25) return "intake";
  if (p < 0.5) return "compression";
  if (p < 0.75) return "power";
  return "exhaust";
}
const STROKE_FILL: Record<Stroke, string> = {
  intake: "#3b82f6",
  compression: "#93c5fd",
  power: "#f97316",
  exhaust: "#9ca3af",
};
const STROKE_LABEL: Record<Stroke, string> = {
  intake: "INTAKE",
  compression: "COMPRESSION",
  power: "POWER",
  exhaust: "EXHAUST",
};


export default function Engine() {
  const [t, setT] = useState(0);
  const [rpm, setRpm] = useState(20); // Default 20rpm
  const [running, setRunning] = useState(true);
  const raf = useRef<number | null>(null);
  const last = useRef<number>(0);
  const tRef = useRef(0);

  useEffect(() => {
    const loop = (now: number) => {
      if (!last.current) last.current = now;
      const dt = (now - last.current) / 1000;
      last.current = now;
      if (running) {
        const cyclesPerSec = rpm / 60 / 2; 
        tRef.current = (tRef.current + dt * cyclesPerSec) % 1;
        setT(tRef.current);
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      last.current = 0;
    };
  }, [running, rpm]);

  const crankAngle = t * 720;
  const camAngle = t * 360;
  const flyAngle = crankAngle;

  const crankPins = CYL_X.map((cx, i) => {
    const theta = (crankAngle + PHASE[i] * 720) % 360;
    return {
      cx,
      x: cx + R * Math.sin((theta * Math.PI) / 180),
      y: CRANK_Y - R * Math.cos((theta * Math.PI) / 180),
    };
  });

  const FLYWHEEL_X = 930; // Flywheel moved back to the right, but fully visible
  let crankPathD = `M ${CHAIN_X} ${CRANK_Y}`;
  crankPins.forEach((pin) => {
    crankPathD += ` L ${pin.cx} ${CRANK_Y} L ${pin.x} ${pin.y} L ${pin.cx} ${CRANK_Y}`;
  });
  crankPathD += ` L ${FLYWHEEL_X} ${CRANK_Y}`;

  return (
    <div className="w-full max-w-5xl bg-slate-800/60 rounded-2xl p-4 shadow-xl ring-1 ring-white/10">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto rounded-lg bg-linear-to-b from-slate-700 to-slate-800"
      >
        <defs>
          <radialGradient id="fire" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fff7ed" />
            <stop offset="35%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
          </radialGradient>
          {CYL_X.map((cx, i) => (
            <clipPath id={`bore-${i}`} key={i}>
              <rect x={cx - BORE_W / 2} y={BORE_TOP} width={BORE_W} height={BORE_BOTTOM - BORE_TOP} />
            </clipPath>
          ))}
        </defs>

        <g>
         <line x1={CHAIN_X} y1={CAM_Y} x2={CHAIN_X} y2={CRANK_Y}
           stroke="#1d4ed8" strokeWidth={12} strokeLinecap="round" opacity={0.9} />
         <line x1={CHAIN_X} y1={CAM_Y} x2={CHAIN_X} y2={CRANK_Y}
           stroke="#93c5fd" strokeWidth={12} strokeDasharray="4 10"
           strokeDashoffset={-crankAngle * 1.5} opacity={0.9} />
          <circle cx={CHAIN_X} cy={CAM_Y} r={26} fill="none" stroke="#3b82f6" strokeWidth={8}
            strokeDasharray="4 6" strokeDashoffset={-camAngle} />
          <circle cx={CHAIN_X} cy={CRANK_Y} r={30} fill="none" stroke="#3b82f6" strokeWidth={8}
            strokeDasharray="4 6" strokeDashoffset={-crankAngle * 1.5} />
        </g>

        <line x1={CAM_LEFT} y1={CAM_Y} x2={CAM_RIGHT} y2={CAM_Y}
          stroke="#2563eb" strokeWidth={14} strokeLinecap="round" />

        <g transform={`translate(${FLYWHEEL_X} ${CRANK_Y}) rotate(${flyAngle})`}>
          <circle r={62} fill="#7f1d1d" stroke="#ef4444" strokeWidth={4} />
          {Array.from({ length: 24 }).map((_, i) => (
            <rect key={i} x={-3} y={-66} width={6} height={10} fill="#ef4444"
              transform={`rotate(${i * 15})`} />
          ))}
          <circle r={12} fill="#ef4444" />
        </g>

        <path d={crankPathD}
          stroke="#7f1d1d" strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />

        {CYL_X.map((cx, i) => {
          const p = (t + PHASE[i]) % 1;
          const s = strokeOf(p);
          const theta = (crankAngle + PHASE[i] * 720) % 360;
          const pinY = pistonPinY(theta);
          const crownY = pinY - 18;

          const intakeLift = bump(p, 0.125, 0.12) * 14;
          const exhaustLift = bump(p, 0.875, 0.12) * 14;
          const sparking = p > 0.47 && p < 0.55;
          const powerGlow = s === "power" ? Math.max(0, 1 - (p - 0.5) / 0.25) : 0;

          const camNoseIn = (p - 0.125) * 360;
          const camNoseEx = (p - 0.875) * 360;

          const crankPinX = crankPins[i].x;
          const crankPinY = crankPins[i].y;
          const gasHeight = Math.max(0, crownY - BORE_TOP);

          return (
            <g key={i}>
              <line x1={cx} y1={BORE_TOP} x2={cx} y2={BORE_BOTTOM}
                stroke="#475569" strokeWidth={1} strokeDasharray="3 5" opacity={0.5} />

              <rect x={cx - BORE_W / 2} y={BORE_TOP} width={BORE_W} height={BORE_BOTTOM - BORE_TOP}
                fill="none" stroke="#cbd5e1" strokeWidth={3} opacity={0.7} />

              <g clipPath={`url(#bore-${i})`}>
                <rect x={cx - BORE_W / 2} y={BORE_TOP} width={BORE_W} height={gasHeight}
                  fill={STROKE_FILL[s]} opacity={0.28} />
                {powerGlow > 0 && (
                  <ellipse cx={cx} cy={BORE_TOP + 45} rx={BORE_W / 2 - 6} ry={55}
                    fill="url(#fire)" opacity={powerGlow} />
                )}
              </g>

              <rect x={cx - BORE_W / 2} y={BORE_TOP - 22} width={BORE_W} height={22}
                fill="#1e3a8a" opacity={0.8} />
              <g transform={`translate(${cx - 28} ${BORE_TOP - 22 + intakeLift})`}>
                <line x1={0} y1={-40} x2={0} y2={0} stroke="#3b82f6" strokeWidth={4} />
                <ellipse cx={0} cy={0} rx={12} ry={4} fill="#3b82f6" />
                <path d="M-6 -34 h12 M-6 -28 h12 M-6 -22 h12" stroke="#60a5fa" strokeWidth={1.5} />
              </g>
              <g transform={`translate(${cx + 28} ${BORE_TOP - 22 + exhaustLift})`}>
                <line x1={0} y1={-40} x2={0} y2={0} stroke="#3b82f6" strokeWidth={4} />
                <ellipse cx={0} cy={0} rx={12} ry={4} fill="#3b82f6" />
                <path d="M-6 -34 h12 M-6 -28 h12 M-6 -22 h12" stroke="#60a5fa" strokeWidth={1.5} />
              </g>

              <g transform={`translate(${cx - 28} ${CAM_Y}) rotate(${camNoseIn})`}>
                <ellipse rx={10} ry={18} fill="#2563eb" />
                <path d="M0 18 L7 11 L-7 11 Z" fill="#2563eb" />
              </g>
              <g transform={`translate(${cx + 28} ${CAM_Y}) rotate(${camNoseEx})`}>
                <ellipse rx={10} ry={18} fill="#2563eb" />
                <path d="M0 18 L7 11 L-7 11 Z" fill="#2563eb" />
              </g>

              <line x1={cx} y1={BORE_TOP - 30} x2={cx} y2={BORE_TOP - 12}
                stroke="#e2e8f0" strokeWidth={3} />
              {sparking && (
                <path d={`M${cx - 6} ${BORE_TOP - 8} L${cx} ${BORE_TOP} L${cx + 6} ${BORE_TOP - 6}`}
                  stroke="#fde047" strokeWidth={2} fill="none" />
              )}

              <rect x={cx - BORE_W / 2 + 4} y={crownY} width={BORE_W - 8} height={PISTON_H}
                rx={4} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={2} />
              <line x1={cx - BORE_W / 2 + 6} y1={crownY + 8} x2={cx + BORE_W / 2 - 6} y2={crownY + 8}
                stroke="#94a3b8" strokeWidth={1.5} />
              <line x1={cx - BORE_W / 2 + 6} y1={crownY + 14} x2={cx + BORE_W / 2 - 6} y2={crownY + 14}
                stroke="#94a3b8" strokeWidth={1.5} />

              <line x1={cx} y1={pinY} x2={crankPinX} y2={crankPinY}
                stroke="#dc2626" strokeWidth={9} strokeLinecap="round" />
              <circle cx={cx} cy={pinY} r={7} fill="#fca5a5" stroke="#7f1d1d" strokeWidth={2} />
              <circle cx={crankPinX} cy={crankPinY} r={11}
                fill="#ef4444" stroke="#7f1d1d" strokeWidth={2} />
              <circle cx={cx} cy={CRANK_Y} r={12} fill="#7f1d1d" />

              <text x={cx} y={560} textAnchor="middle" fontSize={16}
                fill={STROKE_FILL[s]} fontWeight={700}>
                {STROKE_LABEL[s]}
              </text>
              <text x={cx} y={580} textAnchor="middle" fontSize={12} fill="#94a3b8">
                Cyl {i + 1}
              </text>
            </g>
          );
        })}

        <text x={500} y={40} textAnchor="middle" fontSize={20} fill="#fff" fontWeight={700}>
          4‑CYLINDER · 4‑STROKE
        </text>
      </svg>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          onClick={() => setRunning((r) => !r)}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold"
        >
          {running ? "⏸ Pause" : "▶ Play"}
        </button>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-300">Speed</span>
          <input
            type="range" min={30} max={3000} step={10}
            value={rpm}
            onChange={(e) => setRpm(Number(e.target.value))}
            className="w-40 accent-blue-500"
          />
          <span className="w-24 tabular-nums text-slate-200">{rpm} rpm</span>
        </label>

        <div className="ml-auto flex gap-3 text-xs">
          <Legend c="#3b82f6" t="Intake / valves" />
          <Legend c="#93c5fd" t="Compression" />
          <Legend c="#f97316" t="Power" />
          <Legend c="#9ca3af" t="Exhaust" />
          <Legend c="#ef4444" t="Crank" />
        </div>
      </div>
    </div>
  );
}

function Legend({ c, t }: { c: string; t: string }) {
  return (
    <span className="flex items-center gap-1 text-slate-300">
      <span className="inline-block w-3 h-3 rounded-full" style={{ background: c }} />
      {t}
    </span>
  );
}
