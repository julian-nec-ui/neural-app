"use client";
import React, { useState, useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Edge, 
  Node, 
  MarkerType, 
  ConnectionLineType 
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, Database, Share2, FolderOpen, Folder } from 'lucide-react';
import { SCHEMA, Relation } from './data';

// --- Metallic Styled Table Node ---
const TableNode = ({ data }: { data: { label: string; columns: string[] } }) => (
  <div className="bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 p-1 rounded-lg shadow-xl border border-slate-600 w-48">
    <div className="bg-slate-800 text-slate-100 text-xs font-bold p-2 rounded-t-md border-b border-slate-600 flex items-center gap-2">
      <Database size={14} /> {data.label}
    </div>
    <div className="bg-slate-100/90 text-slate-800 text-[10px] p-2 rounded-b-md font-mono">
      {data.columns.map((col, i) => (
        <div key={i} className="py-0.5 border-b border-slate-300 last:border-0">{col}</div>
      ))}
    </div>
  </div>
);

const nodeTypes = { tableNode: TableNode };

export default function DatabaseVisualizer() {
  const [selectedRelation, setSelectedRelation] = useState<Relation | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ root: true });

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Generate ReactFlow Nodes and Edges based on selected relation
  const { nodes, edges } = useMemo(() => {
    if (!selectedRelation) return { nodes: [], edges: [] };

    const fromTable = SCHEMA.tables.find(t => t.id === selectedRelation.from);
    const toTable = SCHEMA.tables.find(t => t.id === selectedRelation.to);

    const nodes: Node[] = [
      {
        id: fromTable?.id,
        type: 'tableNode',
        data: { label: fromTable?.name, columns: fromTable?.columns || [] },
        position: { x: 100, y: 100 },
      },
      {
        id: toTable?.id,
        type: 'tableNode',
        data: { label: toTable?.name, columns: toTable?.columns || [] },
        position: { x: 500, y: 100 },
      },
    ];

    const edges: Edge[] = [
      {
        id: selectedRelation.id,
        source: fromTable?.id,
        target: toTable?.id,
        label: selectedRelation.type,
        animated: true,
        connectionLineType: ConnectionLineType.SmoothStep,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
        style: { stroke: '#475569', strokeWidth: 3 },
      },
    ];

    return { nodes, edges };
  }, [selectedRelation]);

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-200 overflow-hidden font-sans">
      {/* LEFT SIDEBAR: Metallic Tree Structure */}
      <div className="w-80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex items-center gap-3">
          <div className="p-2 bg-slate-700 rounded-lg shadow-inner border border-slate-600">
            <Share2 className="text-blue-400" size={20} />
          </div>
          <h1 className="font-bold text-lg tracking-tight text-slate-100">Schema Explorer</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            <div 
              className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-slate-700 transition-colors"
              onClick={() => toggleExpand('root')}
            >
              {expanded.root ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <FolderOpen size={18} className="text-yellow-500" />
              <span className="font-medium">Database Relations</span>
            </div>

            <AnimatePresence>
              {expanded.root && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="ml-6 space-y-1 border-l border-slate-700 pl-2"
                >
                  {SCHEMA.relations.map((rel) => (
                    <div 
                      key={rel.id}
                      onClick={() => setSelectedRelation(rel)}
                      className={`group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all duration-200 ${
                        selectedRelation?.id === rel.id 
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                        : 'hover:bg-slate-700/50 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Folder size={14} className="opacity-50 group-hover:opacity-100" />
                      <span className="text-sm truncate">{rel.label}</span>
                      <span className="ml-auto text-[10px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-600 font-mono">
                        {rel.type}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Graphical Representation */}
      <div className="flex-1 relative bg-[#0f172a]">
        <div className="absolute top-6 left-6 z-10">
          <div className="bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700 shadow-lg flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-300">
              {selectedRelation ? `Viewing: ${selectedRelation.label}` : 'Select a relation to visualize'}
            </span>
          </div>
        </div>

        {selectedRelation ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            className="bg-transparent"
          >
            <Background color="#334155" gap={20} />
            <Controls className="bg-slate-800 border-slate-600 fill-slate-200" />
          </ReactFlow>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 gap-4">
            <div className="p-6 rounded-full bg-slate-800/50 border border-slate-700 animate-bounce">
              <Database size={48} className="text-slate-600" />
            </div>
            <p className="text-lg font-light italic">Ready to visualize database architecture</p>
          </div>
        )}
      </div>
    </div>
  );
}
