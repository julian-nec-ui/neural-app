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

// 1. Compact Dark Metallic Node - Optimized for Left-to-Right flow
const CustomNode = ({ data }: { data: { label: string } }) => {
  return (
    <div className="px-3 py-2 shadow-2xl rounded-lg bg-slate-800 border border-slate-600 min-w-30 transition-all hover:border-slate-400 group">
      
      {/* CONNECTION POINT: LEFT side for inputs */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-slate-400! border border-slate-700" 
      />
      
      <div className="flex flex-col gap-1">
        {/* Metallic Accent Bar: Horizontal on top */}
        <div className="h-1 w-8 bg-slate-400 rounded-full group-hover:bg-slate-200 transition-colors" />
        
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Component</span>
          <span className="text-xs font-medium text-slate-200">{data.label}</span>
        </div>
      </div>

      {/* CONNECTION POINT: RIGHT side for outputs */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-slate-400! border border-slate-700" 
      />
    </div>
  );
};

// Define nodeTypes outside the component to prevent unnecessary re-renders
const nodeTypes = {
  custom: CustomNode,
};

// Horizontal Layout: X increases, Y stays same
const initialNodes: Node[] = [
  { 
    id: 'n1', 
    type: 'custom', 
    data: { label: 'Input Source' }, 
    position: { x: 0, y: 100 } 
  },
  { 
    id: 'n2', 
    type: 'custom', 
    data: { label: 'Processing Unit' }, 
    position: { x: 300, y: 100 } 
  },
  { 
    id: 'n3', 
    type: 'custom', 
    data: { label: 'Output Display' }, 
    position: { x: 600, y: 100 } 
  },
];

// Circuit-board style: smoothstep edges, animated, and silver-colored
const initialEdges: Edge[] = [
  { 
    id: 'n1-n2', 
    source: 'n1', 
    target: 'n2', 
    type: 'smoothstep', 
    animated: true, 
    style: { stroke: '#94a3b8', strokeWidth: 3 } 
  },
  { 
    id: 'n2-n3', 
    source: 'n2', 
    target: 'n3', 
    type: 'smoothstep', 
    animated: true, 
    style: { stroke: '#94a3b8', strokeWidth: 3 } 
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
    // FIXED: Directly add the edge with custom styles to avoid unused variables
    setEdges((eds) => 
      addEdge(
        { 
          ...params, 
          type: 'smoothstep', 
          animated: true, 
          style: { stroke: '#94a3b8', strokeWidth: 3 } 
        }, 
        eds
      )
    );
  }, []);

  return (
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
        style={{ backgroundColor: 'transparent' }}
      />
    </div>
  );
}
