import React from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const PaginationBar = ({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
}: PaginationBarProps) => (
  <motion.div
    layout
    className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm gap-4"
  >
    <div className="flex items-center space-x-3 text-sm text-slate-500">
      <span className="font-medium">Items per page:</span>
      <select
        value={itemsPerPage}
        onChange={onItemsPerPageChange}
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
          {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}
        </span>{" "}
        to{" "}
        <span className="font-bold text-slate-800">
          {Math.min(currentPage * itemsPerPage, totalItems)}
        </span>{" "}
        of <span className="font-bold text-slate-800">{totalItems}</span>{" "}
        clients
      </span>
    </div>
    <div className="flex items-center space-x-2">
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="flex items-center space-x-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${currentPage === page
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
        onClick={() => onPageChange(currentPage + 1)}
        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  </motion.div>
);