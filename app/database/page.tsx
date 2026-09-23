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

// --- Mock Data ---
const mockTables: Table[] = [
  { id: '1', name: 'users', schema: 'public', fields: [{ id: 'f1', name: 'id', type: 'integer', isPrimary: true, isNullable: false }, { id: 'f2', name: 'username', type: 'varchar(50)', isPrimary: false, isNullable: false }, { id: 'f3', name: 'email', type: 'varchar(100)', isPrimary: false, isNullable: false }, { id: 'f4', name: 'created_at', type: 'timestamp', isPrimary: false, isNullable: true }] },
  { id: '2', name: 'orders', schema: 'public', fields: [{ id: 'f5', name: 'id', type: 'integer', isPrimary: true, isNullable: false }, { id: 'f6', name: 'user_id', type: 'integer', isPrimary: false, isNullable: false }, { id: 'f7', name: 'amount', type: 'decimal(10,2)', isPrimary: false, isNullable: true }, { id: 'f8', name: 'order_date', type: 'date', isPrimary: false, isNullable: true }] },
  { id: '3', name: 'products', schema: 'public', fields: [{ id: 'f9', name: 'id', type: 'integer', isPrimary: true, isNullable: false }, { id: 'f10', name: 'name', type: 'varchar(100)', isPrimary: false, isNullable: false }, { id: 'f11', name: 'price', type: 'decimal(10,2)', isPrimary: false, isNullable: true }, { id: 'f12', name: 'category_id', type: 'integer', isPrimary: false, isNullable: true }] },
  { id: '4', name: 'categories', schema: 'public', fields: [{ id: 'f13', name: 'id', type: 'integer', isPrimary: true, isNullable: false }, { id: 'f14', name: 'name', type: 'varchar(50)', isPrimary: false, isNullable: false }] },
  { id: '5', name: 'order_items', schema: 'public', fields: [{ id: 'f15', name: 'order_id', type: 'integer', isPrimary: true, isNullable: false }, { id: 'f16', name: 'product_id', type: 'integer', isPrimary: true, isNullable: false }, { id: 'f17', name: 'quantity', type: 'integer', isPrimary: false, isNullable: false }] },
  { id: '6', name: 'user_profiles', schema: 'public', fields: [{ id: 'f18', name: 'id', type: 'integer', isPrimary: true, isNullable: false }, { id: 'f19', name: 'user_id', type: 'integer', isPrimary: false, isNullable: false }, { id: 'f20', name: 'bio', type: 'text', isPrimary: false, isNullable: true }, { id: 'f21', name: 'avatar_url', type: 'varchar(255)', isPrimary: false, isNullable: true }] },
];

const mockRelationships: Relationship[] = [
  { id: 'r1', sourceTableId: '2', targetTableId: '1', sourceFieldId: 'f6', targetFieldId: 'f1', type: 'N:1' },
  { id: 'r2', sourceTableId: '3', targetTableId: '4', sourceFieldId: 'f12', targetFieldId: 'f13', type: 'N:1' },
  { id: 'r3', sourceTableId: '2', targetTableId: '5', sourceFieldId: 'f5', targetFieldId: 'f15', type: '1:N' },
  { id: 'r4', sourceTableId: '3', targetTableId: '5', sourceFieldId: 'f9', targetFieldId: 'f16', type: '1:N' },
  { id: 'r5', sourceTableId: '1', targetTableId: '6', sourceFieldId: 'f1', targetFieldId: 'f19', type: '1:1' }
];

const tableFolders: FolderNode[] = [
  { id: 'folder-1', name: 'Customers', type: 'folder', children: ['1', '6'], expanded: true },
  { id: 'folder-2', name: 'Orders', type: 'folder', children: ['2', '5'], expanded: true },
  { id: 'folder-3', name: 'Products', type: 'folder', children: ['3', '4'], expanded: false }
];

// --- Components ---

const TableNode = ({ data }: NodeProps<Table>) => {
  return (
    <div className="bg-linear-to-b from-gray-800 to-gray-900 border border-gray-700 rounded-lg shadow-lg w-64 overflow-hidden transition-all duration-300 hover:shadow-xl transform hover:scale-105">
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-blue-500" />
      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-blue-500" />
      
      <div className="bg-linear-to-r from-blue-900 to-indigo-900 p-3 flex items-center justify-between">
        <h3 className="text-white font-bold truncate">{data.name}</h3>
        <span className="text-[10px] bg-blue-800 text-blue-200 px-2 py-1 rounded-full">
          {data.schema}
        </span>
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

const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: Position.Right,
    targetPosition: Position.Left
  });

  return (
    <g>
      <style>{`
        @keyframes dashFlow {
          from { stroke-dashoffset: 20; }
          to { stroke-dashoffset: 0; }
        }
        .edge-animate {
          stroke-dasharray: 5;
          animation: dashFlow 1s linear infinite;
        }
      `}</style>
      <defs>
        <marker
          id="arrowhead"
          viewBox="0 -5 10 10"
          refX="25"
          refY="0"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0,-5L10,0L0,5" fill="#6b7280" />
        </marker>
      </defs>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke="#6b7280"
        strokeWidth="2"
        className="edge-animate"
        markerEnd="url(#arrowhead)"
      />
      {/* The circle on the child table */}
      <circle cx={targetX} cy={targetY} r="4" fill="#3b82f6" />
      
      {data?.type && (
        <foreignObject 
          width="60" 
          height="20" 
          x={(sourceX + targetX) / 2 - 30} 
          y={(sourceY + targetY) / 2 - 10}
        >
          <div className="text-[10px] font-medium text-gray-400 text-center bg-gray-900/50 rounded px-1">
            {data.type}
          </div>
        </foreignObject>
      )}
    </g>
  );
};

