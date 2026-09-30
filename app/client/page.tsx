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

// Define the Client interface to replace all 'any' types
interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
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
    streetNumber: "",
    streetName: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  });

  const handleSaveNewClient = async () => {
    try {
      // Combine address fields into a single string for the API
      const addressString = `${newClient.streetNumber} ${newClient.streetName} | ${newClient.city} | ${newClient.state} | ${newClient.country} | ${newClient.zip}`;

      const payload = {
        firstName: newClient.firstName,
        lastName: newClient.lastName,
        email: newClient.email,
        phone: newClient.phone,
        address: addressString,
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
        streetNumber: "",
        streetName: "",
        city: "",
        state: "",
        zip: "",
        country: "",
      });

      setIsAddOpen(false);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message || "An API error occurred";
        console.error("Error: " + message);
      } else if (err instanceof Error) {
        console.error("An unexpected error occurred: " + err.message);
      } else {
        console.error("An unknown error occurred");
      }
      setNewClient({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        streetNumber: "",
        streetName: "",
        city: "",
        state: "",
        zip: "",
        country: "",
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
      console.log("Connected to WebSocket at", new Date().toLocaleTimeString());

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
          console.log(
            "Received delete message for client ID:",
            deletedClient.id,
          );
          return prevClients.filter((client) => client.id !== deletedClient.id);
        });
      });
    };

    stompClient.onDisconnect = () => {
      console.log(
        "Disconnected from WebSocket at",
        new Date().toLocaleTimeString(),
      );
    };

    stompClient.onStompError = (frame) => {
      console.error("Broker reported error: ", frame);
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

  const isFormValid = useMemo(() => {
    // String(value) ensures that numbers (like streetNumber) are converted to strings before trimming
    return Object.values(newClient).every((value) => String(value).trim() !== "");
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
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message || "An API error occurred";
        console.error("Error: " + message);
      } else if (err instanceof Error) {
        console.error("An unexpected error occurred: " + err.message);
      } else {
        console.error("An unknown error occurred");
      }
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
    // 1. Slice the data first to get only the current page's items
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const pageItems = clients.slice(indexOfFirstItem, indexOfLastItem);

    // 2. If no sorting is active, just return the slice
    if (!sortConfig.key || !sortConfig.direction) return pageItems;

    // 3. Sort ONLY the items on the current page
    return [...pageItems].sort((a, b) => {
      // FIX: Cast the key to keyof Client here
      const key = sortConfig.key as keyof Client;

      if (a[key] < b[key]) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (a[key] > b[key]) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
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
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message || "An API error occurred";
        console.error("Error: " + message);
      } else if (err instanceof Error) {
        console.error("An unexpected error occurred: " + err.message);
      } else {
        console.error("An unknown error occurred");
      }
    }
  };

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const renderAddress = (value: string) => {
    if (!value) return <span className="text-slate-400 italic">N/A</span>;
    const delimiter = "|";
    if (!value.includes(delimiter)) {
      return <span className="text-slate-600">{value}</span>;
    }
    return (
      <div className="flex flex-col gap-0.5">
        {value.split(delimiter).map((part, i) => (
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
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Client Management
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage your customer database and contact details.
            </p>
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
                  <SortableHeader label="First Name" keyField="firstName" onSort={handleSort} sortConfig={sortConfig} cla />
                  <SortableHeader label="Last Name" keyField="lastName" onSort={handleSort} sortConfig={sortConfig} />
                  <SortableHeader label="Email" keyField="email" onSort={handleSort} sortConfig={sortConfig} />
                  <SortableHeader label="Phone" keyField="phone" onSort={handleSort} sortConfig={sortConfig} />
                  <SortableHeader label="Address" keyField="address" onSort={handleSort} sortConfig={sortConfig} />
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
                        initial={{
                          opacity: 0,
                          y: -10,
                          backgroundColor: isLast ? "#bbf7d0" : rowDefaultColor,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          backgroundColor: rowDefaultColor,
                        }}
                        exit={{
                          opacity: 0,
                          y: 20,
                        }}
                        whileHover={{
                          y: -6,
                          scale: 1.01,
                          zIndex: 10,
                          boxShadow:
                            "inset 0 0 0 2px #818cf8, 0 12px 20px -5px rgba(0,0,0,0.15)",
                          transition: {
                            type: "spring",
                            stiffness: 400,
                            damping: 25,
                          },
                        }}
                        style={{ position: "relative", originY: 0 }}
                        transition={{
                          y: { delay: idx * 0.08, duration: 0.4 },
                          backgroundColor: {
                            duration: 1.5,
                            ease: "easeOut",
                            delay: idx * 0.08,
                          },
                          opacity: { delay: idx * 0.08 },
                          layout: {
                            type: "spring",
                            stiffness: 100,
                            damping: 35,
                          },
                        }}
                        className="group cursor-pointer whitespace-nowrap transition-colors"
                      >
                        <td className="px-6 py-2 text-slate-700 font-medium border-r border-slate-100 whitespace-nowrap">
                          {client.firstName}
                        </td>
                        <td className="px-6 py-2 text-slate-700 font-medium border-r border-slate-100 whitespace-nowrap">
                          {client.lastName}
                        </td>
                        <td className="px-6 py-2 text-slate-600 font-medium border-r border-slate-100 whitespace-nowrap">
                          {client.email}
                        </td>
                        <td className="px-6 py-2 text-slate-600 font-medium border-r border-slate-100">
                          {client.phone}
                        </td>
                        <td className="px-6 py-2 border-r border-slate-100 font-medium whitespace-nowrap">
                          {renderAddress(client.address)}
                        </td>
                        <td className="px-6 py-2 sticky right-0 bg-inherit shadow-[-10px_0_10px_-5px_rgba(0,0,0,0.05)] z-10">
                          <div className="flex justify-start gap-2">
                            <button
                              onClick={() => handleViewClient(client)}
                              className="p-2 text-[#0073d7] hover:bg-indigo-50 rounded-lg transition-all"
                            >
                              <Eye size={18} />
                            </button>
                            <button className="p-2 text-[#00846e] hover:bg-[#eff3f3] rounded-lg transition-all">
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setClientToDelete(client);
                                setIsDeleteOpen(true);
                              }}
                              className="p-2 text-[#fa0026] hover:bg-[#fdeef0] rounded-lg transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
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
          <div
            className="fixed inset-0 bg-black/15 z-0"
            onClick={() => setIsViewOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                Client Details
              </h2>
              <button
                onClick={() => setIsViewOpen(false)}
                className="relative -top-4 -right-4 text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-[#e4eff5] rounded-xl"
              >
                <X size={22} />
              </button>
            </div>
            <div className="p-6 space-y-2">
              <DetailRow
                label="First Name"
                value={selectedClient.firstName}
                icon={<User size={22} />}
              />
              <DetailRow
                label="Last Name"
                value={selectedClient.lastName}
                icon={<User size={22} />}
              />
              <DetailRow
                label="Email"
                value={selectedClient.email}
                icon={<Mail size={22} />}
              />
              <DetailRow
                label="Phone"
                value={selectedClient.phone}
                icon={<Phone size={22} />}
              />
              <DetailRow
                label="Address"
                value={selectedClient.address}
                icon={<MapPin size={22} />}
              />
            </div>
            <div className="p-6 bg-slate-50 text-right">
              <button
                onClick={() => setIsViewOpen(false)}
                className="px-4 py-2 bg-[#e1e9ee]  text-[#3d4f6c] rounded-lg hover:bg-[#c6e1ee] hover:text-[#3d4f6c] transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE DIALOG */}
      {isDeleteOpen && clientToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="fixed inset-0 bg-black/15 z-0"
            onClick={() => setIsDeleteOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in slide-in-from-bottom-4 duration-200">
            <button
              onClick={() => setIsDeleteOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-[#e4eff5] rounded-lg"
            >
              <X size={22} />
            </button>
            <div className="text-center">
              <div className="bg-rose-100 text-rose-600 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={28} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Delete Client?
              </h2>
              <p className="text-slate-600 font-medium mb-6">
                Are you sure you want to delete{" "}
                <span className="text-indigo-600">
                  {clientToDelete.firstName} {clientToDelete.lastName}
                </span>
                ?
              </p>
              <span className="flex items-center justify-center gap-2 text-rose-500 font-semibold text-sm mb-8 uppercase tracking-wide">
                <AlertTriangle size={18} /> This action is permanent
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition shadow-lg shadow-rose-200 font-semibold"
                >
                  Delete Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="fixed inset-0 bg-black/15 z-0"
            onClick={() => {
              setIsAddOpen(false);
              setNewClient({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                streetNumber: "",
                streetName: "",
                city: "",
                state: "",
                zip: "",
                country: "",
              });
            }}
          />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl 
              overflow-hidden animate-in fade-in zoom-in duration-200"
          >
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                Add New Client
              </h2>
              <div className="flex items-center gap-3">
                <button
                  className="bg-[#4f46e5] text-white rounded-lg 
                    px-3 py-1.5 font-medium text-xs tracking-wide
                    shadow-md shadow-slate-300 
                  hover:bg-[#3739d4] active:scale-95 
                    transition-all duration-200 cursor-pointer"
                  onClick={async () => {
                    const result = await axios.get("https://randomuser.me/api/");
                    const user = result.data.results[0];
                    setNewClient({
                      firstName: user.name.first,
                      lastName: user.name.last,
                      email: user.email,
                      phone: user.phone,
                      streetNumber: String(user.location.street.number),
                      streetName: user.location.street.name,
                      city: user.location.city,
                      state: user.location.state,
                      zip: user.location.postcode,
                      country: user.location.country,
                    });
                  }}
                >
                  Set Random Fields
                </button>

                <button
                  onClick={() => {
                    setIsAddOpen(false);
                    setNewClient({
                      firstName: "",
                      lastName: "",
                      email: "",
                      phone: "",
                      streetNumber: "",
                      streetName: "",
                      city: "",
                      state: "",
                      zip: "",
                      country: "",
                    });
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-[#e4eff5] rounded-xl"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-8">
                {/* COLUMN 1: Client Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase mb-2">
                    <User size={16} /> Client Information
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-500 uppercase ml-1">
                      First Name
                    </label>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 group-hover:text-indigo-800 transition-all" size={20} />
                      <input
                        className="w-full pl-10 p-2.5 border border-slate-200 rounded-xl outline-none transition-all duration-300 text-slate-900 bg-white hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={newClient.firstName}
                        placeholder="Jane"
                        onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-500 uppercase ml-1">
                      Last Name
                    </label>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 group-hover:text-indigo-800 transition-all" size={20} />
                      <input
                        className="w-full pl-10 p-2.5 border border-slate-200 rounded-xl outline-none transition-all duration-300 text-slate-900 bg-white hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={newClient.lastName}
                        placeholder="Doe"
                        onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-500 uppercase ml-1">
                      Email
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 group-hover:text-indigo-800 transition-all" size={20} />
                      <input
                        className="w-full pl-10 p-2.5 border border-slate-200 rounded-xl outline-none transition-all duration-300 text-slate-900 bg-white hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={newClient.email}
                        placeholder="jane@example.com"
                        onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-500 uppercase ml-1">
                      Phone
                    </label>
                    <div className="relative group">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 group-hover:text-indigo-800 transition-all" size={20} />
                      <input
                        className="w-full pl-10 p-2.5 border border-slate-200 rounded-xl outline-none transition-all duration-300 text-slate-900 bg-white hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={newClient.phone}
                        placeholder="+1 234 567 890"
                        onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* VERTICAL DIVIDER */}
                <div className="hidden md:block w-px bg-slate-200 self-stretch hover:bg-slate-300 hover:shadow-lg"></div>

                {/* COLUMN 2: Address Details */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase mb-2">
                    <MapPin size={16} /> Address Details
                  </div>

                  <div className="flex gap-3">
                    <div className="space-y-1 w-1/3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">No.</label>
                      <input
                        className="w-full p-2.5 border border-slate-200 rounded-xl outline-none transition-all duration-300 text-slate-900 bg-white hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={newClient.streetNumber}
                        placeholder="123"
                        onChange={(e) => setNewClient({ ...newClient, streetNumber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1 w-2/3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Street Name</label>
                      <input
                        className="w-full p-2.5 border border-slate-200 rounded-xl outline-none transition-all duration-300 text-slate-900 bg-white hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={newClient.streetName}
                        placeholder="Main St"
                        onChange={(e) => setNewClient({ ...newClient, streetName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-500 uppercase ml-1">City</label>
                    <div className="relative group">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 group-hover:text-indigo-800 transition-all" size={20} />
                      <input
                        className="w-full pl-10 p-2.5 border border-slate-200 rounded-xl outline-none transition-all duration-300 text-slate-900 bg-white hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={newClient.city}
                        placeholder="New York"
                        onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-500 uppercase ml-1">State</label>
                    <div className="relative group">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 group-hover:text-indigo-800 transition-all" size={20} />
                      <input
                        className="w-full pl-10 p-2.5 border border-slate-200 rounded-xl outline-none transition-all duration-300 text-slate-900 bg-white hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={newClient.state}
                        placeholder="NY"
                        onChange={(e) => setNewClient({ ...newClient, state: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="space-y-1 flex-1">
                      <label className="text-sm font-bold text-slate-500 uppercase ml-1">Zip Code</label>
                      <div className="relative group">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 group-hover:text-indigo-800 transition-all" size={20} />
                        <input
                          className="w-full pl-10 p-2.5 border border-slate-200 rounded-xl outline-none transition-all duration-300 text-slate-900 bg-white hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          value={newClient.zip}
                          placeholder="10001"
                          onChange={(e) => setNewClient({ ...newClient, zip: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1 flex-1">
                      <label className="text-sm font-bold text-slate-500 uppercase ml-1">Country</label>
                      <div className="relative group">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 group-hover:text-indigo-800 transition-all" size={20} />
                        <input
                          className="w-full pl-10 p-2.5 border border-slate-200 rounded-xl outline-none transition-all duration-300 text-slate-900 bg-white hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          value={newClient.country}
                          placeholder="USA"
                          onChange={(e) => setNewClient({ ...newClient, country: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setNewClient({
                    firstName: "",
                    lastName: "",
                    email: "",
                    phone: "",
                    streetNumber: "",
                    streetName: "",
                    city: "",
                    state: "",
                    zip: "",
                    country: "",
                  });
                }}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewClient}
                disabled={!isFormValid}
                className={`px-6 py-2 rounded-xl transition shadow-md font-semibold ${isFormValid
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                  : "bg-slate-300 text-white cursor-not-allowed"
                  }`}
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
  truncate?: boolean;
}

function DetailRow({ label, value, icon }: DetailRowProps) {
  return (
    <div className="flex justify-start py-3 border-b border-slate-50 last:border-0 gap-6 whitespace-nowrap">
      <div className="flex items-center gap-2 text-slate-800 font-bold shrink-0">
        <span className="text-[#0060d6]">{icon}</span>{" "}
        <span className="text-slate-700 font-medium shrink-0 w-32 text-left">
          {label}
        </span>
      </div>

      <div className="flex items-center gap-2 text-slate-800 font-bold shrink-0">
        <span>{value ?? "N/A"}</span>
      </div>
    </div>
  );
}
