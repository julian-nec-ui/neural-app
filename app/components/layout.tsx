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
        @keyframes pulseGlow {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(148, 163, 184, 0.15)); }
          50% { filter: drop-shadow(0 0 18px rgba(148, 163, 184, 0.5)); }
        }
        @keyframes rootPulse {
          0%, 100% { transform: scaleY(1); opacity: 0.9; }
          50% { transform: scaleY(1.025); opacity: 1; }
        }
        @keyframes sweepLight {
          0% { transform: translateX(-60px); opacity: 0; }
          10% { opacity: 0.5; }
          30% { opacity: 0.5; }
          40% { transform: translateX(80px); opacity: 0; }
          100% { transform: translateX(80px); opacity: 0; }
        }
        .tooth-logo-wrap { 
          animation: bounceRange 4s ease-in-out infinite, pulseGlow 2.8s ease-in-out infinite; 
          transform-origin: center center; 
        }
        .tooth-roots-pulse { animation: rootPulse 3.2s ease-in-out infinite; transform-origin: center; }
        .tooth-sweep-light rect { animation: sweepLight 3s ease-in-out infinite; }
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
                  viewBox="0 0 200 300"
                  className="w-8 h-12 tooth-logo-wrap drop-shadow-lg"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="metalBodyLogo" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f8fafc"/>
                      <stop offset="40%" stopColor="#cbd5e1"/>
                      <stop offset="65%" stopColor="#64748b"/>
                      <stop offset="90%" stopColor="#334155"/>
                    </linearGradient>

                    <radialGradient id="crownGlareLogo" cx="30%" cy="20%" r="70%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"/>
                      <stop offset="40%" stopColor="#e2e8f0" stopOpacity="0.5"/>
                      <stop offset="100%" stopColor="#64748b" stopOpacity="0"/>
                    </radialGradient>

                    <linearGradient id="rootShadowLogo" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#94a3b8"/>
                      <stop offset="60%" stopColor="#475569"/>
                      <stop offset="100%" stopColor="#0f172a"/>
                    </linearGradient>

                    <filter id="bevelLogo" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
                      <feOffset dx="1.5" dy="2" result="offsetBlur"/>
                      <feFlood floodColor="#000000" floodOpacity="0.5" result="shadowColor"/>
                      <feComposite in="shadowColor" in2="offsetBlur" operator="in" result="shadow"/>
                      <feMerge>
                        <feMergeNode in="shadow"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>

                    <clipPath id="toothClipLogo">
                      <path d="M 85 30 C 100 25 120 30 125 45 C 135 65 137 90 130 115 C 123 135 113 150 105 165 L 100 185 Q 98 192 95 192 Q 92 192 90 185 L 85 165 C 77 150 67 135 60 115 C 53 90 55 65 65 45 C 70 30 85 35 85 30 Z"/>
                    </clipPath>
                  </defs>

                  <g filter="url(#bevelLogo)">
                    {/* Crown Base */}
                    <path d="M 85 30 C 100 25 120 30 125 45 C 135 65 137 90 130 115 C 123 135 113 150 105 165 L 100 185 Q 98 192 95 192 Q 92 192 90 185 L 85 165 C 77 150 67 135 60 115 C 53 90 55 65 65 45 C 70 30 85 35 85 30 Z" fill="url(#metalBodyLogo)"/>
                    
                    {/* Crown Highlight Overlay */}
                    <path d="M 85 30 C 100 25 120 30 125 45 C 135 65 137 90 130 115 C 123 135 113 150 105 165 L 100 185 Q 98 192 95 192 Q 92 192 90 185 L 85 165 C 77 150 67 135 60 115 C 53 90 55 65 65 45 C 70 30 85 35 85 30 Z" fill="url(#crownGlareLogo)" opacity="0.7"/>
                    
                    {/* Metallic Edge Stroke */}
                    <path d="M 85 30 C 100 25 120 30 125 45 C 135 65 137 90 130 115 C 123 135 113 150 105 165 L 100 185 Q 98 192 95 192 Q 92 192 90 185 L 85 165 C 77 150 67 135 60 115 C 53 90 55 65 65 45 C 70 30 85 35 85 30 Z" fill="none" stroke="#f1f5f9" strokeWidth="1" opacity="0.5"/>

                    {/* 4 Animated Roots */}
                    <g className="tooth-roots-pulse">
                      <path d="M 88 160 L 78 185 Q 72 205 68 225 Q 66 220 74 200 L 84 170 Z" fill="url(#rootShadowLogo)"/>
                      <path d="M 102 160 L 112 185 Q 118 205 122 225 Q 124 220 116 200 L 106 170 Z" fill="url(#rootShadowLogo)"/>
                      <path d="M 82 168 L 72 195 Q 66 218 60 240 Q 58 235 68 210 L 78 185 Z" fill="url(#rootShadowLogo)"/>
                      <path d="M 108 168 L 118 195 Q 124 218 130 240 Q 132 235 122 210 L 112 185 Z" fill="url(#rootShadowLogo)"/>
                    </g>
                  </g>

                  {/* Sweeping Light Reflection */}
                  <g className="tooth-sweep-light">
                    <rect x="-60" y="20" width="36" height="270" fill="white" clipPath="url(#toothClipLogo)"/>
                  </g>
                </svg>

              </div>

              {/* Brand Text - Increased by 25% (approx 67.5px) */}
              <span className="text-[67px] font-black tracking-tighter italic flex items-baseline -ml-5">
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
                    height="33" 
                    viewBox="0 0 200 300" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="drop-shadow-md tooth-logo-wrap"
                  >
                    <defs>
                      <linearGradient id="footGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#cbd5e1"/>
                        <stop offset="50%" stopColor="#64748b"/>
                        <stop offset="100%" stopColor="#334155"/>
                      </linearGradient>
                    </defs>
                    <path d="M 85 30 C 100 25 120 30 125 45 C 135 65 137 90 130 115 C 123 135 113 150 105 165 L 100 185 Q 98 192 95 192 Q 92 192 90 185 L 85 165 C 77 150 67 135 60 115 C 53 90 55 65 65 45 C 70 30 85 35 85 30 Z" fill="url(#footGrad)"/>
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
