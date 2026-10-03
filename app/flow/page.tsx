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

// --- 1. Types (The Golden Standard: Manual Prop Typing) ---

interface NodeData {
  label: string;
  isActive: boolean;
  toggle: () => void;
}

const THEME = {
  bg: 'bg-[#0f172a]',
  metallic: 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600',
  accent: '#6366f1', // Indigo 500
  inactive: '#475569', // Slate 600
  active: '#facc15',    // Yellow 400
};

// --- 2. Custom Components ---

// Generic Metallic Node that can handle one or multiple target handles
const MetallicNode = ({ data, type }: { data: NodeData; type: 'input' | 'target' }) => {
  return (
    <div className={`
      relative px-5 py-3 rounded-xl border-t border-l border-white/30 
      ${THEME.metallic} 
      shadow-[5px_5px_15px_rgba(0,0,0,0.4),-2px_-2px_10px_rgba(255,255,255,0.1)] 
      transition-all duration-300 hover:scale-105 group cursor-pointer
    `}
    onClick={data.toggle}
    >
      <div className="absolute inset-0 rounded-xl bg-linear-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
      
      <div className="flex flex-col items-center gap-1 relative z-10">
        <span className="text-[9px] font-black text-slate-700 uppercase tracking-tighter opacity-70">
          {type === 'input' ? 'Source' : 'Receiver'}
        </span>
        <span className={`text-sm font-bold transition-colors duration-300 ${data.isActive ? 'text-yellow-600' : 'text-slate-900'}`}>
          {data.label}
        </span>
      </div>

      {/* If it's an input node, it only has a source handle */}
      {type === 'input' && (
        <Handle 
          type="source" 
          position={Position.Right} 
          className={`w-3 h-3 bg-slate-800 border-2 transition-colors duration-300 ${data.isActive ? 'border-yellow-400' : 'border-slate-400'}`} 
        />
      )}

      {/* If it's the target node, it has two distinct target handles */}
      {type === 'target' && (
        <>
          <Handle 
            type="target" 
            position={Position.Left} 
            id="h1" 
            style={{ top: '30%' }} 
            className={`w-3 h-3 bg-slate-800 border-2 transition-colors duration-300 ${data.isActive ? 'border-yellow-400' : 'border-slate-400'}`} 
          />
          <Handle 
            type="target" 
            position={Position.Left} 
            id="h2" 
            style={{ top: '70%' }} 
            className={`w-3 h-3 bg-slate-800 border-2 transition-colors duration-300 ${data.isActive ? 'border-yellow-400' : 'border-slate-400'}`} 
          />
        </>
      )}
    </div>
  );
};

// Wrapper to satisfy React Flow's nodeTypes expectation
const InputNodeWrapper = (props: any) => <MetallicNode {...props} type="input" />;
const TargetNodeWrapper = (props: any) => <MetallicNode {...props} type="target" />;

const nodeTypes = { 
  metallicInput: InputNodeWrapper, 
  metallicTarget: TargetNodeWrapper 
};

export default function MetallicFlowPage() {
  // --- State (The Golden Standard: Lifted State) ---
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

  // --- Derived State (The Golden Standard: No Rendering Loops) ---
  const nodes = useMemo((): Node[] => [
    { 
      id: 'n1', 
      type: 'metallicInput', 
      position: nodesPosition['n1'], 
      data: { label: 'SENS-01', isActive: activeEdges['e1-3'], toggle: () => toggleEdge('e1-3') } 
    },
    { 
      id: 'n2', 
      type: 'metallicInput', 
      position: nodesPosition['n2'], 
      data: { label: 'SENS-02', isActive: activeEdges['e2-3'], toggle: () => toggleEdge('e2-3') } 
    },
    { 
      id: 'n3', 
      type: 'metallicTarget', 
      position: nodesPosition['n3'], 
      // Node 3 is active if either input is active
      data: { label: 'CORE-UNIT', isActive: activeEdges['e1-3'] || activeEdges['e2-3'], toggle: () => {} } 
    },
  ], [activeEdges, nodesPosition, toggleEdge]);

  const edges = useMemo((): Edge[] => [
    { 
      id: 'e1-3', 
      source: 'n1', 
      target: 'n3', 
      targetHandle: 'h1', // <--- Connects to first handle
      animated: true, 
      style: { stroke: activeEdges['e1-3'] ? THEME.active : THEME.inactive, strokeWidth: 3, transition: 'stroke 0.3s' } 
    },
    { 
      id: 'e2-3', 
      source: 'n2', 
      target: 'n3', 
      targetHandle: 'h2', // <--- Connects to second handle
      animated: true, 
      style: { stroke: activeEdges['e2-3'] ? THEME.active : THEME.inactive, strokeWidth: 3, transition: 'stroke 0.3s' } 
    },
  ], [activeEdges]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodesPosition((prev) => {
      const next = { ...prev };
      changes.forEach((change) => {
        if (change.type === 'position') {
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
