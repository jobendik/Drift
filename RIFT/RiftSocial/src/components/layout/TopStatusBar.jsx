import React from 'react';
import { Search } from 'lucide-react';

export const TopStatusBar = () => (
    <header className="hidden md:flex justify-between items-center mb-10">
        <div className="text-xs text-slate-500 font-mono flex items-center gap-4">
            <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> SERVERS ONLINE
            </span>
            <span>PING: 24ms</span>
            <span>PLAYERS: 124,592</span>
        </div>
        <div className="relative group">
            <input
                type="text"
                placeholder="SEARCH PLAYER / CLAN..."
                className="bg-black border border-slate-800 text-slate-300 px-4 py-2 w-64 text-sm focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition-all font-mono"
            />
            <Search className="absolute right-3 top-2.5 text-slate-600 w-4 h-4 group-focus-within:text-cyan-400" />
        </div>
    </header>
);
