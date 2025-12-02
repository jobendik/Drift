import React, { useEffect, useState } from 'react';
import { SectionHeader } from '../components/ui/SectionHeader';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const LeaderboardView = () => {
    const { token } = useAuth();
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const data = await api.getLeaderboard(token);
                setLeaderboard(data);
            } catch (error) {
                console.error('Failed to fetch leaderboard:', error);
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchLeaderboard();
        }
    }, [token]);

    if (loading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Loading leaderboard...</div>;
    }

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
            <SectionHeader title="Leaderboards" subtitle="Compete for global dominance" />
            <div className="bg-[#0A0A0A] border border-slate-800 rounded-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-black/80 border-b border-slate-800 text-slate-500 text-xs uppercase tracking-widest font-mono">
                            <th className="p-4">Rank</th>
                            <th className="p-4">Player</th>
                            <th className="p-4">Level</th>
                            <th className="p-4 text-right">XP</th>
                            <th className="p-4 text-right">Wins</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {leaderboard.map((player) => (
                            <tr key={player.rank} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4 font-bold">{player.rank <= 3 ? <span className="text-xl">{['🥇', '🥈', '🥉'][player.rank - 1]}</span> : <span className="text-slate-600">#{player.rank}</span>}</td>
                                <td className="p-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden">
                                            {/* <img src={player.avatar} alt={player.username} className="w-full h-full object-cover" /> */}
                                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">{player.username[0]}</div>
                                        </div>
                                        <span className="text-slate-200 font-bold group-hover:text-cyan-400 transition-colors">{player.username}</span>
                                        <span className="text-slate-600 text-xs">#{player.tag}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-slate-400 font-mono text-sm">Lvl {player.level}</td>
                                <td className="p-4 text-right text-cyan-400 font-mono">{player.xp.toLocaleString()}</td>
                                <td className="p-4 text-right text-purple-400 font-bold">{player.wins}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
