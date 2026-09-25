"use client";

import { motion } from 'framer-motion';

interface ScalarNodeProps {
  value: number;
  color?: string;
}

const ScalarNode = ({ value, color = "#3b82f6" }: ScalarNodeProps) => {
  // Safety check for the build process/prerendering
  const safeValue = typeof value === 'number' ? value : 0;
  
  const magnitude = Math.abs(safeValue);
  
  // Visual mapping: scale between 0.5 and 1.5
  const scale = Math.min(0.5 + (magnitude * 0.1), 1.5);
  const glowOpacity = Math.min(magnitude / 10, 1);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <motion.div
        animate={{
          scale: scale,
          boxShadow: [
            `0 0 0px ${color}`,
            `0 0 ${30 * glowOpacity}px ${color}`,
            `0 0 0px ${color}`,
          ],
        }}
        transition={{
          duration: 2,
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
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>
      
      <p className="mt-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
        Scalar
      </p>
    </div>
  );
};

export default ScalarNode;
