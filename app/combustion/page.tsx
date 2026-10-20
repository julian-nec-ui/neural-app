"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Float } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// --- CONSTANTS ---
const STROKE_COLORS = {
  intake: '#3b82f6',     // Blue
  compression: '#eab308', // Yellow
  power: '#ef4444',       // Red
  exhaust: '#64748b',     // Grey
};

// --- MECHANICAL COMPONENTS ---

const Cylinder = ({ index, total }: { index: number, total: number }) => {
  const pistonRef = useRef<THREE.Group>(null);
  const rodRef = useRef<THREE.Mesh>(null);
  const intakeValveRef = useRef<THREE.Mesh>(null);
  const exhaustValveRef = useRef<THREE.Mesh>(null);
  const combustionRef = useRef<THREE.Mesh>(null);

  // Offset timing for the firing order (1-3-4-2 sequence)
  const timingOffset = (index * (Math.PI * 2)) / total;

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * 2; // Engine speed
    const angle = t + timingOffset;

    // 1. Piston Position (Sine wave for Up/Down movement)
    const yPos = Math.sin(angle) * 1.5;
    if (pistonRef.current) pistonRef.current.position.y = yPos;

    // 2. Connecting Rod Tilt
    if (rodRef.current) {
      rodRef.current.position.y = yPos / 2;
      rodRef.current.rotation.z = Math.cos(angle) * 0.4;
    }

    // 3. Valve Logic (4-Stroke Cycle)
    // Intake valve opens during Intake stroke
    const intakeOpen = Math.max(0, Math.sin(angle)); 
    // Exhaust valve opens during Exhaust stroke
    const exhaustOpen = Math.max(0, Math.sin(angle + Math.PI));

    if (intakeValveRef.current) intakeValveRef.current.position.y = -intakeOpen * 0.5;
    if (exhaustValveRef.current) exhaustValveRef.current.position.y = -exhaustOpen * 0.5;

    // 4. Combustion Visuals
    const normalized = (Math.sin(angle) + 1) / 2; // Normalize sine to 0-1
    if (combustionRef.current) {
      // Fire happens at the top of the Compression stroke (TDC)
      const isPowerStroke = normalized > 0.8 && normalized < 0.95;
      combustionRef.current.visible = isPowerStroke;
      if (isPowerStroke) {
        const scale = (normalized - 0.8) * 15;
        combustionRef.current.scale.set(scale, scale, scale);
      }
    }
  });

  return (
    <group>
      {/* Valves */}
      <mesh ref={intakeValveRef} position={[-0.3, 2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1, 16]} />
        <meshStandardMaterial color="#888" metalness={1} />
      </mesh>
      <mesh ref={exhaustValveRef} position={[0.3, 2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1, 16]} />
        <meshStandardMaterial color="#888" metalness={1} />
      </mesh>

      {/* Piston Assembly */}
      <group ref={pistonRef}>
        <mesh castShadow>
          <cylinderGeometry args={[0.7, 0.7, 0.8, 32]} />
          <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Combustion Fire */}
        <mesh ref={combustionRef} position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial 
            emissive="#ff4400" 
            emissiveIntensity={15} 
            color="#ffaa00" 
          />
        </mesh>
      </group>

      {/* Connecting Rod */}
      <mesh ref={rodRef} position={[0, -1, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 3, 16]} />
        <meshStandardMaterial color="#444" metalness={1} />
      </mesh>
    </group>
  );
};

const Crankshaft = () => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.x = state.clock.getElapsedTime() * 2;
  });

  return (
    <group ref={ref}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 6, 32]} />
        <meshStandardMaterial color="#222" metalness={1} />
      </mesh>
      {[-2, -1, 1, 2].map((x, i) => (
        <mesh key={i} position={[x, i % 2 === 0 ? 0.8 : -0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.5, 32]} />
          <meshStandardMaterial color="#222" metalness={1} />
        </mesh>
      ))}
    </group>
  );
};

// --- MAIN PAGE ---

const EngineSimulation = () => {
  return (
    <div className="w-full h-screen bg-[#050810] relative overflow-hidden font-sans">
      {/* UI Overlay */}
      <div className="absolute top-10 left-10 z-10 pointer-events-none">
        <h1 className="text-6xl font-black italic text-white tracking-tighter">
          CORE <span className="text-red-600">V4-SIM</span>
        </h1>
        <p className="text-slate-500 uppercase tracking-[0.4em] text-xs font-bold mt-2">
          4-Stroke Combustion Engine
        </p>
        
        <div className="mt-10 flex flex-col gap-3 bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 w-64">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-slate-300 text-xs font-bold uppercase">Intake</span>
          </div >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-slate-300 text-xs font-bold uppercase">Compression</span>
          </div >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-600" />
            <span className="text-slate-300 text-xs font-bold uppercase">Combustion</span>
          </div >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-slate-500" />
            <span className="text-slate-300 text-xs font-bold uppercase">Exhaust</span>
          </div >
        </div >
      </div >

      <div className="absolute bottom-10 right-10 z-10 text-slate-600 text-[10px] uppercase tracking-widest font-bold">
        Mechanical Sync: Active • Timing: 1:2 Ratio
      </div >

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[10, 10, 15]} />
        
        {/* High-end Lighting */}
        <ambientLight intensity={0.4} />
        <spotLight position={[10, 20, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-10, -10, -10]} color="#3b82f6" intensity={1} />
        <Environment preset="city" />

        <group position={[0, 0, 0]}>
          <Crankshaft />
          {[-2, -1, 1, 2].map((x, i) => (
            <group key={i} position={[x, 0, 0]}>
              <Cylinder index={i} total={4} />
            </group>
          ))}
          
          {/* Semi-transparent Engine Block */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[6, 6, 3]} />
            <meshStandardMaterial 
              color="#1e293b" 
              transparent 
              opacity={0.2} 
              metalness={0.8} 
              roughness={0.1} 
            />
          </mesh>
        </group>

        {/* Post-processing for fire glow */}
        <EffectComposer>
          <Bloom 
            intensity={1.5} 
            luminanceThreshold={0.1} 
            mipmapBlur 
          />
        </EffectComposer>

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};

export default EngineSimulation;
