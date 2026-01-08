import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import {
    CassetteStatus,
    OrganizationStatus,
    HitachiUserRole,
    HitachiUserDepartment,
    PengelolaUserRole,
} from '@prisma/client';

describe('Tickets Integration (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    // Test Users
    let adminToken: string;
    let pengelolaToken: string;
    let adminUser: any;
    let pengelolaUser: any;
    let pengelolaOrg: any;
    let customerBank: any;

    // Test Data
    let ticketId: string;
    let cassetteId: string;
    let machineId: string;
    let spareCassetteId: string;

    const uniqueId = Date.now().toString();
    const adminUsername = `admin_${uniqueId}`;
    const pengelolaUsername = `pengelola_${uniqueId}`;
    const password = 'Password123!';

    const cassetteSerial = `CASSETTE-TEST-${uniqueId}`;
    const spareCassetteSerial = `SPARE-TEST-${uniqueId}`;
    const machineWsid = `WS-TEST-${uniqueId}`;
    const machineCode = `MACH-${uniqueId}`;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api/v1');
        await app.init();

        prisma = app.get(PrismaService);

        // 1. Create Organization Structure (Bank & Pengelola)
        customerBank = await prisma.customerBank.create({
            data: {
                bankCode: `BANK-${uniqueId}`,
                bankName: `Test Bank ${uniqueId}`,
                status: OrganizationStatus.ACTIVE,
            }
        });

        pengelolaOrg = await prisma.pengelola.create({
            data: {
                pengelolaCode: `PENG-${uniqueId}`,
                companyName: `Test Pengelola ${uniqueId}`,
                companyAbbreviation: `TP${uniqueId}`,
                status: OrganizationStatus.ACTIVE,
            }
        });

        // 1.5 Create Bank Assignments (Required for authorization)
        await prisma.bankPengelolaAssignment.create({
            data: {
                customerBankId: customerBank.id,
                pengelolaId: pengelolaOrg.id,
                status: OrganizationStatus.ACTIVE,
            }
        });

        // 2. Create Users
        const hashedPassword = await bcrypt.hash(password, 10);

        // Admin (HitachiUser)
        adminUser = await prisma.hitachiUser.create({
            data: {
                email: `admin_${uniqueId}@example.com`,
                username: adminUsername,
                passwordHash: hashedPassword,
                role: HitachiUserRole.SUPER_ADMIN,
                department: HitachiUserDepartment.REPAIR_CENTER,
                fullName: 'Test Admin',
                status: OrganizationStatus.ACTIVE,
            },
        });

        // Pengelola (PengelolaUser)
        pengelolaUser = await prisma.pengelolaUser.create({
            data: {
                email: `pengelola_${uniqueId}@example.com`,
                username: pengelolaUsername,
                passwordHash: hashedPassword,
                role: PengelolaUserRole.ADMIN,
                pengelolaId: pengelolaOrg.id,
                fullName: 'Test Pengelola',
                status: OrganizationStatus.ACTIVE,
                canCreateTickets: true,
            },
        });

        // 3. Create Cassette Type
        let cassetteType = await prisma.cassetteType.findUnique({ where: { typeCode: 'RB' as any } });
        if (!cassetteType) {
            try {
                cassetteType = await prisma.cassetteType.create({
                    data: {
                        typeCode: 'RB' as any,
                        machineType: 'CRM',
                        description: 'Recycle Box'
                    }
                });
            } catch (e) {
                cassetteType = await prisma.cassetteType.findUnique({ where: { typeCode: 'RB' as any } });
            }
        }

        // 4. Create Machine
        const machine = await prisma.machine.create({
            data: {
                machineCode: machineCode,
                modelName: 'TestModel',
                serialNumberManufacturer: `SN-${uniqueId}`,
                physicalLocation: 'Test Location',
                customerBankId: customerBank.id,
                pengelolaId: pengelolaOrg.id,
                currentWsid: machineWsid,
                status: 'OPERATIONAL' as any,
            }
        });
        machineId = machine.id;

        // 5. Create Cassette
        const cassette = await prisma.cassette.create({
            data: {
                serialNumber: cassetteSerial,
                status: CassetteStatus.OK,
                cassetteTypeId: cassetteType!.id, // Non-null assertion
                customerBankId: customerBank.id,
                machineId: machine.id,
            }
        });
        cassetteId = cassette.id;

        // Create Spare Cassette
        const spare = await prisma.cassette.create({
            data: {
                serialNumber: spareCassetteSerial,
                status: CassetteStatus.OK,
                cassetteTypeId: cassetteType!.id, // Non-null assertion
                customerBankId: customerBank.id,
            }
        });
        spareCassetteId = spare.id;


        // 6. Login
        const adminLogin = await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send({ username: adminUsername, password: password });
        adminToken = adminLogin.body.tokens?.access_token;
        if (!adminToken) console.error('Admin login failed:', adminLogin.body);

        const pengelolaLogin = await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send({ username: pengelolaUsername, password: password });
        pengelolaToken = pengelolaLogin.body.tokens?.access_token;
        if (!pengelolaToken) console.error('Pengelola login failed:', pengelolaLogin.body);

        expect(adminToken).toBeDefined();
        expect(pengelolaToken).toBeDefined();
    });

    afterAll(async () => {
        try {
            if (ticketId) {
                await prisma.cassetteDelivery.deleteMany({ where: { ticketId } }).catch(e => { });
                await prisma.cassetteReturn.deleteMany({ where: { ticketId } }).catch(e => { });
                await prisma.ticketCassetteDetail.deleteMany({ where: { ticketId } }).catch(e => { });
                await prisma.problemTicket.delete({ where: { id: ticketId } }).catch(e => { });
            }

            if (cassetteId) await prisma.cassette.delete({ where: { id: cassetteId } }).catch(e => { });
            if (spareCassetteId) await prisma.cassette.delete({ where: { id: spareCassetteId } }).catch(e => { });
            if (machineId) await prisma.machine.delete({ where: { id: machineId } }).catch(e => { });

            if (adminUser) await prisma.hitachiUser.delete({ where: { id: adminUser.id } }).catch(e => { });
            if (pengelolaUser) await prisma.pengelolaUser.delete({ where: { id: pengelolaUser.id } }).catch(e => { });

            if (pengelolaOrg) await prisma.pengelola.delete({ where: { id: pengelolaOrg.id } }).catch(e => { });
            if (customerBank) await prisma.customerBank.delete({ where: { id: customerBank.id } }).catch(e => { });

        } catch (e) {
            console.error('Cleanup failed', e);
        }

        await app.close();
    });

    it('1. Pengelola should Create a Ticket', () => {
        return request(app.getHttpServer())
            .post('/api/v1/tickets')
            .set('Authorization', `Bearer ${pengelolaToken}`)
            .send({
                cassetteSerialNumber: cassetteSerial,
                title: 'Test Broken Cassette',
                description: 'End-to-End Test Description',
                priority: 'HIGH',
                machineId: machineId,
                affectedComponents: ['Belt'],
                errorCode: 'E000'
            })
            .expect(201)
            .expect((res) => {
                expect(res.body.id).toBeDefined();
                ticketId = res.body.id;
            });
    });

    it('2. Admin should Create Delivery', () => {
        return request(app.getHttpServer())
            .post('/api/v1/tickets/delivery')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                ticketId: ticketId,
                cassetteId: spareCassetteId,
                shippedDate: new Date().toISOString(),
                courierService: 'TestCourier',
                trackingNumber: 'TRACK123',
                estimatedArrival: new Date().toISOString()
            })
            .expect(201)
            .expect((res) => {
                expect(res.body.id).toBeDefined();
            });
    });

    it('3. Admin should Receive Delivery (Faulty Cassette at RC)', () => {
        return request(app.getHttpServer())
            .post(`/api/v1/tickets/${ticketId}/receive-delivery`)
            .set('Authorization', `Bearer ${adminToken}`) // Admin receives faulty cassette
            .send({
                notes: 'Received faulty cassette'
            })
            .expect(201);
    });

    it('3.5 Manually Resolve TicketAnd Cassette (Simulate Repair)', async () => {
        // Force status to RESOLVED and Cassette to READY_FOR_PICKUP so we can create return
        await prisma.problemTicket.update({
            where: { id: ticketId },
            data: { status: 'RESOLVED' as any }
        });

        // We assume we are returning the original cassette (not swapped) for this test flow.
        // Actually, DeliveryService.receiveDelivery (Step 3) updated the cassette in "cassetteId" (which was "spareCassetteId" in Step 2?? NO)
        // Step 2 sent "spareCassetteId".
        // Wait, Logic involves TWO cassettes?
        // Step 1: Ticket for "cassetteId".
        // Step 2: Delivery of "spareCassetteId".
        // Step 3: Receive Delivery. Logic: Updates cassette status to IN_REPAIR. Which cassette?
        // DeliveryService line 302 updates "cassetteIds" from delivery and ticket details.
        // So BOTH cassettes might be updated to IN_REPAIR?
        // Or just the one in delivery?

        // ReturnService check:
        // Line 180: cassette = ticket.cassetteDelivery.cassette;
        // So checks status of "spareCassetteId" (from Step 2).

        // I will update BOTH cassetteId and spareCassetteId to READY_FOR_PICKUP to be safe.
        // Or check which one is used.
        // I will update "spareCassetteId" because that is what Admin delivered in Step 2.
        // Wait, "Admin creates delivery of spare".
        // "Admin receives delivery of faulty".
        // Step 2 implementation created delivery with "spareCassetteId".
        // So ReturnService checks "spareCassetteId".

        await prisma.cassette.update({
            where: { id: spareCassetteId },
            data: { status: 'READY_FOR_PICKUP' as any }
        });

        // Also update original cassette just in case?
        if (cassetteId) {
            await prisma.cassette.update({
                where: { id: cassetteId },
                data: { status: 'READY_FOR_PICKUP' as any }
            }).catch(e => { }); // Ignore if scrapped/deleted
        }
    });

    it('4. Admin should Confirm Pickup (Return)', () => {
        return request(app.getHttpServer())
            .post('/api/v1/tickets/return')
            .set('Authorization', `Bearer ${adminToken}`) // Admin confirms pickup
            .send({
                ticketId: ticketId,
                notes: 'Cassette picked up by Pengelola'
            })
            .expect(201);
    });

    // Step 5 removed because createReturn handles pickup confirmation and closes ticket logic immediately in this implementation.


});
