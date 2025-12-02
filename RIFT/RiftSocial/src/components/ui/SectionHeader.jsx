import React from 'react';

export const SectionHeader = ({ title, subtitle }) => (
    <div className="mb-8 border-l-4 border-cyan-400 pl-4 py-1 bg-gradient-to-r from-cyan-900/20 to-transparent">
        <h2 className="text-3xl font-bold text-white uppercase tracking-widest">{title}</h2>
        {subtitle && <p className="text-slate-400 text-sm mt-1 font-mono">{subtitle}</p>}
    </div>
);
