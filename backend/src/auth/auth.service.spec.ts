import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { TwoFactorAuthService } from './two-factor-auth.service';

describe('AuthService', () => {
    let service: AuthService;
    let prisma: PrismaService;
    let jwt: JwtService;

    const mockPrismaService = {
        user: {
            findUnique: jest.fn(),
        },
        hitachiUser: {
            findUnique: jest.fn(),
        },
        pengelolaUser: {
            findUnique: jest.fn(),
        },
        refreshToken: {
            create: jest.fn(),
            update: jest.fn(),
        },
    };

    const mockJwtService = {
        sign: jest.fn(),
        verify: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn(),
    };

    const mockTwoFactorAuthService = {
        generateSecret: jest.fn(),
        generateQRCode: jest.fn(),
        verifyCode: jest.fn(),
        generateBackupCodes: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: JwtService,
                    useValue: mockJwtService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: TwoFactorAuthService,
                    useValue: mockTwoFactorAuthService,
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        prisma = module.get<PrismaService>(PrismaService);
        jwt = module.get<JwtService>(JwtService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // Add more tests here for login, 2FA, etc.
});
