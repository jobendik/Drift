import React from 'react';

export const Card = ({ children, className = '', glow = 'purple', onClick }) => {
    const glowColors = {
        purple: 'hover:shadow-[0_0_25px_rgba(168,85,247,0.35)] hover:border-purple-500/60',
        cyan: 'hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] hover:border-cyan-400/60',
        orange: 'hover:shadow-[0_0_25px_rgba(249,115,22,0.35)] hover:border-orange-500/60',
        red: 'hover:shadow-[0_0_25px_rgba(239,68,68,0.35)] hover:border-red-500/60',
    };

    return (
        <div
            onClick={onClick}
            className={`bg-[#0A0A0A]/95 border border-slate-800 p-6 relative overflow-hidden transition-all duration-300 group rounded-sm ${glowColors[glow]} ${onClick ? 'cursor-pointer' : ''} ${className}`}
        >
            <div className="absolute top-0 right-0 w-8 h-8 bg-slate-900 rotate-45 transform translate-x-4 -translate-y-4 border-l border-b border-slate-800 group-hover:border-white/20 transition-colors" />
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.03),_transparent_60%)]" />
            <div className="relative z-10">{children}</div>
        </div>
    );
};
