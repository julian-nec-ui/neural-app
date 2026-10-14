"use client";

import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, User, CheckCircle2, X } from 'lucide-react';

import Link from 'next/link';
import { NexusUserRequest, nexusService } from '../service/nexus-service';
import axios from 'axios';
import Layout from '../components/layout';

interface SignupFormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface NotificationState {
  show: boolean;
  message: string;
  type: 'success' | 'error';
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

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    message: '',
    type: 'success',
  });

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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const sanitizeError = (msg: string): string => {
    if (!msg) return "An unexpected error occurred";
    const lowerMsg = msg.toLowerCase();
    if (lowerMsg.includes("already exists") || lowerMsg.includes("duplicate key")) {
      return "This email address is already registered. Please use another one.";
    }
    if (lowerMsg.includes("internal server error") || lowerMsg.includes("could not execute statement")) {
      return "The server encountered an error. Please try again later.";
    }
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      setIsLoading(true);
      const payload: NexusUserRequest = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password
      };

      await nexusService.createNexusUser(payload);
      
      setNotification({
        show: true,
        type: 'success',
        message: `Welcome to Nexus, ${formData.firstName}! Account created successfully.`,
      });

      setFormData({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
    } catch (error) {
      let errorMessage = "An unexpected error occurred";
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || "An API error occurred";
      }
      setNotification({
        show: true,
        type: 'error',
        message: sanitizeError(errorMessage),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] w-full flex flex-col items-center justify-center relative overflow-x-hidden p-4">
        {/* Notification Popup */}
        <div className={`fixed top-24 right-6 z-100 transition-all duration-500 transform ${notification.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-4 flex items-center gap-4 min-w-[320px]">
            <div className={`p-2 rounded-full ${notification.type === 'success' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={20} /> : <X size={20} />}
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">{notification.message}</p>
            </div>
            <button onClick={() => setNotification((prev) => ({ ...prev, show: false }))} className="text-slate-400 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Background Elements */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none" />

        {/* Form Card */}
        <div className="relative z-10 w-full max-w-xl">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            <div className="h-1.5 w-full bg-linear-to-r from-transparent via-indigo-400 to-transparent opacity-50" />
            <div className="p-6 sm:p-8">
              <div className="text-center mb-10">
                <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
                  Join <span className="bg-linear-to-r from-slate-200 via-slate-400 to-slate-200 bg-clip-text text-transparent">PDG</span>
                </h1>
                <p className="text-slate-400 text-sm">Create your account to get started</p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">First Name</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-indigo-400">
                        <User size={20} />
                      </div>
                      <input type="text" name="firstName" className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="John" value={formData.firstName} onChange={handleChange} required disabled={isLoading} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">Last Name</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-indigo-400">
                        <User size={20} />
                      </div>
                      <input type="text" name="lastName" className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="Doe" value={formData.lastName} onChange={handleChange} required disabled={isLoading} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-indigo-400">
                      <Mail size={20} />
                    </div>
                    <input type="email" name="email" className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="name@company.com" value={formData.email} onChange={handleChange} required disabled={isLoading} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors">
                      <Lock size={20} className={passwordsMatchAndValid ? "text-emerald-400" : "text-indigo-400"} />
                    </div>
                    <input type={showPassword ? "text" : "password"} name="password" className="w-full pl-11 pr-12 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="••••••••" value={formData.password} onChange={handleChange} required disabled={isLoading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-indigo-400 transition-colors">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">Confirm Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors">
                      <Lock size={20} className={passwordsMatchAndValid ? "text-emerald-400" : "text-indigo-400"} />
                    </div>
                    <input type={showPassword ? "text" : "password"} name="confirmPassword" className="w-full pl-11 pr-12 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required disabled={isLoading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-indigo-400 transition-colors">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !isFormValid}
                  className={`w-full group relative flex items-center justify-center gap-2 py-3.5 px-4 font-semibold rounded-xl transition-all duration-300 text-lg ${isLoading || !isFormValid ? "bg-slate-700 text-slate-400 opacity-70" : "bg-linear-to-r from-indigo-600 via-indigo-500 to-cyan-600 text-white hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 active:translate-y-0"}`}
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                    <> Create Account <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /> </>
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
        </div>
      </div>
    </Layout>
  );
}
