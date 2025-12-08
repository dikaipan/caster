import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create Cassette Types (Master Data)
  console.log('📦 Creating cassette types...');
  const cassetteTypeRB = await prisma.cassetteType.upsert({
    where: { typeCode: 'RB' },
    update: {},
    create: {
      typeCode: 'RB',
      machineType: 'VS',
      description: 'Recycle Box for both accepting and dispensing cash',
    },
  });

  const cassetteTypeAB = await prisma.cassetteType.upsert({
    where: { typeCode: 'AB' },
    update: {},
    create: {
      typeCode: 'AB',
      machineType: 'VS',
      description: 'Acceptor Box for accepting cash only (deposit only)',
    },
  });

  const cassetteTypeURJB = await prisma.cassetteType.upsert({
    where: { typeCode: 'URJB' },
    update: {},
    create: {
      typeCode: 'URJB',
      machineType: 'SR',
      description: 'Unrecognized Reject Box for rejected/invalid notes',
    },
  });

  console.log('✅ Cassette types created');

  // 2. Create Hitachi Super Admin User
  console.log('👤 Creating Hitachi users...');
  const superAdminPassword = await bcrypt.hash('admin123', 10);
  const superAdmin = await prisma.hitachiUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@hitachi.co.jp',
      passwordHash: superAdminPassword,
      fullName: 'Hitachi Super Admin',
      role: 'SUPER_ADMIN',
      department: 'MANAGEMENT',
      status: 'ACTIVE',
    },
  });

  const rcManagerPassword = await bcrypt.hash('rcmanager123', 10);
  const rcManager = await prisma.hitachiUser.upsert({
    where: { username: 'rc_manager' },
    update: {},
    create: {
      username: 'rc_manager',
      email: 'rc.manager@hitachi.co.jp',
      passwordHash: rcManagerPassword,
      fullName: 'RC Manager',
      role: 'RC_MANAGER',
      department: 'REPAIR_CENTER',
      status: 'ACTIVE',
    },
  });

  const rcStaffPassword = await bcrypt.hash('rcstaff123', 10);
  const rcStaff = await prisma.hitachiUser.upsert({
    where: { username: 'rc_staff_1' },
    update: {},
    create: {
      username: 'rc_staff_1',
      email: 'rc.staff1@hitachi.co.jp',
      passwordHash: rcStaffPassword,
      fullName: 'RC Staff Technician 1',
      role: 'RC_STAFF',
      department: 'REPAIR_CENTER',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Hitachi users created');

  // 3. Create Bank Customer (BNI)
  console.log('🏦 Creating bank customers...');
  const bankBNI = await prisma.customerBank.upsert({
    where: { bankCode: 'BNI' },
    update: {},
    create: {
      bankCode: 'BNI',
      bankName: 'PT Bank Negara Indonesia (Persero) Tbk',
      status: 'ACTIVE',
      primaryContactName: 'Budi Santoso',
      primaryContactEmail: 'budi.santoso@bni.co.id',
      primaryContactPhone: '+62-21-2511946',
    },
  });

  console.log('✅ Bank customers created');

  // 4. Create Vendors
  console.log('🚚 Creating vendors...');
  const pengelolaTAG = await prisma.pengelola.upsert({
    where: { pengelolaCode: 'VND-TAG-001' },
    update: {},
    create: {
      pengelolaCode: 'VND-TAG-001',
      companyName: 'PT TAG Indonesia',
      companyAbbreviation: 'TAG',
      businessRegistrationNumber: '01.234.567.8-901.000',
      address: 'Jl. Gatot Subroto No. 123, Jakarta Selatan',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      primaryContactName: 'Ahmad Wijaya',
      primaryContactEmail: 'ahmad.wijaya@tag.co.id',
      primaryContactPhone: '+62-21-5551234',
      website: 'https://www.tag.co.id',
      status: 'ACTIVE',
      notes: 'Certified vendor since 2020',
    },
  });

  const pengelolaADV = await prisma.pengelola.upsert({
    where: { pengelolaCode: 'VND-ADV-001' },
    update: {},
    create: {
      pengelolaCode: 'VND-ADV-001',
      companyName: 'PT ADV Services',
      companyAbbreviation: 'ADV',
      businessRegistrationNumber: '02.345.678.9-012.000',
      address: 'Jl. Basuki Rahmat No. 456, Surabaya',
      city: 'Surabaya',
      province: 'Jawa Timur',
      primaryContactName: 'Siti Rahayu',
      primaryContactEmail: 'siti.rahayu@adv.co.id',
      primaryContactPhone: '+62-31-5551234',
      website: 'https://www.adv.co.id',
      status: 'ACTIVE',
      notes: 'East Java regional vendor',
    },
  });

  console.log('✅ Vendors created');

  // 5. Create Bank-Vendor Assignments
  console.log('🔗 Creating bank-vendor assignments...');
  const assignmentTAG = await prisma.bankPengelolaAssignment.upsert({
    where: {
      customerBankId_pengelolaId: {
        customerBankId: bankBNI.id,
        pengelolaId: pengelolaTAG.id,
      },
    },
    update: {},
    create: {
      customerBankId: bankBNI.id,
      pengelolaId: pengelolaTAG.id,
      contractNumber: 'SVC-BNI-TAG-2024-001',
      contractStartDate: new Date('2024-01-01'),
      contractEndDate: new Date('2026-12-31'),
      serviceScope: 'DKI Jakarta and surrounding areas',
      assignedBranches: ['BNI-JKT-SUDIRMAN', 'BNI-JKT-THAMRIN', 'BNI-JKT-SENAYAN'],
      slaResponseTimeHours: 4,
      slaResolutionTimeHours: 24,
      status: 'ACTIVE',
      notes: 'Priority vendor for Jakarta region',
    },
  });

  const assignmentADV = await prisma.bankPengelolaAssignment.upsert({
    where: {
      customerBankId_pengelolaId: {
        customerBankId: bankBNI.id,
        pengelolaId: pengelolaADV.id,
      },
    },
    update: {},
    create: {
      customerBankId: bankBNI.id,
      pengelolaId: pengelolaADV.id,
      contractNumber: 'SVC-BNI-ADV-2024-001',
      contractStartDate: new Date('2024-01-01'),
      contractEndDate: new Date('2026-12-31'),
      serviceScope: 'East Java region',
      assignedBranches: ['BNI-SBY-TUNJUNGAN', 'BNI-MLG-DIENG'],
      slaResponseTimeHours: 6,
      slaResolutionTimeHours: 48,
      status: 'ACTIVE',
      notes: 'Regional vendor for East Java',
    },
  });

  console.log('✅ Bank-vendor assignments created');

  // 6. Create Vendor Users
  console.log('👥 Creating vendor users...');
  const pengelolaAdminPassword = await bcrypt.hash('vendor123', 10);
  
  const tagAdmin = await prisma.pengelolaUser.upsert({
    where: { username: 'tag_admin' },
    update: {},
    create: {
      pengelolaId: pengelolaTAG.id,
      username: 'tag_admin',
      email: 'admin@tag.co.id',
      passwordHash: pengelolaAdminPassword,
      fullName: 'TAG Admin',
      phone: '+62-812-3456-7890',
      whatsappNumber: '+62-812-3456-7890',
      role: 'ADMIN',
      employeeId: 'TAG-EMP-001',
      canCreateTickets: true,
      canCloseTickets: true,
      canManageMachines: true,
      assignedBranches: Prisma.JsonNull, // Admin can see all branches
      status: 'ACTIVE',
    },
  });

  const tagTechnician1 = await prisma.pengelolaUser.upsert({
    where: { username: 'tag_tech1' },
    update: {},
    create: {
      pengelolaId: pengelolaTAG.id,
      username: 'tag_tech1',
      email: 'tech1@tag.co.id',
      passwordHash: pengelolaAdminPassword,
      fullName: 'Technician 1 - Jakarta',
      phone: '+62-812-1111-1111',
      whatsappNumber: '+62-812-1111-1111',
      role: 'TECHNICIAN',
      employeeId: 'TAG-EMP-101',
      canCreateTickets: true,
      canCloseTickets: false,
      canManageMachines: false,
      assignedBranches: ['BNI-JKT-SUDIRMAN', 'BNI-JKT-THAMRIN'],
      status: 'ACTIVE',
    },
  });

  const advAdmin = await prisma.pengelolaUser.upsert({
    where: { username: 'adv_admin' },
    update: {},
    create: {
      pengelolaId: pengelolaADV.id,
      username: 'adv_admin',
      email: 'admin@adv.co.id',
      passwordHash: pengelolaAdminPassword,
      fullName: 'ADV Admin',
      phone: '+62-813-3456-7890',
      whatsappNumber: '+62-813-3456-7890',
      role: 'ADMIN',
      employeeId: 'ADV-EMP-001',
      canCreateTickets: true,
      canCloseTickets: true,
      canManageMachines: true,
      assignedBranches: Prisma.JsonNull,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Vendor users created');

  // 7. Create Machines
  console.log('🖥️ Creating machines...');
  const machine1 = await prisma.machine.upsert({
    where: { machineCode: 'BNI-JKT-M001' },
    update: {},
    create: {
      customerBankId: bankBNI.id,
      pengelolaId: pengelolaTAG.id,
      machineCode: 'BNI-JKT-M001',
      modelName: 'SR7500VS',
      serialNumberManufacturer: 'HTCH-SRM100-2023-0001',
      physicalLocation: 'BNI Cabang Sudirman, Jl. Jend. Sudirman Kav. 1, Jakarta Pusat',
      branchCode: 'BNI-JKT-SUDIRMAN',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      installationDate: new Date('2023-06-15'),
      currentWsid: 'WS-BNI-JKT-001',
      status: 'OPERATIONAL',
      notes: 'High-traffic location',
    },
  });

  const machine2 = await prisma.machine.upsert({
    where: { machineCode: 'BNI-JKT-M002' },
    update: {},
    create: {
      customerBankId: bankBNI.id,
      pengelolaId: pengelolaTAG.id,
      machineCode: 'BNI-JKT-M002',
      modelName: 'SR7500VS',
      serialNumberManufacturer: 'HTCH-SRM100-2023-0002',
      physicalLocation: 'BNI Cabang Thamrin, Jl. M.H. Thamrin No. 5, Jakarta Pusat',
      branchCode: 'BNI-JKT-THAMRIN',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      installationDate: new Date('2023-07-20'),
      currentWsid: 'WS-BNI-JKT-002',
      status: 'OPERATIONAL',
    },
  });

  console.log('✅ Machines created');

  // 8. Create Cassettes (5 per machine: 4 RB + 1 AB + spare pool)
  console.log('💿 Creating cassettes...');
  
  // Machine 1 - Installed cassettes
  const cassettesM1: any[] = [];
  for (let i = 1; i <= 4; i++) {
    const cassette = await prisma.cassette.upsert({
      where: { serialNumber: `RB-BNI-${String(i).padStart(4, '0')}` },
      update: {},
      create: {
        serialNumber: `RB-BNI-${String(i).padStart(4, '0')}`,
        cassetteTypeId: cassetteTypeRB.id,
        customerBankId: bankBNI.id,
        status: 'OK',
      },
    });
    cassettesM1.push(cassette);
  }

  const cassetteAB_M1 = await prisma.cassette.upsert({
    where: { serialNumber: 'AB-BNI-0001' },
    update: {},
    create: {
      serialNumber: `AB-BNI-0001`,
      cassetteTypeId: cassetteTypeAB.id,
      customerBankId: bankBNI.id,
      status: 'OK',
    },
  });

  // Machine 2 - Installed cassettes
  for (let i = 5; i <= 8; i++) {
    await prisma.cassette.upsert({
      where: { serialNumber: `RB-BNI-${String(i).padStart(4, '0')}` },
      update: {},
      create: {
        serialNumber: `RB-BNI-${String(i).padStart(4, '0')}`,
        cassetteTypeId: cassetteTypeRB.id,
        customerBankId: bankBNI.id,
        status: 'OK',
      },
    });
  }

  await prisma.cassette.upsert({
    where: { serialNumber: 'AB-BNI-0002' },
    update: {},
    create: {
      serialNumber: `AB-BNI-0002`,
      cassetteTypeId: cassetteTypeAB.id,
      customerBankId: bankBNI.id,
      status: 'OK',
    },
  });

  // Spare cassettes (4 RB + 1 AB)
  for (let i = 9; i <= 12; i++) {
    await prisma.cassette.upsert({
      where: { serialNumber: `RB-BNI-${String(i).padStart(4, '0')}` },
      update: {},
      create: {
        serialNumber: `RB-BNI-${String(i).padStart(4, '0')}`,
        cassetteTypeId: cassetteTypeRB.id,
        customerBankId: bankBNI.id,
        status: 'OK',
        notes: 'Spare cassette for BNI',
      },
    });
  }

  await prisma.cassette.upsert({
    where: { serialNumber: 'AB-BNI-0003' },
    update: {},
    create: {
      serialNumber: `AB-BNI-0003`,
      cassetteTypeId: cassetteTypeAB.id,
      customerBankId: bankBNI.id,
      status: 'OK',
      notes: 'Spare cassette for BNI',
    },
  });

  console.log('✅ Cassettes created');

  console.log('\n🎉 Database seed completed successfully!\n');
  console.log('📝 Default credentials:');
  console.log('   Super Admin: admin / admin123');
  console.log('   RC Manager: rc_manager / rcmanager123');
  console.log('   RC Staff: rc_staff_1 / rcstaff123');
  console.log('   TAG Admin: tag_admin / vendor123');
  console.log('   TAG Technician: tag_tech1 / vendor123');
  console.log('   ADV Admin: adv_admin / vendor123\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

