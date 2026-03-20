import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@zapfitness.com';
    const rawPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const updated = await prisma.saasOwner.updateMany({
        where: { email },
        data: { password: hashedPassword }
    });

    if (updated.count > 0) {
         console.log(`✅ Senha do SuperAdmin (${email}) redefinida com sucesso para: ${rawPassword}`);
    } else {
         // Create it if not exists 
         await prisma.saasOwner.create({
              data: { email, password: hashedPassword }
         });
         console.log(`✅ SuperAdmin (${email}) criado com a senha: ${rawPassword}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
