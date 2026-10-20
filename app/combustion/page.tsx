"use client";

import { useState, useEffect } from 'react';

// --- ENGINE CONFIGURATION ---
const CONFIG = {
  cylinderCount: 4,
  crankRadius: 40,       // Offset from center of crank to pin
  rodLength: 120,        // Physical length of the piston rod
  cylinderWidth: 70,
  spacing: 110,          // Horizontal space between cylinders
  crankY: 450,           // Vertical position of the crankshaft center
  speed: 0.04,           // Rotation speed (radians per frame)
};

const STROKES = [
  { name: 'Intake', color: '#3b82f6', desc: 'Air/Fuel In' },     // Blue
  { name: 'Compression', color: '#eab308', desc: 'Compressing' }, // Yellow
  { name: 'Power', color: '#ef4444', desc: 'Combustion' },      // Red
  { name: 'Exhaust', color: '#64748b', desc: 'Gases Out' },      // Grey
];

const Engine2D = () => {
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    let animationFrame: number;
    const update = () => {
      setAngle((prev) => prev + CONFIG.speed);
      animationFrame = requestAnimationFrame(update);
    };
    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0c12] text-white font-sans flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black italic tracking-tighter mb-2">
          V4 <span className="text-blue-500">MECHANICAL</span> SIM
        </h1>
        <p className="text-slate-500 uppercase tracking-[0.3em] text-xs font-bold">
          Synced 4-Stroke Kinematics
        </p>
      </div>

      <div className="relative bg-slate-900/50 p-12 rounded-3xl border border-white/10 shadow-2xl">
        <svg 
          width={CONFIG.spacing * CONFIG.cylinderCount + 100} 
          height={600} 
          viewBox="0 0 600 600"
          className="overflow-visible"
        >
          {/* MAIN CRANKSHAFT SHAFT */}
          <line 
            x1="50" y1={CONFIG.crankY} x2="550" y2={CONFIG.crankY} 
            stroke="#334155" strokeWidth="12" strokeLinecap="round" 
          />

          {[0, 1, 2, 3].map((i) => {
            // Each cylinder offset by 180 degrees for smooth firing
            const cylinderAngle = angle + (i * Math.PI);
            
            // 1. CRANK PIN POSITION (Polar to Cartesian)
            const centerX = 120 + i * CONFIG.spacing;
            const pinX = centerX + Math.cos(cylinderAngle) * CONFIG.crankRadius;
            const pinY = CONFIG.crankY + Math.sin(cylinderAngle) * CONFIG.crankRadius;

            // 2. PISTON POSITION (Kinematic Equation)
            // Piston Y = CrankY - (CrankOffset_Y + sqrt(Rod^2 - CrankOffset_X^2))
            const crankOffset_X = Math.cos(cylinderAngle) * CONFIG.crankRadius;
            const crankOffset_Y = Math.sin(cylinderAngle) * CONFIG.crankRadius;
            const pistonY = CONFIG.crankY - (crankOffset_Y + Math.sqrt(Math.pow(CONFIG.rodLength, 2) - Math.pow(crankOffset_X, 2)));
            const pistonX = centerX;

            // 3. 4-STROKE LOGIC (Cycle is 4*PI / 720 degrees)
            const fullCycle = (cylinderAngle % (Math.PI * 4));
            
            // Intake: 0 to PI (Rotation 1 Down)
            const intakeOpen = fullCycle < Math.PI ? 15 : 0;
            // Exhaust: 3PI to 4PI (Rotation 2 Up)
            const exhaustOpen = fullCycle > Math.PI * 3 ? 15 : 0;

            // Calculate current stroke index (0-3)
            const strokeIdx = Math.floor((fullCycle / Math.PI) % 4);
            const strokeColor = STROKES[strokeIdx].color;

            return (
              <g key={i}>
                {/* Cylinder Sleeve */}
                <rect 
                  x={pistonX - CONFIG.cylinderWidth/2} 
                  y={pistonY - 100} 
                  width={CONFIG.cylinderWidth} 
                  height={CONFIG.crankY - (pistonY - 100)} 
                  fill="none" 
                  stroke="#334155" 
                  strokeWidth="4" 
                />

                {/* Valves (Left: Intake, Right: Exhaust) */}
                <rect 
                  x={pistonX - 20} y={pistonY - 110} width="4" height={10 + intakeOpen} 
                  fill={intakeOpen ? "#3b82f6" : "#64748b"} 
                />
                <rect 
                  x={pistonX + 16} y={pistonY - 110} width="4" height={10 + exhaustOpen} 
                  fill={exhaustOpen ? "#ef4444" : "#64748b"} 
                />

                {/* Piston Head */}
                <rect 
                  x={pistonX - CONFIG.cylinderWidth/2 + 5} 
                  y={pistonY} 
                  width={CONFIG.cylinderWidth - 10} 
                  height="40" 
                  rx="4" 
                  fill={strokeColor} 
                />

                {/* Piston Rod - Connects Piston Center to Crank Pin */}
                <line 
                  x1={pistonX} y1={pistonY + 40} 
                  x2={pinX} y2={pinY} 
                  stroke="#94a3b8" 
                  strokeWidth="8" 
                  strokeLinecap="round" 
                />

                {/* Crank Pin (Joint) */}
                <circle 
                  cx={pinX} cy={pinY} 
                  r="6" 
                  fill="#f8fafc" 
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* LEGEND */}
      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
        {STROKES.map((s) => (
          <div key={s.name} className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-lg border border-white/5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
            <div className="flex flex-col">
              <div className="text-[10px] font-bold uppercase text-slate-500">{s.name}</div>
              <div className="text-xs text-slate-300">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Engine2D;
