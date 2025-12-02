const API_URL = '/api';

export const api = {
    register: async (email, username, password) => {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, username, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Registration failed');
        }

        return response.json();
    },

    login: async (email, password) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }

        return response.json();
    },

    getProfile: async (token) => {
        const response = await fetch(`${API_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch profile');
        }

        return response.json();
    },

    getFriends: async (token) => {
        const response = await fetch(`${API_URL}/social/friends`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch friends');
        }

        return response.json();
    },

    getFriendRequests: async (token) => {
        const response = await fetch(`${API_URL}/social/friend-requests`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch friend requests');
        }

        return response.json();
    },

    getParty: async (token) => {
        const response = await fetch(`${API_URL}/social/party`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch party');
        }

        return response.json();
    },

    getLeaderboard: async (token) => {
        const response = await fetch(`${API_URL}/social/leaderboard`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch leaderboard');
        }

        return response.json();
        return response.json();
    },

    getShopItems: async () => {
        const response = await fetch(`${API_URL}/shop/items`);
        if (!response.ok) throw new Error('Failed to fetch shop items');
        return response.json();
    },

    getInventory: async (token) => {
        const response = await fetch(`${API_URL}/shop/inventory`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch inventory');
        return response.json();
    },

    buyItem: async (token, itemId) => {
        const response = await fetch(`${API_URL}/shop/buy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ itemId })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Purchase failed');
        return data;
    },

    // --- Social Actions ---

    sendFriendRequest: async (token, username) => {
        const response = await fetch(`${API_URL}/social/friends/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username })
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to send request');
        }
        return response.json();
    },

    acceptFriendRequest: async (token, requestId) => {
        const response = await fetch(`${API_URL}/social/friends/accept`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ requestId })
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to accept request');
        }
        return response.json();
    },

    createParty: async (token) => {
        const response = await fetch(`${API_URL}/social/party/create`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to create party');
        return response.json();
    },

    inviteToParty: async (token, userId) => {
        const response = await fetch(`${API_URL}/social/party/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId })
        });
        if (!response.ok) throw new Error('Failed to invite');
        return response.json();
    },

    joinParty: async (token, partyId) => {
        const response = await fetch(`${API_URL}/social/party/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ partyId })
        });
        if (!response.ok) throw new Error('Failed to join party');
        return response.json();
    },

    leaveParty: async (token) => {
        const response = await fetch(`${API_URL}/social/party/leave`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to leave party');
        return response.json();
    },

    kickFromParty: async (token, userId) => {
        const response = await fetch(`${API_URL}/social/party/kick`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId })
        });
        if (!response.ok) throw new Error('Failed to kick player');
        return response.json();
    },

    toggleReady: async (token) => {
        const response = await fetch(`${API_URL}/social/party/ready`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to toggle ready');
        return response.json();
    }
};
