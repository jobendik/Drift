import React from 'react';
import { Crosshair, Trophy, TrendingUp } from 'lucide-react';
import { SectionHeader } from '../components/ui/SectionHeader';
import { StatBox } from '../components/ui/StatBox';
import { MATCH_HISTORY } from '../data/mockData';

export const ProfileView = ({ currentUser }) => (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
        <div className="relative mb-8">
            <div className="h-48 w-full bg-gradient-to-r from-purple-900/40 to-cyan-900/40 border-y border-slate-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:40px_40px]" />
            </div>
            <div className="max-w-6xl mx-auto px-6 relative -mt-16 flex flex-col md:flex-row items-end md:items-center gap-6">
                <div className="relative">
                    <div className="w-32 h-32 bg-black border-2 border-cyan-400 p-1 shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                        <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full bg-slate-800 rounded-full" />
                    </div>
                    <div className="absolute -bottom-3 -right-3 bg-black border border-purple-500 text-purple-400 text-xs px-2 py-1 font-bold">LVL {currentUser.level}</div>
                </div>
                <div className="flex-1 pb-4">
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-4xl text-white font-bold tracking-tight">{currentUser.username}</h1>
                        <span className="text-slate-500 text-xl font-mono">{currentUser.tag}</span>
                    </div>
                    <p className="text-cyan-400 text-sm uppercase tracking-widest mb-4">Rank: {currentUser.rank}</p>
                    <div className="w-full max-w-md h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-600 to-cyan-500" style={{ width: `${(currentUser.xp / currentUser.xpToNext) * 100}%` }} />
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex justify-between max-w-md">
                        <span>XP: {currentUser.xp} / {currentUser.xpToNext}</span>
                        <span>Next: Level {currentUser.level + 1}</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatBox label="K/D Ratio" value={currentUser.stats.kdr} icon={Crosshair} color="text-red-400" />
            <StatBox label="Win Rate" value={currentUser.stats.winRate} icon={Trophy} color="text-yellow-400" />
            <StatBox label="Accuracy" value={`${currentUser.stats.accuracy}%`} icon={Crosshair} />
            <StatBox label="Slide Kills" value={currentUser.stats.slideKills} icon={TrendingUp} color="text-orange-400" />
        </div>

        <SectionHeader title="Match History" />
        <div className="space-y-2">
            {MATCH_HISTORY.map((match, idx) => (
                <div key={idx} className="flex flex-col md:flex-row items-center justify-between bg-[#0A0A0A] border-l-4 border-slate-800 p-4 hover:bg-white/5 transition-colors relative">
                    <div className={`w-1 h-full absolute left-0 top-0 ${match.result === 'WIN' ? 'bg-cyan-500' : 'bg-red-500'}`} />
                    <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className={`text-sm font-bold px-3 py-1 uppercase tracking-wider ${match.result === 'WIN' ? 'text-cyan-400 bg-cyan-900/20' : 'text-red-400 bg-red-900/20'}`}>
                            {match.result}
                        </div>
                        <div>
                            <div className="text-white font-bold">{match.map}</div>
                            <div className="text-xs text-slate-500 uppercase">{match.mode}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-8 mt-4 md:mt-0 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-center">
                            <div className="text-xs text-slate-500 uppercase">K / D</div>
                            <div className="text-slate-200 font-mono">{match.k} / {match.d}</div>
                        </div>
                        <div className="text-slate-600 text-xs font-mono">{match.ago}</div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);
