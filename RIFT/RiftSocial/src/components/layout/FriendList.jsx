import React, { useState } from 'react';
import { useSocial } from '../../context/SocialContext';
import { useChat } from '../../context/ChatContext';
import { UserPlus, Check, X, MessageSquare, Plus, Users } from 'lucide-react';

export const FriendList = () => {
    const { friends, friendRequests, sendFriendRequest, acceptFriendRequest, inviteToParty, createParty, party } = useSocial();
    const { openConversation } = useChat();
    const [addUsername, setAddUsername] = useState('');
    const [showAddInput, setShowAddInput] = useState(false);

    const handleAddFriend = async (e) => {
        e.preventDefault();
        if (!addUsername.trim()) return;
        try {
            await sendFriendRequest(addUsername);
            setAddUsername('');
            setShowAddInput(false);
        } catch (err) {
            console.error(err);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'online': return 'bg-green-500';
            case 'in_game': return 'bg-purple-500';
            case 'away': return 'bg-yellow-500';
            default: return 'bg-slate-500';
        }
    };

    return (
        <div className="fixed right-0 top-16 bottom-0 w-64 bg-[#080808] border-l border-slate-800 hidden xl:flex flex-col z-30">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Social Uplink</h3>
                <div className="flex gap-2">
                    {!party && (
                        <button
                            onClick={createParty}
                            className="text-slate-400 hover:text-purple-400 transition-colors"
                            title="Create Party"
                        >
                            <Users size={16} />
                        </button>
                    )}
                    <button
                        onClick={() => setShowAddInput(!showAddInput)}
                        className="text-slate-400 hover:text-cyan-400 transition-colors"
                        title="Add Friend"
                    >
                        <UserPlus size={16} />
                    </button>
                </div>
            </div>

            {showAddInput && (
                <form onSubmit={handleAddFriend} className="p-2 bg-slate-900/50 border-b border-slate-800">
                    <input
                        type="text"
                        value={addUsername}
                        onChange={(e) => setAddUsername(e.target.value)}
                        placeholder="Enter username..."
                        className="w-full bg-black border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-cyan-500 outline-none"
                        autoFocus
                    />
                </form>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Friend Requests */}
                {friendRequests.incoming.length > 0 && (
                    <div>
                        <h4 className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                            Requests <span className="bg-cyan-500/20 px-1.5 rounded text-cyan-400">{friendRequests.incoming.length}</span>
                        </h4>
                        <div className="space-y-2">
                            {friendRequests.incoming.map(req => (
                                <div key={req.id} className="bg-slate-900/50 p-2 rounded border border-slate-800">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-xs">
                                            {req.avatar}
                                        </div>
                                        <span className="text-xs font-bold text-slate-300">{req.username}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => acceptFriendRequest(req.id)}
                                            className="flex-1 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400 py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1"
                                        >
                                            <Check size={12} /> Accept
                                        </button>
                                        <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1">
                                            <X size={12} /> Ignore
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <h4 className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-3">Online ({friends.filter(f => f.status !== 'offline').length})</h4>
                    <div className="space-y-3">
                        {friends.filter(f => f.status !== 'offline').map(friend => (
                            <div
                                key={friend.id}
                                className="flex items-center gap-3 group p-2 rounded hover:bg-white/5 transition-colors relative"
                            >
                                <div className="relative cursor-pointer" onClick={() => openConversation(friend.id)}>
                                    <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center overflow-hidden">
                                        {friend.avatar.startsWith('/') ? (
                                            <img src={friend.avatar} alt={friend.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-lg">{friend.avatar}</span>
                                        )}
                                    </div>
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#080808] ${getStatusColor(friend.status)}`} />
                                </div>
                                <div className="overflow-hidden flex-1 cursor-pointer" onClick={() => openConversation(friend.id)}>
                                    <div className="text-sm font-bold text-slate-300 truncate group-hover:text-white">{friend.username}</div>
                                    <div className="text-[10px] text-slate-500 truncate">
                                        {friend.status === 'in_game' ? <span className="text-purple-400">{friend.activity}</span> : friend.status}
                                    </div>
                                </div>

                                {/* Actions on Hover */}
                                <div className="absolute right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => inviteToParty(friend.id)}
                                        className="p-1.5 bg-slate-800 hover:bg-cyan-600 text-slate-400 hover:text-white rounded transition-colors"
                                        title="Invite to Party"
                                    >
                                        <Plus size={12} />
                                    </button>
                                    <button
                                        onClick={() => openConversation(friend.id)}
                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors"
                                        title="Message"
                                    >
                                        <MessageSquare size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h4 className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-3">Offline ({friends.filter(f => f.status === 'offline').length})</h4>
                    <div className="space-y-3">
                        {friends.filter(f => f.status === 'offline').map(friend => (
                            <div
                                key={friend.id}
                                className="flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity p-2 group relative"
                            >
                                <div className="relative cursor-pointer" onClick={() => openConversation(friend.id)}>
                                    <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center overflow-hidden">
                                        {friend.avatar.startsWith('/') ? (
                                            <img src={friend.avatar} alt={friend.username} className="w-full h-full object-cover grayscale" />
                                        ) : (
                                            <span className="text-xs">{friend.avatar}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="overflow-hidden flex-1 cursor-pointer" onClick={() => openConversation(friend.id)}>
                                    <div className="text-sm font-bold text-slate-400 truncate">{friend.username}</div>
                                    <div className="text-[10px] text-slate-600 truncate">{friend.lastSeen}</div>
                                </div>

                                {/* Actions on Hover (Offline) */}
                                <div className="absolute right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => inviteToParty(friend.id)}
                                        className="p-1.5 bg-slate-800 hover:bg-cyan-600 text-slate-400 hover:text-white rounded transition-colors"
                                        title="Invite to Party"
                                    >
                                        <Plus size={12} />
                                    </button>
                                    <button
                                        onClick={() => openConversation(friend.id)}
                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors"
                                        title="Message"
                                    >
                                        <MessageSquare size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
