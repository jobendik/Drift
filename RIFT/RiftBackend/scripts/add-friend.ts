import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addFriend() {
    const email1 = 'demo@rift.com';
    const email2 = 'neon@rift.com';

    console.log(`Finding users...`);
    const user1 = await prisma.user.findUnique({ where: { email: email1 } });
    const user2 = await prisma.user.findUnique({ where: { email: email2 } });

    if (!user1 || !user2) {
        console.error('Users not found!');
        return;
    }

    console.log(`Creating friendship between ${user1.username} (${user1.id}) and ${user2.username} (${user2.id})...`);

    // Create mutual friendship
    try {
        await prisma.friendship.create({
            data: { userId: user1.id, friendId: user2.id }
        });
        console.log('Direction 1 created.');
    } catch (e) {
        console.log('Direction 1 might already exist.');
    }

    try {
        await prisma.friendship.create({
            data: { userId: user2.id, friendId: user1.id }
        });
        console.log('Direction 2 created.');
    } catch (e) {
        console.log('Direction 2 might already exist.');
    }

    console.log(`✅ Friendship established! Refresh your browsers.`);
}

addFriend()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
