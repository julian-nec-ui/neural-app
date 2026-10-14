"use client";

import React, { useState, useEffect } from 'react';
import { Mail, ArrowRight, Loader2, ShieldCheck, CheckCircle2, AlertCircle, X } from 'lucide-react';
import Link from 'next/link';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // State for the popup notification
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({
    show: false,
    type: 'success',
    message: '',
  });

  const isEmailValid = EMAIL_REGEX.test(email);

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification((prev) => ({ ...prev, show: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isEmailValid) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setNotification({
          show: true,
          type: 'success',
          message: 'Reset link sent! Please check your inbox.',
        });
        setEmail('');
      } else {
        throw new Error(data.error || 'Failed to send reset email');
      }
    } catch (error: unknown) {
      // --- TYPE GUARD FIX START ---
      // We handle the 'unknown' type by checking if it's an actual Error object
      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      setNotification({
        show: true,
        type: 'error',
        message: errorMessage,
      });
      // --- TYPE GUARD FIX END ---
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0f172a] relative overflow-x-hidden font-sans p-4">

      {/* --- CUSTOM TOAST POPUP --- */}
      <div className={`fixed top-6 right-6 z-100 transition-all duration-500 transform ${notification.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-4 flex items-center gap-4 min-w-[320px] animate-in fade-in slide-in-from-right-4">
          <div className={`p-2 rounded-full ${notification.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-medium">{notification.message}</p>
          </div>
          <button
            onClick={() => setNotification((prev) => ({ ...prev, show: false }))}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* --- BACKGROUND ELEMENTS --- */}
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-20 brightness-100 contrast-150 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
        }}
      />


      {/* --- BRAND BANNER --- */}
      <div className="relative z-10 mb-10 text-center group">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.3)] group-hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] transition-all duration-500">
            <ShieldCheck size={32} className="text-indigo-400" />
          </div>
          <h2 className="text-5xl sm:text-6xl font-black tracking-tighter italic">
            <span className="bg-linear-to-br from-white via-slate-400 to-slate-600 bg-clip-text text-transparent drop-shadow-sm">
              PDG
            </span>
          </h2>
        </div>
        <div className="h-1 w-12 bg-indigo-500 mx-auto rounded-full mb-3 group-hover:w-24 transition-all duration-500" />
        <p className="text-slate-500 text-sm sm:text-base font-medium tracking-widest uppercase opacity-80">
          The Future of Connectivity
        </p>
      </div>

      {/* --- FORGOT PASSWORD CARD --- */}
      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-1.5 w-full bg-linear-to-r from-transparent via-indigo-400 to-transparent opacity-50" />
          <div className="p-6 sm:p-8">
            <div className="text-center mb-8 sm:mb-10">
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-2">
                Reset <span className="bg-linear-to-r from-slate-200 via-slate-400 to-slate-200 bg-clip-text text-transparent">Password</span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base whitespace-nowrap">
                Enter your email to receive a reset link
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wider">
                    Email Address
                  </label>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <Mail size={24} style={{ color: "#909DF6" }} />
                  </div>
                  <input
                    type="email"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 backdrop-blur-sm text-base hover:border-indigo-200 hover:ring-2 hover:ring-indigo-500/20"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !isEmailValid}
                className={`w-full group relative flex items-center justify-center gap-2 py-3.5 px-4 
                  font-semibold rounded-xl transition-all duration-300 text-base sm:text-lg 
                  ${isLoading || !isEmailValid ? "bg-slate-700 text-slate-400 opacity-70" : 
                    "bg-linear-to-r from-indigo-600 via-indigo-500 to-cyan-600 text-white hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 active:translate-y-0"}`}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Send Reset Link
                    <ArrowRight size={20} className={`${isEmailValid ? "group-hover:translate-x-1 transition-transform" : ""}`} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="p-6 bg-white/5 border-t border-white/10 text-center">
            <p className="text-slate-400 text-base">
              Remember your password?{' '}
              <Link href="/login" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
                Back to Sign In
              </Link>
            </p>
          </div>
          <div className="h-1.5 w-full bg-linear-to-r from-transparent via-indigo-400 to-transparent opacity-50" />
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-500">
          <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Help Center</a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
