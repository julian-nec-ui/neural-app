"use client";

import React, { useState, useEffect, useRef } from "react";

// Types for Stage Info
interface StageDetails {
  name: string;
  color: string;
  description: string;
  action: string;
}

const STAGES: { [key: number]: StageDetails } = {
  0: { name: "Intake", color: "#3b82f6", description: "Fuel-air mixture is drawn into the cylinder.", action: "Intake Valve OPEN" },
  1: { name: "Compression", color: "#eab308", description: "Piston compresses the mixture. Valves closed.", action: "Both Valves CLOSED" },
  2: { name: "Power", color: "#ef4444", description: "Spark plug ignites mixture, forcing piston down.", action: "SPARK! Combustion" },
  3: { name: "Exhaust", color: "#6b7280", description: "Piston pushes spent exhaust gases out.", action: "Exhaust Valve OPEN" },
};

export const PistonEngine: React.FC = () => {
  const [crankAngle, setCrankAngle] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(2); // Degrees per frame
  const requestRef = useRef<number | null>(null);

  // Animation Loop
  useEffect(() => {
    const animate = () => {
      if (isPlaying) {
        setCrankAngle((prev) => (prev + speed) % 720);
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, speed]);

  // Derive current stage (Each stroke is 180 degrees of the 720-degree 4-stroke cycle)
  const currentStageIndex = Math.floor(crankAngle / 180) % 4;
  const stage = STAGES[currentStageIndex];

  // Mechanical Geometry Calculations
  const rad = (crankAngle * Math.PI) / 180;
  const r = 40;  // Crankshaft radius
  const l = 110; // Connecting rod length
  
  // Trignometric position of the pin and piston wrist pin
  const crankX = 150 + r * Math.sin(rad);
  const crankY = 270 + r * Math.cos(rad);
  
  // Piston only moves vertically along X=150
  const pistonY = crankY - Math.sqrt(l * l - Math.pow(crankX - 150, 2));

  // Determine Valve states based on stage
  const isIntakeOpen = currentStageIndex === 0;
  const isExhaustOpen = currentStageIndex === 3;
  const isSparking = currentStageIndex === 2 && crankAngle >= 360 && crankAngle <= 390;

  return (
    <div className="flex flex-col items-center p-6 bg-gray-900 text-white rounded-2xl shadow-2xl max-w-md mx-auto font-sans">
      <h2 className="text-2xl font-bold mb-2 tracking-wide text-center">4-Stroke Engine Simulator</h2>
      
      {/* Dynamic Stage Badge */}
      <div 
        className="px-4 py-1.5 rounded-full font-bold uppercase tracking-wider text-sm transition-colors duration-300 mb-4"
        style={{ backgroundColor: stage.color }}
      >
        {stage.name} Stroke
      </div>

      {/* Engine Animation SVG */}
      <svg width="300" height="360" className="bg-gray-900 border border-gray-800 rounded-xl shadow-inner">
        {/* Fuel/Gas Mix Visual Indicators */}
        {currentStageIndex === 0 && (
          <path d="M 60 40 Q 110 50 150 90" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="20" fill="none" strokeLinecap="round" />
        )}
        {currentStageIndex === 2 && (
          <rect x="95" y="80" width="110" height={pistonY - 80} fill="url(#fireGradient)" opacity="0.8" />
        )}
        {currentStageIndex === 3 && (
          <path d="M 150 90 Q 190 50 240 40" stroke="rgba(156, 163, 175, 0.4)" strokeWidth="20" fill="none" strokeLinecap="round" />
        )}

        {/* Gradients */}
        <defs>
          <linearGradient id="pistonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="fireGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Cylinder Walls */}
        <line x1="90" y1="60" x2="90" y2="220" stroke="#475569" strokeWidth="6" />
        <line x1="210" y1="60" x2="210" y2="220" stroke="#475569" strokeWidth="6" />
        <path d="M 90 60 L 120 40 M 210 60 L 180 40" stroke="#475569" strokeWidth="6" />

        {/* Intake Valve (Left) */}
        <line 
          x1="115" y1={isIntakeOpen ? "52" : "42"} 
          x2="135" y2={isIntakeOpen ? "62" : "52"} 
          stroke={isIntakeOpen ? "#3b82f6" : "#64748b"} 
          strokeWidth="5" 
          className="transition-all duration-100"
        />
        
        {/* Exhaust Valve (Right) */}
        <line 
          x1="165" y1={isExhaustOpen ? "62" : "52"} 
          x2="185" y2={isExhaustOpen ? "52" : "42"} 
          stroke={isExhaustOpen ? "#ef4444" : "#64748b"} 
          strokeWidth="5" 
          className="transition-all duration-100"
        />

        {/* Spark Plug & Spark Effect */}
        <rect x="146" y="25" width="8" height="20" fill="#cbd5e1" />
        <circle cx="150" cy="46" r="3" fill="#3b82f6" />
        {isSparking && (
          <g>
            <circle cx="150" cy="52" r="12" fill="#f59e0b" opacity="0.6" />
            <path d="M 145 52 L 155 48 L 148 56 L 153 52" stroke="#fff" strokeWidth="2" fill="none" />
          </g>
        )}

        {/* Crankshaft Center Anchor */}
        <circle cx="150" cy="270" r="8" fill="#1e293b" stroke="#64748b" strokeWidth="3" />

        {/* Rotating Crank Counterweight */}
        <line x1="150" y1="270" x2={crankX} y2={crankY} stroke="#cbd5e1" strokeWidth="12" strokeLinecap="round" />
        <circle cx={crankX} cy={crankY} r="8" fill="#475569" />

        {/* Connecting Rod */}
        <line x1={crankX} y1={crankY} x2="150" y2={pistonY} stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />

        {/* Piston Head */}
        <rect x="95" y={pistonY - 35} width="110" height="40" rx="4" fill="url(#pistonGrad)" stroke="#334155" strokeWidth="2" />
        {/* Piston Rings details */}
        <line x1="97" y1={pistonY - 25} x2="203" y2={pistonY - 25} stroke="#1e293b" strokeWidth="2" />
        <line x1="97" y1={pistonY - 15} x2="203" y2={pistonY - 15} stroke="#1e293b" strokeWidth="2" />

        {/* Wrist Pin (Piston Joint) */}
        <circle cx="150" cy={pistonY} r="7" fill="#cbd5e1" stroke="#334155" strokeWidth="2" />
      </svg>

      {/* Stage Explanations Panel */}
      <div className="w-full bg-gray-800 p-4 rounded-xl mt-4 border border-gray-700">
        <div className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-1">Status</div>
        <div className="text-sm font-semibold text-emerald-400 mb-2">{stage.action}</div>
        <p className="text-xs text-gray-300 leading-relaxed">{stage.description}</p>
      </div>

      {/* Control Interface */}
      <div className="w-full flex items-center justify-between mt-5 gap-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all shadow-md active:scale-95 flex-1 text-center ${
            isPlaying ? "bg-amber-500 hover:bg-amber-600 text-gray-900" : "bg-emerald-500 hover:bg-emerald-600 text-white"
          }`}
        >
          {isPlaying ? "Pause Engine" : "Start Engine"}
        </button>

        <div className="flex flex-col items-end flex-1">
          <label className="text-xs text-gray-400 font-medium mb-1">Engine RPM (Speed)</label>
          <input
            type="range"
            min="0.5"
            max="6"
            step="0.5"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>

      {/* Technical Telemetry */}
      <div className="text-[10px] text-gray-500 mt-4 font-mono w-full text-center">
        Cycle Position: {Math.floor(crankAngle)}° / 720°
      </div>
    </div>
  );
};

export default PistonEngine;
