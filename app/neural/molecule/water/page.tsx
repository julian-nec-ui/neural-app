"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Info, Droplets } from 'lucide-react';

// --- TYPES ---
type MoleculeState = 'idle' | 'attracting' | 'bonded' | 'impulsing' | 'finished';

interface AtomProps {
  label: string;
  color: string;
  size: number;
  x?: number;
  y?: number;
  initialX?: number;
  initialY?: number;
  finalX?: number;
  finalY?: number;
  state: MoleculeState;
}

// --- HELPER: ATOM COMPONENT ---
const Atom = ({ 
  label, 
  color, 
  size, 
  x = 0, 
  y = 0, 
  initialX, 
  initialY, 
  finalX, 
  finalY, 
  state 
}: AtomProps) => {
  const isCenter = initialX === undefined;
  const isAtFinalPos = state !== 'idle';
  const currentX = isCenter ? x : (isAtFinalPos ? finalX : initialX);
  const currentY = isCenter ? y : (isAtFinalPos ? finalY : initialY);
  const isReceiving = state === 'impulsing' && !isCenter;

  return (
    <motion.div
      animate={{
        x: currentX,
        y: currentY,
        scale: isReceiving ? [1, 1.2, 1] : (isAtFinalPos ? 1.05 : 1)
      }}
      transition={{
        x: { type: "spring", stiffness: 80, damping: 12 },
        y: { type: "spring", stiffness: 80, damping: 12 },
        scale: isReceiving ? { duration: 0.4, repeat: 0 } : { duration: 0.3 }
      }}
      className="absolute flex items-center justify-center"
    >
      <AnimatePresence>
        {isReceiving && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 0.5, 0], scale: [1, 1.5, 2] }}
            exit={{ opacity: 0 }}
            className="absolute w-full h-full rounded-full bg-blue-400 blur-2xl"
          />
        )}
      </AnimatePresence>

      <div
        className="relative rounded-full shadow-[0_40px_80px_rgba(0,0,0,0.6)] flex items-center justify-center text-white font-black overflow-hidden"
        style={{
          width: size,
          height: size,
          background: color,
          border: '1px solid rgba(255,255,255,0.2)'
        }}
      >
        <div className="absolute top-[10%] left-[15%] w-1/3 h-1/3 bg-white/30 rounded-full blur-xs" />
        <div className="absolute top-[5%] left-[25%] w-1/5 h-1/5 bg-white/50 rounded-full blur-[2px]" />
        <span 
          className="relative z-10 drop-shadow-md"
          style={{ fontSize: label === 'O' ? '90px' : '55px' }}
        >
          {label}
        </span>
      </div>
    </motion.div>
  );
};

