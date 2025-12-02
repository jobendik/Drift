import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Smile } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useSocial } from '../../context/SocialContext';

export const ChatWindow = () => {
    const { activeConversationId, conversations, partyMessages, sendMessage, sendPartyMessage, closeConversation } = useChat();
    const { friends } = useSocial();
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);

    const isPartyChat = activeConversationId === 'party';
    const activeFriend = !isPartyChat ? friends.find(f => f.id === activeConversationId) : null;

    const messages = isPartyChat ? partyMessages : (conversations[activeConversationId] || []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!activeConversationId || (!isPartyChat && !activeFriend)) return null;

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        if (isPartyChat) {
            sendPartyMessage(inputValue);
        } else {
            sendMessage(activeConversationId, inputValue);
        }
        setInputValue('');
    };

    return (
        <div className="fixed bottom-0 right-72 w-80 bg-[#0A0A0A] border border-slate-800 rounded-t-lg shadow-2xl z-50 flex flex-col h-96 animate-in slide-in-from-bottom-10 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/50 rounded-t-lg cursor-pointer hover:bg-slate-900 transition-colors">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isPartyChat ? 'bg-purple-500' : (activeFriend?.status === 'online' ? 'bg-green-500' : 'bg-slate-500')}`} />
                    <span className="font-bold text-sm text-white">{isPartyChat ? 'Party Chat' : activeFriend?.username}</span>
                </div>
                <button onClick={closeConversation} className="text-slate-500 hover:text-white">
                    <X size={16} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#050505]">
                {messages.length === 0 && (
                    <div className="text-center text-xs text-slate-600 mt-10">Start the conversation...</div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-2 rounded-lg text-sm ${msg.senderId === 'me'
                            ? 'bg-cyan-900/30 text-cyan-100 border border-cyan-800/50'
                            : 'bg-slate-800/50 text-slate-300 border border-slate-700/50'
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-900/30">
                <div className="relative">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Message..."
                        className="w-full bg-black border border-slate-700 rounded px-3 py-2 pr-10 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400">
                        <Send size={14} />
                    </button>
                </div>
            </form>
        </div>
    );
};
