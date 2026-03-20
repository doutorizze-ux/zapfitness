import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- SAAS OWNERS ---');
    const saasOwners = await prisma.saasOwner.findMany();
    saasOwners.forEach(o => {
        console.log(`Email: ${o.email}`);
    });

    console.log('\n--- GYM ADMINS ---');
    const gymAdmins = await prisma.gymAdmin.findMany({
        include: { tenant: true }
    });
    gymAdmins.forEach(a => {
        console.log(`Email: ${a.email} | Name: ${a.name} | Tenant: ${a.tenant.name} (${a.tenant.slug})`);
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
