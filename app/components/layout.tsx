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
              <div className="relative p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 group-hover:border-blue-400/50 transition-all duration-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]">

                {/* --- PROFESSIONAL REALISTIC TOOTH SVG --- */}
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-lg"
                >
                  {/** Enhanced Metallic Enamel Gradient */}
                  <defs>
                    <linearGradient id="enamelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#E6F7FF" />
                      <stop offset="30%" stopColor="#FFFFFF" />
                      <stop offset="50%" stopColor="#E0F2FE" />
                      <stop offset="70%" stopColor="#93C5FD" />
                      <stop offset="100%" stopColor="#1E40AF" />
                    </linearGradient>

                    {/** Enhanced Shadow Gradient */}
                    <linearGradient id="shadowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#1E40AF" stopOpacity="0.7" />
                      <stop offset="50%" stopColor="#1E3A8A" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0.2" />
                    </linearGradient>

                    {/** Enhanced Specular Highlights */}
                    <radialGradient id="highlightGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
                    </radialGradient>

                    {/** Subtle Texture Pattern */}
                    <pattern id="texturePattern" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="1" fill="#FFFFFF" opacity="0.1" />
                    </pattern>
                  </defs>

                  {/** Main Tooth Structure */}
                  <path
                    d="M12 2C14.5 2 17 3.5 17 7C17 9 16 11 16 13C16 16 18 18 19 20C20 22 18 23 17 23C16 23 15 22 15 20C15 18 14 17 13 17C12 17 11 18 11 20C11 22 10 23 9 23C8 23 7 22 7 20C7 18 9 16 9 13C9 11 8 9 8 7C8 3.5 10.5 2 12 2Z"
                    fill="url(#enamelGrad)"
                  />

                  {/** Texture Layer for Realism */}
                  <path
                    d="M12 2C14.5 2 17 3.5 17 7C17 9 16 11 16 13C16 16 18 18 19 20C20 22 18 23 17 23C16 23 15 22 15 20C15 18 14 17 13 17C12 17 11 18 11 20C11 22 10 23 9 23C8 23 7 22 7 20C7 18 9 16 9 13C9 11 8 9 8 7C8 3.5 10.5 2 12 2Z"
                    fill="url(#texturePattern)"
                  />

                  {/** Enhanced Depth Layer */}
                  <path
                    d="M12 4C11 4 10 5 10 7C10 9 11 11 12 11C13 11 14 9 14 7C14 5 13 4 12 4Z"
                    fill="url(#shadowGrad)"
                    opacity="0.6"
                  />

                  {/** Enhanced Specular Highlights */}
                  <path
                    d="M9 6C8.5 7 8.5 9 8.5 11C8.5 13 9 14 10 15"
                    stroke="url(#highlightGrad)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeOpacity="0.8"
                    filter="blur(0.5px)"
                  />

                  {/** Multiple Highlights for Realism */}
                  <circle cx="10" cy="7" r="1" fill="url(#highlightGrad)" opacity="0.9" />
                  <circle cx="12" cy="6" r="0.8" fill="url(#highlightGrad)" opacity="0.8" />
                  <circle cx="14" cy="8" r="1.2" fill="url(#highlightGrad)" opacity="0.7" />

                  {/** Subtle Sparkle Effect */}
                  <circle cx="15" cy="5" r="1" fill="white" className="animate-pulse" opacity="0.6" />
                  <circle cx="18" cy="12" r="0.6" fill="white" className="animate-pulse" opacity="0.4" />

                  {/** Inner Tooth Details */}
                  <path
                    d="M11 9C11 9.5 11.5 10 12 10C12.5 10 13 9.5 13 9C13 8.5 12.5 8 12 8C11.5 8 11 8.5 11 9Z"
                    fill="url(#shadowGrad)"
                    opacity="0.4"
                  />
                </svg>

              </div>

              {/* Brand Text */}
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

      <main className="grow">
        {children}
      </main>

      <footer className="bg-[#0a0f1d] border-t border-white/5 pt-12 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C14.5 2 17 3.5 17 7C17 9 16 11 16 13C16 16 18 18 19 20C20 22 18 23 17 23C16 23 15 22 15 20C15 18 14 17 13 17C12 17 11 18 11 20C11 22 10 23 9 23C8 23 7 22 7 20C7 18 9 16 9 13C9 11 8 9 8 7C8 3.5 10.5 2 12 2Z" fill="url(#enamelGrad)" />
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
