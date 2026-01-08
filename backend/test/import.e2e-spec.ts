import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import {
    getUniqueId,
    createTestAdminUser,
    loginUser,
    cleanupTestData,
    setupTestApp,
} from './test-helpers';
import { TEST_PASSWORD } from './test-fixtures';

describe('Import (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let adminToken: string;
    let adminUser: any;
    let uniqueId: string;

    // We use 'RB' which is a valid Enum value for CassetteTypeCode. 
    // We cannot create arbitrary strings for Enums.
    const TEST_TYPE_CODE = 'RB';

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = await setupTestApp(moduleFixture);
        prisma = app.get(PrismaService);
        uniqueId = getUniqueId();

        // Create Super Admin
        const admin = await createTestAdminUser(prisma, uniqueId + '_imp', {
            role: 'SUPER_ADMIN',
        });
        adminUser = admin.user;
        adminToken = await loginUser(app, adminUser.username, TEST_PASSWORD);

        // Ensure 'RB' CassetteType exists
        // Cast to any to avoid TS enum import issues in test file (usually "RB" string is fine)
        await prisma.cassetteType.upsert({
            where: { typeCode: TEST_TYPE_CODE as any },
            update: {},
            create: {
                typeCode: TEST_TYPE_CODE as any,
                machineType: 'SR7500VS',
                description: 'Recycle Box Test'
            }
        });
    });

    afterAll(async () => {
        await cleanupTestData(prisma, {
            userIds: [adminUser.id],
        });
        await app.close();
    });

    describe('JSON Bulk Import', () => {
        it('POST /import/bulk - should import banks and cassettes', async () => {
            const importData = {
                banks: [
                    {
                        bankCode: `IMP-BANK-${uniqueId}`,
                        bankName: `Imported Bank ${uniqueId}`,
                    }
                ],
                cassettes: [
                    {
                        serialNumber: `IMP-CS-RB-${uniqueId}`, // Contains RB just in case
                        cassetteTypeCode: TEST_TYPE_CODE, // 'RB'
                        customerBankCode: `IMP-BANK-${uniqueId}`,
                        status: 'OK' // Valid Enum value
                    }
                ]
            };

            const response = await request(app.getHttpServer())
                .post('/api/v1/import/bulk')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(importData)
                .expect(201);

            // Check success flag
            // Note: If success is false, we want to know why.
            if (!response.body.success) {
                console.log('JSON Import Failed:', JSON.stringify(response.body, null, 2));
            }
            // Verify structure matches ImportResult interface
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.banks).toBeDefined();
            expect(response.body.banks.successful).toBe(1);
            expect(response.body.cassettes).toBeDefined();
            expect(response.body.cassettes.successful).toBe(1);
        });
    });

    describe('CSV Import', () => {
        it('POST /import/csv - should handle CSV file upload with implicit bank creation via previous step or concurrent?', async () => {
            // NOTE: The previous test created `IMP-BANK-${uniqueId}`.
            // But here let's use a fresh one for CSV to be independent or reuse?
            // Reuse is risky if order changes. Let's make CSV create its own referenced bank first
            // Wait, import system MIGHT expect Bank to exist if we only upload cassettes?
            // The JSON import creates banks AND cassettes in same payload.
            // CSV import: The file has `bank_code`. Does it create bank? 
            // Reading `import.service.ts`: `importFromCSV` calls `importMachineCassettesFromCSV` logic?
            // No, `importFromCSV` calls `processMachineCassetteRecords`.
            // Inside `processMachineCassetteRecords` (Line 1054): `prisma.customerBank.findUnique`.
            // It throws BadRequest if Bank NOT Found.

            // SO: We must create the bank BEFORE importing CSV.

            const bankCode = `CSV-BANK-${uniqueId}`;
            await prisma.customerBank.create({
                data: {
                    bankCode: bankCode,
                    bankName: `CSV Bank ${uniqueId}`,
                    status: 'ACTIVE'
                }
            });

            // "RB" is in the SN so auto-detection works
            const csvContent = 'machine_serial_number,cassette_serial_number,bank_code,pengelola_code\n' +
                `M-${uniqueId},C-RB-${uniqueId},${bankCode},P-${uniqueId}`;
            const buffer = Buffer.from(csvContent);

            const response = await request(app.getHttpServer())
                .post('/api/v1/import/csv')
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('file', buffer, 'import.csv')
                .expect(201);

            if (!response.body.success) {
                console.log('CSV Import Failed:', JSON.stringify(response.body, null, 2));
            }
            expect(response.body.success).toBe(true);
        });
    });

    describe('Template Download', () => {
        it('GET /import/csv/template - should return CSV file', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/import/csv/template')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.headers['content-type']).toContain('text/csv');
            expect(response.headers['content-disposition']).toContain('attachment');
        });
    });
});
