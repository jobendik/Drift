import React, { useState } from 'react';
import { Play, Users, Clock, Trophy, Star, Lock } from 'lucide-react';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Card } from '../components/ui/Card';
import { GAME_MODES } from '../data/mockData';
import { useMatchmaking } from '../context/MatchmakingContext';

export const PlayView = () => {
    const [selectedCategory, setSelectedCategory] = useState('Arena');
    const { startQueue, cancelQueue, isQueued, queueTime } = useMatchmaking();

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <SectionHeader title="Deployment" subtitle="Select simulation parameters" />

                {isQueued && (
                    <div className="flex items-center gap-4 bg-cyan-900/20 border border-cyan-500/50 px-6 py-3 rounded animate-pulse">
                        <div className="text-cyan-400 font-mono font-bold">SEARCHING FOR MATCH...</div>
                        <div className="text-white font-mono text-xl">{formatTime(queueTime)}</div>
                        <button
                            onClick={cancelQueue}
                            className="ml-4 text-xs text-red-400 hover:text-red-300 uppercase font-bold tracking-wider"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {Object.keys(GAME_MODES).map(category => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        disabled={isQueued}
                        className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all ${selectedCategory === category
                            ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                            : 'bg-slate-900 text-slate-500 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed'
                            }`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Game Modes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {GAME_MODES[selectedCategory].map((mode) => {
                    const Icon = mode.icon;
                    return (
                        <Card
                            key={mode.id}
                            glow="cyan"
                            className={`group relative ${isQueued ? 'opacity-50 pointer-events-none' : ''}`}
                            onClick={() => startQueue(mode.id)}
                        >
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="text-cyan-400 fill-cyan-400/20" size={24} />
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-slate-900 rounded-lg group-hover:bg-cyan-900/20 transition-colors">
                                    <Icon size={24} className="text-slate-400 group-hover:text-cyan-400 transition-colors" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">{mode.name}</h3>
                                    <p className="text-sm text-slate-500 mb-3">{mode.description}</p>

                                    <div className="flex gap-3 text-xs font-mono text-slate-600">
                                        <span className="flex items-center gap-1"><Users size={12} /> 12/12</span>
                                        <span className="flex items-center gap-1"><Clock size={12} /> ~45s</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
