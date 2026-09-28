"use client";

import React, { useState, useMemo, ReactNode } from 'react';
import {
  User, Mail, Phone, MapPin, Eye, Edit2, Trash2,
  ChevronLeft, ChevronRight, ArrowUpDown, X, ChevronsLeft, ChevronsRight,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types & Interfaces ---
interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

interface SortConfig {
  key: keyof Client;
  direction: 'asc' | 'desc';
}

interface ModalState {
  type: 'view' | 'edit' | 'delete' | null;
  client: Client | null;
}

const MOCK_CLIENTS: Client[] = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  firstName: `First${i + 1}`,
  lastName: `Last${i + 1}`,
  email: `client${i + 1}@example.com`,
  phone: `+1 ${100 + i} 555 ${1000 + i}`,
  address: `${100 + i} Main St, City ${i + 1}`,
}));

const ClientManagement: React.FC = () => {
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'lastName', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);
  const [modalState, setModalState] = useState<ModalState>({ type: null, client: null });

  const handleSort = (key: keyof Client): void => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [clients, sortConfig]);

  const totalPages = Math.ceil(sortedClients.length / itemsPerPage);
  const activePage = Math.max(1, Math.min(currentPage, totalPages));

  const paginatedClients = sortedClients.slice(
    (activePage - 1) * itemsPerPage,
    activePage * itemsPerPage
  );

  const goToPage = (page: number): void => setCurrentPage(page);

  const getPaginationRange = (): (number | string)[] => {
    const range: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      range.push(1);
      if (activePage > 3) range.push('...');
      const start = Math.max(2, activePage - 1);
      const end = Math.min(totalPages - 1, activePage + 1);
      for (let i = start; i <= end; i++) range.push(i);
      if (activePage < totalPages - 2) range.push('...');
      range.push(totalPages);
    }
    return range;
  };

  const listMinHeight = itemsPerPage * 76;

  const deleteClient = (id: number): void => {
    setClients(prev => prev.filter(c => c.id !== id));
    setModalState({ type: null, client: null });
  };

  const updateClient = (updatedClient: Client): void => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    setModalState({ type: null, client: null });
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans text-gray-800">
      <div className="max-w-7xl mx-auto relative">

        {/* STICKY TOP SECTION - Direct child of the container for correct stickiness */}
        <div className="sticky top-0 z-30 bg-gray-50">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">Client Directory</h1>
          </div>
          {/* Wrapper to ensure horizontal alignment with the body */}
          <div className="overflow-x-auto no-scrollbar">
            <div className="grid grid-cols-[1fr_1fr_2fr_1.5fr_2fr_auto_auto] gap-4 px-6 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 text-left">
              <HeaderCell label="First Name" onClick={() => handleSort('firstName')} sortConfig={sortConfig} sortKey="firstName" />
              <HeaderCell label="Last Name" onClick={() => handleSort('lastName')} sortConfig={sortConfig} sortKey="lastName" />
              <HeaderCell label="Email" onClick={() => handleSort('email')} sortConfig={sortConfig} sortKey="email" />
              <HeaderCell label="Phone" onClick={() => handleSort('phone')} sortConfig={sortConfig} sortKey="phone" />
              <HeaderCell label="Address" onClick={() => handleSort('address')} sortConfig={sortConfig} sortKey="address" />
              <div className="col-span-2 text-left">Actions</div>
            </div>
          </div>
        </div>

        {/* HORIZONTAL SCROLL BODY */}
        <div className="overflow-x-auto pb-4">
          <div
            className="min-w-250 flex flex-col gap-0.5 mt-8"
            style={{ minHeight: `${listMinHeight}px` }}
          >
            <AnimatePresence mode='popLayout'>
              {paginatedClients.map((client, index) => (
                <motion.div
                  layout
                  key={client.id}
                  initial={{ opacity: 0, y: -100 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  transition={{
                    duration: 0.6,
                    delay: index * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                    layout: { duration: 0.4, ease: "easeInOut" }
                  }}
                  className="grid grid-cols-[1fr_1fr_2fr_1.5fr_2fr_auto_auto] gap-4 px-6 py-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 items-center border border-gray-100"
                >
                  <div className="flex items-center gap-2 font-medium text-gray-700 whitespace-nowrap">
                    <User size={16} className="text-gray-400" /> {client.firstName}
                  </div>
                  <div className="flex items-center gap-2 font-medium text-gray-700 whitespace-nowrap">
                    <User size={16} className="text-gray-400" /> {client.lastName}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 whitespace-nowrap">
                    <Mail size={16} className="text-gray-500" /> {client.email}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 whitespace-nowrap">
                    <Phone size={16} className="text-gray-500" /> {client.phone}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 whitespace-nowrap">
                    <MapPin size={16} className="text-gray-500" /> {client.address}
                  </div>
                  <div className="col-span-2 flex justify-start gap-2">
                    <ActionButton onClick={() => setModalState({ type: 'view', client })} icon={<Eye size={16} />} color="bg-blue-50 text-blue-600 hover:bg-blue-100" />
                    <ActionButton onClick={() => setModalState({ type: 'edit', client })} icon={<Edit2 size={16} />} color="bg-amber-50 text-amber-600 hover:bg-amber-100" />
                    <ActionButton onClick={() => setModalState({ type: 'delete', client })} icon={<Trash2 size={16} />} color="bg-red-50 text-red-600 hover:bg-red-100" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* STICKY BOTTOM FOOTER */}
        <div className="sticky bottom-0 z-30 bg-gray-50 border-t border-gray-200 py-4 mt-6">
          <div className="flex flex-col lg:flex-row items-center justify-between px-2 gap-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="hidden sm:inline">Rows per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-white border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700"
                >
                  {[5, 10, 20, 50].map(num => <option key={num} value={num}>{num}</option>)}
                </select>
              </div>
              <p className="text-sm text-gray-500 border-l pl-6 hidden md:block">
                Showing <span className="font-semibold text-gray-700">{((activePage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold text-gray-700">{Math.min(activePage * itemsPerPage, sortedClients.length)}</span> of <span className="font-semibold text-gray-700">{sortedClients.length}</span>
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => goToPage(1)} disabled={activePage === 1} className="p-2 rounded-lg border bg-white disabled:opacity-30 hover:bg-gray-50 transition-colors"><ChevronsLeft size={18} /></button>
              <button onClick={() => goToPage(activePage - 1)} disabled={activePage === 1} className="p-2 rounded-lg border bg-white disabled:opacity-30 hover:bg-gray-50 transition-colors"><ChevronLeft size={18} /></button>
              <div className="flex items-center gap-1 mx-2">
                {getPaginationRange().map((page, idx) => (
                  <button
                    key={idx}
                    onClick={() => typeof page === 'number' && goToPage(page)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${page === activePage ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : page === '...' ? 'text-gray-400 cursor-default' : 'bg-white border text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button onClick={() => goToPage(activePage + 1)} disabled={activePage === totalPages} className="p-2 rounded-lg border bg-white disabled:opacity-30 hover:bg-gray-50 transition-colors"><ChevronRight size={18} /></button>
              <button onClick={() => goToPage(totalPages)} disabled={activePage === totalPages} className="p-2 rounded-lg border bg-white disabled:opacity-30 hover:bg-gray-50 transition-colors"><ChevronsRight size={18} /></button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {modalState.type && modalState.client && (
          <Modal type={modalState.type} client={modalState.client} onClose={() => setModalState({ type: null, client: null })} onDelete={deleteClient} onUpdate={updateClient} />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Shared TSX Components ---
const HeaderCell: React.FC<{ label: string; onClick: () => void; sortConfig: SortConfig; sortKey: keyof Client }> = ({ label, onClick, sortConfig, sortKey }) => {
  const isSorted = sortConfig.key === sortKey;
  return (
    <div 
      onClick={onClick} 
      // w-full and justify-start are the keys here
      className="flex items-center justify-start w-full gap-1 cursor-pointer hover:text-gray-800 transition-colors text-left"
    >
      {label}
      <div className="flex items-center gap-0.5">
        <ArrowUpDown size={14} className={isSorted ? "text-gray-600" : "text-gray-400"} />
        {isSorted && (
          <ChevronUp 
            size={14} 
            strokeWidth={4} 
            className={`text-blue-600 transition-transform duration-300 ${sortConfig.direction === 'desc' ? 'rotate-180' : 'rotate-0'}`} 
          />
        )}
      </div>
    </div>
  );
};



const ActionButton: React.FC<{ onClick: () => void; icon: ReactNode; color: string }> = ({ onClick, icon, color }) => (
  <button onClick={onClick} className={`p-2 rounded-lg transition-all duration-200 ${color}`}>{icon}</button>
);

const Modal: React.FC<{ type: ModalState['type']; client: Client; onClose: () => void; onDelete: (id: number) => void; onUpdate: (client: Client) => void }> = ({ type, client, onClose, onDelete, onUpdate }) => {
  const [formData, setFormData] = useState<Client>({ ...client });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold capitalize">{type === 'view' ? 'Client Details' : type === 'edit' ? 'Edit Client' : 'Delete Client'}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          {type === 'view' && (
            <div className="space-y-4">
              <DetailRow icon={<User size={18} />} label="First Name" value={client.firstName} />
              <DetailRow icon={<User size={18} />} label="Last Name" value={client.lastName} />
              <DetailRow icon={<Mail size={18} />} label="Email" value={client.email} />
              <DetailRow icon={<Phone size={18} />} label="Phone" value={client.phone} />
              <DetailRow icon={<MapPin size={18} />} label="Address" value={client.address} />
              <button onClick={onClose} className="w-full py-3 mt-4 bg-gray-100 rounded-xl font-semibold hover:bg-gray-200 transition-colors">Close</button>
            </div>
          )}
          {type === 'edit' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="First Name" value={formData.firstName} onChange={v => setFormData({ ...formData, firstName: v })} />
                <Input label="Last Name" value={formData.lastName} onChange={v => setFormData({ ...formData, lastName: v })} />
              </div>
              <Input label="Email" value={formData.email} onChange={v => setFormData({ ...formData, email: v })} />
              <Input label="Phone" value={formData.phone} onChange={v => setFormData({ ...formData, phone: v })} />
              <Input label="Address" value={formData.address} onChange={v => setFormData({ ...formData, address: v })} />
              <div className="flex gap-3 mt-6">
                <button onClick={onClose} className="flex-1 py-3 bg-gray-100 rounded-xl font-semibold hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={() => onUpdate(formData)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">Save Changes</button>
              </div>
            </div>
          )}
          {type === 'delete' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
              <p className="text-gray-600 mb-6">Are you sure you want to delete <strong className="text-gray-900">{client.firstName} {client.lastName}</strong>?</p>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3 bg-gray-100 rounded-xl font-semibold hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={() => onDelete(client.id)} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors">Delete Client</button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const DetailRow: React.FC<{ icon: ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
    <div className="text-gray-400 mt-1">{icon}</div>
    <div><p className="text-xs text-gray-500 uppercase font-bold">{label}</p><p className="text-gray-700 font-medium">{value}</p></div>
  </div>
);

const Input: React.FC<{ label: string; value: string; onChange: (val: string) => void }> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">{label}</label>
    <input className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

export default ClientManagement;
