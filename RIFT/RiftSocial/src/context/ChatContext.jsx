import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWebSocket } from './WebSocketContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
    const { subscribe, send } = useWebSocket();
    const [conversations, setConversations] = useState({});
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [unreadCounts, setUnreadCounts] = useState({});

    const [partyMessages, setPartyMessages] = useState([]);

    useEffect(() => {
        const handleMessage = (message) => {
            setConversations(prev => {
                const convId = message.channelId || (message.senderId === 'me' ? message.recipientId : message.senderId);
                const existing = prev[convId] || [];

                // Check for duplicates
                if (existing.some(m => m.id === message.id)) return prev;

                return {
                    ...prev,
                    [convId]: [...existing, message]
                };
            });

            if (message.senderId !== 'me' && message.senderId !== activeConversationId) {
                setUnreadCounts(prev => ({
                    ...prev,
                    [message.senderId]: (prev[message.senderId] || 0) + 1
                }));
            }
        };

        const handleMessageSent = (message) => {
            setConversations(prev => {
                const convId = message.recipientId;
                const existing = prev[convId] || [];
                return {
                    ...prev,
                    [convId]: existing.map(m =>
                        (m.tempId && m.tempId === message.tempId) ? { ...message, senderId: 'me' } : m
                    )
                };
            });
        };

        const handlePartyMessage = (message) => {
            setPartyMessages(prev => {
                if (prev.some(m => m.id === message.id)) return prev;
                return [...prev, message];
            });
        };

        const unsubChat = subscribe('chat_message', handleMessage);
        const unsubSent = subscribe('message_sent', handleMessageSent);
        const unsubParty = subscribe('party_chat', handlePartyMessage);

        return () => {
            unsubChat();
            unsubSent();
            unsubParty();
        };
    }, [subscribe, activeConversationId]);

    const sendMessage = (recipientId, content) => {
        const tempId = Date.now();
        const message = {
            recipientId,
            content,
            timestamp: new Date().toISOString(),
            tempId // Pass tempId to server to echo back
        };
        send('chat_message', message);

        // Optimistic update
        const convId = recipientId;
        setConversations(prev => ({
            ...prev,
            [convId]: [...(prev[convId] || []), { ...message, senderId: 'me', id: tempId }]
        }));
    };

    const sendPartyMessage = (content) => {
        const tempId = Date.now();
        send('party_chat', { content, tempId });
    };

    const openConversation = (id) => {
        setActiveConversationId(id);
        setUnreadCounts(prev => ({ ...prev, [id]: 0 }));
    };

    const closeConversation = () => {
        setActiveConversationId(null);
    };

    return (
        <ChatContext.Provider value={{
            conversations,
            activeConversationId,
            unreadCounts,
            partyMessages,
            sendMessage,
            sendPartyMessage,
            openConversation,
            closeConversation
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};
