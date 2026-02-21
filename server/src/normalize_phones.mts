import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Normalizing Member Phone Numbers ---');
    const members = await prisma.member.findMany();
    let updatedCount = 0;

    for (const member of members) {
        const normalized = member.phone.replace(/\D/g, '');
        if (normalized !== member.phone) {
            await prisma.member.update({
                where: { id: member.id },
                data: { phone: normalized }
            });
            console.log(`Updated ${member.name}: ${member.phone} -> ${normalized}`);
            updatedCount++;
        }
    }

    console.log(`Total members updated: ${updatedCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
