"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { nexusService } from '../service/nexus-service';

interface LoginFormState {
  email: string;
  password: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// --- THE EXTREME METALLIC PDG LOGO ---
const PDGLogo = () => (
  <svg width="350" height="120" viewBox="0 0 350 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
    <defs>
      {/* P: Extreme Electric Blue Contrast (Dark -> Bright Neon -> Dark) */}
      <linearGradient id="gradP" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#0630B8" />
        <stop offset="50%" stopColor="#6895CB" />
        <stop offset="100%" stopColor="#0C1A46" />
      </linearGradient>
      
      {/* D: Extreme Copper/Gold Contrast (Burnt Amber -> White Gold -> Burnt Amber) */}
      <linearGradient id="gradD" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#CC4E05" />
        <stop offset="50%" stopColor="#E3D218" />
        <stop offset="100%" stopColor="#833508" />
      </linearGradient>
      
      {/* G: Extreme Radiant Gold Contrast (Dark Bronze -> Pale Yellow -> Dark Bronze) */}
      <linearGradient id="gradG" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFF200" />
        <stop offset="50%" stopColor="#9D9F74" />
        <stop offset="100%" stopColor="#F84F00" />
      </linearGradient>
    </defs>
    
    <text 
      x="50%" 
      y="90" 
      textAnchor="middle" 
      strokeLinejoin="round"
      style={{ 
        fontSize: '110px', 
        fontWeight: '900', 
        fontStyle: 'italic', 
        fontFamily: 'sans-serif', 
        letterSpacing: '-10px' 
      }}
    >
      <tspan fill="url(#gradP)" stroke="url(#gradP)" strokeWidth="8">P</tspan>
      <tspan fill="url(#gradD)" stroke="url(#gradD)" strokeWidth="8">D</tspan>
      <tspan fill="url(#gradG)" stroke="url(#gradG)" strokeWidth="8">G</tspan>
    </text>
  </svg>
);

const LoginPage: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormState>({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFormValid = EMAIL_REGEX.test(formData.email) && formData.password.length >= 6;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await nexusService.loginUser({ email: formData.email, password: formData.password });
      router.refresh();
      router.push('/nexus-dashboard');
    } catch (error: unknown) {
      if (error instanceof Error) setErrorMessage(error.message);
      else setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden font-sans p-4 
                    bg-[#0a0f1c] bg-[radial-gradient(circle_at_center,#1e293b_0%,#0a0f1c_100%)]">
      
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      <div
        className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
        }}
      />

      <div className="relative z-10 mb-12 text-center group">
        <div className="flex flex-col items-center justify-center mb-6">
          <PDGLogo />
        </div>
        
        <div className="h-1 w-16 bg-indigo-500 mx-auto rounded-full mb-6" />
        
        <p className="text-slate-400 text-xs sm:text-sm font-bold tracking-[0.3em] uppercase opacity-80">
          The Future of Connectivity
        </p>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-2xl bg-white/3 border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="h-1.5 w-full bg-linear-to-r from-transparent via-indigo-400 to-transparent opacity-50" />
          <div className="p-6 sm:p-8">
            <div className="text-center mb-8 sm:mb-10">
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-2">
                Welcome <span className="bg-linear-to-r from-slate-200 via-slate-400 to-slate-200 bg-clip-text text-transparent">Back</span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base whitespace-nowrap">
                Please enter your credentials to access your account
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wider">Email Address</label>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <Mail size={24} style={{ color: "#909DF6" }} />
                  </div>
                  <input type="email" name="email" className="w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 backdrop-blur-sm text-base hover:border-indigo-400/50" placeholder="name@company.com" value={formData.email} onChange={handleChange} required disabled={isLoading} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wider">Password</label>
                  <Link href="/forgot-password" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">Forgot password?</Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <Lock size={24} style={{ color: "#909DF6" }} />
                  </div>
                  <input type={showPassword ? "text" : "password"} name="password" className="w-full pl-11 pr-12 py-3.5 bg-slate-950/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 backdrop-blur-sm text-base hover:border-indigo-400/50" placeholder="••••••••" value={formData.password} onChange={handleChange} required disabled={isLoading} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-indigo-400 transition-colors focus:outline-none">
                    {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isLoading || !isFormValid} className={`w-full group relative flex items-center justify-center gap-2 py-3.5 px-4 font-semibold rounded-xl transition-all duration-300 text-base sm:text-lg ${isLoading || !isFormValid ? "bg-slate-700 text-slate-400 opacity-70" : "bg-linear-to-r from-indigo-600 via-indigo-500 to-cyan-600 text-white hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 active:translate-y-0"}`}>
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    Sign In
                    <ArrowRight size={20} className={`${isFormValid ? "group-hover:translate-x-1 transition-transform" : ""}`} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="p-6 bg-white/2 border-t border-white/10 text-center">
            <p className="text-slate-400 text-base">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
