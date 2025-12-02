import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWebSocket } from './WebSocketContext';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const SocialContext = createContext(null);

export const SocialProvider = ({ children }) => {
    const { subscribe } = useWebSocket();
    const { isAuthenticated, token } = useAuth();
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState({ incoming: [], outgoing: [] });
    const [party, setParty] = useState(null);

    // Initial fetch
    useEffect(() => {
        if (!isAuthenticated || !token) return;

        const fetchSocialData = async () => {
            try {
                const [friendsList, requests, currentParty] = await Promise.all([
                    api.getFriends(token),
                    api.getFriendRequests(token),
                    api.getParty(token)
                ]);
                setFriends(friendsList);
                setFriendRequests(requests);
                setParty(currentParty);
            } catch (error) {
                console.error('Failed to fetch social data', error);
            }
        };

        fetchSocialData();
    }, [isAuthenticated, token]);

    // Real-time updates
    useEffect(() => {
        const unsubPresence = subscribe('presence_update', ({ userId, status }) => {
            setFriends(prev => prev.map(f =>
                f.id === userId ? { ...f, status } : f
            ));
        });

        const unsubFriendReq = subscribe('friend_request', (request) => {
            setFriendRequests(prev => ({
                ...prev,
                incoming: [...prev.incoming, request]
            }));
        });

        const unsubPartyUpdate = subscribe('party_update', (updatedParty) => {
            setParty(updatedParty);
        });

        const unsubPartyInvite = subscribe('party_invite', ({ partyId, senderName }) => {
            // Simple confirm for now. In real app, use a Toast or Notification system.
            if (window.confirm(`${senderName} invited you to a party! Join?`)) {
                joinParty(partyId);
            }
        });

        const unsubPartyKicked = subscribe('party_kicked', ({ message }) => {
            alert(message);
            setParty(null);
        });

        return () => {
            unsubPresence();
            unsubFriendReq();
            unsubPartyUpdate();
            unsubPartyInvite();
            unsubPartyKicked();
        };
    }, [subscribe]);

    const sendFriendRequest = async (username) => {
        try {
            await api.sendFriendRequest(token, username);
        } catch (error) {
            console.error('Send request failed:', error);
        }
    };

    const acceptFriendRequest = async (requestId) => {
        try {
            await api.acceptFriendRequest(token, requestId);
            const [friendsList, requests] = await Promise.all([
                api.getFriends(token),
                api.getFriendRequests(token)
            ]);
            setFriends(friendsList);
            setFriendRequests(requests);
        } catch (error) {
            console.error('Accept request failed:', error);
        }
    };

    const createParty = async () => {
        try {
            const newParty = await api.createParty(token);
            setParty(newParty);
        } catch (error) {
            console.error('Create party failed:', error);
        }
    };

    const inviteToParty = async (userId) => {
        console.log('inviteToParty called for:', userId);
        try {
            if (!party) {
                console.log('No party exists, creating one...');
                const newParty = await api.createParty(token);
                console.log('Party created:', newParty);
                setParty(newParty);
            }
            console.log('Sending invite to:', userId);
            await api.inviteToParty(token, userId);
            console.log('Invite sent successfully');
        } catch (error) {
            console.error('Invite failed:', error);
        }
    };

    const joinParty = async (partyId) => {
        try {
            const joinedParty = await api.joinParty(token, partyId);
            setParty(joinedParty);
        } catch (error) {
            console.error('Join party failed:', error);
        }
    };

    const leaveParty = async () => {
        try {
            await api.leaveParty(token);
            setParty(null);
        } catch (error) {
            console.error('Leave party failed:', error);
        }
    };

    const kickFromParty = async (userId) => {
        try {
            await api.kickFromParty(token, userId);
            // No need to fetch party here, socket update will handle it
        } catch (error) {
            console.error('Kick failed:', error);
        }
    };

    const toggleReady = async () => {
        try {
            await api.toggleReady(token);
        } catch (error) {
            console.error('Toggle ready failed:', error);
        }
    };

    return (
        <SocialContext.Provider value={{
            friends,
            friendRequests,
            party,
            sendFriendRequest,
            acceptFriendRequest,
            createParty,
            inviteToParty,
            joinParty,
            leaveParty,
            kickFromParty,
            toggleReady
        }}>
            {children}
        </SocialContext.Provider>
    );
};

export const useSocial = () => {
    const context = useContext(SocialContext);
    if (!context) {
        throw new Error('useSocial must be used within a SocialProvider');
    }
    return context;
};
