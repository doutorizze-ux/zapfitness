import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Current Members ---');
    const members = await prisma.member.findMany({
        include: { tenant: true }
    });

    for (const member of members) {
        console.log(`Member: ${member.name}`);
        console.log(`- ID: ${member.id}`);
        console.log(`- Phone: "${member.phone}"`);
        console.log(`- Tenant: ${member.tenant.name} (${member.tenant.id})`);
        console.log('---');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
