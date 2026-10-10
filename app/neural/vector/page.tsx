"use client";

import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  Edge,
  Node,
  ConnectionLineType,
  NodeProps,
  EdgeProps
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Play, RotateCcw, Database, Layers, Zap } from 'lucide-react';

// --- STRICT TYPES ---

interface TensorData {
  label: string;
  type: string;
  values: number[];
  icon: React.ReactNode;
  isProcessing?: boolean;
  isCompleted?: boolean;
  activeIndex?: number;
  completedIndices?: number[];
  impulseArriving?: boolean;
  arrivingIndex?: number;
}

interface CustomEdgeData {
  isActive?: boolean;
  impulseActive?: boolean;
}

interface MotionCSSProperties extends React.CSSProperties {
  offsetPath?: string;
}

// --- MATRIX NODE ---
const MatrixNode = ({ data }: NodeProps<TensorData>) => {
  return (
    <motion.div
      animate={{ scale: data.isProcessing ? 1.05 : (data.impulseArriving ? 1.08 : 1) }}
      className="relative group"
    >
      <div className={`absolute -inset-1 rounded-lg blur opacity-20 transition duration-1000 ${data.isProcessing ? 'bg-cyan-400 opacity-60' : (data.impulseArriving ? 'bg-yellow-300 opacity-90' : 'bg-blue-600')}`} />
      <div className={`relative px-4 py-3 bg-linear-to-br from-zinc-100 via-zinc-300 to-zinc-500 rounded-lg border transition-colors duration-300 ${data.impulseArriving ? 'border-yellow-300 shadow-[0_0_20px_rgba(253,224,71,0.5)]' : 'border-white/60'} shadow-xl flex flex-col items-center min-w-50`}>
        <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">{data.type}</div>
        <div className="flex items-center gap-2 text-zinc-800 font-bold text-sm mb-3">{data.icon} {data.label}</div>
        {/* UPDATED: grid-cols-5 to accommodate 5x5 */}
        <div className="w-full grid grid-cols-5 gap-1 bg-black/10 p-2 rounded border border-zinc-400/30">
          {data.values.map((v, i) => {
            const row = Math.floor(i / 5); // UPDATED: divide by 5
            const isActiveRow = row === data.activeIndex;
            return (
              <div key={i} className={`px-1 rounded border text-[8px] font-mono transition-all duration-300 text-center ${isActiveRow ? 'bg-cyan-400 text-black scale-110 z-10 shadow-sm border-cyan-600' : (data.impulseArriving && row < i / 5 + 1 ? 'bg-yellow-200/60 text-black border-yellow-400' : 'bg-zinc-200/50 text-zinc-800 border-zinc-400/50')
                }`}>{v.toFixed(1)}
              </div>
            );
          })}
        </div>
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-zinc-700 border-2 border-zinc-300" />
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-zinc-700 border-2 border-zinc-300" />
      </div>
    </motion.div>
  );
};

