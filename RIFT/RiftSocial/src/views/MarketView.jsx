import React from 'react';
import { Hexagon, Zap } from 'lucide-react';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Card } from '../components/ui/Card';
import { MARKET_ITEMS } from '../data/mockData';

export const MarketView = () => (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
        <SectionHeader title="Black Market" subtitle="Skins, effects and weapon mods" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {MARKET_ITEMS.map((item) => (
                <Card key={item.id} className="group cursor-pointer" glow={item.currency === 'plasma' ? 'purple' : 'cyan'}>
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 border border-slate-800 text-[10px] uppercase text-slate-400">{item.type}</div>
                    <div className={`h-40 flex items-center justify-center bg-gradient-to-b from-transparent to-slate-900/50 mb-4 ${item.image}`}>
                        <Hexagon size={64} className="drop-shadow-[0_0_15px_currentColor] animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-white font-bold uppercase tracking-wide group-hover:text-cyan-400 transition-colors">{item.name}</h3>
                        <div className="flex items-center justify-between">
                            <span className={`text-xs px-2 py-0.5 border ${item.rarity === 'Legendary' ? 'border-yellow-600 text-yellow-500' : item.rarity === 'Epic' ? 'border-purple-600 text-purple-500' : 'border-blue-600 text-blue-500'}`}>{item.rarity}</span>
                            <div className="flex items-center gap-1">
                                <span className={`font-mono font-bold ${item.currency === 'plasma' ? 'text-purple-400' : 'text-cyan-400'}`}>{item.price}</span>
                                {item.currency === 'plasma' ? <Zap size={14} className="text-purple-500" /> : <Hexagon size={14} className="text-cyan-500" />}
                            </div>
                        </div>
                    </div>
                    <button className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-white py-2 text-xs uppercase tracking-widest transition-colors border-t border-slate-700">Inspect</button>
                </Card>
            ))}
        </div>
    </div>
);
