"use client";

import { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  NodeChange,
  Edge,
  Node,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// --- 1. Type Definitions ---

interface MetallicNodeData {
  label: string;
  isActive: boolean;
  toggle: () => void;
  nodeType: 'input' | 'target';
}

// We define a custom Prop type that is "looser" than NodeProps.
// This prevents the "Property width is optional but required" error.
interface MetallicNodeProps {
  id: string;
  data: any; // We will cast this inside the component for safety
  selected?: boolean;
  isConnectable?: boolean;
}

const THEME = {
  bg: 'bg-[#0f172a]',
  metallic: 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600',
  accent: '#6366f1', 
  inactive: '#475569', 
  active: '#facc15',    
};

// --- 2. Custom Component ---

const MetallicNode = ({ data, selected }: MetallicNodeProps) => {
  // Golden Standard: Type casting inside the component to avoid 'unknown' errors
  const nodeData = data as MetallicNodeData;
  
  if (!nodeData) return null;

  return (
    <div className={`
      relative px-5 py-3 rounded-xl border-t border-l border-white/30 
      ${THEME.metallic} 
      ${selected ? 'ring-2 ring-indigo-500' : ''}
      shadow-[5px_5px_15px_rgba(0,0,0,0.4),-2px_-2px_10px_rgba(255,255,255,0.1)] 
      transition-all duration-300 hover:scale-105 group cursor-pointer
    `}
    onClick={nodeData.toggle}
    >
      <div className="absolute inset-0 rounded-xl bg-linear-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
      
      <div className="flex flex-col items-center gap-1 relative z-10">
        <span className="text-[9px] font-black text-slate-700 uppercase tracking-tighter opacity-70">
          {nodeData.nodeType === 'input' ? 'Source' : 'Receiver'}
        </span>
        <span className={`text-sm font-bold transition-colors duration-300 ${nodeData.isActive ? 'text-yellow-600' : 'text-slate-900'}`}>
          {nodeData.label}
        </span>
      </div>

      {nodeData.nodeType === 'input' && (
        <Handle 
          type="source" 
          position={Position.Right} 
          className={`w-3 h-3 bg-slate-800 border-2 transition-colors duration-300 ${nodeData.isActive ? 'border-yellow-400' : 'border-slate-400'}`} 
        />
      )}

      {nodeData.nodeType === 'target' && (
        <>
          <Handle 
            type="target" 
            position={Position.Left} 
            id="h1" 
            style={{ top: '30%' }} 
            className={`w-3 h-3 bg-slate-800 border-2 transition-colors duration-300 ${nodeData.isActive ? 'border-yellow-400' : 'border-slate-400'}`} 
          />
          <Handle 
            type="target" 
            position={Position.Left} 
            id="h2" 
            style={{ top: '70%' }} 
            className={`w-3 h-3 bg-slate-800 border-2 transition-colors duration-300 ${nodeData.isActive ? 'border-yellow-400' : 'border-slate-400'}`} 
          />
        </>
      )}
    </div>
  );
};

// This mapping is now clean and compatible with NodeTypes
const nodeTypes = { 
  metallic: MetallicNode 
};

export default function MetallicFlowPage() {
  // --- State ---
  const [activeEdges, setActiveEdges] = useState<Record<string, boolean>>({
    'e1-3': false,
    'e2-3': false,
  });

  const [nodesPosition, setNodesPosition] = useState<Record<string, { x: number, y: number }>>({
    'n1': { x: 0, y: 0 },
    'n2': { x: 0, y: 150 },
    'n3': { x: 300, y: 75 },
  });

  const toggleEdge = useCallback((edgeId: string) => {
    setActiveEdges((prev) => ({ ...prev, [edgeId]: !prev[edgeId] }));
  }, []);

  // --- Derived State (The Golden Standard) ---
  const nodes = useMemo((): Node[] => [
    { 
      id: 'n1', 
      type: 'metallic', 
      position: nodesPosition['n1'], 
      data: { label: 'SENS-01', isActive: activeEdges['e1-3'], toggle: () => toggleEdge('e1-3'), nodeType: 'input' as const } 
    },
    { 
      id: 'n2', 
      type: 'metallic', 
      position: nodesPosition['n2'], 
      data: { label: 'SENS-02', isActive: activeEdges['e2-3'], toggle: () => toggleEdge('e2-3'), nodeType: 'input' as const } 
    },
    { 
      id: 'n3', 
      type: 'metallic', 
      position: nodesPosition['n3'], 
      data: { label: 'CORE-UNIT', isActive: activeEdges['e1-3'] || activeEdges['e2-3'], toggle: () => {}, nodeType: 'target' as const } 
    },
  ], [activeEdges, nodesPosition, toggleEdge]);

  const edges = useMemo((): Edge[] => [
    { 
      id: 'e1-3', 
      source: 'n1', 
      target: 'n3', 
      targetHandle: 'h1', 
      animated: true, 
      style: { stroke: activeEdges['e1-3'] ? THEME.active : THEME.inactive, strokeWidth: 3, transition: 'stroke 0.3s' } 
    },
    { 
      id: 'e2-3', 
      source: 'n2', 
      target: 'n3', 
      targetHandle: 'h2', 
      animated: true, 
      style: { stroke: activeEdges['e2-3'] ? THEME.active : THEME.inactive, strokeWidth: 3, transition: 'stroke 0.3s' } 
    },
  ], [activeEdges]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodesPosition((prev) => {
      const next = { ...prev };
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          next[change.id] = { x: change.position.x, y: change.position.y };
        }
      });
      return next;
    });
  }, []);

  return (
    <div className={`w-screen h-screen ${THEME.bg} overflow-hidden`}>
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      
      <div className="absolute top-10 left-10 z-10 select-none">
        <h1 className="text-white text-2xl font-black tracking-tighter italic opacity-80">
          METALLIC<span className="text-indigo-500">FLOW</span>
        </h1>
        <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold">
          Industrial Interface v1.0
        </p>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={() => {}}
        onConnect={() => {}}
        nodeTypes={nodeTypes}
        fitView
        style={{ backgroundColor: 'transparent' }}
      />
    </div>
  );
}
