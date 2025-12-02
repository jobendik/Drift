import React from 'react';
import { Gamepad2, Monitor, Volume2, Mic } from 'lucide-react';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Card } from '../components/ui/Card';

export const SettingsView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <SectionHeader title="Settings" subtitle="Tweak your social and lobby experience" />

        <Card glow="cyan">
            <h3 className="text-white text-lg mb-4 flex items-center gap-2"><Gamepad2 size={18} className="text-cyan-400" /> Matchmaking</h3>
            <div className="space-y-4 text-sm text-slate-300">
                <label className="flex items-center justify-between p-2 hover:bg-slate-800/50 rounded cursor-pointer">
                    <span>Enable Crossplay</span>
                    <input type="checkbox" defaultChecked className="accent-cyan-500 h-4 w-4" />
                </label>
                <label className="flex items-center justify-between p-2 hover:bg-slate-800/50 rounded cursor-pointer">
                    <span>Prioritize Low Ping</span>
                    <input type="checkbox" defaultChecked className="accent-cyan-500 h-4 w-4" />
                </label>
                <label className="flex items-center justify-between p-2 hover:bg-slate-800/50 rounded cursor-pointer">
                    <span>Strict Skill Matching</span>
                    <input type="checkbox" className="accent-cyan-500 h-4 w-4" />
                </label>
            </div>
        </Card>

        <Card glow="purple">
            <h3 className="text-white text-lg mb-4 flex items-center gap-2"><Monitor size={18} className="text-purple-400" /> Graphics & UI</h3>
            <div className="space-y-4 text-sm text-slate-300">
                <label className="flex items-center justify-between p-2 hover:bg-slate-800/50 rounded cursor-pointer">
                    <span>Reduce Motion Blur</span>
                    <input type="checkbox" className="accent-purple-500 h-4 w-4" />
                </label>
                <label className="flex items-center justify-between p-2 hover:bg-slate-800/50 rounded cursor-pointer">
                    <span>Show FPS Counter</span>
                    <input type="checkbox" defaultChecked className="accent-purple-500 h-4 w-4" />
                </label>
                <div className="p-2">
                    <span className="block mb-2">Colorblind Mode</span>
                    <select className="w-full bg-slate-900 border border-slate-700 text-white p-2 text-xs rounded">
                        <option>Off</option>
                        <option>Protanopia</option>
                        <option>Deuteranopia</option>
                        <option>Tritanopia</option>
                    </select>
                </div>
            </div>
        </Card>

        <Card glow="orange">
            <h3 className="text-white text-lg mb-4 flex items-center gap-2"><Volume2 size={18} className="text-orange-400" /> Audio</h3>
            <div className="space-y-6 text-sm text-slate-300 p-2">
                <div>
                    <div className="flex justify-between mb-1">
                        <span>Master Volume</span>
                        <span className="text-orange-400">80%</span>
                    </div>
                    <input type="range" className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                </div>
                <div>
                    <div className="flex justify-between mb-1">
                        <span>Music Volume</span>
                        <span className="text-orange-400">40%</span>
                    </div>
                    <input type="range" className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                </div>
                <label className="flex items-center justify-between cursor-pointer">
                    <span className="flex items-center gap-2"><Mic size={14} /> Voice Chat Enabled</span>
                    <input type="checkbox" defaultChecked className="accent-orange-500 h-4 w-4" />
                </label>
            </div>
        </Card>
    </div>
);
