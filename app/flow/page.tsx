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
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-slate-400 border border-slate-700" />
      <div className="flex flex-col gap-1">
        <div className="h-1 w-8 bg-slate-400 rounded-full group-hover:bg-slate-200 transition-colors" />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Component</span>
          <span className="text-xs font-medium text-slate-200">{data.label}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-slate-400 border border-slate-700" />
    </div>
  );
};

// 2. Dual-Input Node (FIXED FOR CLICK SYNCHRONIZATION)
const DualInputNode = ({ id, data }: { id: string, data: { label: string, toggleEdgeColor?: (nodeId: string, handleId: string, isActive: boolean) => void } }) => {
  const [activeA, setActiveA] = useState(false);
  const [activeB, setActiveB] = useState(false);

  const bgColor = (activeA && activeB) ? 'bg-slate-600' : 'bg-slate-800';
  const activeColor = "bg-yellow-400";
  const inactiveColor = "bg-slate-400";

  // Function to handle the click: Toggles local state AND notifies parent to change edge color
  const handleToggle = (handleId: string, currentStatus: boolean, setter: (val: boolean) => void) => {
    setter(!currentStatus);
    if (data.toggleEdgeColor) {
      data.toggleEdgeColor(id, handleId, !currentStatus);
    }
  };

  return (
    <div className={`px-3 py-2 shadow-2xl rounded-lg border border-slate-600 min-w-30 transition-all duration-300 hover:border-slate-400 group ${bgColor}`}>

      {/* INPUT A Wrapper */}
      <div
        className="absolute -left-1 top-[30%] z-50"
        // This wrapper's onClick will capture clicks on the visual dot AND the handle area
        onClick={(e) => {
          e.stopPropagation();
          handleToggle('input-a', activeA, setActiveA);
        }}
      >
        {/* Visual indicator circle (The part the user sees/clicks) */}
        <div className={`w-2 h-2 rounded-full cursor-pointer transition-colors duration-200 border border-slate-700 ${activeA ? activeColor : inactiveColor}`} />
        
        {/* ReactFlow Handle. We remove opacity: 0 and rely on the parent's click handler. */}
        <Handle 
            type="target" 
            position={Position.Left} 
            id="input-a" 
            // Use inline style to ensure vertical alignment, but remove opacity: 0
            style={{ top: '30%' }} 
        />
      </div>

      {/* INPUT B Wrapper */}
      <div
        className="absolute -left-1 top-[70%] z-50"
        onClick={(e) => {
          e.stopPropagation();
          handleToggle('input-b', activeB, setActiveB);
        }}
      >
        {/* Visual indicator circle */}
        <div className={`w-2 h-2 rounded-full cursor-pointer transition-colors duration-200 border border-slate-700 ${activeB ? activeColor : inactiveColor}`} />
        
        {/* ReactFlow Handle. We remove opacity: 0 and rely on the parent's click handler. */}
        <Handle 
            type="target" 
            position={Position.Left} 
            id="input-b" 
            // Use inline style to ensure vertical alignment, but remove opacity: 0
            style={{ top: '70%' }} 
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="h-1 w-8 bg-indigo-500 rounded-full group-hover:bg-indigo-300 transition-colors" />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Merge Unit</span>
          <span className="text-xs font-medium text-slate-200">{data.label}</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-slate-400 border border-slate-700" />
    </div>
  );
};


const nodeTypes = {
  custom: CustomNode,
  dualInput: DualInputNode,
};

export default function FlowPage() {
  const [edges, setEdges] = useState<Edge[]>([
    { id: 'e1-3', source: 'n1', target: 'n3', targetHandle: 'input-a', type: 'smoothstep', animated: true, style: { stroke: '#94a3b8', strokeWidth: 3 } },
    { id: 'e2-3', source: 'n2', target: 'n3', targetHandle: 'input-b', type: 'smoothstep', animated: true, style: { stroke: '#94a3b8', strokeWidth: 3 } },
    { id: 'e3-4', source: 'n3', target: 'n4', type: 'smoothstep', animated: true, style: { stroke: '#94a3b8', strokeWidth: 3 } },
  ]);
  
  // This function is passed into the Merger Node to allow it to update edge colors
  const toggleEdgeColor = useCallback((nodeId: string, handleId: string, isActive: boolean) => {
    setEdges((eds) => {
      return eds.map((edge) => {
        if (edge.target === nodeId && edge.targetHandle === handleId) {
          return {
            ...edge,
            style: {
              ...edge.style,
              stroke: isActive ? '#facc15' : '#94a3b8' // Yellow-400 vs Slate-400
            },
          };
        }
        return edge;
      });
    });
  }, []);

  // Initialize nodes directly in useState - no useEffect needed
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'n1', type: 'custom', data: { label: 'Input A' }, position: { x: 0, y: 50 } },
    { id: 'n2', type: 'custom', data: { label: 'Input B' }, position: { x: 0, y: 200 } },
    {
      id: 'n3',
      type: 'dualInput',
      data: { label: 'Merge Processor', toggleEdgeColor },
      position: { x: 300, y: 100 }
    },
    { id: 'n4', type: 'custom', data: { label: 'Final Output' }, position: { x: 600, y: 130 } },
  ]);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true, style: { stroke: '#94a3b8', strokeWidth: 3 } }, eds)), []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
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
