"use client";

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  Upload,
  File,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileUp,
} from "lucide-react";

// Define types for better stability
interface FileStatus {
  progress: number;
  status: "idle" | "uploading" | "success" | "error";
  message?: string;
}

export default function UploadPage() {

  const [mounted, setMounted] = useState(false);
  const [isUploadingAll, setIsUploadingAll] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const [fileStatuses, setFileStatuses] = useState<Record<string, FileStatus>>(
    {},
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if(!mounted) {
    return (
     <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans text-4xl font-bold text-gray-900">
        Loading...
      </div>
    );
  }

  // Add files to the queue
  const handleFileChange = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles = Array.from(selectedFiles);
    setFiles((prev) => [...prev, ...newFiles]);

    // Initialize status for each new file
    const newStatuses: Record<string, FileStatus> = {};
    newFiles.forEach((f) => {
      newStatuses[f.name] = { progress: 0, status: "idle" };
    });
    setFileStatuses((prev) => ({ ...prev, ...newStatuses }));
  };

  const onZoneClick = () => fileInputRef.current?.click();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  const removeFile = (fileName: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
    const newStatuses = { ...fileStatuses };
    delete newStatuses[fileName];
    setFileStatuses(newStatuses);
  };

  const uploadAllFiles = async () => {
    setIsUploadingAll(true); // Start global loader

    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);

      setFileStatuses((prev) => ({
        ...prev,
        [file.name]: { ...prev[file.name], status: "uploading" },
      }));

      try {
        await axios.post("http://localhost:8080/api/files/upload", formData, {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1),
            );
            setFileStatuses((prev) => ({
              ...prev,
              [file.name]: { ...prev[file.name], progress: percentCompleted },
            }));
          },
        });
        setFileStatuses((prev) => ({
          ...prev,
          [file.name]: { progress: 100, status: "success" },
        }));
      } catch (err) {
        setFileStatuses((prev) => ({
          ...prev,
          [file.name]: {
            ...prev[file.name],
            status: "error",
            message: "Failed",
          },
        }));
      }
    });

    await Promise.all(uploadPromises);
    setIsUploadingAll(false); // Stop global loader
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-4xl shadow-2xl shadow-slate-200/60 p-8 md:p-12 border border-slate-100">
          <div className="text-center mb-10">
            <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-4">
              <FileUp size={28} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Cloud Upload
            </h1>
            <p className="text-slate-500 mt-2">
              Upload multiple files to your secure storage
            </p>
          </div>

          {/* Dropzone */}
          <div
            onClick={onZoneClick}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="relative group cursor-pointer border-2 border-dashed rounded-3xl p-10 transition-all duration-300 text-center border-slate-200 hover:border-indigo-400 hover:bg-slate-50"
          >
            <input
              type="file"
              multiple // ALLOW MULTIPLE FILES
              ref={fileInputRef}
              onChange={(e) => handleFileChange(e.target.files)}
              className="hidden"
            />
            <div className="flex flex-col items-center">
              <div className="p-4 bg-white shadow-sm rounded-2xl text-slate-400 group-hover:text-indigo-500 group-hover:scale-110 transition-all duration-300 border border-slate-100">
                <Upload size={32} />
              </div>
              <p className="mt-4 text-slate-600 font-semibold">
                Click or drag files here
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Supports multiple files (Max 50MB each)
              </p>
            </div>
          </div>

          {/* File List Area */}
          {files.length > 0 && (
            <div className="mt-8 space-y-3 max-h-100 overflow-y-auto pr-2 custom-scrollbar">
              {files.map((file) => (
                <div
                  key={file.name}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-2"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="p-2 bg-white text-indigo-600 rounded-lg shadow-sm">
                        <File size={18} />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold text-slate-700 truncate">
                          {file.name}
                        </span>
                        <span className="text-xs text-slate-400">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {fileStatuses[file.name]?.status === "success" && (
                        <CheckCircle size={18} className="text-emerald-500" />
                      )}
                      {fileStatuses[file.name]?.status === "error" && (
                        <AlertCircle size={18} className="text-rose-500" />
                      )}
                      <button
                        onClick={() => removeFile(file.name)}
                        className="p-1 hover:bg-slate-200 rounded-md text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Individual Progress Bar */}
                  {fileStatuses[file.name]?.status !== "idle" && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span>
                          {fileStatuses[file.name]?.status === "uploading"
                            ? "Uploading..."
                            : fileStatuses[file.name]?.status}
                        </span>
                        <span>{fileStatuses[file.name]?.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            fileStatuses[file.name]?.status === "error"
                              ? "bg-rose-500"
                              : "bg-indigo-600"
                          }`}
                          style={{
                            width: `${fileStatuses[file.name]?.progress}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={uploadAllFiles}
            disabled={files.length === 0 || isUploadingAll}
            className={`w-full mt-8 py-4 px-6 rounded-2xl font-bold text-white transition-all duration-200 flex items-center justify-center space-x-3
    ${
      files.length === 0 || isUploadingAll
        ? "bg-slate-200 cursor-not-allowed text-slate-400"
        : "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] shadow-xl shadow-indigo-200"
    }`}
          >
            {isUploadingAll ? (
              <>
                <Loader2 size={22} className="animate-spin" />
                <span>Uploading All Files...</span>
              </>
            ) : (
              <>
                <Upload size={22} />
                <span>Upload All Files</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
