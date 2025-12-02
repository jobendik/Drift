import React from 'react';
import { Crown, UserPlus, X, Shield, LogOut, Ban, MessageCircle } from 'lucide-react';
import { useSocial } from '../../context/SocialContext';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

export const PartyPanel = () => {
    const { party, leaveParty, kickFromParty, toggleReady } = useSocial();
    const { openConversation } = useChat();
    const { user } = useAuth();

    if (!party) return null;

    const isLeader = party.leaderId === user?.id;

    return (
        <div className="fixed bottom-4 right-4 xl:right-72 w-80 bg-[#0A0A0A] border border-slate-800 rounded-lg shadow-2xl z-40 animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 rounded-t-lg">
                <div className="flex items-center gap-2">
                    <Shield size={16} className="text-purple-500" />
                    <span className="font-bold text-sm text-white uppercase tracking-wider">Fireteam ({party.members.length}/4)</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => openConversation('party')}
                        className="text-slate-500 hover:text-white transition-colors"
                        title="Party Chat"
                    >
                        <MessageCircle size={16} />
                    </button>
                    <button
                        onClick={leaveParty}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                        title="Leave Party"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>

            <div className="p-2 space-y-1">
                {party.members.map((member) => (
                    <div key={member.userId} className="flex items-center justify-between p-2 hover:bg-white/5 rounded group">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center text-sm overflow-hidden">
                                    {(member.avatar && member.avatar.startsWith('/')) ? (
                                        <img src={member.avatar} alt={member.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{member.avatar || member.username[0]}</span>
                                    )}
                                </div>
                                {member.isLeader && (
                                    <div className="absolute -top-1 -left-1 text-yellow-500 bg-black rounded-full p-0.5">
                                        <Crown size={10} fill="currentColor" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-200">{member.username}</div>
                                <div className="text-[10px] text-slate-500 uppercase">{member.isReady ? 'Ready' : 'Not Ready'}</div>
                            </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            {isLeader && member.userId !== user.id && (
                                <button
                                    onClick={() => kickFromParty(member.userId)}
                                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                    title="Kick Player"
                                >
                                    <Ban size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {party.members.length < 4 && (
                    <button className="w-full py-2 border border-dashed border-slate-700 text-slate-500 hover:text-white hover:border-slate-500 rounded flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all mt-2">
                        <UserPlus size={14} /> Invite Agent
                    </button>
                )}
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-900/30 rounded-b-lg">
                <button
                    onClick={toggleReady}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-widest clip-path-polygon transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                >
                    Ready Up
                </button>
            </div>
        </div>
    );
};
