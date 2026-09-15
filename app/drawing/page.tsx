"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, RotateCcw, Loader2 } from "lucide-react";
import DrawSection from "./draw-card";


// Path generator kept outside the component to avoid re-creation
const generateSinePath = () => {
  const startX = 20;
  const endX = 180;
  const centerY = 100;
  const amplitude = 40;
  const frequency = 2;

  let path = `M ${startX},${centerY}`;

  const segments = frequency * 4;
  const segmentWidth = (endX - startX) / segments;

  for (let i = 0; i < segments; i++) {
    const x0 = startX + i * segmentWidth;
    const x1 = startX + (i + 1) * segmentWidth;

    const y0 = centerY + Math.sin((i * Math.PI) / 2) * amplitude;
    const y1 = centerY + Math.sin(((i + 1) * Math.PI) / 2) * amplitude;

    const cp1x = x0 + segmentWidth / 2;
    const cp1y = y0;
    const cp2x = x0 + segmentWidth / 2;
    const cp2y = y1;

    // CORRECTED LINE BELOW
    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x1},${y1}`;
  }

  return path;
};

export default function DrawingPage() {
  // 1. ADD MOUNTED STATE
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const timerRef = useRef<number | null>(null);

  // 2. SET MOUNTED TO TRUE ON LOAD
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleReset = async () => {
    setIsResetting(true);

    // 1. Use window.clearInterval and a check to ensure it's not null
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
    }

    if (progress === 0) {
      setIsResetting(false);
      return;
    }

    return new Promise<void>((resolve) => {
      const startTime = Date.now();
      const duration = 1000;
      const startProgress = progress;

      // 2. Use window.setInterval
      timerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const currentProgress =
          startProgress - (elapsed / duration) * startProgress;
        setProgress(Math.max(currentProgress, 0));
        if (currentProgress <= 0) {
          window.clearInterval(timerRef.current!); // Use ! to tell TS we know it's not null here
          setIsResetting(false);
          resolve();
        }
      }, 16);
    });
  };

  const handleStart = async () => {
    await handleReset();

    const startTime = Date.now();
    const duration = 2000;

    // 3. Use window.setInterval
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min(elapsed / duration, 1);
      setProgress(currentProgress);
      if (currentProgress === 1) {
        window.clearInterval(timerRef.current!); // Use !
      }
    }, 16);
  };

  // 3. RETURN NULL UNTIL MOUNTED
  // This prevents the server from rendering the SVG and causing a hydration mismatch
  if (!mounted) return <div className="bg-slate-50 min-h-screen" />;

  return (
    <div className="p-8 bg-[#2a5177] min-h-screen font-sans flex flex-col items-center">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-[#e2eef5] tracking-tight mb-4">
          SVG Geometry Drawing Animations
        </h1>
        <p className="text-[#e2eef5] mb-8 text-lg font-medium">
          Click start to see the paths trace in real-time
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleStart}
            className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 font-semibold cursor-pointer active:scale-95"
          >
            <Play size={21} /> Start Drawing
          </button>
          {/* Change the Reset button to this */}
          <button
            onClick={handleReset}
            className="flex items-center gap-2 bg-white text-slate-600 px-8 py-3 rounded-xl border border-slate-200 hover:bg-slate-300 transition-all shadow-sm shadow-blue-200 font-semibold cursor-pointer active:scale-95"
            disabled={isResetting}
          >
            <motion.div
              animate={{ rotate: isResetting ? -360 : 0 }}
              transition={{
                duration: isResetting ? 0.6 : 0,
                repeat: isResetting ? Infinity : 0,
                ease: "linear",
              }}
            >
              {isResetting ? (
                <Loader2 size={24} style={{ color: "#ff0000" }} />
              ) : (
                <RotateCcw size={24} />
              )}
              {/* Replaced RotateCcw with Loader2 */}
            </motion.div>
            Reset
          </button>
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-2 rounded-2xl border border-white/20 shadow-inner">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-indigo-200 font-bold text-center mb-1">
                Manual Control
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={progress}
                  onChange={(e) => setProgress(parseFloat(e.target.value))}
                  className="w-32 h-1.5 bg-indigo-300/30 rounded-lg appearance-none cursor-pointer accent-indigo-400 hover:accent-indigo-300 transition-all"
                />
                <span className="text-sm font-mono font-bold text-white min-w-10">
                  {Math.round(progress * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl">
        {/* SQUARE */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 flex flex-col items-center justify-center aspect-square">
          <h3 className="text-slate-600 uppercase text-xs font-bold mb-6 tracking-widest">
            The Square
          </h3>
          <svg
            width="400"
            height="400"
            viewBox="0 0 200 200"
            className="drop-shadow-md"
          >
            <motion.path
              d="M 50,50 L 150,50 L 150,150 L 50,150 Z"
              fill="transparent"
              stroke="#4f46e5"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress }}
              transition={{ duration: 0.3, ease: "linear" }}
            />
          </svg>
          <div className="mt-6 w-full flex flex-col gap-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Start</span>
              <span>{Math.round(progress * 100)}%</span>
              <span>End</span>
            </div>
            {/* End of block */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={progress}
              onChange={(e) => setProgress(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition-all"
            />
          </div>
        </div>
        {/* SINUSOID */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 flex flex-col items-center justify-center aspect-square">
          <h3 className="text-slate-600 uppercase text-xs font-bold mb-6 tracking-widest">
            The Sinusoid
          </h3>
          <svg
            width="400"
            height="400"
            viewBox="0 0 200 200"
            className="drop-shadow-md"
          >
            <line
              x1="20"
              y1="100"
              x2="180"
              y2="100"
              stroke="#e2e8f0"
              strokeWidth="2"
            />
            <line
              x1="100"
              y1="20"
              x2="100"
              y2="180"
              stroke="#e2e8f0"
              strokeWidth="2"
            />
            <motion.path
              d={generateSinePath()}
              fill="transparent"
              stroke="#f43f5e"
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress }}
              transition={{ duration: 0.3, ease: "linear" }}
            />
          </svg>
          <div className="mt-6 w-full flex flex-col gap-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Start</span>
              <span>{Math.round(progress * 100)}%</span>
              <span>End</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={progress}
              onChange={(e) => setProgress(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        </div>
        {/* TRIANGLE */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 flex flex-col items-center justify-center aspect-square">
          <h3 className="text-slate-600 uppercase text-xs font-bold mb-6 tracking-widest">
            The Triangle
          </h3>
          <svg
            width="400"
            height="400"
            viewBox="0 0 200 200"
            className="drop-shadow-md"
          >
            <motion.path
              d="M 100,50 L 150,150 L 50,150 Z"
              fill="transparent"
              stroke="#10b981"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress }}
              transition={{ duration: 0.3, ease: "linear" }}
            />
          </svg>
          <div className="mt-6 w-full flex flex-col gap-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Start</span>
              <span>{Math.round(progress * 100)}%</span>
              <span>End</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={progress}
              onChange={(e) => setProgress(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        </div>
        {/* 4. THE CIRCLE */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 flex flex-col items-center justify-center aspect-square">
          <h3 className="text-slate-400 uppercase text-xs font-bold mb-6 tracking-widest">
            The Circle
          </h3>
          <svg
            width="400"
            height="400"
            viewBox="0 0 200 200"
            className="drop-shadow-md"
          >
            <motion.path
              // M: Move to (50,100)
              // A: Arc (rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, endX, endY)
              d="M 50,100 A 50,50 0 1 0 150,100 A 50,50 0 1 0 50,100"
              fill="transparent"
              stroke="#a855f7" // Purple-500
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress }}
              transition={{ duration: 0.3, ease: "linear" }}
            />
          </svg>
          <div className="mt-6 w-full flex flex-col gap-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Start</span>
              <span>{Math.round(progress * 100)}%</span>
              <span>End</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={progress}
              onChange={(e) => setProgress(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition-all"
            />
          </div>
        </div>

        <DrawSection globalProgress={progress} /> 
      </div>
    </div>
  );
}