// --- METALLIC NODE ---
const MetallicNode = ({ data }: NodeProps<TensorData>) => {
  const isOutputNode = data.label.includes('Output');

  return (
    <motion.div
      animate={{ scale: data.isCompleted ? 1.05 : 1 }}
      className="relative group"
    >
      <div className={`absolute -inset-1 rounded-lg blur opacity-20 transition duration-1000 ${data.isCompleted ? 'bg-cyan-400 opacity-60' : 'bg-blue-700'}`} />

      <div className="relative px-4 py-3 bg-linear-to-br from-zinc-100 via-zinc-300 to-zinc-500 rounded-lg border border-white/60 shadow-xl flex flex-col items-center min-w-50">
        <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">{data.type}</div>
        <div className="flex items-center gap-2 text-zinc-800 font-bold text-sm mb-3">{data.icon} {data.label}</div>
        <div className="w-full bg-black/10 rounded p-2 font-mono text-[10px] text-zinc-700 flex flex-wrap justify-center gap-2 border border-zinc-400/30">
          {data.values.map((v, i) => {
            const isDone = data.completedIndices?.includes(i);
            const isArriving = data.arrivingIndex === i;

            return (
              <motion.span
                key={i}
                animate={{
                  backgroundColor: isArriving ? "#22d3ee" : (isDone ? "rgba(34,211,238,0.4)" : "rgba(0,0,0,0)"),
                  color: (isArriving || isDone) ? "#083344" : "#18181b",
                  scale: (isDone || isArriving) ? 1.1 : 1,
                  ...((data.impulseArriving && !isOutputNode) && {
                    backgroundColor: 'rgba(34,211,238,0.6)',
                    color: '#18181b'
                  })
                }}
                className={`px-1 rounded transition-all duration-300 border ${isDone
                  ? 'font-semibold border-[#ff0048] shadow-[0_0_4px_rgba(0,0,0,0.2)]'
                  : 'border-zinc-500'
                  }`}
              >
                {v.toFixed(2)}
              </motion.span>
            );
          })}
        </div>
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-zinc-700 border-2 border-zinc-300" />
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-zinc-700 border-2 border-zinc-300" />
      </div>
    </motion.div>
  );
};

