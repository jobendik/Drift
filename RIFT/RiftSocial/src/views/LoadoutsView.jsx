import React from 'react';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Card } from '../components/ui/Card';
import { LOADOUTS } from '../data/mockData';

export const LoadoutsView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <SectionHeader title="Loadouts" subtitle="Edit and select your competitive setups" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {LOADOUTS.map((loadout) => (
                <Card key={loadout.id} glow="cyan" className="flex flex-col justify-between">
                    <div>
                        <h3 className="text-white text-lg mb-1 font-bold">{loadout.name}</h3>
                        <p className="text-xs text-slate-500 mb-3 uppercase tracking-widest">{loadout.role}</p>
                        <div className="text-xs text-slate-300 space-y-2 mt-4">
                            <div className="flex justify-between border-b border-slate-800 pb-1">
                                <span className="text-slate-500">Primary</span> <span className="text-cyan-400">{loadout.primary}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 pb-1">
                                <span className="text-slate-500">Secondary</span> <span className="text-purple-400">{loadout.secondary}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 pb-1">
                                <span className="text-slate-500">Sidearm</span> <span>{loadout.sidearm}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 pb-1">
                                <span className="text-slate-500">Gadget</span> <span>{loadout.gadget}</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex gap-2">
                        <button className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold uppercase tracking-widest">Equip</button>
                        <button className="flex-1 py-2 bg-slate-900 border border-slate-700 text-slate-200 hover:border-cyan-400 text-xs uppercase tracking-widest">Edit</button>
                    </div>
                </Card>
            ))}
            <div className="border border-dashed border-slate-800 rounded-sm flex flex-col items-center justify-center p-8 text-slate-600 hover:text-slate-400 hover:border-slate-600 cursor-pointer transition-all">
                <div className="text-4xl mb-2">+</div>
                <div className="text-xs uppercase tracking-widest">New Loadout</div>
            </div>
        </div>
    </div>
);
