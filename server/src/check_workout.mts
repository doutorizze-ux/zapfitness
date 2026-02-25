
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const memberId = 'f7e48d8e-2652-4864-b860-b4a2c158832e'; // Mauricio's ID from logs
    const member = await prisma.member.findUnique({
        where: { id: memberId },
        include: { workouts: { include: { exercises: true } } }
    });

    console.log('--- Member Mauricio ---');
    console.log('Name:', member?.name);
    console.log('Active:', member?.active);
    console.log('Workouts Count:', member?.workouts.length);
    member?.workouts.forEach(w => {
        console.log(`Workout: ${w.name} (ID: ${w.id}, Active: ${w.active}, Exercises: ${w.exercises.length})`);
    });

    const workoutId = '76dff0d4-5c75-4000-981f-ca24b73be5ce';
    const workout = await prisma.workout.findUnique({
        where: { id: workoutId },
        include: { member: { include: { tenant: true } } }
    });

    console.log('\n--- Workout from Screenshot ---');
    if (workout) {
        console.log('Found:', workout.name);
        console.log('Active:', workout.active);
        console.log('Member Name:', workout.member.name);
        console.log('Tenant Name:', workout.member.tenant.name);
    } else {
        console.log('Workout NOT FOUND in database!');
    }
}

main();
