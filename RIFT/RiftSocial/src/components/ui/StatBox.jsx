import React from 'react';

export const StatBox = ({ label, value, icon: Icon, color = 'text-cyan-400' }) => (
    <div className="flex flex-col items-center justify-center p-4 bg-black/40 border border-slate-800/60 rounded-sm hover:bg-slate-900/60 transition-colors">
        <div className="flex items-center space-x-2 mb-1">
            {Icon && <Icon size={14} className="text-slate-500" />}
            <span className="text-xs text-slate-400 uppercase tracking-widest">{label}</span>
        </div>
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
);
