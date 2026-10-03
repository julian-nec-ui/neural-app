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
  Position, 
  useEdges, 
  ReactFlowProvider 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

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

const DualInputNode = ({ id, data }: { id: string, data: { label: string } }) => {
  const edges = useEdges();
  
  // Manual toggle states
  const [manualA, setManualA] = useState(false);
  const [manualB, setManualB] = useState(false);

  // Reactive states: Active if connected OR manually toggled
  const isConnectedA = edges.some(edge => edge.target === id && edge.targetHandle === 'input-a');
  const isConnectedB = edges.some(edge => edge.target === id && edge.targetHandle === 'input-b');
  
  const activeA = isConnectedA || manualA;
  const activeB = isConnectedB || manualB;

  // Colors
  const edgeColor = "#94a3b8";    // Matches the stroke of the edges
  const inactiveColor = "#475569"; // Slate-600
  const bgColor = (activeA && activeB) ? 'bg-slate-600' : 'bg-slate-800';

  return (
    <div className={`px-3 py-2 shadow-2xl rounded-lg border border-slate-600 min-w-30 transition-all duration-300 hover:border-slate-400 group ${bgColor}`}>
      
      {/* INPUT A INTERACTION ZONE */}
      <div 
        className="absolute -left-1.5 top-[30%] z-50" 
        onClick={(e) => {
          e.stopPropagation(); // Prevents the node from being selected/dragged when clicking handle
          setManualA(!manualA);
        }}
      >
        {/* Visual Circle: Original size (w-3 h-3) */}
        <div 
          className="w-3 h-3 rounded-full cursor-pointer transition-colors duration-200 border border-slate-700" 
          style={{ backgroundColor: activeA ? edgeColor : inactiveColor }}
        />
        {/* Actual Connection Handle: Invisible */}
        <Handle 
          type="target" 
          position={Position.Left} 
          id="input-a" 
          style={{ top: '30%', opacity: 0 }} 
        />
      </div>
      
      {/* INPUT B INTERACTION ZONE */}
      <div 
        className="absolute -left-1.5 top-[70%] z-50" 
        onClick={(e) => {
          e.stopPropagation(); 
          setManualB(!manualB);
        }}
      >
        {/* Visual Circle: Original size (w-3 h-3) */}
        <div 
          className="w-3 h-3 rounded-full cursor-pointer transition-colors duration-200 border border-slate-700" 
          style={{ backgroundColor: activeB ? edgeColor : inactiveColor }}
        />
        {/* Actual Connection Handle: Invisible */}
        <Handle 
          type="target" 
          position={Position.Left} 
          id="input-b" 
          style={{ top: '70%', opacity: 0 }} 
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

const nodeTypes = { custom: CustomNode, dualInput: DualInputNode };

const initialNodes: Node[] = [
  { id: 'n1', type: 'custom', data: { label: 'Input A' }, position: { x: 0, y: 50 } },
  { id: 'n2', type: 'custom', data: { label: 'Input B' }, position: { x: 0, y: 200 } },
  { id: 'n3', type: 'dualInput', data: { label: 'Merge Processor' }, position: { x: 300, y: 100 } },
  { id: 'n4', type: 'custom', data: { label: 'Final Output' }, position: { x: 600, y: 130 } },
];

const initialEdges: Edge[] = [
  { id: 'e1-3', source: 'n1', target: 'n3', targetHandle: 'input-a', type: 'smoothstep', animated: true, style: { stroke: '#94a3b8', strokeWidth: 3 } },
  { id: 'e2-3', source: 'n2', target: 'n3', targetHandle: 'input-b', type: 'smoothstep', animated: true, style: { stroke: '#94a3b8', strokeWidth: 3 } },
  { id: 'e3-4', source: 'n3', target: 'n4', type: 'smoothstep', animated: true, style: { stroke: '#94a3b8', strokeWidth: 3 } },
];

function FlowInner() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

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

export default function FlowPage() {
  return (
    <ReactFlowProvider>
      <FlowInner />
    </ReactFlowProvider>
  );
}
