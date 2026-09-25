"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ScalarNodeProps {
  value: number;
  color?: string;
}

const ScalarNode = ({ value, color = "#3b82f6" }: ScalarNodeProps) => {
  // 1. Safety check for Next.js
  const safeValue = typeof value === 'number' ? value : 0;
  const magnitude = Math.abs(safeValue);
  
  // 2. Create a state to hold the unique "personality" of this specific node
  const [animationSettings, setAnimationSettings] = useState({
    delay: 0,
    duration: 2,
  });

  // 3. Generate unique timing on mount so they don't all pulse together
  useEffect(() => {
    setAnimationSettings({
      // Random delay between 0 and 2 seconds so they don't start at the same time
      delay: Math.random() * 2,
      // Random duration between 1.5s and 3s so they have different "heartbeats"
      duration: 1.5 + Math.random() * 1.5,
    });
  }, []);

  const targetScale = Math.min(0.5 + (magnitude * 0.1), 1.5);
  const pulseRange = 0.05 + (magnitude * 0.02);
  const glowOpacity = Math.min(magnitude / 10, 1);

  return (
    <div className="flex flex-col items-center justify-center p-4">
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
          duration: animationSettings.duration, // Unique speed
          delay: animationSettings.delay,       // Unique start offset
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gray-900 border-2 text-white"
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
            duration: animationSettings.duration, 
            delay: animationSettings.delay,
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      </motion.div>
      
      <p className="mt-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
        Scalar
      </p>
    </div>
  );
};

export default ScalarNode;
