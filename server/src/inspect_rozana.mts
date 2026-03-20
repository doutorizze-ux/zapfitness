import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- INSPECTING ROZANA ---');
    const student = await prisma.member.findFirst({
        where: { name: { contains: 'rozana' } },
        include: { workouts: { include: { exercises: true } } }
    });

    if (!student) {
        console.log('No student found with name: rozana');
        return;
    }

    console.log(`Student: ${student.name} | ID: ${student.id}`);
    console.log(`Manual Routine Note: "${student.workout_routine}"`);
    console.log(`\nDigital Workouts count: ${student.workouts.length}`);
    
    student.workouts.forEach(w => {
        console.log(`- Workout: ${w.name} | ID: ${w.id} | Active: ${w.active}`);
        console.log(`  Exercises count: ${w.exercises.length}`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
