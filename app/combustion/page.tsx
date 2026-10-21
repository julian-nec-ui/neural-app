"use client";

import { useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Settings2, Play, Pause, RotateCcw } from 'lucide-react';

// --- Engineering Constants ---
const STROKE = 1.2; 
const CRANK_RADIUS = STROKE / 2; 
const BASE_HEIGHT = 3;
const ROD_LENGTH = 3.5;
const CYL_SPACING = 2.2;

interface CylinderProps {
  index: number;
  angle: number;
}

// --- Component: Individual Cylinder & Piston Logic ---
const Cylinder = ({ index, angle }: CylinderProps) => {
  // Standard Inline-4 pairing: Pistons 1&4 (0&3) move together, 2&3 (1&2) move together
  const offset = (index === 0 || index === 3) ? 0 : Math.PI;
  const currentAngle = angle + offset;
  
  // A 4-stroke cycle takes 2 full rotations (4 * PI radians)
  const cyclePos = (currentAngle % (Math.PI * 4)); 

  // Piston Y movement: Cosine wave based on crank radius
  const yPos = Math.cos(currentAngle) * CRANK_RADIUS + BASE_HEIGHT;
  
  // Connecting Rod positioning
  const rodX = Math.sin(currentAngle) * CRANK_RADIUS;
  const crankPinY = Math.cos(currentAngle) * CRANK_RADIUS + BASE_HEIGHT;
  const rodY = (yPos + crankPinY) / 2;

  // Valve Timing Logic (Simplified 4-stroke)
  const intakeOpen = cyclePos < Math.PI ? 0.4 : 0; // Open during Intake stroke
  const exhaustOpen = (cyclePos > Math.PI * 2 && cyclePos < Math.PI * 3) ? 0.4 : 0; // Open during Exhaust
  
  // Combustion Glow: Triggered at the very start of the Power Stroke (TDC)
  const isPowerStroke = cyclePos < 0.3;

  return (
    <group position={[index * CYL_SPACING, 0, 0]}>
      {/* Cylinder Sleeve (Semi-transparent wall) */}
      <mesh position={[0, BASE_HEIGHT + 1, 0]}>
        <cylinderGeometry args={[0.81, 0.81, 3, 32, 1, true]} />
        <meshStandardMaterial 
          color="#444444" 
          transparent 
          opacity={0.3} 
          side={THREE.DoubleSide} 
        />
      </mesh>

      {/* Piston Head */}
      <mesh position={[0, yPos, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 1, 32]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Connecting Rod */}
      <mesh position={[rodX, rodY, 0]} rotation={[0, 0, Math.sin(currentAngle) * 0.2]}>
        <boxGeometry args={[0.2, ROD_LENGTH, 0.2]} />
        <meshStandardMaterial color="#cc3333" />
      </mesh>

      {/* Intake Valve */}
      <mesh position={[-0.3, 6 - intakeOpen, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 1.2, 16]} />
        <meshStandardMaterial color="#3498db" />
      </mesh>

      {/* Exhaust Valve */}
      <mesh position={[0.3, 6 - exhaustOpen, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 1.2, 16]} />
        <meshStandardMaterial color="#3498db" />
      </mesh>

      {/* Combustion Glow (Power Stroke) */}
      <mesh position={[0, yPos + 0.5, 0]} visible={isPowerStroke}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#f1c40f" />
      </mesh>
    </group>
  );
};

// --- Component: Crankshaft and Camshaft ---
const EngineShafts = ({ angle }: { angle: number }) => {
  return (
    <group>
      {/* Crankshaft (Red) */}
      <mesh rotation={[angle, 0, 0]} position={[0, BASE_HEIGHT, 0]}>
        <cylinderGeometry args={[0.3, 0.3, CYL_SPACING * 4, 16]} />
        <meshStandardMaterial color="#cc3333" />
      </mesh>
      
      {/* Camshaft (Blue) - Rotates at half speed of the crankshaft */}
      <mesh position={[0, 6.5, 0]} rotation={[angle / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, CYL_SPACING * 4, 16]} />
        <meshStandardMaterial color="#3498db" />
      </mesh>
    </group>
  );
};

// --- Main Page Component ---
export default function CombustionPage() {
  const [angle, setAngle] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(0.03);

  // The useFrame hook handles the animation loop at 60FPS
  useFrame(() => {
    if (isPlaying) {
      setAngle((prev) => prev + speed);
    }
  });

  return (
    <div className="w-full h-screen bg-zinc-900 flex flex-col relative overflow-hidden">
      {/* UI Overlay Panel */}
      <div className="absolute top-6 left-6 z-10 pointer-events-auto">
        <div className="bg-zinc-800/90 backdrop-blur-md p-6 rounded-2xl border border-zinc-700 text-white shadow-2xl w-80">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-bold tracking-tight">Engine Controller</h1>
          </div>

          <div className="space-y-6">
            {/* Playback Controls */}
            <div className="flex gap-2">
              <button 
                onClick={() => setIsPlaying(!isPlaying)} 
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 transition-colors py-2 rounded-lg font-medium"
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                {isPlaying ? 'Pause' : 'Start'}
              </button>
              <button 
                onClick={() => setAngle(0)} 
                className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
              >
                <RotateCcw size={18} />
              </button>
            </div>

            {/* Speed Adjustment */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400 uppercase font-semibold">
                <span>Rotation Speed</span>
                <span>{Math.round(speed * 1000)} RPM</span>
              </div>
              <input 
                type="range" 
                min="0.01" 
                max="0.1" 
                step="0.01" 
                value={speed} 
                onChange={(e) => setSpeed(parseFloat(e.target.value))} 
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500" 
              />
            </div>

            {/* Visual Legend */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <div className="w-3 h-3 rounded-full bg-blue-500" /> Timing
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <div className="w-3 h-3 rounded-full bg-red-500" /> Crank
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <div className="w-3 h-3 rounded-full bg-yellow-400" /> Power
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <div className="w-3 h-3 rounded-full bg-zinc-400" /> Piston
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Viewport */}
      <div className="flex-1">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[8, 6, 12]} />
          <OrbitControls enableDamping />
          
          <Environment preset="city" />
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          
          <group position={[- (CYL_SPACING * 2), 0, 0]}>
            <EngineShafts angle={angle} />
            {[0, 1, 2, 3].map((i) => (
              <Cylinder key={i} index={i} angle={angle} />
            ))}
          </group>
          
          <ContactShadows opacity={0.4} scale={20} blur={2} far={4.5} />
        </Canvas>
      </div>
    </div>
  );
}
