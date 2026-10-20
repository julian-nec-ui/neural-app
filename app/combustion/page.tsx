"use client";

import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';
import * as THREE from 'three';

// --- RIGID CONFIGURATION ---
const ENGINE_CONFIG = {
  crankRadius: 1.2,
  rodLength: 3.8,
  pistonRadius: 0.8,
  cylinderRadius: 0.9,
  cylinderHeight: 6,
  rotationSpeed: 1.2,
};

const STAGE_DATA = [
  { name: 'INTAKE', color: '#3b82f6', desc: 'Drawing in air-fuel mixture.' },
  { name: 'COMPRESSION', color: '#eab308', desc: 'Compressing the charge.' },
  { name: 'POWER', color: '#ef4444', desc: 'Combustion forcing piston down.' },
  { name: 'EXHAUST', color: '#64748b', desc: 'Expelling burnt gases.' },
];

// --- MECHANICAL ASSEMBLY ---

interface EngineProps {
  onStageChange: (idx: number) => void;
}

const EngineAssembly: React.FC<EngineProps> = ({ onStageChange }) => {
  const pistonRef = useRef<THREE.Group>(null);
  const rodRef = useRef<THREE.Mesh>(null);
  const intakeValveRef = useRef<THREE.Group>(null);
  const exhaustValveRef = useRef<THREE.Group>(null);
  const fireRef = useRef<THREE.Mesh>(null);
  const crankRef = useRef<THREE.Group>(null);
  const lastStage = useRef<number>(-1);

  const materials = useMemo(() => ({
    darkSteel: new THREE.MeshStandardMaterial({ color: '#111111', metalness: 0.9, roughness: 0.2 }),
    smugMetal: new THREE.MeshStandardMaterial({ color: '#2a2a2a', metalness: 0.8, roughness: 0.3 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#aaaaaa', metalness: 1, roughness: 0.1 }),
    glass: new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.1, roughness: 0 }),
  }), []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * ENGINE_CONFIG.rotationSpeed;
    const angle = t;

    // 1. Crankshaft Rotation
    if (crankRef.current) {
      crankRef.current.rotation.z = angle;
    }

    // 2. Kinematic Piston Position
    const pinX = Math.cos(angle) * ENGINE_CONFIG.crankRadius;
    const pinY = Math.sin(angle) * ENGINE_CONFIG.crankRadius;
    const verticalOffset = Math.sqrt(Math.pow(ENGINE_CONFIG.rodLength, 2) - Math.pow(pinX, 2));
    const pistonY = pinY + verticalOffset;

    if (pistonRef.current) {
      pistonRef.current.position.y = pistonY;
    }

    // 3. Connecting Rod Pendulum
    if (rodRef.current) {
      rodRef.current.position.y = (pistonY + pinY) / 2;
      rodRef.current.rotation.z = Math.atan2(pinX, verticalOffset);
    }

    // 4. 4-Stroke Valve Synchronization (2 rotations per cycle)
    const fullCycle = (angle % (Math.PI * 4));
    const intakeOpen = fullCycle < Math.PI ? Math.sin(fullCycle) * 0.5 : 0;
    const exhaustOpen = fullCycle > Math.PI * 3 ? Math.sin(fullCycle - Math.PI * 3) * 0.5 : 0;

    if (intakeValveRef.current) intakeValveRef.current.position.y = 2.5 - intakeOpen;
    if (exhaustValveRef.current) exhaustValveRef.current.position.y = 2.5 - exhaustOpen;

    // 5. Stage Logic & UI Sync
    const currentIdx = Math.floor((fullCycle / Math.PI) % 4);
    if (currentIdx !== lastStage.current) {
      lastStage.current = currentIdx;
      onStageChange(currentIdx);
    }

    // 6. Combustion Event (Power Stroke)
    if (fireRef.current) {
      const isPower = currentIdx === 2;
      fireRef.current.visible = isPower;
      if (isPower) {
        const pulse = 1 + Math.sin(angle * 5) * 0.1;
        fireRef.current.scale.set(pulse, pulse, pulse);
      }
    }
  });

  return (
    <group>
      {/* CYLINDER SHELL */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[ENGINE_CONFIG.cylinderRadius + 0.1, ENGINE_CONFIG.cylinderRadius + 0.1, ENGINE_CONFIG.cylinderHeight, 32, 1, true]} />
        <primitive object={materials.glass} />
      </mesh>

      {/* INTAKE VALVE */}
      <group ref={intakeValveRef} position={[-0.3, 2.5, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 1, 16]} />
          <primitive object={materials.darkSteel} />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />
          <primitive object={materials.chrome} />
        </mesh>
      </group>

      {/* EXHAUST VALVE */}
      <group ref={exhaustValveRef} position={[0.3, 2.5, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 1, 16]} />
          <primitive object={materials.darkSteel} />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />
          <primitive object={materials.chrome} />
        </mesh>
      </group>

      {/* PISTON ASSEMBLY */}
      <group ref={pistonRef}>
        <mesh castShadow>
          <cylinderGeometry args={[ENGINE_CONFIG.pistonRadius, ENGINE_CONFIG.pistonRadius, 1.2, 32]} />
          <primitive object={materials.smugMetal} />
        </mesh>
        <mesh ref={fireRef} position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshStandardMaterial emissive="#ff4400" emissiveIntensity={15} color="#ffaa00" transparent opacity={0.8} />
        </mesh>
      </group>

      {/* CONNECTING ROD */}
      <mesh ref={rodRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, ENGINE_CONFIG.rodLength * 2, 16]} />
        <primitive object={materials.darkSteel} />
      </mesh>

      {/* CRANKSHAFT */}
      <group ref={crankRef} position={[0, 0, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 2, 32]} />
          <primitive object={materials.darkSteel} />
        </mesh>
        <group position={[0, ENGINE_CONFIG.crankRadius, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.6, 32]} />
            <primitive object={materials.chrome} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// --- MAIN PAGE ---

const EnginePage: React.FC = () => {
  const [currentStage, setCurrentStage] = useState(0);

  return (
    <div className="w-full h-screen bg-[#030303] relative overflow-hidden">
      <div className="absolute top-12 left-12 z-10 pointer-events-none select-none">
        <h1 className="text-6xl font-black italic text-white tracking-tighter">
          S-CORE <span className="text-orange-600">V1</span>
        </h1>
        <p className="text-slate-500 uppercase tracking-[0.5em] text-xs font-bold mt-2">
          Professional Mechanical Simulation
        </p>
        
        <div className="mt-10 flex flex-col gap-4 bg-black/60 backdrop-blur-xl p-6 rounded-2xl border border-white/10 w-72">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-bold uppercase">Current Stage</span>
            <span className="text-orange-500 font-mono font-bold">{STAGE_DATA[currentStage].name}</span>
          </div>
          <div className="h-px bg-white/10 w-full" />
          <p className="text-slate-400 text-xs leading-relaxed">
            {STAGE_DATA[currentStage].desc}
          </p>
        </div>
      </div>

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[8, 8, 12]} />
        <ambientLight intensity={0.3} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-10, -5, -10]} color="#3b82f6" intensity={0.5} />
        <Environment preset="night" />

        <group position={[0, 0, 0]}>
          <EngineAssembly onStageChange={setCurrentStage} />
        </group>

        <ContactShadows opacity={0.6} scale={10} blur={2} far={10} resolution={256} color="#000" />
        
        <EffectComposer>
          <Bloom intensity={1.5} luminanceThreshold={0.1} mipmapBlur />
          <ToneMapping />
        </EffectComposer>

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};

export default EnginePage;
