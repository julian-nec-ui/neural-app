"use client";

import { useEffect, useState } from "react";
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
  // VIEW MODE STATE

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("http://localhost:8080/api/files/list");
      setFiles(response.data.files);
    } catch (err) {
      console.error("Error fetching files", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDownload = (filename: string) => {
    window.open(
      `http://localhost:8080/api/files/download/${filename}`,
      "_blank",
    );
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
    try {
      await axios.delete(
        `http://localhost:8080/api/files/delete/${fileToDelete}`,
      );
      await fetchFiles();
      closeModal();
    } catch (err) {
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
    if (["pdf", "doc", "docx", "txt"].includes(ext || ""))
      return <FileText size={20} className="text-orange-500" />;
    return <File size={20} className="text-slate-500" />;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
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
            {/* MODERN VIEW TOGGLE (Segmented Control) */}
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
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            >
              <RefreshCw
                size={20}
                className={isLoading ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>

        {/* 1. LOADING STATE */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : files.length === 0 ? (
          /* 2. EMPTY STATE (Brought back!) */
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
              You haven't uploaded any assets to the cloud yet. Start by adding
              your first file.
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
          /* 3. ACTUAL CONTENT (Grid or Table) */
          <>
            {viewMode === "grid" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
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
                  </div>
                ))}
              </div>
            )}

            {viewMode === "table" && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          File Name
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Size
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Modified
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {files.map((file, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-indigo-50 transition-colors">
                                {getFileIcon(file.name)}
                              </div>
                              <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">
                                {file.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {new Date(file.lastModified).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODERN DELETE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop - Blurs the background */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={closeModal}
          />

          {/* Modal Box */}
          <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="flex flex-col items-center text-center">
              {/* Warning Icon */}
              <div className="p-4 bg-rose-100 text-rose-600 rounded-full mb-6">
                <AlertTriangle size={32} />
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Delete File?
              </h2>
              <p className="text-slate-500 mb-8">
                Are you sure you want to delete{" "}
                <span className="font-bold text-slate-700">{fileToDelete}</span>
                ? This action cannot be undone.
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
                      <Loader2 size={18} className="animate-spin" />{" "}
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete File</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
