"use client";

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';
import * as THREE from 'three';

// --- MECHANICAL PRECISION CONFIG ---
const ENGINE = {
  crankRadius: 1.0,
  rodLength: 3.5,
  pistonRadius: 0.75,
  cylinderRadius: 0.8,
  cylinderHeight: 6,
  rotationSpeed: 1.5,
};

const STAGES = [
  { name: 'INTAKE', color: '#3b82f6', desc: 'Inducting air-fuel mixture' },
  { name: 'COMPRESSION', color: '#eab308', desc: 'Compressing the charge' },
  { name: 'POWER', color: '#ef4444', desc: 'Combustion expansion' },
  { name: 'EXHAUST', color: '#64748b', desc: 'Expelling waste gases' },
];

const EngineCore = ({ onStageUpdate }: { onStageUpdate: (idx: number) => void }) => {
  const pistonRef = useRef<THREE.Group>(null);
  const rodRef = useRef<THREE.Mesh>(null);
  const intakeValveRef = useRef<THREE.Group>(null);
  const exhaustValveRef = useRef<THREE.Group>(null);
  const fireRef = useRef<THREE.Mesh>(null);
  const crankRef = useRef<THREE.Group>(null);
  const lastStage = useRef<number>(-1);

  const mats = useMemo(() => ({
    industrialSteel: new THREE.MeshPhysicalMaterial({ 
      color: '#111111', metalness: 1, roughness: 0.3, clearcoat: 1 
    }),
    polishedChrome: new THREE.MeshPhysicalMaterial({ 
      color: '#ffffff', metalness: 1, roughness: 0, clearcoat: 1 
    }),
    pistonMetal: new THREE.MeshPhysicalMaterial({ 
      color: '#222222', metalness: 0.8, roughness: 0.4 
    }),
  }), []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * ENGINE.rotationSpeed;
    const angle = t;

    if (crankRef.current) crankRef.current.rotation.z = angle;

    const r = ENGINE.crankRadius;
    const L = ENGINE.rodLength;
    const pinX = r * Math.sin(angle);
    const pinY = r * Math.cos(angle);
    const verticalOffset = Math.sqrt(Math.pow(L, 2) - Math.pow(pinX, 2));
    const pistonY = pinY + verticalOffset;

    if (pistonRef.current) pistonRef.current.position.y = pistonY;

    if (rodRef.current) {
      rodRef.current.position.y = (pistonY + pinY) / 2;
      rodRef.current.rotation.z = Math.atan2(pinX, verticalOffset);
    }

    const fullCycle = (angle % (Math.PI * 4));
    const intakeOpen = fullCycle < Math.PI ? Math.sin(fullCycle) * 0.4 : 0;
    const exhaustOpen = fullCycle > Math.PI * 3 ? Math.sin(fullCycle - Math.PI * 3) * 0.4 : 0;

    if (intakeValveRef.current) intakeValveRef.current.position.y = 2.5 - intakeOpen;
    if (exhaustValveRef.current) exhaustValveRef.current.position.y = 2.5 - exhaustOpen;

    const currentIdx = Math.floor((fullCycle / Math.PI) % 4);
    if (currentIdx !== lastStage.current) {
      lastStage.current = currentIdx;
      onStageUpdate(currentIdx);
    }

    if (fireRef.current) {
      const isPower = currentIdx === 2;
      fireRef.current.visible = isPower;
      if (isPower) {
        const pulse = 1 + Math.sin(angle * 10) * 0.1;
        fireRef.current.scale.set(pulse, pulse, pulse);
      }
    }
  });

  return (
    <group>
      {/* THE CUTAWAY CYLINDER: thetaLength = Math.PI * 1.5 (270 degrees) */}
      <mesh position={[0, 2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry 
          args={[
            ENGINE.cylinderRadius + 0.1, 
            ENGINE.cylinderRadius + 0.1, 
            ENGINE.cylinderHeight, 
            32, 1, true, 
            0, Math.PI * 1.5 
          ]} 
        />
        <primitive object={mats.industrialSteel} />
      </mesh>

      {/* VALVES */}
      <group ref={intakeValveRef} position={[-0.3, 2.5, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1, 16]} />
          <primitive object={mats.industrialSteel} />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.04, 16]} />
          <primitive object={mats.polishedChrome} />
        </mesh>
      </group>

      <group ref={exhaustValveRef} position={[0.3, 2.5, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1, 16]} />
          <primitive object={mats.industrialSteel} />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.04, 16]} />
          <primitive object={mats.polishedChrome} />
        </mesh>
      </group>

      {/* PISTON */}
      <group ref={pistonRef}>
        <mesh castShadow>
          <cylinderGeometry args={[ENGINE.pistonRadius, ENGINE.pistonRadius, 1.2, 32]} />
          <primitive object={mats.pistonMetal} />
        </mesh>
        <mesh ref={fireRef} position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial emissive="#ff4400" emissiveIntensity={20} color="#ffaa00" transparent opacity={0.8} />
        </mesh>
      </group>

      {/* ROD */}
      <mesh ref={rodRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, ENGINE.rodLength * 2, 16]} />
        <primitive object={mats.industrialSteel} />
      </mesh>

      {/* CRANKSHAFT */}
      <group ref={crankRef} position={[0, 0, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 2, 32]} />
          <primitive object={mats.industrialSteel} />
        </mesh>
        <group position={[0, ENGINE.crankRadius, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.6, 32]} />
            <primitive object={mats.polishedChrome} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

const EngineSimulation = () => {
  const [currentStage, setCurrentStage] = useState(0);

  return (
    <div className="w-full h-screen bg-[#020202] relative overflow-hidden">
      <div className="absolute top-12 left-12 z-10 pointer-events-none select-none">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-1 w-8 bg-orange-600" />
          <h1 className="text-6xl font-black italic text-white tracking-tighter">
            S-CORE <span className="text-orange-600">X1</span>
          </h1>
        </div>
        <p className="text-slate-500 uppercase tracking-[0.6em] text-[10px] font-bold mt-2">
          Industrial Cutaway Analysis
        </p>
        
        <div className="mt-10 flex flex-col gap-4 bg-black/80 backdrop-blur-2xl p-6 rounded-2xl border border-white/10 w-80 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-bold uppercase">Cycle Phase</span>
            <span className="text-orange-500 font-mono font-bold">{STAGES[currentStage].name}</span>
          </div>
          <div className="h-px bg-white/10 w-full" />
          <p className="text-slate-400 text-xs leading-relaxed font-medium italic">
            "{STAGES[currentStage].desc}"
          </p>
        </div>
      </div>

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[8, 8, 12]} />
        <ambientLight intensity={0.2} />
        <spotLight position={[10, 15, 10]} angle={0.15} penumbra={1} intensity={3} castShadow />
        <pointLight position={[-10, -5, -10]} color="#3b82f6" intensity={0.5} />
        <Environment preset="night" />

        <group position={[0, 0, 0]}>
          <EngineCore onStageUpdate={setCurrentStage} />
        </group>

        <ContactShadows opacity={0.8} scale={10} blur={2} far={10} resolution={256} color="#000" />
        
        <EffectComposer>
          <Bloom intensity={1.5} luminanceThreshold={0.1} mipmapBlur />
          <ToneMapping />
        </EffectComposer>

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};

export default EngineSimulation;
