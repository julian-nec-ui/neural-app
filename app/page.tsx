import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Zap, Globe } from 'lucide-react';
import Layout from "../app/components/layout";

export default function HomePage() {
  return (
    <Layout>
      <div className="relative overflow-hidden">
        {/* Background Blur Effects */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 -right-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none" />

        {/* Hero Section */}
        <section className="relative z-10 max-w-7xl mx-auto px-4 py-24 sm:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[#93e3d0] text-sm font-medium mb-6">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            Now accepting new patients
          </div>
          
          <h1 className="text-6xl sm:text-8xl font-black tracking-tighter italic mb-6">
            <span className="bg-linear-to-br from-white via-slate-400 to-slate-600 bg-clip-text text-transparent">
              BRIDGE THE <br /> GAP OF CARE
            </span>
          </h1>
          
          <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Nexus provides the most secure and seamless connectivity infrastructure for 
            modern healthcare providers and patients worldwide.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 group">
              Get Started <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/portfolio" className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-lg transition-all">
              View Portfolio
            </Link>
          </div>
        </section>

        {/* Features Grid */}
        <section className="relative z-10 max-w-7xl mx-auto px-4 py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <ShieldCheck className="text-indigo-400" />, title: "Bank-Grade Security", desc: "End-to-end encryption ensuring patient data remains private and secure." },
              { icon: <Zap className="text-cyan-400" />, title: "Instant Sync", desc: "Real-time data synchronization across all medical devices and portals." },
              { icon: <Globe className="text-indigo-400" />, title: "Global Reach", desc: "Deployed across 14 countries, connecting millions of care points." },
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-indigo-500/50 transition-all group">
                <div className="mb-4 p-3 bg-slate-900 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
