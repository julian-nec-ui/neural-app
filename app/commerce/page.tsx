"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Phone,
  MapPin,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// --- CORRECTED MOCK DATA ---
const INITIAL_MOCK_DATA = [
  {
    id: 1,
    firstName: "Alice",
    lastName: "Zuberg",
    email: "alice@example.com",
    phone: "+1 234 567 8901",
    address: "123 Maple Ave | New York | NY | 10001",
  },
  {
    id: 2,
    firstName: "Bob",
    lastName: "Smith",
    email: "bob.smith@corp.com",
    phone: "+1 987 654 3210",
    address: "456 Oak St | Los Angeles | CA | 90001",
  },
  {
    id: 3,
    firstName: "Charlie",
    lastName: "Brown",
    email: "charlie@brown.com",
    phone: "+1 555 123 4567",
    address: "789 Pine Rd | Chicago | IL | 60601",
  },
  {
    id: 4,
    firstName: "Diana",
    lastName: "Prince",
    email: "diana@themyscira.gov",
    phone: "+1 111 222 3333",
    address: "1 Wonder Way | Washington | DC | 20001",
  },
  {
    id: 5,
    firstName: "Edward",
    lastName: "Norton",
    email: "edward@actor.com",
    phone: "+1 444 555 6666",
    address: "101 Fight Club Ln | Boston | MA | 02101",
  },
  {
    id: 6,
    firstName: "Fiona",
    lastName: "Gallagher",
    email: "fiona@southside.com",
    phone: "+1 222 333 4444",
    address: "202 South Side St | Chicago | IL | 60602",
  },
  {
    id: 7,
    firstName: "George",
    lastName: "Costanza",
    email: "george@vandelay.com",
    phone: "+1 333 444 5555",
    address: "303 Vandelay Ind | Queens | NY | 11101",
  },
  {
    id: 8,
    firstName: "Hannah",
    lastName: "Montana",
    email: "hannah@music.com",
    phone: "+1 777 888 9999",
    address: "404 Pop Star Blvd | Nashville | TN | 37201",
  },
  {
    id: 9,
    firstName: "Ian",
    lastName: "Wright",
    email: "ian@football.uk",
    phone: "+44 20 7946 0000",
    address: "505 Goal Post Ln | London | UK | SW1A",
  },
  {
    id: 10,
    firstName: "Julia",
    lastName: "Roberts",
    email: "julia@hollywood.com",
    phone: "+1 666 777 8888",
    address: "606 Starlet Dr | Beverly Hills | CA | 90210",
  },
  {
    id: 11,
    firstName: "Kevin",
    lastName: "Hart",
    email: "kevin@comedy.com",
    phone: "+1 888 999 0000",
    address: "707 Laugh Out Loud Way | Philadelphia | PA | 19101",
  },
  {
    id: 12,
    firstName: "Laura",
    lastName: "Palmer",
    email: "laura@twinpeaks.com",
    phone: "+1 444 111 2222",
    address: "808 Double R Diner | Twin Peaks | WA | 99001",
  },
  {
    id: 13,
    firstName: "Michael",
    lastName: "Scott",
    email: "m.scott@dundermifflin.com",
    phone: "+1 570 555 0123",
    address: "1725 Slough Ave | Scranton | PA | 18503",
  },
  {
    id: 14,
    firstName: "Nina",
    lastName: "Simone",
    email: "nina@jazz.com",
    phone: "+1 212 555 0199",
    address: "909 Soul Lane | Greensboro | NC | 27401",
  },
  {
    id: 15,
    firstName: "Oscar",
    lastName: "Isaac",
    email: "oscar@movies.com",
    phone: "+1 305 555 0144",
    address: "1010 Dune Ridge | Guatemala City | GT | 01001",
  },
  {
    id: 16,
    firstName: "Paula",
    lastName: "Abdul",
    email: "paula@music.com",
    phone: "+1 310 555 0111",
    address: "1111 Beat St | Los Angeles | CA | 90002",
  },
  {
    id: 17,
    firstName: "Quinn",
    lastName: "Fabray",
    email: "quinn@glee.com",
    phone: "+1 419 555 0122",
    address: "1212 Cheer Way | Lima | OH | 43501",
  },
  {
    id: 18,
    firstName: "Riley",
    lastName: "Reid",
    email: "riley@web.com",
    phone: "+1 702 555 0188",
    address: "1313 Digital Dr | Las Vegas | NV | 89101",
  },
  {
    id: 19,
    firstName: "Steven",
    lastName: "Strange",
    email: "strange@kamartaj.com",
    phone: "+1 212 555 0177",
    address: "1414 Sanctum Sanctorum | New York | NY | 10012",
  },
  {
    id: 20,
    firstName: "Tina",
    lastName: "Fey",
    email: "tina@rockcenter.com",
    phone: "+1 212 555 0166",
    address: "1515 30 Rock Plaza | New York | NY | 10019",
  },
];