const nodeTypes = { table: TableNode };
const edgeTypes = { custom: CustomEdge };

const FolderStructure = ({ 
  folders, 
  onToggleFolder, 
  onSelectTable,
  selectedTableId
}: { 
  folders: FolderNode[]; 
  onToggleFolder: (id: string) => void;
  onSelectTable: (id: string) => void;
  selectedTableId: string | null;
}) => {
  const renderFolder = (folder: FolderNode, depth = 0) => {
    return (
      <div key={folder.id} className="mb-1">
        <div 
          className={`flex items-center p-2 rounded cursor-pointer transition-all duration-300 ${
            selectedTableId === folder.id ? 'bg-blue-900/50' : 'hover:bg-gray-800'
          }`}
          onClick={() => folder.type === 'folder' ? onToggleFolder(folder.id) : onSelectTable(folder.id)}
        >
          <span className="mr-2 text-blue-400">
            {folder.type === 'folder' ? (folder.expanded ? '📂' : '📁') : '📄'}
          </span>
          <span className="text-gray-200 truncate">{folder.name}</span>
        </div>
        
        {folder.type === 'folder' && folder.children && (
          <div className={`grid transition-all duration-300 ease-in-out ${folder.expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden ml-4 border-l border-gray-700 pl-2">
              {folder.children.map((childId) => {
                const child = mockTables.find(t => t.id === childId);
                if (child) {
                  return (
                    <div key={child.id} className="mb-1">
                      <div 
                        className={`flex items-center p-2 rounded cursor-pointer transition-all duration-300 ${
                          selectedTableId === child.id ? 'bg-blue-900/50' : 'hover:bg-gray-800'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTable(child.id);
                        }}
                      >
                        <span className="mr-2 text-blue-400">📄</span>
                        <span className="text-gray-200 truncate">{child.name}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-linear-to-b from-gray-900 to-gray-950 border-r border-gray-800 p-4 w-64 overflow-y-auto h-full">
      <h2 className="text-lg font-bold text-blue-400 mb-4">🗄️ Database Schema</h2>
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
    const allNodes: Node[] = mockTables.map((table, index) => ({
      id: table.id,
      type: 'table',
      position: { x: 50 + (index % 3) * 350, y: 50 + Math.floor(index / 3) * 300 },
      data: table
    }));

    const allEdges: Edge[] = mockRelationships.map(rel => ({
      id: `e${rel.id}`,
      source: rel.sourceTableId,
      target: rel.targetTableId,
      type: 'custom',
      data: { type: rel.type }
    }));

    if (!targetId) {
      setNodes(allNodes);
      setEdges(allEdges);
      return;
    }

    const relatedIds = new Set<string>([targetId]);
    mockRelationships.forEach(rel => {
      if (rel.sourceTableId === targetId) relatedIds.add(rel.targetTableId);
      if (rel.targetTableId === targetId) relatedIds.add(rel.sourceTableId);
    });

    const filteredNodes = allNodes.filter(n => relatedIds.has(n.id));
    const filteredEdges = allEdges.filter(e => relatedIds.has(e.source) && relatedIds.has(e.target));

    setNodes(filteredNodes);
    setEdges(filteredEdges);
  }, [setNodes, setEdges]);

  useEffect(() => {
    syncGraph(null);
  }, [syncGraph]);

  useEffect(() => {
    syncGraph(selectedTableId);
  }, [selectedTableId, syncGraph]);

  const handleToggleFolder = useCallback((folderId: string) => {
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, expanded: !f.expanded } : f));
  }, []);

  const handleSelectTable = useCallback((tableId: string) => {
    setSelectedTableId(tableId);
  }, []);

  return (
    <div className="flex h-screen bg-black text-gray-200">
      <div className="w-64 shrink-0">
        <FolderStructure 
          folders={folders} 
          onToggleFolder={handleToggleFolder}
          onSelectTable={handleSelectTable}
          selectedTableId={selectedTableId}
        />
      </div>
      
      <div className="flex-1 relative">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            className="bg-gray-950"
          >
            <Background color="#374151" gap={20} />
            <Controls className="bg-gray-900 border-gray-700" position="bottom-left" />
            <Panel position="top-left" className="bg-gray-900/80 border border-gray-800 rounded-lg p-3">
              <h3 className="font-bold text-blue-400">📊 Database Schema</h3>
            </Panel>
            <MiniMap 
              nodeColor={() => '#4f46e5'}
              className="bg-gray-900 border-gray-800"
              position="bottom-right"
            />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}
