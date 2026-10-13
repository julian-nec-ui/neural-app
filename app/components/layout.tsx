"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ShieldCheck } from 'lucide-react';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'About Us', href: '/about' },
    { name: 'Our Portfolio', href: '/portfolio' },
    { name: 'Patient Portal', href: '/portal' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-white font-sans">
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0f172a]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 group-hover:border-indigo-500/50 transition-all">
                <ShieldCheck size={28} className="text-indigo-400" />
              </div>
              <span className="text-2xl font-black tracking-tighter italic bg-linear-to-br from-white to-slate-500 bg-clip-text text-transparent">
                NEXUS
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  href={link.href} 
                  className="text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors"
                >
                  {link.name}
                </Link>
              ))}
              <Link 
                href="/signup" 
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-sm font-semibold transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)]"
              >
                Join Nexus
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button onClick={() => setIsOpen(!isOpen)} className="text-slate-400 hover:text-white">
                {isOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {isOpen && (
          <div className="md:hidden bg-[#0f172a] border-b border-white/10 px-4 py-6 space-y-4 animate-in slide-in-from-top duration-300">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href} 
                onClick={() => setIsOpen(false)}
                className="block text-base font-medium text-slate-400 hover:text-indigo-400"
              >
                {link.name}
              </Link>
            ))}
            <Link 
              href="/signup" 
              className="block w-full text-center px-5 py-3 bg-indigo-600 rounded-xl font-semibold"
            >
              Join Nexus
            </Link>
          </div>
        )}
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="grow">
        {children}
      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-[#0a0f1d] border-t border-white/5 pt-12 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={24} className="text-indigo-400" />
                <span className="text-xl font-bold italic text-white">NEXUS</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                Redefining the boundaries of healthcare connectivity through 
                secure, scalable, and intelligent infrastructure.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/about" className="hover:text-indigo-400 transition-colors">About the Company</Link></li>
                <li><Link href="/portfolio" className="hover:text-indigo-400 transition-colors">Our Work</Link></li>
                <li><Link href="/portal" className="hover:text-indigo-400 transition-colors">Patient Portal</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/privacy" className="hover:text-indigo-400 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-indigo-400 transition-colors">Terms & Agreements</Link></li>
                <li><Link href="/cookies" className="hover:text-indigo-400 transition-colors">Cookie Settings</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/5 text-center">
            <p className="text-slate-600 text-xs">
              © {new Date().getFullYear()} NEXUS Connectivity Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
