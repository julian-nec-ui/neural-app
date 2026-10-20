"use client";

import { useState, useEffect } from 'react';

const RealisticEngine = () => {
  const [cycleStep, setCycleStep] = useState(0);

  const stages = [
    { 
      name: 'Intake', 
      color: '#3b82f6', // Blue
      glow: 'rgba(59, 130, 246, 0.5)', 
      desc: 'Air/Fuel Intake', 
      pos: 'down' 
    },
    { 
      name: 'Compression', 
      color: '#eab308', // Yellow
      glow: 'rgba(234, 179, 8, 0.5)', 
      desc: 'Pressure Build', 
      pos: 'up' 
    },
    { 
      name: 'Combustion', 
      color: '#ef4444', // Red
      glow: 'rgba(239, 68, 68, 0.8)', 
      desc: 'Power Stroke', 
      pos: 'down' 
    },
    { 
      name: 'Exhaust', 
      color: '#64748b', // Grey
      glow: 'rgba(100, 116, 139, 0.5)', 
      desc: 'Gas Release', 
      pos: 'up' 
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCycleStep((prev) => (prev + 1) % 4);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans p-8 flex flex-col items-center justify-center overflow-hidden">
      {/* Ambient Background Lights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/10 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10 text-center mb-20">
        <h1 className="text-6xl font-black italic tracking-tighter mb-2 text-slate-200">
          ENGINE <span className="text-indigo-500">X-4</span>
        </h1>
        <p className="text-slate-500 tracking-[0.4em] uppercase text-xs font-bold">
          High-Fidelity Combustion Simulation
        </p>
      </div>

      {/* 3D SCENE CONTAINER */}
      <div className="relative perspective-2000">
        <div 
          className="relative transition-transform duration-1000"
          style={{ 
            transform: 'rotateX(60deg) rotateZ(-35deg)',
            transformStyle: 'preserve-3d',
            width: '600px',
            height: '300px'
          }}
        >
          {/* 1. THE MAIN ENGINE BLOCK (Volume Depth) */}
          {/* Bottom Plate */}
          <div className="absolute inset-0 bg-slate-900 border-b-8 border-slate-950" 
               style={{ transform: 'translateZ(-40px)' }} />
          
          {/* Side Walls (Depth) */}
          <div className="absolute top-0 left-0 w-full h-[40px] bg-slate-800" 
               style={{ transform: 'rotateX(-90deg)', transformOrigin: 'top', translateZ: '0px' }} />
          
          {/* Top Face */}
          <div className="absolute inset-0 bg-slate-800 border-4 border-slate-700 rounded-xl shadow-2xl overflow-hidden"
               style={{ transform: 'translateZ(0px)' }}>
            
            {/* The Cylinder Bores (The holes in the block) */}
            <div className="absolute inset-0 flex justify-around items-center px-12">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-24 h-24 bg-black rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,1)] border-2 border-slate-700" />
              ))}
            </div>
          </div>

          {/* 2. THE PISTONS AND RODS */}
          <div className="absolute inset-0 flex justify-around items-center px-12" style={{ transform: 'translateZ(10px)' }}>
            {[0, 1, 2, 3].map((i) => {
              const stageIdx = (cycleStep + i) % 4;
              const stage = stages[stageIdx];
              const isUp = stage.pos === 'up';
              const yOffset = isUp ? '-80px' : '60px';

              return (
                <div key={i} className="relative flex flex-col items-center" style={{ transformStyle: 'preserve-3d' }}>
                  
                  {/* Piston Head (Cylindrical Volume) */}
                  <div 
                    className="absolute w-20 h-20 rounded-full transition-all duration-700 ease-in-out flex items-center justify-center"
                    style={{ 
                      transform: `translateY(${yOffset}) translateZ(20px)`,
                      background: `radial-gradient(circle at 30% 30%, ${stage.color}, #000)`,
                      boxShadow: `0 0 40px ${stage.glow}, inset -5px -5px 15px rgba(0,0,0,0.8)`,
                      border: '2px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    {/* Piston Top Cap */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent opacity-40" />
                    
                    {/* Combustion Flash */}
                    {stageIdx === 2 && (
                      <div className="absolute w-full h-full bg-white rounded-full animate-ping opacity-60" />
                    )}
                  </div>

                  {/* Connecting Rod (3D Depth) */}
                  <div 
                    className="absolute w-4 bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600 transition-all duration-700 ease-in-out"
                    style={{ 
                      height: isUp ? '40px' : '160px',
                      transform: `translateY(${isUp ? '-40px' : '60px'}) translateZ(10px)`,
                      boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* 3. THE CRANKSHAFT (Rotating Base) */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-600 to-slate-900 rounded-full border-y border-slate-500"
            style={{ transform: 'translateZ(-20px)' }}
          />
        </div>
      </div>

      {/* CONTROL PANEL / LEGEND */}
      <div className="relative z-10 mt-32 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl">
        {stages.map((stage, idx) => {
          const isActive = (cycleStep + 0) % 4 === idx;
          return (
            <div 
              key={idx} 
              className={`p-4 rounded-xl border transition-all duration-500 flex flex-col gap-2 ${
                isActive 
                ? 'bg-slate-800 border-white/40 scale-105 shadow-lg' 
                : 'bg-slate-900/40 border-slate-800 opacity-30'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                <span className="text-xs font-bold uppercase tracking-widest">{stage.name}</span>
              </div>
              <p className="text-xs text-slate-400">{stage.desc}</p>
              {isActive && (
                <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white animate-progress" style={{ backgroundColor: stage.color }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        .perspective-2000 {
          perspective: 2000px;
        }
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 800ms linear infinite;
        }
      `}</style>
    </div>
  );
};

export default RealisticEngine;
