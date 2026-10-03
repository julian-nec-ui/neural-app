"use client";

import { useState, useCallback, useMemo } from 'react';
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

// 2. Dual-Input Node (Now a "Controlled" component)
const DualInputNode = ({ id, data }: { id: string, data: any }) => {
  // State is now passed in via data from the parent
  const { activeA, activeB, toggleHandle } = data;

  const bgColor = (activeA && activeB) ? 'bg-slate-600' : 'bg-slate-800';
  const activeColor = "bg-yellow-400";
  const inactiveColor = "bg-slate-400";

  return (
    <div className={`px-3 py-2 shadow-2xl rounded-lg border border-slate-600 min-w-30 transition-all duration-300 hover:border-slate-400 group ${bgColor}`}>
      
      {/* INPUT A */}
      <div 
        className="absolute -left-1 top-[30%] z-50" 
        onClick={(e) => {
          e.stopPropagation(); 
          toggleHandle('input-a');
        }}
      >
        <div className={`w-2 h-2 rounded-full cursor-pointer transition-colors duration-200 border border-slate-700 ${activeA ? activeColor : inactiveColor}`} />
        <Handle type="target" position={Position.Left} id="input-a" style={{ top: '30%', opacity: 0 }} />
      </div>
      
      {/* INPUT B */}
      <div 
        className="absolute -left-1 top-[70%] z-50" 
        onClick={(e) => {
          e.stopPropagation(); 
          toggleHandle('input-b');
        }}
      >
        <div className={`w-2 h-2 rounded-full cursor-pointer transition-colors duration-200 border border-slate-700 ${activeB ? activeColor : inactiveColor}`} />
        <Handle type="target" position={Position.Left} id="input-b" style={{ top: '70%', opacity: 0 }} />
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

const nodeTypes = { custom: CustomNode, dualInput: DualInputNode };

export default function FlowPage() {
  // LIFTED STATE: The parent now tracks if the merger inputs are active
  const [activeA, setActiveA] = useState(false);
  const [activeB, setActiveB] = useState(false);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([
    { id: 'e1-3', source: 'n1', target: 'n3', targetHandle: 'input-a', type: 'smoothstep', animated: true, style: { stroke: COLOR_INACTIVE, strokeWidth: 3 } },
    { id: 'e2-3', source: 'n2', target: 'n3', targetHandle: 'input-b', type: 'smoothstep', animated: true, style: { stroke: COLOR_INACTIVE, strokeWidth: 3 } },
    { id: 'e3-4', source: 'n3', target: 'n4', type: 'smoothstep', animated: true, style: { stroke: COLOR_INACTIVE, strokeWidth: 3 } },
  ]);

  // Function to synchronize Node state and Edge colors
  const handleToggle = useCallback((handleId: string) => {
    setEdges((eds) => 
      eds.map((edge) => {
        if (edge.target === 'n3' && edge.targetHandle === handleId) {
          // Determine new state based on current handle state
          const isCurrentlyActive = handleId === 'input-a' ? activeA : activeB;
          const nextState = !isCurrentlyActive;

          return {
            ...edge,
            style: { ...edge.style, stroke: nextState ? COLOR_ACTIVE : COLOR_INACTIVE },
          };
        }
        return edge;
      })
    );

    // Update the boolean states
    if (handleId === 'input-a') setActiveA(!activeA);
    if (handleId === 'input-b') setActiveB(!activeB);
  }, [activeA, activeB]);

  // Update the nodes array whenever the active states change so the DualInputNode re-renders
  useMemo(() => {
    setNodes([
      { id: 'n1', type: 'custom', data: { label: 'Input A' }, position: { x: 0, y: 50 } },
      { id: 'n2', type: 'custom', data: { label: 'Input B' }, position: { x: 0, y: 200 } },
      { 
        id: 'n3', 
        type: 'dualInput', 
        data: { 
          label: 'Merge Processor', 
          activeA, 
          activeB, 
          toggleHandle: handleToggle 
        }, 
        position: { x: 300, y: 100 } 
      },
      { id: 'n4', type: 'custom', data: { label: 'Final Output' }, position: { x: 600, y: 130 } },
    ]);
  }, [activeA, activeB, handleToggle]);

  // TRIGGER: When an edge is clicked
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    // Only trigger if the edge connects to the merger node (n3)
    if (edge.target === 'n3' && (edge.targetHandle === 'input-a' || edge.targetHandle === 'input-b')) {
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
        onEdgeClick={onEdgeClick} // Added edge click listener
        nodeTypes={nodeTypes}
        fitView
        style={{ backgroundColor: 'transparent' }}
      />
    </div>
  );
}
