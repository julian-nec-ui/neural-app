"use client";
import React, { useState, useMemo } from 'react';
import ReactFlow, { 
  Background, Controls, Edge, Node, MarkerType, ConnectionLineType, NodeProps 
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, ChevronDown, Database, Zap, FolderOpen, Folder, Search, Cpu, Share2 
} from 'lucide-react';
import { SCHEMA, Relation } from './data';

// --- REDESIGNED CYBER-METALLIC NODE ---
const TableNode = ({ data }: NodeProps) => {
  const tableData = data as { label: string; columns: string[] };
  return (
    <div className="relative group">
      {/* Neon Outer Glow */}
      <div className="absolute -inset-1 bg-linear-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-20 group-hover:opacity-60 transition duration-500"></div>
      
      <div className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-56 overflow-hidden">
        {/* Brushed Metal Header */}
        <div className="bg-linear-to-b from-slate-700 via-slate-800 to-slate-900 p-3 flex items-center gap-3 border-b border-slate-600 shadow-inner">
          <div className="p-1 bg-blue-500 rounded shadow-[0_0_8px_#3b82f6]">
            <Database size={12} className="text-white" />
          </div>
          <span className="text-slate-200 text-xs font-black uppercase tracking-tighter italic">{tableData.label}</span>
        </div>
        {/* Glass Columns */}
        <div className="p-3 space-y-2 bg-slate-950/50 backdrop-blur-md">
          {tableData.columns.map((col, i) => (
            <div key={i} className="text-[10px] font-mono text-slate-400 py-1.5 px-2 rounded-sm bg-slate-900 border border-slate-800 flex items-center gap-2 hover:bg-slate-800 transition-colors group">
              <div className="w-1 h-1 rounded-full bg-slate-600 group-hover:bg-blue-400" />
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

    const fromT = SCHEMA.tables.find(t => t.id === selectedRelation.from);
    const toT = SCHEMA.tables.find(t => t.id === selectedRelation.to);

    if (!fromT || !toT) return { nodes: [], edges: [] };

    const nodes: Node[] = [
      { id: fromT.id, type: 'tableNode', data: { label: fromT.name, columns: fromT.columns }, position: { x: 100, y: 150 } },
      { id: toT.id, type: 'tableNode', data: { label: toT.name, columns: toT.columns }, position: { x: 700, y: 150 } },
    ];

    const edges: Edge[] = [];

    if (selectedRelation.type === 'N:M' && selectedRelation.via) {
      const viaT = SCHEMA.tables.find(t => t.id === selectedRelation.via);
      if (viaT) {
        nodes.push({
          id: viaT.id,
          type: 'tableNode',
          data: { label: viaT.name, columns: viaT.columns },
          position: { x: 400, y: 150 },
        });

        edges.push(
          { id: 'e1', source: fromT.id, target: viaT.id, animated: true, label: '1:N', markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' }, style: { stroke: '#60a5fa', strokeWidth: 3 } },
          { id: 'e2', source: toT.id, target: viaT.id, animated: true, label: '1:N', markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' }, style: { stroke: '#60a5fa', strokeWidth: 3 } }
        );
      }
    } else {
      edges.push({
        id: 'e1', source: fromT.id, target: toT.id, label: selectedRelation.type, animated: true, 
        markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' }, style: { stroke: '#60a5fa', strokeWidth: 3 }
      });
    }

    return { nodes, edges };
  }, [selectedRelation]);

  return (
    <div className="flex h-screen w-full bg-[#050810] text-slate-300 overflow-hidden">
      {/* SIDEBAR: Obsidian Metal */}
      <div className="w-80 bg-slate-950 border-r border-slate-800 flex flex-col shadow-[20px_0_50px_rgba(0,0,0,0.8)] z-20">
        <div className="p-6 bg-linear-to-b from-slate-900 to-slate-950 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            <Cpu className="text-white" size={20} />
          </div>
          <h1 className="font-black text-lg tracking-tighter text-slate-100 uppercase">Neural OS</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div 
            className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-slate-900/50 hover:bg-slate-800 transition-all border border-slate-800 group"
            onClick={() => toggleExpand('root')}
          >
            {expanded.root ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <FolderOpen size={18} className="text-blue-500 group-hover:text-blue-300" />
            <span className="font-bold text-sm uppercase tracking-widest text-slate-400 group-hover:text-slate-100">Relations</span>
          </div>

          <AnimatePresence>
            {expanded.root && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="ml-4 space-y-2 border-l border-slate-800 pl-4"
              >
                {SCHEMA.relations.map((rel) => (
                  <div 
                    key={rel.id}
                    onClick={() => setSelectedRelation(rel)}
                    className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-300 ${
                      selectedRelation?.id === rel.id 
                      ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-[1.02]' 
                      : 'hover:bg-slate-900 text-slate-500 hover:text-slate-300 border border-transparent hover:border-slate-800'
                    }`}
                  >
                    <Folder size={14} className="opacity-40" />
                    <span className="text-xs font-semibold truncate">{rel.label}</span>
                    <span className={`ml-auto text-[9px] px-2 py-0.5 rounded-full border font-mono ${
                      selectedRelation?.id === rel.id ? 'bg-blue-800 border-blue-400' : 'bg-slate-950 border-slate-700 text-slate-500'
                    }`}>
                      {rel.type}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* MAIN CANVAS */}
      <div className="flex-1 relative bg-[#050810]">
        {/* THE HUD MAGNIFIER: Glassmorphism Redesign */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-slate-950/40 backdrop-blur-2xl px-8 py-3 rounded-2xl border border-slate-700/50 shadow-[0_0_40px_rgba(0,0,0,0.8)] flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="relative p-2 bg-slate-800 rounded-full border border-slate-700">
                <Search size={16} className="text-blue-400" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                {selectedRelation ? `Analyzing: ${selectedRelation.label}` : 'System Idle'}
              </span>
            </div>
            <div className="h-5 w-[1px] bg-slate-700" />
            <div className="flex items-center gap-2 text-blue-400">
              <Zap size={14} className="animate-pulse" />
              <span className="text-[10px] font-bold uppercase">Active Scan</span>
            </div>
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
            <Background color="#1e293b" gap={30} />
            <Controls className="bg-slate-900 border-slate-800 fill-slate-300" />
          </ReactFlow>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-700 gap-8">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="relative"
            >
              <div className="absolute inset-0 blur-3xl bg-blue-600/20 rounded-full" />
              <div className="relative p-12 rounded-full bg-slate-900 border border-slate-800 shadow-inner">
                <Database size={80} className="text-slate-800" />
              </div>
            </motion.div>
            <p className="text-xs font-mono uppercase tracking-[0.5em] opacity-30">Awaiting Schema Input</p>
          </div>
        )}
      </div>
    </div>
  );
}
