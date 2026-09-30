"use client";

import React, { useState, useEffect, useMemo } from "react";
import { clientService } from "../service/client-service";
import { SortableHeader } from "./SortableHeader";
import { PaginationBar } from "./PaginationBar";

import {
  Trash2,
  Eye,
  Edit,
  X,
  AlertTriangle,
  UserPlus,
  User,
  Mail,
  MapPin,
  Phone,
  Hash,
  Route,
  Building2,
  Landmark,
  Globe
} from "lucide-react";

import axios from "axios";
import { Client as StompClient } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { AnimatePresence, motion } from "framer-motion";

// --- TYPES ---
interface Address {
  id?: number;
  streetNumber: string;
  streetName: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  clientId?: number;
}

interface Client {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addresses: Address[];
}

interface ClientRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: Address;
}

export default function ClientPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [newClient, setNewClient] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: {
      streetNumber: "",
      streetName: "",
      city: "",
      state: "",
      zip: "",
      country: "",
    }
  });

  const handleSaveNewClient = async () => {
    try {
      const payload: ClientRequest = {
        firstName: newClient.firstName,
        lastName: newClient.lastName,
        email: newClient.email,
        phone: newClient.phone,
        address: { ...newClient.address }
      };

      const response = await clientService.createClient(payload);
      const createdClient: Client = response.data;

      setClients((prev) => {
        if (prev.some((c) => c.id === createdClient.id)) return prev;
        return [...prev, createdClient];
      });

      setNewClient({
        firstName: "", lastName: "", email: "", phone: "",
        address: { streetNumber: "", streetName: "", city: "", state: "", zip: "", country: "" }
      });
      setIsAddOpen(false);
    } catch (err) {
      console.error("Error saving client:", err);
    }
  };

  useEffect(() => {
    const stompClient = new StompClient({
      brokerURL: "ws://localhost:8081/api/ws",
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    stompClient.webSocketFactory = () => new SockJS("http://localhost:8081/api/ws");
    stompClient.onConnect = () => {
      stompClient.subscribe("/topic/clientsCreate", (msg) => {
        const data = JSON.parse(msg.body) as Client;
        setClients((prev) => prev.some(c => c.id === data.id) ? prev : [...prev, data]);
      });
      stompClient.subscribe("/topic/clientsDelete", (msg) => {
        const data = JSON.parse(msg.body) as { id: number };
        setClients((prev) => prev.filter(c => c.id !== data.id));
      });
    };
    stompClient.activate();

    return () => { 
      stompClient.deactivate(); 
    };
  }, []);

  useEffect(() => {
    clientService.getAllClients().then(res => setClients(res.data)).catch(console.error);
  }, []);

  const isFormValid = useMemo(() => {
    const vals = [newClient.firstName, newClient.lastName, newClient.email, newClient.phone, ...Object.values(newClient.address)];
    return vals.every(v => String(v).trim() !== "");
  }, [newClient]);

  const [sortConfig, setSortConfig] = useState<{ key: keyof Client | ""; direction: "asc" | "desc" | null }>({ key: "", direction: null });

  const handleSort = (key: keyof Client) => {
    if (key === 'addresses') {
      setSortConfig(prev => ({
        key: 'addresses',
        direction: prev.key === 'addresses' && prev.direction === "asc" ? "desc" : "asc"
      }));
    } else {
      setSortConfig(prev => ({
        key,
        direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
      }));
    }
  };

  const currentClients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = clients.slice(start, start + itemsPerPage);

    if (!sortConfig.key || !sortConfig.direction) return pageItems;

    return [...pageItems].sort((a, b) => {
      const key = sortConfig.key as keyof Client;
      
      if (key === 'addresses') {
        const valA = a.addresses?.[0]?.city?.toLowerCase() || "";
        const valB = b.addresses?.[0]?.city?.toLowerCase() || "";
        
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      }
      
      const getVal = (obj: Client, k: keyof Client) => {
        const v = obj[k];
        return typeof v === 'string' ? v.toLowerCase() : String(v);
      };
      
      const valA = getVal(a, key);
      const valB = getVal(b, key);
      
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [clients, sortConfig, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(clients.length / itemsPerPage);

  const handleDeleteConfirm = async () => {
    if (!clientToDelete?.id) return;
    try {
      await clientService.deleteClient(clientToDelete.id);
      setClients(prev => prev.filter(c => c.id !== clientToDelete.id));
      setIsDeleteOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const renderAddress = (address: Address | undefined) => {
    if (!address) return <span className="text-slate-400 italic">N/A</span>;
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-slate-600 font-medium">{address.streetNumber} {address.streetName}</span>
        <span className="text-xs text-slate-400 block leading-tight">{address.city}, {address.state} {address.zip}</span>
        <span className="text-xs text-slate-400 block leading-tight">{address.country}</span>
      </div>
    );
  };

  const getFallbackData = () => {
    return {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "(555) 123-4567",
      address: {
        streetNumber: "123",
        streetName: "Main Street",
        city: "New York",
        state: "NY",
        zip: "10001",
        country: "United States"
      }
    };
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Client Management</h1>
            <p className="text-slate-500 text-sm mt-1">Manage your customer database and contact details.</p>
          </div>
          <button 
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-semibold" 
            onClick={async () => {
              try {
                const res = await axios.get("https://randomuser.me/api/");
                const user = res.data.results[0];
                setNewClient({
                  firstName: user.name.first, 
                  lastName: user.name.last, 
                  email: user.email, 
                  phone: user.phone,
                  address: { 
                    streetNumber: String(user.location.street.number), 
                    streetName: user.location.street.name, 
                    city: user.location.city, 
                    state: user.location.state, 
                    zip: user.location.postcode, 
                    country: user.location.country 
                  }
                });
              } catch (e) {
                setNewClient(getFallbackData());
              }
              setIsAddOpen(true);
            }}
          >
            <UserPlus size={20} /> Add Client
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 mb-6 overflow-hidden">
          <div className="overflow-x-auto h-[calc(100vh-300px)] overflow-y-auto">
            <table className="w-full text-left border-collapse table-auto">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
                <tr className="whitespace-nowrap">
                  <SortableHeader label="First Name" keyField="firstName" onSort={handleSort} sortConfig={sortConfig} />
                  <SortableHeader label="Last Name" keyField="lastName" onSort={handleSort} sortConfig={sortConfig} />
                  <SortableHeader label="Email" keyField="email" onSort={handleSort} sortConfig={sortConfig} />
                  <SortableHeader label="Phone" keyField="phone" onSort={handleSort} sortConfig={sortConfig} />
                  <SortableHeader label="Address" keyField="addresses" onSort={handleSort} sortConfig={sortConfig} />
                  <th className="px-6 py-4 text-left sticky right-0 bg-slate-50 shadow-[-10px_0_10px_-5px_rgba(0,0,0,0.05)] z-10 text-sm font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence mode="popLayout">
                  {currentClients.map((client, idx) => (
                    <motion.tr 
                      key={client.id} 
                      layout 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1, backgroundColor: idx % 2 ? "#ffffff" : "#fcfcfd" }} 
                      exit={{ opacity: 0 }}
                      whileHover={{ scale: 1.005, backgroundColor: "#f8fafc" }}
                      className="group cursor-pointer whitespace-nowrap transition-colors"
                    >
                      <td className="px-6 py-2 text-slate-700 font-medium border-r border-slate-100">{client.firstName}</td>
                      <td className="px-6 py-2 text-slate-700 font-medium border-r border-slate-100">{client.lastName}</td>
                      <td className="px-6 py-2 text-slate-600 font-medium border-r border-slate-100">{client.email}</td>
                      <td className="px-6 py-2 text-slate-600 font-medium border-r border-slate-100">{client.phone}</td>
                      <td className="px-6 py-2 border-r border-slate-100 font-medium">{renderAddress(client.addresses?.[0])}</td>
                      <td className="px-6 py-2 sticky right-0 bg-inherit shadow-[-10px_0_10px_-5px_rgba(0,0,0,0.05)] z-10">
                        <div className="flex justify-start gap-2">
                          <button onClick={() => { setSelectedClient(client); setIsViewOpen(true); }} className="p-2 text-[#0073d7] hover:bg-indigo-50 rounded-lg transition-all"><Eye size={18} /></button>
                          <button className="p-2 text-[#00846e] hover:bg-[#eff3f3] rounded-lg transition-all"><Edit size={18} /></button>
                          <button onClick={() => { setClientToDelete(client); setIsDeleteOpen(true); }} className="p-2 text-[#fa0026] hover:bg-[#fdeef0] rounded-lg transition-all"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={clients.length}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
        />
      </div>

      {/* VIEW MODAL */}
      {isViewOpen && selectedClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black/15 z-0" onClick={() => setIsViewOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Client Details</h2>
              <button onClick={() => setIsViewOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-2">
              <DetailRow label="First Name" value={selectedClient.firstName} icon={<User size={22} />} />
              <DetailRow label="Last Name" value={selectedClient.lastName} icon={<User size={22} />} />
              <DetailRow label="Email" value={selectedClient.email} icon={<Mail size={22} />} />
              <DetailRow label="Phone" value={selectedClient.phone} icon={<Phone size={22} />} />
              <div className="flex justify-start py-3 border-b border-slate-50 last:border-0 gap-6">
                <div className="flex items-center gap-2 text-slate-800 font-bold shrink-0">
                  <span className="text-[#0060d6]"><MapPin size={22} /></span>
                  <span className="text-slate-700 font-medium shrink-0 w-32 text-left">Address</span>
                </div>
                <div className="flex flex-col text-slate-800 font-bold">
                  <span>{selectedClient.addresses?.[0]?.streetNumber} {selectedClient.addresses?.[0]?.streetName}</span>
                  <span className="text-sm font-medium text-slate-500">{selectedClient.addresses?.[0]?.city}, {selectedClient.addresses?.[0]?.state} {selectedClient.addresses?.[0]?.zip}</span>
                  <span className="text-sm font-medium text-slate-500">{selectedClient.addresses?.[0]?.country}</span>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 text-right">
              <button onClick={() => setIsViewOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition font-medium">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE DIALOG */}
      {isDeleteOpen && clientToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black/15 z-0" onClick={() => setIsDeleteOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
            <div className="bg-rose-100 text-rose-600 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={28} /></div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Delete Client?</h2>
            <p className="text-slate-600 font-medium mb-6">Are you sure you want to delete <span className="text-indigo-600">{clientToDelete.firstName} {clientToDelete.lastName}</span>?</p>
            <span className="flex items-center justify-center gap-2 text-rose-500 font-semibold text-sm mb-8 uppercase tracking-wide">
              <AlertTriangle size={18} /> This action is permanent
            </span>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition font-semibold">Cancel</button>
              <button onClick={handleDeleteConfirm} className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition font-semibold">Delete Now</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black/15 z-0" onClick={() => setIsAddOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
            <div className="relative flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Add New Client</h2>
              <div className="flex gap-4 items-center">
                <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-rose-500"><X size={23} /></button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-16">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase"><User size={24} className="text-indigo-600" /> Client Information</div>
                  <InputField label="First Name" value={newClient.firstName} onChange={v => setNewClient({...newClient, firstName: v})} icon={<User size={20} />} />
                  <InputField label="Last Name" value={newClient.lastName} onChange={v => setNewClient({...newClient, lastName: v})} icon={<User size={20} />} />
                  <InputField label="Email" value={newClient.email} onChange={v => setNewClient({...newClient, email: v})} icon={<Mail size={20} />} />
                  <InputField label="Phone" value={newClient.phone} onChange={v => setNewClient({...newClient, phone: v})} icon={<Phone size={20} />} />
                </div>
                <div className="hidden md:block w-px bg-slate-200 self-stretch" />
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase"><MapPin size={24} className="text-indigo-600" /> Address Details</div>
                  <div className="flex gap-3">
                    <div className="w-1/3"><InputField label="No." value={newClient.address.streetNumber} onChange={v => setNewClient({...newClient, address: {...newClient.address, streetNumber: v}})} icon={<Hash size={16} />} /></div>
                    <div className="w-2/3"><InputField label="Street Name" value={newClient.address.streetName} onChange={v => setNewClient({...newClient, address: {...newClient.address, streetName: v}})} icon={<Route size={16} />} /></div>
                  </div>
                  <InputField label="City" value={newClient.address.city} onChange={v => setNewClient({...newClient, address: {...newClient.address, city: v}})} icon={<Building2 size={20} />} />
                  <InputField label="State" value={newClient.address.state} onChange={v => setNewClient({...newClient, address: {...newClient.address, state: v}})} icon={<Landmark size={20} />} />
                  <div className="flex gap-3">
                    <div className="flex-1"><InputField label="Zip" value={newClient.address.zip} onChange={v => setNewClient({...newClient, address: {...newClient.address, zip: v}})} icon={<MapPin size={20} />} /></div>
                    <div className="flex-1"><InputField label="Country" value={newClient.address.country} onChange={v => setNewClient({...newClient, address: {...newClient.address, country: v}})} icon={<Globe size={20} />} /></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition font-medium">Cancel</button>
              <button onClick={handleSaveNewClient} disabled={!isFormValid} className={`px-6 py-2 rounded-xl font-semibold transition ${isFormValid ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-slate-400 text-white cursor-not-allowed"}`}>Save Client</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InputField({ label, value, onChange, icon }: { label: string, value: string, onChange: (v: string) => void, icon: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-bold text-slate-500 uppercase ml-1">{label}</label>
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 group-hover:text-indigo-800 transition-all">{icon}</div>
        <input 
          className="w-full pl-10 p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
          value={value} 
          onChange={e => onChange(e.target.value)} 
        />
      </div>
    </div>
  );
}

interface DetailRowProps {
  label: string;
  value: string | number | null | undefined;
  icon?: React.ReactNode;
}

function DetailRow({ label, value, icon }: DetailRowProps) {
  return (
    <div className="flex justify-start py-3 border-b border-slate-50 last:border-0 gap-6 whitespace-nowrap">
      <div className="flex items-center gap-2 text-slate-800 font-bold shrink-0">
        <span className="text-[#0060d6]">{icon}</span>
        <span className="text-slate-700 font-medium shrink-0 w-32 text-left">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-slate-800 font-bold shrink-0">
        <span>{value ?? "N/A"}</span>
      </div>
    </div>
  );
}