// --- CUSTOM ANIMATED EDGE ---
const DataStreamEdge = ({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps<CustomEdgeData>) => {
  return (
    <g id={id}>
      <line x1={sourceX} y1={sourceY} x2={targetX} y2={targetY} className="stroke-zinc-700 stroke-[3px]" />
      <line
        x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}
        className={`stroke transition-opacity duration-500 ${data?.impulseActive ? 'stroke-cyan-300/30 stroke-[6px]' : 'stroke-transparent'}`}
      />

      <AnimatePresence>
        {data?.impulseActive && (
          <>
            <motion.circle
              key="impulse-main" r="6" fill="#fef08a"
              initial={{ offsetDistance: "0%", opacity: 1 }}
              animate={{ offsetDistance: "100%", opacity: [1, 1, 0.5] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "linear" }}
              style={{ offsetPath: `path('M${sourceX},${sourceY} L${targetX},${targetY}')` } as MotionCSSProperties}
              className="drop-shadow-[0_0_12px_rgba(253,224,71,0.9)]"
            />
            <motion.circle
              key="impulse-trail" r="3" fill="#67e8f9"
              initial={{ offsetDistance: "0%", opacity: 0.6 }}
              animate={{ offsetDistance: "100%", opacity: [0.6, 0.3, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "linear", delay: 0.15 }}
              style={{ offsetPath: `path('M${sourceX},${sourceY} L${targetX},${targetY}')` } as MotionCSSProperties}
              className="drop-shadow-[0_0_6px_rgba(103,232,249,0.8)]"
            />
            <motion.circle
              key="burst-ring" r="0" fill="none" stroke="#fef08a" strokeWidth="2"
              initial={{ cx: targetX, cy: targetY, r: 0, opacity: 0.9 }}
              animate={{ cx: targetX, cy: targetY, r: [0, 15, 30], opacity: [0.9, 0.5, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.9 }}
            />
          </>
        )}
      </AnimatePresence>
    </g>
  );
};

export default function MathHighlightTensorFlow() {
  const initialNodes: Node<TensorData>[] = useMemo(() => [
    {
      id: 'input',
      type: 'metallic',
      data: { label: 'Input Vector (x)', type: 'Tensor [1x5]', values: [0.5, -0.2, 0.8, 0.1, 0.4], icon: <Database size={14} /> },
      position: { x: -500, y: 200 }
    },
    {
      id: 'weights',
      type: 'matrix',
      data: { label: 'Weights (W)', type: 'Tensor [5x5]', values: [0.1, 0.5, 0.2, 0.4, 0.1, 0.8, 0.1, 0.3, 0.2, 0.6, 0.4, 0.2, 0.9, 0.1, 0.3, 0.3, 0.6, 0.1, 0.7, 0.2, 0.1, 0.4, 0.2, 0.5, 0.8], icon: <Layers size={14} /> },
      position: { x: 0, y: 200 }
    },
    {
      id: 'output',
      type: 'metallic',
      data: { label: 'Output Vector (y)', type: 'Tensor [1x5]', values: [0.0, 0.0, 0.0, 0.0, 0.0], icon: <Zap size={14} /> },
      position: { x: 500, y: 200 }
    },
  ], []);


  const initialEdges: Edge<CustomEdgeData>[] = useMemo(() => [
    { id: 'e1-2', source: 'input', target: 'weights', type: 'dataStream', data: { isActive: false, impulseActive: false } },
    { id: 'e2-3', source: 'weights', target: 'output', type: 'dataStream', data: { isActive: false, impulseActive: false } },
  ], []);

  const nodeTypes = useMemo(() => ({ metallic: MetallicNode, matrix: MatrixNode }), []);
  const edgeTypes = useMemo(() => ({ dataStream: DataStreamEdge }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [mathTrace, setMathTrace] = useState<{ equation: string, result: number } | null>(null);
  const [isComputing, setIsComputing] = useState(false);

  const runInference = useCallback(async () => {
    setIsComputing(true);

    // UPDATED: Generate random data for size 5 and 5x5
    const randomInput = Array.from({ length: 5 }, () => parseFloat((Math.random() * 2 - 1).toFixed(2)));
    const randomWeights = Array.from({ length: 25 }, () => parseFloat((Math.random() * 2 - 1).toFixed(2)));

    setNodes(nds => nds.map(n => {
      if (n.id === 'input') return { ...n, data: { ...n.data, values: randomInput } };
      if (n.id === 'weights') return { ...n, data: { ...n.data, values: randomWeights } };
      if (n.id === 'output') return { ...n, data: { ...n.data, values: [0, 0, 0, 0, 0], completedIndices: [], isCompleted: false } };
      return n;
    }));

    const input = randomInput;
    const weights = randomWeights;

    for (let i = 0; i < 5; i++) { // UPDATED: loop 5 times
      setEdges(eds => eds.map(e =>
        e.id === 'e1-2' ? { ...e, data: { ...e.data, impulseActive: true } } : e
      ));

      setNodes(nds => nds.map(n =>
        n.id === 'input' ? {
          ...n,
          data: {
            ...n.data,
            impulseArriving: true
          }
        } : n
      ));
      setNodes(nds => nds.map(n =>
        n.id === 'weights' ? { ...n, data: { ...n.data, impulseArriving: true } } : n
      ));

      await new Promise(r => setTimeout(r, 1050));

      setEdges(eds => eds.map(e =>
        e.id === 'e1-2' ? { ...e, data: { ...e.data, impulseActive: false } } : e
      ));

      setNodes(nds => nds.map(n =>
        n.id === 'input' ? {
          ...n,
          data: {
            ...n.data,
            impulseArriving: false
          }
        } : n
      ));
      setNodes(nds => nds.map(n =>
        n.id === 'weights' ? { ...n, data: { ...n.data, impulseArriving: false } } : n
      ));

      setEdges(eds => eds.map(e => e.id === 'e1-2' ? { ...e, data: { ...e.data, isActive: true } } : e));
      setNodes(nds => nds.map(n => n.id === 'weights' ? { ...n, data: { ...n.data, isProcessing: true, activeIndex: i } } : n));

      await new Promise(r => setTimeout(r, 800));
      setEdges(eds => eds.map(e => e.id === 'e1-2' ? { ...e, data: { ...e.data, isActive: false } } : e));

      let sum = 0;
      const terms = [];
      for (let j = 0; j < 5; j++) { // UPDATED: sum 5 terms
        const val = input[j] * weights[i * 5 + j]; // UPDATED: indexing by 5
        sum += val;
        terms.push(`(${input[j]} × ${weights[i * 5 + j]})`);
      }
      setMathTrace({ equation: terms.join(' + '), result: sum });

      setEdges(eds => eds.map(e => e.id === 'e2-3' ? { ...e, data: { ...e.data, impulseActive: true } } : e));

      await new Promise(r => setTimeout(r, 1000));

      setNodes(nds => nds.map(n => {
        if (n.id === 'output') {
          const newVals = [...n.data.values];
          newVals[i] = sum;
          const newCompleted = n.data.completedIndices ? [...n.data.completedIndices, i] : [i];
          return {
            ...n,
            data: {
              ...n.data,
              values: newVals,
              completedIndices: newCompleted,
              arrivingIndex: i 
            }
          };
        }
        return n;
      }));

      await new Promise(r => setTimeout(r, 400));
      setEdges(eds => eds.map(e => e.id === 'e2-3' ? { ...e, data: { ...e.data, impulseActive: false } } : e));
      setNodes(nds => nds.map(n => n.id === 'output' ? { ...n, data: { ...n.data, arrivingIndex: undefined } } : n));
    }

    setNodes(nds => nds.map(n => {
      if (n.id === 'weights') return { ...n, data: { ...n.data, isProcessing: false, activeIndex: undefined } };
      if (n.id === 'output') return { ...n, data: { ...n.data, isCompleted: true, isProcessing: false } };
      return n;
    }));
    setIsComputing(false);
  }, [setNodes, setEdges]);


  return (
    <main className="w-full h-screen bg-[#020617] text-slate-200 flex flex-col overflow-hidden">
      <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl flex items-center justify-between px-8 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]"><Cpu size={18} className="text-white" /></div>
          <h1 className="text-lg font-bold text-white">Tensor<span className="text-cyan-400">Flow</span> Math Trace</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => {
            setNodes(initialNodes.map(n => ({ ...n, data: { ...n.data, completedIndices: [] } })));
            setEdges(initialEdges);
            setMathTrace(null);
          }} className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-2 transition"><RotateCcw size={14} /> RESET</button>
          <button onClick={runInference} disabled={isComputing} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-cyan-500/20">
            {isComputing ? (
              <div className="w-3 h-3 border-2 border-white/20 border-t-white border-r-white border-b-white rounded-full animate-spin" />
            ) : (
              <Play size={14} />
            )}
            {isComputing ? 'COMPUTING...' : 'RUN INFERENCE'}
          </button>
        </div>
      </header>

      <div className="grow flex relative">
        <aside className="w-96 border-r border-slate-800 bg-slate-950/30 p-6 z-40 overflow-y-auto font-mono">
          <h2 className="text-sm font-bold mb-6 text-cyan-400 uppercase tracking-widest">Mathematical Calculation Trace</h2>
          <AnimatePresence mode="wait">
            {!mathTrace ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 rounded-lg border border-dashed border-slate-700 text-slate-500 text-sm text-center">
                Click &quot;Run Inference&quot; to see the dot-product math in real-time.
              </motion.div>
            ) : (
              <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="p-4 rounded-lg bg-zinc-900 border border-cyan-500/50 shadow-lg shadow-cyan-500/10">
                <div className="text-lg text-cyan-400 mb-2 font-bold uppercase">Calculating Output Index...</div>
                <div className="text-md text-slate-200 leading-relaxed mb-4">
                  <span className="text-cyan-700 font-bold text-lg mr-2">Eq:</span>
                  {mathTrace.equation}
                </div>
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-md text-slate-400 uppercase font-normal">Result:</span>
                  <span className="text-cyan-400">{mathTrace.result.toFixed(4)}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-8 p-4 rounded bg-slate-900/50 border border-slate-800">
            <h3 className="text-lg text-slate-400 uppercase font-bold mb-2">Formula</h3>
            <div className="text-2xl italic text-slate-300 font-serif">y<sub className="text-sm">i</sub> = ∑ (x<sub className="text-sm">j</sub> · w<sub className="text-sm">ij</sub>)</div>
          </div>
        </aside>

        <div className="grow relative bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} nodeTypes={nodeTypes} edgeTypes={edgeTypes} connectionLineType={ConnectionLineType.SmoothStep} fitView>
            <Background color="#1e3a8a" gap={30} />
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </main>
  );
}
