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
      <style>{`
        @keyframes bounceRange {
          0%, 100% { transform: perspective(800px) rotateY(-10deg) translateY(10%); }
          50% { transform: perspective(800px) rotateY(10deg) translateY(-10%); }
        }
        @keyframes rootPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.02); opacity: 1; }
        }
        @keyframes sweepLight {
          0% { transform: translateX(-70px); opacity: 0; }
          15% { opacity: 0.6; }
          35% { opacity: 0.6; }
          50% { transform: translateX(100px); opacity: 0; }
          100% { transform: translateX(100px); opacity: 0; }
        }
        .tooth-logo-wrap { 
          animation: bounceRange 4s ease-in-out infinite; 
          transform-origin: center center; 
        }
        .tooth-full-body { 
          animation: rootPulse 5s ease-in-out infinite; 
          transform-origin: center; 
        }
        .tooth-sweep-light rect { animation: sweepLight 4s ease-in-out infinite; }
      `}</style>

      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0f172a]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">

            <Link href="/" className="flex items-center gap-0 group">
              <div className="relative p-1.5 transition-all duration-500">

                <svg
                  viewBox="0 0 200 200" 
                  className="w-10 h-10 tooth-logo-wrap drop-shadow-2xl"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    {/* Unified Gradient for Body and Roots */}
                    <linearGradient id="metalBodyLogo" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f8fafc" />
                      <stop offset="20%" stopColor="#cbd5e1" />
                      <stop offset="50%" stopColor="#64748b" />
                      <stop offset="100%" stopColor="#1e293b" />
                    </linearGradient>

                    <radialGradient id="crownGlareLogo" cx="30%" cy="20%" r="70%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                      <stop offset="50%" stopColor="#e2e8f0" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#64748b" stopOpacity="0" />
                    </radialGradient>

                    <filter id="bevelLogo" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur" />
                      <feOffset dx="1" dy="1.5" result="offsetBlur" />
                      <feFlood floodColor="#000000" floodOpacity="0.7" result="shadowColor" />
                      <feComposite in="shadowColor" in2="offsetBlur" operator="in" result="shadow" />
                      <feMerge>
                        <feMergeNode in="shadow" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    <clipPath id="toothClipLogo">
                      <path d="M 60 50 C 70 40 130 40 140 50 C 150 70 150 100 135 120 Q 145 140 150 180 Q 145 185 135 175 Q 125 160 120 130 Q 125 160 115 190 Q 110 195 100 185 Q 90 160 90 130 Q 80 160 70 190 Q 60 195 50 185 Q 40 175 45 180 Q 50 140 65 120 C 50 100 50 70 60 50 Z" />
                    </clipPath>
                  </defs>

                  <g filter="url(#bevelLogo)">
                    {/* Unified Single Path: Crown + 4 Merged Roots */}
                    <path 
                      className="tooth-full-body"
                      d="M 60 50 C 70 40 85 40 95 45 C 105 40 120 40 130 45 C 140 40 150 40 150 50 C 160 70 160 100 145 120 
                         Q 155 140 160 180 Q 155 185 145 175 Q 135 160 130 130 
                         Q 135 160 125 190 Q 120 195 110 185 Q 100 160 100 130 
                         Q 90 160 80 190 Q 70 195 60 185 Q 50 175 45 180 
                         Q 35 140 55 120 C 40 100 40 70 50 50 Z" 
                      fill="url(#metalBodyLogo)" 
                    />

                    {/* 3D Detail Overlays - These now sit on top of the unified body */}
                    {/* Primary Vertical Centerline */}
                    <path d="M 100 45 L 100 130" stroke="#1e293b" strokeWidth="2" opacity="0.5" /> 
                    
                    {/* Occlusal Grooves (Crown top) */}
                    <path d="M 65 55 Q 100 65 135 55" fill="none" stroke="#1e293b" strokeWidth="2" opacity="0.4" />
                    <path d="M 65 65 Q 100 75 135 65" fill="none" stroke="#1e293b" strokeWidth="1.5" opacity="0.3" />
                    
                    {/* Specular Rim Lighting (Creates the 3D 'edge' effect) */}
                    <path 
                      d="M 60 50 C 70 40 130 40 140 50 C 150 70 150 100 135 120" 
                      fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" 
                    />

                    {/* Crown Highlight Glare */}
                    <path 
                      d="M 60 50 C 70 40 85 40 95 45 C 105 40 120 40 130 45 C 140 40 150 40 150 50 C 160 70 160 100 145 120 L 125 130 L 75 130 L 55 120 C 40 100 40 70 50 50 Z" 
                      fill="url(#crownGlareLogo)" opacity="0.5" 
                    />
                  </g>

                  {/* Sweeping Light Reflection - Now clipped to the merged shape */}
                  <g className="tooth-sweep-light">
                    <rect x="-70" y="40" width="50" height="160" fill="white" clipPath="url(#toothClipLogo)" opacity="0.4" />
                  </g>
                </svg>

              </div>

              <span className="text-[67px] font-black tracking-tighter italic flex items-baseline -ml-0.5">
                <span className="bg-linear-to-b from-blue-700 via-blue-300 to-blue-900 bg-clip-text text-transparent">P</span>
                <span className="bg-linear-to-b from-[#ef5102] via-amber-300 to-amber-700 bg-clip-text text-transparent">D</span>
                <span className="bg-linear-to-b from-yellow-600 via-yellow-200 to-yellow-800 bg-clip-text text-transparent">G</span>
              </span>

            </Link>

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

            <div className="md:hidden">
              <button onClick={() => setIsOpen(!isOpen)} className="text-slate-400 hover:text-white">
                {isOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>

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
                      <linearGradient id="footGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#cbd5e1" />
                        <stop offset="50%" stopColor="#64748b" />
                        <stop offset="100%" stopColor="#334155" />
                      </linearGradient>
                    </defs>
                    <path d="M 60 50 C 70 40 130 40 140 50 C 150 70 150 100 135 120 Q 145 140 150 180 Q 145 185 135 175 Q 125 160 120 130 Q 125 160 115 190 Q 110 195 100 185 Q 90 160 90 130 Q 80 160 70 190 Q 60 195 50 185 Q 40 175 45 180 Q 35 140 55 120 C 40 100 40 70 50 50 Z" fill="url(#footGrad)" />
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
