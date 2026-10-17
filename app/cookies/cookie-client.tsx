"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cookie, Save, Trash2, RefreshCw, 
  CheckCircle2, AlertCircle, Palette 
} from 'lucide-react';

const METALLIC_ROYAL_BLUE = `bg-linear-to-r from-[#0C3E9C] via-[#4570F2] to-[#063895]`;

interface ThemeOption {
  id: string;
  label: string;
  colorClass: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { id: 'dark', label: 'Deep Space', colorClass: 'bg-slate-900' },
  { id: 'light', label: 'Pure Arctic', colorClass: 'bg-slate-100' },
  { id: 'blue', label: 'Royal Ocean', colorClass: 'bg-indigo-900' },
  { id: 'emerald', label: 'Neon Forest', colorClass: 'bg-emerald-900' },
];

interface CookieClientProps {
  initialTheme: string | null;
}

const CookieClient: React.FC<CookieClientProps> = ({ initialTheme }) => {
  // Initialize state directly from props - No useEffect needed!
  const [currentTheme, setCurrentTheme] = useState<string | null>(initialTheme);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(initialTheme);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const showStatus = (type: 'success' | 'error', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3000);
  };

  // Manual refresh handler
  const refreshCookie = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cookies');
      const data = await res.json();
      const theme = data.theme === 'Not set' ? null : data.theme;
      setCurrentTheme(theme);
      setSelectedTheme(theme);
    } catch (err) {
      console.error(err);
      showStatus('error', 'Failed to sync with server');
    } finally {
      setIsLoading(false);
    }
  };

  const saveCookie = async () => {
    if (!selectedTheme) {
      showStatus('error', 'Please select a theme first');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: selectedTheme }),
      });
      if (res.ok) {
        setCurrentTheme(selectedTheme);
        showStatus('success', `Preference saved: ${selectedTheme}`);
      } else {
        throw new Error();
      }
    } catch (err) {
      console.error(err);
      showStatus('error', 'Failed to save preference');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCookie = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cookies', { method: 'DELETE' });
      if (res.ok) {
        setCurrentTheme(null);
        setSelectedTheme(null);
        showStatus('success', 'Preference cleared');
      }
    } catch (err) {
      console.error(err);
      showStatus('error', 'Failed to delete cookie');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0f172a] text-slate-200 p-4 sm:p-8 font-sans relative overflow-hidden">
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto mt-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-center mb-10"
        >
          <h1 className="text-4xl font-black italic tracking-tighter text-white">
            PREFERENCE <span className="text-indigo-400">CENTER</span>
          </h1>
          <p className="text-slate-500 uppercase tracking-widest text-xs font-bold mt-2">
            Cookie Management System
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          <AnimatePresence>
            {status && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
                  status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {status.msg}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-8">
            <div className="flex items-center justify-between p-6 bg-slate-900/50 border border-slate-700 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
                  <Cookie size={24} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Active Server Cookie</p>
                  <p className="text-lg font-mono text-white">
                    {currentTheme ? currentTheme.toUpperCase() : <span className="text-slate-600 italic">None set</span>}
                  </p>
                </div>
              </div>
              <motion.button 
                whileHover={{ rotate: 180 }}
                onClick={refreshCookie}
                disabled={isLoading}
                className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
              </motion.button>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4 text-slate-400">
                <Palette size={18} />
                <h2 className="text-sm font-bold uppercase tracking-widest">Select Theme</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {THEME_OPTIONS.map((option) => (
                  <motion.button
                    key={option.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedTheme(option.id)}
                    className={`relative group p-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between ${
                      selectedTheme === option.id 
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/10' 
                        : `border-slate-700 hover:border-indigo-400`
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border border-white/20 ${option.colorClass}`} />
                      <span className="font-bold text-slate-300">{option.label}</span>
                    </div>
                    {selectedTheme === option.id && <CheckCircle2 size={16} className="text-indigo-400" />}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/10">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={saveCookie}
                disabled={isLoading}
                className={`flex-1 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : METALLIC_ROYAL_BLUE
                } shadow-[0_0_20px_rgba(65,105,225,0.3)]`}
              >
                <Save size={18} /> {isLoading ? "Saving..." : "Save Settings"}
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={deleteCookie}
                disabled={isLoading || !currentTheme}
                className="px-6 py-3 rounded-xl font-bold bg-slate-800 text-slate-400 border border-slate-700 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Trash2 size={18} /> Clear
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CookieClient;
