"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = require("socket.io-client");
const SOCKET_URL = 'http://localhost:3000';
const MATCH_ID = 'test-match-kill';
// Mock clients
const client1 = (0, socket_io_client_1.io)(SOCKET_URL, {
    auth: { token: 'mock-jwt-token-1' },
    transports: ['websocket']
});
const client2 = (0, socket_io_client_1.io)(SOCKET_URL, {
    auth: { token: 'mock-jwt-token-2' },
    transports: ['websocket']
});
let client1Id = 1;
let client2Id = 2;
async function runTest() {
    console.log('Starting Kill Confirmation Verification...');
    // 1. Connect clients
    console.log('Connecting clients...');
    await new Promise((resolve, reject) => {
        let connected = 0;
        const onConnect = () => {
            connected++;
            console.log(`Client ${connected} connected.`);
            if (connected === 2)
                resolve();
        };
        client1.on('connect', onConnect);
        client2.on('connect', onConnect);
        client1.on('connect_error', (err) => console.error('Client 1 Error:', err.message));
        client2.on('connect_error', (err) => console.error('Client 2 Error:', err.message));
        // Timeout
        setTimeout(() => {
            if (connected < 2) {
                console.error('Timeout waiting for clients to connect.');
                process.exit(1);
            }
        }, 5000);
    });
    console.log('Clients connected.');
    console.log('Clients connected.');
    // client1Id and client2Id are already set to 1 and 2
    // 2. Join Match
    console.log('Joining match...');
    client1.emit('join_match', MATCH_ID);
    client2.emit('join_match', MATCH_ID);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('Clients joined match.');
    // 3. Simulate Kill
    // Client 2 dies, killed by Client 1
    console.log('Simulating Client 2 death (killed by Client 1)...');
    // Listen for player_killed on Client 1
    const killPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            console.error('Timeout waiting for kill confirmation.');
            reject(new Error('Timeout'));
        }, 5000);
        client1.on('player_killed', (data) => {
            console.log('Client 1 received player_killed:', data);
            if (data.attackerId === client1Id && data.victimId === client2Id) {
                console.log('Verified: Kill confirmed correctly.');
                clearTimeout(timeout);
                resolve();
            }
        });
    });
    // Client 2 sends player_died
    client2.emit('player_died', {
        matchId: MATCH_ID,
        attackerId: client1Id, // Client 1 is the attacker
        weaponType: 'rifle'
    });
    try {
        await killPromise;
        console.log('Kill Confirmation Verification Complete!');
    }
    catch (e) {
        console.error('Verification Failed:', e);
    }
    client1.close();
    client2.close();
}
runTest();
//# sourceMappingURL=verify-kill-confirmation.js.map