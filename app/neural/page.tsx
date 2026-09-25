"use client";

import React from "react";
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
      >

      </motion.div>
    </div>
  );
}