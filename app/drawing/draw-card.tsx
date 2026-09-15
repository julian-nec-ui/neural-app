"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

// Move the path generator here
const generateSinePath = () => {
  const startX = 20, endX = 180, centerY = 100, amplitude = 40, frequency = 2;
  let path = `M ${startX},${centerY}`;
  const segments = frequency * 4;
  const segmentWidth = (endX - startX) / segments;
  for (let i = 0; i < segments; i++) {
    const x0 = startX + i * segmentWidth;
    const x1 = startX + (i + 1) * segmentWidth;
    const y0 = centerY + Math.sin((i * Math.PI) / 2) * amplitude;
    const y1 = centerY + Math.sin(((i + 1) * Math.PI) / 2) * amplitude;
    path += ` C ${x0 + segmentWidth / 2},${y0} ${x0 + segmentWidth / 2},${y1} ${x1},${y1}`;
  }
  return path;
};

interface DrawingCardProps {
  title: string;
  globalProgress: number;
  renderSVG: (progress: number) => React.ReactNode;
}

const DrawingCard = ({ title, globalProgress, renderSVG }: DrawingCardProps) => {
  const [localProgress, setLocalProgress] = useState(globalProgress);

  useEffect(() => {
    setLocalProgress(globalProgress);
  }, [globalProgress]);

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 flex flex-col items-center justify-center aspect-square">
      <h3 className="text-slate-600 uppercase text-xs font-bold mb-6 tracking-widest">{title}</h3>
      {renderSVG(localProgress)}
      <div className="mt-6 w-full flex flex-col gap-2">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span>Start</span><span>{Math.round(localProgress * 100)}%</span><span>End</span>
        </div>
        <input
          type="range" min="0" max="1" step="0.01" value={localProgress}
          onChange={(e) => setLocalProgress(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
      </div>
    </div>
  );
};

export default function DrawSection({ globalProgress }: { globalProgress: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
      <DrawingCard title="The Square" globalProgress={globalProgress} renderSVG={(progress) => (
        <svg width="300" height="300" viewBox="0 0 200 200" className="drop-shadow-md">
          <motion.path d="M 50,50 L 150,50 L 150,150 L 50,150 Z" fill="transparent" stroke="#4f46e5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: progress }} transition={{ duration: 0.3, ease: "linear" }} />
        </svg>
      )} />

      <DrawingCard title="The Sinusoid" globalProgress={globalProgress} renderSVG={(progress) => (
        <svg width="300" height="300" viewBox="0 0 200 200" className="drop-shadow-md">
          <line x1="20" y1="100" x2="180" y2="100" stroke="#e2e8f0" strokeWidth="2" />
          <line x1="100" y1="20" x2="100" y2="180" stroke="#e2e8f0" strokeWidth="2" />
          <motion.path d={generateSinePath()} fill="transparent" stroke="#f43f5e" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: progress }} transition={{ duration: 0.3, ease: "linear" }} />
        </svg>
      )} />

      <DrawingCard title="The Triangle" globalProgress={globalProgress} renderSVG={(progress) => (
        <svg width="300" height="300" viewBox="0 0 200 200" className="drop-shadow-md">
          <motion.path d="M 100,50 L 150,150 L 50,150 Z" fill="transparent" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: progress }} transition={{ duration: 0.3, ease: "linear" }} />
        </svg>
      )} />

      <DrawingCard title="The Circle" globalProgress={globalProgress} renderSVG={(progress) => (
        <svg width="300" height="300" viewBox="0 0 200 200" className="drop-shadow-md">
          <motion.path d="M 50,100 A 50,50 0 1 0 150,100 A 50,50 0 1 0 50,100" fill="transparent" stroke="#a855f7" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: progress }} transition={{ duration: 0.3, ease: "linear" }} />
        </svg>
      )} />
    </div>
  );
}
