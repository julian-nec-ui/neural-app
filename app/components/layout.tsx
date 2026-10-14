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
      {/* Inlined CSS for SVG Animations (Scoped & React-safe) */}
      <style>{`
        @keyframes bounceRange {
          0%, 100% { transform: perspective(800px) rotateY(-10deg) translateY(15%); }
          50% { transform: perspective(800px) rotateY(10deg) translateY(-15%); }
        }
        @keyframes rootPulse {
          0%, 100% { transform: scaleY(1); opacity: 0.9; }
          50% { transform: scaleY(1.035); opacity: 1; }
        }
        @keyframes sweepLight {
          0% { transform: translateX(-60px); opacity: 0; }
          10% { opacity: 0.5; }
          30% { opacity: 0.5; }
          40% { transform: translateX(80px); opacity: 0; }
          100% { transform: translateX(80px); opacity: 0; }
        }
        .tooth-logo-wrap { 
          animation: bounceRange 4s ease-in-out infinite; 
          transform-origin: center center; 
        }
        .tooth-roots-pulse { 
          animation: rootPulse 5.0s ease-in-out infinite; 
          transform-origin: center; 
        }
        .tooth-sweep-light rect { animation: sweepLight 4s ease-in-out infinite; }
      `}</style>

      {/* --- HEADER --- */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0f172a]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">

            {/* Logo Section */}
            <Link href="/" className="flex items-center gap-0 group">
              <div className="relative p-1.5 transition-all duration-500">

                {/* --- METALLIC 3D TOOTH WITH 4 ROOTS & ANIMATION --- */}
                <svg
                  viewBox="0 0 200 200" 
                  className="w-10 h-10 tooth-logo-wrap drop-shadow-lg"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="metalBodyLogo" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f8fafc" />
                      <stop offset="40%" stopColor="#cbd5e1" />
                      <stop offset="65%" stopColor="#64748b" />
                      <stop offset="90%" stopColor="#334155" />
                    </linearGradient>

                    <radialGradient id="crownGlareLogo" cx="30%" cy="20%" r="70%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                      <stop offset="40%" stopColor="#e2e8f0" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#64748b" stopOpacity="0" />
                    </radialGradient>

                    <linearGradient id="rootShadowLogo" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#94a3b8" />
                      <stop offset="60%" stopColor="#475569" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>

                    <filter id="bevelLogo" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                      <feOffset dx="1.5" dy="2" result="offsetBlur" />
                      <feFlood floodColor="#000000" floodOpacity="0.5" result="shadowColor" />
                      <feComposite in="shadowColor" in2="offsetBlur" operator="in" result="shadow" />
                      <feMerge>
                        <feMergeNode in="shadow" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    <clipPath id="toothClipLogo">
                      <path d="M 70 40 C 85 30 115 30 130 40 C 145 60 145 100 130 130 L 115 150 L 85 150 L 70 130 C 55 100 55 60 70 40 Z" />
                    </clipPath>
                  </defs>

                  <g filter="url(#bevelLogo)">
                    {/* Crown Base - Made more square/wider */}
                    <path d="M 70 40 C 85 30 115 30 130 40 C 145 60 145 100 130 130 L 115 150 L 85 150 L 70 130 C 55 100 55 60 70 40 Z" fill="url(#metalBodyLogo)" />

                    {/* 3D Grooves and Wall Details */}
                    <path d="M 100 40 L 100 150" stroke="#475569" strokeWidth="3" opacity="0.4" /> {/* Central vertical groove */}
                    <path d="M 75 60 Q 100 70 125 60" fill="none" stroke="#334155" strokeWidth="2" opacity="0.3" /> {/* Top anatomy curve */}
                    <path d="M 80 110 Q 100 120 120 110" fill="none" stroke="#334155" strokeWidth="2" opacity="0.3" /> {/* Bottom anatomy curve */}
                    
                    {/* Crown Highlight Overlay */}
                    <path d="M 70 40 C 85 30 115 30 130 40 C 145 60 145 100 130 130 L 115 150 L 85 150 L 70 130 C 55 100 55 60 70 40 Z" fill="url(#crownGlareLogo)" opacity="0.6" />

                    {/* Metallic Edge Stroke */}
                    <path d="M 70 40 C 85 30 115 30 130 40 C 145 60 145 100 130 130 L 115 150 L 85 150 L 70 130 C 55 100 55 60 70 40 Z" fill="none" stroke="#f1f5f9" strokeWidth="1.5" opacity="0.5" />

                    {/* 4 Enhanced Roots - Thicker and more visible */}
                    <g className="tooth-roots-pulse">
                      {/* Front Left Root */}
                      <path d="M 85 140 L 70 180 Q 65 190 75 190 Q 85 190 90 170 Z" fill="url(#rootShadowLogo)" />
                      {/* Front Right Root */}
                      <path d="M 115 140 L 130 180 Q 135 190 125 190 Q 115 190 110 170 Z" fill="url(#rootShadowLogo)" />
                      {/* Back Left Root */}
                      <path d="M 80 130 L 60 170 Q 55 180 65 180 Q 75 180 80 150 Z" fill="url(#rootShadowLogo)" opacity="0.8" />
                      {/* Back Right Root */}
                      <path d="M 120 130 L 140 170 Q 145 180 135 180 Q 125 180 120 150 Z" fill="url(#rootShadowLogo)" opacity="0.8" />
                    </g>
                  </g>

                  {/* Sweeping Light Reflection */}
                  <g className="tooth-sweep-light">
                    <rect x="-60" y="30" width="40" height="170" fill="white" clipPath="url(#toothClipLogo)" />
                  </g>
                </svg>

              </div>

              <span className="text-[67px] font-black tracking-tighter italic flex items-baseline -ml-0.5">
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
              <div className="flex items-center gap-0">
                <div className="p-0">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 200 200"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="drop-shadow-md tooth-logo-wrap"
                  >
                    <defs>
                      <linearGradient id="footGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#cbd5e1" />
                        <stop offset="50%" stopColor="#64748b" />
                        <stop offset="100%" stopColor="#334155" />
                      </linearGradient>
                    </defs>
                    <path d="M 70 40 C 85 30 115 30 130 40 C 145 60 145 100 130 130 L 115 150 L 85 150 L 70 130 C 55 100 55 60 70 40 Z" fill="url(#footGrad)" />
                  </svg>
                </div>
                <span className="text-xl font-bold italic text-white -ml-1">PDG</span>
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
