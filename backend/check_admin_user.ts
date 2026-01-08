
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking for admin user in HitachiUser table...');

    // Try to access hitachiUser property
    // We use 'any' casting to avoid TS errors if the types aren't perfectly generated in this environment
    const client = prisma as any;

    if (!client.hitachiUser) {
        console.error('❌ property "hitachiUser" not found on PrismaClient. Available models might be different.');
        console.log('Available properties:', Object.keys(client).filter(k => !k.startsWith('_') && !k.startsWith('$')));
        return;
    }

    const user = await client.hitachiUser.findUnique({
        where: { username: 'admin' },
    });

    if (!user) {
        console.error('❌ User "admin" NOT FOUND in HitachiUser table.');
        return;
    }

    console.log('✅ User "admin" found in HitachiUser.');
    console.log('Stored hash:', user.password);

    const isPasswordValid = await bcrypt.compare('admin123', user.password);

    if (isPasswordValid) {
        console.log('✅ Password "admin123" is VALID.');
    } else {
        console.error('❌ Password "admin123" is INVALID.');
        // Let's generate a valid hash for comparison
        const validHash = await bcrypt.hash('admin123', 10);
        console.log('Expected hash for "admin123" should look like:', validHash);
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
