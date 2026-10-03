"use client";

import { useState, useCallback } from 'react';
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

// 1. Compact Dark Metallic Node
const CustomNode = ({ data }: { data: { label: string } }) => {
  return (
    <div className="px-3 py-2 shadow-2xl rounded-lg bg-slate-800 border border-slate-600 min-w-30 transition-all hover:border-slate-400 group">
      {/* Handle components */}
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-slate-500! border border-slate-700" />
      
      <div className="flex items-center gap-2">
        {/* Metallic Accent Bar */}
        <div className="w-1 h-6 bg-slate-400 rounded-full group-hover:bg-slate-200 transition-colors" />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Component</span>
          <span className="text-xs font-medium text-slate-200">{data.label}</span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-slate-500! border border-slate-700" />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const initialNodes: Node[] = [
  {
    id: 'n1',
    type: 'custom',
    data: { label: 'Input Source' },
    position: { x: 250, y: 0 },
  },
  {
    id: 'n2',
    type: 'custom',
    data: { label: 'Processing Unit' },
    position: { x: 250, y: 120 },
  },
  {
    id: 'n3',
    type: 'custom',
    data: { label: 'Output Display' },
    position: { x: 250, y: 240 },
  }
];

const initialEdges: Edge[] = [
  { 
    id: 'n1-n2', 
    source: 'n1', 
    target: 'n2', 
    animated: true, 
    style: { stroke: '#94a3b8', strokeWidth: 2 } // Silver/Slate color
  },
  { 
    id: 'n2-n3', 
    source: 'n2', 
    target: 'n3', 
    animated: true, 
    style: { stroke: '#94a3b8', strokeWidth: 2 } 
  },
];

export default function FlowPage() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, []);

  return (
    // Metallic Background: Linear gradient from deep charcoal to slightly lighter charcoal
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' 
    }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        // Style the grid/background dots to be subtle on dark mode
        style={{ backgroundColor: 'transparent' }}
      />
    </div>
  );
}
