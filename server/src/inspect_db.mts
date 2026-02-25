
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const workoutCount = await prisma.workout.count();
    const workouts = await prisma.workout.findMany({
        include: { member: true }
    });

    console.log(`Total Workouts in DB: ${workoutCount}`);
    workouts.forEach(w => {
        console.log(`- Workout: ${w.name} (ID: ${w.id}) | Active: ${w.active} | Member: ${w.member?.name} (ID: ${w.member_id})`);
    });

    const memberIdSearch = '26df0dc4-5c75-4000-981f-ca24b73be5ce';
    const member = await prisma.member.findUnique({ where: { id: memberIdSearch } });
    console.log(`\nSearch for Member ${memberIdSearch}:`, member ? `Found: ${member.name}` : 'NOT FOUND');
}

main();
