
import { ArrowUpDown } from 'lucide-react';

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

interface SortableHeaderProps {
  label: string;
  keyField: keyof Client;
  onSort: (key: keyof Client) => void;
  sortConfig: {
    key: keyof Client | "";
    direction: "asc" | "desc" | null;
  }
}


export const SortableHeader = ({
  label,
  keyField,
  onSort,
  sortConfig,
}: SortableHeaderProps) => (
  <th
    className="sticky top-0 z-10 bg-slate-50 px-6 py-2 cursor-pointer hover:bg-slate-100 transition-all group text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
    onClick={() => onSort(keyField)}
  >

    <div className="flex items-center gap-2">
      {label}
      <ArrowUpDown
        size={14}
        className={`transition-colors ${sortConfig.key === keyField ? "text-indigo-600" : "text-slate-300 group-hover:text-slate-400"
          }`}
      />
      {sortConfig.key === keyField && (
        <span className="text-[10px] font-black text-indigo-600">
          {sortConfig.direction === "asc" ? "↑" : "↓"}
        </span>
      )}
    </div>
  </th>
);