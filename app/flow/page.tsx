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

// 1. Create a Custom Node Component
const CustomNode = ({ data }: { data: { label: string } }) => {
  return (
    <div className="px-4 py-3 shadow-xl rounded-xl bg-white border border-slate-200 min-w-37.5 transition-all hover:border-indigo-500 hover:shadow-indigo-100 group">
      {/* Handle components are REQUIRED for custom nodes to allow connections */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-400! border-2 border-white" />
      
      <div className="flex items-center gap-3">
        <div className="w-2 h-8 bg-indigo-500 rounded-full group-hover:bg-indigo-600 transition-colors" />
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Component</span>
          <span className="text-sm font-semibold text-slate-800">{data.label}</span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-400! border-2 border-white" />
    </div>
  );
};

// 2. Define nodeTypes OUTSIDE the component to prevent re-renders
const nodeTypes = {
  custom: CustomNode,
};

const initialNodes: Node[] = [
  {
    id: 'n1',
    type: 'custom', // Use the custom type here
    data: { label: 'Input Source' },
    position: { x: 250, y: 0 },
  },
  {
    id: 'n2',
    type: 'custom',
    data: { label: 'Processing Unit' },
    position: { x: 250, y: 150 },
  },
  {
    id: 'n3',
    type: 'custom',
    data: { label: 'Output Display' },
    position: { x: 250, y: 300 },
  }
];

const initialEdges: Edge[] = [
  { id: 'n1-n2', source: 'n1', target: 'n2', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } },
  { id: 'n2-n3', source: 'n2', target: 'n3', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } },
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
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#f8fafc' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes} // Pass the custom node types here
        fitView
      />
    </div>
  );
}
