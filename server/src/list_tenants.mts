import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- TENANTS ---');
    const tenants = await prisma.tenant.findMany({
        include: { admins: true }
    });
    tenants.forEach(t => {
        console.log(`Gym: ${t.name} (Slug: ${t.slug}) | ID: ${t.id}`);
        t.admins.forEach(a => {
            console.log(`  Admin: ${a.email} (${a.name})`);
        });
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
