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

// 1. Standard Single-Input Node
const CustomNode = ({ data }: { data: { label: string } }) => {
  return (
    <div className="px-3 py-2 shadow-2xl rounded-lg bg-slate-800 border border-slate-600 min-w-30 transition-all hover:border-slate-400 group">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-slate-400! border border-slate-700" 
      />
      <div className="flex flex-col gap-1">
        <div className="h-1 w-8 bg-slate-400 rounded-full group-hover:bg-slate-200 transition-colors" />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Component</span>
          <span className="text-xs font-medium text-slate-200">{data.label}</span>
        </div>
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-slate-400! border border-slate-700" 
      />
    </div>
  );
};

// 2. Dual-Input Node (The new node)
const DualInputNode = ({ data }: { data: { label: string } }) => {
  return (
    <div className="px-3 py-2 shadow-2xl rounded-lg bg-slate-800 border border-slate-600 min-w-30 transition-all hover:border-slate-400 group">
      {/* INPUT 1: Positioned slightly higher */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input-a" 
        style={{ top: '30%' }} 
        className="w-3 h-3 bg-slate-400! border border-slate-700" 
      />
      {/* INPUT 2: Positioned slightly lower */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input-b" 
        style={{ top: '70%' }} 
        className="w-3 h-3 bg-slate-400! border border-slate-700" 
      />
      
      <div className="flex flex-col gap-1">
        <div className="h-1 w-8 bg-indigo-500 rounded-full group-hover:bg-indigo-300 transition-colors" />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Merge Unit</span>
          <span className="text-xs font-medium text-slate-200">{data.label}</span>
        </div>
      </div>

      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-slate-400! border border-slate-700" 
      />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
  dualInput: DualInputNode, // Register the new node type
};

const initialNodes: Node[] = [
  { 
    id: 'n1', 
    type: 'custom', 
    data: { label: 'Input A' }, 
    position: { x: 0, y: 50 } 
  },
  { 
    id: 'n2', 
    type: 'custom', 
    data: { label: 'Input B' }, 
    position: { x: 0, y: 200 } 
  },
  { 
    id: 'n3', 
    type: 'dualInput', // Using the dual input node
    data: { label: 'Merge Processor' }, 
    position: { x: 300, y: 100 } 
  },
  { 
    id: 'n4', 
    type: 'custom', 
    data: { label: 'Final Output' }, 
    position: { x: 600, y: 130 } 
  },
];

const initialEdges: Edge[] = [
  { 
    id: 'e1-3', 
    source: 'n1', 
    target: 'n3', 
    targetHandle: 'input-a', // Connects to the top input
    type: 'smoothstep', 
    animated: true, 
    style: { stroke: '#94a3b8', strokeWidth: 3 } 
  },
  { 
    id: 'e2-3', 
    source: 'n2', 
    target: 'n3', 
    targetHandle: 'input-b', // Connects to the bottom input
    type: 'smoothstep', 
    animated: true, 
    style: { stroke: '#94a3b8', strokeWidth: 3 } 
  },
  { 
    id: 'e3-4', 
    source: 'n3', 
    target: 'n4', 
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
