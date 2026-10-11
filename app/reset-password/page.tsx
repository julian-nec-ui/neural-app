"use client";

import React, { useState, Suspense } from 'react'; // Added Suspense
import { Lock, ArrowRight, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// Explicit interface for the form state
interface ResetPasswordFormState {
  password: string;
  confirmPassword: string;
}

// 1. EXTRACTED FORM COMPONENT
// This component handles the searchParams and form logic
const ResetPasswordForm = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState<ResetPasswordFormState>({
    password: '',
    confirmPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFormValid =
    formData.password.length >= 6 &&
    formData.password === formData.confirmPassword;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid || !token) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: formData.password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset password');
      }

      router.push('/login');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle the "No Token" case inside the Suspense boundary
  if (!token) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold text-white mb-4">Invalid Reset Link</h1>
        <p className="text-slate-400 mb-6">The reset token is missing or invalid.</p>
        <Link href="/forgot-password" className="text-indigo-400 hover:underline">Request a new link</Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8 sm:mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-2">
          New <span className="bg-linear-to-r from-slate-200 via-slate-400 to-slate-200 bg-clip-text text-transparent">Password</span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base whitespace-nowrap">
          Secure your account with a strong password
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <div className="flex justify-between items-center ml-1">
            <label className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wider">New Password</label>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors">
              <Lock size={24} style={{ color: "#909DF6" }} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              className="w-full pl-11 pr-12 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 backdrop-blur-sm text-base"
              placeholder="•••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-indigo-400 transition-colors">
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center ml-1">
            <label className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wider">Confirm New Password</label>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors">
              <Lock size={24} style={{ color: "#909DF6" }} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              className="w-full pl-11 pr-12 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 backdrop-blur-sm text-base"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-indigo-400 transition-colors">
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !isFormValid}
          className={`w-full group relative flex items-center justify-center gap-2 py-3.5 px-4 font-semibold rounded-xl transition-all duration-300 text-base sm:text-lg ${isLoading || !isFormValid ? "bg-slate-700 text-slate-400 opacity-70 cursor-not-allowed" : "bg-linear-to-r from-indigo-600 via-indigo-500 to-cyan-600 text-white hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 active:translate-y-0"}`}
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><>Update Password</><ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>}
        </button>
      </form>
    </>
  );
};

// 2. MAIN PAGE WRAPPER
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0f172a] relative overflow-x-hidden font-sans p-4">
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-20 brightness-100 contrast-150 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
        }}
      />


      <div className="relative z-10 mb-10 text-center group">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.3)] group-hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] transition-all duration-500">
            <ShieldCheck size={32} className="text-indigo-400" />
          </div>
          <h2 className="text-5xl sm:text-6xl font-black tracking-tighter italic">
            <span className="bg-linear-to-br from-white via-slate-400 to-slate-600 bg-clip-text text-transparent drop-shadow-sm">
              NEXUS
            </span>
          </h2>
        </div>
        <div className="h-1 w-12 bg-indigo-500 mx-auto rounded-full mb-3 group-hover:w-24 transition-all duration-500" />
        <p className="text-slate-500 text-sm sm:text-base font-medium tracking-widest uppercase opacity-80">
          The Future of Connectivity
        </p>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-1.5 w-full bg-linear-to-r from-transparent via-indigo-400 to-transparent opacity-50" />
          <div className="p-6 sm:p-8">
            {/* SUSPENSE BOUNDARY: This fixes the build error */}
            <Suspense fallback={<div className="text-center text-slate-400 py-10 animate-pulse">Loading secure session...</div>}>
              <ResetPasswordForm />
            </Suspense>
          </div>

          <div className="p-6 bg-white/5 border-t border-white/10 text-center">
            <p className="text-slate-400 text-base">
              Changed your mind?{' '}
              <Link href="/login" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
                Back to Sign In
              </Link>
            </p>
          </div>
          <div className="h-1.5 w-full bg-linear-to-r from-transparent via-indigo-400 to-transparent opacity-50" />
        </div>
      </div>
    </div>
  );
}
