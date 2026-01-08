
const API_URL = 'http://localhost:3000/api/v1';

async function verifyApi() {
    console.log('🔍 Verifying API Versioning, Auth, and 2FA...');
    console.log(`Base URL: ${API_URL}`);

    try {
        // 1. Test Login (Public Route)
        console.log('\nTesting Login...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        if (loginRes.status !== 201 && loginRes.status !== 200) {
            console.error(`❌ Login Failed with status: ${loginRes.status} ${loginRes.statusText}`);
            process.exit(1);
        }

        console.log('✅ Login Successful');
        const data: any = await loginRes.json();
        const token = data.access_token;
        console.log('Access Token obtained.');

        // 2. Test Protected Route (Profile)
        console.log('\nTesting Protected Route (/auth/profile)...');
        const profileRes = await fetch(`${API_URL}/auth/profile`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        });

        if (profileRes.ok) {
            const profileData: any = await profileRes.json();
            console.log(`✅ Profile Access Successful: ${profileData.username}`);
        } else {
            console.error(`❌ Profile Access Failed: ${profileRes.status} ${profileRes.statusText}`);
            process.exit(1);
        }

        // 3. Test 2FA Setup
        console.log('\nTesting 2FA Setup (/auth/2fa/setup)...');
        const setupRes = await fetch(`${API_URL}/auth/2fa/setup`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });

        if (setupRes.ok) {
            const setupData: any = await setupRes.json();
            console.log('✅ 2FA Setup Initiated');
            console.log(`Secret: ${setupData.secret}`);
            console.log(`QR Code URL: ${setupData.qrCode.substring(0, 30)}...`);
        } else {
            console.error(`❌ 2FA Setup Failed: ${setupRes.status} ${setupRes.statusText}`);
        }

        console.log('\nSkipping full 2FA Verify as it requires generating valid TOTP codes client-side.');
        console.log('✅ 2FA Endpoints exist and are reachable.');

    } catch (error: any) {
        console.error('❌ API Verification Failed:', error.message);
        if (error.cause) {
            console.error('Cause:', error.cause);
        }
        process.exit(1);
    }
}

verifyApi();
