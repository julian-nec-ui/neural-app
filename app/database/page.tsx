"use client";

import React, { useState, useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Edge, 
  Node, 
  MarkerType, 
  ConnectionLineType,
  NodeProps
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, ChevronDown, Layers, 
  Zap, FolderOpen, Folder, Search, Cpu 
} from 'lucide-react';
import { SCHEMA, Relation, Table } from './data';

// --- Custom Metallic Table Node ---
const TableNode = ({ data }: NodeProps) => {
  const tableData = data as { label: string; columns: string[] };
  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-linear-to-br from-slate-400 to-slate-700 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-500"></div>
      <div className="relative bg-slate-900 border border-slate-500 rounded-lg shadow-2xl w-52 overflow-hidden">
        <div className="bg-linear-to-r from-slate-700 via-slate-600 to-slate-700 p-2 flex items-center gap-2 border-b border-slate-500">
          <Layers size={14} className="text-blue-400" />
          <span className="text-slate-100 text-xs font-bold uppercase tracking-widest">{tableData.label}</span>
        </div>
        <div className="p-2 space-y-1 bg-slate-800/50">
          {tableData.columns.map((col, i) => (
            <div key={i} className="text-[10px] font-mono text-slate-400 py-1 px-2 rounded bg-slate-900/50 border-l-2 border-slate-600 hover:border-blue-500 transition-colors">
              {col}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const nodeTypes = { tableNode: TableNode };

export default function DatabaseVisualizer() {
  const [selectedRelation, setSelectedRelation] = useState<Relation | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ root: true });

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const { nodes, edges } = useMemo(() => {
    if (!selectedRelation) return { nodes: [], edges: [] };

    const fromTable = SCHEMA.tables.find(t => t.id === selectedRelation.from);
    const toTable = SCHEMA.tables.find(t => t.id === selectedRelation.to);

    // Type Guard: Ensure both tables exist to satisfy TypeScript 'string' requirement
    if (!fromTable || !toTable) return { nodes: [], edges: [] };

    const nodes: Node[] = [
      {
        id: fromTable.id,
        type: 'tableNode',
        data: { label: fromTable.name, columns: fromTable.columns },
        position: { x: 100, y: 150 },
      },
      {
        id: toTable.id,
        type: 'tableNode',
        data: { label: toTable.name, columns: toTable.columns },
        position: { x: 550, y: 150 },
      },
    ];

    const edges: Edge[] = [
      {
        id: selectedRelation.id,
        source: fromTable.id,
        target: toTable.id,
        label: selectedRelation.type,
        animated: true,
        connectionLineType: ConnectionLineType.SmoothStep,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' },
        style: { stroke: '#60a5fa', strokeWidth: 3, filter: 'drop-shadow(0 0 8px #3b82f6)' },
      },
    ];

    return { nodes, edges };
  }, [selectedRelation]);

  return (
    <div className="flex h-screen w-full bg-[#020617] text-slate-300 overflow-hidden">
      {/* SIDEBAR */}
      <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl">
        <div className="p-6 bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-700 flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
            <Cpu className="text-blue-400" size={20} />
          </div>
          <h1 className="font-black text-lg tracking-tighter text-slate-100 uppercase">Neural Schema</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div 
            className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-800/40 hover:bg-slate-700/60 transition-all border border-slate-700/50"
            onClick={() => toggleExpand('root')}
          >
            {expanded.root ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <FolderOpen size={18} className="text-blue-400" />
            <span className="font-bold text-sm uppercase tracking-widest">Relations</span>
          </div>

          <AnimatePresence>
            {expanded.root && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="ml-4 space-y-1 border-l-2 border-slate-800 pl-4"
              >
                {SCHEMA.relations.map((rel) => (
                  <div 
                    key={rel.id}
                    onClick={() => setSelectedRelation(rel)}
                    className={`group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all ${
                      selectedRelation?.id === rel.id 
                      ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                      : 'hover:bg-slate-800 text-slate-500 hover:text-slate-200'
                    }`}
                  >
                    <Folder size={14} className="opacity-50" />
                    <span className="text-xs font-medium truncate">{rel.label}</span>
                    <span className="ml-auto text-[9px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                      {rel.type}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* CANVAS */}
      <div className="flex-1 relative bg-[#020617]">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-slate-900/80 backdrop-blur-xl px-6 py-2 rounded-full border border-slate-700 shadow-2xl flex items-center gap-4">
            <div className="relative">
              <Search size={16} className="text-slate-500" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
            </div>
            <div className="h-4 w-[1px] bg-slate-700" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
              {selectedRelation ? `Target: ${selectedRelation.label}` : 'Idle - Awaiting Selection'}
            </span>
            <div className="h-4 w-[1px] bg-slate-700" />
            <Zap size={16} className="text-yellow-500 animate-pulse" />
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
            <Background color="#1e293b" gap={25} />
            <Controls className="bg-slate-900 border-slate-700 fill-slate-300" />
          </ReactFlow>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-600 gap-6">
            <div className="relative">
              <div className="absolute inset-0 blur-2xl bg-blue-500/20 animate-pulse rounded-full" />
              <div className="relative p-8 rounded-full bg-slate-900 border border-slate-800 shadow-2xl">
                <Layers size={64} className="text-slate-700" />
              </div>
            </div>
            <p className="text-sm font-mono uppercase tracking-[0.3em] opacity-50">Initialize Schema Mapping</p>
          </div>
        )}
      </div>
    </div>
  );
}
