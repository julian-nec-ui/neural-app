"use client";

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// --- MECHANICAL COMPONENTS ---

const CylinderAssembly = ({ index, total }: { index: number, total: number }) => {
  const pistonRef = useRef<THREE.Group>(null);
  const rodRef = useRef<THREE.Mesh>(null);
  const intakeValveRef = useRef<THREE.Mesh>(null);
  const exhaustValveRef = useRef<THREE.Mesh>(null);
  const fireRef = useRef<THREE.Mesh>(null);

  // Create a unique material for this specific piston's fire
  const fireMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    emissive: '#ff4400',
    emissiveIntensity: 10,
    color: '#ffaa00',
  }), []);

  const offset = (index * (Math.PI * 2)) / total;

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * 2;
    const angle = t + offset;

    // 1. Piston & Rod Kinematics (Null guarded)
    const yPos = Math.sin(angle) * 1.5;
    if (pistonRef.current) {
      pistonRef.current.position.y = yPos;
    }
    if (rodRef.current) {
      rodRef.current.position.y = yPos / 2;
      rodRef.current.rotation.z = Math.cos(angle) * 0.4;
    }

    // 2. Valve Kinematics
    const intakeOpen = Math.max(0, Math.sin(angle)); 
    const exhaustOpen = Math.max(0, Math.sin(angle + Math.PI));

    if (intakeValveRef.current) intakeValveRef.current.position.y = -intakeOpen * 0.5;
    if (exhaustValveRef.current) exhaustValveRef.current.position.y = -exhaustOpen * 0.5;

    // 3. Combustion Logic
    const normalized = (Math.sin(angle) + 1) / 2; // 0 to 1
    if (fireRef.current) {
      const isPowerStroke = normalized > 0.7 && normalized < 0.9;
      fireRef.current.visible = isPowerStroke;
      if (isPowerStroke) {
        const scale = (normalized - 0.7) * 10;
        fireRef.current.scale.set(scale, scale, scale);
      }
    }
  });

  return (
    <group>
      {/* Valves */}
      <mesh ref={intakeValveRef} position={[-0.3, 2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1, 16]} />
        <meshStandardMaterial color="#a1a1aa" metalness={1} />
      </mesh>
      <mesh ref={exhaustValveRef} position={[0.3, 2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1, 16]} />
        <meshStandardMaterial color="#a1a1aa" metalness={1} />
      </mesh>

      {/* Piston */}
      <group ref={pistonRef}>
        <mesh castShadow>
          <cylinderGeometry args={[0.7, 0.7, 0.8, 32]} />
          <meshStandardMaterial color="#d1d5db" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Fire Sphere */}
        <mesh ref={fireRef} position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <primitive object={fireMaterial} />
        </mesh>
      </group>

      {/* Piston Rod */}
      <mesh ref={rodRef} position={[0, -1, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 3, 16]} />
        <meshStandardMaterial color="#4b5563" metalness={1} />
      </mesh>
    </group>
  );
};

const Crankshaft = () => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.getElapsedTime() * 2;
    }
  });

  return (
    <group ref={ref}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 6, 32]} />
        <meshStandardMaterial color="#334155" metalness={1} />
      </mesh>
      {[-2, -1, 1, 2].map((x, i) => (
        <mesh key={i} position={[x, i % 2 === 0 ? 0.8 : -0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.5, 32]} />
          <meshStandardMaterial color="#334155" metalness={1} />
        </mesh>
      ))}
    </group>
  );
};

const Camshaft = () => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = (state.clock.getElapsedTime() * 2) / 2;
    }
  });

  return (
    <group ref={ref} position={[0, 3, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.15, 6, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={1} />
      </mesh>
      {[-2, -1, 1, 2].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color="#1e293b" metalness={1} />
        </mesh>
      ))}
    </group>
  );
};

// --- MAIN PAGE ---

const EngineSimulation = () => {
  return (
    <div className="w-full h-screen bg-[#02040a] relative overflow-hidden">
      {/* UI OVERLAY */}
      <div className="absolute top-12 left-12 z-10 pointer-events-none">
        <h1 className="text-7xl font-black italic text-white tracking-tighter">
          CORE <span className="text-orange-600">V4-MAX</span>
        </h1>
        <p className="text-slate-500 uppercase tracking-[0.5em] text-xs font-bold mt-2">
          High-Torque Mechanical Kinematics
        </p>
        
        <div className="mt-12 flex flex-col gap-4 bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-slate-300 text-xs font-bold uppercase">Intake Sequence</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-slate-300 text-xs font-bold uppercase">Compression Phase</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="text-slate-300 text-xs font-bold uppercase">Combustion Event</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
            <span className="text-slate-300 text-xs font-bold uppercase">Exhaust Purge</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 right-12 z-10 text-slate-600 text-[10px] uppercase tracking-widest font-bold">
        Mechanical Linkage: Active • RPM: 2400 • Heat: Optimized
      </div>

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[10, 10, 15]} />
        <ambientLight intensity={0.4} />
        <spotLight position={[10, 20, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-10, -10, -10]} color="#3b82f6" intensity={1} />
        <Environment preset="city" />

        <group position={[0, 0, 0]}>
          <Crankshaft />
          <Camshaft />
          {[-2, -1, 1, 2].map((x, i) => (
            <group key={i} position={[x, 0, 0]}>
              <CylinderAssembly index={i} total={4} />
            </group>
          ))}
          
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[6, 6, 3]} />
            <meshStandardMaterial 
              color="#0f172a" 
              transparent 
              opacity={0.2} 
              metalness={0.8} 
              roughness={0.2} 
            />
          </mesh>
        </group>

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
