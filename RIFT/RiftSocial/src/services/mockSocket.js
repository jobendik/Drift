// Simple event emitter for mock WebSocket
class MockSocket {
    constructor() {
        this.listeners = {};
        this.connected = false;
    }

    connect() {
        return new Promise((resolve) => {
            setTimeout(() => {
                this.connected = true;
                this.emit('connect');
                resolve();

                // Simulate random events
                this.startSimulation();
            }, 500);
        });
    }

    disconnect() {
        this.connected = false;
        this.emit('disconnect');
        this.stopSimulation();
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    send(event, data) {
        console.log(`[WebSocket] Sending: ${event}`, data);
        // Simulate server response for specific events
        if (event === 'chat_message') {
            setTimeout(() => {
                this.emit('chat_message', {
                    ...data,
                    id: Date.now(),
                    timestamp: new Date().toISOString()
                });
            }, 100);
        }
    }

    // Simulation logic
    startSimulation() {
        this.intervals = [];

        // Random presence updates
        this.intervals.push(setInterval(() => {
            const statuses = ['online', 'offline', 'in_game', 'away'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            const friendId = Math.floor(Math.random() * 4) + 2; // IDs 2-5

            this.emit('presence_update', {
                userId: friendId,
                status: randomStatus
            });
        }, 10000));

        // Random chat messages
        this.intervals.push(setInterval(() => {
            const messages = [
                "Anyone up for ranked?",
                "Did you see the new skin?",
                "gg last game",
                "invite pls",
                "brb 5 mins"
            ];
            const randomMsg = messages[Math.floor(Math.random() * messages.length)];
            const friendId = Math.floor(Math.random() * 4) + 2;

            this.emit('chat_message', {
                id: Date.now(),
                senderId: friendId,
                content: randomMsg,
                timestamp: new Date().toISOString(),
                channelId: 'global' // simplified
            });
        }, 15000));
    }

    stopSimulation() {
        if (this.intervals && Array.isArray(this.intervals)) {
            this.intervals.forEach(clearInterval);
        }
    }
}

export const mockSocket = new MockSocket();
