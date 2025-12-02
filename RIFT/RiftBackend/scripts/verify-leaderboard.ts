import 'dotenv/config';

async function verifyLeaderboard() {
    const API_URL = 'http://localhost:3000/api';
    const EMAIL = 'demo@rift.com';
    const PASSWORD = 'password';

    console.log('🔍 Starting Leaderboard Verification...');

    // 1. Login
    console.log('\n1. Logging in...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });

    if (!loginRes.ok) {
        throw new Error(`Login failed: ${loginRes.status}`);
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ Login successful');

    // 2. Fetch Leaderboard
    console.log('\n2. Fetching Leaderboard...');
    const lbRes = await fetch(`${API_URL}/social/leaderboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!lbRes.ok) {
        throw new Error(`Leaderboard fetch failed: ${lbRes.status}`);
    }

    const leaderboard = await lbRes.json();
    console.log(`✅ Leaderboard fetched. Count: ${leaderboard.length}`);

    // 3. Verify Data Structure and Sorting
    if (leaderboard.length > 0) {
        const topPlayer = leaderboard[0];
        console.log('Top Player:', topPlayer);

        if (topPlayer.rank !== 1) console.error('❌ Top player rank is not 1');
        if (!topPlayer.username) console.error('❌ Top player missing username');
        if (typeof topPlayer.xp !== 'number') console.error('❌ Top player missing XP');

        // Check sorting
        let sorted = true;
        for (let i = 0; i < leaderboard.length - 1; i++) {
            if (leaderboard[i].xp < leaderboard[i + 1].xp) {
                sorted = false;
                console.error(`❌ Not sorted correctly at rank ${i + 1}: ${leaderboard[i].xp} < ${leaderboard[i + 1].xp}`);
                break;
            }
        }

        if (sorted) console.log('✅ Leaderboard is sorted by XP descending');
    } else {
        console.warn('⚠️ Leaderboard is empty');
    }

    console.log('\n🎉 Verification Complete!');
}

verifyLeaderboard().catch(console.error);
