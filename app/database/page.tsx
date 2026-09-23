// app/database-visualizer/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MiniMap,
  Node,
  Edge,
  Panel,
  ReactFlowProvider,
  getBezierPath,
  Position,
  Handle,
  NodeProps,
  EdgeProps
} from 'reactflow';
import 'reactflow/dist/style.css';
import React from 'react';

// --- Types ---
type FieldType = {
  id: string;
  name: string;
  type: string;
  isPrimary: boolean;
  isNullable: boolean;
};

type Table = {
  id: string;
  name: string;
  schema: string;
  fields: FieldType[];
};

type RelationType = '1:1' | '1:N' | 'N:1' | 'M:M';

type Relationship = {
  id: string;
  sourceTableId: string;
  targetTableId: string;
  sourceFieldId: string;
  targetFieldId: string;
  type: RelationType;
};

type FolderNode = {
  id: string;
  name: string;
  type: 'folder' | 'table';
  children?: string[];
  expanded?: boolean;
};

interface DatabaseIconProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

// --- UI Components ---

const ModernDatabaseStackIcon: React.FC<DatabaseIconProps> = ({
  width = 100,
  height = 100,
  className = '',
}) => {
  return (
    <svg width={width} height={height} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="metalBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4A5568" />
          <stop offset="40%" stopColor="#718096" />
          <stop offset="50%" stopColor="#EDF2F7" />
          <stop offset="60%" stopColor="#718096" />
          <stop offset="100%" stopColor="#2D3748" />
        </linearGradient>
        <linearGradient id="metalHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#4A5568" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00F2FE" />
          <stop offset="100%" stopColor="#4FACFE" />
        </linearGradient>
        <linearGradient id="neonPink" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF0844" />
          <stop offset="100%" stopColor="#FFB199" />
        </linearGradient>
        <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.4" />
        </filter>
        <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <g filter="url(#dropShadow)">
        <path d="M20 50 C 20 25, 180 25, 180 50 L 180 75 C 180 100, 20 100, 20 75 Z" fill="url(#metalBody)" stroke="url(#metalHighlight)" strokeWidth="1.5" />
        <ellipse cx="100" cy="50" rx="80" ry="25" fill="none" stroke="url(#neonCyan)" strokeWidth="1.5" opacity="0.4" />
        <path d="M20 90 C 20 65, 180 65, 180 90 L 180 115 C 180 140, 20 140, 20 115 Z" fill="url(#metalBody)" stroke="url(#metalHighlight)" strokeWidth="1.5" />
        <path d="M20 130 C 20 105, 180 105, 180 130 L 180 155 C 180 180, 20 180, 20 155 Z" fill="url(#metalBody)" stroke="url(#metalHighlight)" strokeWidth="1.5" />
      </g>
      <g filter="url(#cyanGlow)">
        <path d="M 45 62 Q 100 77 155 62" stroke="url(#neonCyan)" strokeWidth="3" strokeLinecap="round" />
        <path d="M 45 102 Q 100 117 155 102" stroke="url(#neonCyan)" strokeWidth="3" strokeLinecap="round" />
        <path d="M 45 142 Q 100 157 155 142" stroke="url(#neonCyan)" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
};

// --- Mock Data ---
const mockTables: Table[] = [
  { id: '1', name: 'users', schema: 'public', fields: [{ id: 'f1', name: 'id', type: 'integer', isPrimary: true, isNullable: false }, { id: 'f2', name: 'username', type: 'varchar(50)', isPrimary: false, isNullable: false }, { id: 'f3', name: 'email', type: 'varchar(100)', isPrimary: false, isNullable: false }, { id: 'f4', name: 'created_at', type: 'timestamp', isPrimary: false, isNullable: true }] },
  { id: '2', name: 'orders', schema: 'public', fields: [{ id: 'f5', name: 'id', type: 'integer', isPrimary: true, isNullable: false }, { id: 'f6', name: 'user_id', type: 'integer', isPrimary: false, isNullable: false }, { id: 'f7', name: 'amount', type: 'decimal(10,2)', isPrimary: false, isNullable: true }, { id: 'f8', name: 'order_date', type: 'date', isPrimary: false, isNullable: true }] },
  { id: '3', name: 'products', schema: 'public', fields: [{ id: 'f9', name: 'id', type: 'integer', isPrimary: true, isNullable: false }, { id: 'f10', name: 'name', type: 'varchar(100)', isPrimary: false, isNullable: false }, { id: 'f11', name: 'price', type: 'decimal(10,2)', isPrimary: false, isNullable: true }, { id: 'f12', name: 'category_id', type: 'integer', isPrimary: false, isNullable: true }] },
  { id: '4', name: 'categories', schema: 'public', fields: [{ id: 'f13', name: 'id', type: 'integer', isPrimary: true, isNullable: false }, { id: 'f14', name: 'name', type: 'varchar(50)', isPrimary: false, isNullable: false }] },
  { id: '5', name: 'order_items', schema: 'public', fields: [{ id: 'f15', name: 'order_id', type: 'integer', isPrimary: true, isNullable: false }, { id: 'f16', name: 'product_id', type: 'integer', isPrimary: true, isNullable: false }, { id: 'f17', name: 'quantity', type: 'integer', isPrimary: false, isNullable: false }] },
  { id: '6', name: 'user_profiles', schema: 'public', fields: [{ id: 'f18', name: 'id', type: 'integer', isPrimary: true, isNullable: false }, { id: 'f19', name: 'user_id', type: 'integer', isPrimary: false, isNullable: false }, { id: 'f20', name: 'bio', type: 'text', isPrimary: false, isNullable: true }, { id: 'f21', name: 'avatar_url', type: 'varchar(255)', isPrimary: false, isNullable: true }] },
  { id: '7', name: 'authors', schema: 'public', fields: [{ id: 'a1', name: 'id', type: 'integer', isPrimary: true, isNullable: false }, { id: 'a2', name: 'name', type: 'varchar(100)', isPrimary: false, isNullable: false }] },
  { id: '8', name: 'books', schema: 'public', fields: [{ id: 'b1', name: 'id', type: 'integer', isPrimary: true, isNullable: false }, { id: 'b2', name: 'title', type: 'varchar(255)', isPrimary: false, isNullable: false }] },
  { id: '9', name: 'author_books', schema: 'public', fields: [{ id: 'ab1', name: 'author_id', type: 'integer', isPrimary: true, isNullable: false }, { id: 'ab2', name: 'book_id', type: 'integer', isPrimary: true, isNullable: false }] },
];

const mockRelationships: Relationship[] = [
  { id: 'r1', sourceTableId: '2', targetTableId: '1', sourceFieldId: 'f6', targetFieldId: 'f1', type: 'N:1' },
  { id: 'r2', sourceTableId: '3', targetTableId: '4', sourceFieldId: 'f12', targetFieldId: 'f13', type: 'N:1' },
  { id: 'r3', sourceTableId: '2', targetTableId: '5', sourceFieldId: 'f5', targetFieldId: 'f15', type: '1:N' },
  { id: 'r4', sourceTableId: '3', targetTableId: '5', sourceFieldId: 'f9', targetFieldId: 'f16', type: '1:N' },
  { id: 'r5', sourceTableId: '1', targetTableId: '6', sourceFieldId: 'f1', targetFieldId: 'f19', type: '1:1' },
  { id: 'r6', sourceTableId: '9', targetTableId: '7', sourceFieldId: 'ab1', targetFieldId: 'a1', type: 'N:1' },
  { id: 'r7', sourceTableId: '9', targetTableId: '8', sourceFieldId: 'ab2', targetFieldId: 'b1', type: 'N:1' }
];

const tableFolders: FolderNode[] = [
  { id: 'folder-1', name: 'Customers', type: 'folder', children: ['1', '6'], expanded: true },
  { id: 'folder-2', name: 'Orders', type: 'folder', children: ['2', '5'], expanded: true },
  { id: 'folder-3', name: 'Products', type: 'folder', children: ['3', '4'], expanded: false }
];

// --- Node & Edge Components ---

const TableNode = ({ data }: NodeProps<Table>) => {
  return (
    <div className="bg-linear-to-b from-gray-800 to-gray-900 border border-gray-700 rounded-lg shadow-lg w-64 overflow-hidden transition-all duration-300 hover:shadow-xl transform hover:scale-105">
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-blue-500!" />
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-blue-500!" />
      <div className="bg-linear-to-r from-blue-900 to-indigo-900 p-3 flex items-center justify-between">
        <h3 className="text-white font-bold truncate">{data.name}</h3>
        <span className="text-[10px] bg-blue-800 text-blue-200 px-2 py-1 rounded-full">{data.schema}</span>
      </div>
      <div className="p-2">
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {data.fields.map((field) => (
            <div key={field.id} className="flex items-center text-xs">
              <span className={`w-2 h-2 rounded-full mr-2 ${field.isPrimary ? 'bg-yellow-500' : 'bg-gray-600'}`} />
              <span className="text-gray-200 truncate">{field.name}</span>
              <span className="ml-auto text-gray-400 text-[10px]">{field.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, data, markerEnd }: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition: Position.Right,
    targetPosition: Position.Left
  });

  const pathRef = React.useRef<SVGPathElement>(null);
  const [endPoint, setEndPoint] = React.useState({ x: 0, y: 0 });
  const [midpoint, setMidpoint] = React.useState({ x: 0, y: 0 });

  React.useLayoutEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      const end = pathRef.current.getPointAtLength(length);
      const mid = pathRef.current.getPointAtLength(length / 2);
      setEndPoint({ x: end.x, y: end.y });
      setMidpoint({ x: mid.x, y: mid.y });
    }
  }, [edgePath]);

  return (
    <g>
      <defs>
        <marker id="arrowhead" viewBox="0 -5 10 10" refX="5" refY="0" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,-5L10,0L0,5" fill="#6b7280" />
        </marker>
      </defs>
      <path
        ref={pathRef}
        id={id}
        d={edgePath}
        fill="none"
        stroke={data?.type === 'M:M' ? '#ec4899' : '#6b7280'}
        strokeWidth={data?.type === 'M:M' ? 3 : 2}
        className="edge-animate"
        markerEnd="url(#arrowhead)"
      />
      <circle cx={endPoint.x} cy={endPoint.y} r="4" fill={data?.type === 'M:M' ? '#f472b6' : '#3b82f6'} />
      {data?.type && (
        <foreignObject width="60" height="20" x={midpoint.x - 30} y={midpoint.y - 10}>
          <div className={`text-[10px] font-bold text-center rounded px-1 ${data.type === 'M:M' ? 'text-pink-400 bg-pink-900/30' : 'text-gray-400 bg-gray-900/50'}`}>
            {data.type}
          </div>
        </foreignObject>
      )}
      <style>{`@keyframes dashFlow { from { stroke-dashoffset: 20; } to { stroke-dashoffset: 0; } } .edge-animate { stroke-dasharray: 5; animation: dashFlow 1s linear infinite; }`}</style>
    </g>
  );
};

