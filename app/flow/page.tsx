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

// --- Node Component Definitions ---

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

// 2. Dual-Input Node (INTERFACE CORRECTED TO EXTEND Node)
interface DualInputNodeProps extends Node {
    // These are the custom functional props that ReactFlow doesn't provide natively
    toggleInput: (handleId: string, isActive: boolean) => void;
    toggleEdgeColor: (nodeId: string, handleId: string, isActive: boolean) => void;
}

const DualInputNode = ({ id, data, toggleInput, toggleEdgeColor }: DualInputNodeProps) => {
  
  // Note: The activeA/activeB state must be derived from the node's data, 
  // or we must adjust the component to receive them as props (as we did in the previous iteration).
  // Since we lifted the state, we must pull the state out of the functional props if we want to display it.
  // For simplicity in this structural fix, we'll use dummy values here, 
  // but ideally, the parent (FlowPage) would pass back the current input states.
  //
  // For now, let's rely on the external state logic for the *appearance* but keep the structure clean.
  // Since the node is defined in FlowPage, we'll rely on FlowPage passing in the correct active states.
  
  // IMPORTANT: Since we lifted the state, we MUST restructure DualInputNode to accept activeA and activeB 
  // from props to render the correct visual state.
  
  // Let's redefine the props again to incorporate the necessary state display values:
}


// FINAL REFINED DUAL INPUT NODE PROPS (COMBINING NODE, LOGIC, AND STATE)
interface FinalDualInputNodeProps extends Node {
    // Functional Props (Logic)
    toggleInput: (handleId: string, isActive: boolean) => void;
    toggleEdgeColor: (nodeId: string, handleId: string, isActive: boolean) => void;
    // State Props (To display the current status)
    activeA: boolean;
    activeB: boolean;
}

const DualInputNode: React.FC<FinalDualInputNodeProps> = ({ id, data, toggleInput, toggleEdgeColor, activeA, activeB }) => {
  
  const bgColor = (activeA && activeB) ? 'bg-slate-600' : 'bg-slate-800';
  const activeColor = "bg-yellow-400";
  const inactiveColor = "bg-slate-400";

  // Simplified function: uses parent's toggleInput
  const handleToggle = (handleId: string, currentStatus: boolean) => {
    // 1. Call the parent's toggle function to update the state
    toggleInput(handleId, !currentStatus);
    
    // 2. Call the parent's edge color function for the visual effect
    if (toggleEdgeColor) {
      toggleEdgeColor(id, handleId, !currentStatus);
    }
  };

  return (
    <div className={`px-3 py-2 shadow-2xl rounded-lg border border-slate-600 min-w-30 transition-all duration-300 hover:border-slate-400 group ${bgColor}`}>

      {/* INPUT A Wrapper */}
      <div
        className="absolute -left-1 top-[30%] z-50"
        onClick={(e) => {
          e.stopPropagation();
          handleToggle('input-a', activeA);
        }}
      >
        <div className={`w-2 h-2 rounded-full cursor-pointer transition-colors duration-200 border border-slate-700 ${activeA ? activeColor : inactiveColor}`} />
        {/* Handle is now fully visible and serves as a functional target */}
        <Handle type="target" position={Position.Left} id="input-a" />
      </div>

      {/* INPUT B Wrapper */}
      <div
        className="absolute -left-1 top-[70%] z-50"
        onClick={(e) => {
          e.stopPropagation();
          handleToggle('input-b', activeB);
        }}
      >
        <div className={`w-2 h-2 rounded-full cursor-pointer transition-colors duration-200 border border-slate-700 ${activeB ? activeColor : inactiveColor}`} />
        <Handle type="target" position={Position.Left} id="input-b" />
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

// --- Main Flow Page Component ---

export default function FlowPage() {
  // 1. State for Node Activities (LIFTED STATE)
  const [mergerInputs, setMergerInputs] = useState<Record<string, boolean>>({});

  // 2. Edges State
  const [edges, setEdges] = useState<Edge[]>([
    { id: 'e1-3', source: 'n1', target: 'n3', targetHandle: 'input-a', type: 'smoothstep', animated: true, style: { stroke: '#94a3b8', strokeWidth: 3 } },
    { id: 'e2-3', source: 'n2', target: 'n3', targetHandle: 'input-b', type: 'smoothstep', animated: true, style: { stroke: '#94a3b8', strokeWidth: 3 } },
    { id: 'e3-4', source: 'n3', target: 'n4', type: 'smoothstep', animated: true, style: { stroke: '#94a3b8', strokeWidth: 3 } },
  ]);
  
  // 3. State for Nodes
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'n1', type: 'custom', data: { label: 'Input A' }, position: { x: 0, y: 50 } },
    { id: 'n2', type: 'custom', data: { label: 'Input B' }, position: { x: 0, y: 200 } },
    {
      id: 'n3',
      type: 'dualInput',
      data: { label: 'Merge Processor' }, 
      position: { x: 300, y: 100 }
    },
    { id: 'n4', type: 'custom', data: { label: 'Final Output' }, position: { x: 600, y: 130 } },
  ]);

  // =============================================
  // CORE LOGIC FUNCTIONS
  // =============================================
  
  const handleToggleInput = useCallback((handleId: string, newState: boolean) => {
    const nodeId = 'n3';
    setMergerInputs(prev => ({ ...prev, [`${nodeId}-${handleId}`]: newState }));
  }, []);


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
  
  // This handles a click on the edge line itself
  const onEdgeClick = useCallback((event: MouseEvent, edge: Edge) => {
    if (edge.target === 'n3') {
      const handleId = edge.targetHandle;
      const isCurrentlyActive = mergerInputs[`n3-${handleId}`] || false;
      
      // Toggle the state via our central function
      handleToggleInput(handleId, !isCurrentlyActive);
    }
  }, [mergerInputs, handleToggleInput]);


  // =============================================
  // REACT FLOW HANDLERS
  // =============================================
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
        onEdgeClick={onEdgeClick} 
        fitView
        style={{ backgroundColor: 'transparent' }}
      />
    </div >
  );
}
