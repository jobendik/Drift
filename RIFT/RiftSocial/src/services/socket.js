import { io } from 'socket.io-client';

const SOCKET_URL = '/';

class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = {};
    }

    connect(token) {
        if (this.socket) return;

        this.socket = io(SOCKET_URL, {
            auth: { token }
        });

        this.socket.on('connect', () => {
            console.log('Connected to WebSocket server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
        });

        // Forward events to registered listeners
        this.socket.onAny((event, ...args) => {
            if (this.listeners[event]) {
                this.listeners[event].forEach(callback => callback(...args));
            }
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);

        // Also register with actual socket if connected
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);

        if (this.socket) {
            this.socket.off(event, callback);
        }
    }

    send(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        } else {
            console.warn('WebSocket not connected');
        }
    }
}

export const socketService = new SocketService();
