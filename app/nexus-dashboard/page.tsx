"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Settings, 
  LogOut, 
  Bell, 
  Search, 
  UserCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { nexusService } from '../service/nexus-service';

// --- TYPES ---
type StatColor = 'indigo' | 'cyan' | 'emerald';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
  color: StatColor;
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
}

const ToothIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-indigo-400">
    <path d="M12 2C9 2 7 4 7 7C7 9 8 11 9 12C8 13 7 15 7 17C7 20 9 22 12 22C15 22 17 20 17 17C17 15 16 13 15 12C16 11 17 9 17 7C17 4 15 2 12 2ZM12 4C13.5 4 14.5 5 14.5 6.5C14.5 8 13.5 9 12 9C10.5 9 9.5 8 9.5 6.5C9.5 5 10.5 4 12 4ZM12 14C13 14 14 15 14 16.5C14 18 13 19 12 19C11 19 10 18 10 16.5C10 15 11 14 12 14Z" fill="currentColor" />
  </svg>
);

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // THE METALLIC GRADIENTS (Fixed for text-clipping)
  const metallicStyles = {
    base: {
      backgroundSize: '200% auto',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      display: 'inline-block',
      animation: 'metallic-flow 6s linear infinite',
      fontWeight: '900', // Extra bold for maximum impact
    },
    royalBlue: { background: 'linear-gradient(to right, #001a4d 0%, #4169E1 25%, #B0C4DE 50%, #4169E1 75%, #001a4d 100%)' },
    orange: { background: 'linear-gradient(to right, #c47100 0%, #f2994a 25%, #ffe4b5 50%, #f2994a 75%, #c47100 100%)' },
    yellow: { background: 'linear-gradient(to right, #b8860b 0%, #f8b500 25%, #fff9c4 50%, #f8b500 75%, #b8860b 100%)' },
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await nexusService.logout();
      router.refresh();
      router.push('/login');
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
    { name: 'Clients', icon: <Users size={20} />, path: '/clients' },
    { name: 'Appointments', icon: <Calendar size={20} />, path: '/appointments' },
    { name: 'Settings', icon: <Settings size={20} />, path: '/settings' },
  ];

  return (
    <div className="min-h-screen w-full bg-[#0f172a] text-slate-200 flex font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes metallic-flow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}} />

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0a0f1f] border-r border-white/10 flex flex-col sticky top-0 h-screen transition-all duration-300">
        <div className="p-6 flex items-center gap-3 mb-8">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <ToothIcon />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">Nexus<span className="text-indigo-400">Core</span></span>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === item.name 
                ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]" 
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} disabled={isLoggingOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all duration-200 font-medium">
            {isLoggingOut ? <Loader2 className="animate-spin" size={20} /> : <LogOut size={20} />}
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 -left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <header className="h-20 border-b border-white/10 backdrop-blur-md bg-[#0f172a]/60 sticky top-0 z-20 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* THE LOGO FIX: No more rectangles, just a clean PDG with the metallic gradients */}
            <h2 className="text-5xl sm:text-7xl font-black tracking-tighter italic">
              <span className="drop-shadow-sm">
                <span style={{ ...metallicStyles.base, ...metallicStyles.royalBlue }}>P</span>
                <span style={{ ...metallicStyles.base, ...metallicStyles.orange }} className="mx-1">D</span>
                <span style={{ ...metallicStyles.base, ...metallicStyles.yellow }}>G</span>
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input type="text" placeholder="Search records..." className="bg-slate-900/50 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all w-64" />
            </div>
            <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
              <Bell size={22} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-[#0f172a]"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <span className="text-sm font-medium text-slate-300 hidden md:block">Marvin Mulvaie</span>
              <div className="w-10 h-10 rounded-full bg-linear-to-tr from-indigo-600 to-cyan-500 p-0.5">
                <div className="w-full h-full rounded-full bg-[#0f172a] flex items-center justify-center">
                  <UserCircle size={24} className="text-slate-300" />
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 relative z-10">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Welcome Back, Marvin! 👋</h1>
            <p className="text-slate-400">Here is what&apos;s happening with your clinic today.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <StatCard title="Total Patients" value="1,284" icon={<Users className="text-indigo-400" />} trend="+12% this month" color="indigo" />
            <StatCard title="Today's Appointments" value="18" icon={<Calendar className="text-cyan-400" />} trend="4 pending" color="cyan" />
            <StatCard title="Completion Rate" value="94%" icon={<CheckCircle className="text-emerald-400" />} trend="Top 5% of region" color="emerald" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Recent Activity</h3>
                <button className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">View All</button>
              </div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                        <UserCircle size={20} className="text-slate-400 group-hover:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">Patient #00{i} Registered</p>
                        <p className="text-xs text-slate-500">2 hours ago</p>
                      </div>
                    </div>
                    <div className="text-xs font-medium px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      New
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6">
              <h3 className="text-xl font-bold text-white mb-6">Quick Actions</h3>
              <div className="space-y-3">
                <ActionButton icon={<Users size={18} />} label="Add New Patient" />
                <ActionButton icon={<Calendar size={18} />} label="Schedule Appointment" />
                <ActionButton icon={<TrendingUp size={18} />} label="Revenue Reports" />
                <ActionButton icon={<Clock size={18} />} label="Manage Queue" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color }) => {
  const colorClasses: Record<StatColor, string> = {
    indigo: "from-indigo-600/20 to-transparent border-indigo-500/20",
    cyan: "from-cyan-600/20 to-transparent border-cyan-500/20",
    emerald: "from-emerald-600/20 to-transparent border-emerald-500/20",
  };

  return (
    <div className={`p-6 rounded-3xl border bg-linear-to-r ${colorClasses[color]} backdrop-blur-xl`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-slate-900/50 rounded-2xl border border-white/10">
          {icon}
        </div>
        <span className="text-xs font-medium text-slate-400 bg-white/5 px-2 py-1 rounded-lg">{trend}</span>
      </div>
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
    </div>
  );
};

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label }) => (
  <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-indigo-600 hover:text-white transition-all duration-200 group">
    <span className="group-hover:scale-110 transition-transform">{icon}</span>
    <span className="text-sm font-medium">{label}</span>
  </button>
);

export default DashboardPage;
