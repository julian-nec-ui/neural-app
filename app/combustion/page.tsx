"use client";

import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// --- MECHANICAL COMPONENTS ---

const CylinderUnit = ({ index, total, rpm }: { index: number, total: number, rpm: number }) => {
  const pistonRef = useRef<THREE.Group>(null);
  const rodRef = useRef<THREE.Mesh>(null);
  const fireLightRef = useRef<THREE.PointLight>(null);
  const fireMeshRef = useRef<THREE.Mesh>(null);
  const valveA_Ref = useRef<THREE.Mesh>(null);
  const valveB_Ref = useRef<THREE.Mesh>(null);

  const offset = (index * (Math.PI * 2)) / total;

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * (rpm / 100);
    const angle = t + offset;

    // 1. Piston Kinematics (Deep travel)
    const yPos = Math.sin(angle) * 1.8;
    if (pistonRef.current) pistonRef.current.position.y = yPos;
    if (rodRef.current) {
      rodRef.current.position.y = yPos / 2;
      rodRef.current.rotation.z = Math.cos(angle) * 0.5;
    }

    // 2. Valve Timing
    const intake = Math.max(0, Math.sin(angle));
    const exhaust = Math.max(0, Math.sin(angle + Math.PI));
    if (valveA_Ref.current) valveA_Ref.current.position.y = -intake * 0.6;
    if (valveB_Ref.current) valveB_Ref.current.position.y = -exhaust * 0.6;

    // 3. THE COMBUSTION EVENT
    const normalized = (Math.sin(angle) + 1) / 2; 
    const isPowerStroke = normalized > 0.85 && normalized < 0.95;

    if (fireMeshRef.current && fireLightRef.current) {
      fireMeshRef.current.visible = isPowerStroke;
      fireLightRef.current.visible = isPowerStroke;
      
      if (isPowerStroke) {
        const intensity = (normalized - 0.85) * 50;
        fireLightRef.current.intensity = intensity * 10;
        const scale = 0.2 + (normalized * 1.5);
        fireMeshRef.current.scale.set(scale, scale, scale);
      }
    }
  });

  return (
    <group>
      {/* Valve stems */}
      <mesh ref={valveA_Ref} position={[-0.4, 2.5, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 1.2, 16]} />
        <meshStandardMaterial color="#555" metalness={1} />
      </mesh>
      <mesh ref={valveB_Ref} position={[0.4, 2.5, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 1.2, 16]} />
        <meshStandardMaterial color="#555" metalness={1} />
      </mesh>

      {/* Piston Body */}
      <group ref={pistonRef}>
        <mesh castShadow>
          <cylinderGeometry args={[0.8, 0.8, 1, 32]} />
          <meshStandardMaterial color="#999" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Combustion Plasma Sphere */}
        <mesh ref={fireMeshRef} position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshStandardMaterial 
            emissive="#ff4400" 
            emissiveIntensity={20} 
            color="#ff8800" 
          />
        </mesh>
        {/* Dynamic Point Light that illuminates the block */}
        <pointLight ref={fireLightRef} color="#ff4400" distance={5} decay={2} />
      </group>

      {/* Rod */}
      <mesh ref={rodRef} position={[0, -1, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 3.5, 16]} />
        <meshStandardMaterial color="#333" metalness={1} roughness={0.5} />
      </mesh>
    </group>
  );
};