// --- MAIN PAGE COMPONENT ---
export default function WaterMoleculeFormation() {
  const [state, setState] = useState<MoleculeState>('idle');
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = () => {
    setIsResetting(true);
    setTimeout(() => {
      setState('idle');
      setIsResetting(false);
    }, 600);
  };

  const handleForm = () => {
    if (state !== 'idle') {
      setState('idle');
      setTimeout(() => {
        setState('attracting');
      }, 50);
    } else {
      setState('attracting');
    }
  };

  useEffect(() => {
    if (state === 'attracting') {
      const timer = setTimeout(() => setState('bonded'), 1200);
      return () => clearTimeout(timer);
    }
    if (state === 'bonded') {
      const timer = setTimeout(() => setState('impulsing'), 600);
      return () => clearTimeout(timer);
    }
    if (state === 'impulsing') {
      const timer = setTimeout(() => setState('finished'), 1000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const isProcessing = ['attracting', 'bonded', 'impulsing'].includes(state);

  return (
    <main className="w-full min-h-screen bg-[#020617] text-slate-200 flex flex-col overflow-hidden font-sans pt-1.25">
      <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl flex items-center justify-between px-8 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            <Droplets size={18} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-white">Molecular<span className="text-blue-400">Forge</span> <span className="text-xs font-mono text-slate-500 ml-2 uppercase tracking-tighter">H₂O Bond Simulation</span></h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-2 transition active:scale-95"
          >
            <motion.div animate={{ rotate: isResetting ? 360 : 0 }} transition={{ duration: 0.6 }}>
              <RotateCcw size={14} />
            </motion.div>
            RESET
          </button>

          <button
            onClick={handleForm}
            disabled={isProcessing}
            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/20 w-50 whitespace-nowrap active:scale-95"
          >
            {isProcessing ? (
              <>
                <div className="flex items-center justify-center w-4 h-4">
                  <motion.svg
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-full h-full"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12" cy="12" r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray="47 16"
                      strokeLinecap="round"
                      className="text-white"
                    />
                  </motion.svg>
                </div>
                <span className="animate-pulse">FORMING MOLECULE</span>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center w-4 h-4">
                  <Play size={16} fill="currentColor" />
                </div>
                <span>FORM MOLECULE</span>
              </>
            )}
          </button>
        </div>
      </header>

      <div className="grow flex relative">
        <aside className="w-80 border-r border-slate-800 bg-slate-950/30 p-6 z-40 overflow-y-auto font-mono">
          <div className="flex items-center gap-2 text-blue-400 mb-6 uppercase tracking-widest text-sm font-bold"><Info size={16} /> Simulation Data</div>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-zinc-900/50 border border-slate-800">
              <div className="text-xs text-slate-500 uppercase mb-1">Bond Angle</div>
              <div className="text-sm text-slate-200 font-bold">~104.5° (Bent)</div>
            </div>
            <div className="p-4 rounded-lg bg-zinc-900/50 border border-slate-800">
              <div className="text-xs text-slate-500 uppercase mb-1">State</div>
              <div className="text-sm text-blue-400 font-bold uppercase">{state}</div>
            </div>
          </div>
        </aside>

        <div className="grow relative bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black flex items-center justify-center">
          <div className="relative w-200 h-200 flex items-center justify-center" style={{ transform: 'translate(-20px, -140px)' }}>

            <svg className="absolute top-1/2 left-1/2 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 1, filter: 'drop-shadow(0 0 8px rgba(74, 222, 128, 0.5))' }}>
              <AnimatePresence>
                {state !== 'idle' && state !== 'attracting' && (
                  <>
                    <motion.line
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      x1="-87" y1="67" x2="-261" y2="202"
                      stroke="#4ade80" strokeWidth="8" strokeLinecap="round"
                    />
                    <motion.line
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      x1="87" y1="67" x2="261" y2="202"
                      stroke="#4ade80" strokeWidth="8" strokeLinecap="round"
                    />

                    <motion.path
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      d="M -174 134.5 Q 0 180 174 134.5"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <motion.text
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 }}
                      x="0" y="195" // UPDATED: Raised from 210 to 195 to be closer to the arch
                      textAnchor="middle"
                      className="fill-blue-300 text-[20px] font-mono font-bold"
                    >
                      104.5°
                    </motion.text>
                  </>
                )}
              </AnimatePresence>
            </svg>

            <div className="relative flex items-center justify-center" style={{ zIndex: 2 }}>
              <Atom
                label="O"
                color="radial-gradient(circle at 30% 30%, #60a5fa, #1e3a8a)"
                size={220}
                state={state}
              />
            </div>

            <Atom
              label="H"
              color="radial-gradient(circle at 30% 30%, #94a3b8, #1e293b)"
              size={140}
              initialX={-400} initialY={-200}
              finalX={-316} finalY={245} 
              state={state}
            />

            <Atom
              label="H"
              color="radial-gradient(circle at 30% 30%, #94a3b8, #1e293b)"
              size={140}
              initialX={400} initialY={-200}
              finalX={316} finalY={245}
              state={state}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
