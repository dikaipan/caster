
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Resetting admin user credentials...');

    const client = prisma as any;
    if (!client.hitachiUser) {
        console.error('❌ property "hitachiUser" not found.');
        return;
    }

    const password = await bcrypt.hash('admin123', 10);

    // Note: Model is HitachiUser
    // Fields: username, email, passwordHash, fullName, role, department, status
    const user = await client.hitachiUser.upsert({
        where: { username: 'admin' },
        update: {
            passwordHash: password,
            status: 'ACTIVE'
        },
        create: {
            username: 'admin',
            email: 'admin@hitachi.com',
            passwordHash: password,
            fullName: 'Hitachi Admin',
            role: 'SUPER_ADMIN',
            department: 'REPAIR_CENTER',
            status: 'ACTIVE'
        },
    });

    console.log('✅ Admin user reset successfully.');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Role:', user.role);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
