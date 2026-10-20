"use client";

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// --- CONSTANTS ---
const SETTINGS = {
  pistonRadius: 0.6,
  cylinderRadius: 0.7,
  cylinderHeight: 5,
  spacing: 2.5,
  speed: 1.5,
};

const CylinderUnit = ({ index, total }: { index: number, total: number }) => {
  // Strict typing for refs to avoid TS errors
  const pistonRef = useRef<THREE.Group>(null);
  const rodRef = useRef<THREE.Mesh>(null);
  const intakeValveRef = useRef<THREE.Group>(null);
  const exhaustValveRef = useRef<THREE.Group>(null);
  const fireRef = useRef<THREE.Mesh>(null);

  const timingOffset = (index * (Math.PI * 2)) / total;

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * SETTINGS.speed;
    const angle = t + timingOffset;

    // 1. Piston Movement - Null check added
    const yPos = Math.sin(angle) * 1.5;
    if (pistonRef.current) {
      pistonRef.current.position.y = yPos;
    }

    // 2. Rod Movement - Null check added
    if (rodRef.current) {
      rodRef.current.position.y = yPos / 2;
      rodRef.current.rotation.z = Math.cos(angle) * 0.3;
    }

    // 3. Valve Timing - Null check added
    const intakeOpen = Math.max(0, Math.sin(angle));
    const exhaustOpen = Math.max(0, Math.sin(angle + Math.PI));
    if (intakeValveRef.current) intakeValveRef.current.position.y = -intakeOpen * 0.5;
    if (exhaustValveRef.current) exhaustValveRef.current.position.y = -exhaustOpen * 0.5;

    // 4. Combustion Logic - Null check added
    const normalized = (Math.sin(angle) + 1) / 2;
    if (fireRef.current) {
      const isPower = normalized > 0.9 && normalized < 0.98;
      fireRef.current.visible = isPower;
      if (isPower) {
        const s = (normalized - 0.9) * 20;
        fireRef.current.scale.set(s, s, s);
      }
    }
  });

  return (
    <group>
      {/* GLASS CYLINDER SLEEVE */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[SETTINGS.cylinderRadius, SETTINGS.cylinderRadius, SETTINGS.cylinderHeight, 32]} />
        <meshStandardMaterial 
          color="#88ccff" 
          transparent 
          opacity={0.1} 
          metalness={0.1} 
          roughness={0} 
          side={THREE.DoubleSide} 
        />
      </mesh>

      {/* VALVES */}
      <group position={[0, SETTINGS.cylinderHeight / 2, 0]}>
        <group ref={intakeValveRef} position={[-0.2, 0, 0]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 1, 16]} />
            <meshStandardMaterial color="#aaa" metalness={1} />
          </mesh>
          <mesh position={[0, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />
            <meshStandardMaterial color="#aaa" metalness={1} />
          </mesh>
        </group>
        <group ref={exhaustValveRef} position={[0.2, 0, 0]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 1, 16]} />
            <meshStandardMaterial color="#aaa" metalness={1} />
          </mesh>
          <mesh position={[0, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />
            <meshStandardMaterial color="#aaa" metalness={1} />
          </mesh>
        </group>
      </group>

      {/* PISTON */}
      <group ref={pistonRef}>
        <mesh castShadow>
          <cylinderGeometry args={[SETTINGS.pistonRadius, SETTINGS.pistonRadius, 1, 32]} />
          <meshStandardMaterial color="#eee" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh ref={fireRef} position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshStandardMaterial emissive="#ff4400" emissiveIntensity={15} color="#ffaa00" />
        </mesh>
      </group>

      {/* ROD */}
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
    if (ref.current) {
      ref.current.rotation.x = state.clock.getElapsedTime() * SETTINGS.speed;
    }
  });

  return (
    <group ref={ref}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 10, 32]} />
        <meshStandardMaterial color="#222" metalness={1} />
      </mesh>
      {[-SETTINGS.spacing * 1.5, -SETTINGS.spacing / 2, SETTINGS.spacing / 2, SETTINGS.spacing * 1.5].map((x, i) => (
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
    <div className="w-full h-screen bg-[#05070a] relative overflow-hidden">
      <div className="absolute top-10 left-10 z-10 pointer-events-none select-none">
        <h1 className="text-5xl font-black italic text-white tracking-tighter">
          ENGINE <span className="text-blue-500">X-4</span>
        </h1>
        <p className="text-slate-500 uppercase tracking-[0.3em] text-xs font-bold mt-1">
          Clean-View Kinematics
        </p>
      </div >

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[12, 8, 12]} />
        <ambientLight intensity={0.6} />
        <spotLight position={[10, 15, 10]} angle={0.2} penumbra={1} intensity={2} castShadow />
        <Environment preset="studio" />

        <group position={[0, 0, 0]}>
          <Crankshaft />
          {[-SETTINGS.spacing * 1.5, -SETTINGS.spacing / 2, SETTINGS.spacing / 2, SETTINGS.spacing * 1.5].map((x, i) => (
            <group key={i} position={[x, 0, 0]}>
              <CylinderUnit index={i} total={4} />
            </group>
          ))}
        </group>

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
