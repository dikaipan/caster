import {
    HitachiUserRole,
    HitachiUserDepartment,
    PengelolaUserRole,
    CassetteStatus,
    OrganizationStatus,
} from '@prisma/client';

/**
 * Default test password for all test users
 */
export const TEST_PASSWORD = 'Password123!';

/**
 * Test user fixtures with different roles
 */
export const TEST_USERS = {
    SUPER_ADMIN: {
        role: HitachiUserRole.SUPER_ADMIN,
        department: HitachiUserDepartment.REPAIR_CENTER,
        fullName: 'Test Super Admin',
    },
    RC_MANAGER: {
        role: HitachiUserRole.RC_MANAGER,
        department: HitachiUserDepartment.REPAIR_CENTER,
        fullName: 'Test RC Manager',
    },
    RC_STAFF: {
        role: HitachiUserRole.RC_STAFF,
        department: HitachiUserDepartment.REPAIR_CENTER,
        fullName: 'Test RC Staff',
    },
    LOGISTICS_STAFF: {
        role: HitachiUserRole.RC_STAFF,
        department: HitachiUserDepartment.LOGISTICS,
        fullName: 'Test Logistics Staff',
    },
    PENGELOLA_ADMIN: {
        role: PengelolaUserRole.ADMIN,
        fullName: 'Test Pengelola Admin',
        canCreateTickets: true,
    },
    PENGELOLA_SUPERVISOR: {
        role: PengelolaUserRole.SUPERVISOR,
        fullName: 'Test Pengelola Supervisor',
        canCreateTickets: true,
    },
    PENGELOLA_SUPERVISOR_2: {
        role: PengelolaUserRole.SUPERVISOR,
        fullName: 'Test Pengelola Supervisor 2',
        canCreateTickets: true,
    },
};

/**
 * Test organization fixtures
 */
export const TEST_ORGANIZATIONS = {
    BANK_1: {
        bankCode: 'BNI',
        bankName: 'Bank Negara Indonesia',
        status: OrganizationStatus.ACTIVE,
    },
    BANK_2: {
        bankCode: 'BRI',
        bankName: 'Bank Rakyat Indonesia',
        status: OrganizationStatus.ACTIVE,
    },
    PENGELOLA_1: {
        companyName: 'PT Test Pengelola A',
        companyAbbreviation: 'TPA',
        status: OrganizationStatus.ACTIVE,
    },
    PENGELOLA_2: {
        companyName: 'PT Test Pengelola B',
        companyAbbreviation: 'TPB',
        status: OrganizationStatus.ACTIVE,
    },
};

/**
 * Test machine fixtures
 */
export const TEST_MACHINES = {
    CRM_MACHINE: {
        modelName: 'CRM-2000',
        physicalLocation: 'Jakarta Head Office',
        status: 'OPERATIONAL' as any,
    },
    TCR_MACHINE: {
        modelName: 'TCR-3000',
        physicalLocation: 'Surabaya Branch',
        status: 'OPERATIONAL' as any,
    },
};

/**
 * Test cassette fixtures
 */
export const TEST_CASSETTES = {
    OK_CASSETTE: {
        status: CassetteStatus.OK,
    },
    BAD_CASSETTE: {
        status: CassetteStatus.BAD,
    },
    IN_REPAIR_CASSETTE: {
        status: CassetteStatus.IN_REPAIR,
    },
    READY_FOR_PICKUP_CASSETTE: {
        status: CassetteStatus.READY_FOR_PICKUP,
    },
};

/**
 * Test cassette type fixtures
 */
export const TEST_CASSETTE_TYPES = {
    RB: {
        typeCode: 'RB' as any,
        machineType: 'CRM',
        description: 'Recycle Box',
    },
    CB: {
        typeCode: 'CB' as any,
        machineType: 'CRM',
        description: 'Cash Box',
    },
    NOTE: {
        typeCode: 'NOTE' as any,
        machineType: 'TCR',
        description: 'Note Cassette',
    },
};

/**
 * Test ticket fixtures
 */
export const TEST_TICKETS = {
    HIGH_PRIORITY: {
        title: 'Urgent Cassette Malfunction',
        description: 'Cassette cannot be ejected from machine',
        priority: 'HIGH' as any,
        deliveryMethod: 'SELF_DELIVERY' as any,
        affectedComponents: ['Eject Motor', 'Sensor'],
        errorCode: 'E001',
    },
    MEDIUM_PRIORITY: {
        title: 'Cassette Wear and Tear',
        description: 'Regular maintenance required',
        priority: 'MEDIUM' as any,
        deliveryMethod: 'COURIER' as any,
        affectedComponents: ['Belt'],
        errorCode: 'E000',
    },
    LOW_PRIORITY: {
        title: 'Minor Cosmetic Issue',
        description: 'Cassette label faded',
        priority: 'LOW' as any,
        deliveryMethod: 'SELF_DELIVERY' as any,
        affectedComponents: [],
    },
};

/**
 * Test repair ticket fixtures
 */
export const TEST_REPAIRS = {
    SIMPLE_REPAIR: {
        repairActionTaken: 'Cleaned and lubricated cassette mechanism',
        partsReplaced: [],
        qcPassed: true,
    },
    COMPLEX_REPAIR: {
        repairActionTaken: 'Replaced broken belt and recalibrated sensors',
        partsReplaced: ['Belt Assembly', 'Optical Sensor'],
        qcPassed: true,
    },
    FAILED_QC: {
        repairActionTaken: 'Attempted motor replacement',
        partsReplaced: ['DC Motor'],
        qcPassed: false,
    },
};

/**
 * Test preventive maintenance fixtures
 */
export const TEST_PM_SCHEDULES = {
    MONTHLY: {
        taskName: 'Monthly Cassette Inspection',
        description: 'Regular monthly inspection of all cassettes',
        frequencyDays: 30,
    },
    QUARTERLY: {
        taskName: 'Quarterly Deep Cleaning',
        description: 'Deep cleaning and lubrication',
        frequencyDays: 90,
    },
    ANNUAL: {
        taskName: 'Annual Preventive Maintenance',
        description: 'Comprehensive annual maintenance',
        frequencyDays: 365,
    },
};

/**
 * Test warranty fixtures
 */
export const TEST_WARRANTIES = {
    ONE_YEAR: {
        warrantyPeriodMonths: 12,
        coverageDetails: 'Parts and labor covered for 1 year',
    },
    TWO_YEAR: {
        warrantyPeriodMonths: 24,
        coverageDetails: 'Extended parts and labor coverage for 2 years',
    },
};
