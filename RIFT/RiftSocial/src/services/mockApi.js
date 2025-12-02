import { CURRENT_USER, LEADERBOARD_DATA } from '../data/mockData';

// Simulate network delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApi = {
    login: async (email, password) => {
        await delay(800);
        if (email === 'demo@rift.com' && password === 'password') {
            return {
                token: 'mock-jwt-token-12345',
                user: CURRENT_USER
            };
        }
        throw new Error('Invalid credentials');
    },

    getProfile: async (token) => {
        await delay(500);
        if (token === 'mock-jwt-token-12345') {
            return CURRENT_USER;
        }
        throw new Error('Invalid token');
    },

    getFriends: async () => {
        await delay(400);
        return [
            { id: 2, username: 'NEON_REAPER', tag: '#4421', status: 'online', avatar: '💀' },
            { id: 3, username: 'VOID_STRIKER', tag: '#1192', status: 'in_game', activity: 'Ranked Arena', avatar: '⚔️' },
            { id: 4, username: 'PLASMA_HUNTER', tag: '#8832', status: 'offline', lastSeen: '2h ago', avatar: '🔫' },
            { id: 5, username: 'GHOST_PROTOCOL', tag: '#0001', status: 'online', avatar: '👻' },
        ];
    },

    getFriendRequests: async () => {
        await delay(300);
        return {
            incoming: [
                { id: 101, username: 'NOOB_SLAYER', tag: '#9999', avatar: '🤡' }
            ],
            outgoing: []
        };
    },

    getParty: async () => {
        await delay(200);
        return null; // Not in a party initially
    }
};
