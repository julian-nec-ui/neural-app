// components/DatabaseSchemaViewer.tsx
"use client";

import { useState, useEffect } from 'react';
import ReactFlow, { 
  Controls, 
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MiniMap,
  Node,
  Edge,
  Connection
} from 'reactflow';
import 'reactflow/dist/style.css';

// Define types
type Table = {
  id: string;
  name: string;
  columns: Column[];
};

type Column = {
  id: string;
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: string;
};

type Relation = {
  id: string;
  type: '1:N' | 'N:1' | '1:1' | 'M:M';
  fromTable: string;
  toTable: string;
  fromColumn: string;
  toColumn: string;
};

type Folder = {
  id: string;
  name: string;
  type: 'folder' | 'table';
  expanded?: boolean;
  children?: string[];
  tables?: Table[];
};

// Mock data
const mockTables: Table[] = [
  {
    id: 'users',
    name: 'Users',
    columns: [
      { id: 'u1', name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
      { id: 'u2', name: 'username', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
      { id: 'u3', name: 'email', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
      { id: 'u4', name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
    ]
  },
  {
    id: 'posts',
    name: 'Posts',
    columns: [
      { id: 'p1', name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
      { id: 'p2', name: 'title', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false },
      { id: 'p3', name: 'content', type: 'TEXT', isPrimaryKey: false, isForeignKey: false },
      { id: 'p4', name: 'user_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, references: 'users.id' },
      { id: 'p5', name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
    ]
  },
  {
    id: 'topics',
    name: 'Topics',
    columns: [
      { id: 't1', name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
      { id: 't2', name: 'name', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
      { id: 't3', name: 'description', type: 'TEXT', isPrimaryKey: false, isForeignKey: false },
    ]
  },
  {
    id: 'post_topics',
    name: 'Post_Topics',
    columns: [
      { id: 'pt1', name: 'post_id', type: 'INT', isPrimaryKey: true, isForeignKey: true, references: 'posts.id' },
      { id: 'pt2', name: 'topic_id', type: 'INT', isPrimaryKey: true, isForeignKey: true, references: 'topics.id' },
    ]
  }
];

const mockRelations: Relation[] = [
  {
    id: 'r1',
    type: '1:N',
    fromTable: 'users',
    toTable: 'posts',
    fromColumn: 'id',
    toColumn: 'user_id'
  },
  {
    id: 'r2',
    type: 'M:M',
    fromTable: 'posts',
    toTable: 'topics',
    fromColumn: 'id',
    toColumn: 'id'
  }
];

const mockFolders: Folder[] = [
  {
    id: 'folder1',
    name: 'Users & Posts',
    type: 'folder',
    expanded: true,
    children: ['users', 'posts']
  },
  {
    id: 'folder2',
    name: 'Topics',
    type: 'folder',
    expanded: true,
    children: ['topics', 'post_topics']
  }
];

// Node component for React Flow
const TableNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg shadow-lg w-64">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-3 rounded-t-lg">
        <h3 className="font-bold text-white truncate">{data.table.name}</h3>
      </div>
      <div className="p-3">
        <div className="space-y-2">
          {data.table.columns.map((col: Column) => (
            <div key={col.id} className="flex items-center text-sm">
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${col.isPrimaryKey ? 'bg-yellow-500' : col.isForeignKey ? 'bg-green-500' : 'bg-gray-500'}`}></span>
              <span className="text-gray-300 truncate">{col.name}</span>
              <span className="ml-auto text-xs text-gray-500">{col.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const relationTypes = {
  '1:N': { color: '#3B82F6', label: 'One-to-Many' },
  'N:1': { color: '#10B981', label: 'Many-to-One' },
  '1:1': { color: '#8B5CF6', label: 'One-to-One' },
  'M:M': { color: '#EC4899', label: 'Many-to-Many' }
};

// Custom node types
const nodeTypes = {
  tableNode: TableNode
};

const DatabaseSchemaViewer = () => {
  const [folders, setFolders] = useState<Folder[]>(mockFolders);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['folder1', 'folder2']));
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Initialize nodes and edges
  useEffect(() => {
    if (mockTables.length === 0) return;

    // Create nodes
    const newNodes: Node[] = mockTables.map((table, index) => ({
      id: table.id,
      type: 'tableNode',
      position: { x: index * 300, y: 100 },
      data: { table }
    }));

    // Create edges
    const newEdges: Edge[] = [];
    
    mockRelations.forEach(rel => {
      const fromTable = mockTables.find(t => t.id === rel.fromTable);
      const toTable = mockTables.find(t => t.id === rel.toTable);
      
      if (fromTable && toTable) {
        // Find the specific columns
        const fromColumn = fromTable.columns.find(c => c.name === rel.fromColumn);
        const toColumn = toTable.columns.find(c => c.name === rel.toColumn);
        
        if (fromColumn && toColumn) {
          newEdges.push({
            id: `e${rel.id}`,
            source: rel.fromTable,
            target: rel.toTable,
            animated: true,
            markerEnd: { type: 'arrowclosed' },
            style: { 
              stroke: relationTypes[rel.type].color,
              strokeWidth: 2
            },
            label: rel.type,
            labelStyle: { fill: '#fff', fontWeight: 'bold' }
          });
        }
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, []);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
  };

  const onConnect = (params: Connection) => {
    setEdges((eds) => addEdge({ ...params, animated: true }, eds));
  };

  return (
    <div className="flex h-screen bg-linear-to-br from-gray-900 to-gray-800 text-gray-200">
      {/* Left Sidebar - Folder Structure */}
      <div className="w-1/4 border-r border-gray-700 overflow-y-auto p-4">
        <h2 className="text-xl font-bold mb-4 text-blue-400">Database Schema</h2>
        
        <div className="space-y-2">
          {folders.map(folder => (
            <div key={folder.id} className="mb-1">
              <div 
                className="flex items-center p-2 rounded hover:bg-gray-800 cursor-pointer transition-colors"
                onClick={() => toggleFolder(folder.id)}
              >
                <span className="mr-2 text-blue-400">
                  {expandedFolders.has(folder.id) ? '▼' : '▶'}
                </span>
                <span className="font-medium">{folder.name}</span>
              </div>
              
              {expandedFolders.has(folder.id) && (
                <div className="ml-6 pl-2 border-l border-gray-700">
                  {folder.children?.map(childId => {
                    const table = mockTables.find(t => t.id === childId);
                    return table ? (
                      <div 
                        key={table.id}
                        className={`p-2 rounded cursor-pointer transition-colors ${selectedTable?.id === table.id ? 'bg-blue-900/30' : 'hover:bg-gray-800'}`}
                        onClick={() => handleTableClick(table)}
                      >
                        <div className="flex items-center">
                          <span className="mr-2 text-gray-400">📄</span>
                          <span>{table.name}</span>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Selected Table Info */}
        {selectedTable && (
          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <h3 className="font-bold text-blue-400 mb-2">Selected Table: {selectedTable.name}</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Columns:</span>
                <span className="text-blue-300">{selectedTable.columns.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Primary Keys:</span>
                <span className="text-yellow-400">
                  {selectedTable.columns.filter(c => c.isPrimaryKey).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Foreign Keys:</span>
                <span className="text-green-400">
                  {selectedTable.columns.filter(c => c.isForeignKey).length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Graph Visualization */}
      <div className="w-3/4 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-blue-400">Schema Diagram</h2>
          <p className="text-sm text-gray-400 mt-1">
            Click on tables to view details. Drag to pan, scroll to zoom.
          </p>
        </div>
        
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-900"
          >
            <Background color="#4b5563" gap={16} />
            <Controls className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700" />
            <MiniMap 
              className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700" 
              nodeColor={(node) => {
                if (selectedTable?.id === node.id) return '#3B82F6';
                return '#4B5563';
              }}
            />
          </ReactFlow>
        </div>
        
        {/* Legend */}
        <div className="p-3 border-t border-gray-700 bg-gray-800/50 flex flex-wrap gap-4">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
            <span className="text-sm">One-to-Many (1:N)</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
            <span className="text-sm">Many-to-One (N:1)</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
            <span className="text-sm">One-to-One (1:1)</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-pink-500 mr-2"></span>
            <span className="text-sm">Many-to-Many (M:M)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseSchemaViewer;
