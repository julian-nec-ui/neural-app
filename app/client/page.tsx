"use client";

import React, { useState, useEffect, useMemo } from "react";
import { clientService } from "../service/client-service";
import {
  Trash2,
  Eye,
  Edit,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  UserPlus,
  User,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import axios from "axios";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { AnimatePresence, motion } from "framer-motion";

export default function ClientPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>({});
  const [clientToDelete, setClientToDelete] = useState<any>({});
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
    address: "",
  });

  const handleSaveNewClient = async () => {
    try {
      const response = await clientService.createClient(newClient);
      const createdClient = { ...newClient, id: response.data.id };

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
        address: "",
      });

      setIsAddOpen(false);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message || "An API error occurred";
        console.error("Error: " + message);
      } else {
        const error = err as any;
        console.error("An unexpected error occurred: " + error.message);
      }
      setNewClient({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
      });
    }
  };

  const setWebSocket = () => {
    const stompClient: Client = new Client({
      brokerURL: "ws://localhost:8080/api/ws", // Replace with your WebSocket endpoint
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    stompClient.webSocketFactory = () =>
      new SockJS("http://localhost:8080/api/ws"); // Replace with your SockJS endpoint
    stompClient.onConnect = () => {
      console.log("Connected to WebSocket at", new Date().toLocaleTimeString());

      stompClient.subscribe("/topic/clientsCreate", (message) => {
        const newClient = JSON.parse(message.body);
        setClients((prevClients) => {
          if (prevClients.some((client) => client.id === newClient.id)) {
            return prevClients;
          }

          return [...prevClients, newClient];
        });
      });

      stompClient.subscribe("/topic/clientsDelete", (message) => {
        const deletedClient = JSON.parse(message.body);
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
    return Object.values(newClient).every((value) => value.trim() !== "");
  }, [newClient]);

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc" | null;
  }>({
    key: "",
    direction: null,
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await clientService.getAllClients();
      setClients(response.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message || "An API error occurred";
        console.error("Error: " + message);
      } else {
        const error = err as any;
        console.error("An unexpected error occurred: " + error.message);
      }
    }
  };

  const handleSort = (key: string) => {
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
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [clients, sortConfig, currentPage, itemsPerPage]); // Added dependencies

  const totalPages = Math.ceil(clients.length / itemsPerPage);

  const handleViewClient = (client: any) => {
    setSelectedClient(client);
    setIsViewOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await clientService.deleteClient(clientToDelete.id);
      setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));
      setIsDeleteOpen(false);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message || "An API error occurred";
        console.error("Error: " + message);
      } else {
        const error = err as any;
        console.error("An unexpected error occurred: " + error.message);
      }
    }
  };

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const SortableHeader = ({
    label,
    keyField,
  }: {
    label: string;
    keyField: string;
  }) => (
    <th
      className="px-6 py-2 cursor-pointer hover:bg-slate-100 transition-all group text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
      onClick={() => handleSort(keyField)}
    >
      <div className="flex items-center gap-2">
        {label}
        <ArrowUpDown
          size={14}
          className={`transition-colors ${sortConfig.key === keyField ? "text-indigo-600" : "text-slate-300 group-hover:text-slate-400"}`}
        />
        {sortConfig.key === keyField && (
          <span className="text-[10px] font-black text-indigo-600">
            {sortConfig.direction === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
    </th>
  );

  // Safe Address Formatter integrated here
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

  const PaginationBar = () => (
    <motion.div
      layout
      className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm gap-4"
    >
      <div className="flex items-center space-x-3 text-sm text-slate-500">
        <span className="font-medium">Items per page:</span>
        <select
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer font-medium text-slate-700"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
        <span className="ml-2">
          Showing{" "}
          <span className="font-bold text-slate-800">
            {Math.min((currentPage - 1) * itemsPerPage + 1, clients.length)}
          </span>{" "}
          to{" "}
          <span className="font-bold text-slate-800">
            {Math.min(currentPage * itemsPerPage, clients.length)}
          </span>{" "}
          of <span className="font-bold text-slate-800">{clients.length}</span>{" "}
          clients
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => prev - 1)}
          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center space-x-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                currentPage === page
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 border border-indigo-500"
                  : "text-slate-500 hover:bg-slate-100 cursor-pointer"
              }`}
            >
              {page}
            </button>
          ))}
        </div>
        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((prev) => prev + 1)}
          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </motion.div>
  );

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
                  <SortableHeader label="First Name" keyField="firstName" />
                  <SortableHeader label="Last Name" keyField="lastName" />
                  <SortableHeader label="Email" keyField="email" />
                  <SortableHeader label="Phone" keyField="phone" />
                  <SortableHeader label="Address" keyField="address" />
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
                          y: -10, // START TOP (Changed from 10)
                          backgroundColor: isLast ? "#bbf7d0" : rowDefaultColor,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0, // SLIDE DOWN TO POSITION
                          backgroundColor: rowDefaultColor,
                        }}
                        exit={{
                          opacity: 0,
                          y: 20, // SLIDE DOWN OUT (Changed from -10)
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
        <PaginationBar />
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
      {isDeleteOpen && (
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
                  {clientToDelete?.firstName} {clientToDelete?.lastName}
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
                address: "",
              });
            }}
          />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md 
              overflow-hidden animate-in fade-in  zoom-in duration-200"
          >
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                Add New Client
              </h2>
              {/* 1. Primary Small Pill */}
              <button
                className="
                bg-[#4f46e5] text-white rounded-lg 
                  px-2 py-1 font-medium text-xs tracking-wide
                  shadow-md shadow-slate-300 
                hover:bg-[#3739d4] active:scale-96 
                  transition-all duration-200 cursor-pointer"
                onClick={async () => {
                  const result = await axios.get("https://randomuser.me/api/");
                  console.log("Random User Data:", result.data.results[0]);
                  setNewClient({
                    firstName: result.data.results[0].name.first,
                    lastName: result.data.results[0].name.last,
                    email: result.data.results[0].email,
                    phone: result.data.results[0].phone,
                    address:
                      result.data.results[0].location.street.number +
                      " " +
                      result.data.results[0].location.street.name +
                      " | " +
                      result.data.results[0].location.city +
                      " | " +
                      result.data.results[0].location.state +
                      " | " +
                      result.data.results[0].location.country +
                      " | " +
                      result.data.results[0].location.postcode,
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
                    address: "",
                  });
                }}
                className="text-slate-400 relative -top-4 -right-4 hover:text-slate-600 transition-colors p-2 hover:bg-[#e4eff5] rounded-xl"
              >
                <X size={22} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-500 uppercase ml-1">
                    First Name
                  </label>
                  <input
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none transition-all text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={newClient.firstName}
                    placeholder="Jane"
                    onChange={(e) =>
                      setNewClient({ ...newClient, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-500 uppercase ml-1">
                    Last Name
                  </label>
                  <input
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none transition-all text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={newClient.lastName}
                    placeholder="Doe"
                    onChange={(e) =>
                      setNewClient({ ...newClient, lastName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-500 uppercase ml-1">
                  Email
                </label>
                <input
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none transition-all text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={newClient.email}
                  placeholder="jane@example.com"
                  onChange={(e) =>
                    setNewClient({ ...newClient, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-500 uppercase ml-1">
                  Phone
                </label>
                <input
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none transition-all text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={newClient.phone}
                  placeholder="+1 234 567 890"
                  onChange={(e) =>
                    setNewClient({ ...newClient, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-500 uppercase ml-1">
                  Address
                </label>
                <input
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none transition-all text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={newClient.address}
                  placeholder="123 Main St | New York | NY"
                  onChange={(e) =>
                    setNewClient({ ...newClient, address: e.target.value })
                  }
                />
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
                    address: "",
                  });
                }}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewClient}
                disabled={!isFormValid}
                className={`px-4 py-2 rounded-xl transition shadow-md font-semibold ${
                  isFormValid
                    ? "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                    : "bg-slate-300 text-white cursor-pointer"
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

function DetailRow({ label, value, icon, truncate }: DetailRowProps) {
  return (
    <div className="flex justify-start py-3 border-b border-slate-50 last:border-0 gap-6 whitespace-nowrap">
      <div className="flex items-center gap-2 text-slate-800 font-bold shrink-0">
        <span className="text-[#0060d6]">{icon}</span>{" "}
        <span className="text-slate-700 font-medium shrink-0 w-32 text-left">
          {label}
        </span>
      </div>

      <div className="flex items-center gap-2 text-slate-800 font-bold shrink-0">
        {/* Icon with a subtle color */}
        <span>{value ?? "N/A"}</span>
      </div>
    </div>
  );
}
