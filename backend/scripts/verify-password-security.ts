import * as bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from '../src/auth/constants';

async function verifyPasswordSecurity() {
    console.log('🔒 Verifying Password Security Configuration...');
    console.log(`Expected Salt Rounds: ${BCRYPT_SALT_ROUNDS}`);

    if (BCRYPT_SALT_ROUNDS !== 12) {
        console.error('❌ Error: BCRYPT_SALT_ROUNDS is not set to 12!');
        process.exit(1);
    }

    const testPassword = 'TestPassword123!';
    console.log(`\nTesting hashing with password: "${testPassword}"`);

    const start = Date.now();
    const hash = await bcrypt.hash(testPassword, BCRYPT_SALT_ROUNDS);
    const end = Date.now();

    console.log(`Generated Hash: ${hash}`);
    console.log(`Time taken: ${end - start}ms`);

    // Verify salt rounds from hash prefix
    // $2b$12$... means bcrypt (2b) with 12 rounds
    const rounds = hash.split('$')[2];
    console.log(`\nExtracted rounds from hash: ${rounds}`);

    if (rounds === '12') {
        console.log('✅ SUCCESS: Hash uses 12 salt rounds.');
    } else {
        console.error(`❌ FAILURE: Hash uses ${rounds} salt rounds instead of 12.`);
        process.exit(1);
    }

    // Verify comparison
    const isMatch = await bcrypt.compare(testPassword, hash);
    if (isMatch) {
        console.log('✅ SUCCESS: Password comparison verify works correctly.');
    } else {
        console.error('❌ FAILURE: Password comparison failed.');
        process.exit(1);
    }
}

verifyPasswordSecurity().catch(console.error);
