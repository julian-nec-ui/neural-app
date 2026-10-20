"use client";

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// --- CONFIGURATION ---
const CONFIG = {
  pistonRadius: 0.6,
  cylinderRadius: 0.65,
  strokeHeight: 2.5,
  cylinderHeight: 5,
  firingOrder: [0, 2, 3, 1], // Typical inline-4 order
};

const CylinderUnit = ({ index, total }: { index: number, total: number }) => {
  const pistonRef = useRef<THREE.Group>(null);
  const rodRef = useRef<THREE.Mesh>(null);
  const intakeValveRef = useRef<THREE.Mesh>(null);
  const exhaustValveRef = useRef<THREE.Mesh>(null);
  const combustionRef = useRef<THREE.Mesh>(null);

  // Use the firing order to offset the timing
  const timingOffset = (CONFIG.firingOrder[index] * (Math.PI * 2)) / total;

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * 1.5; 
    const angle = t + timingOffset;

    // 1. Piston Movement
    const yPos = Math.sin(angle) * (CONFIG.strokeHeight / 2);
    if (pistonRef.current) pistonRef.current.position.y = yPos;

    // 2. Connecting Rod Adjustment
    if (rodRef.current) {
      rodRef.current.position.y = yPos / 2;
      rodRef.current.rotation.z = Math.cos(angle) * 0.3;
    }

    // 3. Valves (Precise a-synchronous movement)
    // Intake opens during the first half of the cycle
    const intakeOpen = Math.max(0, Math.sin(angle)); 
    // Exhaust opens during the second half
    const exhaustOpen = Math.max(0, Math.sin(angle + Math.PI));

    if (intakeValveRef.current) intakeValveRef.current.position.y = -intakeOpen * 0.4;
    if (exhaustValveRef.current) exhaustValveRef.current.position.y = -exhaustOpen * 0.4;

    // 4. Combustion Flash (At Top Dead Center)
    const normalized = (Math.sin(angle) + 1) / 2;
    if (combustionRef.current) {
      const isPowerStroke = normalized > 0.92 && normalized < 0.98;
      combustionRef.current.visible = isPowerStroke;
      if (isPowerStroke) {
        const scale = (normalized - 0.92) * 20;
        combustionRef.current.scale.set(scale, scale, scale);
      }
    }
  });

  return (
    <group>
      {/* CYLINDER SLEEVE (The Hollow Tube) */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[CONFIG.cylinderRadius, CONFIG.cylinderRadius, CONFIG.cylinderHeight, 32, 1, true]} />
        <meshStandardMaterial color="#444" metalness={0.9} roughness={0.1} side={THREE.DoubleSide} />
      </mesh>

      {/* VALVES (Positioned strictly at the top) */}
      <group position={[0, CONFIG.cylinderHeight / 2, 0]}>
        {/* Intake Valve */}
        <mesh ref={intakeValveRef} position={[-0.2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.8, 16]} />
          <meshStandardMaterial color="#aaa" metalness={1} />
        </mesh>
        {/* Exhaust Valve */}
        <mesh ref={exhaustValveRef} position={[0.2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.8, 16]} />
          <meshStandardMaterial color="#aaa" metalness={1} />
        </mesh>
      </group>

      {/* PISTON ASSEMBLY */}
      <group ref={pistonRef}>
        <mesh castShadow>
          <cylinderGeometry args={[CONFIG.pistonRadius, CONFIG.pistonRadius, 1, 32]} />
          <meshStandardMaterial color="#ccc" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Combustion Core */}
        <mesh ref={combustionRef} position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshStandardMaterial emissive="#ff4400" emissiveIntensity={10} color="#ffaa00" />
        </mesh>
      </group>

      {/* CONNECTING ROD */}
      <mesh ref={rodRef} position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 3, 16]} />
        <meshStandardMaterial color="#666" metalness={1} />
      </mesh>
    </group>
  );
};

const Crankshaft = () => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.x = state.clock.getElapsedTime() * 1.5;
  });

  return (
    <group ref={ref}>
      {/* Main Axis */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 7, 32]} />
        <meshStandardMaterial color="#222" metalness={1} />
      </mesh>
      {/* Crank Pins */}
      {[-2, -1, 1, 2].map((x, i) => (
        <mesh key={i} position={[x, i % 2 === 0 ? 0.7 : -0.7, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.6, 32]} />
          <meshStandardMaterial color="#222" metalness={1} />
        </mesh>
      ))}
    </group>
  );
};

const EngineSimulation = () => {
  return (
    <div className="w-full h-screen bg-[#0a0c12] relative overflow-hidden">
      {/* CLEAN UI */}
      <div className="absolute top-10 left-10 z-10 pointer-events-none select-none">
        <h1 className="text-5xl font-black italic text-white tracking-tighter">
          ENGINE <span className="text-indigo-500">LAB</span>
        </h1>
        <p className="text-slate-500 uppercase tracking-[0.3em] text-xs font-bold mt-1">
          4-Cylinder Kinematic Study
        </p>
        
        <div className="mt-8 flex flex-col gap-2 bg-white/5 backdrop-blur-lg p-4 rounded-xl border border-white/10 w-56">
          {[ 
            { label: 'Intake', color: 'bg-blue-500' },
            { label: 'Compression', color: 'bg-yellow-500' },
            { label: 'Power', color: 'bg-red-600' },
            { label: 'Exhaust', color: 'bg-slate-500' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-slate-400 text-[10px] font-bold uppercase">{item.label}</span>
            </div>
          ))}
        </div >
      </div >

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[12, 8, 12]} />
        
        {/* Studio Lighting */}
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 15, 10]} angle={0.2} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-10, -10, -10]} color="#4444ff" intensity={0.5} />
        <Environment preset="city" />

        <group position={[0, 0, 0]}>
          <Crankshaft />
          {[-2, -1, 1, 2].map((x, i) => (
            <group key={i} position={[x, 0, 0]}>
              <CylinderUnit index={i} total={4} />
            </group>
          ))}
        </group>

        {/* Floor Shadow for realism */}
        <ContactShadows opacity={0.4} scale={20} blur={2} far={10} resolution={256} color="#000" />

        <EffectComposer>
          <Bloom intensity={1} luminanceThreshold={0.8} mipmapBlur />
        </EffectComposer>

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};

export default EngineSimulation;
