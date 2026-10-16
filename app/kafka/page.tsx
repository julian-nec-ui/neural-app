"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  UserPlus, Table as TableIcon, 
  ArrowUpDown, ChevronLeft, ChevronRight, 
  Trash2, Edit3, Search, RotateCw, ChevronDown 
} from 'lucide-react';

import { Client as StompClient } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { motion, AnimatePresence } from 'framer-motion';

// --- Strict Type Definitions ---
interface Investor {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  initialInvestmentFund: number;
  investingStrategy: string;
}

interface FormData {
  firstName: string;
  lastName: string;
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
const METALLIC_ROYAL_BLUE = `bg-linear-to-r from-[#0C3E9C] via-[#4570F2] to-[#063895]`;
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const InvestorsPage: React.FC = () => {
  // --- State Management ---
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [view, setView] = useState<'table' | 'form'>('table');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    investSum: 0,
    inNumber: 0,
  });

  // --- API Fetch Logic ---
  const fetchInvestors = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("http://localhost:8081/api/investors");
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      setInvestors(data);
    } catch (err) {
      console.error("Error fetching investors:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // --- WebSocket Integration ---
  useEffect(() => {
    const stompClient: StompClient = new StompClient({
      brokerURL: "ws://localhost:8081/api/ws",
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    });

    stompClient.webSocketFactory = () => new SockJS("http://localhost:8081/api/ws");

    stompClient.onConnect = () => {
      fetchInvestors();

      stompClient.subscribe("/topic/investorCreated", (message) => {
        try {
          const newInvestor = JSON.parse(message.body) as Investor;
          setInvestors((prevInvestors) => {
            if(prevInvestors.some((inv) => inv.id === newInvestor.id)) {
              return prevInvestors;
            }
            return [...prevInvestors, newInvestor];
          });
        } catch (e) { console.error(e); }
      });

      stompClient.subscribe("/topic/investorRemoved", (message) => {
        const deletedInvestor = JSON.parse(message.body) as { id: number };
        setInvestors((prevInvestors) => prevInvestors.filter((inv) => inv.id !== deletedInvestor.id));
      });
    };
    
    stompClient.activate();

    return () => {
      if (stompClient.active) {
        stompClient.deactivate();
      }
    };
  }, [fetchInvestors]);

  // --- Logic: Search, Sort, Paginate ---
  const filteredAndSortedInvestors = useMemo(() => {
    const result = investors.filter(
      (inv) =>
        inv.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedInvestors.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedInvestors, currentPage, itemsPerPage]);

  // --- Event Handlers ---
  const handleSort = (key: keyof Investor) => {
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newInvestor: Investor = {
      id: Number(formData.inNumber),
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phoneNumber: formData.phone,
      initialInvestmentFund: formData.investSum,
      investingStrategy: 'Long Term Balanced'
    };
    setInvestors((prev) => [newInvestor, ...prev]);
    setView('table');
    setFormData({ firstName: '', lastName: '', email: '', phone: '', investSum: 0, inNumber: 0 });
  };

  const deleteInvestor = (id: number) => {
    setInvestors((prev) => prev.filter((inv) => inv.id !== id));
  };

  return (
    <div className="min-h-screen w-full bg-[#0f172a] text-slate-200 p-4 sm:p-8 font-sans relative overflow-hidden">
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-white">
            INVESTOR <span className="text-indigo-400">PORTFOLIO</span>
          </h1>
          <p className="text-slate-500 uppercase tracking-widest text-xs font-bold mt-1">
            Real-time Portfolio Management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button 
            onClick={fetchInvestors}
            disabled={isRefreshing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`h-12 w-12 flex items-center justify-center rounded-xl font-bold transition-all duration-300 border border-slate-700 ${
              isRefreshing 
                ? `bg-slate-800 text-slate-500 cursor-not-allowed` 
                : `bg-slate-800 text-white hover:bg-slate-700 hover:border-indigo-500`
            }`}
            title="Refresh Data"
          >
            <RotateCw size={20} className={`transition-all duration-500 ${isRefreshing ? "animate-spin" : ""}`} />
          </motion.button>

          <motion.button 
            onClick={() => setView(view === 'table' ? 'form' : 'table')}
            whileHover={view === 'table' ? { scale: 1.02, y: -2 } : { scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
            className={`relative group overflow-hidden flex items-center gap-2 px-6 py-3 rounded-xl font-bold ${
              view === 'table' 
                ? `${METALLIC_ROYAL_BLUE} text-white border border-white/20 shadow-[0_0_20px_rgba(65,105,225,0.4)] hover:shadow-[0_0_30px_rgba(65,105,225,0.6)] hover:brightness-110` 
                : `bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 transition-colors`
            }`}
          >
            {view === 'table' && (
              <motion.div 
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute inset-0 w-1/2 h-full bg-linear-to-r from-transparent via-white/30 to-transparent -skew-x-12 pointer-events-none"
              />
            )}

            <span className="relative z-10 flex items-center gap-2">
              {view === 'table' ? <UserPlus size={20}/> : <TableIcon size={20}/>}
              {view === 'table' ? "Register Investor" : "View Database"}
            </span>
          </motion.button>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {view === 'table' ? (
            <motion.div 
              key="table-view"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-start items-center bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search by name or email..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg focus:border-indigo-500 outline-none transition-all text-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                {/* Table height reduced from 580px to 560px */}
                <div className="overflow-x-auto h-135">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-800/50 border-b border-white/10">
                      <tr className="bg-slate-800/90 backdrop-blur-sm sticky top-0 z-20">
                        {[
                          { label: 'ID #', key: 'id' },
                          { label: 'First Name', key: 'firstName' },
                          { label: 'Last Name', key: 'lastName' },
                          { label: 'Email', key: 'email' },
                          { label: 'Phone', key: 'phoneNumber' },
                          { label: 'Investment', key: 'initialInvestmentFund' },
                          { label: 'Strategy', key: 'investingStrategy' },
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
                    <tbody className="divide-y divide-white/5">
                      <AnimatePresence initial={false}>
                        {paginatedInvestors.map((inv) => (
                          <motion.tr 
                            key={inv.id}
                            layout
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="hover:bg-white/3 transition-colors group"
                          >
                            <td className="p-4 text-sm font-mono text-indigo-300">#{inv.id}</td>
                            <td className="p-4 text-sm font-medium text-white">{inv.firstName}</td>
                            <td className="p-4 text-sm font-medium text-white">{inv.lastName}</td>
                            <td className="p-4 text-sm text-slate-400">{inv.email}</td>
                            <td className="p-4 text-sm text-slate-400">{inv.phoneNumber}</td>
                            <td className="p-4 text-sm font-bold text-emerald-400">${inv.initialInvestmentFund.toLocaleString()}</td>
                            <td className="p-4 text-sm font-bold text-emerald-400">{inv.investingStrategy}</td>
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

                <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/5 border-t border-white/10">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6">
                    <p className="text-xs text-slate-500 font-medium">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedInvestors.length)} of {filteredAndSortedInvestors.length}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono border-l border-white/10 pl-6">
                      <span className="uppercase font-bold">Show:</span>
                      <div className="relative group">
                        <select 
                          value={itemsPerPage} 
                          onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                          className="appearance-none bg-linear-to-r from-slate-800 via-slate-700 to-slate-800 border border-slate-600 rounded px-2 py-1 pr-8 outline-none focus:border-indigo-500 text-white cursor-pointer transition-all duration-300 hover:bg-linear-to-r hover:from-[#003d3d] hover:via-[#008b8b] hover:to-[#003d3d] hover:border-cyan-500"
                        >
                          {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size} className="bg-slate-900">{size}</option>)}
                        </select>
                        <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none transition-colors group-hover:text-cyan-300" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-xs text-slate-500 font-mono hidden md:block">
                      Total Records: {filteredAndSortedInvestors.length}
                    </div>
                    <div className="flex gap-3">
                      <button 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition-all group"
                      >
                        <ChevronLeft size={24} className="text-indigo-200 group-hover:text-white transition-colors" />
                      </button>
                      <button 
                        disabled={currentPage * itemsPerPage >= filteredAndSortedInvestors.length}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition-all group"
                      >
                        <ChevronRight size={24} className="text-indigo-200 group-hover:text-white transition-colors" />
                      </button>
                    </div>
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
                    <label className="text-xs font-bold text-slate-500 uppercase">Last Name</label>
                    <input 
                      className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-indigo-500 outline-none text-white"
                      value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required
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
                    <label className="text-xs font-bold text-slate-500 uppercase">ID Number</label>
                    <input 
                      type="number"
                      className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-indigo-500 outline-none text-white"
                      value={formData.inNumber} onChange={e => setFormData({...formData, inNumber: Number(e.target.value)})} required
                    />
                  </div>
                  <div className="space-y-2">
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
