
import { io } from 'socket.io-client';

const BASE_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';
const TOKEN_1 = 'mock-jwt-token-6'; // User 1
const TOKEN_2 = 'mock-jwt-token-7'; // User 2

async function verifyGameSync() {
    console.log('Verifying Game Sync...');

    // 1. Get Loadout (should include inventory now)
    console.log('Fetching loadout...');
    const response = await fetch(`${BASE_URL}/game/loadout`, {
        headers: {
            'Authorization': `Bearer ${TOKEN_1}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch loadout: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Loadout received:', JSON.stringify(data, null, 2));

    if (data.inventory && Array.isArray(data.inventory)) {
        console.log(`✅ Inventory synced! Found ${data.inventory.length} items.`);
    } else {
        console.error('❌ Inventory missing from loadout response!');
    }

    // 2. Verify Game Networking (Two Clients)
    console.log('\nVerifying Game Networking...');

    const client1 = io(SOCKET_URL, { auth: { token: TOKEN_1 } });
    const client2 = io(SOCKET_URL, { auth: { token: TOKEN_2 } });

    const matchId = 'test-match-1';

    await new Promise<void>((resolve) => {
        let connected = 0;
        const onConnect = () => {
            connected++;
            if (connected === 2) resolve();
        };
        client1.on('connect', onConnect);
        client2.on('connect', onConnect);
    });
    console.log('✅ Both clients connected');

    // Join match
    client1.emit('join_match', matchId);
    client2.emit('join_match', matchId);

    // Wait for join
    await new Promise(r => setTimeout(r, 500));

    // Test Player Update (Client 1 moves, Client 2 receives)
    const updateData = {
        matchId,
        position: { x: 10, y: 0, z: 10 },
        rotation: { x: 0, y: 1.5 },
        velocity: { x: 1, y: 0, z: 0 },
        isSprinting: true,
        isGrounded: true
    };

    const updatePromise = new Promise<void>((resolve, reject) => {
        client2.on('player_update', (data) => {
            if (data.userId === '6' && data.position.x === 10) {
                console.log('✅ Client 2 received player update from Client 1');
                resolve();
            }
        });
        setTimeout(() => reject(new Error('Timeout waiting for player update')), 2000);
    });

    client1.emit('player_update', updateData);

    try {
        await updatePromise;
    } catch (e) {
        console.error('❌ Player update failed:', e);
    }

    // Test Shooting (Client 2 shoots, Client 1 receives)
    const shootData = {
        matchId,
        origin: { x: 0, y: 1, z: 0 },
        direction: { x: 0, y: 0, z: 1 },
        weaponType: 'AK47'
    };

    const shootPromise = new Promise<void>((resolve, reject) => {
        client1.on('player_shoot', (data) => {
            if (data.userId === '7' && data.weaponType === 'AK47') {
                console.log('✅ Client 1 received shoot event from Client 2');
                resolve();
            }
        });
        setTimeout(() => reject(new Error('Timeout waiting for shoot event')), 2000);
    });

    client2.emit('player_shoot', shootData);

    try {
        await shootPromise;
    } catch (e) {
        console.error('❌ Shoot event failed:', e);
    }

    // Test Damage (Client 1 hits Client 2)
    const hitData = {
        matchId,
        targetId: '7', // Client 2
        damage: 25,
        hitLocation: { x: 10, y: 1, z: 10 }
    };

    const damagePromise = new Promise<void>((resolve, reject) => {
        client2.on('player_damaged', (data) => {
            if (data.targetId === '7' && data.attackerId === '6' && data.damage === 25) {
                console.log('✅ Client 2 received damage event from Client 1');
                resolve();
            }
        });
        setTimeout(() => reject(new Error('Timeout waiting for damage event')), 2000);
    });

    client1.emit('player_hit', hitData);

    try {
        await damagePromise;
    } catch (e) {
        console.error('❌ Damage event failed:', e);
    }

    client1.disconnect();
    client2.disconnect();
    console.log('Done.');
    process.exit(0);
}

verifyGameSync().catch(console.error);
