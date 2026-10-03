"use client";

import { useCallback, useState } from 'react';
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  NodeChange,
  EdgeChange,
  Connection,
  Edge,
  Node,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// --- Visual Constants ---
const THEME = {
  bg: 'bg-[#0f172a]', // Deep slate midnight
  metallic: 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600',
  accent: '#6366f1', // Indigo 500
  glow: 'shadow-[0_0_20px_rgba(99,102,241,0.3)]',
};

interface MetallicNodeData {
  label: string;
}

// --- Custom Metallic Node ---
const MetallicNode = ({ data }: {data: MetallicNodeData}) => {
  return (
    <div className={`
      relative px-5 py-3 rounded-xl border-t border-l border-white/30 
      ${THEME.metallic} 
      shadow-[5px_5px_15px_rgba(0,0,0,0.4),-2px_-2px_10px_rgba(255,255,255,0.1)] 
      transition-all duration-300 hover:scale-105 group
    `}>
      {/* Inner Glow Effect */}
      <div className="absolute inset-0 rounded-xl bg-linear-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
      
      <div className="flex flex-col items-center gap-1 relative z-10">
        <span className="text-[9px] font-black text-slate-700 uppercase tracking-tighter opacity-70">
          Module
        </span>
        <span className="text-sm font-bold text-slate-900 tracking-tight">
          {data.label}
        </span>
      </div>

      {/* Handles with a "socket" look */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-slate-800 border-2 border-slate-400 shadow-inner" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-slate-800 border-2 border-slate-400 shadow-inner" 
      />
    </div>
  );
};

const nodeTypes = {
  metallic: MetallicNode,
};

export default function MetallicFlowPage() {
  // Initial Nodes: 2 Inputs, 1 Output
  const initialNodes: Node[] = [
    { 
      id: 'n1', 
      type: 'metallic', 
      position: { x: 0, y: 0 }, 
      data: { label: 'SENS-01' } 
    },
    { 
      id: 'n2', 
      type: 'metallic', 
      position: { x: 0, y: 150 }, 
      data: { label: 'SENS-02' } 
    },
    { 
      id: 'n3', 
      type: 'metallic', 
      position: { x: 300, y: 75 }, 
      data: { label: 'CORE-UNIT' } 
    },
  ];

  // Initial Edges: n1 -> n3, n2 -> n3
  const initialEdges: Edge[] = [
    { 
      id: 'e1-3', 
      source: 'n1', 
      target: 'n3', 
      animated: true, 
      style: { stroke: THEME.accent, strokeWidth: 3 } 
    },
    { 
      id: 'e2-3', 
      source: 'n2', 
      target: 'n3', 
      animated: true, 
      style: { stroke: THEME.accent, strokeWidth: 3 } 
    },
  ];

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), []);

  return (
    <div className={`w-screen h-screen ${THEME.bg} overflow-hidden`}>
      {/* Background Decorative elements */}
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
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        style={{ backgroundColor: 'transparent' }}
      />
    </div>
  );
}