const nodeTypes = { table: TableNode };
const edgeTypes = { custom: CustomEdge };

// --- Sidebar Component ---

const FolderStructure = ({ folders, onToggleFolder, onSelectTable, selectedTableId }: any) => {
  const renderFolder = (folder: FolderNode) => (
    <div key={folder.id} className="mb-1">
      <div
        className={`flex items-center p-2 rounded cursor-pointer transition-all duration-300 ${selectedTableId === folder.id ? 'bg-blue-900/50' : 'hover:bg-gray-800'}`}
        onClick={() => folder.type === 'folder' ? onToggleFolder(folder.id) : onSelectTable(folder.id)}
      >
        <span className="mr-2 text-blue-400">{folder.type === 'folder' ? (folder.expanded ? '📂' : '📁') : '📄'}</span>
        <span className="text-gray-200 truncate">{folder.name}</span>
      </div>
      {folder.type === 'folder' && folder.children && (
        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${folder.expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className="ml-4 border-l border-gray-700 pl-2">
              {folder.children.map((childId: string, index: number) => {
                const child = mockTables.find(t => t.id === childId);
                if (!child) return null;
                return (
                  <div key={child.id} className="mb-1" style={{ transitionDelay: folder.expanded ? `${index * 150}ms` : '0ms', opacity: folder.expanded ? 1 : 0 }}>
                    <div
                      className={`flex items-center p-2 rounded cursor-pointer transition-all duration-300 ${selectedTableId === child.id ? 'bg-blue-900/50' : 'hover:bg-gray-800'}`}
                      onClick={(e) => { e.stopPropagation(); onSelectTable(child.id); }}
                    >
                      <span className="mr-2 text-blue-400">📄</span>
                      <span className="text-gray-200 truncate">{child.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-linear-to-b from-gray-900 to-gray-950 border-r border-gray-800 p-4 w-64 h-full overflow-y-auto">
      <h2 className="text-lg flex items-center gap-2 font-bold text-blue-400 mb-4">
        <ModernDatabaseStackIcon className="w-5 h-5" /> Database Schema
      </h2>
      <div className="space-y-1">{folders.map(f => renderFolder(f))}</div>
    </div>
  );
};

// --- Main Component ---

export default function DatabaseVisualizer() {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderNode[]>(tableFolders);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const syncGraph = useCallback((targetId: string | null) => {
    // 1. Prepare all nodes
    const allNodes: Node[] = mockTables.map((table, index) => ({
      id: table.id,
      type: 'table',
      position: { x: 50 + (index % 3) * 350, y: 50 + Math.floor(index / 3) * 300 },
      data: table
    }));

    // 2. Detect Junction Tables (tables used in > 1 relationship)
    const junctionTableIds = new Set<string>();
    const tableUsageCount: Record<string, number> = {};
    mockRelationships.forEach(rel => {
      tableUsageCount[rel.sourceTableId] = (tableUsageCount[rel.sourceTableId] || 0) + 1;
      tableUsageCount[rel.targetTableId] = (tableUsageCount[rel.targetTableId] || 0) + 1;
    });
    Object.entries(tableUsageCount).forEach(([id, count]) => {
      if (count > 1) junctionTableIds.add(id);
    });

    // 3. Build All Edges (Real + Virtual M:M)
    const allEdges: Edge[] = [];

    // Add real relationships
    mockRelationships.forEach(rel => {
      allEdges.push({
        id: `e${rel.id}`,
        source: rel.sourceTableId,
        target: rel.targetTableId,
        type: 'custom',
        data: { type: rel.type }
      });
    });

    // ADD VIRTUAL M:M EDGES (The "Left Side" logic)
    // For every junction table, find its neighbors and connect them directly
    junctionTableIds.forEach(jId => {
      const neighbors = new Set<string>();
      mockRelationships.forEach(rel => {
        if (rel.sourceTableId === jId) neighbors.add(rel.targetTableId);
        if (rel.targetTableId === jId) neighbors.add(rel.sourceTableId);
      });

      const neighborArr = Array.from(neighbors);
      for (let i = 0; i < neighborArr.length; i++) {
        for (let j = i + 1; j < neighborArr.length; j++) {
          allEdges.push({
            id: `virtual-${neighborArr[i]}-${neighborArr[j]}`,
            source: neighborArr[i],
            target: neighborArr[j],
            type: 'custom',
            data: { type: 'M:M' }
          });
        }
      }
    });

    if (!targetId) {
      setNodes(allNodes);
      setEdges(allEdges);
      return;
    }

    // 4. Filtering logic for focused view
    const relatedIds = new Set<string>([targetId]);
    
    // Standard neighbors
    mockRelationships.forEach(rel => {
      if (rel.sourceTableId === targetId) relatedIds.add(rel.targetTableId);
      if (rel.targetTableId === targetId) relatedIds.add(rel.sourceTableId);
    });

    // If we click a junction table, we must also show its "other" neighbors to allow the M:M edge to render
    if (junctionTableIds.has(targetId)) {
        mockRelationships.forEach(rel => {
            if (rel.sourceTableId === targetId) relatedIds.add(rel.targetTableId);
            if (rel.targetTableId === targetId) relatedIds.add(rel.sourceTableId);
        });
    }

    // If we click a table that is part of an M:M, ensure its M:M partner is included
    allEdges.forEach(edge => {
        if (edge.data?.type === 'M:M') {
            if (edge.source === targetId) relatedIds.add(edge.target);
            if (edge.target === targetId) relatedIds.add(edge.source);
        }
    });

    const filteredNodes = allNodes.filter(n => relatedIds.has(n.id));
    const filteredEdges = allEdges.filter(e => relatedIds.has(e.source) && relatedIds.has(e.target));

    setNodes(filteredNodes);
    setEdges(filteredEdges);
  }, [setNodes, setEdges]);

  useEffect(() => { syncGraph(null); }, [syncGraph]);
  useEffect(() => { syncGraph(selectedTableId); }, [selectedTableId, syncGraph]);

  const handleToggleFolder = useCallback((id: string) => setFolders(p => p.map(f => f.id === id ? { ...f, expanded: !f.expanded } : f)), []);
  const handleSelectTable = useCallback((id: string) => setSelectedTableId(id), []);
  const selectedTableName = mockTables.find(t => t.id === selectedTableId)?.name || "Database Schema";

  return (
    <div className="flex h-screen bg-black text-gray-200">
      <div className="w-64 shrink-0">
        <FolderStructure folders={folders} onToggleFolder={handleToggleFolder} onSelectTable={handleSelectTable} selectedTableId={selectedTableId} />
      </div>
      <div className="flex-1 relative">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView className="bg-gray-950"
          >
            <style>{`
              .react-flow__controls { background: #111827 !important; border: 1px solid #374151 !important; border-radius: 8px !important; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5) !important; }
              .react-flow__control-button { background: transparent !important; border: none !important; color: #9ca3af !important; width: 36px !important; height: 36px !important; transition: all 0.2s ease !important; }
              .react-flow__control-button:hover { background: #1f2937 !important; color: #60a5fa !important; }
              .react-flow__control-button:focus { outline: none !important; }
            `}</style>
            <Controls position="top-right" />
            <Background color="#374151" gap={20} />
            <Panel position="top-left" className="bg-gray-900/80 border border-gray-800 rounded-lg p-3">
              <h3 className="font-bold text-blue-400 flex items-center gap-2">
                <ModernDatabaseStackIcon className="w-5 h-5" /> {selectedTableName}
              </h3>
            </Panel>
            <MiniMap nodeColor={() => '#4f46e5'} className="bg-gray-900 border-gray-800" position="bottom-left" />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}
