import React, { useState } from 'react';
import { Skull, Target } from 'lucide-react';
import { SectionHeader } from '../components/ui/SectionHeader';
import { WEAPONS_DATA, BESTIARY_DATA } from '../data/mockData';

export const WikiView = () => {
    const [activeTab, setActiveTab] = useState('weapons');

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
            <SectionHeader title="Wiki & Database" subtitle="Master the meta" />

            <div className="flex space-x-4 mb-6 border-b border-slate-800 pb-2">
                <button
                    onClick={() => setActiveTab('weapons')}
                    className={`pb-2 px-2 text-sm uppercase tracking-wider font-bold transition-all ${activeTab === 'weapons' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Weapons
                </button>
                <button
                    onClick={() => setActiveTab('bestiary')}
                    className={`pb-2 px-2 text-sm uppercase tracking-wider font-bold transition-all ${activeTab === 'bestiary' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Bestiary (Enemies)
                </button>
            </div>

            {activeTab === 'weapons' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <div className="space-y-4">
                            {WEAPONS_DATA.map((weapon) => (
                                <div key={weapon.name} className="bg-slate-900/50 p-4 border border-slate-800 flex flex-col gap-3 hover:border-cyan-500/50 transition-colors cursor-pointer group">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-cyan-400 font-bold group-hover:text-cyan-300">{weapon.name}</h4>
                                            <span className="text-xs text-slate-500 uppercase">{weapon.type}</span>
                                        </div>
                                        <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300 border border-slate-700">{weapon.range} range</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <div className="text-slate-500 mb-1">DAMAGE</div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400" style={{ width: `${(weapon.damage / 200) * 100}%` }} />
                                                </div>
                                                <span className="text-cyan-400 font-mono">{weapon.damage}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-slate-500 mb-1">FIRE RATE</div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-cyan-400 to-purple-500" style={{ width: `${(weapon.rpm / 1500) * 100}%` }} />
                                                </div>
                                                <span className="text-purple-400 font-mono">{weapon.rpm}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'bestiary' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {BESTIARY_DATA.map((enemy, idx) => (
                        <div key={idx} className="relative bg-black border border-slate-800 p-6 overflow-hidden group hover:border-white/30 transition-colors">
                            <div
                                className="absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20"
                                style={{ backgroundColor: enemy.color }}
                            />
                            <div className="relative z-10 flex flex-col h-full items-center text-center">
                                {/* 3D Model Placeholder Representation */}
                                <div className="w-full h-40 mb-4 border border-white/10 bg-slate-900/50 flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-20 pointer-events-none">
                                        {[...Array(36)].map((_, i) => <div key={i} className="border border-white/5" />)}
                                    </div>
                                    <div style={{ color: enemy.color }} className="animate-pulse">
                                        {enemy.isBoss ? <Skull size={64} /> : <Target size={48} />}
                                    </div>
                                    {enemy.isBoss && <div className="absolute top-2 right-2 text-[10px] bg-red-500 text-white px-2 py-0.5 font-bold tracking-widest">BOSS</div>}
                                </div>

                                <h3 className="text-xl font-bold tracking-widest" style={{ color: enemy.color, textShadow: `0 0 15px ${enemy.color}40` }}>{enemy.name}</h3>
                                <p className="text-xs text-slate-400 mt-1 mb-4 uppercase tracking-widest">{enemy.desc}</p>

                                <div className="w-full mt-auto">
                                    <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                                        <span>Threat Level</span>
                                        <span style={{ color: enemy.color }}>{'|'.repeat(enemy.danger)}</span>
                                    </div>
                                    <div className="h-1 w-full bg-slate-900">
                                        <div className="h-full transition-all duration-1000" style={{ width: `${(enemy.danger / 10) * 100}%`, backgroundColor: enemy.color }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
