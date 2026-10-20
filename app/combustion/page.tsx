"use client";

import React, { useState, useEffect } from 'react';

// --- ENGINE CONFIGURATION ---
const CONFIG = {
  cylinderCount: 4,
  crankRadius: 40,       // Distance from center of crank to pin
  rodLength: 120,        // Length of the piston rod
  cylinderWidth: 70,
  spacing: 110,          // Space between cylinders
  startY: 200,           // Vertical offset for the piston top
  crankY: 450,           // Vertical position of the crankshaft center
  speed: 0.04,           // Rotation speed
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
          {/* CRANKSHAFT MAIN SHAFT */}
          <line 
            x1="50" y1={CONFIG.crankY} x2="550" y2={CONFIG.crankY} 
            stroke="#334155" strokeWidth="12" strokeLinecap="round" 
          />

          {[0, 1, 2, 3].map((i) => {
            // Timing offset: Each cylinder is 180 degrees (Math.PI) apart
            const cylinderAngle = angle + (i * Math.PI);
            
            // 1. CALCULATE CRANK PIN POSITION
            // The pin rotates in a circle around the crankshaft center
            const pinX = 120 + i * CONFIG.spacing;
            const pinY = CONFIG.crankY + Math.sin(cylinderAngle) * CONFIG.crankRadius;
            const pinXOffset = Math.cos(cylinderAngle) * CONFIG.crankRadius;

            // 2. CALCULATE PISTON POSITION
            // Using the Law of Cosines/Pythagoras to find the vertical height of the piston
            // Piston height = Crank center Y - (offset from crank pin)
            const pistonY = CONFIG.crankY - (Math.sqrt(Math.pow(CONFIG.rodLength, 2) - Math.pow(pinXOffset, 2)) + Math.sin(cylinderAngle) * CONFIG.crankRadius);
            const pistonX = 120 + i * CONFIG.spacing;

            // 3. VALVE TIMING (4-Stroke Logic)
            // Cycle: Intake (Down) -> Compression (Up) -> Power (Down) -> Exhaust (Up)
            const cyclePos = (cylinderAngle % (Math.PI * 2));
            const isIntake = cyclePos < Math.PI; // First half of rotation
            const isExhaust = cyclePos >= Math.PI; // Second half of rotation
            
            // We use a modulo of 4PI because 4 strokes = 2 rotations
            const fullCycle = (cylinderAngle % (Math.PI * 4));
            const intakeOpen = fullCycle < Math.PI ? 15 : 0;
            const exhaustOpen = (fullCycle > Math.PI * 3) ? 15 : 0;

            // 4. STROKE COLOR
            const strokeIdx = Math.floor((fullCycle / Math.PI) % 4);
            const strokeColor = STROKES[strokeIdx].color;

            return (
              <g key={i}>
                {/* Cylinder Wall */}
                <rect 
                  x={pistonX - CONFIG.cylinderWidth/2} 
                  y={pistonY - 100} 
                  width={CONFIG.cylinderWidth} 
                  height={CONFIG.crankY - (pistonY - 100)} 
                  fill="none" 
                  stroke="#334155" 
                  strokeWidth="4" 
                />

                {/* Valves */}
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
                  className="transition-colors duration-300"
                />

                {/* Piston Rod (Connecting pin to piston) */}
                <line 
                  x1={pistonX} y1={pistonY + 40} 
                  x2={pinX + pinXOffset} y2={pinY} 
                  stroke="#94a3b8" 
                  strokeWidth="8" 
                  strokeLinecap="round" 
                />

                {/* Crank Pin */}
                <circle 
                  cx={pinX + pinXOffset} cy={pinY} 
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
            <div>
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
