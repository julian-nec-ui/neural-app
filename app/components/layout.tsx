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
                  xmlns="http://w3.org"
                  viewBox="0 0 400 450"
                  className="w-full h-full drop-shadow-[0_0_25px_rgba(148,163,184,0.15)]"
                >
                  <defs>
                    {/* Base Chrome/Metallic Gradient for Left/Front Faces */}
                    <linearGradient id="chrome-light" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f8fafc" />
                      <stop offset="20%" stopColor="#cbd5e1" />
                      <stop offset="40%" stopColor="#475569" />
                      <stop offset="45%" stopColor="#94a3b8" />
                      <stop offset="50%" stopColor="#f1f5f9" />
                      <stop offset="80%" stopColor="#64748b" />
                      <stop offset="100%" stopColor="#1e293b" />
                    </linearGradient>

                    {/* Darker Metallic Gradient for Depth, Shadows, and Back Roots */}
                    <linearGradient id="chrome-dark" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#94a3b8" />
                      <stop offset="25%" stopColor="#475569" />
                      <stop offset="50%" stopColor="#1e293b" />
                      <stop offset="75%" stopColor="#334155" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>

                    {/* Ultra Bright Specular Highlight Gradient */}
                    <linearGradient id="specular" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                      <stop offset="50%" stopColor="#ffffff" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>

                    {/* Soft Glow Filter for High-End Metallic Reflection */}
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* BACKGROUND ROOTS (The two rear roots of the four-rooted molar) */}
                  <g className="animate-[pulse_4s_easeInOut_infinite] opacity-80">
                    {/* Root 3: Rear Left */}
                    <path
                      d="M 160 240 C 150 290, 135 340, 120 370 C 115 380, 125 385, 132 375 C 150 345, 175 295, 185 245 Z"
                      fill="url(#chrome-dark)"
                      stroke="#475569"
                      strokeWidth="1"
                    />
                    {/* Root 4: Rear Right */}
                    <path
                      d="M 240 240 C 250 290, 265 340, 280 370 C 285 380, 275 385, 268 375 C 250 345, 225 295, 215 245 Z"
                      fill="url(#chrome-dark)"
                      stroke="#475569"
                      strokeWidth="1"
                    />
                  </g>

                  {/* MAIN TOOTH BODY & FOREGROUND ROOTS */}
                  {/* Animated via Tailwind tracking keyframe behaviors mapping to clean metallic shimmer */}
                  <g className="transition-all duration-700 ease-in-out hover:scale-[1.02] origin-center">

                    {/* Root 1: Front Left */}
                    <path
                      d="M 135 230 C 120 290, 90 350, 75 400 C 70 415, 88 415, 95 395 C 120 340, 155 270, 175 230 Z"
                      fill="url(#chrome-light)"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                    />

                    {/* Root 2: Front Right */}
                    <path
                      d="M 265 230 C 280 290, 310 350, 325 400 C 330 415, 312 415, 305 395 C 280 340, 245 270, 225 230 Z"
                      fill="url(#chrome-light)"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                    />

                    {/* Crown Body (Molar Top) */}
                    <path
                      d="M 100 150 
                 C 80 120, 110 70, 150 85 
                 C 180 95, 220 95, 250 85 
                 C 290 70, 320 120, 300 150 
                 C 315 200, 280 240, 265 245 
                 C 235 220, 165 220, 135 245 
                 C 120 240, 85 200, 100 150 Z"
                      fill="url(#chrome-light)"
                      stroke="#cbd5e1"
                      strokeWidth="2"
                    />

                    {/* Metallic Cusp Ridges / Contours for 3D Illusion */}
                    <path
                      d="M 150 85 C 170 120, 230 120, 250 85"
                      fill="none"
                      stroke="#475569"
                      strokeWidth="3"
                      opacity="0.4"
                    />
                    <path
                      d="M 100 150 C 140 160, 260 160, 300 150"
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth="2"
                      opacity="0.5"
                    />
                    <path
                      d="M 195 95 L 195 225"
                      fill="none"
                      stroke="url(#chrome-dark)"
                      strokeWidth="4"
                      opacity="0.3"
                    />

                    {/* SPECULAR SHIMMER OVERLAYS (Animated Liquid-like Metal Highlights) */}
                    {/* Left Crown Highlight */}
                    <path
                      d="M 115 140 C 105 120, 125 95, 150 100 C 135 110, 125 125, 120 145 Z"
                      fill="url(#specular)"
                      className="animate-[pulse_3s_infinite_alternate] mix-blend-overlay"
                      filter="url(#glow)"
                    />

                    {/* Right Crown Highlight */}
                    <path
                      d="M 285 140 C 295 120, 275 95, 250 100 C 265 110, 275 125, 280 145 Z"
                      fill="url(#specular)"
                      className="animate-[pulse_3s_infinite_alternate_1.5s] mix-blend-overlay"
                      filter="url(#glow)"
                    />

                    {/* Center Crown High-Gloss Sheen Line (Animated Liquid-like Metal Highlights) */}
                    <ellipse
                      cx="200"
                      cy="130"
                      rx="45"
                      ry="8"
                      fill="url(#specular)"
                      transform="rotate(-10, 200, 130)"
                      className="animate-[ping_5s_infinite] opacity-20 mix-blend-screen"
                    />
                  </g>
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
