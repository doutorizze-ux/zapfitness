
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const admin = await prisma.saasOwner.findUnique({
            where: { email: 'admin@zapfitness.com' }
        });
        console.log('SEED_CHECK_RESULT:', admin ? 'FOUND' : 'NOT_FOUND');
        if (admin) {
            console.log('Password hash starts with:', admin.password.substring(0, 10));
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