export default function CommercePage() {
  // --- State ---
  const [clients, setClients] = useState<any[]>(INITIAL_MOCK_DATA);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientToDelete, setClientToDelete] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [newClient, setNewClient] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
  });

  const [sortConfig, setSortConfig] = useState({
    key: "",
    direction: null as "asc" | "desc" | null,
  });

  // --- Form Validation Logic ---
  const isFormValid = useMemo(() => {
    return Object.values(newClient).every((value) =>
      typeof value === "string" ? value.trim() !== "" : value !== null,
    );
  }, [newClient]);

  // --- Logic: LOCAL SORTING & PAGINATION ---
  const currentClients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = [...clients].slice(start, end);

    if (sortConfig.key && sortConfig.direction) {
      return pageItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key])
          return sortConfig.direction === "asc" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key])
          return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return pageItems;
  }, [clients, sortConfig, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(clients.length / itemsPerPage);

  // --- Handlers ---
  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  <div className="mt-6 w-full flex flex-col gap-2">
  {/* ADD THIS BLOCK BELOW */}
  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
    <span>Start</span>
    <span>{Math.round(progress * 100)}%</span>
    <span>End</span>
  </div>
  {/* End of block */}
  <input
    type="range"
    min="0"
    max="1"
    step="0.01"
    value={progress}
    onChange={(e) => setProgress(parseFloat(e.target.value))}
    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition-all"
  />
</div>

  };

  const handleDeleteClient = () => {
    setClients(clients.filter((c) => c.id !== clientToDelete.id));
    setIsDeleteOpen(false);
  };

  const SortableHeader = ({
    label,
    keyField,
  }: {
    label: string;
    keyField: string;
  }) => (
    <th
      className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition-all group text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
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

  const renderAddress = (value: string) => {
    if (!value) return <span className="text-slate-400 italic">N/A</span>;
    if (!value.includes("|"))
      return <span className="text-slate-600">{value}</span>;
    return (
      <div className="flex flex-col gap-0">
        {value.split("|").map((part, i) => (
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
              Real-time database of your valued customers.
            </p>
          </div>
          <button
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-semibold cursor-pointer"
            onClick={() => setIsAddOpen(true)}
          >
            <UserPlus size={20} /> Add Client
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 mb-6 overflow-hidden relative">
          <div className="overflow-x-auto overflow-y-scroll h-150 relative">
            <table className="w-full text-left border-collapse table-auto">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr className="whitespace-nowrap">
                  <SortableHeader label="First Name" keyField="firstName" />
                  <SortableHeader label="Last Name" keyField="lastName" />
                  <SortableHeader label="Email" keyField="email" />
                  <SortableHeader label="Phone" keyField="phone" />
                  <SortableHeader label="Address" keyField="address" />
                  <th className="px-6 py-3 text-left sticky right-0 bg-slate-50 shadow-[-10px_0_10px_-5px_rgba(0,0,0,0.05)] z-10 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence mode="popLayout">
                  {currentClients.map((client, idx) => (
                    <motion.tr
                      key={`${sortConfig.key}-${sortConfig.direction}-${client.id}`}
                      // 1. START: Fade in and slide down from -20px
                      initial={{
                        opacity: 0,
                        y: -20,
                        backgroundColor: idx % 2 ? "#ffffff" : "#fcfcfd",
                      }}
                      // 2. ENTER: Fade in and move to original position
                      animate={{
                        opacity: 1,
                        y: 0,
                        backgroundColor: idx % 2 ? "#ffffff" : "#fcfcfd",
                      }}
                      // 3. EXIT: Fade out and slide further down to +20px
                      exit={{
                        opacity: 0,
                        y: 20,
                        transition: { duration: 0.6 },
                      }}
                      // 4. HOVER: Subtle lift effect
                      whileHover={{
                        y: -4,
                        scale: 1.002,
                        zIndex: 10,
                        boxShadow: "inset 0 0 0 2px #818cf8, 0 12px 20px -5px rgba(0,0,0,0.15)",
                        transition: {
                          type: "spring",
                          stiffness: 400,
                          damping: 25,
                        }
                      }}
                      // 5. STAGGER: Delay each row slightly based on its index (idx)
                      transition={{
                        y: {
                          delay: idx * 0.05,
                          duration: 0.6,
                          ease: "easeOut",
                        },
                        opacity: { delay: idx * 0.04, duration: 0.4 },
                        backgroundColor: { duration: 0.8 }
                      }}

                      className="group cursor-pointer whitespa  Qce-nowrap transition-colors will-change-transform"
                    >
                      <td className="px-6 py-3 text-slate-700 font-medium border-r border-slate-100">
                        {client.firstName}
                      </td>
                      <td className="px-6 py-3 text-slate-700 font-medium border-r border-slate-100">
                        {client.lastName}
                      </td>
                      <td className="px-6 py-3 text-slate-600 border-r border-slate-100">
                        {client.email}
                      </td>
                      <td className="px-6 py-3 text-slate-600 border-r border-slate-100">
                        {client.phone}
                      </td>
                      <td className="px-6 py-3 border-r border-slate-100">
                        {renderAddress(client.address)}
                      </td>
                      <td className="px-6 py-3 sticky right-0 bg-inherit shadow-[-10px_0_10px_-5px_rgba(0,0,0,0.05)] z-10">
                        <div className="flex justify-start gap-2">
                          <button
                            onClick={() => {
                              setSelectedClient(client);
                              setIsViewOpen(true);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <Eye size={18} />
                          </button>
                          <button className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all">
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setClientToDelete(client);
                              setIsDeleteOpen(true);
                            }}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm gap-4">
          <div className="flex items-center space-x-3 text-sm text-slate-500">
            <span>Items per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer font-medium text-slate-700"
            >
              {[5, 10, 25, 50].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
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
              of{" "}
              <span className="font-bold text-slate-800">{clients.length}</span>{" "}
              clients
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${currentPage === page ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 border border-indigo-500" : "text-slate-500 hover:bg-slate-100 cursor-pointer"}`}
                  >
                    {page}
                  </button>
                ),
              )}
            </div>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODAL */}
      {isViewOpen && selectedClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="fixed inset-0 bg-black/15 z-0"
            onClick={() => setIsViewOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-max max-w-[95vw] overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                Client Details
              </h2>
              <button
                onClick={() => setIsViewOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 pt-10 space-y-4">
              <DetailRow
                label="First Name"
                value={selectedClient.firstName}
                icon={<User size={18} />}
              />
              <DetailRow
                label="Last Name"
                value={selectedClient.lastName}
                icon={<User size={18} />}
              />
              <DetailRow
                label="Email"
                value={selectedClient.email}
                icon={<Mail size={18} />}
              />
              <DetailRow
                label="Phone"
                value={selectedClient.phone}
                icon={<Phone size={18} />}
              />
              <DetailRow
                label="Address"
                value={selectedClient.address}
                icon={<MapPin size={18} />}
                truncate={true}
              />
            </div>
            <div className="p-6 bg-slate-50 text-right">
              <button
                onClick={() => setIsViewOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition font-medium"
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
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg"
            >
              <X size={20} />
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
                  onClick={handleDeleteClient}
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
            onClick={() => setIsAddOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                Add New Client
              </h2>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                    First Name
                  </label>
                  <input
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newClient.firstName}
                    onChange={(e) =>
                      setNewClient({ ...newClient, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                    Last Name
                  </label>
                  <input
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newClient.lastName}
                    onChange={(e) =>
                      setNewClient({ ...newClient, lastName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                  Email
                </label>
                <input
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newClient.email}
                  onChange={(e) =>
                    setNewClient({ ...newClient, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                  Phone
                </label>
                <input
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newClient.phone}
                  onChange={(e) =>
                    setNewClient({ ...newClient, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                  Address
                </label>
                <input
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newClient.address}
                  onChange={(e) =>
                    setNewClient({ ...newClient, address: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClient}
                disabled={!isFormValid}
                className={`px-4 py-2 rounded-xl transition shadow-md font-semibold ${isFormValid ? "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer" : "bg-slate-300 text-white cursor-not-allowed"}`}
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

function DetailRow({
  label,
  value,
  icon,
  truncate,
}: {
  label: string;
  value: any;
  icon: React.ReactNode;
  truncate?: boolean;
}) {
  return (
    <div className="flex justify-start py-3 border-b border-slate-50 last:border-0 gap-6 whitespace-nowrap">
      <div className="flex items-center gap-2 text-slate-800 font-bold shrink-0">
        <span className="text-indigo-500">{icon}</span>
        <span className="text-slate-700 font-medium shrink-0 w-32 text-left">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2 text-slate-800 font-bold min-w-0">
        <span
          className={`${truncate ? "truncate max-w-75" : "whitespace-nowrap"} transition-all`}
          title={value?.toString()}
        >
          {value ?? "N/A"}
        </span>
      </div>
    </div>
  );
}
