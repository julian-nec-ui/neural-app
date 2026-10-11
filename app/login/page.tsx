"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface LoginFormState {
  email: string;
  password: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormState>({
    email: '',
    password: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility

  // Logic: Email must be valid and password must be at least 6 chars
  const isFormValid =
    EMAIL_REGEX.test(formData.email) &&
    formData.password.length >= 6;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log('Form submitted:', formData);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0f172a] relative overflow-x-hidden font-sans p-4">

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
      <div className="relative z-10 mb-12 text-center group">
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

      {/* --- LOGIN CARD --- */}
      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">

          <div className="h-1.5 w-full bg-linear-to-r from-transparent via-indigo-400 to-transparent opacity-50" />

          <div className="p-6 sm:p-8">

            {/* Header */}
            <div className="text-center mb-8 sm:mb-10">
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-2">
                Welcome <span className="bg-linear-to-r from-slate-200 via-slate-400 to-slate-200 bg-clip-text text-transparent">Back</span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base whitespace-nowrap">
                Please enter your credentials to access your account
              </p>
            </div>

            {/* Form */}
            <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>

              {/* Email Input */}
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
                    name="email"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 
                    rounded-xl text-white placeholder-slate-500 outline-none transition-all 
                    focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 backdrop-blur-sm 
                    text-base hover:border-indigo-200 hover:ring-2 hover:ring-indigo-500/20"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wider">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <Lock size={24} style={{ color: "#909DF6" }} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"} // Dynamic type based on state
                    name="password"
                    // Increased pr-4 to pr-12 to prevent text from sliding under the icon
                    className="w-full pl-11 pr-12 py-3.5 bg-slate-900/50 border border-slate-700 
                    rounded-xl text-white placeholder-slate-500 outline-none transition-all
                     focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 
                     backdrop-blur-sm text-base hover:border-indigo-200 hover:ring-2 hover:ring-indigo-500/20"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                  {/* Show/Hide Toggle Button */}
                  <button
                    type="button" // Set to "button" so it doesn't trigger form submission
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-indigo-400 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className={`
                  w-full group relative flex items-center justify-center gap-2 py-3.5 px-4 
                  font-semibold rounded-xl transition-all duration-300 text-base sm:text-lg 
                  ${isLoading || !isFormValid
                    ? "bg-slate-700 text-slate-400 opacity-70"
                    : "bg-linear-to-r from-indigo-600 via-indigo-500 to-cyan-600 text-white hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 active:translate-y-0"
                  }
                `}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={20} className={`${isFormValid ? "group-hover:translate-x-1 transition-transform" : ""}`} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Card Footer */}
          <div className="p-6 bg-white/5 border-t border-white/10 text-center">
            <p className="text-slate-400 text-base">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
                Create Account
              </Link>
            </p>
          </div>
        </div>

        {/* Legal Footer */}
        <div className="mt-8 flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-500">
          <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Help Center</a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
