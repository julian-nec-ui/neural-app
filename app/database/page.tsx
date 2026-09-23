// app/database-visualizer/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MiniMap,
  Node,
  Edge,
  Connection,
  Panel,
  ReactFlowProvider,
  getBezierPath,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';

// Define types
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

// Mock data
const mockTables: Table[] = [
  {
    id: '1',
    name: 'users',
    schema: 'public',
    fields: [
      { id: 'f1', name: 'id', type: 'integer', isPrimary: true, isNullable: false },
      { id: 'f2', name: 'username', type: 'varchar(50)', isPrimary: false, isNullable: false },
      { id: 'f3', name: 'email', type: 'varchar(100)', isPrimary: false, isNullable: false },
      { id: 'f4', name: 'created_at', type: 'timestamp', isPrimary: false, isNullable: true },
    ],
  },
  {
    id: '2',
    name: 'orders',
    schema: 'public',
    fields: [
      { id: 'f5', name: 'id', type: 'integer', isPrimary: true, isNullable: false },
      { id: 'f6', name: 'user_id', type: 'integer', isPrimary: false, isNullable: false },
      { id: 'f7', name: 'amount', type: 'decimal(10,2)', isPrimary: false, isNullable: true },
      { id: 'f8', name: 'order_date', type: 'date', isPrimary: false, isNullable: true },
    ],
  },
  {
    id: '3',
    name: 'products',
    schema: 'public',
    fields: [
      { id: 'f9', name: 'id', type: 'integer', isPrimary: true, isNullable: false },
      { id: 'f10', name: 'name', type: 'varchar(100)', isPrimary: false, isNullable: false },
      { id: 'f11', name: 'price', type: 'decimal(10,2)', isPrimary: false, isNullable: true },
      { id: 'f12', name: 'category_id', type: 'integer', isPrimary: false, isNullable: true },
    ],
  },
  {
    id: '4',
    name: 'categories',
    schema: 'public',
    fields: [
      { id: 'f13', name: 'id', type: 'integer', isPrimary: true, isNullable: false },
      { id: 'f14', name: 'name', type: 'varchar(50)', isPrimary: false, isNullable: false },
    ],
  },
  {
    id: '5',
    name: 'order_items',
    schema: 'public',
    fields: [
      { id: 'f15', name: 'order_id', type: 'integer', isPrimary: true, isNullable: false },
      { id: 'f16', name: 'product_id', type: 'integer', isPrimary: true, isNullable: false },
      { id: 'f17', name: 'quantity', type: 'integer', isPrimary: false, isNullable: false },
    ],
  },
  {
    id: '6',
    name: 'user_profiles',
    schema: 'public',
    fields: [
      { id: 'f18', name: 'id', type: 'integer', isPrimary: true, isNullable: false },
      { id: 'f19', name: 'user_id', type: 'integer', isPrimary: false, isNullable: false },
      { id: 'f20', name: 'bio', type: 'text', isPrimary: false, isNullable: true },
      { id: 'f21', name: 'avatar_url', type: 'varchar(255)', isPrimary: false, isNullable: true },
    ],
  },
];

const mockRelationships: Relationship[] = [
  {
    id: 'r1',
    sourceTableId: '2',
    targetTableId: '1',
    sourceFieldId: 'f6',
    targetFieldId: 'f1',
    type: 'N:1'
  },
  {
    id: 'r2',
    sourceTableId: '3',
    targetTableId: '4',
    sourceFieldId: 'f12',
    targetFieldId: 'f13',
    type: 'N:1'
  },
  {
    id: 'r3',
    sourceTableId: '2',
    targetTableId: '5',
    sourceFieldId: 'f5',
    targetFieldId: 'f15',
    type: '1:N'
  },
  {
    id: 'r4',
    sourceTableId: '3',
    targetTableId: '5',
    sourceFieldId: 'f9',
    targetFieldId: 'f16',
    type: '1:N'
  },
  {
    id: 'r5',
    sourceTableId: '1',
    targetTableId: '6',
    sourceFieldId: 'f1',
    targetFieldId: 'f19',
    type: '1:1'
  }
];

// Folder structure for tables
const tableFolders = [
  {
    id: 'folder-1',
    name: 'Customers',
    type: 'folder',
    children: ['1', '6'],
    expanded: true
  },
  {
    id: 'folder-2',
    name: 'Orders',
    type: 'folder',
    children: ['2', '5'],
    expanded: true
  },
  {
    id: 'folder-3',
    name: 'Products',
    type: 'folder',
    children: ['3', '4'],
    expanded: false
  }
];

