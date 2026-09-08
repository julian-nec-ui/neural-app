"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCompactDisc } from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence } from "framer-motion";
import {Client} from "@stomp/stompjs";
import SockJS from "sockjs-client";

import {
  Upload,
  File,
  Download,
  RefreshCw,
  ArrowLeft,
  Image as ImageIcon,
  FileText,
  Video,
  Trash2,
  AlertTriangle,
  LayoutGrid,
  List,
  Loader2,
  FileArchiveIcon,
  Package,
  FileAudioIcon,
  FilePlayIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import Link from "next/link";
import axios from "axios";

interface FileInfo {
  name: string;
  size: number;
  lastModified: string;
}

export default function GalleryPage() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("http://localhost:8080/api/files/list");
      await new Promise((resolve) => setTimeout(resolve, 500));
      setFiles(response.data.files);
      setCurrentPage(1);
    } catch (err) {
      console.error("Error fetching files", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8080/api/ws"),
      onConnect: () => {
        console.log("Connected to SpringBoot WebSocket at ", Date.now());
        client.subscribe("/topic/files", (message) => {
          if(message.body === "REFRESH_GALLERY") {
            fetchFiles();
            console.log("Files refreshed automatically via Push Notification at : ", new Date());
          }
        });
      },
      onDisconnect: () => {
        console.log("Disconnected from WebSocket at ", Date.now());
      }
    });
    
    client.activate();
    
    return () => client.deactivate();

  }, []);

  useEffect(() => {
    fetchFiles();
  }, []);

  const totalPages = Math.ceil(files.length / itemsPerPage);
  const currentFiles = files.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleDownload = async (filename: string) => {
    try {
      // 1. IMMEDIATELY open the OS window (must be the first action)
      if ("showSaveFilePicker" in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
        });

        // 2. Now that the user has picked a path, fetch the file data
        const response = await axios.get(
          `http://localhost:8080/api/files/download/${filename}`,
          {
            responseType: "blob",
          },
        );

        // 3. Write the data to the chosen path
        const writable = await handle.createWritable();
        await writable.write(response.data);
        await writable.close();
      } else {
        // FALLBACK: For Firefox/Safari, use the standard download
        window.open(
          `http://localhost:8080/api/files/download/${filename}`,
          "_blank",
        );
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Download failed", err);
        alert("Could not save the file.");
      }
    }
  };

  const openDeleteModal = (filename: string) => {
    setFileToDelete(filename);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFileToDelete(null);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    const nameToRemove = fileToDelete;
    try {
      setFiles((prev) => prev.filter((f) => f.name !== nameToRemove));
      await axios.delete(
        `http://localhost:8080/api/files/delete/${nameToRemove}`,
      );
      closeModal();
    } catch (err) {
      await fetchFiles();
      alert("Failed to delete the file.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || ""))
      return <ImageIcon size={20} className="text-blue-500" />;
    if (["mp4", "mov", "avi"].includes(ext || ""))
      return <Video size={20} className="text-purple-500" />;
    if (["mp3", "wav", "aac"].includes(ext || ""))
      return <FileAudioIcon size={20} className="text-red-500" />;
    if (["pdf", "doc", "docx", "txt"].includes(ext || ""))
      return <FileText size={20} className="text-orange-500" />;
    if (["exe"].includes(ext || ""))
      return <FilePlayIcon size={20} className="text-[#039af0]" />;
    if (["msi"].includes(ext || ""))
      return <Package size={20} className="text-[#039af0]" />;
    if (["zip", "rar"].includes(ext || ""))
      return <FileArchiveIcon size={20} className="text-green-500" />;
    if (["iso"].includes(ext || "")) {
      return (
        <FontAwesomeIcon
          icon={faCompactDisc}
          className="text-gray-400 rounded-2xl text-xl transition-colors duration-150 hover:text-[#598dab]"
          style={{
            textShadow: "0 0 10px rgba(168,85,247,0.8)",
            width: "1.2rem",
            height: "1.2rem",
          }}
        />
      );
    }
    return <File size={20} className="text-slate-500" />;
  };

  const PaginationBar = () => (
    <motion.div
      layout
      className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm gap-4"
    >
      <div className="flex items-center space-x-3 text-sm text-slate-500">
        <span>Items per page:</span>
        <select
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer font-medium"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
        <span className="ml-2">
          Showing{" "}
          <span className="font-bold text-slate-800">
            {Math.min((currentPage - 1) * itemsPerPage + 1, files.length)}
          </span>{" "}
          to{" "}
          <span className="font-bold text-slate-800">
            {Math.min(currentPage * itemsPerPage, files.length)}
          </span>{" "}
          of <span className="font-bold text-slate-800">{files.length}</span>{" "}
          files
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => prev - 1)}
          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                  ? "bg-linear-to-br from-blue-400 via-blue-600 to-blue-800 text-white shadow-[0_4px_12px_rgba(37,99,235,0.4)] border border-blue-300"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {page}
            </button>
          ))}
        </div>
        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((prev) => prev + 1)}
          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ backgroundColor: "#e2e8f0" }}
      animate={{ backgroundColor: "#f8fafc" }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="relative min-h-screen p-6 md:p-12 font-sans overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.5, x: -100 }}
          animate={{ opacity: 0.4, scale: 1, x: 0 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute -top-20 -left-20 w-96 h-96 bg-blue-200 rounded-full blur-[100px]"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.5, x: 100 }}
          animate={{ opacity: 0.3, scale: 1, x: 0 }}
          transition={{ duration: 2, delay: 0.8 }}
          className="absolute top-1/4 -right-20 w-125 h-125 bg-indigo-200 rounded-full blur-[120px]"
        />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div className="flex items-center space-x-4">
            <Link
              href="/upload"
              className="p-2 bg-white rounded-full shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                File Gallery
              </h1>
              <p className="text-slate-500">Manage your cloud assets</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex p-1 bg-slate-200/50 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
              >
                <LayoutGrid size={16} />
                <span>Grid</span>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === "table" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
              >
                <List size={16} />
                <span>Table</span>
              </button>
            </div>

            <button
              onClick={fetchFiles}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 transition-all shadow-sm hover:text-[#009f57]"
            >
              <RefreshCw
                size={20}
                className={isLoading ? "animate-spin text-[#025afc]" : ""}
              />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 shadow-sm">
            <div className="flex justify-center mb-6">
              <div className="p-6 bg-slate-50 rounded-full text-slate-300">
                <File size={64} strokeWidth={1.5} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Your gallery is empty
            </h2>
            <p className="text-slate-500 mb-8 max-w-xs mx-auto">
              You haven't uploaded any assets yet.
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center space-x-2 px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200"
            >
              <Upload size={20} />
              <span>Upload your first file</span>
            </Link>
          </div>
        ) : (
          <>
            {viewMode === "grid" && (
              <div className="flex flex-col gap-6">
                <motion.div
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                >
                  <AnimatePresence mode="popLayout">
                    {currentFiles.map((file, idx) => {
                      const isLast = idx === currentFiles.length - 1;
                      return (
                        <motion.div
                          key={`${currentPage}-${itemsPerPage}-${file.name}`}
                          layout
                          initial={{
                            opacity: 0,
                            y: 20,
                            scale: 0.95,
                            backgroundColor: isLast ? "#bbf7d0" : "#ffffff",
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            backgroundColor: "#ffffff",
                          }}
                          exit={{
                            opacity: 0,
                            scale: 0.8,
                            transition: { duration: 0.4 },
                          }}
                          transition={{
                            opacity: { duration: 0.5, delay: idx * 0.06 },
                            y: {
                              type: "spring",
                              stiffness: 200,
                              damping: 30,
                              delay: idx * 0.06,
                            },
                            scale: {
                              type: "spring",
                              stiffness: 200,
                              damping: 30,
                              delay: idx * 0.06,
                            },
                            backgroundColor: {
                              duration: 2.5,
                              ease: "easeOut",
                              delay: idx * 0.06,
                            },
                            layout: {
                              type: "spring",
                              stiffness: 300,
                              damping: 35,
                            },
                          }}
                          whileHover={{
                            scale: 1.03,
                            y: -8,
                            borderColor: "#818cf8", // Indigo-400
                            transition: { duration: 0.2 },
                          }}
                          className="p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                              {getFileIcon(file.name)}
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleDownload(file.name)}
                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
                              >
                                <Download size={16} />
                              </button>
                              <button
                                onClick={() => openDeleteModal(file.name)}
                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-600 transition-all shadow-sm"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800 truncate">
                            {file.name}
                          </h3>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mt-1">
                            <span>{(file.size / 1024).toFixed(1)} KB</span>
                            <span>
                              {new Date(file.lastModified).toLocaleDateString()}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
                <PaginationBar />
              </div>
            )}

            {viewMode === "table" && (
              <div className="flex flex-col gap-4">
                <motion.div
                  layout
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="shrink-0">
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            File Name
                          </th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Size
                          </th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Modified
                          </th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <AnimatePresence mode="popLayout">
                          {currentFiles.map((file, idx) => {
                            const isLast = idx === currentFiles.length - 1;
                            const rowDefaultColor =
                              idx % 2 === 0 ? "#ffffff" : "#f8fafc";

                            return (
                              <motion.tr
                                key={`${currentPage}-${itemsPerPage}-${file.name}`}
                                layout
                                initial={{
                                  opacity: 0,
                                  x: -20,
                                  backgroundColor: isLast
                                    ? "#bbf7d0"
                                    : rowDefaultColor,
                                }}
                                animate={{
                                  opacity: 1,
                                  x: 0,
                                  backgroundColor: rowDefaultColor,
                                }}
                                exit={{ opacity: 0, x: 20 }}
                                // THE SCOOP: Lift, Magnify, and Border
                                whileHover={{
                                  y: -6,
                                  scale: 1.02,
                                  zIndex: 10,
                                  // combined inset border and outer lift shadow
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
                                  x: { delay: idx * 0.08, duration: 0.6 },
                                  backgroundColor: {
                                    duration: 2.5,
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
                                className="group cursor-pointer"
                              >
                                {/* ALL TDS must have group-hover:bg-transparent to make the TR border visible */}
                                <td className="px-6 py-2.5 rounded-l-xl group-hover:bg-transparent transition-colors">
                                  <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-indigo-50 transition-colors">
                                      {getFileIcon(file.name)}
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700 truncate max-w-50">
                                      {file.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-2.5 text-sm text-slate-500 group-hover:bg-transparent transition-colors">
                                  {(file.size / 1024).toFixed(1)} KB
                                </td>
                                <td className="px-6 py-2.5 text-sm text-slate-500 group-hover:bg-transparent transition-colors">
                                  {new Date(
                                    file.lastModified,
                                  ).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-2.5 text-right rounded-r-xl group-hover:bg-transparent transition-colors">
                                  <div className="flex items-center justify-end space-x-2">
                                    <button
                                      onClick={() => handleDownload(file.name)}
                                      className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                      <Download size={18} />
                                    </button>
                                    <button
                                      onClick={() => openDeleteModal(file.name)}
                                      className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
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
                </motion.div>
                <PaginationBar />
              </div>
            )}
          </>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={closeModal}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 border border-slate-100"
          >
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-rose-100 text-rose-600 rounded-full mb-6">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Delete File ?
              </h2>
              <p className="text-slate-600 mb-8">
                Are you sure you want to delete :{" "}
                <span className="flex items-center justify-center gap-2 font-bold text-slate-700 truncate py-1">
                  {fileToDelete && getFileIcon(fileToDelete)}
                  <span className="truncate">{fileToDelete}</span> ?
                </span>
                <span className="flex items-center justify-center gap-1.5 text-rose-600 font-medium text-lg mt-2">
                  <AlertTriangle size={17} />
                  This action cannot be undone !
                </span>
              </p>

              <div className="flex w-full space-x-3">
                <button
                  onClick={closeModal}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:bg-rose-300"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete File</span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
