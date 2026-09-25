"use client";

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface ScalarNodeProps {
  value: number;
  color?: string;
}

const ScalarNode = ({ value, color = "#3b82f6" }: ScalarNodeProps) => {
  const safeValue = typeof value === 'number' ? value : 0;
  const magnitude = Math.abs(safeValue);
  
  // 1. Generate unique, persistent animation parameters for this specific instance
  // We use useMemo so the random values are only calculated once per component lifecycle
  const { delay, duration } = useMemo(() => ({
    delay: Math.random() * 2,
    duration: 1.5 + Math.random() * 2,
  }), []);

  const targetScale = Math.min(0.5 + (magnitude * 0.1), 1.5);
  const pulseRange = 0.05 + (magnitude * 0.02);
  const glowOpacity = Math.min(magnitude / 10, 1);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {/* Container for the animated part to control the footprint */}
      <div className="relative h-32 w-32 flex items-center justify-center">
        <motion.div
          animate={{
            scale: [
              targetScale - pulseRange, 
              targetScale + pulseRange, 
              targetScale - pulseRange
            ],
            boxShadow: [
              `0 0 0px ${color}`,
              `0 0 ${30 * glowOpacity}px ${color}`,
              `0 0 0px ${color}`,
            ],
          }}
          transition={{
            duration: duration,
            delay: delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute flex items-center justify-center w-24 h-24 rounded-full bg-gray-900 border-2 text-white"
          style={{ borderColor: color }}
        >
          <span className="text-xl font-mono font-bold z-10">
            {safeValue.toFixed(1)}
          </span>

          <motion.div 
            className="absolute inset-0 rounded-full opacity-20"
            style={{ backgroundColor: color }}
            animate={{ opacity: [0.1, 0.4, 0.1] }}
            transition={{ 
              duration: duration, 
              delay: delay,
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
        </motion.div>
      </div>
      
      {/* 2. Moved text further down using mt-12 to avoid overlap */}
      <p className="mt-12 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
        Scalar
      </p>
    </div>
  );
};

export default ScalarNode;
