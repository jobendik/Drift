import React, { useEffect, useState } from 'react';
import { useMatchmaking } from '../../context/MatchmakingContext';
import { GlitchText } from '../ui/GlitchText';

export const MatchFoundModal = () => {
    const { matchFound, acceptMatch, declineMatch } = useMatchmaking();
    const [timeLeft, setTimeLeft] = useState(10);

    useEffect(() => {
        if (matchFound) {
            setTimeLeft(10);
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        declineMatch();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [matchFound, declineMatch]);

    if (!matchFound) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0A0A0A] border-2 border-cyan-500 p-8 max-w-md w-full text-center relative overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.3)]">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse" />

                <GlitchText text="MATCH FOUND" className="text-3xl text-white mb-2 block" />
                <div className="text-cyan-400 font-mono text-sm mb-8 tracking-widest uppercase">{matchFound.mode} • {matchFound.map}</div>

                <div className="flex justify-center gap-4 mb-8">
                    <div className="text-6xl font-black text-white font-mono">{timeLeft}</div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={acceptMatch}
                        className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 uppercase tracking-widest clip-path-polygon transition-all hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                    >
                        Accept
                    </button>
                    <button
                        onClick={declineMatch}
                        className="flex-1 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 font-bold py-4 uppercase tracking-widest clip-path-polygon transition-all"
                    >
                        Decline
                    </button>
                </div>
            </div>
        </div>
    );
};
