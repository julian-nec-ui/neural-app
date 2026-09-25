"use client";

import { motion } from "framer-motion";

interface ScalarNodeProps {
  value: number;
  color?: string;
}

export default function ScalarNode({ value, color = "#3b82f6" }: ScalarNodeProps) {
  const magnitude = Math.abs(value);
  const scale = Math.min(0.5 + (magnitude * 0.1), 1.5);
  const glowOpacity = Math.min(magnitude / 10, 1);

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <motion.div
        animate={{
          scale: scale,
          boxShadow: [
            `0 0 0ppx ${color}`,
            `0 0 ${30 * glowOpacity}px ${color}`,
            `0 0 0px ${color}`
          ]
        }}
        transition={{
          duration: 2.0,
          repeat: Infinity,
          ease: "easeInOut"
        }}

        className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gray-900 border-2 text-white transition-colors"
        style={{ borderColor: color }} // Set border color via style to use the prop
      >

        <span className="text-xl font-mono font-bold z-10">
          {typeof value === "number" ? value.toFixed(1) : value}
        </span>

        <motion.div
          className="absolute inset-0 rounded-full opacity-20"
          style={{ backgroundColor: color }}
          animate={{
            opacity: [0.1, 0.4, 0.1]
          }}
          transition={{
            duration: 2, repeat: Infinity
          }}
        >

        </motion.div>

        <p className="mt-4 text-xs font-mono text-gray-500 uppercase tracking-widest">
          Scalar
        </p>

      </motion.div>
    </div>
  );
}