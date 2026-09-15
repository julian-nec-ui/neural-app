import React from 'react';

interface MetallicCheckboxProps {
  id: string;
  name?: string;
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const MetallicCheckbox: React.FC<MetallicCheckboxProps> = ({
  id,
  name,
  label,
  checked,
  onChange,
  disabled = false,
  className = '',
}) => {
  return (
    <label
      htmlFor={id}
      className={`
        flex items-start gap-3 select-none cursor-pointer
        transition-all duration-200 ease-in-out
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800/30 px-2 py-1 rounded-lg'}
        ${className}
      `}
    >
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />

      {/* CUSTOM CHECKBOX BOX */}
      <div
        className={`
          relative w-5 h-5 rounded-md shrink-0
          flex items-center justify-center
          transition-all duration-300 ease-in-out
          border shadow-lg
          
          ${checked 
            ? 'bg-linear-to-br from-gray-900 to-black border-gray-700 shadow-inner' 
            : 'bg-linear-to-br from-gray-700 to-gray-900 border-gray-600'}
          
          hover:from-gray-600 hover:to-gray-800 hover:border-gray-500 hover:scale-105
        `}
      >
        {/* CHECKMARK ICON */}
        <div
          className={`
            text-gray-200 transition-all duration-300 ease-in-out
            drop-shadow-[0_0_3px_rgba(255,255,255,0.6)]
            ${checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
          `}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5"
          >
            <path d="M5 12l5 5L20 7" />
          </svg>
        </div>
      </div>

      <span
        className={`
          text-sm font-medium text-gray-300
          transition-colors duration-200
          ${disabled ? 'text-gray-500' : 'hover:text-white'}
        `}
      >
        {label}
      </span>
    </label>
  );
};

export default MetallicCheckbox;
