"use client";

import { useState, useEffect } from 'react';

const EnginePage = () => {
  const [cycleStep, setCycleStep] = useState(0);

  // The 4 stages of the internal combustion engine
  const stages = [
    { 
      name: 'Intake', 
      color: 'bg-blue-500', 
      shadow: 'shadow-blue-500/50', 
      desc: 'Cool air and fuel enter the cylinder', 
      temp: 'Cool' 
    },
    { 
      name: 'Compression', 
      color: 'bg-yellow-500', 
      shadow: 'shadow-yellow-500/50', 
      desc: 'Piston moves up, compressing the mixture', 
      temp: 'Heating' 
    },
    { 
      name: 'Combustion', 
      color: 'bg-red-600', 
      shadow: 'shadow-red-600/80', 
      desc: 'Spark plug ignites, forcing piston down', 
      temp: 'Extreme Heat' 
    },
    { 
      name: 'Exhaust', 
      color: 'bg-slate-500', 
      shadow: 'shadow-slate-500/50', 
      desc: 'Waste gases are pushed out', 
      temp: 'Cooling' 
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCycleStep((prev) => (prev + 1) % 4);
    }, 1000); // Change state every second
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white font-sans p-8 flex flex-col items-center justify-center overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 text-center mb-16">
        <h1 className="text-5xl font-black tracking-tighter italic mb-2 bg-gradient-to-r from-white via-slate-400 to-white bg-clip-text text-transparent">
          V4 ENGINE SIMULATOR
        </h1>
        <p className="text-slate-400 tracking-[0.3em] uppercase text-xs font-bold">
          Internal Combustion Sequence
        </p>
      </div>

      {/* 3D Engine Container */}
      <div className="relative perspective-1000">
        <div 
          className="relative w-150 h-100 transition-transform duration-700 ease-out"
          style={{ 
            transform: 'rotateX(60deg) rotateZ(-45deg)',
            transformStyle: 'preserve-3d' 
          }}
        >
          {/* Engine Block Base */}
          <div className="absolute inset-0 bg-slate-800/50 border-4 border-slate-700 rounded-xl shadow-2xl" 
               style={{ transform: 'translateZ(-20px)' }} />

          {/* Cylinders */}
          <div className="absolute inset-0 flex justify-around items-center px-10">
            {[0, 1, 2, 3].map((i) => {
              // Logic to offset the cycle for each cylinder (Firing order)
              const currentStageIdx = (cycleStep + i) % 4;
              const stage = stages[currentStageIdx];
              
              // Calculate piston position based on stage
              // Intake: Down, Compression: Up, Combustion: Down, Exhaust: Up
              const isUp = currentStageIdx === 1 || currentStageIdx === 3;
              const pistonTranslate = isUp ? '-60px' : '60px';

              return (
                <div key={i} className="relative flex flex-col items-center" style={{ transformStyle: 'preserve-3d' }}>
                  
                  {/* Cylinder Sleeve */}
                  <div className="w-20 h-40 bg-slate-900/80 border-2 border-slate-600 rounded-lg relative overflow-hidden shadow-inner">
                    
                    {/* The Combustion Chamber Glow */}
                    <div className={`absolute inset-0 transition-all duration-500 ${stage.color} opacity-20 ${currentStageIdx === 2 ? 'animate-pulse opacity-60' : ''}`} />
                    
                    {/* The Piston */}
                    <div 
                      className={`absolute left-2 right-2 bottom-4 h-16 rounded-md transition-all duration-700 ease-in-out ${stage.color} ${stage.shadow} shadow-lg border border-white/20`}
                      style={{ 
                        transform: `translateY(${pistonTranslate})`,
                        boxShadow: `0 0 30px ${stage.color === 'bg-red-600' ? '#ef4444' : 'transparent'}`
                      }}
                    >
                      {/* Piston Top Detail */}
                      <div className="absolute top-0 left-0 right-0 h-2 bg-white/30 rounded-t-md" />
                    </div>

                    {/* Combustion Flash Effect */}
                    {currentStageIdx === 2 && (
                      <div className="absolute top-0 left-0 right-0 h-10 bg-white blur-md animate-ping opacity-50" />
                    )}
                  </div>

                  {/* Connecting Rod */}
                  <div 
                    className="w-3 bg-slate-600 transition-all duration-700 ease-in-out"
                    style={{ 
                      height: isUp ? '40px' : '120px',
                      transform: 'translateZ(-10px)'
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Crankshaft Bar */}
          <div 
            className="absolute bottom-10 left-0 right-0 h-6 bg-slate-700 rounded-full border border-slate-500"
            style={{ transform: 'translateZ(-30px)' }}
          />
        </div>
      </div>

      {/* Bottom Info Panel */}
      <div className="relative z-10 mt-24 grid grid-cols-1 md:grid-cols-4 gap-6 w-full max-w-5xl">
        {stages.map((stage, idx) => {
          const isActive = (cycleStep + 0) % 4 === idx; // Simplified for the main display
          return (
            <div 
              key={idx} 
              className={`p-6 rounded-2xl border transition-all duration-500 ${
                isActive 
                ? `${stage.color} border-white/40 scale-105 shadow-2xl` 
                : 'bg-slate-900/50 border-slate-800 opacity-40'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black uppercase tracking-widest opacity-70">Stage 0{idx + 1}</span>
                <span className={`text-[10px] px-2 py-1 rounded-full bg-black/20 font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {stage.temp}
                </span>
              </div>
              <h3 className="text-xl font-bold mb-2">{stage.name}</h3>
              <p className="text-sm opacity-80 leading-relaxed">{stage.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Global CSS for Perspective */}
      <style jsx global>{`
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </div>
  );
};

export default EnginePage;
