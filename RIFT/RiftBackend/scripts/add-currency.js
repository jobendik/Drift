"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function addCurrency() {
    const email = 'demo@rift.com';
    console.log(`Looking for user ${email}...`);
    const user = await prisma.user.findUnique({
        where: { email },
        include: { currency: true }
    });
    if (!user) {
        console.error('User not found!');
        return;
    }
    console.log(`Current balance: ${user.currency?.riftTokens || 0}`);
    const updated = await prisma.currency.update({
        where: { userId: user.id },
        data: {
            riftTokens: { increment: 5000 },
            plasmaCredits: { increment: 1000 }
        }
    });
    console.log(`✅ Added 5000 Rift Tokens and 1000 Plasma Credits.`);
    console.log(`New balance: ${updated.riftTokens} RT, ${updated.plasmaCredits} PC`);
}
addCurrency()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=add-currency.js.map