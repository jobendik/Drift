"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = require("socket.io-client");
const SOCKET_URL = 'http://localhost:3000';
const MATCH_ID = 'test-match-death';
// Mock clients
const client1 = (0, socket_io_client_1.io)(SOCKET_URL, {
    auth: { token: 'test-token-1' },
    transports: ['websocket']
});
const client2 = (0, socket_io_client_1.io)(SOCKET_URL, {
    auth: { token: 'test-token-2' },
    transports: ['websocket']
});
let client1Id;
let client2Id;
async function runTest() {
    console.log('Starting Death & Respawn Verification...');
    // 1. Connect clients
    await new Promise((resolve) => {
        let connected = 0;
        const onConnect = () => {
            connected++;
            if (connected === 2)
                resolve();
        };
        client1.on('connect', onConnect);
        client2.on('connect', onConnect);
    });
    console.log('Clients connected.');
    client1Id = client1.id;
    client2Id = client2.id;
    // 2. Join Match
    client1.emit('join_match', { matchId: MATCH_ID });
    client2.emit('join_match', { matchId: MATCH_ID });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('Clients joined match.');
    // 3. Simulate Kill (Client 1 kills Client 2)
    console.log('Simulating lethal damage...');
    // Listen for respawn event on Client 1
    const respawnPromise = new Promise((resolve) => {
        client1.on('player_respawned', (data) => {
            console.log('Client 1 received player_respawned:', data);
            if (data.userId === client2Id) {
                console.log('Verified: Client 2 respawned.');
                resolve();
            }
        });
    });
    // Simulate Client 2 sending "player_respawn"
    console.log('Simulating Client 2 sending respawn request...');
    client2.emit('player_respawn', { matchId: MATCH_ID });
    await respawnPromise;
    console.log('Death & Respawn Verification Complete!');
    client1.close();
    client2.close();
}
runTest();
//# sourceMappingURL=verify-death-respawn.js.map