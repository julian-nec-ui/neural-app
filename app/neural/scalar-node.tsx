"use client";

import { motion } from 'framer-motion';

interface ScalarNodeProps {
  value: number;
  color?: string;
}

const ScalarNode = ({ value, color = "#3b82f6" }: ScalarNodeProps) => {
  // 1. Safety check for Next.js prerendering
  const safeValue = typeof value === 'number' ? value : 0;
  const magnitude = Math.abs(safeValue);
  
  // 2. Calculate the Base (Target) Scale based on the value
  // A value of 0 = 0.5 scale; A value of 10 = 1.5 scale
  const targetScale = Math.min(0.5 + (magnitude * 0.1), 1.5);
  
  // 3. Calculate the Pulse Amplitude (how much it grows/shrinks)
  // The larger the value, the more intense the "breathing" effect
  const pulseRange = 0.05 + (magnitude * 0.02);

  // 4. Calculate Glow Intensity
  const glowOpacity = Math.min(magnitude / 10, 1);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <motion.div
        // THE FIX: We use an array [min, max, min] to create a keyframe loop
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
          duration: 2,       // Speed of one breath
          repeat: Infinity,  // Keep breathing forever
          ease: "easeInOut", // Smooth movement
        }}
        className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gray-900 border-2 text-white"
        style={{ borderColor: color }}
      >
        {/* Text Value */}
        <span className="text-xl font-mono font-bold z-10">
          {safeValue.toFixed(1)}
        </span>

        {/* Inner Glow Layer */}
        <motion.div 
          className="absolute inset-0 rounded-full opacity-20"
          style={{ backgroundColor: color }}
          animate={{ opacity: [0.1, 0.4, 0.1] }}
          transition={{ 
            duration: 2, 
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
