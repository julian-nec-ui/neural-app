"use client";

import React, { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Settings2, Play, Pause, RotateCcw } from 'lucide-react';

// --- Engineering Constants ---
const STROKE = 1.2; 
const CRANK_RADIUS = STROKE / 2; 
const BASE_HEIGHT = 2; // Lowered for better centering
const ROD_LENGTH = 3.5;
const CYL_SPACING = 2.2;

interface CylinderProps {
  index: number;
  angle: number;
}

const Cylinder = ({ index, angle }: CylinderProps) => {
  const offset = (index === 0 || index === 3) ? 0 : Math.PI;
  const currentAngle = angle + offset;
  const cyclePos = (currentAngle % (Math.PI * 4)); 

  // Piston position
  const yPos = Math.cos(currentAngle) * CRANK_RADIUS + BASE_HEIGHT + 1.5;
  
  // Crank Pin position (The point where the rod meets the crankshaft)
  const pinX = Math.sin(currentAngle) * CRANK_RADIUS;
  const pinY = Math.cos(currentAngle) * CRANK_RADIUS + BASE_HEIGHT;
  const pinZ = 0;

  // Rod Midpoint for positioning the box
  const rodMidX = pinX / 2;
  const rodMidY = (yPos + pinY) / 2;

  const intakeOpen = cyclePos < Math.PI ? 0.4 : 0;
  const exhaustOpen = (cyclePos > Math.PI * 2 && cyclePos < Math.PI * 3) ? 0.4 : 0;
  const isPowerStroke = cyclePos < 0.3;

  return (
    <group position={[index * CYL_SPACING, 0, 0]}>
      {/* Cylinder Sleeve */}
      <mesh position={[0, BASE_HEIGHT + 2, 0]}>
        <cylinderGeometry args={[0.81, 0.81, 3, 32, 1, true]} />
        <meshStandardMaterial color="#444444" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Piston Head */}
      <mesh position={[0, yPos, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 1, 32]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Connecting Rod - Now anchored to the Pin */}
      <mesh 
        position={[rodMidX, rodMidY, 0]} 
        rotation={[0, 0, Math.atan2(pinX, yPos - pinY)]}
      >
        <boxGeometry args={[0.2, ROD_LENGTH, 0.2]} />
        <meshStandardMaterial color="#cc3333" />
      </mesh>

      {/* Valves */}
      <mesh position={[-0.3, 6 - intakeOpen, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 1.2, 16]} />
        <meshStandardMaterial color="#3498db" />
      </mesh>
      <mesh position={[0.3, 6 - exhaustOpen, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 1.2, 16]} />
        <meshStandardMaterial color="#3498db" />
      </mesh>

      {/* Combustion Glow */}
      <mesh position={[0, yPos + 0.5, 0]} visible={isPowerStroke}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#f1c40f" />
      </mesh>
    </group>
  );
};

const EngineShafts = ({ angle }: { angle: number }) => {
  return (
    <group>
      {/* Main Crankshaft Body (The central axle) */}
      <mesh position={[0, BASE_HEIGHT, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, CYL_SPACING * 4, 16]} />
        <meshStandardMaterial color="#aa2222" />
        {/* We rotate the whole cylinder on its X axis to simulate rotation */}
        <primitive object={new THREE.Object3D()} /> 
      </mesh>
      
      {/* Visual rotation for the Crankshaft axial body */}
      <mesh position={[0, BASE_HEIGHT, 0]} rotation={[angle, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, CYL_SPACING * 4, 16]} />
        <meshStandardMaterial color="#aa2222" />
      </mesh>

      {/* The actual Crank Pins (The parts the rods attach to) */}
      {[0, 1, 2, 3].map((i) => {
        const offset = (i === 0 || i === 3) ? 0 : Math.PI;
        return (
          <mesh 
            key={`pin-${i}`} 
            position={[i * CYL_SPACING, BASE_HEIGHT + Math.cos(angle + offset) * CRANK_RADIUS, Math.sin(angle + offset) * CRANK_RADIUS]}
          >
            <cylinderGeometry args={[0.2, 0.2, 0.5, 16]} />
            <meshStandardMaterial color="#880000" />
          </mesh>
        );
      })}

      {/* Camshaft (Blue) - Perfectly aligned above the valves */}
      <mesh position={[0, 6.5, 0]} rotation={[angle / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, CYL_SPACING * 4, 16]} />
        <meshStandardMaterial color="#3498db" />
      </mesh>
    </group>
  );
};

const EngineScene = ({ isPlaying, speed, resetTrigger }: { isPlaying: boolean, speed: number, resetTrigger: number }) => {
  const angleRef = useRef(0);
  const [internalAngle, setInternalAngle] = useState(0);

  useFrame(() => {
    if (isPlaying) {
      angleRef.current += speed;
    }
    setInternalAngle(angleRef.current);
  });

  React.useEffect(() => {
    angleRef.current = 0;
  }, [resetTrigger]);

  return (
    <group position={[- (CYL_SPACING * 2), 0, 0]}>
      <EngineShafts angle={internalAngle} />
      {[0, 1, 2, 3].map((i) => (
        <Cylinder key={i} index={i} angle={internalAngle} />
      ))}
    </group>
  );
};

export default function CombustionPage() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(0.03);
  const [resetTrigger, setResetTrigger] = useState(0);

  return (
    <div className="w-full h-screen bg-zinc-900 flex flex-col relative overflow-hidden">
      <div className="absolute top-6 left-6 z-10 pointer-events-auto">
        <div className="bg-zinc-800/90 backdrop-blur-md p-6 rounded-2xl border border-zinc-700 text-white shadow-2xl w-80">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-bold tracking-tight">Engine Controller</h1>
          </div>
          <div className="space-y-6">
            <div className="flex gap-2">
              <button onClick={() => setIsPlaying(!isPlaying)} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 transition-colors py-2 rounded-lg font-medium">
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                {isPlaying ? 'Pause' : 'Start'}
              </button>
              <button onClick={() => setResetTrigger(prev => prev + 1)} className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors">
                <RotateCcw size={18} />
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400 uppercase font-semibold">
                <span>Rotation Speed</span>
                <span>{Math.round(speed * 1000)} RPM</span>
              </div>
              <input type="range" min="0.01" max="0.1" step="0.01" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-zinc-300"><div className="w-3 h-3 rounded-full bg-blue-500" /> Timing</div>
              <div className="flex items-center gap-2 text-zinc-300"><div className="w-3 h-3 rounded-full bg-red-500" /> Crank</div>
              <div className="flex items-center gap-2 text-zinc-300"><div className="w-3 h-3 rounded-full bg-yellow-400" /> Power</div>
              <div className="flex items-center gap-2 text-zinc-300"><div className="w-3 h-3 rounded-full bg-zinc-400" /> Piston</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[8, 6, 12]} />
          <OrbitControls enableDamping />
          <Environment preset="city" />
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          <EngineScene isPlaying={isPlaying} speed={speed} resetTrigger={resetTrigger} />
          <ContactShadows opacity={0.4} scale={20} blur={2} far={4.5} />
        </Canvas>
      </div>
    </div>
  );
}