const Mechanicals = ({ rpm }: { rpm: number }) => {
  const crankRef = useRef<THREE.Group>(null);
  const camRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const speed = state.clock.getElapsedTime() * (rpm / 100);
    if (crankRef.current) crankRef.current.rotation.x = speed;
    if (camRef.current) camRef.current.rotation.x = speed / 2;
  });

  return (
    <>
      {/* Crankshaft with Counterweights */}
      <group ref={crankRef}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.25, 0.25, 7, 32]} />
          <meshStandardMaterial color="#222" metalness={1} />
        </mesh>
        {[-2, -1, 1, 2].map((x, i) => (
          <group key={i} position={[x, i % 2 === 0 ? 1 : -1, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.3, 0.3, 0.6, 32]} />
              <meshStandardMaterial color="#222" metalness={1} />
            </mesh>
            {/* Counterweight */}
            <mesh position={[0, 0.5, 0]} rotation={[0, 0, 0]}>
              <boxGeometry args={[0.5, 1, 0.5]} />
              <meshStandardMaterial color="#222" metalness={1} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Camshaft with Lobes */}
      <group ref={camRef} position={[0, 4, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 7, 32]} />
          <meshStandardMaterial color="#111" metalness={1} />
        </mesh>
        {[-2, -1, 1, 2].map((x, i) => (
          <mesh key={i} position={[x, 0, 0]}>
            <sphereGeometry args={[0.45, 16, 16]} />
            <meshStandardMaterial color="#111" metalness={1} />
          </mesh>
        ))}
      </group>
    </>
  );
};

// --- MAIN RENDERER ---

const ProEngineSimulation = () => {
  const [rpm, setRpm] = useState(200);
  const cameraRef = useRef<any>(null);

  // Camera Shake Logic
  useFrame((state) => {
    const t = state.clock.getElapsedTime() * (rpm / 100);
    // If any cylinder is hitting power stroke (simplified)
    const shake = Math.sin(t * 4) * 0.02;
    state.camera.position.x += Math.sin(t * 10) * shake;
    state.camera.position.y += Math.cos(t * 10) * shake;
  });

  return (
    <div className="w-full h-screen bg-[#010205] relative overflow-hidden font-sans">
      {/* High-End UI Overlay */}
      <div className="absolute top-12 left-12 z-10 pointer-events-none select-none">
        <div className="flex items-center gap-4 mb-2">
          <div className="h-1 w-12 bg-orange-600" />
          <h1 className="text-7xl font-black italic text-white tracking-tighter">
            V4 <span className="text-orange-600">TITAN</span>
          </h1>
        </div>
        <p className="text-slate-500 uppercase tracking-[0.6em] text-[10px] font-bold ml-1">
          Hyper-Realistic Combustion Core
        </p>
        
        <div className="mt-12 flex flex-col gap-6 bg-black/60 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block mb-4 tracking-widest">Engine Speed (RPM)</span>
            <input 
              type="range" 
              min="50" max="800" 
              value={rpm} 
              onChange={(e) => setRpm(parseInt(e.target.value))}
              className="w-48 accent-orange-600 cursor-pointer"
            />
            <span className="ml-4 text-white font-mono font-bold">{rpm * 10} RPM</span>
          </div >
          
          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
             <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
               <span className="text-slate-400 text-[10px] uppercase font-bold">Intake</span>
             </div >
             <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
               <span className="text-slate-400 text-[10px] uppercase font-bold">Power</span>
             </div >
          </div >
        </div >
      </div >

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[12, 12, 18]} />
        
        <ambientLight intensity={0.2} />
        <spotLight position={[10, 20, 10]} angle={0.2} penumbra={1} intensity={3} castShadow />
        <pointLight position={[-10, 5, -10]} color="#3b82f6" intensity={0.5} />
        <Environment preset="night" />

        <group position={[0, 0, 0]}>
          <Mechanicals rpm={rpm} />
          {[-2, -1, 1, 2].map((x, i) => (
            <group key={i} position={[x, 0, 0]}>
              <CylinderUnit index={i} total={4} rpm={rpm} />
            </group>
          ))}
          
          {/* The Block - Polished Industrial Steel */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[7, 7, 4]} />
            <meshStandardMaterial 
              color="#0a0c12" 
              transparent 
              opacity={0.4} 
              metalness={1} 
              roughness={0.1} 
            />
          </mesh>
        </group>

        <EffectComposer>
          <Bloom 
            intensity={2} 
            luminanceThreshold={0.2} 
            mipmapBlur 
          />
          <ToneMapping />
          <Vignette esC={0.5} offset={0.1} blur={0.5} />
        </EffectComposer>

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};

export default ProEngineSimulation;
