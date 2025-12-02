import React from 'react';
import {
    Home,
    Zap,
    Target,
    User,
    Trophy,
    Users,
    ShoppingCart,
    BookOpen as Book,
    Activity,
    Hexagon
} from 'lucide-react';
import { GlitchText } from '../ui/GlitchText';

export const Sidebar = ({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen, currentUser, onLogout }) => {
    const NavItem = ({ id, icon: Icon, label }) => (
        <button
            onClick={() => {
                setActiveTab(id);
                setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-4 px-6 py-4 transition-all duration-300 border-r-2 text-left ${activeTab === id
                ? 'bg-white/5 border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-200 hover:bg-white/5'
                }`}
        >
            <Icon size={20} className={activeTab === id ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : ''} />
            <span className="tracking-wider text-sm font-bold uppercase">{label}</span>
        </button>
    );

    return (
        <aside
            className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                } md:translate-x-0 fixed md:sticky top-16 md:top-0 z-40 w-64 h-[calc(100vh-64px)] md:h-screen bg-[#080808] border-r border-slate-800 flex flex-col transition-transform duration-300`}
        >
            <div className="hidden md:flex items-center justify-center h-20 border-b border-slate-800 bg-black/50">
                <GlitchText text="RIFT SOCIAL" className="text-2xl text-white" />
            </div>

            <div className="p-6 border-b border-slate-800/50 bg-gradient-to-b from-slate-900/50 to-transparent">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 border border-slate-600 rounded-sm overflow-hidden bg-slate-900">
                        <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full bg-slate-800 object-cover" />
                    </div>
                    <div className="overflow-hidden">
                        <div className="text-white font-bold truncate">{currentUser.username}</div>
                        <div className="text-xs text-cyan-500">Level {currentUser.level}</div>
                    </div>
                </div>
                <div className="flex justify-between text-xs font-mono text-slate-500 bg-black/40 p-2 rounded border border-slate-800">
                    <div className="flex items-center gap-1"><Hexagon size={10} className="text-cyan-500" /> {currentUser.currency.riftTokens}</div>
                    <div className="flex items-center gap-1"><Zap size={10} className="text-purple-500" /> {currentUser.currency.plasmaCredits}</div>
                </div>
            </div>

            <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
                <NavItem id="home" icon={Home} label="Dashboard" />
                <NavItem id="play" icon={Zap} label="Play" />
                <NavItem id="loadouts" icon={Target} label="Loadouts" />
                <NavItem id="profile" icon={User} label="My Profile" />
                <NavItem id="leaderboard" icon={Trophy} label="Leaderboards" />
                <NavItem id="clans" icon={Users} label="Clans" />
                <NavItem id="shop" icon={ShoppingCart} label="Shop" />
                <NavItem id="wiki" icon={Book} label="Wiki" />
                <NavItem id="settings" icon={Activity} label="Settings" />
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button onClick={onLogout} className="w-full py-2 bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40 text-xs uppercase tracking-widest transition-colors font-bold">
                    Log Out
                </button>
            </div>
        </aside>
    );
};
