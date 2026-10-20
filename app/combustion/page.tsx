"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';

// --- Piston Component ---
const Piston = ({ index, totalPistons }: { index: number, totalPistons: number }) => {
  const pistonRef = useRef<THREE.Group>(null);
  const rodRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Calculate the offset for the 4-stroke cycle (Firing order)
  const offset = (index * (Math.PI * 2)) / totalPistons;

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * 2; // Speed of engine
    const angle = t + offset;
    
    // 1. Piston Vertical Movement (Sine wave)
    const yPos = Math.sin(angle) * 1.5; 
    if (pistonRef.current) {
      pistonRef.current.position.y = yPos;
    }

    // 2. Connecting Rod Movement (Tilt to follow crankshaft)
    if (rodRef.current) {
      rodRef.current.position.y = yPos / 2;
      rodRef.current.rotation.z = Math.cos(angle) * 0.5;
    }

    // 3. Combustion Color Logic
    // We map the sine wave ( -1 to 1 ) to 4 stages
    const normalized = (Math.sin(angle) + 1) / 2; // 0 to 1
    let color = new THREE.Color('#64748b'); // Default Exhaust (Grey)

    if (normalized < 0.25) color.set('#3b82f6'); // Intake (Blue)
    else if (normalized < 0.5) color.set('#eab308'); // Compression (Yellow)
    else if (normalized < 0.75) color.set('#ef4444'); // Combustion (Red)
    else color.set('#64748b'); // Exhaust (Grey)

    if (glowRef.current) {
      glowRef.current.material.color.lerp(color, 0.1);
      // Make it "pulse" during combustion
      const scale = normalized > 0.5 && normalized < 0.75 ? 1.2 : 1.0;
      glowRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group>
      {/* Piston Head */}
      <group ref={pistonRef}>
        <mesh castShadow>
          <cylinderGeometry args={[0.7, 0.7, 0.8, 32]} />
          <meshStandardMaterial color="#a1a1aa" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Internal Glow (The combustion chamber) */}
        <mesh ref={glowRef} position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshStandardMaterial emissiveIntensity={2} emissive="#ef4444" transparent opacity={0.6} />
        </mesh>
      </group>

      {/* Connecting Rod */}
      <mesh ref={rodRef} position={[0, -1, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 3, 16]} />
        <meshStandardMaterial color="#4b5563" metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  );
};

// --- Main Engine Scene ---
const EngineScene = () => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} castShadow />
      <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
      
      <Environment preset="city" />

      {/* Engine Block Shell (Semi-transparent to see inside) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[5, 5, 2]} />
        <meshStandardMaterial 
          color="#1e293b" 
          transparent 
          opacity={0.3} 
          metalness={0.5} 
          roughness={0.1} 
        />
      </mesh>

      {/* The Pistons Group */}
      <group position={[0, 0, 0]}>
        {[-2, -1, 1, 2].map((x, i) => (
          <group key={i} position={[x, 0, 0]}>
            <Piston index={i} totalPistons={4} />
          </group>
        ))}
      </group>

      {/* Crankshaft */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, -2.5, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 5, 32]} />
        <meshStandardMaterial color="#334155" metalness={1} roughness={0.1} />
      </mesh>
      
      <OrbitControls makeDefault />
    </>
  );
};

const EnginePage = () => {
  return (
    <div className="w-full h-screen bg-[#050810] relative">
      {/* UI Overlay */}
      <div className="absolute top-10 left-10 z-10 pointer-events-none">
        <h1 className="text-6xl font-black italic text-white tracking-tighter">
          V4 <span className="text-indigo-500">3D-CORE</span>
        </h1>
        <p className="text-slate-500 uppercase tracking-[0.4em] text-xs font-bold mt-2">
          Real-time Mechanical Simulation
        </p>
        
        <div className="mt-10 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-slate-300 text-sm">Intake</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-slate-300 text-sm">Compression</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-slate-300 text-sm">Combustion</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-slate-500" />
            <span className="text-slate-300 text-sm">Exhaust</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-10 right-10 z-10 text-slate-500 text-xs uppercase tracking-widest">
        Drag to Rotate • Scroll to Zoom
      </div>

      {/* THE 3D CANVAS */}
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[8, 8, 12]} />
        <EngineScene />
      </Canvas>
    </div>
  );
};

export default EnginePage;