// Custom node component for tables
const TableNode = ({ data, id }: { data: any; id: string }) => {
  return (
    <div className="bg-linear-to-b from-gray-800 to-gray-900 border border-gray-700 rounded-lg shadow-lg w-64 overflow-hidden transition-all duration-300 hover:shadow-xl">
      <div className="bg-linear-to-r from-blue-900 to-indigo-900 p-3 flex items-center justify-between">
        <h3 className="text-white font-bold truncate">{data.name}</h3>
        <span className="text-xs bg-blue-800 text-blue-200 px-2 py-1 rounded-full">
          {data.schema}
        </span>
      </div>
      <div className="p-2">
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {data.fields.map((field: FieldType) => (
            <div key={field.id} className="flex items-center text-xs">
              <span className={`w-3 h-3 rounded-full mr-2 ${field.isPrimary ? 'bg-yellow-500' : 'bg-gray-600'}`}></span>
              <span className="text-gray-200 truncate">{field.name}</span>
              <span className="ml-auto text-gray-400">{field.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Custom node component for relationships
const RelationshipNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-linear-to-b from-gray-800 to-gray-900 border border-gray-700 rounded-lg shadow-lg p-3 w-48">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-blue-400 font-semibold">Relationship</h4>
        <span className={`px-2 py-1 rounded text-xs ${
          data.type === '1:1' ? 'bg-purple-900 text-purple-200' :
          data.type === '1:N' ? 'bg-green-900 text-green-200' :
          data.type === 'N:1' ? 'bg-yellow-900 text-yellow-200' : 
          'bg-red-900 text-red-200'
        }`}>
          {data.type}
        </span>
      </div>
      <div className="text-xs text-gray-300">
        <p>From: {data.sourceTable} → {data.sourceField}</p>
        <p>To: {data.targetTable} → {data.targetField}</p>
      </div>
    </div>
  );
};

// Custom edge component with arrows
const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, data }: any) => {
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
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke="#6b7280"
        strokeWidth="2"
        className="react-flow__edge-path"
        markerEnd="url(#arrowhead)"
      />
      {data?.type && (
        <text x={(sourceX + targetX) / 2} y={(sourceY + targetY) / 2} textAnchor="middle" dy={-10} fill="#9ca3af" className="text-xs font-medium">
          {data.type}
        </text>
      )}
    </g>
  );
};

// Custom node types
const nodeTypes = {
  table: TableNode,
  relationship: RelationshipNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

// Folder structure component
const FolderStructure = ({ 
  folders, 
  onToggleFolder, 
  onSelectTable,
  selectedTableId
}: { 
  folders: any[]; 
  onToggleFolder: (id: string) => void;
  onSelectTable: (id: string) => void;
  selectedTableId: string | null;
}) => {
  const renderFolder = (folder: any, depth = 0) => {
    return (
      <div key={folder.id} className="mb-1">
        <div 
          className={`flex items-center p-2 rounded cursor-pointer transition-all duration-200 ${
            selectedTableId === folder.id ? 'bg-blue-900/50' : 'hover:bg-gray-800'
          }`}
          onClick={() => folder.type === 'folder' ? onToggleFolder(folder.id) : onSelectTable(folder.id)}
        >
          <span className="mr-2 text-blue-400">
            {folder.type === 'folder' ? (
              folder.expanded ? '📂' : '📁'
            ) : '📄'}
          </span>
          <span className="text-gray-200 truncate">{folder.name}</span>
        </div>
        
        {folder.type === 'folder' && folder.expanded && folder.children && (
          <div className="ml-4 border-l border-gray-700 pl-2">
            {folder.children.map((childId: string) => {
              const child = mockTables.find(t => t.id === childId);
              if (child) {
                return (
                  <div key={child.id} className="mb-1">
                    <div 
                      className={`flex items-center p-2 rounded cursor-pointer transition-all duration-200 ${
                        selectedTableId === child.id ? 'bg-blue-900/50' : 'hover:bg-gray-800'
                      }`}
                      onClick={() => onSelectTable(child.id)}
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
        )}
      </div>
    );
  };

  return (
    <div className="bg-linear-to-b from-gray-900 to-gray-950 border-r border-gray-800 p-4 w-64 overflow-y-auto">
      <h2 className="text-lg font-bold text-blue-400 mb-4 flex items-center">
        <span className="mr-2">🗄️</span> Database Schema
      </h2>
      <div className="space-y-1">
        {folders.map(folder => renderFolder(folder))}
      </div>
    </div>
  );
};

// Table metadata component
const TableMetadata = ({ table }: { table: Table | null }) => {
  if (!table) {
    return (
      <div className="bg-linear-to-b from-gray-900 to-gray-950 border-r border-gray-800 p-4 w-64">
        <h2 className="text-lg font-bold text-blue-400 mb-4">Table Metadata</h2>
        <p className="text-gray-400 text-center py-8">Select a table to view metadata</p>
      </div>
    );
  }

  return (
    <div className="bg-linear-to-b from-gray-900 to-gray-950 border-r border-gray-800 p-4 w-64">
      <h2 className="text-lg font-bold text-blue-400 mb-4 flex items-center">
        <span className="mr-2">📄</span> {table.name}
      </h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-400">Schema: <span className="text-blue-300">{table.schema}</span></p>
        <p className="text-sm text-gray-400">Fields: <span className="text-blue-300">{table.fields.length}</span></p>
      </div>
      
      <div className="mb-4">
        <h3 className="font-semibold text-gray-300 mb-2 flex items-center">
          <span className="mr-2">📋</span> Fields
        </h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {table.fields.map(field => (
            <div key={field.id} className="p-2 bg-gray-800/50 rounded border-l-4 border-blue-500">
              <div className="flex justify-between items-center">
                <span className={`font-medium ${field.isPrimary ? 'text-yellow-400' : 'text-gray-200'}`}>
                  {field.name}
                </span>
                <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
                  {field.type}
                </span>
              </div>
              <div className="flex items-center mt-1">
                <span className={`text-xs mr-2 ${field.isPrimary ? 'text-yellow-500' : 'text-gray-500'}`}>
                  {field.isPrimary ? 'PK' : 'FK'}
                </span>
                <span className="text-xs text-gray-500">
                  {field.isNullable ? 'nullable' : 'not null'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <h3 className="font-semibold text-gray-300 mb-2 flex items-center">
          <span className="mr-2">🔗</span> Relationships
        </h3>
        <div className="space-y-2">
          {mockRelationships
            .filter(rel => rel.sourceTableId === table.id || rel.targetTableId === table.id)
            .map(rel => {
              const source = mockTables.find(t => t.id === rel.sourceTableId);
              const target = mockTables.find(t => t.id === rel.targetTableId);
              return (
                <div key={rel.id} className="p-2 bg-gray-800/50 rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300 truncate">
                      {rel.sourceTableId === table.id ? target?.name : source?.name}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      rel.type === '1:1' ? 'bg-purple-900 text-purple-200' :
                      rel.type === '1:N' ? 'bg-green-900 text-green-200' :
                      rel.type === 'N:1' ? 'bg-yellow-900 text-yellow-200' : 
                      'bg-red-900 text-red-200'
                    }`}>
                      {rel.type}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {rel.sourceFieldId === table.fields[0].id ? 'PK' : 'FK'} → 
                    {rel.targetFieldId === mockTables.find(t => t.id === rel.targetTableId)?.fields[0].id ? ' PK' : ' FK'}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

// Main component
export default function DatabaseVisualizer() {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [folders, setFolders] = useState<any[]>(tableFolders);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isAnimating, setIsAnimating] = useState(false);

  // Initialize nodes and edges
  useEffect(() => {
    if (mockTables.length === 0) return;
    
    const newNodes: Node[] = mockTables.map((table, index) => ({
      id: table.id,
      type: 'table',
      position: { x: 50 + (index % 3) * 300, y: 50 + Math.floor(index / 3) * 250 },
      data: { 
        name: table.name, 
        schema: table.schema,
        fields: table.fields
      },
    }));
    
    setNodes(newNodes);
    
    // Create edges for relationships
    const newEdges: Edge[] = mockRelationships.map(rel => {
      const source = mockTables.find(t => t.id === rel.sourceTableId);
      const target = mockTables.find(t => t.id === rel.targetTableId);
      
      return {
        id: `e${rel.id}`,
        source: rel.sourceTableId,
        target: rel.targetTableId,
        type: 'custom',
        data: {
          type: rel.type,
          sourceTable: source?.name,
          targetTable: target?.name,
          sourceField: source?.fields.find(f => f.id === rel.sourceFieldId)?.name,
          targetField: target?.fields.find(f => f.id === rel.targetFieldId)?.name
        }
      };
    });
    
    setEdges(newEdges);
  }, []);

  const handleToggleFolder = useCallback((folderId: string) => {
    setFolders(prev => 
      prev.map(folder => 
        folder.id === folderId ? { ...folder, expanded: !folder.expanded } : folder
      )
    );
  }, []);

  const handleSelectTable = useCallback((tableId: string) => {
    setSelectedTableId(tableId);
    setIsAnimating(true);
    
    // Reset animation after a short delay
    setTimeout(() => setIsAnimating(false), 500);
  }, []);

  return (
    <div className="flex h-screen bg-linear-to-br from-gray-950 to-black text-gray-200">
      {/* Left sidebar - Folder structure and metadata */}
      <div className="flex flex-col w-80">
        <FolderStructure 
          folders={folders} 
          onToggleFolder={handleToggleFolder}
          onSelectTable={handleSelectTable}
          selectedTableId={selectedTableId}
        />
        <TableMetadata table={mockTables.find(t => t.id === selectedTableId) || null} />
      </div>
      
      {/* Main visualization area */}
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
            className="bg-linear-to-br from-gray-950 to-black"
          >
            <Background color="#374151" gap={20} />
            <Controls className="bg-gray-900/80 border border-gray-800 rounded-lg shadow-lg" />
            <MiniMap 
              nodeColor={(node) => {
                if (node.type === 'table') return '#4f46e5';
                return '#3b82f6';
              }}
              className="bg-gray-900/80 border border-gray-800 rounded-lg shadow-lg"
            />
            
            <Panel position="top-right" className="bg-gray-900/80 border border-gray-800 rounded-lg p-3">
              <h3 className="font-bold text-blue-400 flex items-center">
                <span className="mr-2">📊</span> Database Schema
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {selectedTableId 
                  ? `Selected: ${mockTables.find(t => t.id === selectedTableId)?.name}` 
                  : 'Click on a table to visualize relationships'}
              </p>
            </Panel>
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}
