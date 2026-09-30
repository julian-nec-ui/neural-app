"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
} from "lucide-react";

import axios from "axios";
import { Client as StompClient } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { AnimatePresence, motion } from "framer-motion";

// New Interface for Address
interface Address {
  id?: number;
  streetNumber: string;
  streetName: string;
  city: string;
  state: string;
  zip: string;
}

// Updated Client interface
interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addresses: Address[]; // Changed from string to array
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

  // Modified state to include structured address
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
    },
  });

  const handleSaveNewClient = async () => {
    try {
      // Transform to match Backend DTO: Client with a list of addresses
      const payload = {
        ...newClient,
        addresses: [newClient.address], 
      };
      
      const response = await clientService.createClient(payload);
      const createdClient = { ...payload, id: response.data.id };

      setClients((prev) => {
        if (prev.some((client) => client.id === createdClient.id)) {
          return prev;
        }
        return [...prev, createdClient];
      });

      setNewClient({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: { streetNumber: "", streetName: "", city: "", state: "", zip: "" },
      });

      setIsAddOpen(false);
    } catch (err) {
      console.error("Error saving client:", err);
      // Reset form on error as per original logic
      setNewClient({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: { streetNumber: "", streetName: "", city: "", state: "", zip: "" },
      });
    }
  };

  const setWebSocket = () => {
    const stompClient: StompClient = new StompClient({
      brokerURL: "ws://localhost:8081/api/ws",
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    stompClient.webSocketFactory = () =>
      new SockJS("http://localhost:8081/api/ws");
    stompClient.onConnect = () => {
      stompClient.subscribe("/topic/clientsCreate", (message) => {
        const newClientData = JSON.parse(message.body) as Client;
        setClients((prevClients) => {
          if (prevClients.some((client) => client.id === newClientData.id)) {
            return prevClients;
          }
          return [...prevClients, newClientData];
        });
      });

      stompClient.subscribe("/topic/clientsDelete", (message) => {
        const deletedClient = JSON.parse(message.body) as { id: number };
        setClients((prevClients) => {
          return prevClients.filter((client) => client.id !== deletedClient.id);
        });
      });
    };

    stompClient.activate();
    return () => stompClient.deactivate();
  };

  useEffect(() => {
    const cleanup = setWebSocket();
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, []);

  // Refactored validation logic to check both Client and nested Address fields
  const isFormValid = useMemo(() => {
    const basicFields = [newClient.firstName, newClient.lastName, newClient.email, newClient.phone];
    const addressFields = Object.values(newClient.address);
    return [...basicFields, ...addressFields].every((value) => 
      typeof value === "string" && value.trim() !== ""
    );
  }, [newClient]);

  const [sortConfig, setSortConfig] = useState<{
    key: keyof Client | "";
    direction: "asc" | "desc" | null;
  }>({
    key: "",
    direction: null,
  });

  const fetchClients = useCallback(async () => {
    try {
      const response = await clientService.getAllClients();
      setClients(response.data);
    } catch (err) {
      console.error("Error fetching clients:", err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchClients()
    })();
  }, [fetchClients]);

  const handleSort = (key: keyof Client) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const currentClients = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const pageItems = clients.slice(indexOfFirstItem, indexOfLastItem);

    if (!sortConfig.key || !sortConfig.direction) return pageItems;

    return [...pageItems].sort((a, b) => {
      const key = sortConfig.key as keyof Client;
      const valA = a[key];
      const valB = b[key];
      
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [clients, sortConfig, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(clients.length / itemsPerPage);

  const handleViewClient = (client: Client) => {
    setSelectedClient(client);
    setIsViewOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    try {
      await clientService.deleteClient(clientToDelete.id);
      setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));
      setIsDeleteOpen(false);
    } catch (err) {
      console.error("Error deleting client:", err);
    }
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Refactored to pull from the addresses array but keep the same visual format
  const renderAddress = (addresses: Address[]) => {
    if (!addresses || addresses.length === 0) return <span className="text-slate-400 italic">N/A</span>;
    
    // We take the first address for the table view to keep the layout clean
    const addr = addresses[0];
    const formatted = `${addr.streetNumber} ${addr.streetName} | ${addr.city} | ${addr.state} | ${addr.zip}`;
    const delimiter = "|";
    
    return (
      <div className="flex flex-col gap-0.5">
        {formatted.split(delimiter).map((part, i) => (
          <span key={i} className="text-xs text-slate-400 block leading-tight">
            {part.trim()}
          </span>
        ))}
      </div>
    );
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
            onClick={() => setIsAddOpen(true)}
          >
            <UserPlus size={20} /> Add Client
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 mb-6 overflow-hidden">
          <div className="overflow-x-auto h-300 max-h-[calc(100vh-300px)]">
            <table className="w-full text-left border-collapse table-auto">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="whitespace-nowrap">
                  <SortableHeader label="First Name" keyField="firstName" onSort={handleSort} sortConfig={sortConfig} />
                  <SortableHeader label="Last Name" keyField="lastName" onSort={handleSort} sortConfig={sortConfig} />
                  <SortableHeader label="Email" keyField="email" onSort={handleSort} sortConfig={sortConfig} />
                  <SortableHeader label="Phone" keyField="phone" onSort={handleSort} sortConfig={sortConfig} />
                  <SortableHeader label="Address" keyField="addresses" onSort={handleSort} sortConfig={sortConfig} />
                  <th className="px-6 py-4 text-left sticky right-0 bg-slate-50 shadow-[-10px_0_10px_-5px_rgba(0,0,0,0.05)] z-10 text-sm font-bold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence mode="popLayout">
                  {currentClients.map((client, idx) => {
                    const isLast = idx === currentClients.length - 1;
                    const rowDefaultColor = idx % 2 ? "#ffffff" : "#fcfcfd";

                    return (
                      <motion.tr
                        key={`${currentPage}-${itemsPerPage}-${client.id}`}
                        layout
                        initial={{ opacity: 0, y: -10, backgroundColor: isLast ? "#bbf7d0" : rowDefaultColor }}
                        animate={{ opacity: 1, y: 0, backgroundColor: rowDefaultColor }}
                        exit={{ opacity: 0, y: 20 }}
                        whileHover={{
                          y: -6, scale: 1.01, zIndex: 10,
                          boxShadow: "inset 0 0 0 2px #818cf8, 0 12px 20px -5px rgba(0,0,0,0.15)",
                          transition: { type: "spring", stiffness: 400, damping: 25 },
                        }}
                        className="group cursor-pointer whitespace-nowrap transition-colors"
                      >
                        <td className="px-6 py-2 text-slate-700 font-medium border-r border-slate-100">{client.firstName}</td>
                        <td className="px-6 py-2 text-slate-700 font-medium border-r border-slate-100">{client.lastName}</td>
                        <td className="px-6 py-2 text-slate-600 font-medium border-r border-slate-100">{client.email}</td>
                        <td className="px-6 py-2 text-slate-600 font-medium border-r border-slate-100">{client.phone}</td>
                        <td className="px-6 py-2 border-r border-slate-100 font-medium whitespace-nowrap">
                          {renderAddress(client.addresses)}
                        </td>
                        <td className="px-6 py-2 sticky right-0 bg-inherit shadow-[-10px_0_10px_-5px_rgba(0,0,0,0.05)] z-10">
                          <div className="flex justify-start gap-2">
                            <button onClick={() => handleViewClient(client)} className="p-2 text-[#0073d7] hover:bg-indigo-50 rounded-lg transition-all"><Eye size={18} /></button>
                            <button className="p-2 text-[#00846e] hover:bg-[#eff3f3] rounded-lg transition-all"><Edit size={18} /></button>
                            <button onClick={() => { setClientToDelete(client); setIsDeleteOpen(true); }} className="p-2 text-[#fa0026] hover:bg-[#fdeef0] rounded-lg transition-all"><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
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
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </div>

      {/* VIEW MODAL */}
      {isViewOpen && selectedClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black/15 z-0" onClick={() => setIsViewOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Client Details</h2>
              <button onClick={() => setIsViewOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-[#e4eff5] rounded-xl"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-2">
              <DetailRow label="First Name" value={selectedClient.firstName} icon={<User size={22} />} />
              <DetailRow label="Last Name" value={selectedClient.lastName} icon={<User size={22} />} />
              <DetailRow label="Email" value={selectedClient.email} icon={<Mail size={22} />} />
              <DetailRow label="Phone" value={selectedClient.phone} icon={<Phone size={22} />} />
              <DetailRow 
                label="Address" 
                value={selectedClient.addresses?.[0] ? `${selectedClient.addresses[0].streetNumber} ${selectedClient.addresses[0].streetName}, ${selectedClient.addresses[0].city}, ${selectedClient.addresses[0].state}` : "N/A"} 
                icon={<MapPin size={22} />} 
              />
            </div>
            <div className="p-6 bg-slate-50 text-right">
              <button onClick={() => setIsViewOpen(false)} className="px-4 py-2 bg-[#e1e9ee] text-[#3d4f6c] rounded-lg hover:bg-[#c6e1ee] transition font-medium">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE DIALOG */}
      {isDeleteOpen && clientToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black/15 z-0" onClick={() => setIsDeleteOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in slide-in-from-bottom-4 duration-200">
            <button onClick={() => setIsDeleteOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-[#e4eff5] rounded-lg"><X size={22} /></button>
            <div className="text-center">
              <div className="bg-rose-100 text-rose-600 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={28} /></div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Delete Client?</h2>
              <p className="text-slate-600 font-medium mb-6">Are you sure you want to delete <span className="text-indigo-600">{clientToDelete.firstName} {clientToDelete.lastName}</span>?</p>
              <span className="flex items-center justify-center gap-2 text-rose-500 font-semibold text-sm mb-8 uppercase tracking-wide"><AlertTriangle size={18} /> This action is permanent</span>
              <div className="flex gap-3">
                <button onClick={() => setIsDeleteOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition font-semibold">Cancel</button>
                <button onClick={handleDeleteConfirm} className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition shadow-lg shadow-rose-200 font-semibold">Delete Now</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black/15 z-0" onClick={() => { setIsAddOpen(false); setNewClient({ firstName: "", lastName: "", email: "", phone: "", address: { streetNumber: "", streetName: "", city: "", state: "", zip: "" } }); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Add New Client</h2>
              <button
                className="bg-[#4f46e5] text-white rounded-lg px-2 py-1 font-medium text-xs tracking-wide shadow-md hover:bg-[#3739d4] transition-all cursor-pointer"
                onClick={async () => {
                  const result = await axios.get("https://randomuser.me/api/");
                  const user = result.data.results[0];
                  setNewClient({
                    firstName: user.name.first,
                    lastName: user.name.last,
                    email: user.email,
                    phone: user.phone,
                    address: {
                      streetNumber: user.location.street.number,
                      streetName: user.location.street.name,
                      city: user.location.city,
                      state: user.location.state,
                      zip: user.location.postcode,
                    },
                  });
                }}
              >
                Set Random Fields
              </button>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-[#e4eff5] rounded-xl"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-500 uppercase ml-1">First Name</label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 group-hover:text-indigo-800 transition-all" size={20} />
                    <input className="w-full pl-10 p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={newClient.firstName} onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-500 uppercase ml-1">Last Name</label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 group-hover:text-indigo-800 transition-all" size={20} />
                    <input className="w-full pl-10 p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={newClient.lastName} onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-500 uppercase ml-1">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 group-hover:text-indigo-800 transition-all" size={20} />
                    <input className="w-full pl-10 p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-500 uppercase ml-1">Phone</label>
                  <div className="relative group">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 group-hover:text-indigo-800 transition-all" size={20} />
                    <input className="w-full pl-10 p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-500 uppercase ml-1 flex items-center gap-2">
                  <MapPin size={14} className="text-indigo-500" /> Address Details
                </label>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-2">
                    <input className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="No." value={newClient.address.streetNumber} onChange={(e) => setNewClient({ ...newClient, address: { ...newClient.address, streetNumber: e.target.value } })} />
                  </div>
                  <div className="col-span-6">
                    <input className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Street Name" value={newClient.address.streetName} onChange={(e) => setNewClient({ ...newClient, address: { ...newClient.address, streetName: e.target.value } })} />
                  </div>
                  <div className="col-span-4">
                    <input className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="City" value={newClient.address.city} onChange={(e) => setNewClient({ ...newClient, address: { ...newClient.address, city: e.target.value } })} />
                  </div>
                  <div className="col-span-6">
                    <input className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="State" value={newClient.address.state} onChange={(e) => setNewClient({ ...newClient, address: { ...newClient.address, state: e.target.value } })} />
                  </div>
                  <div className="col-span-6">
                    <input className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Zip Code" value={newClient.address.zip} onChange={(e) => setNewClient({ ...newClient, address: { ...newClient.address, zip: e.target.value } })} />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition font-medium">Cancel</button>
              <button
                onClick={handleSaveNewClient}
                disabled={!isFormValid}
                className={`px-4 py-2 rounded-xl transition shadow-md font-semibold ${isFormValid ? "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer" : "bg-slate-300 text-white cursor-pointer"}`}
              >
                Save Client
              </button>
            </div>
          </div>
        </div>
      )}
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
        <span className="text-[#0060d6]">{icon}</span>{" "}
        <span className="text-slate-700 font-medium shrink-0 w-32 text-left">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-slate-800 font-bold shrink-0">
        <span>{value ?? "N/A"}</span>
      </div>
    </div>
  );
}
