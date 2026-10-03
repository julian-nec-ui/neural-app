"use client";

import {useState, useCallback} from 'react';
import {ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, NodeChange, EdgeChange} from '@xyflow/react';
import { Connection, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  {
    id: 'n1',
    data: { label: 'Node 1' },
    position: { x: 0, y: 0 },
  },
  {
    id: 'n2',
    data: { label: 'Node 2' },
    position: { x: 200, y: 0 },
  },
  {
    id: 'n3',
    data: { label: 'Node 3' },
    position: { x: 400, y: 0 },
  }
]

const initialEdges = [
  { id: 'n1-n2', source: 'n1', target: 'n2' },
  { id: 'n2-n3', source: 'n2', target: 'n3' }
];

export default function FlowPage() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange = useCallback((changes: NodeChange<{ id: string; data: { label: string; }; position: { x: number; y: number; }; }>[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<{ id: string; source: string; target: string; }>[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      baba
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      />
    </div>
  );
}