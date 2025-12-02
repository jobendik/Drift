import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3000';

const createClient = (token: string) => {
    return new Promise<any>((resolve, reject) => {
        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket']
        });

        socket.on('connect', () => {
            console.log(`Client ${token} connected`);
            resolve(socket);
        });

        socket.on('connect_error', (err: any) => {
            reject(err);
        });
    });
};

async function verifyMatchmaking() {
    console.log('Starting Matchmaking Verification...');

    try {
        // Connect two players
        const client1 = await createClient('mock-jwt-token-1'); // NEON_REAPER
        const client2 = await createClient('mock-jwt-token-2'); // VOID_STRIKER

        // Setup listeners for match_found
        const matchPromise1 = new Promise<any>(resolve => {
            client1.on('match_found', (data: any) => {
                console.log('Client 1 found match:', data);
                resolve(data);
            });
        });

        const matchPromise2 = new Promise<any>(resolve => {
            client2.on('match_found', (data: any) => {
                console.log('Client 2 found match:', data);
                resolve(data);
            });
        });

        // Start Queue
        console.log('Client 1 joining queue...');
        client1.emit('start_queue', { modeId: 'deathmatch' });

        console.log('Client 2 joining queue...');
        client2.emit('start_queue', { modeId: 'deathmatch' });

        // Wait for match
        await Promise.all([matchPromise1, matchPromise2]);

        console.log('✅ Matchmaking verified! Both players received match_found event.');

        client1.disconnect();
        client2.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('Matchmaking verification failed:', error);
        process.exit(1);
    }
}

verifyMatchmaking();
