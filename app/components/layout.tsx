"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

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
            
            {/* Logo Section */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 group-hover:border-blue-400/50 transition-all duration-500 shadow-[0_0_15px_rgba(59,130,246,0.2)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                
                {/* METALLIC HEALTHY TOOTH SVG */}
                <svg 
                  width="30" 
                  height="30" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]"
                >
                  <defs>
                    <linearGradient id="toothGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#93C5FD" /> {/* Light Blue */}
                      <stop offset="50%" stopColor="#FFFFFF" /> {/* White Polish */}
                      <stop offset="100%" stopColor="#1E40AF" /> {/* Deep Blue */}
                    </linearGradient>
                  </defs>
                  <path 
                    d="M12 2C9 2 7 4 7 7C7 9 8 11 8 13C8 16 6 18 5 20C5 21 6 22 7 22C8 22 9 21 9 20C9 18 10 17 11 17C12 17 13 18 13 20C13 21 14 22 15 22C16 22 17 21 17 20C17 18 15 16 15 13C15 11 16 9 16 7C16 4 14 2 12 2Z" 
                    fill="url(#toothGrad)" 
                  />
                  <circle cx="10" cy="6" r="1.2" fill="white" className="animate-pulse" />
                </svg>
              </div>

              {/* Brand Text matching Home Page Metallic Colors */}
              <span className="text-2xl font-black tracking-tighter italic flex items-baseline">
                <span className="bg-linear-to-b from-blue-700 via-blue-300 to-blue-900 bg-clip-text text-transparent">P</span>
                <span className="bg-linear-to-b from-[#ef5102] via-amber-300 to-amber-700 bg-clip-text text-transparent">D</span>
                <span className="bg-linear-to-b from-yellow-600 via-yellow-200 to-yellow-800 bg-clip-text text-transparent">G</span>
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
                Join PDG
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
              Join PDG
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
              <div className="flex items-center gap-3">
                {/* Footer Version of Metallic Tooth */}
                <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C9 2 7 4 7 7C7 9 8 11 8 13C8 16 6 18 5 20C5 21 6 22 7 22C8 22 9 21 9 20C9 18 10 17 11 17C12 17 13 18 13 20C13 21 14 22 15 22C16 22 17 21 17 20C17 18 15 16 15 13C15 11 16 9 16 7C16 4 14 2 12 2Z" fill="url(#toothGrad)" />
                  </svg>
                </div>
                <span className="text-xl font-bold italic text-white">PDG</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                Redefining the boundaries of dental connectivity through 
                secure, scalable, and intelligent infrastructure.
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/about" className="hover:text-indigo-400 transition-colors">About the Company</Link></li>
                <li><Link href="/portfolio" className="hover:text-indigo-400 transition-colors">Our Work</Link></li>
                <li><Link href="/portal" className="hover:text-indigo-400 transition-colors">Patient Portal</Link></li>
              </ul>
            </div>

            <div className="flex flex-col gap-2">
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
              © {new Date().getFullYear()} Prewitt Dental Group. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
