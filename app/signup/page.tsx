"use client";

import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, Loader2, ShieldCheck, Eye, EyeOff, User, CheckCircle2, X } from 'lucide-react';
import Link from 'next/link';
import { NexusUserRequest, nexusService } from '../service/nexus-service';
import axios from 'axios';

interface SignupFormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CreateAccountPage() {
  const [formData, setFormData] = useState<SignupFormState>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- POPUP STATE ---
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error'; // Added type for styling
  }>({
    show: false,
    message: '',
    type: 'success',
  });

  // Auto-hide popup after 2750ms
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification((prev) => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  const passwordsMatchAndValid =
    formData.password.length >= 6 &&
    formData.password === formData.confirmPassword &&
    formData.password !== '';

  const isFormValid =
    formData.firstName.trim().length > 0 &&
    formData.lastName.trim().length > 0 &&
    EMAIL_REGEX.test(formData.email) &&
    passwordsMatchAndValid;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // --- HELPER: Clean up raw backend/DB errors ---
  const sanitizeError = (msg: string) => {
    
    if (!msg) {
      return "An unexpected error occurred";
    }
    
    const lowerMsg = msg.toLowerCase();
    
    // Handle Duplicate Email/Key errors from Postgres/Hibernate
    if (lowerMsg.includes("already exists") || lowerMsg.includes("duplicate key")) {
      return "This email address is already registered. Please use another one.";
    }
    
    // Handle generic Internal Server errors
    if (lowerMsg.includes("internal server error") || lowerMsg.includes("could not execute statement")) {
      return "The server encountered an error. Please try again later.";
    }

    return msg;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault();

      if (!isFormValid) {
        return;
      }

      setIsLoading(true); // Start loading

      const payload: NexusUserRequest = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password
      }

      const response = await nexusService.createNexusUser(payload);
      console.log(response);

      await new Promise((resolve) => setTimeout(resolve, 500));

      // --- Success Popup ---
      setNotification({
        show: true,
        type: 'success',
        message: `Welcome to Nexus, ${formData.firstName}! Account created successfully.`,
      });

      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
      });

    } catch (error) {
      // --- Extract specific error message ---
      let errorMessage = "An unexpected error occurred";
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || "An API error occurred";
      }

      const cleanedMessage = sanitizeError(errorMessage);

      // --- Error Popup ---
      setNotification({
        show: true,
        type: 'error',
        message: cleanedMessage,
      });
      
      console.error("Error: " + errorMessage);
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0f172a] relative overflow-x-hidden font-sans p-4">

      {/* --- CUSTOM POPUP (Success & Error) --- */}
      <div className={`fixed top-6 right-6 z-100 transition-all duration-500 transform ${notification.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-4 flex items-center gap-4 min-w-[320px] animate-in fade-in slide-in-from-right-4">
          {/* Icon Color: Emerald for success, Red for error */}
          <div className={`p-2 rounded-full ${notification.type === 'success' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={20} /> : <X size={20} />}
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
              NEXUS
            </span>
          </h2>
        </div>
        <div className="h-1 w-12 bg-indigo-500 mx-auto rounded-full mb-3 group-hover:w-24 transition-all duration-500" />
        <p className="text-slate-500 text-sm sm:text-base font-medium tracking-widest uppercase opacity-80">
          The Future of Connectivity
        </p>
      </div>

      {/* --- SIGNUP CARD --- */}
      <div className="relative z-10 w-full max-w-xl">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">

          <div className="h-1.5 w-full bg-linear-to-r from-transparent via-indigo-400 to-transparent opacity-50" />

          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="text-center mb-8 sm:mb-10">
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-2">
                Join <span className="bg-linear-to-r from-slate-200 via-slate-400 to-slate-200 bg-clip-text text-transparent">Nexus</span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base whitespace-nowrap">
                Create your account to get started
              </p>
            </div>

            {/* Form */}
            <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>

              {/* Name Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wider">First Name</label>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                      <User size={24} style={{ color: "#909DF6" }} />
                    </div>
                    <input type="text" name="firstName" className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 backdrop-blur-sm text-base hover:border-indigo-200 hover:ring-2 hover:ring-indigo-500/20" placeholder="John" value={formData.firstName} onChange={handleChange} required disabled={isLoading} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wider">Last Name</label>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                      <User size={24} style={{ color: "#909DF6" }} />
                    </div>
                    <input type="text" name="lastName" className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 backdrop-blur-sm text-base hover:border-indigo-200 hover:ring-2 hover:ring-indigo-500/20" placeholder="Doe" value={formData.lastName} onChange={handleChange} required disabled={isLoading} />
                  </div>
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wider">Email Address</label>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <Mail size={24} style={{ color: "#909DF6" }} />
                  </div>
                  <input type="email" name="email" className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 backdrop-blur-sm text-base hover:border-indigo-200 hover:ring-2 hover:ring-indigo-500/20" placeholder="name@company.com" value={formData.email} onChange={handleChange} required disabled={isLoading} />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wider">Password</label>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors">
                    <Lock
                      size={24}
                      className={`transition-all duration-300 ${passwordsMatchAndValid ? "text-emerald-400" : ""}`}
                      style={passwordsMatchAndValid
                        ? { filter: 'drop-shadow(0 0 6px rgba(15 225 148 / 0.8))' }
                        : { color: "#909DF6" }
                      }
                    />
                  </div>
                  <input type={showPassword ? "text" : "password"} name="password" className="w-full pl-11 pr-12 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 backdrop-blur-sm text-base hover:border-indigo-200 hover:ring-2 hover:ring-indigo-500/20" placeholder="••••••••" value={formData.password} onChange={handleChange} required disabled={isLoading} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-indigo-400 transition-colors focus:outline-none">
                    {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wider">Confirm Password</label>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors">
                    <Lock
                      size={24}
                      className={`transition-all duration-300 ${passwordsMatchAndValid ? "text-emerald-400" : ""}`}
                      style={passwordsMatchAndValid
                        ? { filter: 'drop-shadow(0 0 6px rgba(15 225 148 / 0.8))' }
                        : { color: "#909DF6" }
                      }
                    />
                  </div>
                  <input type={showPassword ? "text" : "password"} name="confirmPassword" className="w-full pl-11 pr-12 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 backdrop-blur-sm text-base hover:border-indigo-200 hover:ring-2 hover:ring-indigo-500/20" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required disabled={isLoading} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-indigo-400 transition-colors focus:outline-none">
                    {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className={`w-full group relative flex items-center justify-center gap-2 py-3.5 px-4 font-semibold rounded-xl transition-all duration-300 text-base sm:text-lg ${isLoading || !isFormValid ? "bg-slate-700 text-slate-400 opacity-70" : "bg-linear-to-r from-indigo-600 via-indigo-500 to-cyan-600 text-white hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 active:translate-y-0"}`}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Create Account
                    <ArrowRight size={20} className={`${isFormValid ? "group-hover:translate-x-1 transition-transform" : ""}`} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="p-6 bg-white/5 border-t border-white/10 text-center">
            <p className="text-slate-400 text-base">
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
                Sign In
              </Link>
            </p>
          </div>

          <div className="h-1.5 w-full bg-linear-to-r from-transparent via-indigo-400 to-transparent opacity-50" />
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-500">
          <a href="#" className="hover:text-slate-300 text-lg transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-slate-300 text-lg transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-slate-300 text-lg transition-colors">Help Center</a>
        </div>
      </div>
    </div>
  );
};
