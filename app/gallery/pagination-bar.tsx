
  import { motion } from "framer-motion";
  import { ChevronLeft, ChevronRight } from "lucide-react";
  
  interface PaginationBarProps {
    currentPage: number;
    setCurrentPage: (page: number) => void;
    itemsPerPage: number;
    setItemsPerPage: (items: number) => void;
    files: unknown[];
  }
  
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
          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40  transition-all"
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
          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40  transition-all"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </motion.div>
  );

  export default PaginationBar;