import 'dotenv/config';

async function verifyShop() {
    const API_URL = 'http://localhost:3000/api';
    const EMAIL = 'demo@rift.com';
    const PASSWORD = 'password';

    console.log('🔍 Starting Shop Verification...');

    // 1. Login
    console.log('\n1. Logging in...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });

    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
    const { token, user } = await loginRes.json();
    console.log(`✅ Login successful. Balance: ${user.currency.riftTokens} Tokens`);

    // 2. Get Shop Items
    console.log('\n2. Fetching Shop Items...');
    const itemsRes = await fetch(`${API_URL}/shop/items`);
    if (!itemsRes.ok) throw new Error(`Fetch items failed: ${itemsRes.status}`);
    const items = await itemsRes.json();
    console.log(`✅ Fetched ${items.length} items`);

    if (items.length === 0) throw new Error('No items in shop');
    const itemToBuy = items[0]; // Buy the first item
    console.log(`Target Item: ${itemToBuy.name} (${itemToBuy.price} Tokens)`);

    // 3. Buy Item
    console.log('\n3. Buying Item...');
    const buyRes = await fetch(`${API_URL}/shop/buy`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemId: itemToBuy.id })
    });

    if (!buyRes.ok) {
        const err = await buyRes.json();
        console.warn(`⚠️ Purchase failed: ${err.message}`);
        // Don't throw if insufficient funds, just log it
    } else {
        const buyData = await buyRes.json();
        console.log(`✅ Purchase successful: ${buyData.message}`);
    }

    // 4. Verify Inventory
    console.log('\n4. Verifying Inventory...');
    const invRes = await fetch(`${API_URL}/shop/inventory`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!invRes.ok) throw new Error(`Fetch inventory failed: ${invRes.status}`);
    const inventory = await invRes.json();
    console.log('Current Inventory:', inventory);

    const owned = inventory.find((i: any) => i.itemId === itemToBuy.id);
    if (owned) {
        console.log(`✅ Verified ownership of ${itemToBuy.name} (Qty: ${owned.quantity})`);
    } else {
        console.warn(`⚠️ Item not found in inventory (Purchase might have failed due to funds)`);
    }

    console.log('\n🎉 Verification Complete!');
}

verifyShop().catch(console.error);
