"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { UserPlus, Table as TableIcon, 
  ArrowUpDown, ChevronLeft, ChevronRight, 
  Trash2, Edit3, Search 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Strict Types ---
interface Investor {
  id: string;
  inNumber: number;
  firstName: string;
  email: string;
  phone: string;
  investSum: number;
  receivedAt: string;
}

interface FormData {
  firstName: string;
  email: string;
  phone: string;
  investSum: number;
  inNumber: number;
}

interface SortConfig {
  key: keyof Investor;
  direction: 'asc' | 'desc';
}

// --- Constants ---
const METALLIC_ROYAL_BLUE = `bg-linear-to-r from-[#002366] via-[#4169E1] to-[#002366]`;
const ITEMS_PER_PAGE = 5;

const InvestorsPage: React.FC = () => {
  // --- State ---
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [view, setView] = useState<'table' | 'form'>('table');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    email: '',
    phone: '',
    investSum: 0,
    inNumber: 0,
  });

  // --- WebSocket Logic ---
  useEffect(() => {
    // Replace with your actual Spring Boot WebSocket endpoint
    const socket = new WebSocket('wss://echo.websocket.events');

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const newInvestor: Investor = {
          id: Math.random().toString(36).substring(2, 11),
          inNumber: data.inNumber || Math.floor(Math.random() * 1000),
          firstName: data.firstName || "Unknown",
          email: data.email || "N/A",
          phone: data.phone || "N/A",
          investSum: data.investSum || 0,
          receivedAt: new Date().toLocaleString(),
        };
        setInvestors((prev) => [newInvestor, ...prev]);
      } catch (err) {
        console.error("WebSocket Data Error:", err);
      }
    };

    return () => socket.close();
  }, []);

  // --- Logic: Search, Sort, Paginate ---
  const filteredAndSortedInvestors = useMemo(() => {
    // 1. Filter
    const result = investors.filter(
      (inv) =>
        inv.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 2. Sort
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [investors, searchQuery, sortConfig]);

  const paginatedInvestors = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedInvestors.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedInvestors, currentPage]);

  // --- Handlers ---
  const handleSort = (key: keyof Investor) => {
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newInvestor: Investor = {
      ...formData,
      id: Math.random().toString(36).substring(2, 11),
      receivedAt: new Date().toLocaleString(),
    };
    setInvestors((prev) => [newInvestor, ...prev]);
    setView('table');
    setFormData({ firstName: '', email: '', phone: '', investSum: 0, inNumber: 0 });
  };

  const deleteInvestor = (id: string) => {
    setInvestors((prev) => prev.filter((inv) => inv.id !== id));
  };

  return (
    <div className="min-h-screen w-full bg-[#0f172a] text-slate-200 p-4 sm:p-8 font-sans relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* --- Header --- */}
      <div className="relative z-10 max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-white">
            INVESTOR <span className="text-indigo-400">PORTFOLIO</span>
          </h1>
          <p className="text-slate-500 uppercase tracking-widest text-xs font-bold mt-1">
            Live Stream Management
          </p>
        </div>

        <button 
          onClick={() => setView(view === 'table' ? 'form' : 'table')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
            view === 'table' 
              ? `${METALLIC_ROYAL_BLUE} text-white shadow-[0_0_20px_rgba(65,105,225,0.4)]` 
              : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
          }`}
        >
          {view === 'table' ? <UserPlus size={20}/> : <TableIcon size={20}/>}
          {view === 'table' ? "Register Investor" : "View Database"}
        </button>
      </div>

      {/* --- Main Content --- */}
      <div className="relative z-10 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {view === 'table' ? (
            <motion.div 
              key="table-view"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Filters */}
              <div className="flex justify-between items-center bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search investors..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg focus:border-indigo-500 outline-none transition-all text-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="hidden sm:block text-xs text-slate-500 font-mono">
                  Active Records: {filteredAndSortedInvestors.length}
                </div>
              </div>

              {/* Table */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800/50 border-b border-white/10">
                        {[
                          { label: 'Date', key: 'receivedAt' },
                          { label: 'IN #', key: 'inNumber' },
                          { label: 'Name', key: 'firstName' },
                          { label: 'Email', key: 'email' },
                          { label: 'Phone', key: 'phone' },
                          { label: 'Sum', key: 'investSum' },
                          { label: 'Actions', key: 'actions' },
                        ].map((col) => (
                          <th 
                            key={col.key} 
                            onClick={() => col.key !== 'actions' && handleSort(col.key as keyof Investor)}
                            className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-indigo-400 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {col.label}
                              {sortConfig?.key === col.key && <ArrowUpDown size={12} className="text-indigo-400" />}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence initial={false}>
                        {paginatedInvestors.map((inv) => (
                          <motion.tr 
                            key={inv.id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group"
                          >
                            <td className="p-4 text-sm text-slate-400">{inv.receivedAt}</td>
                            <td className="p-4 text-sm font-mono text-indigo-300">#{inv.inNumber}</td>
                            <td className="p-4 text-sm font-medium text-white">{inv.firstName}</td>
                            <td className="p-4 text-sm text-slate-400">{inv.email}</td>
                            <td className="p-4 text-sm text-slate-400">{inv.phone}</td>
                            <td className="p-4 text-sm font-bold text-emerald-400">${inv.investSum.toLocaleString()}</td>
                            <td className="p-4 text-sm">
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 hover:bg-indigo-500/20 rounded-lg text-indigo-400 transition-colors"><Edit3 size={16}/></button>
                                <button onClick={() => deleteInvestor(inv.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"><Trash2 size={16}/></button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="p-4 flex items-center justify-between bg-white/5 border-t border-white/10">
                  <p className="text-xs text-slate-500">
                    Page {currentPage} of {Math.ceil(filteredAndSortedInvestors.length / ITEMS_PER_PAGE) || 1}
                  </p>
                  <div className="flex gap-2">
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                      className="p-2 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button 
                      disabled={currentPage * ITEMS_PER_PAGE >= filteredAndSortedInvestors.length}
                      onClick={() => setCurrentPage(p => p + 1)}
                      className="p-2 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="form-view"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-white">New Investor Entry</h2>
                  <p className="text-slate-400 text-sm">Register a new client in the system.</p>
                </div>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">First Name</label>
                    <input 
                      className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-indigo-500 outline-none text-white"
                      value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                    <input 
                      type="email"
                      className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-indigo-500 outline-none text-white"
                      value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                    <input 
                      className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-indigo-500 outline-none text-white"
                      value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">IN Number</label>
                    <input 
                      type="number"
                      className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-indigo-500 outline-none text-white"
                      value={formData.inNumber} onChange={e => setFormData({...formData, inNumber: Number(e.target.value)})} required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Investment Sum ($)</label>
                    <input 
                      type="number"
                      className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-indigo-500 outline-none text-white"
                      value={formData.investSum} onChange={e => setFormData({...formData, investSum: Number(e.target.value)})} required
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-4 mt-4">
                    <button 
                      type="submit" 
                      className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${METALLIC_ROYAL_BLUE} hover:shadow-[0_0_20px_rgba(65,105,225,0.4)]`}
                    >
                      Create Record
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setView('table')}
                      className="px-6 py-3 rounded-xl font-bold bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default InvestorsPage;
