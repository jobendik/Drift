import React from 'react';
import { Activity, Crosshair, Trophy, Flame, Clock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { StatBox } from '../components/ui/StatBox';

export const HomeView = ({ currentUser }) => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="relative h-64 rounded-sm overflow-hidden border border-slate-800 group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-slate-900 to-black opacity-60 group-hover:opacity-70 transition-all duration-500" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay" />

            <div className="absolute bottom-0 left-0 p-8 w-full max-w-2xl">
                <div className="flex items-center space-x-2 mb-2">
                    <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500 text-orange-400 text-xs font-bold uppercase tracking-wider">Season 4 Live</span>
                    <span className="text-slate-400 text-xs">|</span>
                    <span className="text-cyan-400 text-xs font-mono">PATCH 4.2.0</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white mb-2 italic tracking-tighter">NEON HORIZON</h1>
                <p className="text-slate-300 mb-6 max-w-lg">New map "Core Reactor" added to ranked rotation. Double XP weekend starts now.</p>
                <button className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-6 uppercase tracking-wider skew-x-[-10deg] transition-all hover:shadow-[0_0_20px_rgba(34,211,238,0.6)]">
                    <span className="block skew-x-[10deg]">Play Ranked</span>
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card glow="purple" className="col-span-2">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white text-lg flex items-center gap-2"><Activity size={18} className="text-purple-500" /> Recent Performance</h3>
                    <span className="text-xs text-slate-500 font-mono">LAST 4 MATCHES</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatBox label="K/D Ratio" value={currentUser.stats.kdr} icon={Crosshair} color="text-red-400" />
                    <StatBox label="Win Rate" value={currentUser.stats.winRate} icon={Trophy} color="text-yellow-400" />
                    <StatBox label="Accuracy" value={`${currentUser.stats.accuracy}%`} icon={Crosshair} />
                    <StatBox label="Play Time" value={currentUser.stats.playTime} icon={Clock} color="text-slate-300" />
                </div>
            </Card>

            <Card glow="orange">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white text-lg flex items-center gap-2"><Flame size={18} className="text-orange-500" /> Daily Challenge</h3>
                    <span className="text-xs text-orange-500 font-bold border border-orange-500/30 px-2 rounded-full">ACTIVE</span>
                </div>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-300">Headshot Kills</span>
                            <span className="text-orange-400 font-mono">34 / 50</span>
                        </div>
                        <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 w-[68%] shadow-[0_0_10px_orange]" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Reward: <span className="text-cyan-400">Neon Blade Badge</span> + 1000 XP</p>
                </div>
            </Card>
        </div>
    </div>
);
