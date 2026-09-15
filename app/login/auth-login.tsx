import React from "react";

interface AuthModalProps {
  provider: string;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ provider, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#1a1a1a] border border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-600 shadow-lg">
            <span className="text-2xl font-bold text-cyan-400">{provider[0]}</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Login with {provider}</h3>
          <p className="text-gray-400 text-sm mb-6">
            You are being redirected to {provider} to securely authenticate your account.
          </p>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => alert(`Redirecting to ${provider} API...`)}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl transition-all active:scale-95"
            >
              Confirm & Continue
            </button>
            <button 
              onClick={onClose}
              className="w-full py-3 bg-transparent text-gray-400 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
