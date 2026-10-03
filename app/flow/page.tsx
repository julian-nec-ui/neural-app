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

// --- CONSTANTS ---
const COLOR_INACTIVE = '#94a3b8'; // slate-400
const COLOR_ACTIVE = '#facc15';   // yellow-400

// --- TYPES ---
interface MergerNodeData {
  label: string;
  activeA: boolean;
  activeB: boolean;
  activeC: boolean;
  toggleHandle: (handleId: string) => void;
}

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

// 2. Triple-Input Node (3-Input AND Gate)
const TripleInputNode = ({ data }: { data: MergerNodeData }) => {
  const { activeA, activeB, activeC, toggleHandle } = data;

  // AND Gate logic: Background changes only if ALL THREE are active
  const bgColor = (activeA && activeB && activeC) ? 'bg-slate-600' : 'bg-slate-800';
  const activeColor = "bg-yellow-400";
  const inactiveColor = "bg-slate-400";

  const inputs = [
    { id: 'input-a', active: activeA, top: '30%' },
    { id: 'input-b', active: activeB, top: '50%' },
    { id: 'input-c', active: activeC, top: '70%' },
  ];

  return (
    <div className={`px-3 py-2 shadow-2xl rounded-lg border border-slate-600 min-w-30 transition-all duration-300 hover:border-slate-400 group ${bgColor}`}>
      
      {inputs.map((input) => (
        <div 
          key={input.id}
          className="absolute -left-1 z-50" 
          style={{ top: input.top }}
          onClick={(e) => {
            e.stopPropagation(); 
            toggleHandle(input.id);
          }}
        >
          <div className={`w-2 h-2 rounded-full cursor-pointer transition-colors duration-200 border border-slate-700 ${input.active ? activeColor : inactiveColor}`} />
          <Handle 
            type="target" 
            position={Position.Left} 
            id={input.id} 
            style={{ top: input.top, opacity: 0 }} 
          />
        </div>
      ))}
      
      <div className="flex flex-col gap-1">
        <div className="h-1 w-8 bg-indigo-500 rounded-full group-hover:bg-indigo-300 transition-colors" />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">AND Gate (3)</span>
          <span className="text-xs font-medium text-slate-200">{data.label}</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-slate-400 border border-slate-700" />
    </div>
  );
};

const nodeTypes = { custom: CustomNode, dualInput: TripleInputNode };

export default function FlowPage() {
  const [activeA, setActiveA] = useState(false);
  const [activeB, setActiveB] = useState(false);
  const [activeC, setActiveC] = useState(false);

  const [nodes, setNodes] = useState<Node[]>([
    { id: 'n1', type: 'custom', data: { label: 'Input A' }, position: { x: 0, y: 0 } },
    { id: 'n2', type: 'custom', data: { label: 'Input B' }, position: { x: 0, y: 100 } },
    { id: 'n3', type: 'custom', data: { label: 'Input C' }, position: { x: 0, y: 200 } },
    { 
      id: 'n4', 
      type: 'dualInput', 
      data: { label: 'Logic Gate', activeA: false, activeB: false, activeC: false, toggleHandle: () => {} }, 
      position: { x: 300, y: 100 } 
    },
    { id: 'n5', type: 'custom', data: { label: 'Final Output' }, position: { x: 600, y: 100 } },
  ]);

  const [edges, setEdges] = useState<Edge[]>([
    { id: 'e1-4', source: 'n1', target: 'n4', targetHandle: 'input-a', type: 'smoothstep', animated: true, style: { stroke: COLOR_INACTIVE, strokeWidth: 3 } },
    { id: 'e2-4', source: 'n2', target: 'n4', targetHandle: 'input-b', type: 'smoothstep', animated: true, style: { stroke: COLOR_INACTIVE, strokeWidth: 3 } },
    { id: 'e3-4', source: 'n3', target: 'n4', targetHandle: 'input-c', type: 'smoothstep', animated: true, style: { stroke: COLOR_INACTIVE, strokeWidth: 3 } },
    { id: 'e4-5', source: 'n4', target: 'n5', type: 'smoothstep', animated: true, style: { stroke: COLOR_INACTIVE, strokeWidth: 3 } },
  ]);

  const handleToggle = useCallback((handleId: string) => {
    const newA = handleId === 'input-a' ? !activeA : activeA;
    const newB = handleId === 'input-b' ? !activeB : activeB;
    const newC = handleId === 'input-c' ? !activeC : activeC;
    
    setActiveA(newA);
    setActiveB(newB);
    setActiveC(newC);

    setEdges((eds) => 
      eds.map((edge) => {
        if (edge.target === 'n4' && edge.targetHandle === handleId) {
          const isActive = (handleId === 'input-a' ? newA : handleId === 'input-b' ? newB : newC);
          return {
            ...edge,
            style: { ...edge.style, stroke: isActive ? COLOR_ACTIVE : COLOR_INACTIVE },
          };
        }
        return edge;
      })
    );

    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === 'n4') {
          return {
            ...node,
            data: { 
              ...node.data, 
              activeA: newA, 
              activeB: newB, 
              activeC: newC, 
              toggleHandle: (hId: string) => handleToggle(hId) 
            },
          };
        }
        return node;
      })
    );
  }, [activeA, activeB, activeC]);

  useState(() => {
    setNodes((nds) => nds.map(n => n.id === 'n4' ? { ...n, data: { ...n.data, toggleHandle: (hId: string) => handleToggle(hId) } } : n));
  }, []);

  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    if (edge.target === 'n4' && (edge.targetHandle === 'input-a' || edge.targetHandle === 'input-b' || edge.targetHandle === 'input-c')) {
      handleToggle(edge.targetHandle as string);
    }
  }, [handleToggle]);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true, style: { stroke: COLOR_INACTIVE, strokeWidth: 3 } }, eds)), []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        style={{ backgroundColor: 'transparent' }}
      />
    </div>
  );
}
