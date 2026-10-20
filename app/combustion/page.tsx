"use client";

import React, { useState, useEffect } from 'react';

// --- ENGINE CONFIGURATION ---
const CONFIG = {
  cylinderCount: 4,
  crankRadius: 35,       
  rodLength: 110,        
  cylinderWidth: 70,
  spacing: 120,          
  crankY: 450,           
  speed: 0.04,           
};

const STROKES = [
  { name: 'Intake', color: '#3b82f6', desc: 'Air/Fuel In' },     
  { name: 'Compression', color: '#eab308', desc: 'Compressing' }, 
  { name: 'Power', color: '#ef4444', desc: 'Combustion' },      
  { name: 'Exhaust', color: '#64748b', desc: 'Gases Out' },      
];

const Engine2D = () => {
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    let animationFrame: number;
    const update = () => {
      // REVERSED MOVEMENT: Subtracting speed instead of adding
      setAngle((prev) => prev - CONFIG.speed);
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
          Reverse-Rotation Kinematics
        </p>
      </div>

      <div className="relative bg-slate-900/50 p-12 rounded-3xl border border-white/10 shadow-2xl">
        <svg 
          width={CONFIG.spacing * CONFIG.cylinderCount + 100} 
          height={600} 
          viewBox="0 0 600 600"
          className="overflow-visible"
        >
          {/* STATIC ENGINE BLOCK (Crankshaft Main Axis) */}
          <line 
            x1="50" y1={CONFIG.crankY} x2="550" y2={CONFIG.crankY} 
            stroke="#1e293b" strokeWidth="16" strokeLinecap="round" 
          />

          {[0, 1, 2, 3].map((i) => {
            const cylinderAngle = angle + (i * Math.PI);
            
            // --- MATH: CRANK PIN POSITION ---
            const centerX = 120 + i * CONFIG.spacing;
            const pinX = centerX + Math.cos(cylinderAngle) * CONFIG.crankRadius;
            const pinY = CONFIG.crankY + Math.sin(cylinderAngle) * CONFIG.crankRadius;

            // --- MATH: PISTON POSITION ---
            const dx = pinX - centerX; 
            const dy = Math.sqrt(Math.pow(CONFIG.rodLength, 2) - Math.pow(dx, 2));
            const pistonY = pinY - dy;
            const pistonX = centerX;

            // --- 4-STROKE LOGIC (Normalized for reverse movement) ---
            // We use ((a % n) + n) % n to ensure the result is always positive 
            // regardless of rotation direction.
            const cyclePeriod = Math.PI * 4; 
            const fullCycle = ((cylinderAngle % cyclePeriod) + cyclePeriod) % cyclePeriod;
            
            const intakeOpen = fullCycle < Math.PI ? 15 : 0;
            const exhaustOpen = fullCycle > Math.PI * 3 ? 15 : 0;
            const strokeIdx = Math.floor((fullCycle / Math.PI) % 4);
            const strokeColor = STROKES[strokeIdx].color;

            return (
              <g key={i}>
                {/* STATIC CYLINDER SLEEVE */}
                <rect 
                  x={pistonX - CONFIG.cylinderWidth/2} 
                  y={pistonY - 120} 
                  width={CONFIG.cylinderWidth} 
                  height={CONFIG.crankY - (pistonY - 120)} 
                  fill="none" 
                  stroke="#334155" 
                  strokeWidth="4" 
                  rx="4"
                />

                {/* VALVES (Fixed at top) */}
                <rect 
                  x={pistonX - 20} y={pistonY - 130} width="4" height={10 + intakeOpen} 
                  fill={intakeOpen ? "#3b82f6" : "#475569"} 
                />
                <rect 
                  x={pistonX + 16} y={pistonY - 130} width="4" height={10 + exhaustOpen} 
                  fill={exhaustOpen ? "#ef4444" : "#475569"} 
                />

                {/* PISTON (Slides inside static sleeve) */}
                <rect 
                  x={pistonX - CONFIG.cylinderWidth/2 + 4} 
                  y={pistonY} 
                  width={CONFIG.cylinderWidth - 8} 
                  height="40" 
                  rx="4" 
                  fill={strokeColor} 
                  stroke="#fff"
                  strokeWidth="1"
                />

                {/* PISTON ROD (Pendulum connection) */}
                <line 
                  x1={pistonX} y1={pistonY + 40} 
                  x2={pinX} y2={pinY} 
                  stroke="#94a3b8" 
                  strokeWidth="8" 
                  strokeLinecap="round" 
                />

                {/* CRANK PIN */}
                <circle 
                  cx={pinX} cy={pinY} 
                  r="7" 
                  fill="#f8fafc" 
                  stroke="#1e293b" 
                  strokeWidth="2"
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
